import './overlays.html';
import { BotMessage } from '../api/collections';
import { ReactiveVar } from 'meteor/reactive-var';
import { decodecolor } from './tools';
import { FlowRouter }  from 'meteor/ostrio:flow-router-extra';

// http://nicolasgallagher.com/pure-css-speech-bubbles/demo/



Template.GreetingsOverlay.onCreated(function () {
    let c = '#' + FlowRouter.getParam('chan');
    this.subscribe('lastmessages', { channel: c });
    this.textColor = new ReactiveVar(decodecolor('textcol','rgba(255,255,255,255)'));
    this.captionColor = new ReactiveVar(decodecolor('captioncol','rgb(255,255,255)'));
    this.backColor = new ReactiveVar(decodecolor('backcol','rgb(0,0,0)'));
});

Template.GreetingsOverlay.helpers({
    lastMessage() {
        let col = Template.instance().textColor.get();
        let ccol = Template.instance().captionColor.get();
        let bcol = Template.instance().backColor.get();

        let c = '#' + FlowRouter.getParam('chan');
        const msg = BotMessage.findOne({ channel: c });

        let text = "?";
        text = msg?.txt;
        
        let els = document.getElementsByName('lastMessageCaption');
        els.forEach((el) => {
            el.classList = " overlay overlay-fade ";
            //el.offsetWidth;
            el.classList = " overlay overlay-fade overlay-animate ";
        });

        let bot = document.getElementsByName('lastMessageBot');
        bot.forEach((el) => {
            el.classList = " overlay overlay-fade ";
            //el.offsetWidth;
            el.classList = " overlay overlay-fade overlay-animate2 ";
        });

        let txt = document.getElementsByName('lastMessageText');
        txt.forEach((el) => {
            el.style = "color:" + col + ";border-color:" + ccol + ";background-color:"+bcol+";";
        });
        //console.error(msg,text);
        return text;
    }
});
