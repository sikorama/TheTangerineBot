import { Images, BotChannels, Settings, Stats, BotCommands } from '../../api/collections.js';
import { getParentId, genDataBlob } from '../tools.js';
import { checkUserRole } from '../../api/roles.js';
import { Session } from 'meteor/session';
import { ReactiveVar } from 'meteor/reactive-var';
import './customCommands.html';

/*
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

*/
