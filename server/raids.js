/*
 *
 */

import { Raiders, BotChannels } from "../imports/api/collections"

// Poids/Labels:count viewer
function export_raid_graph(weightMode) {
    let res = [];
    res.push('Digraph G {');
    res.push('graph [ overlap=false, epsilon=0.001, splines=true ];');
//    res.push('node c;');

    BotChannels.find().forEach((item)=> {
        if (item.team) {
            res.push(item.channel.toLowerCase()+' [ shape=box style="rounded,filled" fillcolor=yellow ];');
        }
        else {
            res.push(item.channel.toLowerCase()+' [ shape=box style="rounded" color=red ];');
        }
    });

    Raiders.find().forEach((item) => {
        let attributes = '';

        if (weightMode == 1) {
            attributes += 'weight=' + item.count 
        }
        if (weightMode == 2) {
            attributes += 'weight=' + item.viewers 

        }
        //        attributes+='label="'+item.viewers+'" ';
        attributes+=' penwidth='+(Math.log10(1+parseInt(item.viewers)));
        

        // Check if channel is part of the team, or managed by the bot
        let rc = BotChannels.findOne({channel:item.raider.toLowerCase()});
        let rc2 = BotChannels.findOne({channel:item.channel});
        if (rc && rc2) {
            if (rc.team && (rc.team ==rc2.team)) {
                attributes+=' color=red' 
            }
        }

        if (attributes.length > 0)
            attributes = '[ ' + attributes + ' ]';

        res.push(item.raider.toLowerCase() + ' -> ' + item.channel.toLowerCase()+ attributes+ ';');
    })
    res.push('}');
    //console.info(res);
    return res;
}

export function initRaidManagement() {
    Meteor.methods({
        'export_raid_graph': function () {
            return export_raid_graph(0).join('\n');
        }
    })
}