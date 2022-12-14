//------ Quizz Lyrics  -----------------

import { LyricsQuizz } from "../../imports/api/collections";
import { hasRole } from "../user_management";

Meteor.publish('lyricsquizz', function (sel) {
  sel = sel || {};
  return LyricsQuizz.find(sel);
});

LyricsQuizz.allow({
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
