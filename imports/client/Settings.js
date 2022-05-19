import { Images, BotChannels, Settings, Stats, BotCommands } from '../api/collections.js';
import { getParentId, genDataBlob } from './tools.js';
import { checkUserRole } from '../api/roles.js';
import { Session } from 'meteor/session';
import { ReactiveVar } from 'meteor/reactive-var';

import './Settings.html';

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


Template.Settings.helpers({
    getTeamParamVal(team) {
        let param = 'team-' + team;
        const p = Settings.findOne({ param: param });
        //console.error(param,p)
        if (p)
            return p.val;
    },
    isCurEditChan(chan) {
        return Session.equals('curEditChan', chan);
    },
    getChannel() {
        let sch = Session.get('sel_channel');
        return BotChannels.findOne({ channel: sch });
    },
    getStatChannels() {
        return BotChannels.find({});
    },
    users() {
        return Meteor.users.find();
    },
    stats(c) {
        return Stats.find({ chan: '#' + c }, { sort: { month: -1 } });
    },
    userHasRole(uid, role) {
        return checkUserRole(role, uid);
    },
    stringify(o) { return JSON.stringify(o); },
    pictures() {
        return Images.find();
    },
    link(o) {
        return Images.link(o);
    },
    getIcon(name) {
        if (name[0] === '/') return name;
        let i = Images.findOne({ name: name });
        return i.link();
    },
    iconnames() {
        return Images.find().fetch().map((item) => item.name);

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



Template.UploadForm.onCreated(function () {
    this.currentUpload = new ReactiveVar(false);
});

Template.UploadForm.helpers({
    currentUpload: function () {
        return Template.instance().currentUpload.get();
    },
});

Template.UploadForm.events({
    'change #fileInput': function (e, template) {
        if (e.currentTarget.files && e.currentTarget.files[0]) {
            // We upload only one file, in case
            // multiple files were selected
            console.error(e.currentTarget.files);

            Images.insert({
                file: e.currentTarget.files[0],
                onStart() {
                    template.currentUpload.set(this);
                },
                onUploaded(error, fileObj) {
                    if (error) {
                        console.error(error);
                    }
                    else {
                        console.error('OK', fileObj.name);
                    }
                    template.currentUpload.set(false);

                },
                chunkSize: 'dynamic'
            });
        }
    }
});




// ------------ Server Parameters

Template.ServerConfig.helpers({
    getParamVal(param) {
        let p = Settings.findOne({ param: param });
        //console.error(p);
        if (p)
            return p.val;
    },
    getVal(val) {
        if (_.isString(val)) return val;
        if (_.isObject(val)) return JSON.stringify(val);
        return val;
    },
    settings() {
        return Settings.find({}, { sort: { param: 1 } });
    },

});

Template.ServerConfig.events({
    /*   "change .settings": function (event) {
         let v = event.currentTarget.value;
         let id = event.currentTarget.name;
         console.info(id,'<-',v);
         Meteor.call('parameter', id, v);
         return false;
     },
   */
    "click .renamebtn": function (event) {
        let id = event.currentTarget.name;
        let before = document.getElementById('before').value.trim();
        let after = document.getElementById('after').value.trim();
        console.error(id, before, after);
        if ((before.length > 0) && (after.length > 0))
            Meteor.call('rename', before, after, id === 'btapply', function (err, res) {

                if (err) console.error(err);
                else
                    alert(res);

            });

    }

});



Template.CommandSetting.helpers({
    indexed(a) {
        if (a)
            return a.map((item, index) => { item.index = index; return item; });
        return [];
    }
});

Template.CommandSetting.events({
    'change .greetline': function (event) {
        const id = event.currentTarget.parentElement.id;
        const name = event.currentTarget.name;
        const f = name.split('_')[0];
        const r = name.split('_')[1];
        let o = {};
        o[f] = event.currentTarget.value;
        //Meteor.call('updateGreetLine', id, r, o);
    },
    'click button': function (event) {
        const id = getParentId(event.currentTarget); //.parentElement.id;
        const name = event.currentTarget.name;
        const cl = event.currentTarget.className;
        if (cl.indexOf('toggleCheck') >= 0) {
            const b = (cl.indexOf('ok') < 0);
            console.error("toggle", id, name, b);
            Meteor.call('updateCommand', id, parseInt(name), { enabled: b });
            return;
        }
        if (name.indexOf('remove') === 0) {
            if (confirm('Are you sure you want to permanently delete this Greetings line?') === true) {
                const r = name.split('_')[1];
                console.error('remove', id, r);
                Meteor.call('removeCommand', id, r);
            }
            return;
        }

    },
});