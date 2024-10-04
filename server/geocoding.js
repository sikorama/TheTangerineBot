import { Settings, UserLocations } from "../imports/api/collections";
const gc = require('node-geocoder');



let geoCoder;

export function getGeoCoder() { return geoCoder; }

export function init_geocoding() {
  // FIXME: Add referer, user-agent...
  let gcoptions = {
    provider: 'openstreetmap',
  };

  geoCoder = gc(gcoptions);
  setTimeout(Meteor.bindEnvironment(checkLocations), 60 * 1000);
}



function checkLocations(sel) {

  let reschedule = false;

  if (!sel) {
    sel = { longitude: { $exists: 0 } };
    reschedule = true;
  }

  try {

    let i = 60;

    let item = UserLocations.findOne(sel);

    // Is there a location not converted to geo positions?
    if (item != undefined) {

      //console.info('Check geocoding', item._id, 'loc=', item.location);

      // Check if there is already someone with the same location
      let sameLoc = UserLocations.findOne({ location: item.location, latitude: { $exists: 1 } });
      if (sameLoc) {
        // console.debug('Found someone with same location: ', item.location, sameLoc);
        // If it's the same, then do nothing :)
        if (sameLoc._id != item._id) {
          UserLocations.update(item._id, {
            $set: {
              latitude: sameLoc.latitude,
              longitude: sameLoc.longitude,
              country: sameLoc.country,
            }
          });
        }
        // We can check again very quickly
        if (reschedule) setTimeout(Meteor.bindEnvironment(checkLocations), 1000);
      }
      else {
        // Use geoCoder API for convrerting
        console.info('Location not found in cache, Geo Coding', item.location);

        getGeoCoder().geocode(item.location).then(Meteor.bindEnvironment(function (res) {
          let fres = { longitude: "NA" }; // We set longitude to NA, to exclude this location next time if no coordinates were found
          if (res.length > 0)
            fres = res[0];

          let upobj = {
            latitude: parseFloat(fres.latitude),
            longitude: parseFloat(fres.longitude),
            country: fres.countryCode
          };
          //console.info('Found', upobj, 'for', item.location);

          UserLocations.update(item._id, { $set: upobj });

          let p = Settings.findOne({ param: 'location_interval' });
          if (p !== undefined) i = p.val;
          if (i === undefined) i = 60;
          // On limite le min/max
          if (i > 60) i = 60;
          if (i < 5) i = 5;
          //        console.info('Next check in', i, 'seconds');
          if (reschedule) setTimeout(Meteor.bindEnvironment(checkLocations), i * 1000);

        })).catch(Meteor.bindEnvironment(function (err) {
          console.log(err);
          i = 3600 * 5;
          console.error('Error occured, next Verification in', Math.floor(i / 60), 'minutes');
          UserLocations.update(item._id, { $set: { longitude: "Err" } });
          if (reschedule) setTimeout(Meteor.bindEnvironment(checkLocations), i * 1000);
        }));
      }

    } else {
      // Nothing to do, next check in 60 seconds;

      if (reschedule)
        setTimeout(Meteor.bindEnvironment(checkLocations), 60 * 1000);
    }


  } catch (e) {
    console.error(e);
  }

}

//  Settings.remove({});

Meteor.methods({
  checkLocations: checkLocations
});


/**
 * Find closest person on map, from lat,lng coordinates, 
 * for a given channel
 * Uses hamming distance, not euclidian
 * (abs(dx)+abs(dy))
 * 
 * @param {*} chan 
 * @param {*} lat 
 * @param {*} lng 
 * @param {*} opt:options:
 *  - nbmax : nb max of people (0 to disable)
 *  - distmax: max dist (expressed in lat/lng)  
 * @returns 
 */
export function findClosest(chan, lat, lng, opt) {
  opt = opt || {};
  let nbmax = opt.nbmax;
  let distmax = opt.distmax;
  if (nbmax === undefined) nbmax = 5;
  if (distmax === undefined) distmax = 5;
  let t0 = new Date();

  if ((lat === undefined) || (lng === undefined)) {
    return [];
  }

  let pipeline = [];
  let matchobj = {
    latitude: { $exists: 1 },
    longitude: { $exists: 1 },
    country: { $exists: 1 },
  };
  matchobj[chan] = { $exists: 1 };

  pipeline.push({
    $match: matchobj
  });

  pipeline.push({
    $project: {
      dist: { $add: [{ $abs: { $subtract: ["$latitude", lat] } }, { $abs: { $subtract: ["$longitude", lng] } }] }
    }
  });
  pipeline.push({
    $sort: { dist: 1 }
  });

  if (nbmax > 0) {
    pipeline.push({
      $limit: nbmax
    });
  }

  let res = UserLocations.aggregate(pipeline);
  let nc = [];
  let rl = res.length;
  if (nbmax > 0 && rl > nbmax) rl = nbmax;
  for (let i = 0; i < rl; i++) {
    let cc = res[i];
    if ((cc.dist < distmax) && (opt.uid != cc._id)) {
      let u = UserLocations.findOne(cc._id);
      if (u != undefined)
        nc.push('@' + u.dname);
    }
  }
  console.error(chan, lat, lng, opt, nbmax, distmax, nc);
  // Store / cache
  //  UserLocations.update(uid, { $set: { timestamp: t0, proximity: nc } });
  return nc;
}

export function userfindClosest(uid, chan, opt) {
  opt = opt || {};
  opt.uid = uid;  // Self exclusion
  let udata = UserLocations.findOne(uid);
  if (!udata) return [];
  //Computes  Hamming distance, then sort and keeps n first results
  const lat = udata.latitude;
  const lng = udata.longitude;
  return findClosest(chan, lat, lng, opt);
}
