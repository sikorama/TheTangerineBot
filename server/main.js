/*
 * The Tangerine Bot
 * Main Server file / entry point
 * 
 */

import { Meteor } from 'meteor/meteor';
import { UserLocations, BotChannels, GreetMessages, Settings, QuizzQuestions, QuizzScores, Stats } from '../imports/api/collections.js';
import { init_users } from './user_management.js';
import { init_publications } from './publications.js';
import { init_quizz } from './quizz.js';
import { noteArray, genChord, genProgression } from './chords.js';

import { AccountsTemplates } from 'meteor/useraccounts:core';

import { randElement } from './tools.js';

import { hasRole } from './user_management.js';
import { addChannel } from './channels.js';
import { init_greetings, getGreetMessages, replaceKeywords } from './greetings.js';

import {country_lang,patterns} from './const.js';

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

botpassword = 'oauth:' + botpassword;


let WEBSITE_URL = "https://tangerine.sikorama.fr"
let wurl = process.env.WEBSITE_URL;
if (wurl) WEBSITE_URL=wurl;

// Stack for answering to greetings.
// Greetings are not immediate in order to add a delay between multiple greetings
// Only one stack for all greetings
let greetingsStack = [];

function pushGreetMessage(target, txt, username) {
  greetingsStack.push({ target: target, txt: txt });
  // Store interaction date now, to avoid double messages.
  let d = new Date();
  if (username != undefined) {
    if (username in greetDate) {
      greetDate[username][target] = d;
    }
    else {
      let o = {};
      o[target] = d;
      greetDate[username] = o;
    }
//    console.info("Store greet date", greetDate[username]);
  }

}

// Current Question (contains full object)
var curQuestion = undefined;
var numQuestions = 0;

// FIXME: Add referer, user-agent...
let gcoptions = {
  provider: 'openstreetmap',
};

let geoCoder = gc(gcoptions);

// Derniere date de salutation "user:timestamp" => database?
var greetDate = {};

const regext  = /@twitch/gi;

AccountsTemplates.configure({
  // Pour interdire la creation d'un compte par l'interface
  forbidClientAccountCreation: true,
  // pas d'autorisation de changer de pw pour un user
  enablePasswordChange: false,
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
  let matchobj =  {
    latitude: { $exists: 1 },
    longitude: { $exists: 1 },
    country: { $exists: 1 },
  };
  matchobj[chan] = { $exists: 1 } ;

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
    var cc = res[i];
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
    console.warn("Reinit des questions!");

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

  Meteor.methods({
    // Admins can add channels from client
    addChannel: function (chan) {
      if (hasRole(this.userId, ['admin']))
        addChannel(chan, ["enabled"]);
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
        say(g.target, g.txt, g.username);
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
      let sobj= {};
      sobj[ch]= {$exists:true};
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
          greetDate[uname] = {};
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
      //console.error(item);

      // Check if there is already someone with the same location
      let sameLoc = UserLocations.findOne({ location: item.location, latitude: { $exists: 1 } });
      if (sameLoc) {
        console.info('Found someone with same location: ',item.location, sameLoc);
        // If it's the same, then do nothing :)
        if (sameLoc._id != item._id) {
          UserLocations.update(item._id, {$set: {
            latitude: sameLoc.latitude,
            longitude: sameLoc.longitude,
            country: sameLoc.country,
          }});
        }
        // We can check again very quickly
        setTimeout(Meteor.bindEnvironment(checkLocations), 1000);
      }
      else
      {
        // Use geoCoder API for convrerting
        geoCoder.geocode(item.location).then(Meteor.bindEnvironment(function (res) {
          let fres = { longitude: "NA" }
          if (res.length > 0)
          fres = res[0];

          let upobj= {
            latitude : parseFloat(fres.latitude),
            longitude : parseFloat(fres.longitude),
            country : fres.countryCode
          }
          UserLocations.update(item._id, {$set: upobj});

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

  Settings.remove({});

  if (Settings.findOne() === undefined) {
    Settings.insert({ param: 'location_interval', val: 60 });
    Settings.insert({ param: 'quizz_enabled_topics', val: [] });
  }

  Settings.allow({
    update(userid, doc) {
      if (hasRole(userid, 'admin')) return true;
    }
  });


  setTimeout(Meteor.bindEnvironment(checkLocations), 60 * 1000);

/*
  function checkProximity() {
    let i = 5;
    let dateRef = new Date() - 1000 * 3600 * 24;
    item = UserLocations.findOne({ proximity: { $exists: 0 } });
    if (item === undefined)
      item = UserLocations.findOne({ timestamp: { $lt: dateRef } });
    if (item != undefined) {
      console.error('proximity update', dateRef, item);
      findClosest(item._id, 5);
    }
    else
      i = 600;
    //console.error('next',i);
    setTimeout(Meteor.bindEnvironment(checkProximity), 1000 * i);
  }

  // Every minute, recomputes user's proximity.
  setTimeout(Meteor.bindEnvironment(checkProximity), 1000 * 10);
*/

  Meteor.methods({
    // get/set parameters
    parameter: function (param, val) {

      if (val === undefined)
        return Settings.findOne({ param: param });
      Settings.update({ param: param }, { $set: { val: val } });
    }
  })

  // Channels settings
  Meteor.methods({
    toggleSettings: function (chanid, field) {
      let bc = BotChannels.findOne(chanid);
      if (bc === undefined)
        return;
      let v = bc[field];
      objset = {};
      objset[field] = !v;
      BotChannels.update(chanid, { $set: objset });
    },
    setChanSettings: function (chanid, field, value) {
      let bc = BotChannels.findOne(chanid);
      if (bc === undefined)
        return;
      objset = {};
      objset[field] = value;
      BotChannels.update(chanid, { $set: objset });
    },

    // Aggregation pour compter le nombre de personnes par pays
    // Pourrait etre mis en cache
    // ou calculé par un observe
    aggregateCountries: function (chan) {
      if (!chan) return;
      // Check user is owner or admin
      let sobj = {};
      sobj[chan] = {$exists: true}

      let nums = UserLocations.find(sobj).count();

      let pipeline = [];
      pipeline.push({
        $match: sobj
      });
      pipeline.push({
        $group: {
          _id: "$country",
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
      console.error(res);
      return res;
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


  bot_channels = BotChannels.find({ enabled: true }).fetch().map(i => i.channel);
  console.info('Connecting to channels:', bot_channels);

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

  //
  function say(target, txt, store_user) {
    bclient.say(target, txt);
    console.info(target, '>', txt);
  }

  // Updates user interaction timestamp for users who are on the map
  function updateInteractionStamp(u,chan) {
    if (u != undefined) {
      let uo = {};
      uo[chan] = Date.now();
      UserLocations.update(u._id, { $set: uo });
    }
  }


  // Register our event handlers (defined below)
  bclient.on('message', Meteor.bindEnvironment(onMessageHandler));
  //  bclient.on('message', onMessageHandler);
  bclient.on('connected', onConnectedHandler);

  // Connect to Twitch:
  bclient.connect();



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
    if (context.badges)
      if (context.badges.broadcaster)
        isModerator = true;

    //    console.error(context, isModerator);

    // Check if the message starts with @name
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
    let dnow = new Date();
    console.error(dnow.toLocaleDateString(), dnow.toLocaleTimeString(), '#' + chan, '< [' + username + ']', commandName);

    let cmd = '';
    let cmdarray = [];

    // Filter commands (options)
    if (commandName[0] === '!') {

      cmdarray = commandName.split(' ').filter(function(item) {
        try {
          return (item.length>0)
        }
        catch(e) {
          console.error(e);
          return false;
        }
      }) ;
      cmd = cmdarray[0].substring(1).toLowerCase();
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

      if (cmd === "lang" || cmd === "translate") {
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

      // Traduction?
      if (cmd in tr_lang) {
        let ll = tr_lang[cmd];
        //console.error(ll);
        let txt = commandName.substring(1 + cmd.length);
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



      // ------------------- MAP -------------------------
      if (botchan.map === true) {

      // Songlisbot requests
      if (username=="songlistbot") {
        const regsonglistreq=/(.*)\s\brequested\s(.*)\s\bat/
        let slbparse=msg.search(regsonglistreq);
        if (slbparse) {
          let req_user=slbparse[1].toLowerCase();
          let req_song=slbparse[2];
          let rul = UserLocations.findOne({name: req_user});
          console.info('song request:', req_user, req_song)
          if (rul) {
            let objupdate = {
            } 
            //{lastreq: req_song}
            objupdate[chan+'-lastreq'] = req_song;
            UserLocations.update(rul._id, {$set: objupdate})
          }
        }
        return;
      }


        //  Depending on the channel, guest account differs.
        // FIXME: passwords should be different
        if (cmd.indexOf('map') == 0) {
          say(target, "You can access our EarthDay map here: "+WEBSITE_URL+"/c/"+chan);
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
            say(target, "Ok your nickname will be displayed on the map! " + answername);
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
              UserLocations.update(pdoc._id, { $set: { msg: msg, allow: true } });
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
            say(target, answername + ",sorry i need to process some data... please try again in a few minutes...");
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

        if (cmd==='from') {
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
              addmess = [
                'Use !forget if you want me to forget your location!',
                'Use !show to allow me to display your nickname on the map',
                'Use !msg to add a personalized message on the map',
              ];
              txt = randElement(addmess); //.[Math.floor(Math.random() * (addmess.length - 1))];
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
            UserLocations.update(pdoc._id, { $set: updateObj, $unset: { country: 1, latitude: 1, longitude: 1, proximity: 1 } });
            say(target, answername + " Ok, i've updated my database!");
            return;
          }
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
        if ((context.mod === true) || (context.badges.broadcaster == 1)) {
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

    /*
   3/14/2021 12:48:20 PM #crisortegalive < [crisortegalive] !so  @calvinthomasmusic
  so [ '!so', '', '@calvinthomasmusic' ]
  #crisortegalive > /me you must follow https://twitch.tv/ CurseLit
  so @follow @twitch @icon
  3/14/2021 12:48:55 PM #crisortegalive < [calvinthomasmusic] :D :D :D
    */


    // ---------- catch !so command
    // Extract the 2nd parameter, removes @ symbols (sonitize?)
    if (isModerator===true && botchan.so === true) {
      // Extract parameter
      if (cmd==='so') {
        //let cmdsplit= cmd.split(' ');
        console.error('so',cmdarray)
        if (cmdarray.length>1) {
            let soname = cmdarray[1];
            // Remove @
            if (soname[0]==='@')
              soname=soname.substring(1);

            // Check if this user exists in Greetings Collection
            let gmlist = getGreetMessages(soname,chan);
            let gmline='';
            if (gmlist.length===0) {
              gmlist= ["@follow @twitch @icon"];
              gmline = randElement(gmlist);
            }
            else
            {
              gmline = randElement(gmlist).txt;
            }
            console.error('so',gmline);

            if (gmline.length>0) {
              gmline = replaceKeywords(gmline,soname);
              gmline = gmline.replace(regext, "https://twitch.tv/" + soname);

              if (botchan.me === true) {
                gmline = '/me ' + gmline;
              }
              say(target, gmline);
            }
        }
        return;
      }
    }

    // ------------------- GREET ----------------------
    if (botchan.greet === true) {
      // dnow?
      let d = Date.now();
      // Si ca fait moins de 8 heures, pas de greetings
      let candidate = true;
      if (username in greetDate) {
        let g = greetDate[username];
        if (g)
          if (target in g)
            if (d - g[target] < 1000 * 60 * 60 * 8) {
              candidate = false;
            }
      }

      // Verifie on est dans la base des phrases
      if (candidate === true) {

        let gmtext = getGreetMessages(username,chan)

        let u = UserLocations.findOne({ name: username });

        // Si il y a un user sur la map, on met a jour la date de greet, pour la chaine en question
        updateInteractionStamp(u,chan);

        let r = -1;
        // Si gm et u existent,on prend u de facon aléatoire

        let selGenSentence = true;
        if (gmtext.length>0) {
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
            else
            {
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

          txt = replaceKeywords(txt,dispname);

          if ((selGenSentence == false) && botchan.socmd) {
            // Vérifier qu'il y a un @twitch dans la phrase? permet de filtrer ce qui n'est pas !so
            // Sinon on ne fait rien
            if (txt.indexOf('@twitch') >= 0) {
              txt = txt.replace(regext, "");
              txt = botchan.socmd + ' ' + dispname + ' - ' + txt;
            }
          }
          else
            txt = txt.replace(regext, "https://twitch.tv/" + username);

          if (botchan.me === true && selGenSentence === false) {
            txt = '/me ' + txt;
          }
          //console.error('me=', botchan.me, 'gensentence=', selGenSentence, '=>', txt);
          //          say(target, txt, username);
          pushGreetMessage(target, txt, username);
          return;
        }
        //}
      }
    }

    // Check if the message is not for the bot "@thetangerinebot"
    if ((lccn.indexOf('@' + botname) >= 0) || ((lccn.indexOf('@tangerinebot') >= 0))) {
      let txt;
      let txts = [
        "I'm only a bot, you know! MrDestructoid",
        "I'm a nice bot, you know! MrDestructoid",
        "I'm practicing for my Turing Exam! MrDestructoid",
        '^^ ',
        '<3 <3 <3 ',
        ':) ',
        'KonCha ',
        'HeyGuys ',
        ':D :D :D ',
        ':) :) :) ',
        'ttcBot ttcBot_SG ttcBot'
      ];

      if (lccn.indexOf('?') >= 0) {
        if (lccn.indexOf('why') >= 0)
          txts = ["I really don't know", "Why not?"];
        if ((lccn.indexOf('explain') >= 0) || (lccn.indexOf('can') >= 0))
          txts = ["For Sure!", "Of course!"];

        txt = randElement(txts); //[Math.floor(Math.random() * (txts.length - 1))];
        say(target, txt + ' ' + answername);
      }
      else {
        txt = randElement(txts); //[Math.floor(Math.random() * (txts.length - 1))];
        say(target, answername + ' ' + txt);
      }
      return;
    }



  };

  // Called every time the bot connects to Twitch chat
  function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
  }

});
