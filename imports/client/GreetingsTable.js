import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { BotChannels, GreetMessages } from '../api/collections.js';
import { checkUserRole } from '../api/roles.js';

import './GreetingsTable.html';

// ------------ Greetings
Template.Greetings.onCreated(function () {
    this.subscribe("greetMessages");
    this.subscribe('GreetChannels');
    // Pour le champ editeur de l'admin
    this.subscribe('allUsers');
  });
  
  Template.Greetings.helpers({
    'greetlines': function (lang) {
      var v = (lang === 'true');
      //console.error(v, lang);
      //GreetMessages.find({ lang: v }).forEach((item) => { console.error(item); })
      return GreetMessages.find({ lang: v }, { sort: { username: 1 } });
    },
    'greetChan': function () {
  
      return BotChannels.find({
        enabled: true,
        greet: true
      }).fetch().map((item) => { return item.channel });
    },
    username(id) {
      let u = Meteor.users.findOne(id);
      if (u) return u.username;
      return false;
    }
  });
  
  Template.Greetings.events({
    'change .greetline': function (event) {
      let id = event.currentTarget.parentElement.id;
      let name = event.currentTarget.name;
      //console.error('change greetline ', id,name);
  
      //    if (name.indexOf('greet') === 0) {
      let f = name.split('_')[0];
      let r = name.split('_')[1];
      let o = {};
      o[f] = event.currentTarget.value;
      Meteor.call('updateGreetLine', id, r, o);
      //    }
    },
    'click button.resettimer': function (event) {
      var name = event.currentTarget.name;
  
      //console.error('click reset timer',name);
      if (confirm('Are you sure you want to reset timer for user ' + name + '. Bot will greet again!') === true) {
        Meteor.call('resetGreetTimer', name);
      }
    },
    'click button': function (event) {
      //   console.error(event.target.id);
      //    console.error(event.currentTarget.id);
      var id = event.currentTarget.parentElement.id;
      var name = event.currentTarget.name;
      //console.error('click button', id,name);
  
      var cl = event.currentTarget.className;
      if (cl.indexOf('toggleCheck') >= 0) {
  
        var b = (cl.indexOf('ok') < 0)
        // console.error("toggle", id, name,b);
        Meteor.call('updateGreetLine', id, parseInt(name), { enabled: b });
        return;
      }
  
      if (name.indexOf('remove') === 0) {
        if (confirm('Are you sure you want to permanently delete this Greetings line?') === true) {
          var r = name.split('_')[1];
          //console.error('remove', id, r);
          Meteor.call('removeGreetLine', id, r);
        }
        return;
      }
  
      if (name === 'confirm_user_greet') {
        let u = document.getElementsByName('addUserName')[0].value;
        let t = document.getElementsByName('addUserText')[0].value;
        let c = document.getElementsByName('addUserChan')[0].value;
        if (u.length > 0 && t.length > 0) {
          Meteor.call('addGreetLine', u, t, c);
          document.getElementsByName('addUserText')[0].value = "";
        }
        return;
      }
    },
    // Si on clique sur le nom d'un user, ca remplt l'input 'username'
    'click .username': function (event) {
      var id = event.currentTarget.parentElement.id;
      if (id != undefined) {
        var gl = GreetMessages.findOne(id);
        if (gl != undefined) {
          document.getElementsByName('addUserName')[0].value = gl.username;
        }
      }
    }
  })
  
  