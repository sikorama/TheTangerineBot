/**
 * 
 * Adding different layouts (2 columns)
 * Adding chat events (someone has found a word...)
 * 
 */

import { LyricsQuizz } from '../api/collections';
import './lyricsquizz_overlay.html';
import { decodecolor } from './tools';

Template.LyricsQuizzOverlay.onCreated(function () {
    
    this.textColor = new ReactiveVar(decodecolor('textcol', 'rgba(255,255,255,255)'));
    this.captionColor = new ReactiveVar(decodecolor('captioncol', 'rgb(255,255,255)'));
    this.backColor = new ReactiveVar(decodecolor('backcol', 'rgb(0,0,0)'));

    const chan = FlowRouter.getParam('chan');
    //    console.error('chan=', chan);
        if (chan)
        {
            // FIXME: large subscription
            this.subscribe('lyricsquizz',{chan:chan});
        }
});

function getQuizz(chan) {
    const lq = LyricsQuizz.findOne({ type: 'S', chan: chan });
    console.error(lq);
    return lq;
}

Template.LyricsQuizzOverlay.helpers({

    getTextStyle() {
        const tcol = Template.instance().textColor.get();
        const ccol = Template.instance().captionColor.get();
        const bcol = Template.instance().backColor.get();
        return 'color:' + tcol + ';border-color:' + ccol + ';background-color:'+bcol+';';           
    },

    lyrics(col) {
        if (!col) col = 2;

       // let tcol = Template.instance().textColor.get();
       // let ccol = Template.instance().captionColor.get();
       // let bcol = Template.instance().backColor.get();

        // OPT: words array could be stored, and
        // updated by events from DB (type W)

        let chan = FlowRouter.getParam('chan');
        if (!chan) {
            console.error('No channel');
            return;
        }
        console.error(chan);
        let lq = getQuizz(chan); 
        if (!lq) return;       
        
        let nl1 = 0;
        let nlm = lq.numlines / col;
        let indexnl = [];

        let displayed_text = lq.words.map((item, nl) => {
            if (item) {
                if (item.displayed === '<br>') {
                    nl1 += 1;
                    if (nl1 > nlm) {
                        indexnl.push(nl);
                        nl1 = 0;
                    }
                }
                return item.displayed;
            }
        });


        // Split in columns
        let resa = [];
        let r0 = 0;
        let r1 = 0;
        // cut into columns
        for (let i = 0; i < col; i++) {
            r1 = indexnl[i];
            let dtext = displayed_text.slice(r0, r1);
           // dtext.unshift('<div style="color:' + tcol + ';border-color:' + ccol + ';background-color:'+bcol+'">');     
           // dtext.push('</div>');
            resa.push(dtext.join(' '));
            r0 = r1;
        }

        console.error('lquizz=', resa.length,'words');
        if (lq) {
            return {
                text: resa,
                title: lq.displayed_title,
                author: lq.displayed_author,
            };
        }
    }
});

Template.LyricsQuizzOverlay.events({
'click button': (event)=> {
    let name = event.currentTarget.name;
    const chan = FlowRouter.getParam('chan');
    console.error('chan=', chan, 'button=', name);
    if (chan) {
        if (name==='start') 
            Meteor.call('startLyricsQuizz', chan);
        if (name==='stop') 
            Meteor.call('stopLyricsQuizz', chan);
    }
}

});