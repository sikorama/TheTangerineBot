import { Session } from 'meteor/session';
import './showMore.html';

Template.ShowMore.helpers({
    selected(v) {
        if (Session.equals(this.v + '_limit', parseInt(v)))
            return 'selected';
        return '';
    },
    limits() { return [20, 50, 100, 500, 1000]; }
});

Template.ShowMore.events({
    'change select': function (event) {
        if (this.v != undefined) {
            let v = parseInt(event.currentTarget.value);
            Session.set(this.v + '_limit', v);
            Session.set(this.v + '_page', 1);
        }
    }
});