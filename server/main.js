/*
 * The Tangerine Bot
 * Main Server file / entry point
 * 
 */


import { Meteor } from 'meteor/meteor';
//import { AccountsTemplates } from 'meteor/useraccounts:core';
import { BotChannels, GreetDate, GreetMessages, LiveEvents, QuizzScores, Raiders, Settings, ShoutOuts, Stats, SubEvents, UserLocations } from '../imports/api/collections.js';
import { regext } from '../imports/api/regex.js';
import { genChord, genProgression, noteArray } from './chords.js';
import { country_lang } from './const.js';
import { getGreetMessages, init_greetings } from './greetings.js';
import { checkLiveChannels, sendDiscord } from './notifications.js';
import { init_publications } from './publications.js';
import './publications/_publications';
import { getCurQuestion, init_quizz, selectQuestion } from './quizz.js';
//import { init_radio } from './radio.js';
import { tr_lang_alias, tr_lang_desc } from '../imports/api/languages.js';
import { initRaidManagement } from './raids.js';
import { init_rss } from './rss.js';
import { randElement, randSentence } from './tools.js';
import { assertMethodAccess, init_users } from './user_management.js';

import { connect_chat, connect_raid, init_client, say } from './client.js';
import { findClosest, init_geocoding, userfindClosest } from './geocoding.js';
import { processWordLyricsQuizz, startLyricsQuizz, stopLyricsQuizz } from './lyricsquizz';
import { manageScoreCommands } from './scores.js';
import { twitch_finds_on, twitch_finds_off } from './twitchfinds.js';
import { onAnongiftpaidupgrade, onCheer, onGiftpaidupgrade, onResub, onSubgift, onSubmysterygift, onSubscription } from './subscriptions.js';
import './aggregations/_aggregations';

const gtrans = require('googletrans').default;
//const gc = require('node-geocoder');



// global Hooks => get from env variable
['BOT_DISCORD_RAID_HOOK',
  'BOT_DISCORD_ADMINCALL_HOOK',
  'BOT_DISCORD_LIVE_HOOK',
  'BOT_DISCORD_BAN_HOOK',
  'BOT_DISCORD_NOTGREETED_HOOK'].forEach((vs) => {
    let pv = process.env[vs];
    if (pv) Settings.upsert({ param: vs }, { $set: { val: pv } });
  });

//var bot_discord_live_url = Settings.findOne({ param: 'BOT_DISCORD_LIVE_HOOK' })?.val;
var bot_discord_raid_url = Settings.findOne({ param: 'BOT_DISCORD_RAID_HOOK' })?.val;
var bot_discord_admincall_url = Settings.findOne({ param: 'BOT_DISCORD_ADMINCALL_HOOK' })?.val;
var discord_autoban_url = Settings.findOne({ param: 'BOT_DISCORD_BAN_HOOK' })?.val;
var discord_notgreeted_url = Settings.findOne({ param: 'BOT_DISCORD_NOTGREETED_HOOK' })?.val;
let client_id = process.env.CLIENT_ID;
let client_secret = process.env.CLIENT_SECRET;

if (client_id != undefined) {
  console.info('Start Live Timer...');
  Meteor.setInterval(function () { checkLiveChannels(client_id, client_secret); }, 1000 * 60);
}

let botname = init_client();
console.info('Connecting',botname,'to chat');
let bclient = connect_chat();
let raid_bclient = connect_raid();

// Array to keep track of last active users (per channel)
let last_active_users = {};

const randomWords = [
  'ACTION',
  "BAH C'MON"
];

// Answering in english by default
// But we could use a language by default for a channel
// Or depending on the command user (!map or !carte)
// or using user's language if on the map (and resolved)


// Stack for answering to greetings.
// Greetings are not immediate in order to add a delay between multiple greetings
// Feels more natural, and also ueful in case of on screen notification, to avoid
// having notifications at the same time
// Only one stack for all greetings (not per channel)
let greetingsStack = [];

// Autotranslate feature
let autotranslate = {};



/*
AccountsTemplates.configure({
  forbidClientAccountCreation: true,
  enablePasswordChange: false,
  showForgotPasswordLink: false,
});
*/



Meteor.startup(() => {

  init_users();
  init_quizz();
  init_greetings();
  init_publications();
  initRaidManagement();
  //  init_radio();
  init_rss();
  init_geocoding();
  /**
   * 
   * @param {*} chan : name of channel (low cases, without heading '#')
   * @param {*} name : user name (low cases)
   * @returns 
   */
  function removeActiveUser(chan, name) {
    if (!chan)
      return [];

    if (!last_active_users[chan])
      return [];

    let index = last_active_users[chan].findIndex(item => item.name === name);
    if (index >= 0)
      last_active_users[chan].splice(index, 1);

    return last_active_users[chan];
  }

  Meteor.methods({
    getActiveUsers: function (chan) {
      assertMethodAccess('getActiveUsers', this.userId);

      if (!chan)
        return [];
      if (!last_active_users[chan]) return [];
      if (this.userId)
        return last_active_users[chan];

      return [];
    },
    removeActiveUser(chan, name) {
      assertMethodAccess('removeActiveUser', this.userId);

      removeActiveUser(chan, name);
    },
    getClosestUsers(chan, lat, lng, opt) {
      assertMethodAccess('getClosestUsers', this.userId);
      // We could check the used logger has access to the channel in parameter
      return findClosest(chan, lat, lng, opt);
    }
  });




  // Every 10 seconds, check if there's someone to greet
  // It allows to answer with a random delay, and also avoir too much
  // shoutouts at the same time (especially id displayed on screen)
  // (It's global to all channels)
  Meteor.setInterval(function () {
    try {
      if (greetingsStack.length > 0) {
        let g = greetingsStack.shift();
        say(g.target, g.txt, { me: g.me, dispname: g.dispname, store: true });
      }
    } catch (e) {
      console.error(e.stack);
    }
  }, 10 * 1000);


  // ---------------- Methods ------------------


  Meteor.methods({
    // Counts number of people registered on the map, for a given channel
    'getNumPeople': function (ch) {
      assertMethodAccess('getNumPeople', this.userId);

      let sobj = {};
      sobj[ch] = { $exists: true };
      return UserLocations.find(sobj).count();
    },
  });


  Meteor.methods({
    'sentence': function () {
      assertMethodAccess('sentence', this.userId);

      return randSentence();
    }
  });


  // Channels management
  Meteor.methods({
    removeChannel: function (chanid) {
      assertMethodAccess('removeChannel', this.userId);
      console.warn('Removing channel', chanid);
      BotChannels.remove(chanid);
    },
    toggleChanSettings: function (chanid, field) {
      assertMethodAccess('toggleChanSettings', this.userId);
      let bc = BotChannels.findOne(chanid);
      if (bc === undefined)
        return;
      let v = bc[field];
      let objset = {};
      objset[field] = !v;
      BotChannels.update(chanid, { $set: objset });
    },
    setChanSettings: function (chanid, field, value) {
      assertMethodAccess('setChanSettings', this.userId);

      let bc = BotChannels.findOne(chanid);
      if (bc === undefined)
        return;
      let objset = {};
      objset[field] = value;
      BotChannels.update(chanid, { $set: objset });
    },

    // Aggregation for counting # of people per country
    aggregateUserField: function (chan, field) {
      assertMethodAccess('aggregateUserField', this.userId);

      if (!chan) return;
      // Check user is owner or admin
      // Chec 
      let sobj = {};
      sobj[chan] = { $exists: true };
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

              { "$multiply": [{ "$divide": ["$t", { "$literal": nums }] }, 100] }, 2
            ]
          }
        }
      });

      let res = UserLocations.aggregate(pipeline);
      //      console.error(res);
      return res;
    },
    export_userloc: function (channame) {
      assertMethodAccess('export_userloc', this.userId);

      console.info('export', channame);
      let sel = {};
      sel[channame] = { $exists: 1 };
      let res = UserLocations.find(sel, { sort: { dname: 1 } }).fetch().map((item) => {
        return ([item.dname, item.location, item.latitude, item.longitude, item.country, item.msg, item.mail].join(';'));
      });
      res.unshift('Name;Location;Latitude;Longitude;Country;Message;Mail');
      return res.join('\n');
    },
    export_live_events: function (from, to, team) {
      assertMethodAccess('export_live_events', this.userId);

      let sel = {};
      if (team) sel.team = team;
      //Channel list
      let chans = BotChannels.find(sel).fetch().map((c) => c.channel);
      chans.unshift('TimeStamp');

      // Live state
      let curState = chans.map(() => 0);

      if (from || to) {
        sel.timestamp = {};
        if (from)
          sel.timestamp.$gt = from;
        if (to)
          sel.timestamp.$lt = to;
      }

      let res = [];
      res.push(chans.join(';'));
      console.info(chans);
      let curs = LiveEvents.find(sel, { sort: { timestamp: 1 } });
      curs.forEach((ev) => {
        curState[0] = Math.floor(ev.timestamp / 1000);
        let index = chans.indexOf(ev.channel);
        curState[index] = ev.live ? 1 : 0;
        res.push(curState.join(';'));
        console.info(curState);
      });
      return res.join('\n');
    }
  });


  function sendSOGreetings(botchan, target, soname) {
    try {

      // SO hook, for greetings
      // Check if this user exists in Greetings Collection (and is not banned)
      let gmlist = getGreetMessages(soname, botchan.channel);
      console.info(gmlist);
      // We could add "#follow #twitch #icon" to the array
      // but sometimes it's as if gmlis==[] although it should not be (it's in database...)
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
        say(target, gmline, { dispname: soname, me: botchan.me });
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
      uo[chan] = d;
      UserLocations.update(u._id, { $set: uo });
    }

    // Last Greet (greetings)
    if (username != undefined) {
      let o = {};
      o[chan] = d;
      //      console.error(o);
      GreetDate.upsert({ name: username }, { $set: o });
      //      console.error(GreetDate.findOne({name:username}));
    }
  }

  // Register our event handlers (defined below)
  // see https://github.com/tmijs/docs/blob/gh-pages/_posts/v1.4.2/2019-03-03-Events.md#ban
  bclient.on('message', Meteor.bindEnvironment(onMessageHandler));
  bclient.on('connected', onConnectedHandler);
  bclient.on('raided', Meteor.bindEnvironment(onRaidedHandler));
  bclient.on('ban', Meteor.bindEnvironment(onBanHandler));
  bclient.on('unban', Meteor.bindEnvironment(onUnBanHandler));
  bclient.on('notice', Meteor.bindEnvironment(onNotice));

  // subs & gifts
  bclient.on("anongiftpaidupgrade", Meteor.bindEnvironment(onAnongiftpaidupgrade));
  bclient.on("cheer", Meteor.bindEnvironment(onCheer));
  bclient.on("subgift", Meteor.bindEnvironment(onSubgift));
  bclient.on("subscription", Meteor.bindEnvironment(onSubscription));
  bclient.on("resub", Meteor.bindEnvironment(onResub));
  bclient.on("giftpaidupgrade", Meteor.bindEnvironment(onGiftpaidupgrade));
  bclient.on("submysterygift", Meteor.bindEnvironment(onSubmysterygift));

  raid_bclient.on('connected', onConnectedHandler);
  raid_bclient.on('raided', Meteor.bindEnvironment(onRaidedHandler));

  // Connect to Twitch:
  bclient.connect().catch(console.error);
  raid_bclient.connect().catch(console.error);

  // Default regex for parsing requests (english)
  const default_regsonglistreq1 = /(.*) \brequested\s(.*)\s\bat position/;
  const default_regsonglistreq2 = /@(.*), (.*)added to queue/;
  // FR:
  // @nickname [FR] Il y a ton sourire - Saez a été ajoutée à la file d'attente // [EN] Il y a ton sourire - Saez 
  //-- SONG REQUEST: fofffie [FR] Nobody Knows me At All  - The Weepies a été ajoutée à la file d'attente // [EN] Nobody Knows me At All  - The Weepies 
  // or 

  // Called every time a message comes in
  // target is the name of the channel with "#"
  function onMessageHandler(target, context, msg, self) {

    // Ignore messages from the bot itself
    if (self) return;  
    let username = context.username.toLowerCase();
    // Additional security for ignoring messages from the bot itself
    // in case we have multiple instances on the same channel
    if (username===botname) return;

    /** Incoming message */
    let commandName = msg.trim();
    /** chan is the channel's name (without #) */
    let chan = target.substring(1).toLowerCase();
    /** username uses lower cases only */
    
    
    /** Displayed name */
    let dispname = context['display-name'].trim();
    /** is message a whisper? */
    const isWhisper = (context['message-type'] === 'whisper');
    /** Timestamp */
    let dnow = new Date();
    // Log Message received
    console.info(dnow.toLocaleDateString(), dnow.toLocaleTimeString(), '#' + chan, '< [' + username + ']', commandName, isWhisper ? '[WHISPER]' : '');

    // Check if it's a whisper
    if (isWhisper === true) {
      console.info('whisper', target, context);
      //mailRegex=RegExp()

      // Detect one ore more mail addresses
      const regexmail = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
      let mail = msg.split(' ').filter((s) => regexmail.test(s));
      if (mail.length > 0) {
        console.info('Mail address whispered!', mail);
        //    UserLocations.      
        let doc = {
          name: username,
          dname: dispname,
          timestamp: dnow,
          mail: mail.join(',')
        };
        UserLocations.upsert({ name: username }, { $set: doc });
      }

      // TODO: remove the mail from the message, we don't need to post it on discord
      if (bot_discord_admincall_url) {
        let title = 'Whisper ' + username + ' from ' + chan + ' : ' + msg;

        if (mail.length > 0) {
          title += ' MAIL';
        }

        sendDiscord(title, bot_discord_admincall_url);

        // Responds to user's channel?? 
        say(target, '#icon');
      }
      return;
    }

    /** Name used for answering (witt @ */
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

    let cmdarray = [];

    // Songlisbot requests
    if (botchan.map === true && username === "songlistbot") {
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



            console.info('-- SONG REQUEST:', req_user, ":", req_song);
            if (rul) {
              let objupdate = {};
              objupdate[chan + '-lastreq'] = req_song;
              //console.info(' => update map:', objupdate);

              UserLocations.update(rul._id, { $set: objupdate });
            }
          }
        }

      } catch (e) { console.error(e); }
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

    /** cmd, in low case, without "!" */
    let cmd = '';

    // Filter commands (options)
    if (commandName[0] === '!') {

      cmdarray = commandName.split(' ').filter(function (item) {
        try {
          return (item.length > 0);
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
        const exceptnames = ['streamelements', 'songlistbot', 'nightbot', 'streamlabs'];
        if (exceptnames.indexOf(username) < 0) {

          let candidate = true;
          if (botchan.active_mods === true) {
            if (!isModerator)
              candidate = false;
          }

          if (candidate === true) {
            // Keep track of last active users 
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

          console.info(active_since);

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

    // custom commands, regex
    /* if (botchan.custom_commands) {
       try {
         custom_commands.forEach((r)=> {
           if (cmd.match(r.regex))  {
             console.info(r.name, 'Matched!')
             say(target, r.randElement(answer), {dispname: answername});
             return;
           }
         })
       } catch(e) {
         console.error(e);
       }
     }
 */

    // enable/disable features commands
    if (isModerator) {
      if ((cmd.indexOf('enable-') == 0) || (cmd.indexOf('disable-') == 0)) {
        const encmd = cmd.split('-');
        //console.error(chan, encmd);
        if (encmd.length == 2) {

          const feature = encmd[1];



          if (['quizz', 'lyricsquizz', 'hug', 'map', 'greetings', 'so', 'tr'].indexOf(feature) < 0) {
            say(target, 'Unknown feature ' + feature);
            return;
          }

          const en = (encmd[0] === 'enable');
          let set = {};
          set[feature] = en;
          console.info(chan, ': Setting ', set);
          BotChannels.update(botchan._id, { $set: set });
          say(target, en ? 'Enabling ' : 'Disabling "' + feature + '" feature');
        }
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

    // ------------------- AUTOBAN -------------------
    if (botchan.manageban === true) {
      if (botchan.autobancmd === true) {
        if (isModerator) {
          // Command !autoban
          if (cmdarray.length >= 1) {

            let target_user = cmdarray[1];

            // TODO: only available if ultimate-ban command is enabled (add an option)
            if (cmd === 'ultimate-ban') {
              // Add/mark the user specified to the greetings 
              GreetMessages.upsert({ username: target_user }, { $set: { autoban: true, lang: false } });
              say(target, 'With great power comes great responsability ' + dispname);
              // Sends a notification to discord channel
              if (discord_autoban_url)
                sendDiscord(target_user + " has been added to *ultimate ban* list by *" + dispname + "* .  It will be automatically banned on channel where the feature is enabled", discord_autoban_url);
              return;
            }

            if (cmd === 'ultimate-unban') {
              // Add/mark the user specified to the greetings 
              GreetMessages.upsert({ username: target_user }, { $unset: { autoban: true } });
              say(target, 'Peace, Love... and  redemption :) ' + dispname);
              // Sends a notification to discord channel
              if (discord_autoban_url)
                sendDiscord(target_user + " has been removed from ultimate ban list by " + dispname + "! Note it has not been unbanned", discord_autoban_url);
              return;
            }
          }
        }
      }

      if (botchan.autoban === true) {
        // bot must be a mod
        const gm = GreetMessages.findOne({ username: username, autoban: true });
        if (gm) {
          let chans = gm.ban.map((item) => item.chan).join(",");
          say(target, '/ban ' + username + ' because they were already banned from ' + chans); // Maybe there is an API for that
          return;
        }
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

    // Temporary command
    if ((cmd === 'tutu') || (cmd == 'tututu')) {
      const tutuans = ['SingsNote tututuru tutututuruu SingsNote',
        'SingsNote tututu tututuru tutututuruu SingsNote',
        'SingsNote tututututututuruu SingsNote'
      ];
      say(target, randElement(tutuans));
      return;
    }

    // ---------------- Chord generator --------------------
    // !note !notes !chord !chords !prog commands
    if (botchan.generator) {

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

            for (let i = firstExtraIndex; i < cmdarray.length; i++) {
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

    }

    const langExpl = ['For example !en will translate your sentence in english. Or !pt to translate into portuguese.',
      'Available translation commands: !cn !de !en !es !fi !fr !it !jp !kr !pl !pt !ro !ru !tu ...'
    ];

    // -------------- Translation -----------------------
    if (botchan.tr === true) {
      // Command for enabling translation for a user during a few minutes
      // Only mods can use it

      if (isModerator && cmd === "translate") {
        if (cmdarray.length > 1) {
          let u = cmdarray[1].toLowerCase();
          /// Remove @
          if (u[0] === '@') u = u.substring(1);
          console.info(u);

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
            console.info('Autotranslate enabled for ', u);
            autotranslate[u] = Date.now() + atdt * 60 * 1000;
          }
          else {
            console.info('Autotranslate disabled for', u);
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
      };
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

      if (cmd in tr_lang_alias || cmd in tr_lang_desc || autotr) {
        // default land code
        let lc = 'en';

        //alias        
        if (cmd in tr_lang_alias)
          lc = tr_lang_alias[cmd];

        if (cmd in tr_lang_desc)
          lc = cmd;

        let ll = tr_lang_desc[lc];

        // Remove some words (emotes for example)
        let txt = commandName.replace(/ LUL/g, '');

        // Remove command if not auto translating
        if (!autotr) {
          txt = txt.substring(1 + cmd.length);
        }

        //console.error(ll);

        // TODO: remove Urls too

        // Min/Max length of text to translate
        let lazy = false;
        if (txt.length > 2) {

          // Too long text?
          if (txt.length > 250) {
            lazy = true;
            txt = "I'm too lazy to translate long sentences ^^";
          }

          // Lazy mode, and english target => no translation, only displays 'lazy' message in english
          if ((lazy === true) && (ll[0].indexOf('en') == 0)) {
            say(target, context['display-name'] + ', ' + txt);
            return;
          }

          // Translate text
          gtrans(txt, { to: lc }).then(res => {
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

              // Limit translated message length
              if (res.text.length > 200) {
                //console.info('Plus de 200 caracteres');
                res.text = res.text.substring(0,200)+'...';
              }

              // TODO: also remove links?


              say(target, context['display-name'] + ' ' + ll.says + ': ' + res.text);
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
      if ((cmd.indexOf('map') === 0) || (cmd.indexOf('carte') === 0)) {
        let url = Settings.findOne({ param: 'URL' });
        //console.error(url);

        if (url) {
          if (botchan.lang === 'FR') {
            say(target, "EarthDay Retrouvez la carte de la communauté ici: " + url.val + "/c/" + chan);
          }
          else
            say(target, "You can access our EarthDay map here: " + url.val + "/c/" + chan);
        }
        return;
      }

      if (cmd.indexOf('forget') == 0) {
        UserLocations.remove({ name: username });
        if (botchan.lang === 'FR') {
          say(target, "c'est fait " + answername + " !");

        }
        else
          say(target, "it's done " + answername + " !");
      }

      if (cmd.indexOf('where') == 0) {
        let pdoc = UserLocations.findOne({ name: username });
        if (pdoc) {
          if (botchan.lang === 'FR') {
            say(target, answername + " Vous m'avez indiqué cette localisation: " + pdoc.location + '. Si vous voulez retirer toutes les informations vous concernant, utilisez !forget');
          }
          else
            say(target, answername + " You've told me you were from " + pdoc.location + '. If you want me to forget your location, use !forget');

          return;
        }
        else {
          if (botchan.lang === 'FR') {
            say(target, "Désolé " + answername + " je ne connais pas votre localisation. Veuillez utiliser la commande !from au préalable!");
          }
          else
            say(target, "Sorry " + answername + " I don't know where you're from. Please use !from command to tell me!");
          return;
        }
      }

      if (cmd.indexOf('show') == 0) {
        let pdoc = UserLocations.findOne({ name: username });
        if (pdoc === undefined) {
          if (botchan.lang === 'FR') {
            say(target, "Désolé " + answername + " je ne connais pas votre localisation. Veuillez utiliser la commande !from au préalable!");
          }
          else
            say(target, "Sorry " + answername + " I don't have you location in my database. Please use '!from city,country' command first.");
          return;
        }
        else {
          UserLocations.update(pdoc._id, { $set: { allow: true } });
          if (botchan.lang === 'FR') {
            say(target, "Ca marche, votre pseudo sera visible sur la carte! " + answername + ' Avec !msg vous pouvez ajouter un message personnalisé');
          }
          else
            say(target, "Ok, your nickname will be displayed on the map! " + answername + ' Use !msg to add a personalized message on the map');
          return;
        }
      }

      if (cmd.indexOf('mask') == 0) {
        let pdoc = UserLocations.findOne({ name: username });
        if (pdoc === undefined) {
          if (botchan.lang === 'FR') {
            say(target, "Désolé " + answername + " je ne connais pas votre localisation. Veuillez utiliser la commande !from au préalable!");
          }
          else
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
        let pdoc = UserLocations.findOne({ name: username });
        if (pdoc === undefined) {
          if (botchan.lang === 'FR') {
            say(target, "Désolé " + answername + " je n'ai pas votre position dans ma base. Veuillez utiliser la commande !from au préalable!");
          }
          else
            say(target, "Sorry " + answername + " I don't have you location in my database. Please use '!from city,country' command first.");
          return;
        }
        else {
          msg = commandName.substring(cmd.length + 1).trim();
          if (msg.length == 0) {
            if (botchan.lang === 'FR') {
              say(target, "Utilisez '!msg +message' pour ajouter un petit mot sur la carte");
            }
            else
              say(target, "use '!msg +message' for adding a personalized message on the map");
          }
          else {
            let msgobj = {};
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
          if (botchan.lang === 'FR') {
            say(target, answername + ", Je ne vous trouve pas sur la carte...Veuillez utiliser !from dans un premier temps");
          }
          else
            say(target, answername + ", i couldn't find you on my map... Use !from command to tell me your location");
          return;
        }

        if (me.latitude === undefined) {
          if (botchan.lang === 'FR') {
            say(target, answername + ",encore un peu de patience, j'ai un plat sur le feu , veuillez réessayer dans quelques minutes...");
          }
          else
            say(target, answername + ",sorry i still need to process some data... please try again in a few minutes...");
          return;
        }

        let ares = userfindClosest(me._id, chan, { nbmax: 5, distmax: 20 });
        if (ares.length === 0) {
          if (botchan.lang === 'FR') {
            say(target, answername + ",Désolé je n'ai trouvé personne de proche...");
          }
          else
            say(target, answername + ",sorry i couldn't find someone close to your place...");
          return;
        }
        else {
          let arestr = ares[0];
          for (let i = 1; i < ares.length; i += 1)
            arestr += ', ' + ares[i];
          if (ares.length > 1) {
            if (botchan.lang === 'FR') {
              say(target, answername + ',vos voisins les plus proches sont ' + arestr);
            }
            else

              say(target, answername + ',your closest neighbours are ' + arestr);
          }
          else {
            if (botchan.lang === 'FR') {
              say(target, answername + ',votre voisin le plus proche est ' + arestr);
            }
            else

              say(target, answername + ',your closest neighbour is ' + arestr);
          }
        }
        return;
      }

      if (cmd === 'from' || cmd === 'wya') {
        let geoloc = commandName.substring(5).trim();
        if (geoloc.length < 2) {
          if (botchan.lang === 'FR') {
            say(target, answername + " Veuillez m'indiquer la ville et le pays ou vous vous trouvez. Par exemple !from Paris,France ou !from New York.");
          }
          else
            say(target, answername + " Please tell me the country/state/city where you're from, for example: !from Paris,France or !from Japan.");
          return;
        }
        else {
          // Check if there is a @ and if the user is a mod
          let words = geoloc.split(' ');
          words.forEach(function (w) {
            if (w.indexOf('@') == 0) {
              // Mods or broadcaster can change the location for someone
              if (isModerator === true) {
                username = w.substring(1).toLowerCase();
                dispname = w.substring(1);
                context['display-name'] = w.substring(1);
                geoloc = geoloc.replace(w, '');
              }
              else {
                if (botchan.lang === 'FR') {
                  say(target, answername + " Veuillez m'indiquer la ville et le pays ou vous vous trouvez. Par exemple !from Paris,France ou !from New York.");
                }
                else
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

        let doc = {
          name: username,
          dname: dispname,
          location: geoloc.toLowerCase(),
          timestamp: now,
          channels: [target],
          allow: false,
        };
        // Interaction stamp
        doc[chan] = now;

        // Check if user has already given its location
        let pdoc = UserLocations.findOne({ name: username });
        if (pdoc === undefined) {
          //New user
          UserLocations.insert(doc);

          if (delta > 60 * 1000) {
            /*              addmess = [
                            'Use !forget if you want me to forget your location!',
                            'Use !show to allow me to display your nickname on the map',
                            'Use !msg to add a personalized message on the map',
                          ]*/

            if (botchan.lang === 'FR') {
              let txt = "Utilisez !show pour m'autoriser à rendre visible votre pseudo sur la carte";
              say(target, answername + " Ok, merci! " + txt, username);
            }
            else {
              let txt = 'Use !show to allow me to display your nickname on the map'; //,randElement(addmess); //.[Math.floor(Math.random() * (addmess.length - 1))];
              say(target, answername + " Ok, thanks! " + txt, username);
            }
            return;
          }
          else {
            if (botchan.lang === 'FR') {
              say(target, answername + " Ok, compris! ", username);
            }
            else
              say(target, answername + " Ok, got it! ", username);
          }
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
          if (botchan.lang === 'FR') {
            say(target, answername + " Ok, j'ai mis à jour ma mémoire!");
          }
          else
            say(target, answername + " Ok, i've updated my database!");
          return;
        }
      }
    }

    if (botchan.lyricsquizz === true) {
      if (manageScoreCommands('lyricsquizz', chan, cmd, username, target, answername) === true)
        return;

      if ((cmd.indexOf('start-quizz') == 0) || (cmd.indexOf('startquizz') == 0)) {
        if (isModerator)
          startLyricsQuizz(chan);
      }

      if ((cmd.indexOf('stop-quizz') == 0) || (cmd.indexOf('stopquizz') == 0)) {
        if (isModerator)
          stopLyricsQuizz(chan);
      }

      // clues...

      const res = processWordLyricsQuizz(chan, commandName.toLowerCase(), username);
      if (res) {
        if (res.titleFound === true) {
          say(target, username + ' has found the title!! Congrats!');

          return;
        }
        else {
          say(target, username + ' has found "' + commandName + '" word, scoring ' + res.points + ' points! #icon');
          return;
        }
      }
    }

    // lyricsquizz and quizz should not be enabled at the same time

    if (botchan.quizz === true) {
      let curQuestion = getCurQuestion(chan);

      if (manageScoreCommands('quizz', chan, cmd, username, target, answername)) return;


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
          for (let i = 0; i < nl; i++) {
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
          let dtxt = '';
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
            QuizzScores.upsert({ chan: chan, type: 'quizz', user: username }, { $inc: { score: 1 } });
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

        if (label.toLowerCase() === 'off') {
          twitch_finds_off(chan);
          say(target, 'Shoutout monitoring is now off');
        }
        else {
          // ON
          // Check if already 'on', then start a new one
          say(target, 'Shoutout monitoring is now enabled, using label ' + label + '. Use "!' + cmd + ' off" to disable it.');
          twitch_finds_on(chan, label);
          // Timeout
          //tfofftimer[chan] = Meteor.setTimeout(twitchfinds_off.bind(), 1000*60*70);
        }

        BotChannels.update(botchan._id, { $set: { storeso_label: label } });
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

          // store so in database          
          if (botchan.storeso === true) {
            // Also store in database
            let label = botchan.storeso_label;
            if (!label) {
              label = 'off';
            }
            ShoutOuts.insert({ chan: target, so: soname, timestamp: Date.now(), username: username, label: label });
          }

          // Send !so notification to a discord channel
          if (botchan.discord_so_url) {
            let label = botchan.storeso_label;
            if (!label) {
              label = 'off';
            }
            if (label.toLowerCase() != 'off') {
              const title = 'https://twitch.tv/' + soname;
              sendDiscord(title, botchan.discord_so_url);
            }
          }

          // If shoutout channel is not in greetings database, send a notification to a discord channel 
          if (botchan.notgreeted) {
            soname = soname.toLowerCase();
            if (!GreetMessages.findOne({ username: soname })) {
              console.info('User', soname, 'not in greetings database');
              if (discord_notgreeted_url) {
                const title = 'This channel has been !so on ' + target + ' https://twitch.tv/' + soname + ' but is not in greetings database';
                sendDiscord(title, discord_notgreeted_url);
              }
            }
          }

          // Sends SO
          if (botchan.so === true) {
            sendSOGreetings(botchan, target, soname);
            return;
          }
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
              say(target, "There's nobody from team '+t +' we could raid right now...");
              return;
            }

            let tm = res.fetch().map((c) => c.channel);
            let rc = randElement(tm);
            say(target, '/raid ' + rc);
            return;
          }
        }

        if (botchan.advertteam === true) {
          let m = Settings.findOne({ param: 'team-' + t });
          console.error(m);
          if (m) {
            say(target, m.val);
            return;
          }
        }

      }
    }

    // Donation (streamelements)
    //
    if (username === "streamelements") {
      try {

        //ex: fishelicious just tipped $15.00 PogChamp 
        const rx = new RegExp("([0-9a-zA-Z_]+) just tipped \\$([0-9]+.[0-9]*) PogChamp")
        const match = rx.exec(msg);
        if (match) {
          console.info('TIP! ', match, 'user=', match[1], 'amount=', match[2]);
          SubEvents.insert({
            chan: '#'+chan,
            date: Date.now(),
            user: match[1],
            type: 'tip',
            tip: parseFloat(match[2])
          });
        }
      }
      catch(e) {
        console.error(e);
      }
    }


    // ------------------- GREET ----------------------
    if (botchan.greet === true) {
      // dnow?
      let d = Date.now();
      // Check if user has not already been greeted recently
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

        // Special case if username==chan
        if (username === chan) {
          greetingsStack.push({
            target: target,
            txt: 'hey boss #atname! #icon',
            me: (botchan.me === true),
            dispname: dispname
          });
          return;


        }
        let gmtext = getGreetMessages(username, chan);

        let r = -1;
        // Check if user in in greet database or in the map
        // Pick up randomly a message
        // If user is in both databases, 
        // - select generic message in 20% of the cases, and a personalized message in 80% of the cases

        let useMapSentence = true;
        if (gmtext.length > 0) {
          if (u != undefined) {
            r = Math.random();
            if (r < 0.8)
              useMapSentence = false;
          }
          else
            useMapSentence = false;
        }

        // Generic Sentence (based on map)
        if (useMapSentence === true) {
          if (u) {
            // default language
            let lang = 'EN';

            if (u.country) {
              let ccode = u.country.toLowerCase();
              if (ccode in country_lang) {
                lang = country_lang[ccode];
              }
            }
            else {
              console.warn('No Country code for ', u.name);
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
                      return ((localH >= a) && (localH <= b));
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

        console.info('socmd=', botchan.socmd, 'useMapSentence=', useMapSentence, 'gmtext=', gmtext);

        if (gmtext.length > 0) {
          // TODO: Filter out disables texts 
          let txt = randElement(gmtext).txt;
          //console.error(gm.texts,txt);

          //txt = replaceKeywords(txt, {dispname:dispname});

          if ((useMapSentence == false) && !_.isEmpty(botchan.socmd)) {
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
            me: (botchan.me === true && useMapSentence === false),
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
    if (cmd.indexOf(botname_short + '-command') === 0) {
      let url = Settings.findOne({ param: 'URL' });
      if (url) {
        say(target, "You'll find available commands for ttcBot here: " + url.val + "/c/" + chan + '/commands');
        return;
      }
    }


    // Send a message on discord for calling the bot admin
    if (cmd === 'calladmin') {
      //console.info(target, context);
      if (isModerator) {
        let title = 'Admin Call by ' + username + ' from ' + chan + ' : * ' + msg + ' *';
        console.error(title);
        // Global URL(s)
        if (bot_discord_admincall_url) {
          sendDiscord(title, bot_discord_admincall_url);
          // Only answer if there is a message (some streamers may already have !summon command)
          if (length(msg) > 0)
            say(target, "Ok, i've sent a message to you-know-who");
          return;
        }
      }
      else {
        if (length(msg) > 0)
          say(target, "Only Mods are allowed to summon you-know-who");
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
      if (cmd == 'ban') {
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
        //"Do you want to be my friend?",
        //"I'm very shy! #icon",
        '^^ ',
        '<3 <3 <3 ',
        ':) ',
        ':D :D :D ',
        ':) :) :) ',
        '#icon #icon #icon',
        //        'I try to do my best :D'
        'beep beep boop ',
        'beep boop! beep beep boop'
      ];

      if (lccn.indexOf('?') >= 0) {

        txts.push("Insufficient data for meaningful answer");

        if (lccn.indexOf('why') >= 0) {
          txts.push("I really don't know");
          txts.push("Why not?");
        }

        if ((lccn.indexOf('explain') >= 0) || (lccn.indexOf('can') >= 0)) {
          txts.push("For Sure!");
          txts.push("Of course!");
        }

        txt = randElement(txts);
        say(target, txt + ' ' + answername);
      }
      else {
        txt = randElement(txts);
        say(target, answername + ' ' + txt, { store: true });
      }
      return;
    }
  }

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

      // TODO: Automatic SO after
      if (bc.raid_auto_so === true) {
        sendSOGreetings(bc, channel, raider);
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
    } catch (e) {
      console.error(e);
    }
  }

  function onUnBanHandler(channel, username, userstate) {
    console.log('>>>>', channel, 'Unban', username);
  }

  function onNotice(channel, msgid, message) {
    try {

      console.log('>>>>', 'NOTICE', channel, msgid, message);

      // Bot has been banned
      if (msgid === 'msg_banned') {
        // Disable account
        let chan = channel.toLowerCase().substring(1);
        BotChannels.update({ channel: chan }, { $set: { suspended: true, suspended_reason: 'Bot has been banned on ' + chan + 'channel :(' } });
      }
    } catch (e) { console.error(e); }
  }

  function onBanHandler(channel, username, reason, userstate) {
    let notif = '';
    try {
      // TODO: only available if manageban is enabled?
      let chan = channel.substring(1).toLowerCase();
      let bc = BotChannels.findOne({ channel: chan });
      if (bc?.manageban === true) {

        // Only if channel is live?
        if (bc.live) {


          notif = '**' + username + '** has been banned from **' + chan + '** channel.';
          // we don't know the name of the mod who banned, even as a moderator, obviously for security reasons
          let bo = { chan: chan, date: Date.now() };  // We keep track of dates, so we can remove users after a while (removes accounts...)
          let update_obj = { lang: false };

          // mark in greetings list
          let gu = GreetMessages.findOne({ username: username });
          let banlist = [bo];
          // If user has already banned somewhere, then 
          if (gu) {
            if (gu.ban) {
              banlist = gu.ban;
              let chans = banlist.map((item) => item.chan);
              if (chans.indexOf(chan) < 0) {
                notif += 'They have already been banned from ' + chans.length + ' channels';
                banlist.push(bo);

                // TODO: add an option for automatic trigger
                if (bc.autoban === true && banlist.length >= 3) {
                  notif += ' : they will be added to ultimate ban list.';
                  update_obj.autoban = true;
                }
              }
            }
          }

          update_obj.ban = banlist;
          if (bc.notifban === true && discord_autoban_url)
            sendDiscord(notif, discord_autoban_url);

          GreetMessages.upsert({ username: username }, { $set: update_obj });
        }

        console.log('[' + (bc.live ? 'LIVE' : '') + 'BAN]', notif, JSON.stringify(userstate), reason);

      }

      // TODO: remove/mark on  other collections (map, active users)
      removeActiveUser(chan, username);

    } catch (e) {
      console.error(e);
    }
  }

});
