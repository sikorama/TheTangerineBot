/*
 *  Custom BotCommands for channels
 *  Each command has these fields:
 *    - name
 *    - regex string (regex)
 *    - answers [strings]
 *    - enabled: boolean
 *    - mod-only: boolean
 *
 */

import { BotCommands } from "../imports/api/collections";
import { assertMethodAccess } from "./user_management";

// 

// Adds an answer to an already existing command
export function addCommandAnswer(chan, cmdname, regex, txt) {

  let doc = { name: cmdname };
  let pgl = BotCommands.findOne({ name: cmdname, chan: chan });

  // Fusionne si existe deja
  let li = { txt: txt, enabled: true };

  if (pgl != undefined) {
    li.index = pgl.texts.length;
    doc.texts = pgl.texts;
    doc.texts.push(li);
  }
  else {
    li.index = 0;
    doc.texts = [li];
  }

  BotCommands.upsert({ name: cmdname }, doc);
}

export function init_commands() {

  if (BotCommands.find().count() == 0) {

    //addGreetLine('DE', 'Willkommen #name #icon');
  }


  Meteor.methods({
    'addCommandAnswer': function (chan, cmd, answer) {
      // TODO Verifier les droits
      assertMethodAccess('addCommandAnswer', this.userId, ['admin']);
      //addCommandAnswer(u, t, chan, this.userId);
    },
    'removeCommandAnswer': function (id, index) {
      // TODO Verifier les droits
      assertMethodAccess('removeCommandAnswer', this.userId, ['admin']);
      // Virer une ligne et renumeroter
      let d = BotCommands.findOne(id);
      if (d != undefined) {
        let ov = [];
        if (d.texts.length > 1) {

          for (let i = 0; i < d.texts.length; i++) {
            if (i != index) {
              d.texts[i].index = ov.length;
              ov.push(d.texts[i]);
            }
          }
          BotCommands.update(id, { $set: { texts: ov } });
        }
        else
          BotCommands.remove(id);
      }
    },
    'updateCommandAnswer': function (id, index, v) {
      assertMethodAccess('updateCommandAnswer', this.userId, ['admin']);

      let d = BotCommands.findOne(id);
      if (d != undefined) {
        let ov = d.texts[index];
        // merge... can do better
        if (v.txt != undefined) ov.txt = v.txt;
        if (v.enabled != undefined) ov.enabled = v.enabled;
        //if (v.modonly != undefined) ov.enabled = v.enabled;
        d.texts[index] = ov;
        BotCommands.update(id, {
          $set: {
            // Fix temporaire
            //username: d.username.toLowerCase().trim(),
            texts: d.texts
          }
        });
      }
    }
  });

}
