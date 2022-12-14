//

import { SubEvents } from "../../imports/api/collections";
import { hasRole } from "../user_management";

Meteor.publish('subevents', function (sel) {
    sel = sel || {};
    return (SubEvents.find(sel));
});

SubEvents.allow({
    insert(userid, doc) {
        if (userid) return true;
    },
    update(userid, doc) {
        if (userid) return true;
    },
    remove(userid, doc) {
        if (hasRole(userid, 'admin'))
            return true;
    }
});


