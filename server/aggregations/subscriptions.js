import { SubEvents } from "../../imports/api/collections";
import { assertMethodAccess } from "../user_management";

function aggregateSubscribers(sel, limit) {
    let sobj = sel || {};
    let pipeline = [];

    //default selector
    if (!sobj.type)
        sobj.type = { $ne: 'subgifts' };

    if (!sobj.user)
        sobj.user = { $exists: 1 };
    // type cheer,subgift, subgifts 
    pipeline.push({
        $match: sobj
    });

    pipeline.push({
        $group: {
            _id: "$user",
            tbits: {
                $sum: "$bits"
            },
            tsubs: {
                $sum: "$nsubs"
            },
            ttips: {
                $sum: "$tip"
            },
        }
    });

    pipeline.push({
        $project: {
            tbits: 1,
            tsubs: 1,
            ttips: 1,
            score: {
                $add: [
                    { $multiply: [200, "$tsubs"] },
                    { $multiply: [100, "$ttips"] },
                    "$tbits"
                ]
            },
        }
    });

    // Tri?
    pipeline.push({
        $sort: { score: -1, tsubs: -1, tbits: -1,ttips:-1 }
    });

    if (limit > 1) {

        pipeline.push({
            $limit: limit
        });
    }


    let res = SubEvents.aggregate(pipeline);
    console.error('aggregation pipeline: ', pipeline);
    //console.error('aggregation subs: ', res);
    return res;
}

Meteor.methods({
    // Liste des souscribers
    aggregateSubscribers: function (sel, limit) {
        assertMethodAccess('aggregateSubscribers', this.userId);

        return aggregateSubscribers(sel, limit);
    }
});


function getSupportersReport(sel) {
    sel = sel || {};
    if (!sel.chan) return;
    sel.type = 'subgift';
    let sg = aggregateSubscribers(sel, 0);
    sg = sg.map((item) => item._id);

    sel.type = { $in: ['resub', 'sub', 'upgrade'] };
    let subs = aggregateSubscribers(sel, 0);
    subs = subs.map((item) => item._id);

    sel.type = 'cheer';
    let cheers = aggregateSubscribers(sel, 0);
    cheers = cheers.map((item) => item._id);

    sel.type = 'tip';
    let tip = aggregateSubscribers(sel, 0);
    tip = tip.map((item) => item._id);

    return { gifts: sg, subs: subs, cheers: cheers, tips: tip };
}


Meteor.methods({
    // subscribers,cheerers list per category
    getSupportersReport: function(sel) {
        assertMethodAccess('aggregateSubscribers', this.userId);
        return getSupportersReport(sel);
    },
    addTip(chan, name,amount,date) {
        if (!chan) return;
        chan="#"+chan;
        if (!date) date=Date.now();

        let id=SubEvents.insert({
            chan: chan,
            date: date,
            user: name,
            type: 'tip',
            tip: parseFloat(amount)
          });
          console.error('inserted ', id);

    }
});


Meteor.methods({
    'fixcheers': function (username, displayname) {
        console.error('fixcheers', username, '=>', displayname);

        SubEvents.find({ type: 'cheer', user: username }).forEach((item) => {
            console.error('fix', item);
            SubEvents.update(item._id, {
                $set: { user: displayname }
            });
        });
    }
});

//Meteor.call('fixcheers');