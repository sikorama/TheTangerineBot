import { Lyrics } from "../../imports/api/collections";
import { hasRole } from "../user_management";

Meteor.publish('lyrics', function (sel) {
    sel = sel || {};
    return (Lyrics.find(sel));
});

Lyrics.allow({
    insert(userid, doc) {
        if (userid) return true;
    },
    update(userid, doc) {
        if (userid) return true;
    },
    remove(userid, doc) {
        //      if (userid) return true;
        if (hasRole(userid, 'admin'))
            return true;
    }
});
