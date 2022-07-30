/**
 * 
 * IRL events
 *  - channel
 *  - label
 *  - date 
 *  - location (picked on the  map)
 *  - users (computed using the map)
 *  - description
 *  - short description (message used for advertising)
 *  - enabled: to turn on/off notificatons
 * 
 *  Create a new event
 *  edit data
 *  pick a location on the map (_id of the event)
 *  userlocation is updated for each user in the area, (irlevents field, containing irlevent _ids?)
 *  
 *  a marker can be visible on the map to show events.
 *  => optionaly on every map? v
 *  
 *  Also we have to manage when a user adds/updates a location, it should be added to the event
 *  => check periodically ? or based on events? 
 * 
 * how to notify and when:
 *  - mail? 
 *  - twitch dm? => would allow to confirm/decline/stop reminders by answering
 *  - announcement?
 */

import { IRLEvents, UserLocations } from "../imports/api/collections";

Meteor.publish('irlevents', function (sel) {

    if (!sel) sel = {};
    return IRLEvents.find(sel);
  });

  IRLEvents.allow({
    insert(userid, doc) {
      if (userid) return true;
    },
    update(userid, doc) {
      if (userid) return true;
    },
    remove(userid, doc) {
     if (userid) return true;
    }
  });

