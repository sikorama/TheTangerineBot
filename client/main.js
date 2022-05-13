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
import '../imports/client/Stats.html';
import '../imports/client/GreetingsTable.js';
import '../imports/client/Shoutout.js';
import '../imports/client/LocationsTable.js';
import '../imports/client/about.html';
import '../imports/client/WorldMap.js';
import '../imports/client/WorldMap.html';
import '../imports/client/RadioControl.js';
import '../imports/client/overlays.js';

import { Accounts } from 'meteor/accounts-base';
import { tr_commands } from '../imports/api/languages.js';

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


Template.LiveChannels.onCreated(function () {
  this.subscribe('EnabledChannels');
  this.subscribe('LiveChannels');
});

Template.ActiveChan.helpers({
  enchan() {
    return BotChannels.find({ enabled: true }, { sort: { channel: 1 } });
  }
});

Template.CommandsTable.helpers({
  team() {
    let sc = Session.get('sel_channel');
    if (!sc) return false;
    let bc = BotChannels.findOne({ channel: sc });
    if (!bc) return false;
    return bc.team;
  },
  lang() {
    let ocmd = tr_commands();
    console.error(ocmd);    
    let res = Object.keys(ocmd).sort().map((c)=> {
      return { name: c , code: ocmd[c].map((l)=>'!'+l) };
    });
    console.error(res);
    // Into 2 columns?
    let rows=[];
    const numcol = 2;
    for (let i=0; i<res.length ; i+=numcol) {
      let row=[];
      for (j=0; j<numcol; j++) {
          row.push(res[i+j]);
      }
      rows.push(row);
    }  
    return rows;
  }
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


Template.Stats.events({
  'click button.selStat': function (ev) {
    Session.set('statPage', parseInt(ev.currentTarget.name));
  },
  'click button.remove[name="remove_active_user"]': function(ev) {
    let id = ev.currentTarget.id;
    let sch = Session.get('sel_channel');

    if (id && sch) {
      Meteor.call('removeActiveUser', sch, id, function (err, res) {
        //console.error(err, res);
        Session.set('activeUsers', res);
      });

    }
  },
  'click button[name="refresh"]' : function(ev) {
    let sch = Session.get('sel_channel');
    if (!sch) return;
    Meteor.call('getActiveUsers', sch, function (err, res) {
      //console.error(err, res);
      Session.set('activeUsers', res);
    });
  }
});

Template.Stats.onRendered(function () {
  this.subscribe('botChannels');
  Session.setDefault('statPage', 1);
  Session.setDefault('numPeopleLoc', 0);

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
    let au = Session.get('activeUsers');
    let chan = Session.get('sel_channel');
    if (!chan) return;
    if (!au) return;
    const bc = BotChannels.findOne({ channel: chan });
    if (!bc) return;

    // c.active_since
    let since = parseInt(bc.active_since);
    //d-= sch.active_since;
    let d = Date.now();
    if (since<1) since = 10;
    d-= 1000*60*since;
    let res = au.map((item)=> {
      item.recent = item.ts > d;
      return item;
    }).sort((a,b) => b.ts-a.ts);

    console.error(res);
    return res;

//    return au.filter((item) => {return (item.timestamp > d);});
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
    return '';
  },
  limits() { return [20, 50, 100, 500, 1000]; }
});

Template.ShowMore.events({
  'change select': function (event) {
    if (this.v != undefined) {
      let v = parseInt(event.currentTarget.value);
      Session.set(this.v + '_limit', v);
      Session.set(this.v + '_page', 1);
    }
  }
});

Template.SkipResult.helpers({
  pages() {
    let d = Template.currentData();
    
    let t = d.t;
    if (!d.t) {
      t = Session.get(d.var+'_count');
    }

    //t = 0;
    let npp = parseInt(Session.get(d.var + "_limit"));
    if (isNaN(npp)) {
      console.error(d.var + "_limit = ", npp );
      return;
    }
    let nbp = Math.ceil(parseInt(t) / npp);
    Session.set(d.var + '_numpages', nbp);

    let p = Session.get(d.var + '_page');
    //console.info('page', d.var, p,nbp,npp,t);
    // Si la page courante est supérieure au nombre de pages 
    // On retourne a la page 0
    if (p>nbp || p<1)  {
      //console.error('Reinit current page');
      Session.set(d.var + '_page',1);
    }

    if (nbp <= 1) return;
    const nbmax=17; // impair

    if (nbp<nbmax)
      return _.range(1, nbp + 1);
    // il il y a bcp de pags, on affiche les nbmax, centrées autour de la page courante
    let nb0 = Session.get(d.var + '_page');
    nb0-=Math.floor(nbmax/2);
    if (nb0<1) nb0=1;
    let nb1 = nb0+nbmax;
    if (nb1>nbp+1)
    {
      nb1= nbp+1;
      nb0 = nbp+1-nbmax;
    }
    
    // TODO: on pourrait ajouter la 1ere et derniere page avec des ... pour indiquer qu'il y a plus
    let res = _.range(nb0, nb1);
    //if (nb0>2) res.unshift('...');
    //if (nb0>1) res.unshift(1);
    //if (nb1<nbp-1) res.push(nbp-1);
    return res;

  },
  classIsSelected(i) {
    let d = Template.currentData();
    if (Session.equals(d.var + '_page', i)) {
      return "active";
    }
    return '';
  },
  first() { 
    let d = Template.currentData();
    return (Session.equals(d.var + '_page', 1)); },
  last() {
    let d = Template.currentData();
    let nbp = Session.get(d.var + '_numpages');
    return (Session.equals(d.var + '_page', nbp));
  },
});

Template.SkipResult.events({
  'click .prevpage': function (event) {
    let d = Template.currentData();
    let sv = d.var + '_page';
    let v = parseInt(Session.get(sv)) - 1;
    Session.set(sv, v);
  },
  'click .nextpage': function (event) {
    let d = Template.currentData();
    let sv = d.var + '_page';
    let v = parseInt(Session.get(sv)) + 1;
    Session.set(sv, v);
  },
  'click .setpage': function (event) {
    let d = Template.currentData();
    let sv = d.var + '_page';
    v = parseInt(event.currentTarget.textContent);
    Session.set(sv, v);
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
      if (g.length > 1)
        return g.map((item) => {
          return {
            l: item,
            s: (item == cg)
          };
        });
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

