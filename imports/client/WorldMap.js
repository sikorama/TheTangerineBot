import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import { BotChannels, Images, UserLocations } from '../api/collections.js';
import { manageSearchEvents } from './tools.js';
import './WorldMap.html';
import './common/selectActive.html';

const L = require('leaflet');
let circle;
let circledrag;
let centeredOnBroadcaster = false;
// ---------------------------

/*
Template.WorldMap.onCreated(function () {

});
*/

Template.WorldMap.onRendered(function () {

  const template = this;
  centeredOnBroadcaster = false; // non reactive
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
  let mymap = L.map('map', {
    //worldCopyJump: 1,  // No need, as we handle manually keeping markers on the map
    minZoom: 1,
//    center: [60, 0],
//    zoom: 4
  });

  mymap.setView({lon: 2, lat: 40},4);

//  mymap.setView([60, -0.09], 4);

  //setTimeout(function () {mymap.invalidateSize(true);}, 1000);


  let markers = {};
  //  mymap.on('click', onMapClick);
  mymap.on('mousedown', onMapMouseDown);
  mymap.on('mouseup', onMapMouseUp);
  mymap.on('mousemove', onMapMouseMove);

  // Keep markers on central & visible map when map is scrolled
  mymap.on('moveend', (event) => {
    let longshift = mymap.getCenter().lng - 180;
    Object.keys(markers).forEach((m) => {
      {
        try {

          const mk = markers[m];
          const latlng = mk._latlng;
          let lng = latlng.lng;
          if (lng < longshift) lng += 360;
          else {
            if (lng > longshift + 360) lng -= 360;
            else return;
          }
          latlng.lng = lng;
          mk.setLatLng(latlng);
        } catch (e) {
          console.error(e);
        }
      }
    });

  });

  let layer;
  
  if (layer === undefined) {
    // Put these settings as parameter
    layer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 14,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mymap);
  }

  L.control.scale({imperial: true, metric: true}).addTo(mymap);

  function onZoomstart(event) { mymap.closePopup(); }
  mymap.on('zoomstart', onZoomstart);

  //const isAdmin = checkUserRole(['admin', 'streamer']);

  const now = Date.now();

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

  function onMapMouseUp(event) {

    mymap.dragging.enable();

    if (circledrag !== true)
      return;

    circledrag = false;


    const chan = Session.get('sel_channel');
    if (!chan) return;

    if (!circle) return;
    //console.error(circle);

    // get users in area
    //let center = circle._latlng
    //let radius= circle._latlng.distanceTo(event.latlng);

    const clat = circle._latlng.lat;
    const clng = circle._latlng.lng;
    const dlat = event.latlng.lat - clat;
    const dlng = event.latlng.lng - clng;
    let radius;
    if ((dlat == 0) && (dlng == 0)) {
      // initial circle
      radius = 0.8;  // Approx 80km
    }
    else {
      // Euclidian distance
      //radius = Math.sqrt(dlat *dlat + dlng * dlng);
      radius = Math.abs(dlat) + Math.abs(dlng);
    }
    console.error(radius);

    Meteor.call('getClosestUsers', chan, clat, clng, { nbmax: 0, distmax: radius }, function (err, res) {
      console.error(res);
      // Popup
      if (!_.isEmpty(res))
        alert('Utilisateurs trouvés: ' + res.join(','));
    });
  }

  function onMapMouseMove(event) {
    if (circledrag)
      if (circle) {
        // Center
        let d = circle._latlng.distanceTo(event.latlng);
        circle.setRadius(d);
      }
  }

  function onMapMouseDown(event) {
    if (event.originalEvent.ctrlKey) {
      if (circle)
        circle.removeFrom(mymap);

      circledrag = true;
      circle = L.circle(event.latlng, { radius: 80000 }).addTo(mymap);

      mymap.dragging.disable();
    }
  }

  function onMouseOver(event) {
    let marker = event.target;
    //let position = marker.getLatLng();
    let lp = event.layerPoint;
    lp.y -= 16;
    let nlp = mymap.layerPointToLatLng(lp);

    const rid = marker.data;
    //console.error("rid=",rid);

    let chan = Session.get('sel_channel');
    if (!chan) return;

    const songreqfield = chan + '-lastreq';
    const msgfield = chan + '-msg';

    // add fields
    template.subscribe('userLocation', { _id: rid }, { limit: 1 }, () => {

      const ul = UserLocations.findOne({ _id: rid });
      //console.error(ul);
      if (!isNaN(ul.latitude)) {
        let txt = '';

        // either dname or mapname are available.
        // dname if admin, mapname otherwise, if allow===true            
        let uname = ul.dname;
        if (!uname) uname = ul.mapname;

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
              txt += '<br>&#9835; "' + ul[songreqfield] + " &#9835;";
          }

          // ... add more info

          //let popup = 
          L.popup()
            .setLatLng(nlp, { draggable: 'false' })
            .setContent(txt)
            .openOn(mymap);

        }

        // TODO OPTIM:unsubscribe?

      }
    });

    // console.error(event,this);
  }

  const updateMap = ((cursor, chan, options) => {
    options = options || {};

    let newmarkers = {};
    //  const chan = Session.get('sel_channel');
    if (Meteor.isDevelopment)
      console.info('Update Map,  Channel = ', chan);

    this.subscribe('botChannels', { channel: chan }, function () {
      let p = BotChannels.findOne({ channel: chan });

      // Check if channel does exist, otherwise go back home
      if (!p) {
        FlowRouter.go('/');
        return;
      }

      // Check if map feature is enabled, otherwise go back home
      if (!p.map) {
        FlowRouter.go('/');
        return;
      }

      //        return ul[chan+'-lastreq'];
      const msgfield = chan + '-msg';
      let longshift = mymap.getCenter().lng - 180;


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

      cursor.forEach(function (item) {

        try {
          const rid = item.__originalId;

          if (rid in markers) {
            newmarkers[rid] = markers[rid];
            markers[rid] = undefined;
          }
          else {

            if (!isNaN(item.latitude)) {
              let opt = {};

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
              const r0 = (Math.random() - 0.5) * 0.02;
              const r1 = (Math.random() - 0.5) * 0.02;
              let lng = parseFloat(item.longitude);
              if (lng < longshift) lng += 360;
              if (lng > longshift + 360) lng -= 360;

              const m = L.marker([parseFloat(item.latitude) + r0, lng + r1], opt);
              m.data = item.__originalId;
              m.on('mouseover', onMouseOver);
              m.on('mouseout', onZoomstart);
              m.on('click', onClick);
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

      let curchan = Session.get('sel_channel');
      if (!curchan) return;


      this.subscribe('botChannels', { channel: curchan });
      this.subscribe('userLocation', { name: curchan }, { limit: 1 });

      // TODO: Wait for subscriptions ready? 

      let p = BotChannels.findOne({ channel: curchan });
      //console.error('p=', p);
      if (!p) return;

      let searchData = Session.get("searchUsers");

      let prop = { map: true };

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
        prop.team = p.team; // 
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
      try {
        const bcu = UserLocations.findOne({ name: curchan });
        if (bcu) {
          //console.error(bcu);
          opt.broadcaster = bcu._id;

          // Center map on broadcaster's location (but only once)
          if (!isNaN(bcu.latitude) && (centeredOnBroadcaster===false) ) {
            console.info('Center view lat=', bcu.latitude,  'lon=',bcu.longitude );
            mymap.setView({lon: bcu.longitude, lat: bcu.latitude},4);
            centeredOnBroadcaster = true;
          }
        }
      }
      catch (e) { console.error(e); }

      /*
            let bcs = UserLocIndex.search(curchan, { limit: 1, props: { map: true } });
            if (bcs) {
              bcs = bcs.mongoCursor;
            
              if (bcs.count()) {
                const bcu = bcs.fetch()[0];
                opt = { broadcaster: bcu.__originalId };
                console.error('bcu=', bcu);
                // We could set the map center here 
                //mymap.setLatLng({lat: opt.latitude)
                // Too much fields :O
                //console.error('broadcaster=', bcs.fetch()[0]);
              }
            }
      */

      // Viewers
      let cursor = UserLocIndex.search(curSearch, { limit: 3000, props: prop }).mongoCursor;
      // ... Wait for cursor to be complete?
      updateMap(cursor, curchan, opt);

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
  },
  // Return true if the channel is par of a team
  chanteam() {
    let curchan = Session.get('sel_channel');
    if (!curchan) return false;
    let p = BotChannels.findOne({ channel: curchan }, { fields: { team: 1 } });
    if (!p) return false;
    //console.error(curchan, p, p.team);

    return (!_.isEmpty(p.team));
  }
});

Template.WorldMap.events({
  'input .search': _.debounce(function (event) { manageSearchEvents(event, 'searchUsers'); }, 300),
});

