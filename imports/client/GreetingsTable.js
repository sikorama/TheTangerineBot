import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { BotChannels, GreetMessages } from '../api/collections.js';

import './GreetingsTable.html';

// ------------ Greetings
Template.Greetings.onCreated(function () {
    this.subscribe("greetMessages");
    this.subscribe('GreetChannels');
    // Pour le champ editeur de l'admin
    this.subscribe('allUsers');

    Session.set('greets_limit',50);
    Session.set('greets_page',1);
    Session.set('greets_search','');
    Session.set('greets_count',0);

  });
  
  Template.Greetings.helpers({
    formatLine(txt) {
      // replace # par <span ok> </span>
      const regexs  = ['#name','#atname','#nickname','#icon','#follow','#twitch'];
      regexs.forEach((r) => {
        txt=txt.replace(RegExp(r,'gi'),"<strong class='ok'>"+r+'</strong>');
      });
      //console.error(txt);
      return txt;

    },
    langlines: function() {
      return GreetMessages.find({ lang: true}, { sort: { username: 1 } });
    },
    greetlines: function (ban) {
      const v = (ban === 'true');
      //console.error(v, lang);
      //GreetMessages.find({ lang: v }).forEach((item) => { console.error(item); })
      // Special case: languages:
   
      let  greetSearch = Session.get('greets_search');
      let prop={lang: false, ban: v};
      let pref="greets"
      if (v) pref="bans" ;     
      let l = Session.get(pref+'_limit');
      if (l === undefined) l = 50;
  
      let s = parseInt(Session.get(pref+'_page') - 1);
      s *= l;
  
      //console.error(greetSearch,l,s,prop);

      let res = GreetIndex.search(greetSearch, {
        limit: l,
        skip: s,
        props: prop,
      });
  
      console.error(res.count());
      Session.set(pref+'_count', res.count());
      return res.mongoCursor;


    },
    'greetChan': function () {
  
      return BotChannels.find({
        enabled: true,
        greet: true
      }).fetch().map((item) => { return item.channel; });
    },
    username(id) {
      let u = Meteor.users.findOne(id);
      if (u) return u.username;
      return false;
    },

  });
  
  Template.Greetings.events({
    'keyup [name="addUserName"]' : _.debounce(function(event) {
        const v = event.currentTarget.value;
        Session.set('greets_search',v);
    },300),
    'change .greetline': function (event) {
      const id = event.currentTarget.parentElement.id;
      const name = event.currentTarget.name;
      const f = name.split('_')[0];
      const r = name.split('_')[1];
      let o = {};
      o[f] = event.currentTarget.value;
      Meteor.call('updateGreetLine', id, r, o);
    },
    'click button.resettimer': function (event) {
      let name = event.currentTarget.name;
  
      //console.error('click reset timer',name);
      if (confirm('Are you sure you want to reset timer for user ' + name + '. Bot will greet again!') === true) {
        Meteor.call('resetGreetTimer', name);
      }
    },
    'click button': function (event) {
      const id = event.currentTarget.parentElement.id;
      const name = event.currentTarget.name;  
      const cl = event.currentTarget.className;
      if (cl.indexOf('toggleCheck') >= 0) {

        const b = (cl.indexOf('ok') < 0);
        // console.error("toggle", id, name,b);
        Meteor.call('updateGreetLine', id, parseInt(name), { enabled: b });
        return;
      }
  
      if (name.indexOf('remove') === 0) {
        if (confirm('Are you sure you want to permanently delete this Greetings line?') === true) {
          const r = name.split('_')[1];
          //console.error('remove', id, r);
          Meteor.call('removeGreetLine', id, r);
        }
        return;
      }
  
      if (name === 'confirm_user_greet') {
        const u = document.getElementsByName('addUserName')[0].value;
        const t = document.getElementsByName('addUserText')[0].value;
        const c = document.getElementsByName('addUserChan')[0].value;
        if (u.length > 0 && t.length > 0) {
          Meteor.call('addGreetLine', u, t, c);
          document.getElementsByName('addUserText')[0].value = "";
        }
        return;
      }
    },
    // Si on clique sur le nom d'un user, ca remplt l'input 'username'
    'click .username': function (event) {
      const id = event.currentTarget.parentElement.id;
      if (id != undefined) {
        const gl = GreetMessages.findOne(id);
        if (gl != undefined) {
          document.getElementsByName('addUserName')[0].value = gl.username;
          Session.set('greets_search',gl.username);
        }
      }
    }
  });
  
  