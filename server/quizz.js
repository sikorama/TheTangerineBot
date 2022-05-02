import { QuizzQuestions, QuizzScores } from '../imports/api/collections.js';
import { assertMethodAccess } from './user_management.js';


function filterAnswer(a) {
  a = a.replace(/[\r\n]/g, ";");
  let aa = a.split(';');
  let res = '';
  for (let i = 0; i < aa.length; i++) {
    let t = aa[i].trim();
    if (t.length > 0) {
      if (res.length === 0)
        res = t;
      else
        res += ';' + t;
    }
  }
  return res;
}


function addQuestion(q, a, t, c) {
  if (q === undefined || a === undefined) return;
  // Virer les espaces et retour chariots...
  a = filterAnswer(a);
  if (t === undefined) t = 'general';
  if (c === undefined) c = '';
  doc = { question: q, answers: a, topics: t, comment: c, enabled: true, timestamp: new Date() };
  QuizzQuestions.insert(doc);
}

export function init_quizz() {

  Meteor.methods({
    'addQuestion': function (q, a, t, c) {
      assertMethodAccess('addQuestion', this.userId, 'admin');
      addQuestion(q, a, t, c);
    },
    'removeQuestion': function (id) {
      assertMethodAccess('removeQuestion', this.userId, 'admin');
      if (id === undefined) return;
      // TODO: Uniquement admin?
      QuizzQuestions.remove(id);
    },
    'updateQuestion': function (id, s) {
      assertMethodAccess('updateQuestion', this.userId, 'admin');
      if (s.answers != undefined)
        s.answers = filterAnswer(s.answers);
      QuizzQuestions.update(id, { $set: s });
    }
  });

  // Populate with some questions
  if (QuizzQuestions.find().count() == 0) {
    addQuestion('What language is spoken in Brazil?', "Portuguese");
    addQuestion('What temperature centigrade does water boil at?', "100 degrees centigrade;100°;100");
  }


}


// --------------- methods --------------

Meteor.methods({
  'clearScores': function () {
    assertMethodAccess('clearScores', this.userId,'admin');

    QuizzScores.remove({}, { multi: true });
  }
});