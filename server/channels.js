import { UserLocations, BotChannels, GreetMessages, Settings, QuizzQuestions, QuizzScores, Stats } from '../imports/api/collections.js';


export function addChannel(chan, fields, guestAccount) {

    BotChannels.remove({ channel: chan });

    doc = {
      channel: chan,
      guestAccount: guestAccount,
      map_icon_std: "/tang1.png",
      map_icon_name: "/tang3.png",
      map_icon_msg: "/favicon-32.png",
    };

    const arr = ['tr', 'quizz', 'map', 'enabled'];
    arr.forEach(f => {
      doc[f] = (fields.indexOf(f) >= 0);
    })

    BotChannels.upsert({ channel: chan }, doc);
  }
