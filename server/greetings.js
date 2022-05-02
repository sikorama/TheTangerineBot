import { GreetDate, GreetMessages } from '../imports/api/collections.js';
import { regexan, regexf, regexi, regexn, regexnn } from '../imports/api/regex.js';
import { emoticones, followtxts } from './const.js';
import { randElement } from './tools.js';
import { assertMethodAccess } from './user_management.js';


export const pregexn = /@name/gi;
export const pregexan = /@atname/gi;
export const pregexnn = /@nickname/gi;
export const pregexi = /@icon/gi;
export const pregexf = /@follow/gi;
export const pregext = /@twitch/gi;

// chan (optionel) : Pour liiter un message a un channel

/**
 * @param {string} username
 * @param {string} txt
 * @param {string} chan : [+]channelname or -channelname
 */
export function addGreetLine(username, txt, chan, editor) {
  if (username === undefined) return;
  if (username.length === 0) return;
  // On force le passage en minuscule
  username = username.trim().toLowerCase();

  let doc = { username: username };
  let pgl = GreetMessages.findOne({ username: username });
  // Fusionne si existe deja

  li = { txt: txt, enabled: true };

  // Pour limiter aux channels
  if (chan) {
    li.channel = chan.toLowerCase();
  }

  if (pgl != undefined) {
    if (!pgl.texts)
      pgl.texts = [];

    li.index = pgl.texts.length;

    doc.texts = pgl.texts;
    doc.texts.push(li);
  }
  else {
    li.index = 0;
    doc.texts = [li];
  }

  doc.lang = (username.length === 2);
  GreetMessages.upsert({ username: username }, { $set: doc });
}

export function init_greetings() {

  if (GreetMessages.find().count() == 0) {

    addGreetLine('DE', 'Willkommen #name #icon');
    addGreetLine('DE', 'Moin #name #icon');
    addGreetLine('DE', 'Moin Moin #name #icon');

    addGreetLine('EN', 'We were waiting for you #name ! #icon');
    addGreetLine('EN', 'Hello #name');
    addGreetLine('EN', 'Hello dear #name');
    addGreetLine('EN', 'Right on time #name');
    addGreetLine('EN', '#name is among us! #icon');
    addGreetLine('EN', 'Welcome #name ! #icon');
    addGreetLine('EN', "I'm glad you're here #name ! #icon");

    addGreetLine('ES', 'Hola #name');
    addGreetLine('ES', 'Buenos días / Buenas tardes #name #icon');

    addGreetLine('FR', 'Salutations distinguées #name #icon');
    addGreetLine('FR', 'Hello #name #icon');
    addGreetLine('FR', 'Salut #name #icon');
    addGreetLine('FR', 'Salut, ça va? #name');
    addGreetLine('FR', 'Bonjour / Bonsoir #name #icon');
    addGreetLine('FR', 'Bien ou bien #name? #icon');
    addGreetLine('FR', 'Bienvenue #name! #icon');

    addGreetLine('PT', 'Olá #name #icon');
    addGreetLine('PT', 'Oi #name #icon');
    addGreetLine('PT', 'como vai? #name');
    addGreetLine('PT', 'como está? #name');
    addGreetLine('PT', 'todo bem? #name');

    addGreetLine('RU', 'Привет #name #icon');
  }

  Meteor.methods({
    'addGreetLine': function (u, t, chan) {
      // TODO Verifier les droits
      assertMethodAccess('addGreetLine', this.userId, ['admin','greet']);
      addGreetLine(u, t, chan, this.userId);
    },
    'removeGreetLine': function (id, index) {
      // TODO Verifier les droits
      assertMethodAccess('removeGreetLine', this.userId, ['admin','greet']);
        // Virer une ligne et renumeroter
        let d = GreetMessages.findOne(id);
        if (d != undefined) {
          let ov = [];
          if (d.texts.length > 1) {

            for (let i = 0; i < d.texts.length; i++) {
              if (i != index) {
                d.texts[i].index = ov.length;
                ov.push(d.texts[i]);
              }
            }
            GreetMessages.update(id, { $set: { texts: ov } });
          }
          else
            GreetMessages.remove(id);
        }
    },
    'updateGreetLine': function (id, index, v) {
      assertMethodAccess('updateGreetLine', this.userId, ['admin','greet']);
        let d = GreetMessages.findOne(id);
        if (d != undefined) {
          let ov = d.texts[index];
          // merge... can do better
          if (v.txt != undefined) ov.txt = v.txt;
          if (v.enabled != undefined) ov.enabled = v.enabled;
          if (v.channel != undefined) ov.channel = v.channel.toLowerCase();
          if (v.hmin != undefined) ov.hmin = parseInt(v.hmin);
          if (v.hmax != undefined) ov.hmax = parseInt(v.hmax);
          d.texts[index] = ov;
          GreetMessages.update(id, {
            $set: {
              // Fix temporaire
              username: d.username.toLowerCase().trim(),
              texts: d.texts
            }
          });
        }
      }
  });

}


/*

*/
/**
 * 
 * Get greet message, for !so commands, or when a viewers enters the chat
 * User must not be banned anywhere
 * 
 * @param {*} username : low case name
 * @param {*} chan : channel (without heading #)
 * @returns 
 */
export function getGreetMessages(username, chan) {
  try {
    const gm = GreetMessages.findOne({ username: username , ban : {$exists: false}});
    //if (!gm) console.info('username=', username, 'didnt find in database.');

    let gmtext = [];
    //  console.info('getGreetMessage - username=', username, 'chan=', chan);
    //  console.info('getGreetMessage - gm=', gm);

    // Keeps only enabled messaes for this channel
    if (gm != undefined && gm.texts!=undefined) {
      gmtext = gm.texts.filter((item) => {
        // console.info('getGreetMessage - item=', item);

        if (item.enabled != true) return false;
        // if there is a channel field, use it as a constraint
        if (item.channel != undefined && item.channel.length > 0) {
          const index = item.channel.indexOf(chan);
          // Exclusion rule 
          // if item.channel starts with a '-' and contains the name of the current channel
          if (item.channel.startsWith('-')) {
            //console.debug('getGreetings, message=',item,'exclusive,  chan=',chan,item.channel,"=> index=", index);
            if (index >= 0) return false;
          }
          else {
            //console.debug('getGreetings, message=',item,'inclusive mode, chan=',chan,item.channel,"=> index=", index);
            if (index < 0) return false;
          }
        }
        return true;
      });
    }
    //console.info('getGreetMessage - user=',username,',gmtext=', gmtext);
    return gmtext;

  } catch (e) {
    console.error(e);
    return [];
  }

}


export function replaceKeywords(txt, options) {
  options = options || {};

  if (options.removeIcons) {
    txt = txt.replace(regexi, '');
  }
  else {
    txt = txt.replace(regexi, randElement(emoticones));
  }

  if (options.dispname) {
    let answername = '@' + options.dispname;
    txt = txt.replace(regexn, answername);
    txt = txt.replace(regexan, answername);
    txt = txt.replace(regexnn, options.dispname);
  }

  if (txt.indexOf('#follow') >= 0) {
    let followtxt = randElement(followtxts);
    txt = txt.replace(regexf, followtxt);
  }

  return txt;
}


Meteor.methods({
  'resetGreetTimer': function (uname) {
    assertMethodAccess('resetGreetTimer', this.userId, ['admin','greet']);
    if (uname)
      GreetDate.remove({ name: uname });
  }
});