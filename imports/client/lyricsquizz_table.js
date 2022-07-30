
import { Session } from 'meteor/session';
import { Settings,QuizzScores, Lyrics } from '../api/collections.js';
import './lyricsquizz_table.html';
import { manageSortEvent,getParentId, manageSearchEvents } from './tools.js';

const topics = [
    "FR",
    "EN"
  ];

  Template.registerHelper('lyricstopics', function () {return topics;});

  Template.LyricsTable.onCreated(function () {
    //this.subscribe('lyrics'); // TODO: fields
    Session.set("searchLyrics", {});
    Session.setDefault('lyrics_sort_field', 'timestamp');
    Session.setDefault('lyrics_sort_dir', 1);
    Session.setDefault('lyrics_limit', 50);
    Session.setDefault('lyrics_page', 1);
    //  Meteor.call("getNumQuestions", function (err, res) {
    //    Session.set("numQuestions", res);
    //  });
  });

  Template.LyricsTable.helpers({
    getsongs() {
      let searchData = Session.get("searchLyrics");
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
      let sn = Session.get('lyrics_sort_field', 'timestamp');
      let sd = Session.get('lyrics_sort_dir');

      let sortobj = {};
      sortobj[sn] = sd;
      prop.sortby = sortobj;

      let l = Session.get('lyrics_limit');
      if (l === undefined) l = 50;

      let s = parseInt(Session.get('lyrics_page') - 1);
      s *= l;

      console.error('Search :',curSearch, prop ,' Lim=',l,'Skip=',s);

      let res = LyricsIndex.search(curSearch, {
        limit: l,
        skip: s,
        props: prop,
      });

      let mres = res.mongoCursor;
      Session.set('lyrics_count', res.count());
      return mres;
    },
    split(a) {
      return a.split(';');
    },
  });

  Template.LyricsTable.events({
    'click th.sort': function (event) {
        console.error('change sort');
        manageSortEvent(event, 'lyrics');
    },
    'change .search': function (event) {
          console.error('change .search');
          manageSearchEvents(event, 'searchLyrics');
    },
    'change .songline': function (event) {
      const id = getParentId(event.currentTarget);
      const name = event.currentTarget.name;
      let sd = {};
      sd[name] = event.currentTarget.value;
      //console.error(name,'<-',event.currentTarget.value);
      Meteor.call('updateSong', id, sd);
    },
    'click button.toggleCheck': function (event) {
      const id = getParentId(event.currentTarget);
      //    var name = event.currentTarget.name;
      const cl = event.currentTarget.className;
      const  b = (cl.indexOf('ok') < 0);
      Meteor.call('updateSong', id, { enabled: b });
    },
    'click button.remove': function (event) {
      let id = getParentId(event.currentTarget);
      if (id) 
        if (confirm('Are you sure you want to permanently delete this song?') === true) {
          Meteor.call('removeSong', id);
      }
    },
   'click button.confirm': function (event) {
//      let id = getParentId(event.currentTarget);
//    var name = event.currentTarget.name;
//    if (name === 'confirm_question') {
    let title = document.getElementsByName('addTitle')[0].value;
    let author = document.getElementsByName('addAuthor')[0].value;
    let text = document.getElementsByName('addText')[0].value;
    let topics = document.getElementsByName('addTopics')[0].value;
    console.info('Add a new song',title,author);
      //if (t === undefined || title.length === 0) t = 'general';
      if (title.length > 0 && text.length > 0) {
        Meteor.call('addSong', title, author, text, topics);
        document.getElementsByName('addTitle')[0].value = "";
        document.getElementsByName('addText')[0].value = "";
      }
      return;
    }
  });





  Template.LyricsQuizzScores.onCreated(function () {
    this.subscribe("quizzScores", {type: "lyricsquizz"}); //chan
  });

  Template.LyricsQuizzScores.helpers({
    scores() {
        // channel?
        let chan= Session.get('sel_channel');
        if (!chan) return;
          return QuizzScores.find({type:'lyricsquizz', chan: chan}, { sort: { score: -1 } });
    },
    linktoovl() {
      let chan= Session.get('sel_channel');
      if (chan)
        return '/c/'+chan+'/lyricsquizz';
    }
  });

  Template.LyricsQuizzScores.events({
    'click button': function (event) {
      let chan= Session.get('sel_channel');
      if (!chan) return;

      if (confirm('Are you sure you want to reset Lyrics Quizz Scores for '+chan+' channel ?') === true)
        Meteor.call('clearScores', {type:'lyricsquizz', chan: chan});
    }
  });

Template.LyricsQuizzSettings.onCreated(function() {
    this.subscribe('settings');
  });

  Template.LyricsQuizzSettings.helpers({
    topicsList() {
      let p = Settings.findOne({ param: 'lyricsquizz_enabled_topics'});
      if (!p) return;
      let res = topics.map((item) =>{ return {n: item, e: (p.val.indexOf(item)>=0) }; });
    //  console.error(res);
      return res;
    }
  });

  Template.LyricsQuizzSettings.events({
    "click button": function(event) {
      let n = event.currentTarget.name;
      let p = Settings.findOne({ param: 'lyricsquizz_enabled_topics'});
      if (!p) return;
  
      let i = p.val.indexOf(n);
      if (i<0)
        p.val.push(n);
      else
        p.val.splice(i,1);
      Settings.update(p._id, {$set: {val:p.val}});
    }
  });
