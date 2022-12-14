import { BotChannels, ShoutOuts } from "../imports/api/collections";
import { sendDiscord } from "./notifications";

// Timers
var tfofftimer = {};


//tfofftimer[chan] = Meteor.setTimeout(twitchfinds_off.bind(), 1000*60*70);


export function twitch_finds_off(channame) {
    try {

        const ochan = BotChannels.findOne({ channel: channame });
        if (ochan) {

            const l = ochan.storeso_label;
            const sos = ShoutOuts.find({ label: l }, { sort: { timestamp: 1 } }).fetch().map(element => element.so);

            if (sos.length > 0) {
                const title = 'Twitch Finds ' + l;
                let msg = title + '\n```\n' + sos.join('\n') + '```';
                console.info(msg);
                sendDiscord(msg, ochan.discord_so_url);
                BotChannels.update(ochan._id, { $set: { storeso_label: false } });

                // Cancel timer
                if (tfofftimer[channame]) {
                    tfofftimer[channame] = false;
                    //Meteor.()
                }
            }
        }
    } catch (e) {
        console.error(e);
    }
}


export function twitch_finds_on(channame, label) {
    try {
        // Check if twitch finds was already on
        const ochan = BotChannels.findOne({ channel: channame });
        if (ochan) {
            const l = ochan.storeso_label;
            if (l) {
                twitch_finds_off(channame);
            }

            // Set new label and start a new timer
            BotChannels.update(ochan._id, { $set: { storeso_label: label } });
            // 'old guy script'
            tfofftimer[channame] = Meteor.setTimeout(twitch_finds_off.bind(channame), 1000 * 60 * 70);
        }
    } catch (e) {
        console.error(e);
    }
}

