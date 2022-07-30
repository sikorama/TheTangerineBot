import { Images, BotChannels, Settings, Stats, BotCommands } from '../../api/collections.js';
import { getParentId, genDataBlob } from '../tools.js';
import { checkUserRole } from '../../api/roles.js';
import { Session } from 'meteor/session';
import { ReactiveVar } from 'meteor/reactive-var';
import './server.html';


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
       "change .settings": function (event) {
         let v = event.currentTarget.value;
         let id = event.currentTarget.name;
         console.info(id,'<-',v);
         Meteor.call('parameter', id, v);
         return false;
     },
   
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