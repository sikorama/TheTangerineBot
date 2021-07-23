import './overlays.html';
import { BotMessage } from '../api/collections';
import { ReactiveVar } from 'meteor/reactive-var';

// http://nicolasgallagher.com/pure-css-speech-bubbles/demo/


Template.GreetingsOverlay.onCreated(function () {
    let c = '#' + FlowRouter.getParam('chan')
    this.subscribe('lastmessages', { channel: c });
    let col = FlowRouter.getQueryParam("textcol")
    if (col) {
        col = "rgba(" + col + ",255)";
    }
    else {
        col = "rgba(255,255,255,255)";
    }
    this.textColor = new ReactiveVar(col);
    let ccol = FlowRouter.getQueryParam("captioncol")
    if (ccol) {
        ccol = "rgb(" + ccol + ")";
    }
    else {
        ccol = "rgb(255,255,255)";
    }
    this.captionColor = new ReactiveVar(ccol);

    let bcol = FlowRouter.getQueryParam("backcol")
    if (bcol) {
        bcol = "rgba(" + bcol + ")";
    }
    else {
        bcol = "rgba(255,255,255,0)";
    }
    this.backColor = new ReactiveVar(bcol);
});


Template.GreetingsOverlay.helpers({
    lastMessage() {
        let col = Template.instance().textColor.get();
        let ccol = Template.instance().captionColor.get();
        let bcol = Template.instance().backColor.get();

        let c = '#' + FlowRouter.getParam('chan');
        const msg = BotMessage.findOne({ channel: c });

        let text = "Hello!";
        if (msg && msg.txt) {
            text = msg.txt;
            
        }

        let els = document.getElementsByName('lastMessageCaption');
        els.forEach((el) => {
            el.classList = " overlay overlay-fade "
            el.offsetWidth;
            el.classList = " overlay overlay-fade overlay-animate "
        })

        let bot = document.getElementsByName('lastMessageBot');
        bot.forEach((el) => {
            el.classList = " overlay overlay-fade "
            el.offsetWidth;
            el.classList = " overlay overlay-fade overlay-animate2 "
        });

        let txt = document.getElementsByName('lastMessageText');
        txt.forEach((el) => {
            el.style = "color:" + col + ";border-color:" + ccol + ";background-color:"+bcol+";"
        });
        //console.error(msg,text);
        return text;
    }
});
