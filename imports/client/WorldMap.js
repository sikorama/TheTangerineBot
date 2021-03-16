import './WorldMap.html'
import { Session } from 'meteor/session';
import { checkUserRole } from '../api/roles.js';
import { BotChannels } from '../api/collections.js';
import { getParentId, manageSearchEvents } from './tools.js';

var L = require('leaflet');


// ---------------------------


Template.WorldMap.onCreated(function () {
});

Template.WorldMap.onRendered(function () {
  let sc = Session.get('sel_channel');

  this.subscribe('botChannels', { channel: sc }, function () {

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

    console.error(searchOptions);
    Session.set("searchUsers", searchOptions);

    // Create Map
    var mymap = L.map('map').setView([51.505, -0.09], 2);

    var layer = undefined;
    var markers = {};
    let cursor;

    // Get icons
    let chan = Session.get('sel_channel');
    let p = BotChannels.findOne({ channel: chan });

    let ic;
    if (p)
      ic = [p.map_icon_std, p.map_icon_name, p.map_icon_msg];
    else
      ic = ["/default.png", "/default.png", "/default.png"];

    console.error('ICONS', chan, ic);

    let icons = ic.map((item) => {
      if (item === null) return null;
      if (item.length === 0) return null;
      if (item === "/tang1.png") return null;
      return L.icon({
        iconUrl: item,
        iconsize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [-3, -76],
      });
    });

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

      cursor.forEach(function (item) {
        try {
          if (item._id in markers) {
            //console.error('item deja present', item._id)
            newmarkers[item._id] = markers[item._id];
            markers[item._id] = undefined;
          }
          else {
            //console.error('nouvel item', item._id)

            if (!isNaN(item.latitude)) {
              let uname = ''
              let txt = '';
              let icon = 0;

              // Optimize with a projection
              if (isAdmin === true) {
                uname = item.dname;
                if (item.allow === true) {
                  icon = 1;
                }
              }
              else {
                //              console.error(item);
                if (item.mapname) {
                  uname = item.mapname;
                  icon = 1;

                }
                else {
                }
              }

              if (uname === undefined) {
                //                console.error('uname===undefined',uname);
                uname = '';
              }
              txt = uname;

              if (item.msg != undefined)
                if (item.msg.length > 0) {
                  if (txt.length > 0)
                    txt += '<br>'
                  txt += item.msg;
                  icon = 2;
                }

              // Could be stored in db
              let r0 = (Math.random() - 0.5) * 0.02;
              let r1 = (Math.random() - 0.5) * 0.02;

              // On peut creer des tooltips qui restent affichés en permanence, mais ca risque d'etre confus
              let opt = {};
              if ((icons[icon] != null) && (uname.toLowerCase() != chan)) {
                opt.icon = icons[icon];
              }

              var m = L.marker([parseFloat(item.latitude) + r0, parseFloat(item.longitude) + r1], opt).addTo(mymap);
              //cache
              newmarkers[item._id] = m;
              if (txt.length > 0)
                m.bindTooltip(txt);
            }
          }


        }
        catch (e) {
          console.error(e.stack);
        }
      })

      let ak = Object.keys(markers);
      if (ak.length > 0) {
        ak.forEach(function (k) {
          //  console.error(k);
          let mm = markers[k];
          if (mm != undefined) {
            mymap.removeLayer(mm);
            delete mm;
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

        let chan = Session.get('sel_channel');
        //console.error('sel_channel=', c);
        prop.channel = chan;

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
        updateMap(chan);

      }
      catch (e) {
        console.error(e);
      }

    }); // Autorun

    window.addEventListener('resize', () => resize());
    const resize = _.debounce(() => {
      var windowHeight = (window.innerHeight - 48) * 0.9;
      var container = document.querySelector('#map');
      $("#map").height(windowHeight);
      setTimeout(function () { mymap.invalidateSize() }, 200);
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
})

