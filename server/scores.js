
// --------------- Score --------------

import { QuizzScores } from "../imports/api/collections";
import { say } from "./client";
import { assertMethodAccess } from "./user_management";

Meteor.methods({
    'clearScores': function (sel) {
      assertMethodAccess('clearScores', this.userId, 'admin');
      sel = sel || {};
      QuizzScores.remove(sel, { multi: true });
    }
  });
  
  /**
   * Function for displaying user's scores
   * @param {*} typequizz 
   * @param {*} chan 
   * @param {*} cmd 
   * @param {*} username 
   * @param {*} target 
   * @param {*} answername 
   * @returns 
   */
  export function manageScoreCommands(typequizz, chan,cmd, username, target, answername) {
    if (cmd.indexOf('scores') === 0) {
      let s = QuizzScores.find({chan: chan, type: typequizz}, { limit: 3, sort: { score: -1 } });
      console.error('scores command',chan,typequizz,s.fetch());
      if (s.count() < 3) {
        say(target, "Not enough player");      
        return;
      }
      let sc = 'Leaderboard: ';
      s = s.fetch();
      let a = ['1st', '2nd', '3rd'];
      for (let i = 0; i < 3; i++) {
        sc += a[i] + ': ' + s[i].user + ' (' + s[i].score + ' points) ';
      }
      say(target, sc);
      return true;
    }
  
    if (cmd.indexOf('score') === 0) {
      const s = QuizzScores.findOne({ user: username });
      console.error('score command',chan,typequizz,username,s);
      let sc = 0;
      if (s !== undefined) sc = s.score;
        say(target, answername + ', you have ' + sc + ' point'+(sc>1?'s':''));
        return true;
    }
  }

