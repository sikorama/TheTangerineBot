import {
  UserLocations,
  BotChannels,
  GreetMessages,
  Settings,
  QuizzQuestions,
  QuizzScores,
  Stats
} from '../imports/api/collections.js';

import { hasRole,getUserGroups } from './user_management.js';


export function init_publications() {


//
// ---------------------- CHANNELS -------------------------------
//
Meteor.publish('BotChannels', function (sel) {
  if (!sel) sel = {}
  let uid = this.userId;

  if (uid)
  {
    // If non admin, only publish the channels corresponding to the group associated to the user
    if (!hasRole(uid, ['admin'])) {
      sel.channel = getUserGroups(uid);
    }
//      console.info('Publication BotChannels, sel=', sel);
    return BotChannels.find(sel);
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



}
