import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { BotChannels, Raiders} from '../imports/api/collections.js';
import { getCountryName } from '../imports/api/countrycodes.js';
import { checkUserRole } from '../imports/api/roles.js';
import './routes.js';
import '../imports/client/Settings.js';
import '../imports/client/QuizzTable.js';
import '../imports/client/common/showMore';
import '../imports/client/common/skipResult';
import '../imports/client/common/checkMark';
import './main.html';
import '../imports/client/CommandsTable.js';
import '../imports/client/Stats';
import '../imports/client/GreetingsTable.js';
import '../imports/client/Shoutout.js';
import '../imports/client/LocationsTable.js';
import '../imports/client/about.html';
import '../imports/client/WorldMap.js';
import '../imports/client/WorldMap.html';
import '../imports/client/RadioControl.js';
import '../imports/client/overlays.js';
import '../imports/client/lyricsquizz_overlay';
import '../imports/client/lyricsquizz_table';

import { Accounts } from 'meteor/accounts-base';

Accounts.ui.config({
  //  passwordSignupFields: 'USERNAME_ONLY'
  passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
});


const Chart = require('chart.js');

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
  return JSON.stringify(el,null,' ');
});


Template.registerHelper(
  "FormatCountryName", getCountryName);

Template.registerHelper(
  "FormatDate", function (ts) {
    if (ts === undefined) return;
    let d = new Date(ts);
    return d.toLocaleString();
  }
);

Template.registerHelper(
  "FormatGeoloc", function (lat, long) {
    if (isNaN(long) || isNaN(lat)) return 'N/A';
    let l0 = Math.round(lat * 100) / 100;
    let l1 = Math.round(long * 100) / 100;

    let h0 = "N";
    if (l0 < 0) { l0 = -l0; h0 = 'S'; }
    let h1 = "E";
    if (l1 < 0) { l1 = -l1; h1 = 'W'; }

    return '' + l0 + '°' + h0 + ' ' + l1 + '°' + h1;
  }
);

Template.MainPage.onRendered(() => {

  // When the user scrolls the page, execute myFunction
  window.onscroll = function () { scrollFunction(); };

  // Add the sticky class to the header when you reach its scroll position. Remove "sticky" when you leave the scroll position
  function scrollFunction() {
      // Get the header
      var header = document.getElementById("myHeader");
      if (header) {
          // Get the offset position of the navbar
          var sticky = header.offsetTop;

          if (window.pageYOffset > sticky) {
              header.classList.add("sticky");
          } else {
              header.classList.remove("sticky");
          }
      }
  }
});


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
});

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
});


Template.ChannelPage.helpers({
  active(s) {
    return ((FlowRouter.getRouteName() === s) ? 'pure-menu-active active' : '');
  },
  curSelChan() { return Session.get('sel_channel'); }
});


Template.ActiveChan.helpers({
  // Active channels in chat
  enchan() {
    return BotChannels.find({ enabled: true, suspended: {$ne: true} }, { sort: { channel: 1 } });
  }
});

Template.ChannelsOverview.onCreated(function() {
  // fields
  this.subscribe('EnabledChannels');
  this.subscribe('LiveChannels');
});

Template.ChannelsOverview.helpers({
  allchans() {
    return BotChannels.find( {}, { sort: { live_notifdate: -1 } });
  }
});

Template.LiveChannels.onCreated(function () {
  this.subscribe('EnabledChannels');
  this.subscribe('LiveChannels');
});

Template.LiveChannels.helpers({
//  enchan() {
//    return BotChannels.find({ enabled: true }, { sort: { channel: 1 } });
//  },
  livechan()  {
    let team = FlowRouter.getQueryParam('team');
    let sobj = { live:true };
    if (team) {
      if (team==='none') {
        sobj.team={$exists: 0};
      }
      else
        sobj.team=team;
    }
    let res=BotChannels.find(sobj, { sort: { live_started: -1 } }).fetch();
    return res.slice(0,100);
  }
});

function rgba(r, g, b, a) {
  return 'rgba(' + Math.floor(r) + ',' + Math.floor(g) + ',' + Math.floor(b) + ',' + a + ')';
}

function genColors(c1, a, n) {
  let colors = [];
  for (let i = n - 1; i >= 0; i--) {
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


Template.About.events({
  "click .pure-link": function (event) {
    if (event.target.id === 'logout') AccountsTemplates.logout();	// A la place de Meteor.logout()
  }
});


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
    const g = Session.get('list_channel');
    const cg = Session.get('sel_channel');
    if (g)
      if (g.length > 1) {
        g.push('All Channels');
        return g.map((item) => {
          return {
            l: item,
            s: (item == cg)
          };
        });
      }
    return undefined;
  },
  getSessionVar(s) {
    return Session.get(s);
  }

});

Template.SelectChannel.events({
  'change [name="selChannel"]': function (event) {
    let v = event.currentTarget.value;
    Session.set('sel_channel', v);
  }
});

// Direct access to a map, without needing to be logged
Template.ChannelPage.onCreated(function () {
  const chan = FlowRouter.getParam('chan');
  // Check if chan exists, and has map enabled
  this.subscribe('botChannels', { channel: chan }, function () {
    const bc = BotChannels.findOne({ channel: chan, map: { $exists: 1 } });
    if (!bc)
      FlowRouter.go('/');
  });

  Session.set('sel_channel', chan);
  //  console.error(chan);
});


// Direct access to a map, without needing to be logged
Template.DirectMap.onCreated(function () {
  const chan = FlowRouter.getParam('chan');
  // Check if chan exists, and has map enabled
  this.subscribe('botChannels', { channel: chan }, function () {
    const bc = BotChannels.findOne({ channel: chan, map: { $exists: 1 } });
    console.error('Displaying', bc.channel);
    if (!bc)
      FlowRouter.go('/');
  });

  Session.set('sel_channel', chan);
  //  console.error(chan);
});

