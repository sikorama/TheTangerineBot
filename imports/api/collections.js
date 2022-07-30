import { Mongo } from 'meteor/mongo';
import { Index, MongoDBEngine } from 'meteor/easy:search';
import { FilesCollection } from 'meteor/ostrio:files';
import { checkUserRole } from './roles.js';

// Channels settings
export const BotChannels = new Mongo.Collection('botchannels');
// Users regitered on the map
export const UserLocations = new Mongo.Collection('userloc');
// Auto greet messages
export const GreetMessages = new Mongo.Collection('greetmessages');
// Auto greet messages timestamp (to greet only once)
export const GreetDate = new Mongo.Collection('greetdate');
// Server settings
export const Settings = new Mongo.Collection('settings');
// Quizz question database
export const QuizzQuestions = new Mongo.Collection('quizzquestions');
// Quizz scoring
export const QuizzScores = new Mongo.Collection('quizzscores');
// Raid, song, user statistics
export const Stats = new Mongo.Collection('statistics');
// Raid data
export const Raiders = new Mongo.Collection('raiders');
// Collection for storing shoutouts commands (by moderators, not the bot)
export const ShoutOuts = new Mongo.Collection('shoutout');
// Collection for storing discord hooks in a handy way
export const DiscordHooks = new Mongo.Collection('dhooks');
// Collection for storing latest data about live channels
export const LiveEvents = new Mongo.Collection('liveevents');
// Last bot message, used for overlays
export const BotMessage = new Mongo.Collection('botmessage');
// Custom command, can be edited per channel
export const BotCommands = new Mongo.Collection('botcommands');
// Collection for storing ILR gig events (for notifying users)
export const IRLEvents = new Mongo.Collection('irlevents');

// Collection for storing Lyrics for quizz
export const Lyrics = new Mongo.Collection('lyrics');
// Collection for storing lyrics quizz game state
export const LyricsQuizz = new Mongo.Collection('lyricsquizz');


/// Index pour les localisations
/*const*/ UserLocIndex = new Index({
    collection: UserLocations,
    fields: ['name', 'location', 'country', 'streamer'],
    permission: function (options) {
        return true;
        //        return (options.userId);
    },
    // Options de recherche par défaut
    defaultSearchOptions: {
        sortBy: { 'timestamp': 1 }
    },
    engine: new MongoDBEngine({
        selector: function (searchObject, options, aggregation) {
            // retrieve the default selector
            //TODO: Verifier les roles (admin) options.search.userId

            let selector = this.defaultConfiguration().selector(searchObject, options, aggregation);
            if (options.search.props.hasOwnProperty('show')) {
                selector.allow = {
                    $eq: true
                };
            }
            if (options.search.props.hasOwnProperty('country')) {
                selector.typeCnx = {
                    $eq: options.search.props.country
                };
            }

            // strict name
            if (options.search.props.hasOwnProperty('uname')) {
                selector.name = {
                    $eq: options.search.props.uname
                };
            }


            // Filters users if they are registered, and have interacte on one of the channels.
            // Soit par le dernier greet, quelque soit l'endroit ou on se soit inscrit
            // FIXME: check channel access
            if (options.search.props.hasOwnProperty('channel')) {
                let chfilter = { $exists: true };
                // Add Active filter
                if (options.search.props.hasOwnProperty('activeSince')) {
                    chfilter.$gt = options.search.props.activeSince;
                }
                selector[options.search.props.channel] = chfilter;
            }

            if (options.search.props.hasOwnProperty('msg')) {
                selector[options.search.props.channel + '-msg'] = {
                    $exists: true, $ne: ''
                };
            }

            if (options.search.props.hasOwnProperty('lastreq')) {
                selector[options.search.props.channel + '-lastreq'] = {
                    $exists: true, $ne: ''
                };
            }

            if (options.search.props.hasOwnProperty('streamer')) {
                selector.streamer = true;
            }

            if (options.search.props.hasOwnProperty('team')) {
                selector.team = options.search.props.team;
            }

            //console.info(selector);
            return selector;
        },
        sort: function (searchObject, options) {
            // On utilise le champ sortby tel quel
            return (options.search.props.sortby);
        },
        /*beforePublish(event, donc) {
            // Compute icon here?
            return doc;
        },*/
        fields: function (searchObject, options) {
            let fulldata = (options.search.props.map !== true);
            let admin = checkUserRole('admin', options.userId);
            // fulldata is not allowed for non admins
            if (admin === false) fulldata = false;

            if (fulldata === true) {
                // All data except name
                return { name: 0 };
            }
            else {
                // Data for map
                // If public map, only shows allowed names


                let chan = options.search.props.channel;

                let fobj =
                {
                    allow: 1,
                    latitude: 1,
                    longitude: 1,
                    //steamer: 1              // is a streamer?
                };

                


                if (chan) {
                    // OPTIM: message is only needed for selecting the right icon, so we don't need the content
                    fobj[chan + '-msg'] = 1;
                }
                
                //console.error(fobj);
                return fobj;
            }
        }
    })
});

// Index pour les questions, uniquemnt pour les admins
/*const*/ QuizzIndex = new Index({
    collection: QuizzQuestions,
    fields: ['question', 'answers', 'comment', 'topics'],
    permission: function (options) {
        return checkUserRole('admin', options.userId);
    },
    // Options de recherche par défaut
    defaultSearchOptions: {
        sortBy: { timestamp: 1 }
    },
    engine: new MongoDBEngine({
        selector: function (searchObject, options, aggregation) {
            // retrieve the default selector
            let selector = this.defaultConfiguration().selector(searchObject, options, aggregation);

            if (options.search.props.hasOwnProperty('topics')) {
                selector.topics = {
                    $eq: options.search.props.topics
                };
            }

            if (options.search.props.hasOwnProperty('enabled')) {
                selector.enabled = {
                    $eq: options.search.props.enabled
                };
            }
            //Verifier les roles (admin) options.search.userId
            return selector;
        },
        sort: function (searchObject, options) {
            // On utilise le champ sortby tel quel
            return (options.search.props.sortby);
        },
        //        fields: function(searchObject, options) {
        //            return {dname:1, allow:1, msg:1, latitude:1, longitude:1};
        //        }
    })
});


// Index pour les questions, uniquemnt pour les admins
/*const*/ GreetIndex = new Index({
    collection: GreetMessages,
    fields: ['username'],
    permission: function (options) {
        return checkUserRole('greet', options.userId);
    },
    // Options de recherche par défaut
    defaultSearchOptions: {
        sortBy: { username: 1 }
    },
    engine: new MongoDBEngine({
        selector: function (searchObject, options, aggregation) {
            // retrieve the default selector
            let selector = this.defaultConfiguration().selector(searchObject, options, aggregation);

              if (options.search.props.hasOwnProperty('lang')) {
                selector.lang = {
                    $eq: options.search.props.lang
                };
            }
  
            if (options.search.props.hasOwnProperty('autoban')) {
                selector.autoban = {
                    $eq: options.search.props.autoban
                };
            }

            if (options.search.props.hasOwnProperty('ban')) {
                selector.ban = {
                    $exists: options.search.props.ban
                };
            }
            
            //console.error(selector);
            //Verifier les roles (admin) options.search.userId
            return selector;
        },
        sort: function (searchObject, options) {
            // On utilise le champ sortby tel quel
            return (options.search.props.sortby);
        },
        //        fields: function(searchObject, options) {
        //            return {dname:1, allow:1, msg:1, latitude:1, longitude:1};
        //        }
    })
});


// Map badges
//export const 

export const Images = new FilesCollection({
    //debug: true,
    collectionName: 'Images',
    // Required to let you remove uploaded file
    allowClientCode: false,
    onBeforeUpload: function (file) {
        // Allow upload files under 100Kb, and only in png/jpg/jpeg formats
        //console.error('before upload', file);
        if ((file.size <= 100 * 1024) && /png|jpg/i.test(file.extension)) {
            return true;
        } else {
            return 'File too big or wrong extension !';
        }
    }
});




// Index pour les questions, uniquemnt pour les admins
/*const*/ LyricsIndex = new Index({
    collection: Lyrics,
    fields: ['title', 'text', 'author', 'topics'],
    permission: function (options) {
        return checkUserRole('admin', options.userId);
    },
    // Options de recherche par défaut
    defaultSearchOptions: {
        sortBy: { timestamp: 1 }
    },
    engine: new MongoDBEngine({
        selector: function (searchObject, options, aggregation) {
            // retrieve the default selector
            let selector = this.defaultConfiguration().selector(searchObject, options, aggregation);

            if (options.search.props.hasOwnProperty('topics')) {
                selector.topics = {
                    $eq: options.search.props.topics
                };
            }

            if (options.search.props.hasOwnProperty('enabled')) {
                selector.enabled = {
                    $eq: options.search.props.enabled
                };
            }
            //Verifier les roles (admin) options.search.userId
            //console.error('Lyrics index', selector);
            return selector;
        },
        sort: function (searchObject, options) {
            // On utilise le champ sortby tel quel
            return (options.search.props.sortby);
        },
        //        fields: function(searchObject, options) {
        //            return {dname:1, allow:1, msg:1, latitude:1, longitude:1};
        //        }
    })
});