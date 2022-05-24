import './WorldMap.html';
import { Session } from 'meteor/session';
import { checkUserRole } from '../api/roles.js';
import { BotChannels, Images, UserLocations } from '../api/collections.js';
import { getParentId, manageSearchEvents } from './tools.js';

const L = require('leaflet');


// ---------------------------


Template.WorldMap.onCreated(function () {

});

Template.WorldMap.onRendered(function () {

  const template = this;

  // Get URL parameters
  let searchOptions = {
    activeSince: true,
    activeSinceHours: 24 * 30 * 3
  };

  if (FlowRouter.getQueryParam('show')) searchOptions.show = true;
  if (FlowRouter.getQueryParam('msg')) searchOptions.msg = true;
  if (FlowRouter.getQueryParam('active')) {
    searchOptions.activeSince = true;
    searchOptions.activeSinceHours = parseInt(FlowRouter.getQueryParam('active')) * 24;
  }
  // FIXME: Use Template variable
  Session.set("searchUsers", searchOptions);

  // FIXME: Subscribe to channel's icons only?
  this.s1 = this.subscribe('images');

  // Create Map
  let mymap = L.map('map').setView([51.505, -0.09], 2);

  let layer;

  if (layer === undefined) {
    layer = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
      maxZoom: 18,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox/streets-v11',
      tileSize: 512,
      zoomOffset: -1
    }).addTo(mymap);
  }

  function onZoomstart(event) { mymap.closePopup(); }
  mymap.on('zoomstart', onZoomstart);

  let markers = {};

  const isAdmin = checkUserRole(['admin', 'streamer']);
  //this.subscribe('UserLocations', function () {
  let now = Date.now();

  function onClick(event) {
    let marker = event.target;
    const rid = marker.data;

    // ctrl+click => got to viewers page?

    template.subscribe('userLocation', { _id: rid }, { limit: 1 }, () => {
      const ul = UserLocations.findOne({ _id: rid });
      if (ul.allow && ul.streamer)
        FlowRouter.go('https://twitch.tv/' + marker.data);
    });
  }

  /*
      function onDrag(event) {
        let marker = event.target;
        let position = marker.getLatLng();
        marker.setLatLng(new L.LatLng(position.lat, position.lng), { draggable: 'true' });
        mymap.panTo(new L.LatLng(position.lat, position.lng));
      }
*/



  const updateMap = ((cursor, chan, options) => {
    options = options || {};

    let newmarkers = {};
    //  const chan = Session.get('sel_channel');
    console.info('Update Map,  Channel = ', chan);

    // Multiple subscriptions
    this.subscribe('botChannels', { channel: chan }, function () {
      let p = BotChannels.findOne({ channel: chan });
      //console.info('channel', p)

      // Check if channel does exist
      if (!p) {
        FlowRouter.go('/');
        return;
      }

      // Check if map feature is enabled
      if (!p.map) {
        FlowRouter.go('/');
        return;
      }

      //        return ul[chan+'-lastreq'];
      const songreqfield = chan + '-lastreq';
      const msgfield = chan + '-msg';

      let ic;
      if (p)
        ic = [null, p.map_icon_std, p.map_icon_name, p.map_icon_msg];
      else
        ic = [null, "/tang1.png", "/tang1.png", "/tang1.png"];

      let icons = ic.map((item) => {
        if (item === null) return null;
        if (item.length === 0) return null;
        if (item[0] != "/") {
          let im = Images.findOne({ name: item });
          if (!im) return null;

          item = im.link();
        }
        return L.icon({
          iconUrl: item,
          iconsize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [-3, -76],
        });
      });


      function onMouseOver(event) {
        let marker = event.target;
        //let position = marker.getLatLng();
        let lp = event.layerPoint;
        lp.y -= 16;
        let nlp = mymap.layerPointToLatLng(lp);

        const rid = marker.data;
        //console.error("rid=",rid);

        // add fields
        template.subscribe('userLocation', { _id: rid }, { limit: 1 }, () => {

          const ul = UserLocations.findOne({ _id: rid });
          //console.error(ul);
          if (!isNaN(ul.latitude)) {
            let txt = '';

            // either dname or mapname are available.
            // dname if admin, mapname otherwise, if allow===true            
            let uname = ul.dname;
            if (!uname) uname=ul.mapname;

            let badge = '';
            if (ul.streamer) badge = " &#9732;";

            if (uname !== undefined) {
              txt = '<strong>' + badge + uname + '</strong>';

              // Message?
              if ((ul[msgfield] != undefined) && (ul[msgfield].length > 0)) {
                if (txt.length > 0)
                  txt += '<br>';
                txt += ul[msgfield];
              }

              // Song request
              if (ul[songreqfield]) {
                if (txt.length > 0)
                  txt += '<br>"&#9835; "' + ul[songreqfield] + " &#9835;";
              }

              // ... add more info
              
              let popup = L.popup()
                .setLatLng(nlp, { draggable: 'false' })
                .setContent(txt)
                .openOn(mymap);
            
            }

            // TODO OPTIM:unsubscribe?

          }
        });

        // console.error(event,this);
      }

      console.error(cursor.count());

      cursor.forEach(function (item) {

        try {
          const rid = item.__originalId;

          if (rid in markers) {
            newmarkers[rid] = markers[rid];
            markers[rid] = undefined;
          }
          else {

            if (!isNaN(item.latitude)) {
              let opt= {};
        
              // broadcaster emotes is different
              if (options.broadcaster !== rid) {
                let icon = 1;

                // nickname? 
                if (item.allow === true) {
                  icon = 2;
                }

                // Message? 
                if ((item[msgfield] != undefined) && (item[msgfield].length > 0)) {
                  icon = 3;
                }


                if (icons[icon])
                  opt.icon = icons[icon];

              }

              // Randomized
              let r0 = (Math.random() - 0.5) * 0.02;
              let r1 = (Math.random() - 0.5) * 0.02;

              let m = L.marker([parseFloat(item.latitude) + r0, parseFloat(item.longitude) + r1], opt);
              m.data = item.__originalId;
              m.on('mouseover', onMouseOver);
              m.on('mouseout', onZoomstart);
              m.on('click', onClick);
              //m.on('dblclick', ondblClick);
              //m.on('dragend', onDrag);
              m.addTo(mymap);

              //cache
              newmarkers[item._id] = m;
            }
          }
        }
        catch (e) {
          console.error(e.stack);
        }
      });

      // Remove old markers
      let ak = Object.keys(markers);
      if (ak.length > 0) {
        ak.forEach(function (k) {
          let mm = markers[k];
          if (mm != undefined) {
            mymap.removeLayer(mm);
          }
        });
      }
      markers = newmarkers;
    });

  });

  // cursor = UserLocations.find({ latitude: { $exists: 1 } },{fields: {dname:1, latitude:1, longitude:1,msg:1} }):
  this.autorun(() => {

    try {
      //console.info('autorun - update map');

      // check there is a user (for non public maps only)
      // if (!Meteor.userId()) return;
      let curchan = Session.get('sel_channel');
      if (!curchan) return;
      console.error(curchan);

      this.subscribe('botChannels', { channel: curchan });   //function () {
      //console.error('subscribed');

      let p = BotChannels.findOne( { channel: curchan });
      console.error('p=', p);
      if (!p) return;

      let searchData = Session.get("searchUsers");

      let prop = {map:true};

      // Selector
      if (searchData.msg === true) {
        prop.msg = true;
      }
      if (searchData.show === true) {
        prop.show = true;
      }
      if (searchData.streamer === true) {
        prop.streamer = true;
      }

      prop.channel = curchan;

      if (searchData.lastreq === true) {
        prop.lastreq = curchan;
      }
    

      // To generalize
      if (searchData.team === true) {
        prop.team = "vamoo"; // 
      }


      if (searchData.activeSince === true) {
        let ad = 8;
        if (searchData.activeSinceHours)
          ad = parseInt(searchData.activeSinceHours);
        prop.activeSince = now - ad * 3600 * 1000;

      }

      let curSearch = searchData.text;
      if (curSearch === undefined)
        curSearch = '';

      prop.map = true;
      let opt = {};

      // Broadcaster  
      // we could also search in userloc collection, or make a strict search
      let bcs = UserLocIndex.search(curchan, { limit: 1 , props: {map:true}});
      if (bcs) {
        bcs=bcs.mongoCursor;
        if (bcs.count()) {
          opt = { broadcaster: bcs.fetch()[0].__originalId }; 

          // Too much fields :O
          //console.error('broadcaster=', bcs.fetch()[0]);
        }
        
        // Viewers
        let cursor = UserLocIndex.search(curSearch, { limit: 2000, props: prop }).mongoCursor;
        // ... Wait for cursor to be complete?
        updateMap(cursor, curchan, opt);
        
      } 

    }
    catch (e) {
      console.error(e.stack);
    }

  }); // Autorun

  window.addEventListener('resize', () => resize());
  const resize = _.debounce(() => {
    const windowHeight = (window.innerHeight - 48) * 0.9;
    const container = document.querySelector('#map');
    $("#map").height(windowHeight);
    setTimeout(function () { mymap.invalidateSize(); }, 200);
  }, 100);

  resize();

});


Template.WorldMap.helpers({
  chan_name() {
    return Session.get('sel_channel');
  }
});

Template.WorldMap.events({
  'input .search': _.debounce(function (event) { manageSearchEvents(event, 'searchUsers'); }, 300),
});

