import './LocationsTable.html';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { UserLocations } from '../api/collections.js';
import { country_names } from '../api/countrycodes.js';
import { checkUserRole } from '../api/roles.js';
import { manageSortEvent,getParentId, manageSearchEvents } from './tools.js';

// ------------ User localization
Template.LatestLocations.onCreated(function () {
  Session.set('locations_sort_field', 'name');
  Session.set('locations_sort_dir', 1);
  Session.setDefault('locations_limit', 50);
  Session.setDefault('locations_page', 1);
  Session.setDefault('locations_count', 0);

  Session.set('searchUsers', {});
  Meteor.call("getNumPeople", function (err, res) {
    Session.set("numPeopleLoc", res);
  });
});

Template.LatestLocations.helpers({
  getlastreq(ul) {
    let chan = Session.get('sel_channel');
    if (chan) {
      return ul[chan + '-lastreq'];
    }},
    getmsg(ul) {
      let chan = Session.get('sel_channel');
      if (chan) {
        return ul[chan + '-msg'];
      }  
  },
  getUserLocs() {
    let searchData = Session.get("searchUsers");
    let curSearch = searchData.text;
    if (curSearch === undefined)
      curSearch = '';

    let prop = {};

    if (searchData.streamer === true) {
      prop.streamer = true;
    }

    if (searchData.msg === true) {
      prop.msg = true;
    }
    if (searchData.show === true) {
      prop.show = true;
    }

    prop.channel = Session.get('sel_channel');
    //console.error(prop);

    // sort:
    let sn = Session.get('locations_sort_field', 'username');
    let sd = Session.get('locations_sort_dir', 1);
    let sortobj = {};
    sortobj[sn] = sd;
    prop.sortby = sortobj;

    let l = Session.get('locations_limit');
    if (l === undefined) l = 50;

    let s = parseInt(Session.get('locations_page') - 1);
    s *= l;

    let res = UserLocIndex.search(curSearch, {
      limit: l,
      skip: s,
      props: prop,
    });

    //    console.error(res.count());
    Session.set('locations_count', res.count())
    return res.mongoCursor;
  },
});



Template.LatestLocations.events({
    'click .delete': function (event) {
      //let n = event.target.name;
      //let v = event.target.value;
      let id = getParentId(event.currentTarget);
      let res = confirm('Are you sure?');
      if (res) {
        UserLocations.remove(id);
      }
    },
    'click th.sort': function (event) {
      manageSortEvent(event, 'locations');
    },
    'input .search': _.debounce(function (event) { manageSearchEvents(event, 'searchUsers'); }, 300),
    'change .edit': function (event) {
      let n = event.target.name;
      let v = event.target.value;
      let id = getParentId(event.currentTarget);
      let setObj = {}
  
      if (n === "lastreq") {
        let chan = Session.get('sel_channel');
        if (!chan)
          return;
        n = chan + '-lastreq';
        //console.error(n);
      }
  
      // Clear
      if (event.target.name == 'country') {
        // Verification du code
        v = event.target.value.toUpperCase();
        if (!(v in country_names)) {
          v = '';
          console.error('Unknown Country Code')
        }
//        console.error(n,'<-',v);
      }
  
  
      if (event.target.name == 'location') {
        UserLocations.update(id, { $unset: { latitude: "", longitude: "", country: "" } })
      }
      if (event.target.name == 'latitude' || event.target.name == 'longitude') {
        v = parseFloat(v);
      }
  
      if (event.target.name == 'allow') {
        v = event.target.checked;
      }
  
      if (event.target.name == 'streamer') {
        v = event.target.checked;
      }
  
      //    console.error(event.target.id, n, v, typeof v);
      // Set value
      setObj[n] = v;
  //    console.error(id,setObj);
      UserLocations.update(id, { $set: setObj })
    },
  });
  
  