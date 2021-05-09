import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { BotChannels, Raiders} from '../imports/api/collections.js';
import { getCountryName } from '../imports/api/countrycodes.js';
import { checkUserRole } from '../imports/api/roles.js';
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

// Login event
Tracker.autorun(function() {
  if (Meteor.userId()) {
    let u = Meteor.user();
    if (u) {
      console.error('login:', u.username);
      if (u.profile && u.profile.groups && u.profile.groups.length>0) {
        let chan = u.profile.groups[0];
        console.error('Switching to',chan);
        Meteor.subscribe('botChannels', {channel: chan});
        Session.set('sel_channel',chan);
      }
    }
  }
})

Template.registerHelper('rh_featureEnabled', function (feature) {
  let sc = Session.get('sel_channel');
  if (!sc) return false;
  //console.error(sc);
  let bc = BotChannels.findOne({ channel: sc });
  if (!bc) return false;
  //console.error(bc);
  return (bc[feature] === true);
});

Template.PageTop.helpers({
  active(s) {
    return ((FlowRouter.getRouteName() === s) ? 'pure-menu-active active' : '');
  },
  curSelChan() { return Session.get('sel_channel'); }
})

Template.LiveChannels.onCreated(function () {
  this.subscribe('EnabledChannels');
  this.subscribe('LiveChannels');

});

Template.LiveChannels.helpers({
  enchan() {
    return BotChannels.find({ enabled: true }, { sort: { channel: 1 } });
  },
  livechan(numcol)  {
      let res=BotChannels.find({ live: true }, { sort: { live_started_at: 1 } }).fetch();
      // Limiter aux X premiers elements
      // Reorganiser pour afficher en plusieurs colonnes
      if (!numcol) numcol=1;
      let sres=res.slice(0,100);
      let cres=[];
      for (let i=0; i<sres.length ; i+=numcol) {
          let row=[];
          for (j=0; j<numcol; j++) {
              row.push(sres[i+j])
          }
          cres.push(row);
      } 
      return cres;
  }
});

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

Template.registerHelper('rh_getchaninfo',function(chan) {
  //console.error(chan);
  let c = BotChannels.findOne({channel:new RegExp(chan,'i')});
  if (c) {
    //console.error(c);
    return c;
  }
});


Template.Stats.events({
  'click button.selStat': function (ev) {
    Session.set('statPage', parseInt(ev.currentTarget.name))
  }
});

Template.Stats.onRendered(function () {
  this.subscribe('botChannels');


  Session.setDefault('statPage', 1);
  Session.setDefault('numPeopleLoc', 0);

  var ctx = null;

  this.autorun(() => {
    let sch = Session.get('sel_channel');
    if (!sch) {
      console.error("no channel selected!");
      return;
    }

    let page = Session.get('statPage');
//    console.info('autorun', sch, page);

    switch (page) {
      case 1:
        Meteor.call("getNumPeople", sch, function (err, res) {
          Session.set("numPeopleLoc", res);
        });
        Meteor.call('aggregateUserField', sch, "country", function (err, res) {
          res.sort((a, b) => b.t - a.t);
          Session.set('CountPerCountry', res);
        });
        break;
      case 2:
        Meteor.call('aggregateUserField', sch, sch + '-lastreq', function (err, res) {
          if (err)
            console.error(err);

          res.sort((a, b) => b.t - a.t);
          //console.error(res);
          Session.set('CountPerSong', res);

        });
        break;
      case 3:
        Meteor.call('getActiveUsers', sch, function (err, res) {
          //console.error(err, res);
          Session.set('activeUsers', res);
        });
        break;
      case 4: 
        this.subscribe('raiders', { channel: new RegExp(sch,'i') });
        break;
      case 5: 
        this.subscribe('raiders', { raider: new RegExp(sch,'i') } );
        break;
    }
  });
});

Template.Stats.helpers({
  getCountryCount() {
    return Session.get('CountPerCountry');
  },
  getSongCount() {
    return Session.get('CountPerSong');
  },
  showStat(p) {
    return Session.equals('statPage', parseInt(p));
  },
  getActiveUsers() {
    return Session.get('activeUsers');
  },
  getraiders() {
    let sch = Session.get('sel_channel');
    return Raiders.find({channel:new RegExp(sch,'i')}, {sort: { viewers: -1,count: -1}});
  },
  getraided() {
    let sch = Session.get('sel_channel');
    return Raiders.find({raider:new RegExp(sch,'i')}, {sort: {count: -1, viewers: -1}});
  },
  statsEnabled() {
    let chan = Session.get('sel_channel');
    if (!chan)
      return false;
    let bc = BotChannels.findOne({ channel: chan });
    if (bc) {
      return bc.active_users;
    }
    return false;

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

  Meteor.call('getGroups', function(err,g) {
    if (err) console.error('err=', err);
    else 
    {
      //console.error('getgroup', g);

      if (!g) return;

      let c = Session.get('sel_channel');
      if (c) {
        if (g.indexOf(c) < 0)
          Session.set('sel_channel', g[0]);
      }
    
      Session.setDefault('sel_channel', g[0]);
      Session.set('list_channel', g);
    
    }
  });

});

Template.SelectChannel.helpers({
  groups() {

    let g = Session.get('list_channel');
//    let g = Meteor.user().profile.groups;

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
    console.error('Displaying', bc.channel);
    if (!bc)
      FlowRouter.go('/');
  });

  Session.set('sel_channel', chan);
  //  console.error(chan);
});

