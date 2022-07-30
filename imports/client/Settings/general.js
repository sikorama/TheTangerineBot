import { Session } from 'meteor/session';
import { BotChannels, Images, Settings } from '../../api/collections.js';

import './general.html';

Template.GeneralSettings.helpers({
    getChannel() {
        let sch = Session.get('sel_channel');
        if (sch)
            return BotChannels.findOne({ channel: sch });
    },
    iconnames() {
        return Images.find().fetch().map((item) => item.name);
    },
    getIcon(name) {
        if (name[0] === '/') return name;
        let i = Images.findOne({ name: name });
        if (i)
            return i.link();
    },
    getlink(c,cat) {
        try{
            if (c) {
                //console.error(c,cat,c.channel);
                return '/c/'+c.channel;
            }
        }
        catch(e) {console.error(e);}
    },
    getTeamParamVal(team) {
        let param = 'team-' + team;
        const p = Settings.findOne({ param: param });
        //console.error(param,'==', p);
        if (p)
            return p.val;
    },
});
