/** Connection to twitch chat usin tmi.js
 * 
 */

import { BotChannels, BotMessage } from '../imports/api/collections';
import { addChannel } from './channels';
import { replaceKeywords } from './greetings';

const tmi = require('tmi.js');
const PhraseIt = require('phraseit');


let bclient, raid_bclient;
let botname;
let botpassword;

/** Get env variables */
export function init_client() {
    botname = process.env.CHANNEL_NAME;
    botpassword = process.env.CHANNEL_PASSWORD;

    // TODO: If no channel & password, then exit...
    if ((botname == undefined) || (botpassword == undefined)) {
        console.error('No CHANNEL_NAME or CHANNEL_PASSWORD environment variable found. Exiting.');
        process.exit(-1);
    }
    botname = botname.toLowerCase();
    // check if oauth is already present
    botpassword = 'oauth:' + botpassword;


      // Add default bot channel with some options enabled
      if (BotChannels.find().count() == 0) {
        addChannel(botname, ["tr", "quizz", "map", "greet"]);
    }

    return botname;
}


export function connect_chat() {

    let bot_channels = BotChannels.find({ enabled: true }).fetch().map(i => i.channel);
    console.info('Connecting to channels:', bot_channels);

    // Connection to TWITCH CHAT
    // Define configuration options
    const opts = {
        identity: {
            username: botname,
            password: botpassword,
        },
        channels: bot_channels,
        connection: { reconnect: true }
    };
    // Create a client with our options
    bclient = new tmi.client(opts);
    return bclient;
}


/*** Raid only */
export function connect_raid() {

    let raid_bot_channels = BotChannels.find({ enabled: false, raids: true }).fetch().map(i => i.channel);
    console.info('Connecting to channels for raid monitoring only:', raid_bot_channels);

    const opts_raid = {
        identity: {
            username: botname,
            password: botpassword,
        },
        channels: raid_bot_channels,
        connection: { reconnect: true }
    };
    //  opts.channels = raid_bot_channels;
    raid_bclient = new tmi.client(opts_raid);

    return raid_bclient;
}

/**
 * Send a message to the chat, after replacing special words like #atname #twitch... 
 * @param {*} target 
 * @param {*} txt 
 * @param {*} options 
 *              - dispname: name of the user to answer to
 *              - store
 */
export function say(target, txt, options) {
    try {
        options = options || {};

        // Check if there is a {{ }} for Phrase it
        if (txt.indexOf('{{') >= 0) {
            txt = PhraseIt.make(txt);
        }

        let chat_txt = ((options.me === true) ? "/me " : "") + replaceKeywords(txt, options);
        bclient.say(target, chat_txt);
        console.info(target, '>', chat_txt, options);

        if (options.store) {
            // Overlay text doesn't contain twitch emotes
            options.removeIcons = true;
            let overlay_txt = replaceKeywords(txt, options);
            BotMessage.upsert({ channel: target }, { $set: { txt: overlay_txt } });
        }
    } catch (e) {
        console.error(e);
    }
}
