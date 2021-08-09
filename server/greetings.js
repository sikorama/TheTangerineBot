import { GreetMessages } from '../imports/api/collections.js';
import { emoticones, followtxts } from './const.js';
import { randElement } from './tools.js';
import { hasRole } from './user_management.js';
import { regexan, regexf, regexi, regexn, regexnn, regext } from '../imports/api/regex.js';

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

  let doc = { username: username }
  let pgl = GreetMessages.findOne({ username: username });
  // Fusionne si existe deja

  li = { txt: txt, enabled: true };

  // Pour limiter aux channels
  if (chan) {
    li.channel = chan.toLowerCase();
  }

  if (pgl != undefined) {
    li.index = pgl.texts.length;
    doc.texts = pgl.texts;
    doc.texts.push(li);
  }
  else {
    li.index = 0;
    doc.texts = [li];
  }

  doc.lang = (username.length === 2)
  GreetMessages.upsert({ username: username }, doc);
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

  // Fix Greetlines @=># 
  GreetMessages.find().fetch().forEach((item) => {
    let nt = item.texts.map((t) => {
      export const pregexn = /@name/gi;
      export const pregexan = /@atname/gi;
      export const pregexnn = /@nickname/gi;
      export const pregexi = /@icon/gi;
      export const pregexf = /@follow/gi;
      export const pregext = /@twitch/gi;
      t.txt = t.txt.replace(pregexn, '#name');
      t.txt = t.txt.replace(pregexan, '#atname');
      t.txt = t.txt.replace(pregexnn, '#nickname');
      t.txt = t.txt.replace(pregexi, '#icon');
      t.txt = t.txt.replace(pregexf, '#follow');
      t.txt = t.txt.replace(pregext, '#twitch');
      return t;
    })
    GreetMessages.update(item._id, { $set: { texts: nt } })
  })


  Meteor.methods({
    'addGreetLine': function (u, t, chan) {
      // TODO Verifier les droits
      if (hasRole(this.userId, ['admin', 'greet'])) {
        addGreetLine(u, t, chan, this.userId);
      }
      else {
        console.error('Adding line not allowed for user', this.userId);
      }
    },
    'removeGreetLine': function (id, index) {
      // TODO Verifier les droits
      if (hasRole(this.userId, ['admin', 'greet'])) {
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
      }
    },
    'updateGreetLine': function (id, index, v) {
      if (hasRole(this.userId, ['admin', 'greet'])) {
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
    }
  });

}


/*
*/
export function getGreetMessages(username, chan) {

  let gm = GreetMessages.findOne({ username: username });
  let gmtext = [];
  //  console.info('getGreetMessage - username=', username, 'chan=', chan);
  //  console.info('getGreetMessage - gm=', gm);

  // Filtrage de gm pour virer ce qui est désactivé et ce qui est pour une autre chaine
  if (gm != undefined) {
    gmtext = gm.texts.filter((item) => {
      // console.info('getGreetMessage - item=', item);

      if (item.enabled != true) return false;
      // if there is a channel field, use it as a constraint
      if (item.channel != undefined && item.channel.length > 0) {
        // Exlusion rule? is item.channel starts with a '-'
        if (item.channel.startsWith('-')) {
          if (item.channel.indexOf(chan) >= 0) return false;
        }
        else {
          if (item.channel.indexOf(chan) < 0) return false;
        }
      }
      //  console.info('getGreetMessage - OK');
      return true;
    });
  }
  //console.info('getGreetMessage - gmtext=', gmtext);

  return gmtext;
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
    let followtxt = randElement(followtxts)
    txt = txt.replace(regexf, followtxt);
  }

  return txt;
}





export function sendSOGreetings(botchan, target, soname) {
  try {

    // SO hook, for greetings
    // Check if this user exists in Greetings Collection
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