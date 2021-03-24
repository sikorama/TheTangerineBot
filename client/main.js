import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { UserLocations, BotChannels, GreetMessages, Settings } from '../imports/api/collections.js';
import { getCountryName } from '../imports/api/countrycodes.js';
import { checkUserRole } from '../imports/api/roles.js';
import { getParentId, manageSearchEvents } from '../imports/client/tools.js';
import '../imports/routes.js';
import '../imports/client/Settings.js';
import '../imports/client/QuizzTable.js';

import './main.html';
import '../imports/client/CommandsTable.html';
import '../imports/client/CountriesTable.html';
import '../imports/client/GreetingsTable.js';
import '../imports/client/LocationsTable.js';
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
        //console.error(res);
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

