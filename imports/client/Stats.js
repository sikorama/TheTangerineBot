import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { BotChannels, Raiders } from '../api/collections.js';
import './Stats.html';

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
  
      let since = parseInt(bc.active_since);
      let d = Date.now();
      if (since<1) since = 10;
      d-= 1000*60*since;
      let res = au.map((item)=> {
        item.recent = item.ts > d;
        return item;
      }).sort((a,b) => b.ts-a.ts);
  
      console.error(res);
      return res;
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
    },
    divide(a,b) {return parseInt(a/b);}
  });
  