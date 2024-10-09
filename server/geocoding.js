/**
 * Geocoding: Converts from a location to a city, country, and coordiates
 *
 */

import { Settings, UserLocations } from "../imports/api/collections";
import pg from 'pg';

const { Client } = pg;


/**
 * Check if the word USA is present in the string,
 * and replace it by 'United States'
 * @param {string} str0 The input string to check for the word "USA".
 */
function replaceUSA(str0) {
  let str = str0.replace(/[^a-zA-Z]/g, ' ');
  let words = str.split(' ');
  let found = false;
  for (var i = 0; i < words.length; i++) {
    if (words[i].toLowerCase() === 'usa') {
      found = true;
      if (i > 0)
        words[i] = ", United States";
      else
        words[i] = "United States";
    }
  }

  if (found) return words.join(" ");

  return str0;
}

/**
 * Converts a locaion into 
 * @param {*} location 
 * @returns 
 */
async function geocode(location) {
  if (!location) return;

  // Remove any character that is not a letter or a space or a comma
  location = location.replace(/[^a-zA-Z ,]/g, '');
  // Replace short names by omplete name, to improve database match (usa=>United States)
  location = replaceUSA(location);

  try {
    const info = {
      user: process.env.PGUSER,
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      database: process.env.PGDATABASE,
      password: process.env.PGPASSWORD,
      ssl: false
    };

    const client = new Client(info);
    await client.connect();

//    let res = await client.query('SELECT $1::text as connected', ['Connection successful!']);
//    console.info('connected = ', res.rows[0].connected);

    let query2 = "SELECT *,similarity(CONCAT(city,', ',country),'" + location + "') FROM cities ORDER BY similarity(CONCAT(city,', ',country), '" + location + "') DESC limit 1;";
    //console.info(query2);
    let res = await client.query(query2);

    await client.end();

    if (res.rows?.length == 0) {
      console.info('No result, geocode returns null');
      return null;
    }

    console.info(res.rows[0]);
    return res.rows[0];
  }
  catch (e) {
    console.error(e);
    return null;
  }
}

export function init_geocoding() {

  setTimeout(Meteor.bindEnvironment(checkLocations), 5 * 1000);
}


async function fix_geocoding() {

  UserLocations.find({ city: { $exists: 0 } }).forEachAsync(async (item) => {

    let res = await geocode(item.location);
    //console.info(res);
    if (res) {
      UserLocations.update(item._id,
        {
          $set: {
            //longitude : parseFloat(res.lng),
            //latitude : parseFloat(res.lat),
            country: res.iso2,
            city: res.city,
            match: parseFloat(res.similarity)
          }
        }
      );
      // Check if lat & lng are correct?
      // At least log the names
      if (Math.abs(item.longitude-res.lng)>0 || Math.abs(item.latitude-res.lat)>0 )
        console.info(item.name, item.longitude-res.lng, item.latitude-res.lat);
    }
  });
}

// single shot
fix_geocoding();

/**
 * Converts a single user location. 
 * @param {*} sel : Selector
 */
function checkLocations(sel) {

  let reschedule = false;

  if (!sel) {
    sel = { latitude: { $exists: 0 } };
    reschedule = true;
  }

  try {

    let i = 60;

    let item = UserLocations.findOne(sel);

    // Is there a location not converted to geo positions?
    if (item != undefined) {

      console.info('Check geocoding', item.name, item._id, 'loc=', item.location);

      // Check if there is already someone with the same location
      let sameLoc = UserLocations.findOne({ _id: { $ne: item._id }, location: item.location, latitude: { $exists: 1 } });
      if (sameLoc) {
        console.info('Found someone with same location: ', item.location, sameLoc);
        if (sameLoc._id != item._id) {
          UserLocations.update(item._id, {
            $set: {
              latitude: sameLoc.latitude,
              longitude: sameLoc.longitude,
              country: sameLoc.country,
              city: sameLoc.city,
              match: sameLoc.match,
            }
          });
        }
        // We can check again very quickly
        if (reschedule) setTimeout(Meteor.bindEnvironment(checkLocations), 1000);
      }
      else {
        // Use geoCoder API for convrerting
        console.info('Location not found in cache, Usin Geo Coding DB', item.location);

        geocode(item.location).then(Meteor.bindEnvironment(function (res) {
          let upobj = {};

          if (!res) {
            upobj.$set = {
              city: 'NA',
              latitude: 'NA',
              longitude: 'NA',
            };
            // unset?
            upobj.$unset = {
              match: 1,
              country: 1
            };
          }
          else {
            upobj.$set = {
              longitude: parseFloat(res.lng),
              latitude: parseFloat(res.lat),
              country: res.iso2,
              city: res.city,
              match: parseFloat(res.similarity)
            };
          }

          console.info('Modifier', upobj, 'for:', item.location);

          UserLocations.update(item._id, upobj);

          // Reschedule
          if (reschedule) {
            let p = Settings.findOne({ param: 'location_interval' });
            if (p !== undefined) i = p.val;
            if (i === undefined) i = 60;
            // Minimal duration
            if (i < 5) i = 1;
            setTimeout(Meteor.bindEnvironment(checkLocations), i * 1000);
          }

        })).catch(Meteor.bindEnvironment(function (err) {
          console.info(err);
          i = 1800;
          console.error('Error occured, next Verification in', Math.floor(i / 60), 'minutes');
          UserLocations.update(item._id, { $set: { longitude: "Err" } });
          if (reschedule) setTimeout(Meteor.bindEnvironment(checkLocations), i * 1000);
        }));
      }

    } else {
      // Nothing to do, next check in 60 seconds;
      // We could trigger resolution when there is a change in database.
      if (reschedule) {
        console.info('Geocoding: Nothing to resolve, reschedule in 1 minute');
        setTimeout(Meteor.bindEnvironment(checkLocations), 60 * 1000);
      }
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
