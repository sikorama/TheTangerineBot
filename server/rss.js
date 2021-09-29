import { ShoutOuts } from '../imports/api/collections';
import { Picker } from 'meteor/communitypackages:picker';

var RSS = require('rss');

export function buildRSSFeed(chan) {

    let host = Meteor.absoluteUrl();
    console.error('host=', host);

    // publication date === latest so recorded
    let lastso = ShoutOuts.findOne({},{sort:{ date: -1} });
    console.info('lastso=',lastso);

    let feed = new RSS({
        title: 'Twitch-Finds',
       // description: 'Twitch Finds by Five Hit Dune',
        feed_url: host+'/rss/'+chan,
        site_url: host,
       // language: 'en',
       // categories:['channels'],
        pubDate: lastso.timestamp,
        //ttl

       /* <title>Example Feed</title>',
    '  <link href="http://example.org/"/>',
    '  <updated>2003-12-13T18:30:02Z</updated>',
    '  <author>',
    '    <name>John Doe</name>',
    '  </author>',
    '  <id>urn:uuid:60a76c80-d399-11d9-b93C-0003939e0af6</id>',
*/


});

    //console.error(feed.xml())
    //return feed.xml();
    // 
    let pipeline = [];

    pipeline.push({
        $match: {
            chan: '#'+chan
        }
    });

    pipeline.push({
        $group: {
            _id: "$label",
            t: {
                $sum: 1
            }
        }
    })

    // sort by label
    // limit: 10 last twitch finds


    //console.error(pipeline);

    /*
    ShoutOuts.insert({ chan: target, 
    so: soname, 
    timestamp: Date.now(), 
    username: username, 
    label: label })
    */

    let res = ShoutOuts.aggregate(pipeline);

    //console.error(res);

    res.forEach((tf) => {
        console.error(tf);

        if (tf._id!='off') 
        {

        let chanlist = ShoutOuts.find({ label: tf._id }).fetch().map((so) => {return so.so});
        console.error(chanlist);

       feed.item({
            title: 'Twitch-Finds ' + tf._id,
            description: chanlist.join(' '),
            //url
            //guid
            //categories
            // author
            // date
            date: Date.now(),
            //link: '/rss/'+chan,

        })
    } 

    })

    return feed.xml();
}


export function init_rss() {
    // Serve RSS file / Route
    Picker.route('/rss/:chan', function(params, req, res, next) {
        console.error(params.chan);
        res.writeHead(200, {"Content-Type": 'application/rss+xml'});        
        res.end(buildRSSFeed(params.chan));
       
        //        res.set('Content-Type', 'application/rss+xml')
        //res.send(buildRSSFeed(chan));

        //res.end(post.content);
      });

}

