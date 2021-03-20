import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { UserLocations, BotChannels, GreetMessages, Settings } from '../imports/api/collections.js';
import { checkUserRole } from '../imports/api/roles.js';
import { getParentId, manageSearchEvents } from '../imports/client/tools.js';
import '../imports/routes.js';
import '../imports/client/Settings.js';
import '../imports/client/QuizzTable.js';

import './main.html';
import '../imports/client/CommandsTable.html';
import '../imports/client/CountriesTable.html';
import '../imports/client/GreetingsTable.html';
import '../imports/client/LocationsTable.html';
import '../imports/client/about.html';
import '../imports/client/WorldMap.js';
import '../imports/client/WorldMap.html';

import { Accounts } from 'meteor/accounts-base';

Accounts.ui.config({
  //  passwordSignupFields: 'USERNAME_ONLY'
  passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
})


var Chart = require('chart.js');

Session.setDefault('searchUsers', {});
Session.setDefault('searchQuizz', {});

const country_names = {
  'AD': 'Andorra',
  'AE': 'United Arab Emirates',
  'AM': 'Armenia',
  'AR': 'Argentina',
  'AO': 'Angola',
  'AT': 'Austria',
  'AU': 'Australia',
  'AZ': 'Azerbaijan',
  'BE': 'Belgium',
  'BO': 'Bolivia',
  'BG': 'Bulgaria',
  'BR': 'Brazil',
  'BY': 'Belarus',
  'CA': 'Canada',
  'CH': 'Switzerland',
  'CL': 'Chile',
  'CN': 'China',
  'CO': 'Colombia',
  'CR': 'Costa Rica',
  'CZ': 'Czech Republic',
  'DE': 'Germany',
  'DK': 'Denmark',
  'DZ': 'Algeria',
  'EC': 'Ecuador',
  'EE': 'Estonia',
  'ES': 'Spain',
  'FI': 'Finland',
  'FO': 'Faroe Islands',
  'FR': 'France',
  'GB': 'Great Britain',
  'GE': 'Georgia',
  'GR': 'Greece',
  'HU': 'Hungary',
  'IE': 'Ireland',
  'IL': 'Israel',
  'IN': 'India',
  'IR': 'Iran',
  'IS': 'Iceland',
  'IT': 'Italy',
  'JM': 'Jamaica',
  'JP': 'Japan',
  'KP': 'North Korea',
  'LU': 'Luxembourg',
  'LT': 'Lithuania',
  'NE': 'Niger',
  'NL': 'Netherlands',
  'NZ': 'New Zealand',
  'PA': 'Panama',
  'PE': 'Peru',
  'PH': 'Philippines',
  'PL': 'Poland',
  'PT': 'Portugal',
  'PY': 'Paraguay',
  'MX': 'Mexico',
  'RO': 'Romania',
  'RU': 'Russia',
  'SE': 'Sweden',
  'SI': 'Slovenia',
  'SK': 'Slovakia',
  'SS': 'Wakanda', //South Soudan
  'TR': 'Turkey',
  'TW': 'Taiwan',
  'UA': 'Ukraine',
  'US': 'United States',
  'UY': 'Uruguay',
  'VE': 'Venezuela',
  'ZA': 'South Africa'
}

Template.registerHelper('isUserRole', function (roles) {
  return checkUserRole(roles);
});

Template.registerHelper('edit_mode', function () {
  return Session.equals('edit_mode', true);
});

Template.registerHelper('numPeopleLoc', function () {
  return Session.get('numPeopleLoc');
});

Template.registerHelper('stringify', function (el) {
  return JSON.stringify(el);
});

function getCountryName(cn) {
  if (cn in country_names)
    return country_names[cn];
  return cn;
}

Template.registerHelper(
  "FormatCountryName", getCountryName);

Template.registerHelper(
  "FormatDate", function (ts) {
    if (ts === undefined) return;
    let d = new Date(ts);
    return d.toLocaleString();
  }
)

Template.registerHelper(
  "FormatGeoloc", function (lat, long) {
    if (isNaN(long) || isNaN(lat)) return 'N/A';
    var l0 = Math.round(lat * 100) / 100;
    var l1 = Math.round(long * 100) / 100;

    var h0 = "N";
    if (l0 < 0) { l0 = -l0; h0 = 'S' }
    var h1 = "E";
    if (l1 < 0) { l1 = -l1; h1 = 'W' }

    return '' + l0 + '°' + h0 + ' ' + l1 + '°' + h1
  }
)

Template.PageTop.onRendered(function () {
  this.subscribe('botChannels', { enabled: true });
});

Template.registerHelper('rh_featureEnabled', function (feature) {
  let sc = Session.get('sel_channel');
  if (!sc) return false;
  let bc = BotChannels.findOne({ channel: sc });
  if (!bc) return false;
  return (bc[feature] === true);
});

Template.PageTop.helpers({
  active(s) {
    return ((FlowRouter.getRouteName() === s) ? 'pure-menu-active active' : '');
  },
  curSelChan() { return Session.get('sel_channel'); }
})

Template.About.onCreated(function () {
  this.subscribe('EnabledChannels');
});

Template.About.helpers({
  enchan() {
    return BotChannels.find({ enabled: true }, { sort: { channel: 1 } });
  }
})

// ------------ User localization
Template.LatestLocations.onCreated(function () {
  Session.set('locations_sort_field', 'name');
  Session.set('locations_sort_dir', 1);
  Session.setDefault('locations_limit', 50);
  Session.setDefault('locations_page', 1);
  Session.setDefault('locations_count', 0);

  Session.set('searchUsers', {});
  Meteor.call("getNumPeople", function (err, res) {
    Session.set("numPeopleLoc", res);
  });
});

Template.LatestLocations.helpers({
  getlastreq(ul) {
    let chan = Session.get('sel_channel');
    if (chan) {
      return ul[chan + '-lastreq'];
    }
  },
  getUserLocs() {
    let searchData = Session.get("searchUsers");
    let curSearch = searchData.text;
    if (curSearch === undefined)
      curSearch = '';

    let prop = {};

    if (searchData.streamer === true) {
      prop.streamer = true;
    }

    if (searchData.msg === true) {
      prop.msg = true;
    }
    if (searchData.show === true) {
      prop.show = true;
    }

    prop.channel = Session.get('sel_channel');
    //console.error(prop);

    // sort:
    let sn = Session.get('locations_sort_field', 'username');
    let sd = Session.get('locations_sort_dir', 1);
    let sortobj = {};
    sortobj[sn] = sd;
    prop.sortby = sortobj;

    let l = Session.get('locations_limit');
    if (l === undefined) l = 50;

    let s = parseInt(Session.get('locations_page') - 1);
    s *= l;

    let res = UserLocIndex.search(curSearch, {
      limit: l,
      skip: s,
      props: prop,
    });

    //    console.error(res.count());
    Session.set('locations_count', res.count())
    return res.mongoCursor;
  },
  numLocations() {
    return Session.get('locations_count');
  }
});



const manageSortEvent = function (event, field) {
  let n = event.currentTarget.getAttribute('name');
  field_name = field + '_sort_field';
  field_dir = field + '_sort_dir';
  if (Session.equals(field_name, n)) {
    let d = Session.get(field_dir);
    Session.set(field_dir, -d);
  }
  else {
    Session.set(field_name, n);
    Session.set(field_dir, 1);
  }
};


Template.LatestLocations.events({
  'click .delete': function (event) {
    //let n = event.target.name;
    //let v = event.target.value;
    let id = getParentId(event.currentTarget);
    let res = confirm('Are you sure?');
    if (res) {
      UserLocations.remove(id);
    }
  },
  'click th.sort': function (event) {
    manageSortEvent(event, 'locations');
  },
  'input .search': _.debounce(function (event) { manageSearchEvents(event, 'searchUsers'); }, 300),
  'change .edit': function (event) {
    let n = event.target.name;
    let v = event.target.value;
    let id = getParentId(event.currentTarget);
    let setObj = {}

    if (n === "lastreq") {
      let chan = Session.get('sel_channel');
      if (!chan)
        return;
      n = chan + '-lastreq';
      //console.error(n);
    }

    // Clear
    if (event.target.name == 'country') {
      // Verification du code
      n = event.target.value.toUpperCase();
      if (!(n in country_names)) {
        v = '';
      }
    }


    if (event.target.name == 'location') {
      UserLocations.update(id, { $unset: { latitude: "", longitude: "", cuntry: "" } })
    }
    if (event.target.name == 'latitude' || event.target.name == 'longitude') {
      v = parseFloat(v);
    }

    if (event.target.name == 'allow') {
      v = event.target.checked;
    }

    if (event.target.name == 'streamer') {
      v = event.target.checked;
    }

    //    console.error(event.target.id, n, v, typeof v);
    // Set value
    setObj[n] = v;
    UserLocations.update(id, { $set: setObj })
  }
});

// ------------ Greetings
Template.Greetings.onCreated(function () {
  this.subscribe("greetMessages");
  this.subscribe('GreetChannels');
  // Pour le champ editeur de l'admin
  this.subscribe('allUsers');
});

Template.Greetings.helpers({
  'greetlines': function (lang) {
    var v = (lang === 'true');
    //console.error(v, lang);
    //GreetMessages.find({ lang: v }).forEach((item) => { console.error(item); })
    return GreetMessages.find({ lang: v }, { sort: { username: 1 } });
  },
  'greetChan': function () {

    return BotChannels.find({
      enabled: true,
      greet: true
    }).fetch().map((item) => { return item.channel });
  },
  username(id) {
    let u = Meteor.users.findOne(id);
    if (u) return u.username;
    return false;
  }
});

Template.Greetings.events({
  'change .greetline': function (event) {
    let id = event.currentTarget.parentElement.id;
    let name = event.currentTarget.name;
    //console.error('change greetline ', id,name);

    //    if (name.indexOf('greet') === 0) {
    let f = name.split('_')[0];
    let r = name.split('_')[1];
    let o = {};
    o[f] = event.currentTarget.value;
    Meteor.call('updateGreetLine', id, r, o);
    //    }
  },
  'click button.resettimer': function (event) {
    var name = event.currentTarget.name;

    //console.error('click reset timer',name);
    if (confirm('Are you sure you want to reset timer for user ' + name + '. Bot will greet again!') === true) {
      Meteor.call('resetGreetTimer', name);
    }
  },
  'click button': function (event) {
    //   console.error(event.target.id);
    //    console.error(event.currentTarget.id);
    var id = event.currentTarget.parentElement.id;
    var name = event.currentTarget.name;
    //console.error('click button', id,name);

    var cl = event.currentTarget.className;
    if (cl.indexOf('toggleCheck') >= 0) {

      var b = (cl.indexOf('ok') < 0)
      // console.error("toggle", id, name,b);
      Meteor.call('updateGreetLine', id, parseInt(name), { enabled: b });
      return;
    }

    if (name.indexOf('remove') === 0) {
      if (confirm('Are you sure you want to permanently delete this Greetings line?') === true) {
        var r = name.split('_')[1];
        //console.error('remove', id, r);
        Meteor.call('removeGreetLine', id, r);
      }
      return;
    }

    if (name === 'confirm_user_greet') {
      let u = document.getElementsByName('addUserName')[0].value;
      let t = document.getElementsByName('addUserText')[0].value;
      let c = document.getElementsByName('addUserChan')[0].value;
      if (u.length > 0 && t.length > 0) {
        Meteor.call('addGreetLine', u, t, c);
        document.getElementsByName('addUserText')[0].value = "";
      }
      return;
    }
  },
  // Si on clique sur le nom d'un user, ca remplt l'input 'username'
  'click .username': function (event) {
    var id = event.currentTarget.parentElement.id;
    if (id != undefined) {
      var gl = GreetMessages.findOne(id);
      if (gl != undefined) {
        document.getElementsByName('addUserName')[0].value = gl.username;
      }
    }
  }
})


function rgba(r, g, b, a) {
  return 'rgba(' + Math.floor(r) + ',' + Math.floor(g) + ',' + Math.floor(b) + ',' + a + ')';
}

function genColors(c1, a, n) {
  var colors = [];
  for (var i = n - 1; i >= 0; i--) {
    colors.push(rgba(i * 255.0 / n, i * 127.0 / n, 180 - i * 127.0 / n, a));
  }
  return colors;
}

Template.Countries.events({
  'click button.selStat': function (ev) {
    Session.set('statPage', parseInt(ev.currentTarget.name))
  }
});

Template.Countries.onRendered(function () {
  Session.set('statPage', 1);
  var ctx = null;

  this.autorun(() => {
    let sch = Session.get('sel_channel');
    if (!sch) return;
    Meteor.call("getNumPeople", sch, function (err, res) {
      Session.set("numPeopleLoc", res);
    });

    if (Session.equals('statPage', 1)) {
      Meteor.call('aggregateUserField', sch, sch + '-lastreq', function (err, res) {
        res.sort((a, b) => b.t - a.t);
        console.error(res);
        Session.set('CountPerSong', res);
      });
    }

    if (Session.equals('statPage', 2)) {
      Meteor.call('aggregateUserField', sch, "country", function (err, res) {
        res.sort((a, b) => b.t - a.t);
        Session.set('CountPerCountry', res);

        /*
        var ctx = document.getElementById('countryChart').getContext('2d');
        var myChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: [],
            datasets: [{
              label: 'Countries',
              data: [],
              borderWidth: 1,
            }]
          },
          options: {
            circumference: Math.PI,
            rotation: Math.PI,
            title: {
              display: false,
              text: 'Countries'
            },
            legend: {
              position: 'right',
              display: true,
              labels: {
                boxWidth: 15,
                fontSize: 12
              }
            }
          }
        });
      
        // Classement par ordre d'alerte
              myChart.data.datasets[0].backgroundColor = genColors(255, 0.5, res.length);
              myChart.data.datasets[0].borderColor = genColors(255, 1.0, res.length).reverse();
        
              myChart.data.labels = res.map(item => { return getCountryName(item._id); });
        
              myChart.data.datasets[0].data = res.map(item => {
                return item.t;
              });
              myChart.update();
              */
      });
    }
  });
});

Template.Countries.helpers({
  getCountryCount() {
    return Session.get('CountPerCountry');
  },
  getSongCount() {
    return Session.get('CountPerSong');
  },
  showStat(p) {
    return Session.equals('statPage', parseInt(p));

  }
});


Template.About.events({
  "click .pure-link": function (event) {
    if (event.target.id === 'logout') AccountsTemplates.logout();	// A la place de Meteor.logout()
  }
});


Template.ShowMore.helpers({
  selected(v) {
    if (Session.equals(this.v + '_limit', parseInt(v)))
      return 'selected';
    return ''
  },
  limits() { return [20, 50, 100, 500, 1000]; }
})

Template.ShowMore.events({
  'change select': function (event) {
    if (this.v != undefined) {
      let v = parseInt(event.currentTarget.value);
      Session.set(this.v + '_limit', v);
      Session.set(this.v + '_page', 1);
    }
  }
})

Template.SkipResult.helpers({
  pages() {
    let npp = parseInt(Session.get(this.v + "_limit"));
    let nbp = Math.ceil(parseInt(this.t) / npp);
    Session.set(this.v + '_numpages', nbp);
    if (nbp <= 1) return [];
    //    console.error(this.t, npp,nbp,_.range(1,nbp));
    return _.range(1, nbp + 1);
  },
  classIsSelected(i) {
    if (Session.equals(this.v + '_page', i)) {
      return "selected";
    }
    return '';
  },
  first() { return (Session.equals(this.v + '_page', 1)) },
  last() {
    let nbp = Session.get(this.v + '_numpages');
    return (Session.equals(this.v + '_page', nbp))
  },

})

Template.SkipResult.events({
  'click .prevpage': function (event) {
    let sv = this.v + '_page';
    let v = parseInt(Session.get(sv)) - 1;
    Session.set(sv, v);
  },
  'click .nextpage': function (event) {
    let sv = this.v + '_page';
    let v = parseInt(Session.get(sv)) + 1;
    Session.set(sv, v);
  },
  'click .setpage': function (event) {
    let sv = this.v + '_page';
    v = parseInt(event.currentTarget.textContent);
    console.error('set', sv, v);
    Session.set(sv, v);
  }
})


Template.registerHelper('isAdmin', function () { return checkUserRole(['admin']); });
Template.registerHelper('isStreamer', function () { return checkUserRole(['streamer']); });

Template.SelectChannel.onCreated(function () {
  let g = Meteor.user().profile.groups;
  if (!g) return;

  let c = Session.get('sel_channel');
  if (c) {
    if (g.indexOf(c) < 0)
      Session.set('sel_channel', g[0]);
  }

  Session.setDefault('sel_channel', g[0]);
});

Template.SelectChannel.helpers({
  groups() {
    let g = Meteor.user().profile.groups;
    let cg = Session.get('sel_channel');
    if (g)
      if (g.length > 1)
        return g.map((item) => {
          return {
            l: item,
            s: (item == cg)
          }
        });
    return undefined;
  },
  getSessionVar(s) {
    return Session.get(s);
  }

})

Template.SelectChannel.events({
  'change [name="selChannel"]': function (event) {
    let v = event.currentTarget.value;
    //console.error(v);
    Session.set('sel_channel', v);
  }
});

// Direct access to a map, without needing to be logged
Template.DirectMap.onCreated(function () {
  let chan = FlowRouter.getParam('chan');
  // Check if chan exists, and has map enabled
  this.subscribe('botChannels', { channel: chan }, function () {
    let bc = BotChannels.findOne({ channel: chan, map: { $exists: 1 } });
    console.error(bc);
    if (!bc)
      FlowRouter.go('/');
  });

  Session.set('sel_channel', chan);
  //  console.error(chan);
});

