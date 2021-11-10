import { Session } from 'meteor/session';
import { ShoutOuts } from '../api/collections';
import './Shoutout.html';
import { getParentId, genDataBlob } from './tools';

Template.Shoutouts.onRendered(function () {
    this.autorun(() => {
        let sc = Session.get('sel_channel');
        this.subscribe('shoutouts', { chan: '#' + sc });
    });
});

Template.Shoutouts.helpers({
    shoutouts() {
        let sc = Session.get('sel_channel');
        return ShoutOuts.find({ chan: '#' + sc }, { sort: { timestamp: -1 } });
    },
    label() {
        return Session.get('label');
    },
    solabel() {
        let sc = Session.get('sel_channel');
        let label = Session.get('label');
        if (!label) {
            let l = ShoutOuts.findOne({ chan: '#' + sc, label: { $ne: 'off' } });
            if (l)
                label = l.label;
        }

        if (label) {
            return ShoutOuts.find({ chan: '#' + sc, label: label }, { sort: { timestamp: 1 } });
        }
    },
    numrows(n) { return n + 3; }


});

Template.Shoutouts.events({
    'click .label': function (event) {
        let v = event.currentTarget.innerText;
        console.error(v);
        Session.set('label', v);
    },
    'click button.remove': function (event) {
        let id = getParentId(event.currentTarget);
        if (id) {
            let l = ShoutOuts.findOne(id);
            if ((l.label === 'off') || confirm('Are you sure you want to remove this so? ' + l.so)) {

                // Confirmation if label !=off?
                ShoutOuts.remove(id);
            }
        }
    },
    'click button.exportCSV': function (event) {
        let sc = Session.get('sel_channel');
        console.error(sc);
        let res = ShoutOuts.find({ chan: '#' + sc }, { sort: { date: 1 } }).fetch().map((item) => {
            return ([item.so, new Date(item.timestamp).toLocaleString(), item.label].join(';'));
        });
        //console.error(res);
        genDataBlob(res.join('\n'), 'csvlink', 'csv');
    }
});
