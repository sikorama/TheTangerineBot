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

  var template = this;


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

  Session.set("searchUsers", searchOptions);


  //TODO: use handlers s1.ready
  // TODO: subscribe to channel's images only
  this.s1 = this.subscribe('images');

  //  this.autorun(() => {

  let sc = Session.get('sel_channel');
  console.info('Map Channel = ', sc);

  this.subscribe('botChannels', { channel: sc }, function () {

    // Create Map
    let mymap = L.map('map').setView([51.505, -0.09], 2);

    let layer;
    let markers = {};
    let cursor;

    // Get icons
    const chan = Session.get('sel_channel');
    let p = BotChannels.findOne({ channel: chan });

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
    let songreqfield = chan + '-lastreq';
    let msgfield = chan + '-msg';

    let ic;
    if (p)
      ic = [p.map_icon_std, p.map_icon_name, p.map_icon_msg];
    else
      ic = ["/tang1.png", "/tang1.png", "/tang1.png"];

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

    // console.info('icons', icons);

    const updateMap = ((chan) => {
      let newmarkers = {};

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

      let isAdmin = checkUserRole(['admin', 'streamer']);

      function onDrag(event) {
        let marker = event.target;
        let position = marker.getLatLng();
        marker.setLatLng(new L.LatLng(position.lat, position.lng), { draggable: 'true' });
        mymap.panTo(new L.LatLng(position.lat, position.lng));
      }

      function onClick(event) {
//        if (isAdmin) {
          let marker = event.target;

          template.subscribe('userLocation', { _id: rid }, { limit: 1 }, () => {
              console.error("subscribed");
  
            const ul = UserLocations.findOne({ _id: rid });
            if (ul.allow && ul.streamer)
              FlowRouter.go('https://twitch.tv/' + marker.data);
          });        
      }

      function onZoomstart(event) { mymap.closePopup(); }
      mymap.on('zoomstart', onZoomstart);


      function onMouseOver(event) {
        let marker = event.target;
        let position = marker.getLatLng();
        //console.error(marker)
        let lp = event.layerPoint;
        lp.y -= 16;
        let nlp = mymap.layerPointToLatLng(lp);

        const rid = marker.data;
        //console.error("rid=",rid);

        template.subscribe('userLocation', { _id: rid }, { limit: 1 }, () => {
          //          template.subscribe('myhubs', { uid_logement: rid }, { limit: 1 }, () => {
            console.error("subscribed");

          const ul = UserLocations.findOne({ _id: rid });
          console.error(ul);
          if (!isNaN(ul.latitude)) {
            let uname = '';
            let txt = '';

            // Optimize with a projection
            // or use allow?
            if (isAdmin === true) {
              uname = ul.dname;
            }
            else {
              if (ul.mapname) {
                uname = ul.mapname;
              }
            }

            let badge='';
            if (ul.streamer) badge = "&#9835; ";

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
                  txt += '<br>';
                txt += ul[songreqfield];
              }

              // ... add more info

              //marker.bindpopup(txt).openPopup()
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

      cursor.forEach(function (item) {
        try {
          if (item._id in markers) {
            newmarkers[item._id] = markers[item._id];
            markers[item._id] = undefined;
          }
          else {

            
            if (!isNaN(item.latitude)) {
              let uname = '';

              // OPTIM: icon could be computed directly in collection and/or on the fly with a projection
              // so we don't need to send too much data
              let icon = 0;

              // Optimize with a projection
              if (isAdmin === true) {
                uname = item.dname;
                if (item.allow === true) {
                  icon = 1;
                }
              }
              else {
                if (item.mapname) {
                  uname = item.mapname;
                  icon = 1;
                }
              }

              if (uname === undefined) {
                uname = '';
              }

              // Message?
              if ((item[msgfield] != undefined) && (item[msgfield].length > 0)) {
                icon = 2;
              }

              // Randomized
              let r0 = (Math.random() - 0.5) * 0.02;
              let r1 = (Math.random() - 0.5) * 0.02;

              let opt = {};
              if ((icons[icon] != null) && (uname.toLowerCase() != chan)) {
                opt.icon = icons[icon];
              }

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

    // cursor = UserLocations.find({ latitude: { $exists: 1 } },{fields: {dname:1, latitude:1, longitude:1,msg:1} }):
    //this.subscribe('UserLocations', function () {
    let now = Date.now();

    Tracker.autorun(() => {

      try {
        //console.info('autorun - update map');

        // check there is a user (for non public maps only)
        // if (!Meteor.userId()) return;

        let searchData = Session.get("searchUsers");

        let prop = {};

        // Selecteur
        if (searchData.msg === true) {
          prop.msg = true;
        }
        if (searchData.show === true) {
          prop.show = true;
        }
        if (searchData.streamer === true) {
          prop.streamer = true;
        }

        let curchan = Session.get('sel_channel');
        if (curchan!=="All Channels") {
          prop.channel = curchan;
        
          if (searchData.lastreq === true) {
            prop.lastreq = curchan;
          }
        }

        if (searchData.team === true) {
          prop.team = "vamoo"; // 
        }


        if (searchData.activeSince === true) {
          let ad = 8;
          if (searchData.activeSinceHours)
            ad = parseInt(searchData.activeSinceHours);
          prop.activeSince = now - ad * 3600 * 1000;

        }

        // Sans l'index
        // UserLocations.find({ latitude: { $exists: 1 } }).forEach(function (item) {
        // Avec l'index
        let curSearch = searchData.text;
        if (curSearch === undefined)
          curSearch = '';

        prop.map = true;
        cursor = UserLocIndex.search(curSearch, { limit: 2000, props: prop }).mongoCursor;
        updateMap(curchan);

      }
      catch (e) {
        console.error(e);
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

});

Template.WorldMap.helpers({
  chan_name() {
    return Session.get('sel_channel');
  }
});

Template.WorldMap.events({
  'input .search': _.debounce(function (event) { manageSearchEvents(event, 'searchUsers'); }, 300),
});

