import { Session } from 'meteor/session';
import { ShoutOuts } from '../api/collections';
import './Shoutout.html';
import { genDataBlob } from './tools';

Template.Shoutouts.onRendered(function () {
    this.autorun(() => {
        let sc = Session.get('sel_channel');
        this.subscribe('shoutouts', { chan: '#' + sc });
    });
})

Template.Shoutouts.helpers({
    shoutouts() {
        let sc = Session.get('sel_channel');
        return ShoutOuts.find({ chan: '#' + sc }, { sort: { date: -1 } })
    },
});

Template.Shoutouts.events({
    'click button.exportCSV': function (event) {
        let sc = Session.get('sel_channel');
        console.error(sc);
        let res = ShoutOuts.find({ chan: '#' + sc }, { sort: { date: -1 } }).fetch().map((item) => {
            return ([item.so, new Date(item.timestamp).toLocaleString()].join(';'));
        });
        console.error(res);
        genDataBlob(res.join('\n'), 'csvlink', 'csv');
    }
})
