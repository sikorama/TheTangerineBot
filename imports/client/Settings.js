import { Images, BotChannels, Settings, Stats, BotCommands } from '../api/collections.js';
import { getParentId, genDataBlob } from './tools.js';
import { checkUserRole } from '../api/roles.js';
import { Session } from 'meteor/session';
import { ReactiveVar } from 'meteor/reactive-var';

import './Settings.html';
import './Settings/general';
import './Settings/accounts';
import './Settings/server';
import './Settings/translation';
import './Settings/common';
import './Settings/emotes';
import './Settings/discord';
import './Settings/customCommands';

// ----------- Channel Management
Template.Settings.onCreated(function () {
    this.subscribe("allUsers");
    this.subscribe("statistics");
    this.subscribe('botChannels');
    this.subscribe('botCommands');
    this.subscribe('settings');
    this.subscribe('images');
    this.subscribe('userRoles');
    Session.set('curEditChan', '');
    Session.setDefault('settingsPage', 1);
});



Template.registerHelper('userHasRole', function (uid, role) {
    return checkUserRole(role, uid);
});

Template.Settings.helpers({

    isCurEditChan(chan) {
        return Session.equals('curEditChan', chan);
    },
    getChannel() {
        let sch = Session.get('sel_channel');
        return BotChannels.findOne({ channel: sch });
    },
    //stringify(o) { return JSON.stringify(o); },

    link(o) {
        return Images.link(o);
    },



    submenu(v) {
        return (Session.equals('settingsPage', v));
    },
    commandList() {
        //
        return BotCommands.find();
    },
  
});

Template.Settings.events({
    "change .settings": function (event) {
        let v = event.currentTarget.value;
        let id = event.currentTarget.name;
        console.info(id, '<-', v);
        Meteor.call('parameter', id, v);
        return false;
    },
    'click button.selStat': function (ev) {
        Session.set('settingsPage', parseInt(ev.currentTarget.name));
    },
    'click button.addChannel': function (event) {
        let n = document.getElementById('newChannel').value.trim();
        if (n.length > 0) {
            console.error('Add New Channel', n);
            Meteor.call('addChannel', n);
        }
    },
    'click button.delete': function (event) {
        let id = getParentId(event.currentTarget);
        console.error('delete', id);
        Meteor.call('removeChannel', id);
    },
    'click button.exportDot': function (event) {
        Meteor.call('export_raid_graph', function (err, res) {
            if (err)
                console.error(err);
            // To blob
            genDataBlob(res, 'dotlink', 'dot');
        });
    },
    'click button.exportCSV': function (event) {
        let channel = Session.get('sel_channel');
        Meteor.call('export_userloc', channel, function (err, res) {
            if (err)
                console.error(err);
            // To blob
            genDataBlob(res, 'csvlink', 'csv');
        });
    },
    'click button.export_live_events': function (event) {
        let to = Date.now();
        let from = to - 1000 * 3600 * 24 * 15;
        let team = null;

        let fe = document.getElementById('liveFrom');
        let te = document.getElementById('liveTo');
        let teame = document.getElementById('liveTeam');
        if (fe.value) from = parseInt(fe.value);
        else fe.value = from;
        if (te.value) to = parseInt(te.value);
        else te.value = to;
        if (teame.value) team = teame.value;


        Meteor.call('export_live_events', from, to, team, function (err, res) {
            if (err)
                console.error(err);
            // To blob
            genDataBlob(res, 'livelink', 'csv');
        });
    },
    'click .toggleCheck': function (event) {
        let id = getParentId(event.currentTarget);
        let f = event.currentTarget.name;
        console.error("toggleChanSettings", id, f);
        Meteor.call("toggleChanSettings", id, f);
    },
    'change .chanSettings': function (event) {
        let id = getParentId(event.currentTarget);
        let f = event.target.name;
        let v = event.currentTarget.value.trim();
        if (v.length == 0) v = false;
        console.error(id, f, v);
        Meteor.call("setChanSettings", id, f, v);
    },
    "change .profile": function (event) {
        let id = getParentId(event.target);
        let v = event.currentTarget.value;
        let n = event.currentTarget.name;
        let u = Meteor.users.findOne(id);
        console.error(id, v, n, u);
        let p = u.profile;

        // groups is an array
        if (n === 'groups') {
            v = v.split(',').map((item) => item.trim());
            console.error(n, v);
        }
        p[n] = v;
        Meteor.users.update(id, { $set: { profile: p } });
    },
    'click button[name="addAccount"]': function (event) {
        let doc = {};
        doc.name = document.getElementById('accountName').value.trim();
        doc.chan = document.getElementById('accountChan').value.trim();
        doc.pw = document.getElementById('accountPass').value.trim();
        Meteor.call("insertUser", doc);
    },
    'click .channelEdit': function (event) {
        let id = getParentId(event.target);
        if (Session.set('curEditChan', id)) {
            Session.set('curEditChan', '');
        }
        else
            Session.set('curEditChan', id);

    },
    'click span[name="remove-picture"]': function (event) {
        let id = getParentId(event.target);
        console.error('remove image', id);
        let res = confirm('Are you sure?');
        if (res === true)
            Images.collection.remove(id);

    },
    'click .setrole': function (event) {
        let id = getParentId(event.currentTarget);
        let f = event.currentTarget.name;
        console.error("toggleUserRole", id, f);
        Meteor.call("toggleUserRole", id, f);
    },
    'click button[name="confirm_add_cmd"]': function (event) {
        const n = document.getElementsByName('addCmdName')[0].value;
        const r = document.getElementsByName('addCmdRegex')[0].value;
        const a = document.getElementsByName('addCmdAnswer')[0].value;
        let channel = Session.get('sel_channel');
        console.error(n, r, a);
        if (n.length > 0 && r.length > 0 && a.length > 0) {
            BotCommands.insert({ channel: channel, name: n, regex: r, answers: [a] });
            //Meteor.call('addGreetLine', channel, n, r, a);
            document.getElementsByName('addCmdName')[0].value = "";
            document.getElementsByName('addCmdRegex')[0].value = "";
            document.getElementsByName('addCmdAnswer')[0].value = "";
        }
        return;
    }
});


