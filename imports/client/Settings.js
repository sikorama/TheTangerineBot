import { Images, BotChannels, Settings, Stats } from '../api/collections.js';
import { getParentId } from './tools.js';
import { checkUserRole } from '../api/roles.js';
import { Session } from 'meteor/session';
import { ReactiveVar } from 'meteor/reactive-var';

import './Settings.html';

// ----------- Channel Management
Template.Settings.onCreated(function () {
    this.subscribe("allUsers");
    this.subscribe("statistics");
    this.subscribe('botChannels');
    this.subscribe('settings');
    this.subscribe('images');
    Session.set('curEditChan', '');
});

Template.Settings.helpers({
    getParamVal(param) {
        let p = Settings.findOne({ param: param });
        console.error(p);
        if (p)
            return p.val;
    },
    WEBSITE_URL() {
        let p = Settings.findOne({ param: 'URL' });
        console.error(p);
        if (p)
            return p.val;
    },
    isCurEditChan(chan) {
        return Session.equals('curEditChan', chan);
    },
    getChannels() {
        let sch = Session.get('sel_channel');
        return BotChannels.find({channel:sch});
    },
    getStatChannels() {
        return BotChannels.find({});
    },
    users() {
        return Meteor.users.find();
    },
    stats(c) {
        return Stats.find({ chan: '#' + c }, { sort: { month: 1 } });
    },
    userHasRole(uid, role) {
        return checkUserRole(role, uid);
    },
    stringify(o) { return JSON.stringify(o) },
    pictures() {
        return Images.find();
    },
    link(o) {
        return Images.link(o);
    },
    getIcon(name) {
        if (name[0]==='/') return name;
        let i = Images.findOne({name:name});
        return i.link();
    },
    iconnames() {
        return Images.find().fetch().map((item)=>item.name);

    }
});

Template.Settings.events({
    'click button.addChannel': function (event) {
        n = document.getElementById('newChannel').value.trim();
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
    'click .toggleCheck': function (event) {
        let id = getParentId(event.currentTarget);
        let f = event.currentTarget.name;
        console.error("toggleChanSettings", id, f);
        Meteor.call("toggleChanSettings", id, f);
    },
    'change .chanSettings': function (event) {
        let id = getParentId(event.currentTarget);
        let f = event.target.name;
        let v = event.target.value.trim();
        if (v.length == 0) v = false;
        console.error(id, f, v);
        Meteor.call("setChanSettings", id, f, v);
    },
    "change .settings": function (event) {
        let v = event.currentTarget.value;
        let id = event.currentTarget.name;
        console.info(id,'<-',v);
        Meteor.call('parameter', event.currentTarget.id, v);
        return false;
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
    'click span[name="remove-picture"]': function(event) {
        let id = getParentId(event.target);
        console.error('remove image',id);
        let res = confirm('Are you sure?');
        if (res===true) 
            Images.collection.remove(id);
        
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
                onUploaded(error,fileObj) {
                    if (error ) {
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