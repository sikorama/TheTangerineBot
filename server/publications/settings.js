import { Settings } from "../../imports/api/collections";
import { hasRole } from "../user_management";

Meteor.publish('settings', function (sel) {
    if (hasRole(this.userId, 'admin')) {
      sel = sel || {};
      return Settings.find(sel);
    }
    this.ready();
  });
