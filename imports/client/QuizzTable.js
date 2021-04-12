
import { Session } from 'meteor/session';
import { Settings,QuizzScores } from '../api/collections.js';
import './QuizzTable.html';
import { manageSortEvent,getParentId, manageSearchEvents } from './tools.js';

const topics = [
    "Art",
    "Books",
    "Food & Drink",
    "Games",
    "Geography",
    "History",
    "Lyrics",
    "Movies",
    "Music",
    "Mythology",
    "Random",
    "Science & Technology",
    "Sports"
  ];

  Template.registerHelper('topics', function () {return topics;});


  Template.QuizzTable.onCreated(function () {
    this.subscribe('quizzQuestions');
    Session.set("searchQuizz", {});
    Session.setDefault('quizz_sort_field', 'timestamp');
    Session.setDefault('quizz_sort_dir', 1);
    Session.setDefault('questions_limit', 50);
    Session.setDefault('questions_page', 1);
    //  Meteor.call("getNumQuestions", function (err, res) {
    //    Session.set("numQuestions", res);
    //  });
  });

  Template.QuizzTable.helpers({
    quizzquestions() {
      let searchData = Session.get("searchQuizz");
      let curSearch = searchData.text;
      if (curSearch === undefined)
        curSearch = '';

      let prop = {};

      if (searchData.enabled === true) {
        prop.enabled = true;
      }
      if (searchData.topics != undefined) {
        if (searchData.topics.length > 0)
          prop.topics = searchData.topics;
      }

      // sort:
      let sn = Session.get('quizz_sort_field', 'timestamp');
      let sd = Session.get('quizz_sort_dir');

      let sortobj = {};
      sortobj[sn] = sd;
      prop.sortby = sortobj;

      let l = Session.get('questions_limit');
      if (l === undefined) l = 50;

      let s = parseInt(Session.get('questions_page') - 1);
      s *= l;

      //    console.error('Search : Lim=',l,'Skip=',s);

      let res = QuizzIndex.search(curSearch, {
        limit: l,
        skip: s,
        props: prop,
      })

      let mres = res.mongoCursor;
      Session.set('questions_count', res.count());
      //     console.error(mres.count(),res.count());
      return mres;
    },
    split(a) {
      return a.split(';');
    },
    numQuestions() {
      return Session.get('questions_count');
    }
  });

  Template.QuizzTable.events({
    'click th.sort': function (event) {
      manageSortEvent(event, 'quizz');
    },

    'change .search': function (event) {
      manageSearchEvents(event, 'searchQuizz');
    },
    'change .questionline': function (event) {
      var id = event.currentTarget.parentElement.parentElement.id;
      var name = event.currentTarget.name;
      var sd = {};
      sd[name] = event.currentTarget.value
      Meteor.call('updateQuestion', id, sd);
    },
    'click button.toggleCheck': function (event) {
      var id = getParentId(event.currentTarget);
      //    var name = event.currentTarget.name;
      var cl = event.currentTarget.className;
      var b = (cl.indexOf('ok') < 0)
      Meteor.call('updateQuestion', id, { enabled: b });
    },
    'click button.remove': function (event) {
      let id = getParentId(event.currentTarget);
      if (confirm('Are you sure you want to permanently delete this question?') === true) {
        Meteor.call('removeQuestion', id);
      }
    },
    'click button.confirm': function (event) {
      let id = getParentId(event.currentTarget);
      //    var name = event.currentTarget.name;
      //    if (name === 'confirm_question') {
      let q = document.getElementsByName('addQuestion')[0].value;
      let a = document.getElementsByName('addAnswers')[0].value;
      let t = document.getElementsByName('addTopics')[0].value;
      let c = document.getElementsByName('addComment')[0].value;
      if (t === undefined || t.length === 0) t = 'general';
      if (q.length > 0 && a.length > 0) {
        Meteor.call('addQuestion', q, a, t, c);
        document.getElementsByName('addQuestion')[0].value = "";
        document.getElementsByName('addAnswers')[0].value = "";
      }
      return;
    }
  });


  Template.QuizzScores.onCreated(function () {
    this.subscribe("quizzScores");
  });

  Template.QuizzScores.helpers({
    scores() {
      return QuizzScores.find({}, { sort: { score: -1 } });
    }
  });

  Template.QuizzScores.events({
    'click button': function (event) {
      if (confirm('Are you sure?') === true)
        Meteor.call('clearScores');
    }
  });



Template.QuizzSettings.onCreated(function() {
    this.subscribe('settings');
  });

  Template.QuizzSettings.helpers({
    topicsList() {
      let p = Settings.findOne({ param: 'quizz_enabled_topics'});
      if (p===undefined) return;
      let res = topics.map((item) =>{ return {n: item, e: (p.val.indexOf(item)>=0) } })
    //  console.error(res);
      return res;
    }
  })

  Template.QuizzSettings.events({
    "click button": function(event) {
      let n = event.currentTarget.name;
      let p = Settings.findOne({ param: 'quizz_enabled_topics'});
      let i = p.val.indexOf(n);
      if (i<0)
        p.val.push(n);
      else
        p.val.splice(i,1);
      Settings.update(p._id, {$set: {val:p.val}});
    }
  })
