import { SubEvents } from "../imports/api/collections";

//https://github.com/tmijs/docs/blob/gh-pages/_posts/v1.4.2/2019-03-03-Events.md#giftpaidupgrade

//Subs

//TODO: limiter aux chaines ou c'est actif
function checkSubTrackingEnabled(channel) {

}

// Dans un premier temps on stocke tous les events
// Dans un second temps on ne gardera que ce qui nous interesse
// Dans un troisieme temps, on procedera a un ecrasement des stats anciennes et inutiles (regrouper par mois, ou jour...)

// Les subs et resubs nous interessent peu ( a part pour savoir le status d'un utilisateur)
export function onSubscription(channel, username, method, message, userstate) {
    try {
        console.info('subscription Event', channel, username, userstate, message,method);
        // nmonths = 1 (1st subscription)
        SubEvents.insert({ date: Date.now(), type: 'sub', chan: channel, user: username, nsubs:1,tmonths:1 });
    } catch (e) { console.error(e); }
}

export function onResub(channel, username, months, message, userstate, methods) {
    try {
        // 1 sub? depends on months? event will be sent later?
        // keep 'msg-param-cumulative-months' for number of months
        console.info('resub Event', channel, username, userstate, months, message, methods);
        SubEvents.insert({ date: Date.now(), type: 'resub', chan: channel, user: username, months: months, tmonths: userstate['msg-param-cumulative-months'], nsubs:1 });
    } catch (e) { console.error(e); }
}


export function onSubgift(channel, username, streakMonths, recipient, methods, userstate) {
    try {
        // 1 subgift
        console.info('subgift Event', channel, username, streakMonths, recipient, userstate);
        SubEvents.insert({ date: Date.now(), type: 'subgift', chan: channel, user: username, recipient: recipient, nsubs:1 });
    } catch (e) { console.error(e); }
}

// submysterygift also sends sub events
export function onSubmysterygift(channel, username, numbOfSubs, methods, userstate) {
    try {
        console.info('submysterygift Event', channel, username, userstate, numbOfSubs, methods);
        
        SubEvents.insert({ date: Date.now(), type: 'subgifts', chan: channel, user: username, nsubs: numbOfSubs });
    } catch (e) { console.error(e); }
}

export function onAnongiftpaidupgrade(channel, username, userstate) {
    try {
        console.info('anongiftpaidupgrade Event', channel, username, userstate);
        SubEvents.insert({ date: Date.now(), type: 'anonupgrade', chan: channel, user: username });
    } catch (e) { console.error(e); }
}

export function onGiftpaidupgrade(channel, username, sender, userstate) {
    try {
        console.info('giftpaidupgrade Event', channel, username, userstate, sender);
        SubEvents.insert({ date: Date.now(), type: 'upgrade', chan: channel, user: username, sender: sender});
    } catch (e) { console.error(e); }
}

// Bits
export function onCheer(channel, userstate, message) {
    try {
        console.info('cheer Event', channel, userstate, message);
        SubEvents.insert({ date: Date.now(), type: 'cheer', chan: channel, user:userstate['display-name'], bits: parseInt(userstate.bits) });
    } catch (e) { console.error(e); }
}
