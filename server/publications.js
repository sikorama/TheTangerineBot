import { BotChannels, BotCommands, BotMessage, GreetMessages, Images, QuizzQuestions, QuizzScores, Raiders, Settings, ShoutOuts, Stats, UserLocations } from '../imports/api/collections.js';
import { assertMethodAccess, getUserGroups, hasRole } from './user_management.js';

export function init_publications() {
  //
  // ---------------------- CHANNELS -------------------------------
  //
  Meteor.publish('botChannels', function (sel) {
    if (!sel) sel = {};
    let opt = { sort: { channel: 1 } };

    let uid = this.userId;
    if (uid) {
      // If non admin, only publish enabled channels corresponding to groups associated to the user
      // Also only send requred fields


      if (!hasRole(uid, ['admin'])) {
        //sel.channel = { $in: getUserGroups(uid) };
      }
    }

      else {
        // For public data
        opt.fields = 
        { 
          // autoban
          // autobancmd

          //advertteam: 1,
          channel: 1,
          //discord: 1,
          //discord_goinglive_url2: 1,
          //discord_goinglive_url3: 1,
          //discord_raid_url: 1,
          enabled: 1,
          //greet: 1,        
          live: 1,
          //live_notifdate: 1,
          live_started: 1,
          live_thumbnail_url: 1,
          live_title: 1,
          live_viewers: 1,
          
          map: 1,
          map_icon_msg: 1,
          map_icon_name: 1,
          map_icon_std: 1,
          
          //me 1,
          //muteGreet 1,
          quizz: 1,
          //raid_auto_so: 1,
          //raids: 1,
          //songrequest: 1,
          team: 1,
          tr: 1,
        }
    }

    return BotChannels.find(sel, opt);

    //   this.ready();
  });

  //Publish the list of all channels where the bot is enabled
  Meteor.publish('EnabledChannels', function (sel) {
    if (!sel) sel = {};
    sel.enabled = true;
    return BotChannels.find(sel, { fields: { enabled: 1, channel: 1, live: 1, team: 1 } });
  });

  //Publish the list of all channels where the bot is enabled
  Meteor.publish('LiveChannels', function (sel) {
    if (!sel) sel = {};
    sel.live = true;
    return BotChannels.find(sel, {
      fields:
      {
        enabled: 1,
        channel: 1,
        live: 1,
        live_title: 1,
        live_started: 1,
        live_thumbnail_url: 1,
        live_viewers: 1,
        team: 1
      }
    });
  });

  // Liste des channels qui ont la fonction greet activée
  // Pour la greetings table (filtre exclusion de channel)
  Meteor.publish('GreetChannels', function () {
    if (hasRole(this.userId, ['admin', 'greet'])) {
      let sel = {
        enabled: true,
        greet: true
      };
      return BotChannels.find(sel);
    }
    this.ready();
  });


  // ----------------- SHOUTOUTS ------------------
  Meteor.publish('shoutouts', function (sel) {
    //    if (hasRole(this.userId, ['admin', 'quizz'])) {
    if (!sel) sel = {};
    return ShoutOuts.find(sel);
    //   }
    //  this.ready();
  });

  ShoutOuts.allow({
    insert(userid, doc) {
      //      if (userid) return true;
    },
    update(userid, doc) {
      //      if (userid) return true;
    },
    remove(userid, doc) {
      if (hasRole(userid, 'admin'))
        return true;

    }
  });


  //
  // ---------------------- QUIZZ -------------------------------
  //

  Meteor.publish('quizzQuestions', function (sel) {
    if (hasRole(this.userId, ['admin', 'quizz'])) {
      if (!sel) sel = {};
      return QuizzQuestions.find(sel);
    }
    this.ready();
  });



  Meteor.publish('quizzScores', function (sel) {
    //if (this.userId) {
    if (!sel) sel = {};
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

  UserLocations.allow({
    update(userid, doc) {
      if (hasRole(userid, 'admin')) return true;
    },
    remove(userid, doc) {
      if (hasRole(userid, 'admin')) return true;
    }
  });


  // TODO: add channel parameter (mandatory)
  Meteor.publish('userLocation', function (sel,opt) {
    
    // OPTIM: filter channels fields
  
    // fields depends on role
    if (hasRole(this.userId, 'admin')) 
    {
    }
    else 
    {
      // FIXME: Check if opt already contains fields and merge content
      opt.fields = {dname : 0};
    }
    return UserLocations.find(sel,opt);
  });

  // Custom Commands

  Meteor.publish('customcommands', function (sel) {
    if (hasRole(this.userId, ['admin'])) {
      sel = sel || {};
      return BotCommands.find(sel);
    }
    this.ready();
  });

  BotCommands.allow({
    insert(userid, doc) {
      if (hasRole(userid, 'admin'))
        return true;
    },
    update(userid, doc) {
      if (hasRole(userid, 'admin'))
        return true;
    },
    remove(userid, doc) {
      if (hasRole(userid, 'admin'))
        return true;
    }
  });
  //
  // ---------------------- GREET MESSAGES -------------------------------
  //

  Meteor.publish('greetMessages', function (sel) {
    if (hasRole(this.userId, ['admin', 'greet'])) {
      sel = sel || {};
      return GreetMessages.find(sel);
    }
    this.ready();
  });



  Meteor.publish('settings', function (sel) {
    if (hasRole(this.userId, 'admin')) {
      sel = sel || {};
      return Settings.find(sel);
    }
    this.ready();
  });


  // ------------------- RAIDERS --------------

  Meteor.publish('raiders', function (sel) {
    //if (hasRole(this.userId, 'admin')) {
    if (this.userId) {
      sel = sel || {};
      return Raiders.find(sel);
    }
    this.ready();
  });

  // ------------------- Bot Messages for OSD --------------
  // No need to be logged
  Meteor.publish('lastmessages', function (sel) {
    sel = sel || {};
    if (sel.channel) {
      return BotMessage.find(sel);
    }
    this.ready();
  });


  //
  // ---------------------- TRANSLATOR USAGE STATS -------------------------------
  //

  Meteor.publish('statistics', function (sel) {
    if (hasRole(this.userId, ['streamer'])) {
      sel = sel || {};
      return Stats.find(sel);
    }
    this.ready();
  });

  Meteor.publish('images', function (sel) {
    sel = sel || {};
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

  Meteor.methods({
    getGroups: function () {
      if (!this.userId) return ;

      //assertMethodAccess('getGroups', this.userId);

      if (hasRole(this.userId, ['admin'])) {
        let cur = BotChannels.find({}, { fields: { channel: 1 }, sort: { channel: 1 } });
        let a = cur.fetch();
        //      console.error(a)
        let res = a.map((item) => item.channel);
        //      console.error(res);
        return res;
      }

      return getUserGroups(this.userId);
    }
  });


  // Roles publication
  Meteor.publish('userRoles', function () {
    // admin only
    if (hasRole(this.userId, ['admin'])) {
      return Meteor.roleAssignment.find();
      //      return Meteor.roleAssignment.find({}, {fields: {'role':1}});
    } else {
      this.ready();
    }
  });
}


// ------------------ Settings

Meteor.methods({
  // get/set parameters
  parameter: function (param, val) {
    assertMethodAccess('parameter', this.userId);

    if (val === undefined)
      return Settings.findOne({ param: param });
    Settings.upsert({ param: param }, { $set: { val: val } });
  }
});

let WEBSITE_URL = "http://localhost";
let wurl = process.env.WEBSITE_URL;
if (wurl) WEBSITE_URL = wurl;

// Default Settings
if (Settings.findOne() === undefined) {
  Settings.insert({ param: 'URL', val: WEBSITE_URL });
  Settings.insert({ param: 'location_interval', val: 60 });
  Settings.insert({ param: 'quizz_enabled_topics', val: [] });
  Settings.insert({ param: 'ffmpeg_server_url', val: '127.0.0.1' });
  Settings.insert({ param: 'ffmpeg_server_port', val: 8126 });
}


Settings.allow({
  update(userid, doc) {
    if (hasRole(userid, 'admin')) return true;
  }
});