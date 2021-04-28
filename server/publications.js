import {
  UserLocations,
  BotChannels,
  GreetMessages,
  Settings,
  QuizzQuestions,
  QuizzScores,
  Stats,
  Raiders,
  Images
} from '../imports/api/collections.js';

import { hasRole, getUserGroups } from './user_management.js';
export function init_publications() {
  //
  // ---------------------- CHANNELS -------------------------------
  //
  Meteor.publish('botChannels', function (sel) {
    if (!sel) sel = {}
    let uid = this.userId;
    if (uid) {
      // If non admin, only publish enabled channels corresponding to groups associated to the user
      if (!hasRole(uid, ['admin'])) {
        sel.channel = { $in: getUserGroups(uid) };
        sel.enabled = true;
      }
      //console.info('Publication BotChannels, sel=', sel,BotChannels.findOne(sel));
      return BotChannels.find(sel);
    }
    else {
      // Limited access for non logged users 
      // Only required fields
      return BotChannels.find(sel
        // FIXME!
        //, 
        //{fields: {map:1,enabled:1}}
      );
    }
    this.ready();
  });

  //Publish the list of all channels where the bot is enabled
  Meteor.publish('EnabledChannels', function (sel) {
    sel.enabled = true;
    return BotChannels.find(sel, { fields: { enabled: 1, channel: 1 } })
  });

  // Liste des channels qui ont la fonction greet activée
  Meteor.publish('GreetChannels', function () {
    if (hasRole(this.userId, ['admin', 'greet'])) {
      let sel = {
        enabled: true,
        greet: true
      }
      return BotChannels.find(sel);
    }
    this.ready();
  });




  //
  // ---------------------- QUIZZ -------------------------------
  //

  Meteor.publish('quizzQuestions', function (sel) {
    if (hasRole(this.userId, ['admin', 'quizz'])) {
      if (!sel) sel = {}
      return QuizzQuestions.find(sel);
    }
    this.ready();
  });



  Meteor.publish('quizzScores', function (sel) {
    //if (this.userId) {
    if (!sel) sel = {}
    return QuizzScores.find(sel, { sort: { score: -1 }, limit: 50 });
    //}
    //this.ready();
  });

  //
  // ---------------------- LOCATIONS -------------------------------
  //

  UserLocations.before.insert(function (userid, doc) {
    console.error('before insert', doc);
    if (doc.allow === true)
      doc.mapname = doc.dname;
  });

  UserLocations.before.update(function (userid, doc, fieldNames, modifier, options) {
    if (fieldNames.indexOf('allow') >= 0) {
      if (modifier.$set != undefined) {
        if (modifier.$set.allow === true)
          modifier.$set.mapname = doc.dname;
        else {
          if (!modifier.$unset)
            modifier.$unset = {};
          modifier.$unset.mapname = "";
        }
      }
    }
  });



  //
  // ---------------------- GREET MESSAGES -------------------------------
  //

  Meteor.publish('greetMessages', function (sel) {
    if (hasRole(this.userId, ['admin', 'greet'])) {
      if (!sel) sel = {}
      return GreetMessages.find(sel);
    }
    this.ready();
  });

  Meteor.publish('settings', function (sel) {
    if (hasRole(this.userId, 'admin')) {
      if (!sel) sel = {}
      return Settings.find(sel);
    }
    this.ready();
  });


  // ------------------- RAIDERS --------------

  Meteor.publish('raiders', function (sel) {
    //if (hasRole(this.userId, 'admin')) {
    if (this.userId) {
      if (!sel) sel = {}
      return Raiders.find(sel);
    }
    this.ready();
  });

  //
  // ---------------------- TRANSLATOR USAGE STATS -------------------------------
  //

  Meteor.publish('statistics', function (sel) {
    if (hasRole(this.userId, ['streamer'])) {
      if (!sel) sel = {}
      return Stats.find(sel);
    }
    this.ready();
  });

  Meteor.publish('images', function (sel) {
    if (!sel) sel = {}
    //    return (Images.find(sel).cursor);
    return (Images.collection.find(sel));
  });

  Images.allow({
    insert(userid, doc) {
      if (userid) return true;
    },
    update(userid, doc) {
      if (userid) return true;
    },
    remove(userid, doc) {
//      if (userid) return true;
      if (hasRole(userid, 'admin')) 
        return true;
      
    }
  });
}
