/*
 * The Tangerine Bot
 * Main Server file / entry point
 * 
 */

import { Meteor } from 'meteor/meteor';
import { AccountsTemplates } from 'meteor/useraccounts:core';
import { BotChannels, GreetDate, GreetMessages, QuizzQuestions, QuizzScores, Raiders, Settings, ShoutOuts, Stats, UserLocations, LiveEvents, BotMessage } from '../imports/api/collections.js';
import { regext } from '../imports/api/regex.js';
import { addChannel } from './channels.js';
import { genChord, genProgression, noteArray } from './chords.js';
import { country_lang, patterns } from './const.js';
import { getGreetMessages, init_greetings, replaceKeywords } from './greetings.js';
import { checkLiveChannels, sendDiscord } from './notifications.js';
import { init_publications } from './publications.js';
import { init_quizz } from './quizz.js';
import { init_radio } from './radio.js';
import { initRaidManagement } from './raids.js';
import { randElement } from './tools.js';
import { hasRole, init_users } from './user_management.js';

const tmi = require('tmi.js');
const gtrans = require('googletrans').default;
const gc = require('node-geocoder');
const PhraseIt = require('phraseit');

let botname = process.env.CHANNEL_NAME;
let botpassword = process.env.CHANNEL_PASSWORD;

// TODO: If no channel & password, then exit...
if ((botname == undefined) || (botpassword == undefined)) {
  console.error('No CHANNEL_NAME or CHANNEL_PASSWORD environment variable found. Exiting.');
  process.exit(-1);
}
botname = botname.toLowerCase();

// global Hooks 
var bot_discord_raid_url = process.env.BOT_DISCORD_RAID_HOOK;

var bot_discord_live_url = process.env.BOT_DISCORD_LIVE_HOOK;

if (bot_discord_live_url)
  Settings.upsert({ param: 'discord_goinglive' }, { $set: { val: bot_discord_live_url } })

if (bot_discord_raid_url)
  Settings.upsert({ param: 'discord_raid' }, { $set: { val: bot_discord_raid_url } })

client_id = process.env.CLIENT_ID;
client_secret = process.env.CLIENT_SECRET;

if (client_id != undefined) {
  Meteor.setInterval(function () { checkLiveChannels(client_id, client_secret) }, 1000 * 60)
}

botpassword = 'oauth:' + botpassword;

//  UserLocations.update(u._id, {$unset: {msg:1}});

// Array to keep track of last active users (per channel)
let last_active_users = {};

let WEBSITE_URL = "http://localhost"
let wurl = process.env.WEBSITE_URL;
if (wurl) WEBSITE_URL = wurl;

const randomWords = [
  'ACTION',
  "BAH C'MON"
]


// Stack for answering to greetings.
// Greetings are not immediate in order to add a delay between multiple greetings
// Feels more natural, and also ueful in case of on screen notification, to avoid
// having notifications at the same time
// Only one stack for all greetings (not per channel)
let greetingsStack = [];

// Autotranslate feature
let autotranslate = {};

// Current Question (contains full object)
var curQuestion = undefined;
var numQuestions = 0;

// FIXME: Add referer, user-agent...
let gcoptions = {
  provider: 'openstreetmap',
};

let geoCoder = gc(gcoptions);


AccountsTemplates.configure({
  forbidClientAccountCreation: true,
  enablePasswordChange: false,
  showForgotPasswordLink: false,
});


/**
 * Find closest person on map,per channel
 */
function findClosest(uid, chan, nb) {

  if (!nb) nb = 5;

  let udata = UserLocations.findOne(uid);
  if (!udata) return [];

  let t0 = new Date();
  //Computes  Hamming distance, then sort and keeps n first results
  const l0 = udata.latitude;
  const l1 = udata.longitude;

  if ((l0 === undefined) || (l1 === undefined)) {
    return [];
  }

  let pipeline = [];
  let matchobj = {
    latitude: { $exists: 1 },
    longitude: { $exists: 1 },
    country: { $exists: 1 },
  };
  matchobj[chan] = { $exists: 1 };

  pipeline.push({
    $match: matchobj
  });

  pipeline.push({
    $project: {
      dist: { $add: [{ $abs: { $subtract: ["$latitude", l0] } }, { $abs: { $subtract: ["$longitude", l1] } }] }
    }
  });
  pipeline.push({
    $sort: { dist: 1 }
  });
  pipeline.push({
    $limit: nb
  });

  let res = UserLocations.aggregate(pipeline);
  let nc = [];
  let rl = res.length;
  if (rl > 5) rl = 5;
  for (let i = 0; i < rl; i++) {
    let cc = res[i];
    if ((cc.dist < 20) && (uid != cc._id)) {
      let u = UserLocations.findOne(cc._id);
      if (u != undefined)
        nc.push('@' + u.dname)
    }
  }

  // Store / cache
  //  UserLocations.update(uid, { $set: { timestamp: t0, proximity: nc } });
  return nc;
};


function randSentence() {
  try {
    return PhraseIt.make(randElement(patterns));
  }
  catch (e) {
    console.error(e.stack);
    return "...";
  }
}

const tr_lang = {
  'br': ['pt', 'disse'],
  'cn': ['zh', ''],
  'co': ['ko', ''],
  'de': ['de', 'sagt'],
  'du': ['du', ''],
  'en': ['en', 'says'],
  'english': ['en', 'says'],
  'eng': ['en', 'says'],
  'es': ['es', ''],
  'esp': ['es', ''],
  'fi': ['fi', ''],
  'fr': ['fr', 'dit'],
  'ge': ['de', 'sagt'],
  'german': ['de', 'sagt'],
  'it': ['it', ''],
  'jp': ['ja', ''],
  'ko': ['ko', ''],
  'kr': ['ko', ''],
  'sp': ['es', ''],
  'pl': ['pl', ''],
  'pt': ['pt', 'disse'],
  'ro': ['ro', ''],
  'ru': ['ru', ''],
  'tu': ['tr', ''], // turkish
  'tr': ['tr', ''], // turkish
  'tw': ['zh', ''],
};

const selectQuestion = function () {
  let pipeline = [];
  //    if (mhid != undefined)
  let p = Settings.findOne({ param: 'quizz_enabled_topics' });
  //  console.error(p);
  let sel = {
    enabled: true
  }

  if ((p != undefined) && (p.val.length > 0))
    sel.topics = { $in: p.val };
  //  console.error(sel);
  pipeline.push({
    $match: sel
  });
  pipeline.push({
    $sample: {
      size: 1
    }
  });
  let res = QuizzQuestions.aggregate(pipeline);
  if (res.length > 0) {
    q = res[0];
    QuizzQuestions.update(q._id, { $set: { enabled: false } });
  }
  else {
    console.warn("Quizz : Questions reset!");

    // On réactive toutes les questions et on en reprend une au pif
    QuizzQuestions.update({}, { $set: { enabled: true } }, { multi: true });
    res = QuizzQuestions.aggregate(pipeline);
    if (res.length > 0) {
      q = res[0];
      QuizzQuestions.update(q._id, { $set: { enabled: false } });
    }
  }
  curQuestion = q;
  curQuestion.expAnswers = q.answers.split(';');
  curQuestion.date = Date.now();
  curQuestion.clue = 0;

};

Meteor.startup(() => {
  // Add default bot channel with some options enabled
  if (BotChannels.find().count() == 0) {
    addChannel(botname, ["tr", "quizz", "map", "greet"]);
  }

  init_users();
  init_quizz();
  init_greetings();
  init_publications();
  initRaidManagement();
  init_radio();


  Meteor.methods({
    // Admins can add channels from client
    addChannel: function (chan) {
      if (!chan)
        return [];

      if (hasRole(this.userId, ['admin']))
        addChannel(chan.toLowerCase(), ["enabled"]);
    }
  })

  Meteor.methods({
    getActiveUsers: function (chan) {

      if (!chan)
        return [];
      if (!last_active_users[chan]) return [];
      if (this.userId)
        return last_active_users[chan];

      return [];
    }
  })


  Meteor.methods({
    // Search a twitch name inevery colections, and replace by the new name;
    rename: function (before, after, apply) {
      let desc = [];
      desc.push("Replacing " + before + " by " + after + ' ' + (apply ? '' : '(dry run)'));
      let lowcb = before.toLowerCase();
      let lowca = after.toLowerCase();

      let c, n;
      // Bot Channem
      c = BotChannels.findOne({ channel: lowcb });
      if (c) {
        desc.push('BotChannel: Found 1 occurence');
        console.info(c);
        if (apply) {
          BotChannels.update({ channel: lowcb }, { $set: { channel: lowca } });
        }
      }

      // Locations
      c = UserLocations.findOne({ name: lowcb });
      if (c) {
        desc.push('UserLocations: Found 1 occurence');
        console.info(c);
        if (apply) {
          let sobj = { name: lowca, dname: after };
          if (c.mapname)
            sobj.mapname = after;
          UserLocations.update({ name: lowcb }, { $set: sobj });

        }
      }

      // Map users
      let lfo = {},upo={};
      lfo[lowcb] = {$exists:1};
      upo[lowcb] = lowca;
      upo[lowcb+'-msg'] = lowca+'-msg';
      upo[lowcb+'-lastreq'] = lowca+'-lastreq';
      c = UserLocations.find(lfo);
      if (c.count()>0) {
        desc.push('UserLocations field: Found '+c.count()+' map users');
        if (apply) {
          UserLocations.update(lfo, { $replace: upo});
        }
      }

      // Raids
      c = Raiders.find({ raider: before });
      if (c.count() > 0) {
        desc.push('Raiders: Found ' + c.count() + ' occurence');
        console.info(c);
        if (apply) {
          c.forEach((r) => {
            Raiders.upsert({ raider: after, channel: r.channel }, { $inc: { count: r.count, viewers: r.viewers } });
          })
          Raiders.remove({ raider: before });
        }
      }
      c = Raiders.find({ channel: lowcb });
      if (c.count() > 0) {
        desc.push('Raids: Found ' + c.count() + ' occurence');
        console.info(c);

        if (apply) {
          c.forEach((r) => {
            Raiders.upsert({ raider: r.raider, channel: lowca }, { $inc: { count: r.count, viewers: r.viewers } });
          })
          Raiders.remove({ channel: lowcb });
        }
      }

      c = GreetMessages.findOne({ username: lowcb });
      if (c) {
        desc.push('GreetMessage: Found 1 occurence');
        console.info(c);
        if (apply) {
          GreetMessages.update({ username: lowcb }, { $set: { username: lowca } });
        }
      }

      return desc.join('\n');
    }
  })

  // Every 10 seconds, check if there's someone to greet
  // It allows to answer with a random delay, and also avoir too much
  // shoutouts at the same time (especially id displayed on screen)
  // (It's global to all channels)
  Meteor.setInterval(function () {
    try {
      if (greetingsStack.length > 0) {
        let g = greetingsStack.shift();
        say(g.target, g.txt, {me: g.me, dispname: g.dispname, store: true});
      }
    } catch (e) {
      console.error(e.stack);
    }
  }, 10 * 1000);

  // Counts questions
  QuizzQuestions.find().observe({
    added: function (doc) { numQuestions += 1; },
    removed: function (doc) { numQuestions -= 1; }
  });

  // ---------------- Methods ------------------
  Meteor.methods({
    'clearScores': function () {
      QuizzScores.remove({}, { multi: true });
    }
  });

  Meteor.methods({
    // Counts number of people registered on the map, for a given channel
    'getNumPeople': function (ch) {
      let sobj = {};
      sobj[ch] = { $exists: true };
      return UserLocations.find(sobj).count();
    },
    'getNumQuestions': function () {
      return numQuestions;
    },
    // For test only, generate random people on the map
    'genRandomMapPeople': function (nb) {
      for (let i = 0; i < nb; i++) {

        let n = 'gen' + PhraseIt.make("gen_{{adjective}}_{{noun}}");
        let doc = {
          name: n,
          dname: n,
          location: 'generated',
          latitude: Math.random() * 180 - 90,
          longitude: Math.random() * 180 - 90,
          timestamp: new Date(),
          channels: ['TEMP'],
          country: randElement(['GE', 'FR', 'BR', 'JP'])
        }
        if (Math.random() > 0.5) doc.allow = true;
        if (Math.random() > 0.5) doc.msg = randSentence();
        UserLocations.insert(doc);
      }
    }
  });

  Meteor.methods({
    'resetGreetTimer': function (uname) {
      if (hasRole(this.userId, ['admin', 'greet'])) {
        if (uname)
          GreetDate.remove({ name: uname });
      }
    }
  });

  Meteor.methods({
    'sentence': function () {
      return randSentence();
    }
  });

  function checkLocations() {
    let i = 60;

    item = UserLocations.findOne({ longitude: { $exists: 0 } });

    // Is there a location not converted to geo positions?
    if (item != undefined) {

      // Check if there is already someone with the same location
      let sameLoc = UserLocations.findOne({ location: item.location, latitude: { $exists: 1 } });
      if (sameLoc) {
        //        console.info('Found someone with same location: ', item.location, sameLoc);
        // If it's the same, then do nothing :)
        if (sameLoc._id != item._id) {
          UserLocations.update(item._id, {
            $set: {
              latitude: sameLoc.latitude,
              longitude: sameLoc.longitude,
              country: sameLoc.country,
            }
          });
        }
        // We can check again very quickly
        setTimeout(Meteor.bindEnvironment(checkLocations), 1000);
      }
      else {
        // Use geoCoder API for convrerting
        geoCoder.geocode(item.location).then(Meteor.bindEnvironment(function (res) {
          let fres = { longitude: "NA" }
          if (res.length > 0)
            fres = res[0];

          let upobj = {
            latitude: parseFloat(fres.latitude),
            longitude: parseFloat(fres.longitude),
            country: fres.countryCode
          }
          UserLocations.update(item._id, { $set: upobj });

          let p = Settings.findOne({ param: 'location_interval' });
          if (p !== undefined) i = p.val;
          if (i === undefined) i = 60;
          // On limite le min/max
          if (i > 60) i = 60;
          if (i < 5) i = 5;
          //        console.info('Next check in', i, 'seconds');
          setTimeout(Meteor.bindEnvironment(checkLocations), i * 1000);

        })).catch(Meteor.bindEnvironment(function (err) {
          console.log(err);
          i = 3600 * 5;
          console.info('Error occured, next Verification in', Math.floor(i / 60), 'minutes');
          setTimeout(Meteor.bindEnvironment(checkLocations), i * 1000);
        }));
      }

    } else {
      // Nothing to do, next Verification in 60 seconds;
      setTimeout(Meteor.bindEnvironment(checkLocations), 60 * 1000);
    }
  }

  //  Settings.remove({});

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


  setTimeout(Meteor.bindEnvironment(checkLocations), 60 * 1000);

  Meteor.methods({
    // get/set parameters
    parameter: function (param, val) {

      if (val === undefined)
        return Settings.findOne({ param: param });
      Settings.upsert({ param: param }, { $set: { val: val } });
    }
  })

  // Channels management
  Meteor.methods({
    removeChannel: function (chanid) {
      if (this.userId) {
        console.warn('Removing channel', chanid);
        BotChannels.remove(chanid);
      }
    },
    toggleChanSettings: function (chanid, field) {
      if (this.userId) {
        let bc = BotChannels.findOne(chanid);
        if (bc === undefined)
          return;
        let v = bc[field];
        objset = {};
        objset[field] = !v;
        BotChannels.update(chanid, { $set: objset });
      }
    },
    setChanSettings: function (chanid, field, value) {
      let bc = BotChannels.findOne(chanid);
      if (bc === undefined)
        return;
      objset = {};
      objset[field] = value;
      BotChannels.update(chanid, { $set: objset });
    },

    // Aggregation for counting # of people per country
    aggregateUserField: function (chan, field) {
      if (!chan) return;
      // Check user is owner or admin
      // Chec 
      let sobj = {};
      sobj[chan] = { $exists: true }
      let idfield = "$" + field;
      let nums = UserLocations.find(sobj).count();

      let pipeline = [];
      pipeline.push({
        $match: sobj
      });
      pipeline.push({
        $group: {
          _id: idfield,
          t: {
            $sum: 1
          }
        }
      });
      pipeline.push({
        $project: {
          "t": 1,
          "p":
          {
            $round: [

              { "$multiply": [{ "$divide": ["$t", { "$literal": nums }] }, 100] }
              , 2
            ]
          }
        }
      });

      let res = UserLocations.aggregate(pipeline);
      //      console.error(res);
      return res;
    },
    export_userloc: function (channame) {
      if (this.userId) {
        console.error('export', channame)
        let sel = {}
        sel[channame] = { $exists: 1 }
        let res = UserLocations.find(sel, { sort: { dname: 1 } }).fetch().map((item) => {
          return ([item.dname, item.location, item.latitude, item.longitude, item.country, item.msg].join(';'))
        });
        res.unshift('Name;Location;Latitude;Longitude;Country;Message')
        return res.join('\n');
      }
    },
    export_live_events: function(from,to,team) {
      let sel={};
      if (team) sel.team=team;      
      //Channel list
      let chans = BotChannels.find(sel).fetch().map((c)=>c.channel);
      chans.unshift('TimeStamp');

      // Live state
      curState=chans.map(()=>0);

      if (from || to) {
        sel.timestamp= {}
        if (from) 
          sel.timestamp.$gt = from
        if (to) 
          sel.timestamp.$lt = to
      }

      let res=[];
      res.push(chans.join(';'));
      console.info(chans);
      let curs = LiveEvents.find(sel, {sort: {timestamp:1}});
      curs.forEach((ev)=> {
        curState[0] = Math.floor(ev.timestamp/1000);
        let index = chans.indexOf(ev.channel);
        curState[index] = ev.live?1:0;
        res.push(curState.join(';'));
        console.info(curState);
      })
      return res.join('\n');
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

  let bot_channels = BotChannels.find({ enabled: true }).fetch().map(i => i.channel);
  console.info('Connecting to channels:', bot_channels);

  let raid_bot_channels = BotChannels.find({ enabled: false, raids: true }).fetch().map(i => i.channel);
  console.info('Connecting to channels for raid monitoring only:', raid_bot_channels);

  // Connection to TWITCH CHAT
  // Define configuration options
  const opts = {
    identity: {
      username: botname,
      password: botpassword,
    },
    channels: bot_channels,
    connection: { reconnect: true }
  };
  // Create a client with our options
  const bclient = new tmi.client(opts);

  const opts_raid = {
    identity: {
      username: botname,
      password: botpassword,
    },
    channels: raid_bot_channels,
    connection: { reconnect: true }
  };
  //  opts.channels = raid_bot_channels;
  const raid_bclient = new tmi.client(opts_raid);

  // options
  // dispname: name of the user to answer to
  function say(target, txt, options) {
    try {
      options = options || {};

      // Check if there is a {{ }} for Phrase it
      if (txt.indexOf('{{') >= 0) {
        txt = PhraseIt.make(txt);
      }
      
      let chat_txt = ((options.me===true)?"/me ":"") + replaceKeywords(txt,options);
      bclient.say(target, chat_txt);
      console.info(target, '>', chat_txt, options);

      if (options.store) {
        // Overlay text doesn't contain twitch emotes
        options.removeIcons = true;
        let overlay_txt = replaceKeywords(txt,options);
        BotMessage.upsert({channel: target}, {$set: {txt:overlay_txt}});
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Updates user interaction timestamp for users who are on the map
  // and also in greetDate array for skipping next greet
  function updateInteractionStamp(username, u, chan) {
    // Activity (map)
    let d = Date.now(); // new Date();
    if (u != undefined) {
      let uo = {};
      uo[chan] = d
      UserLocations.update(u._id, { $set: uo });
    }

    // Last Greet (greetings)
    if (username != undefined) {
      let o = {}
      o[chan] = d;
      //      console.error(o);
      GreetDate.upsert({ name: username }, { $set: o })
      //      console.error(GreetDate.findOne({name:username}));
    }
  }

  // Register our event handlers (defined below)
  //  bclient.on('message', Meteor.bindEnvironment(onMessageHandler));
  bclient.on('chat', Meteor.bindEnvironment(onMessageHandler));
  bclient.on('connected', onConnectedHandler);
  bclient.on('raided', Meteor.bindEnvironment(onRaidedHandler));

  raid_bclient.on('connected', onConnectedHandler);
  raid_bclient.on('raided', Meteor.bindEnvironment(onRaidedHandler));

  // Connect to Twitch:
  bclient.connect();
  raid_bclient.connect();

  // Default regex for parsing requests
  const default_regsonglistreq1 = /(.*) \brequested\s(.*)\s\bat position/
  const default_regsonglistreq2 = /@(.*), (.*)added to queue/

  // Called every time a message comes in
  function onMessageHandler(target, context, msg, self) {

    if (self) { return; } // Ignore messages from the bot itself

    let commandName = msg.trim();
    // chan is the channel's name (without #)
    let chan = target.substring(1).toLowerCase();
    // username est tres utilisé, et deja en minuscule, mais on veut en etre sur
    let username = context.username.toLowerCase();
    // Displayed name
    let dispname = context['display-name'].trim();
    // Name used for answering
    let answername = '@' + dispname; //context['display-name'].trim();

    // get botchan object in DB
    let botchan = BotChannels.findOne({ channel: chan });
    if (botchan === undefined) return;

    let isModerator = (context.mod === true);
    let isBroadcaster = false;
    if (context.badges)
      if (context.badges.broadcaster) {
        isBroadcaster = true;
        isModerator = true;
      }
    //    console.error(context, isModerator);

    let dnow = new Date();
    console.error(dnow.toLocaleDateString(), dnow.toLocaleTimeString(), '#' + chan, '< [' + username + ']', commandName);

    // Songlisbot requests
    if (username == "songlistbot" && botchan.map === true) {
      try {
        if (botchan.songrequest) {
          // Try default regexs, as songlistbot has different messages for request      
          let slbparse = commandName.match(default_regsonglistreq1);
          if (!slbparse)
            slbparse = commandName.match(default_regsonglistreq2);

          // Optional regexp (for non standards messages / additional languages)
          if (!slbparse && botchan.requestregex1)
            slbparse = commandName.match(RegExp(botchan.requestregex1));
          if (!slbparse && botchan.requestregex2)
            slbparse = commandName.match(RegExp(botchan.requestregex2));

          if (slbparse) {
            let req_user = slbparse[1].toLowerCase();
            let req_song = slbparse[2];

            let rul = UserLocations.findOne({ name: req_user });
            // Removes @
            if (req_user[0] === '@')
              req_user = req_user.substring(1);
            console.info('-- SONG REQUEST:', req_user, req_song)
            if (rul) {
              let objupdate = {
              }
              objupdate[chan + '-lastreq'] = req_song;
              console.info(' => update map:', objupdate);

              UserLocations.update(rul._id, { $set: objupdate })
            }
          }
        }

      } catch (e) { console.error(e) }
      return;
    }



    // Check if the message starts with #name
    // in that case, extract the name and move it at the end of the message, and process the message
    if (msg[0] === '@') {
      let atnameEndIndex = msg.indexOf(' ');
      let atname = msg.substring(0, atnameEndIndex);
      let fmsg = msg.substring(atnameEndIndex + 1);
      msg = fmsg + ' ' + atname;
      commandName = msg;
      //console.info('Changed message :', msg);
    }

    let lccn = commandName.toLowerCase();

    let cmd = '';
    let cmdarray = [];

    // Filter commands (options)
    if (commandName[0] === '!') {

      cmdarray = commandName.split(' ').filter(function (item) {
        try {
          return (item.length > 0)
        }
        catch (e) {
          console.error(e);
          return false;
        }
      });
      cmd = cmdarray[0].substring(1).toLowerCase();
    }

    if (botchan.active_users === true) {
      // Add user to active user list.

      // Ignore broadcaster
      if (!isBroadcaster) {
        const exceptnames = ['streamelements', 'songlistbot', 'nightbot'];
        if (exceptnames.indexOf(username) < 0) {

          // Keep track os last active users 
          if (!last_active_users[chan]) {
            last_active_users[chan] = [];
          }

          let ar = last_active_users[chan];
          let index = ar.findIndex(val => val.name === dispname);

          //console.error('find', dispname, index)
          if (index >= 0) {
            // Remove last occurence with this user
            ar.splice(index, 1);
          }
          ar.push({ name: dispname, ts: dnow, msg: msg });

          // Keep only 40 names in the list
          let maxnames = 32;
          //        if (botchan.active_max) maxnames = botchan.active_max;
          if (ar.length > maxnames) {
            ar.shift();
          }
          last_active_users[chan] = ar;
          //console.error(last_active_users[chan]);
        }
      }

      //console.error(last_active_users);
      if (cmd === "exception" || cmd === "exceptions" || cmd == 'lastactive') {
        if (isModerator) {
          //        console.error('last active=', last_active_users);
          //            let active_max = 40;
          let active_since = 1000 * 60 * 60 * 2; // default 1 hour?

          try {
            if (botchan.active_since && botchan.active_since > 0)
              active_since = 1000 * 60 * botchan.active_since;
            //              if (botchan.active_max) active_max = botchan.active_max;
          }
          catch (e) { console.error(e); }

          console.error(active_since);

          if (last_active_users[chan]) {

            let res = last_active_users[chan].filter((item) => { return (dnow - item.ts < active_since); });
            //console.error(res);

            if (res.length >= 0) {
              let extxt = res.map((item) => item.name).join(', ');
              //console.error(extxt);
              say(target, extxt);
            }
          }
        }
        return;
      }
    }


    // -------------HUG -----------------
    if (botchan.hug === true) {
      if (cmd === 'hug' || cmd === 'hugs') {
        let hugsentence = '';
        // By default, a random adjective is used to qulify the hug.
        let adjective = '{{an_adjective}}';
        // But we can use a comma separated keyword list (if we only want nice hugs for example)
        if (botchan.hug_adjectives) {
          let a = botchan.hug_adjectives.split(',');
          if (a.length > 1) {
            adjective = randElement(a).trim();
          }
        }
        if (cmdarray.length > 1) {
          let hugname = cmdarray[1];
          if (hugname[0] != '@') hugname = '@' + hugname;
          hugsentence = answername + ' gives ' + hugname + ' ' + adjective + ' hug #icon';
        }
        else {
          hugsentence = 'I give ' + answername + ' ' + adjective + ' bot hug #icon';
        }
        say(target, hugsentence);
      }
    }

    // Remove whitespace from chat message
    if (cmd === "statement") {
      say(target, randSentence());
      return;
    }

    if (cmd === "poem") {
      let res = randSentence();
      for (let i = 0; i < 3; i++) res += ' / ' + randSentence();
      say(target, res);
      return;
    }

    // ---------------- Chord generator --------------------
    // !note !notes !chord !chords !prog commands
    if (isModerator) {
      if ((cmd === "prog") || (cmd === "note") || (cmd === 'notes') || (cmd === "chord") || (cmd === 'chords')) {
        let options = {};

        let numnotes = 1;
        if (cmd.endsWith('s') || cmd === 'prog') {
          numnotes = 4;
        }
        let firstExtraIndex = 2;

        // First parameter should be the number of notes
        if (cmdarray.length > 1) {
          let nc = parseInt(cmdarray[1]);
          if (nc > 1) {
            if (nc > 16) nc = 16;
            numnotes = nc;
          }
          else
            firstExtraIndex = 1; // it was not a number, so it must be a chord or a note
        }

        options.num = numnotes;

        // Mode note, pas d'accord.
        if (cmd.startsWith('note'))
          options.onlynotes = true;


        if (cmdarray.length > firstExtraIndex) {
          options.chords = [];
          options.notes = [];

          for (i = firstExtraIndex; i < cmdarray.length; i++) {
            let ci = cmdarray[i];
            if (noteArray.indexOf(ci.toUpperCase()) < 0)
              options.chords.push(ci);
            else
              options.notes.push(ci);
          }
        }
        //console.error(options);

        let res;
        if (cmd === "prog")
          res = genProgression(options);
        else
          res = genChord(options);

        console.info(cmd, res);
        say(target, res);
        return;
      }

    }



    const langExpl = ['For example !en will translate your sentence in english. Or !pt to translate into portuguese.',
      'Available translation commands: !cn !de !en !es !fi !fr !it !jp !kr !pl !pt !ro !ru !tu ...'
    ];

    // -------------- Traduction -----------------------
    if (botchan.tr === true) {
      // Command for enabling translation for a user during a few minutes
      // Only mods can use it

      if (isModerator && cmd === "translate") {
        if (cmdarray.length > 1) {
          let u = cmdarray[1].toLowerCase()
          /// Remove @
          if (u[0] === '@') u = u.substring(1);
          console.error(u);

          // 5 minutes by default
          let atdt = 5;

          if (cmdarray.length > 2) {
            if (cmdarray[2] === 'off') {
              atdt = 0;
            }
            else {
              atdt = parseInt(cmdarray[2]);
            }
          }
          if (atdt > 0) {
            console.info('Autotranslate enabled for ', u)
            autotranslate[u] = Date.now() + atdt * 60 * 1000;
          }
          else {
            console.info('Autotranslate disabled for', u)
            delete autotranslate[u];
          }
          console.info(autotranslate);
          return;
        }
      }

      if (cmd === "lang") {
        say(target, 'I can (approximately) translate your messages. ' + randElement(langExpl));
        return;
      }

      // Commands for displaying messages explaining the translation feature in various languages
      // TODO: sentences
      const explanations = {
        //    'germans': '',
        //    'spanish': '',
        'french': 'Vous pouvez utiliser notre bot traducteur. Commencez votre message par !en pour traduire votre message en anglais. Par exemple "!en Bonjour"',
      }
      if (cmd in explanations) {
        say(target, explanations[cmd]);
        return;
      }

      // Autmatic translation?
      let autotr = false;

      if (autotranslate[username] && (autotranslate[username] > Date.now())) {
        autotr = true;
      }

      //console.error(username, autotr);

      if (cmd in tr_lang || autotr) {

        let ll = tr_lang.en;
        // Remove some words (emotes for example)
        let txt = commandName.replace(/ LUL/g, '');

        if (!autotr) {
          ll = tr_lang[cmd];
          // Remove command
          txt = txt.substring(1 + cmd.length);
        }

        //console.error(ll);

        // TODO: remove Urls too

        // Min/Max length of text to translate
        let lazy = false;
        if (txt.length > 2) {

          // Texte trop long?
          if (txt.length > 200) {
            lazy = true;
            txt = "I'm too lazy to translate long sentences ^^";
          }

          // Lazy mode, and english target => no translation, only displays 'lazy' message in english
          if ((lazy === true) && (ll[0].indexOf('en') == 0)) {
            say(target, context['display-name'] + ', ' + txt);
            return;
          }

          // Translate text
          gtrans(txt, { to: ll[0] }).then(res => {
            if (lazy === true) {
              // Lazy message in english & target language
              say(target, context['display-name'] + ', ' + txt + '/' + res.text);
            }
            else {

              // Actually Translate text
              // TODO: Check is translated text == original text. In that case it
              // means the command was not correctly used (ex: "!en hello friends")

              // Filter the answer to avoid jokes like:

              // 3/26/2021 11:43:05 !en me está picando la cara
              // 3/26/2021 11:43:05 says: I'm fucking my face              

              //res.text = res.text.replace(/fuck/g,'****');
              if (res.text.indexOf('fuck') >= 0) {
                res.text = "I think that would be offensive if i said that";
                say(target, context['display-name'] + ' ' + res.text);
                return;
              }

              say(target, context['display-name'] + ' ' + ll[1] + ': ' + res.text);
            }
          }).catch(err => {
            console.error('Translation Error:', err);
          });

          // +1 in monthly stats
          let d = new Date();
          Stats.upsert({ 'chan': target, 'year': d.getFullYear(), 'month': d.getMonth() }, { $inc: { count: 1 } });
          return;
        }
      }

    }




    // ------------------- MAP -------------------------
    if (botchan.map === true) {
      //  Depending on the channel, guest account differs.
      if (cmd.indexOf('map') == 0) {
        let url = Settings.findOne({ param: 'URL' });
        //console.error(url);

        if (url) {
          say(target, "You can access our EarthDay map here: " + url.val + "/c/" + chan);
        }
        return;
      }

      if (cmd.indexOf('forget') == 0) {
        UserLocations.remove({ name: username });
        say(target, "it's done " + answername + " !");
      }

      if (cmd.indexOf('where') == 0) {
        pdoc = UserLocations.findOne({ name: username });
        if (pdoc) {
          say(target, answername + " You've told me you were from " + pdoc.location + '. If you want me to forget your location, use !forget');
          return;
        }
        else {
          say(target, "Sorry " + answername + " I don't know where you're from. Please use !from command to tell me!");
          return;
        }
      }

      if (cmd.indexOf('show') == 0) {
        pdoc = UserLocations.findOne({ name: username });
        if (pdoc === undefined) {
          say(target, "Sorry " + answername + " I don't have you location in my database. Please use '!from city,country' command first.");
          return;
        }
        else {
          UserLocations.update(pdoc._id, { $set: { allow: true } });
          say(target, "Ok, your nickname will be displayed on the map! " + answername + ' Use !msg to add a personalized message on the map');
          return;
        }
      }

      if (cmd.indexOf('mask') == 0) {
        pdoc = UserLocations.findOne({ name: username });
        if (pdoc === undefined) {
          say(target, "Sorry " + answername + " I don't have your location in my database. Please use '!from city,country' command first.");
          return;
        }
        else {
          UserLocations.update(pdoc._id, { $set: { allow: false } });
          say(target, "Ok! " + answername);
          return;
        }

      }

      if ((cmd.indexOf('msg') == 0) || (cmd.indexOf('message') == 0)) {
        pdoc = UserLocations.findOne({ name: username });
        if (pdoc === undefined) {
          say(target, "Sorry " + answername + " I don't have you location in my database. Please use '!from city,country' command first.");
          return;
        }
        else {
          msg = commandName.substring(cmd.length + 1).trim();
          if (msg.length == 0) {
            say(target, "use '!msg +message' for adding a personalized message on the map");
          }
          else {
            msgobj = {};
            msgobj[chan + '-msg'] = msg;
            UserLocations.update(pdoc._id, { $set: msgobj });
            say(target, "Ok! " + answername);
          }
          return;
        }
      }

      // Close
      if (cmd.indexOf('closest') == 0 || cmd.indexOf('neighbour') == 0 || cmd.indexOf('neighbor') == 0) {
        let me = UserLocations.findOne({ name: username });

        if (me === undefined) {
          say(target, answername + ", i couldn't find you on my map... Use !from command to tell me your location");
          return;
        }

        if (me.latitude === undefined) {
          say(target, answername + ",sorry i still need to process some data... please try again in a few minutes...");
          return;
        }

        let ares = findClosest(me._id, chan, 5);
        if (ares.length === 0) {
          say(target, answername + ",sorry i couldn't find someone close to your place...");
          return;
        }
        else {
          let arestr = ares[0];
          for (let i = 1; i < ares.length; i += 1)
            arestr += ', ' + ares[i];
          if (ares.length > 1)
            say(target, answername + ',your closest neighbours are ' + arestr);
          else
            say(target, answername + ',your closest neighbour is ' + arestr);
        }
        return;
      }

      if (cmd === 'from') {
        geoloc = commandName.substring(5).trim();
        if (geoloc.length < 2) {
          say(target, answername + " Please tell me the country/state/city where you're from, for example: !from Paris,France or !from Japan.");
          return;
        }
        else {
          // Check if there is a @ and if the user is a mod
          let words = geoloc.split(' ');
          words.forEach(function (w) {
            if (w.indexOf('@') == 0) {
              // Mods or broadcaster can change the location for someone
              //if ((context.mod === true) || (context.badges.broadcaster == 1)) {
              // ...only siko can do it currently.
              if (isModerator === true) {
                username = w.substring(1).toLowerCase();
                dispname = w.substring(1);
                context['display-name'] = w.substring(1);
                geoloc = geoloc.replace(w, '');
              }
              else {
                say(target, "Please tell me the country/state/city where you're from, for example: !from Paris,France or !from Japan. Although please do not provide too much information");
                return;
                //                say(target, answername + " Sorry you're not allowed to change the city of another viewer");
                //                return;
              }
            }
          });
        }
        //console.log('*FROM* user ' + context.username + ' ' + context['display-name'] + ' is from: ', geoloc);
        let now = Date.now();
        let delta = 2 * 60 * 1000;

        doc = {
          name: username,
          dname: dispname,
          location: geoloc.toLowerCase(),
          timestamp: now,
          channels: [target],
          allow: false,
        }
        // Interaction stamp
        doc[chan] = now;

        // Check if user has already given its location
        pdoc = UserLocations.findOne({ name: username });
        if (pdoc === undefined) {
          //Nouvel utilisateur
          UserLocations.insert(doc);

          if (delta > 60 * 1000) {
/*              addmess = [
                'Use !forget if you want me to forget your location!',
                'Use !show to allow me to display your nickname on the map',
                'Use !msg to add a personalized message on the map',
              ]*/;
            txt = 'Use !show to allow me to display your nickname on the map'; //,randElement(addmess); //.[Math.floor(Math.random() * (addmess.length - 1))];
            say(target, answername + " Ok, thanks! " + txt, username);
            return;
          }
          else
            say(target, answername + " Ok, got it! ", username);
          return;
        }
        else {
          // User's location already exists, in case a use gives location again,
          // geo coordinates and country will be recomputed.
          // Also dname could have changed (case)
          // And user can register on another channel

          // Channels where user has registered. (deprecated?)
          if (pdoc.channels.indexOf(target) < 0)
            pdoc.channels.push(target);

          let updateObj = { location: doc.location, channels: pdoc.channels, dname: doc.dname };
          // Timestamp for getting active on channel's map
          updateObj[chan] = now;
          UserLocations.update(pdoc._id, { $set: updateObj, $unset: { country: 1, latitude: 1, longitude: 1 } });
          say(target, answername + " Ok, i've updated my database!");
          return;
        }
      }
    }


    if (botchan.quizz === true) {

      if (cmd.indexOf('scores') === 0) {
        let s = QuizzScores.find({}, { limit: 3, sort: { score: -1 } });
        if (s.count() < 3) return;
        let sc = 'TTC Quizz Leaderboard: ';
        s = s.fetch();
        let a = ['1st', '2nd', '3rd'];
        for (let i = 0; i < 3; i++) {
          sc += a[i] + ': ' + s[i].user + ' (' + s[i].score + ' points) ';
        }
        say(target, sc);
        return;
      }

      if (cmd.indexOf('score') === 0) {
        let s = QuizzScores.findOne({ user: username });
        let sc = 0
        if (s !== undefined) sc = s.score;

        if (sc > 1)
          say(target, answername + ', you have correctly answered to ' + sc + ' questions');
        else
          say(target, answername + ', you have correctly answered to ' + sc + ' question');
        return;
      }

      if ((cmd.indexOf('clue') == 0) || (cmd.indexOf('help') == 0)) {
        if (curQuestion === undefined) {
          say(target, "I've not asked any question :p");
          return;
        }

        curQuestion.clue += 1;
        if (curQuestion.clue === 1) {
          let article = 'a';
          let fc = curQuestion.expAnswers[0].charAt(0).toUpperCase();
          if ("AEIOUH".indexOf(fc) >= 0) article = 'an';
          say(target, "Ok, the answer starts with " + article + " '" + fc + "'");
          return;
        }

        if (curQuestion.clue === 2) {
          let res = '';
          let showLetter = true;
          for (let i = 0; i < curQuestion.expAnswers[0].length; i++) {
            let l = curQuestion.expAnswers[0].charAt(i);
            if (l === ' ') {
              res += l;
              showLetter = true;
            }
            else {
              if (showLetter === true) {
                res += l.toUpperCase();
                showLetter = false;
              }
              else
                res += '-';
            }
          }
          say(target, "The answer looks like '" + res + "'");
          return;
        }

        if (curQuestion.clue === 3) {
          let res = '';
          let nc = 0;
          let nl = curQuestion.expAnswers[0].length;
          for (i = 0; i < nl; i++) {
            let l = curQuestion.expAnswers[0].charAt(i).toUpperCase();
            if ("AEIOUY ".indexOf(l) < 0) {
              res += '-';
            }
            else {
              nc += 1;
              res += l;
            }
          }
          if ((nc == 0) || (nc === nl))
            say(target, "No, i don't want to give any clue!");
          else
            say(target, "Answer looks like '" + res + "'");
          return;
        }

        say(target, "You also can search on Google :p");
        //        say(target, "You also can !skip the question :p");

        curQuestion.clue = 0;
        return;
      }

      if (cmd.indexOf('answer') === 0) {
        if (isModerator) {
          if (curQuestion !== undefined) {
            say(target, "The answer was '" + curQuestion.expAnswers[0]);
            curQuestion = undefined;
            return;
          }
          else
            say(target, "Start a quizz with !quizz command");
          return;
        }
      }
      // Si une question a été posée, on verifie la réponse
      // Commande pour lancer un quizz (ou reposer la question)
      if ((cmd.indexOf('quizz') === 0) || (cmd.indexOf('trivia') === 0)) {
        // A on une question en cours?
        // Topic?
        if (curQuestion === undefined) {
          selectQuestion();
        }
        say(target, curQuestion.question);
        return;
      }
      // Force new question
      if ((cmd.indexOf('skip') === 0)) {
        selectQuestion();
        say(target, 'Ok, next question: ' + curQuestion.question);
        return;
      }

      // Verification de la réponse
      // Filtre les bots
      if ((curQuestion != undefined) && (username !== "streamelements") && (username !== "moobot")) {
        let ca = false;
        //console.error(curQuestion, commandName);
        for (let i = 0; (i < curQuestion.expAnswers.length) && (ca === false); i++) {
          if (commandName.toLowerCase().indexOf(curQuestion.expAnswers[i].toLowerCase()) >= 0) ca = true;
        }

        if (ca === true) {
          let delta = Date.now() - curQuestion.date;
          let dtxt = ''
          if (curQuestion.comment != undefined)
            if (curQuestion.comment.length > 0)
              dtxt += ' ' + curQuestion.comment;
          delta = Math.floor(delta / 100);
          delta = delta / 10;
          if (delta < 20)
            dtxt += ' (you answered in ' + delta + ' seconds !)';
          //console.error(delta);

          say(target, answername + " That's correct! The answer was '" + curQuestion.expAnswers[0] + "'" + dtxt);
          curQuestion = undefined;
          // Incrémente le score
          try {
            QuizzScores.upsert({ user: username }, { $inc: { score: 1 } });
          }
          catch (e) {
            console.error(e);
          }
          return;
        }
      }
    }

    // ---------- catch !so command by moderators
    // For sending a discord notification, and storing in database or simply greet
    if (isModerator === true && (botchan.detectso === true)) {

      // SO storage can be enabled/disabled
      if (cmd === 'store-so' || cmd === 'twitchfinds' || cmd === 'twitch-finds') {
        // Enable/disable so store, defines a label
        let label = new Date().toUTCString();
        if (cmdarray.length > 1) {
          cmdarray.shift();
          label = cmdarray.join(' ').trim();
        }
        BotChannels.update(botchan._id, { $set: { storeso_label: label } });

        if (label.toLowerCase() === 'off') {
          say(target, 'Shoutout monitoring is now off')
        }
        else {
          say(target, 'Shoutout monitoring is now enabled, using label ' + label + '. Use "!' + cmd + ' off" to disable it.');
        }
        return;
      }

      // Extract parameter
      if (cmd === 'so') {
        // Extract the 2nd parameter, removes @ symbols
        if (cmdarray.length > 1) {
          let soname = cmdarray[1];
          // Remove @
          if (soname[0] === '@')
            soname = soname.substring(1);

          if (botchan.storeso === true) {
            // Also store in database
            let label = botchan.storeso_label;
            if (!label) {
              label = 'off'
            }
            ShoutOuts.insert({ chan: target, so: soname, timestamp: Date.now(), username: username, label: label })
          }

          if (botchan.discord_so_url) {
            let label = botchan.storeso_label;
            if (!label) {
              label = 'off'
            }
            if (label.toLowerCase() != 'off') {
              const title = 'https://twitch.tv/' + soname;
              sendDiscord(title, botchan.discord_so_url);
            }
          }

          if (botchan.so === true) {
            // SO hook, for greetings
            // Check if this user exists in Greetings Collection
            let gmlist = getGreetMessages(soname, chan);
            let gmline = '';
            if (gmlist.length === 0) {
              gmlist = ["#follow #twitch #icon"];
              gmline = randElement(gmlist);
            }
            else {
              gmline = randElement(gmlist).txt;
            }
            //console.error('so', gmline);

            if (gmline.length > 0) {
              //gmline = replaceKeywords(gmline, {dispname: soname});
              gmline = gmline.replace(regext, "https://twitch.tv/" + soname + ' ');
              say(target, gmline, {dispname: soname, me : botchan.me});
            }
          }
          return;
        }
      }
    }


    // Commands starting with the name of the team (if any)
    let t = botchan.team;
    if (t) {
      if (cmd.indexOf(t) === 0) {

        // Live channels, from the same team (but not the current channel)
        const res = BotChannels.find({ live: true, team: t, channel: { $ne: chan } }, { sort: { live_started: -1 } });

        if (cmd.indexOf('live') > 0) {

          if (res.count() === 0) {
            say(target, 'No one from team ' + t + ' is currently live. (except ' + chan + ' of course)');
            return;
          }

          let tm = res.fetch().map((c) => c.channel).join(', ');
          say(target, 'Currently live from team ' + t + ' : ' + tm);
          return;
        }

        if (cmd.indexOf('raid') > 0) {
          if (isModerator) {

            if (res.count() === 0) {
              say(target, "There's nobody from team  '+t +' we could raid right now...");
              return;
            }

            let tm = res.fetch().map((c) => c.channel);
            let rc = randElement(tm);
            say(target, '/raid ' + rc);
            return;
          }
        }

        if (botchan.advertteam ===true) {
          let m = Settings.findOne({ param: 'team-' + t });
          console.error(m);
          if (m) {
            say(target, m.val);
            return;
          }
        }

      }
    }

    // ------------------- GREET ----------------------
    if (botchan.greet === true) {
      // dnow?
      let d = Date.now();
      // Check if user has not already been greeted recentky
      // In this case, do nothing
      let candidate = true;
      let g = GreetDate.findOne({ name: username });
      if (g)
        if (g[chan])
          if (d - g[chan] < 1000 * 60 * 60 * 8) {
            candidate = false;
          }

      //      console.error(username, candidate,greetDate);

      if (candidate === true) {

        let u = UserLocations.findOne({ name: username });
        // Update greet timestamp for user on the map
        // and also for skipping next interaction during 8 hours 
        updateInteractionStamp(username, u, chan);

        // if in mute mode, do nothing
        // Warning, if muteGreet mode is disabled, 
        // bot won't immediately greet people if timestamp has recently been updated. 
        if (botchan.muteGreet === true)
          return;

        let gmtext = getGreetMessages(username, chan);

        let r = -1;
        // Check if user in in greet database or in the map
        // Pick up randomly a message
        // If user is in both databases, 
        // - select generic message in 20% of the cases, and a personalized message in 80% of the cases

        let selGenSentence = true;
        if (gmtext.length > 0) {
          if (u != undefined) {
            r = Math.random();
            if (r < 0.8)
              selGenSentence = false;
          }
          else
            selGenSentence = false;
        }

        // Phrase generique (basée sur la langue/map)
        if (selGenSentence === true) {
          if (u) {
            // on a son pays
            let lang = 'EN';

            if (u.country) {
              let ccode = u.country.toLowerCase();
              if (ccode in country_lang) {
                lang = country_lang[ccode];
              }
            }
            else {
              console.warn('No Country code for ', u)
            }
            lang = lang.toLowerCase();

            let gm = GreetMessages.findOne({ username: lang });
            //console.error('Greet Language = ', lang);
            if (gm) {
              gmtext = gm.texts;

              //              if (u.hasOwnField("longitude")) {
              if (u.longitude != undefined) {
                // Calcul de l'heure locale de l'utilisateur
                let localH = 1 + dnow.getUTCHours() + u.longitude / 15;

                gmtext = gmtext.filter((item) => {
                  if (item.enabled != true) return false;
                  if (item.hmin != undefined) {
                    let a = item.hmin;
                    let b = item.hmax;
                    if (a < b)
                      return ((localH >= a) && (localH <= b))
                    return ((localH >= a) || (localH <= b));
                  }
                  else
                    return true;
                });
                //console.error('utc=', dnow.getUTCHours(), 'long=',u.longitude, 'localh=', localH, 'num sentences=',gmtext.length);
              }
            }
          }
        }

        if (gmtext.length > 0) {
          // TODO: Filtrer les textes désactivés (enabled)
          let txt = randElement(gmtext).txt;
          //console.error(gm.texts,txt);

          //txt = replaceKeywords(txt, {dispname:dispname});

          if ((selGenSentence == false) && botchan.socmd) {
            // Vérifier qu'il y a un #twitch dans la phrase? permet de filtrer ce qui n'est pas !so
            // Sinon on ne fait rien
            if (txt.indexOf('#twitch') >= 0) {
              txt = txt.replace(regext, "");
              txt = botchan.socmd + ' ' + dispname + ' - ' + txt;
            }
          }
          else
            txt = txt.replace(regext, "https://twitch.tv/" + username + ' ');

          greetingsStack.push({ 
            target: target, 
            txt: txt, 
            me: (botchan.me === true && selGenSentence === false),
            dispname: dispname
          });
          return;
        }
        //}
      }
    }

    // Get list of commands
    // FIXME: use a  short name for bot,in settings
    const botname_short = 'ttc';
    if (cmd.indexOf(botname_short+'-command') === 0 ) {
      let url = Settings.findOne({ param: 'URL' });
      if (url) {
        say(target, "You'll find available commands for ttcBot here: " + url.val + "/c/" + chan + '/commands')
        return;
      }
    }

    // Test command to retrieve infos
    if (cmd === 'test') {
      console.info(target, context);
    }

    // Check if the message is for the bot     
    if ((lccn.indexOf('@' + botname) >= 0)) //|| ((lccn.indexOf('tangerinebot') >= 0)) ((lccn.indexOf('ttcbot') >= 0)) || ((lccn.indexOf('tangerine bot') >= 0))) {
    {
      // If someone wants to ban the bot
      if (cmd=='ban') {
        say(target, 'Do you want me to ban you, ' + answername + '? :P');
        return;
      }

/*      if ( (lccn.indexOf('bday')>=0) || (lccn.indexOf('birthday')>=0) || (lccn.indexOf('feliz')>=0) || (lccn.indexOf('joyeux')>=0) )
      {
        const bdaytxts = [
          'beep beep boop '+answername,
          'beep boop! beep beep boop, '+answername,
          answername+ ' <3 <3 <3 ',
          'thank youuuu '+answername +' :)',
        ]
        //txt = ;
        say(target, randElement(bdaytxts)); // + ' ' + answername);
        return;
      }
*/

      let txt;
      let txts = [
        "I'm only a bot, you know! #icon",
        "I'm a nice bot, you know! #icon",
        "Do you want to be my friend?",
        "I'm very shy! #icon",
        '^^ ',
        '<3 <3 <3 ',
        ':) ',
        ':D :D :D ',
        ':) :) :) ',
        '#icon #icon #icon'
      ];

      if (lccn.indexOf('?') >= 0) {
        if (lccn.indexOf('why') >= 0)
          txts = ["I really don't know", "Why not?"];
        if ((lccn.indexOf('explain') >= 0) || (lccn.indexOf('can') >= 0))
          txts = ["For Sure!", "Of course!"];

        txt = randElement(txts);
        say(target, txt + ' ' + answername);
      }
      else {
        txt = randElement(txts);
        say(target, answername + ' ' + txt, {store:true});
      }
      return;
    }



  };

  // Called every time the bot connects to Twitch chat
  function onConnectedHandler(addr, port) {
    try {
      console.log(`* Connected to ${addr}:${port}`);
    } catch (e) {
      console.error(e);
    }
  }

  function onRaidedHandler(channel, raider, vcount, tags) {
    try {
      let chan = channel.toLowerCase();
      chan = chan.substring(1);
      let num = parseInt(vcount);

      if (isNaN(num)) {
        console.error('Num viewers is NAN! ', vcount);
        num = 1;
      }

      let bc = BotChannels.findOne({ channel: chan });

      //console.log(`>>>> ${channel} ${chan} Raided by ${raider} with ${num} viewers, ${tags}`);

      try {
        Raiders.upsert({ raider: raider, channel: chan }, { $inc: { count: 1, viewers: num } });
      }
      catch (e) {
        console.error(e);
      }

      //      if (bc.raids !== true)
      //        return;

      try {
        let title = raider + " is raiding " + chan + " with " + num + " viewers";
        title += '\n';
        title += 'https://twitch.tv/' + raider;

        // Global URL(s)
        if (bot_discord_raid_url)
          sendDiscord(title, bot_discord_raid_url);

        // Per channel URL(s)
        // Check if there is a  target channel for raids
        if (bc.discord_raid_url && bc.discord_raid_url.length > 1) {
          //console.error('discord channel raid hook', bc.discord_raid_url);
          sendDiscord(title, bc.discord_raid_url);
        }
      }
      catch (e) {
        console.error(e);
      }

    } catch (e) {
      console.error(e);
    }
  }

  //   onRaidedHandler('#sikorama','duobarao',10);
  function onStateHandler(channel, state) {
    try {
      console.log(`>>>>>> ${channel} State changed`, JSON.stringify(state));
    } catch (e) {
      console.error(e);
    }
  }

  function onActionHandler(channel, userstate, message, self) {
    try {
      if (self) return;
      console.log('>>>>', channel, 'Action', JSON.stringify(userstate), 'm=', message);
      // check /raid commands
      if (message.indexOf('/raid') === 0) {
        console.log('>>>>', channel, 'RAID COMMAND', message);
      }
    } catch (e) {
      console.error(e);
    }
  }

});
