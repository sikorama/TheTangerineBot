import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { BotChannels, Raiders, SubEvents } from '../api/collections.js';
import './Stats.html';
import { manageSearchEvents } from './tools.js';


/**
 * Returns date since we want to get statistics
 * @param {*} since 
 * @returns 
 */
function getDate(since) {
  const rx = new RegExp('([0-9]*)([dmywh])');
  const match = rx.exec(since);
  console.error('regex', since, match);
  let v = 0;
  if (match) {
    v = 1000 * parseInt(match[1]);
    switch (match[2]) {

      case 'y':
        v *= 265 * 24 * 3600;
        break;
      case 'm':
        v *= 30 * 24 * 3600;
        break;
      case 'w':
        v *= 7 * 24 * 3600;
        break;
      case 'd':
        v *= 24 * 3600;
        break;
      case 'h':
        v *= 3600;
    }
    v = Date.now() - v;

  }

  return v;

}


Template.Stats.events({
  'click button.selStat': function (ev) {
    Session.set('statPage', ev.currentTarget.name);
    FlowRouter.go('/stats?page='+ev.currentTarget.name);
  },
  'click button.remove[name="remove_active_user"]': function (ev) {
    let id = ev.currentTarget.id;
    let sch = Session.get('sel_channel');

    if (id && sch) {
      Meteor.call('removeActiveUser', sch, id, function (err, res) {
        //console.error(err, res);
        Session.set('activeUsers', res);
      });

    }
  },
  'click button[name="refresh"]': function (ev) {
    let sch = Session.get('sel_channel');
    if (!sch) return;
    Meteor.call('getActiveUsers', sch, function (err, res) {
      //console.error(err, res);
      Session.set('activeUsers', res);
    });
  },
  'input .search': _.debounce(function (event) {
    manageSearchEvents(event, 'searchSubs', true);
  }, 400),
  'change [name="selDuration"]': function (event) {
    Session.set('selDuration', event.currentTarget.value);
  },
  'click .selectuser': function (event) {
    console.error(event.currentTarget.id);
    Session.set('selectedUser', event.currentTarget.id);

    Meteor.setTimeout(() => {


      //    location.hash='#'+'anchor_userevents';
      let element_to_scroll_to = document.getElementById('anchor_userevents');
      if (element_to_scroll_to)
        element_to_scroll_to.scrollIntoView({
          behavior: 'smooth', // smooth scroll
          block: 'start' // the upper border of the element will be aligned at the top of the visible part of the window of the scrollable area.
        });
    }, 500);

    //
    /*const element = document.querySelector('#element')
    const topPos = element.getBoundingClientRect().top + window.pageYOffset

    window.scrollTo({
      top: topPos, // scroll so that the element is at the top of the view
      behavior: 'smooth' // smooth scroll
    })
    */

  }
});



Template.Stats.onRendered(function () {
  // To optimize...
  Session.setDefault('statPage', 1);
  Session.setDefault('numPeopleLoc', 0);

  Session.set('searchSubs', {});
  Session.set('selDuration', '24h');

  let since = FlowRouter.getQueryParam('since');
  if (since)
    Session.set('selDuration', since);

  let statPage = FlowRouter.getQueryParam('page');
  if (statPage)
    Session.set('statPage', statPage);

  //console.error('since=', Session.get('selDuration'));

  this.autorun(() => {
    let sch = Session.get('sel_channel');
    if (!sch) {
      console.error("No channel selected!");
      return;
    }
    console.error('sub bot channels', sch);
        const chan = Session.get('sel_channel');

    this.subscribe('botChannels', { channel: sch });

    console.error('sub bot channels done', sch);


    let page = Session.get('statPage');
    //    console.info('autorun', sch, page);

    switch (page) {
      case 'countries':
        Meteor.call("getNumPeople", sch, function (err, res) {
          Session.set("numPeopleLoc", res);
        });
        Meteor.call('aggregateUserField', sch, "country", function (err, res) {
          res.sort((a, b) => b.t - a.t);
          Session.set('CountPerCountry', res);
        });
        break;
      case 'songs':
        Meteor.call('aggregateUserField', sch, sch + '-lastreq', function (err, res) {
          if (err)
            console.error(err);

          res.sort((a, b) => b.t - a.t);
          //console.error(res);
          Session.set('CountPerSong', res);

        });
        break;
      case 'users':
        Meteor.call('getActiveUsers', sch, function (err, res) {
          //console.error(err, res);
          Session.set('activeUsers', res);
        });
        break;
      case 'raiders':
        this.subscribe('raiders', { channel: new RegExp(sch, 'i') });
        break;
      case 'raids':
        this.subscribe('raiders', { raider: new RegExp(sch, 'i') });
        break;
      case 'report':
        //        get_supporters_names
        Session.set('supporters', []);

        const rsearchopt = Session.get('searchSubs');
        const rd0 = getDate(Session.get('selDuration'));
        console.error(rd0);
        rsearchopt.chan = '#' + sch;

        if (rd0)
          rsearchopt.date = { $gt: rd0 };

        console.error(rsearchopt);

        // get supporters names per category (subs, bits, tips...)
        Meteor.call('getSupportersReport', rsearchopt, function (err, res) {
          // Tempplate variable
          Session.set('supporters', res);
          console.error('aggregation:', res);
        });

        // get mods
        Meteor.call('getActiveUsers', sch, function (err, res) {
          Session.set('activeUsers', res);
        });
    
      break;

        case 'supporters':
        // Supporters
        Session.set('supporters', []);
        //this.subscribe('subs', { raider: new RegExp(sch,'i') } );
        //SubEvents.find()
        console.error('Page supporters');
//        const chan = Session.get('sel_channel');
        const searchopt = Session.get('searchSubs');
        const d0 = getDate(Session.get('selDuration'));
        console.error(d0);

        searchopt.chan = '#' + sch;

        // Detailed stats
        let su = Session.get('selectedUser');
        if (su)
          this.subscribe('subevents', { chan: '#' + chan, user: su });

        if (chan) {
          const bc = BotChannels.findOne({ channel: chan });
          if (!bc) {
            console.error('bc undefined', chan);
            return;
          }
          if (bc.subs === true) {
            // Date min, max
            // Last 30 days
            // const d1 = Date.now();
            // const d0 = d1 - 1000 * 3600 * 24 * 30;
            if (d0 > 0) {
              searchopt.date = { $gt: d0 };
            }

            // Top supporters
            console.error('call aggregation', searchopt);
            Meteor.call('aggregateSubscribers', searchopt, 50, function (err, res) {
              // Tempplate variable
              Session.set('supporters', res);
              console.error('aggregation:', res);

            });
          }
        }
        break;
    }
  });
});



Template.Stats.helpers({
  format_event(ev) {
    switch (ev.type) {
      case 'cheer':
        return 'Cheered ' + ev.bits + ' bits';
      case 'subgift':
        return 'Gifted a sub to ' + ev.recipient;
      case 'subgifts':
        return 'Gifted ' + ev.nsubs + ' sub(s) to the community';
      case 'resub':
        return 'Subscribded (total ' + ev.tmonths + ' months)';
      case 'sub':
        return 'Subscribded for the first time';
      case 'tip':
          return 'Tipped $'+ev.tip;
      default:
        return JSON.stringify(ev);
    }
  },
  seluser() {
    return Session.get('selectedUser');
  },
  getDuration() {
    return Session.get('selDuration');
  },
  get_subEvents() {
    let chan = Session.get('sel_channel');
    let su = Session.get('selectedUser');
    console.error('sub events', chan, su);
    if (su)

      return SubEvents.find({ chan: '#' + chan, user: su }, { sort: { date: -1 } });
  },
  get_supporters() {
    return Session.get('supporters');
  },
  getCountryCount() {
    return Session.get('CountPerCountry');
  },
  getSongCount() {
    return Session.get('CountPerSong');
  },
  showStat(p) {
    return Session.equals('statPage', p);
  },
  getActiveUsers() {
    let au = Session.get('activeUsers');
    let chan = Session.get('sel_channel');
    if (!chan) return;
    if (!au) return;
    const bc = BotChannels.findOne({ channel: chan });
    if (!bc) return;

    let since = parseInt(bc.active_since);
    let d = Date.now();
    if (since < 1) since = 10;
    d -= 1000 * 60 * since;
    let res = au.map((item) => {
      item.recent = item.ts > d;
      return item;
    }).sort((a, b) => b.ts - a.ts);

    console.error(res);
    return res;
  },
  getraiders() {
    let sch = Session.get('sel_channel');
    return Raiders.find({ channel: new RegExp(sch, 'i') }, { sort: { viewers: -1, count: -1 } });
  },
  getraided() {
    let sch = Session.get('sel_channel');
    return Raiders.find({ raider: new RegExp(sch, 'i') }, { sort: { count: -1, viewers: -1 } });
  },
  getCurChan() {
    let chan = Session.get('sel_channel');
    if (chan)
      return BotChannels.findOne({ channel: chan });
  },

  divide(a, b) { return parseInt(a / b); },
  isSelected(v) {
    if (Session.equals('selDuration', v)) return 'selected';
  },
  durations() {
    return [
      { value: '24h', label: '24 hours' },
      { value: '48h', label: '48 hours' },
      { value: '72h', label: '72 hours' },
      { value: '1w', label: '1 week' },
      { value: '1m', label: '1 month' },
      { value: '3m', label: '3 months' },
      { value: '6m', label: '6 months' },
      { value: '1y', label: '1 year' },
      { value: '0', label: 'All time' },
    ];
  }

});
