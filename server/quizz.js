import { QuizzQuestions, QuizzScores, Settings } from '../imports/api/collections.js';
import { assertMethodAccess } from './user_management.js';

// Current Question (contains full object)
// should work per channel? 
let curQuestion;
let numQuestions = 0;

export function getCurQuestion(chan) {
  return curQuestion; // [chan]
}


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
  let doc = { question: q, answers: a, topics: t, comment: c, enabled: true, timestamp: new Date() };
  QuizzQuestions.insert(doc);
}

  // Counts questions
  QuizzQuestions.find().observe({
    added: function (doc) { numQuestions += 1; },
    removed: function (doc) { numQuestions -= 1; }
  });


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
  },
  'getNumQuestions': function () {
    assertMethodAccess('getNumQuestions', this.userId);
    return numQuestions;
  },
});


export function init_quizz() {
  // Populate with some questions
  if (QuizzQuestions.find().count() == 0) {
    addQuestion('What language is spoken in Brazil?', "Portuguese");
    addQuestion('What temperature centigrade does water boil at?', "100 degrees centigrade;100°;100");
  }
}


export function selectQuestion() {
  let pipeline = [];
  let q;
  //    if (mhid != undefined)
  let p = Settings.findOne({ param: 'quizz_enabled_topics' });
  //  console.error(p);
  let sel = {
    enabled: true
  };

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
      let q = res[0];
      QuizzQuestions.update(q._id, { $set: { enabled: false } });
    }
  }
  curQuestion = q;
  curQuestion.expAnswers = q.answers.split(';');
  curQuestion.date = Date.now();
  curQuestion.clue = 0;

}
