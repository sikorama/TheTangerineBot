import { BotChannels } from '../../imports/api/collections.js';
import { hasRole } from '../user_management.js';


Meteor.publish('botChannels', function (sel) {
    if (!sel) sel = {};
    let opt =  { sort: { channel: 1 } };

    let uid = this.userId;
    if (uid) {
        // If non admin, only publish enabled channels corresponding to groups associated to the user
        // Also only send requred fields
        if (!hasRole(uid, ['admin'])) {
            //sel.channel = { $in: getUserGroups(uid) };
        }
    }
    else {
        // For public data
        opt.fields =
        {
            // autoban
            // autobancmd

            //advertteam: 1,
            channel: 1,
            //discord: 1,
            //discord_goinglive_url2: 1,
            //discord_goinglive_url3: 1,
            //discord_raid_url: 1,
            enabled: 1,
            //greet: 1,        
            live: 1,
            //live_notifdate: 1,
            live_started: 1,
            live_thumbnail_url: 1,
            live_title: 1,
            live_viewers: 1,

            map: 1,
            map_icon_msg: 1,
            map_icon_name: 1,
            map_icon_std: 1,

            //me 1,
            //muteGreet 1,
            quizz: 1,
            lyricsquizz: 1,
            //raid_auto_so: 1,
            //raids: 1,
            //songrequest: 1,
            team: 1,
            tr: 1,
        };
    }

    return BotChannels.find(sel, opt);

    //   this.ready();
});





//Publish the list of all channels where the bot is enabled and not suspended
Meteor.publish('EnabledChannels', function (sel) {
    if (!sel) sel = {};
    sel.enabled = true;
    sel.suspended = { $ne: true };
    return BotChannels.find(sel, { fields: { enabled: 1, channel: 1, live: 1, team: 1 } });
});

//Publish the list of all channels where the bot is enabled
Meteor.publish('LiveChannels', function (sel) {
    if (!sel) sel = {};
    sel.live = true;
    sel.suspended = { $ne: true };
    return BotChannels.find(sel, {
        fields:
        {
            enabled: 1,
            channel: 1,
            live: 1,
            live_title: 1,
            live_started: 1,
            live_thumbnail_url: 1,
            live_viewers: 1,
            team: 1
        }
    });
});

// Liste des channels qui ont la fonction greet activée
// Pour la greetings table (filtre exclusion de channel)
Meteor.publish('GreetChannels', function () {
    if (hasRole(this.userId, ['admin', 'greet'])) {
        let sel = {
            enabled: true,
            greet: true,
            suspended: { $ne: true }
        };
        return BotChannels.find(sel);
    }
    this.ready();
});

