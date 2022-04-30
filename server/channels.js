import { BotChannels } from '../imports/api/collections.js';


export function addChannel(chan, fields, guestAccount) {

    if (!chan)  {
      console.error('addChannel: chan==undefined!');
      return;
    }

    // Enforce lower cases
    chan = chan.toLowerCase();

    BotChannels.remove({ channel: chan });

    doc = {
      channel: chan,
      guestAccount: guestAccount,
      map_icon_std: "/tang2.png",
      map_icon_name: "/tang3.png",
      map_icon_msg: "/favicon-32.png",
    };

    const arr = ['tr', 'quizz', 'map', 'enabled'];
    arr.forEach(f => {
      doc[f] = (fields.indexOf(f) >= 0);
    });

    BotChannels.upsert({ channel: chan }, doc);
  }


  Meteor.methods({
    // Admins can add channels from client
    addChannel: function (chan) {
      if (!chan)
        return [];

      if (hasRole(this.userId, ['admin']))
        addChannel(chan.toLowerCase(), ["enabled"]);
    }
  });

  