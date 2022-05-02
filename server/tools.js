import { assertMethodAccess } from "./user_management";

/**
 *   Randomly Returns an item from an array
 * @param {array} a
 */
export function randElement(a) {
  try {
    let n = a.length;
    //    return a[Math.floor(Math.random() * (n))];
    return a[~~(Math.random() * (n))];
  }
  catch (e) { console.error(a, e.stack); }
  return '...';
}


Meteor.methods({
  // Search a twitch name inevery colections, and replace by the new name;
  rename: function (before, after, apply) {
    assertMethodAccess('rename', this.userId,'admin');

  
      let desc = [];
      desc.push("Replacing " + before + " by " + after + ' ' + (apply ? '' : '(dry run)'));
      let lowcb = before.toLowerCase();
      let lowca = after.toLowerCase();

      let c, n;
      // Bot Channem
      c = BotChannels.findOne({ channel: lowcb });
      if (c) {
        desc.push('BotChannel: Found 1 occurence');
        console.info(c);
        if (apply) {
          BotChannels.update({ channel: lowcb }, { $set: { channel: lowca } });
        }
      }

      // Locations
      c = UserLocations.findOne({ name: lowcb });
      if (c) {
        desc.push('UserLocations: Found 1 occurence');
        console.info(c);
        if (apply) {
          let sobj = { name: lowca, dname: after };
          if (c.mapname)
            sobj.mapname = after;
          UserLocations.update({ name: lowcb }, { $set: sobj });

        }
      }

      // Map users
      let lfo = {}, upo = {};
      lfo[lowcb] = { $exists: 1 };
      upo[lowcb] = lowca;
      upo[lowcb + '-msg'] = lowca + '-msg';
      upo[lowcb + '-lastreq'] = lowca + '-lastreq';
      c = UserLocations.find(lfo);
      if (c.count() > 0) {
        desc.push('UserLocations field: Found ' + c.count() + ' map users');
        if (apply) {
          UserLocations.update(lfo, { $rename: upo }, { multi: true });
        }
      }

      // Raids
      c = Raiders.find({ raider: before });
      if (c.count() > 0) {
        desc.push('Raiders: Found ' + c.count() + ' occurence');
        console.info(c);
        if (apply) {
          c.forEach((r) => {
            Raiders.upsert({ raider: after, channel: r.channel }, { $inc: { count: r.count, viewers: r.viewers } });
          });
          Raiders.remove({ raider: before });
        }
      }
      c = Raiders.find({ channel: lowcb });
      if (c.count() > 0) {
        desc.push('Raids: Found ' + c.count() + ' occurence');
        console.info(c);

        if (apply) {
          c.forEach((r) => {
            Raiders.upsert({ raider: r.raider, channel: lowca }, { $inc: { count: r.count, viewers: r.viewers } });
          });
          Raiders.remove({ channel: lowcb });
        }
      }

      c = GreetMessages.findOne({ username: lowcb });
      if (c) {
        desc.push('GreetMessage: Found 1 occurence');
        console.info(c);
        if (apply) {
          GreetMessages.update({ username: lowcb }, { $set: { username: lowca } });
        }
      }

      return desc.join('\n');

  },

  // For test purpose only, generate random people on the map
  'genRandomMapPeople': function (nb) {
    assertMethodAccess('genRandomMapPeople', this.userId,'admin');

      for (let i = 0; i < nb; i++) {

        let n = 'gen' + PhraseIt.make("gen_{{adjective}}_{{noun}}");
        let doc = {
          name: n,
          dname: n,
          location: 'generated',
          latitude: Math.random() * 180 - 90,
          longitude: Math.random() * 180 - 90,
          timestamp: new Date(),
          channels: ['TEMP'],
          country: randElement(['GE', 'FR', 'BR', 'JP'])
        };
        if (Math.random() > 0.5) doc.allow = true;
        if (Math.random() > 0.5) doc.msg = randSentence();
        UserLocations.insert(doc);
      }
  }
});