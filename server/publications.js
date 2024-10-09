import { BotChannels, BotCommands, BotMessage, GreetMessages, Images, Lyrics, LyricsQuizz, QuizzQuestions, QuizzScores, Raiders, Settings, ShoutOuts, Stats, UserLocations } from '../imports/api/collections.js';
import { addSong } from './lyricsquizz.js';
import { assertMethodAccess, getUserGroups, hasRole } from './user_management.js';
//import 'irlEvents';


export function init_publications() {
  //
  // ---------------------- CHANNELS -------------------------------
  //

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
  // ---------------------- QUIZZ QUESTIONS  -------------------------------
  //

  Meteor.publish('quizzQuestions', function (sel) {
    if (hasRole(this.userId, ['admin', 'quizz'])) {
      if (!sel) sel = {};
      return QuizzQuestions.find(sel);
    }
    this.ready();
  });


  //
  // ---------------------- SCORES -------------------------------
  //

  Meteor.publish('quizzScores', function (sel) {
    //if (this.userId) {
    if (!sel) sel = {};
    return QuizzScores.find(sel, { sort: { score: -1 }, limit: 50 });
  });

  //
  // ---------------------- LOCATIONS -------------------------------
  //

  UserLocations.before.insert(function (userid, doc) {
    //console.error('before insert', doc);
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
  Meteor.publish('userLocation', function (sel, opt) {

    // TODO betterchannels field filter
    opt = opt || {};

    // fields depends on role, except for admin
    if (!hasRole(this.userId, 'admin')) {
      if (this.userId) {
        // TODO: If a user is logged, should only allow full access to data from their map

      }
      else {
        opt.fields = opt.fields || {};
        // Some field are not allowed
        opt.fields.dname = 0;
        opt.fields.mail = 0;
      }
    }
    return UserLocations.find(sel, opt);
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

  GreetMessages.allow({
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
      if (!this.userId) return;

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
  Settings.insert({ param: 'lyricsquizz_enabled_topics', val: [] });
  Settings.insert({ param: 'ffmpeg_server_url', val: '127.0.0.1' });
  Settings.insert({ param: 'ffmpeg_server_port', val: 8126 });
}

Settings.allow({
  update(userid, doc) {
    if (hasRole(userid, 'admin')) return true;
  }
});






//Lyrics.remove({});

if (Lyrics.find().count() === 0) {

  addSong(
    "Englishman In New York",
    "Sting",
    "I don't drink coffee I take tea my dear\n" +
    "I like my toast done on one side\n" +
    "And you can hear it in my accent when I talk\n" +
    "I'm an Englishman in New York\n" +
    "\n" +
    "See me walking down Fifth Avenue\n" +
    "A walking cane here at my side\n" +
    "I take it everywhere I walk\n" +
    "I'm an Englishman in New York\n" +
    "\n" +
    "I'm an alien, I'm a legal alien\n" +
    "I'm an Englishman in New York\n" +
    "I'm an alien, I'm a legal alien\n" +
    "I'm an Englishman in New York\n" +
    "\n" +
    "If \"Manners maketh man\" as someone said\n" +
    "Then he's the hero of the day\n" +
    "It takes a man to suffer ignorance and smile\n" +
    "Be yourself no matter what they say\n" +
    "\n" +
    "I'm an alien, I'm a legal alien\n" +
    "I'm an Englishman in New York\n" +
    "I'm an alien, I'm a legal alien\n" +
    "I'm an Englishman in New York\n" +
    "\n" +
    "Modesty, propriety can lead to notoriety\n" +
    "You could end up as the only one\n" +
    "Gentleness, sobriety are rare in this society\n" +
    "At night a candle's brighter than the sun\n" +
    " \n" +
    "Takes more than combat gear to make a man\n" +
    "Takes more than a license for a gun\n" +
    "Confront your enemies, avoid them when you can\n" +
    "A gentleman will walk but never run\n" +
    " \n" +
    "If \"Manners maketh man\" as someone said\n" +
    "Then he's the hero of the day\n" +
    "It takes a man to suffer ignorance and smile\n" +
    "Be yourself no matter what they say\n" +
    "Be yourself no matter what they say\n" +
    "Be yourself no matter what they say\n" +
    "Be yourself no matter what they say\n" +
    "Be yourself no matter what they say...\n" +
    "\n" +
    "I'm an alien, I'm a legal alien\n" +
    "I'm an Englishman in New York\n" +
    "I'm an alien, I'm a legal alien\n" +
    "I'm an Englishman in New York\n" +
    "\n" +
    "I'm an alien, I'm a legal alien\n" +
    "I'm an Englishman in New York\n" +
    "I'm an alien, I'm a legal alien\n" +
    "I'm an Englishman in New York\n", +
  ['en']);

}


// -----