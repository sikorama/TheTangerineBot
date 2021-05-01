import { Mongo } from 'meteor/mongo';
import { Index, MongoDBEngine } from 'meteor/easy:search'
import { FilesCollection } from 'meteor/ostrio:files';
import { checkUserRole } from './roles.js';

// Channels 
export const BotChannels = new Mongo.Collection('botchannels');
// USers regitered on the map
export const UserLocations = new Mongo.Collection('userloc');
// Auto greet messages
export const GreetMessages = new Mongo.Collection('greetmessages');
export const GreetDate = new Mongo.Collection('greetdate');

export const Settings = new Mongo.Collection('settings');

export const QuizzQuestions = new Mongo.Collection('quizzquestions');
export const QuizzScores = new Mongo.Collection('quizzscores');

export const Stats = new Mongo.Collection('statistics');

export const Raiders = new Mongo.Collection('raiders');

export const DiscordHooks = new Mongo.Collection('dhooks');


/// Index pour les localisations
/*const*/ UserLocIndex = new Index({
    collection: UserLocations,
    fields: ['name', 'msg', 'location', 'country', 'streamer'],
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
                selector.streamer = true
            }

            if (options.search.props.hasOwnProperty('team')) {
                selector.team = options.search.props.team;
            }


            return selector;
        },
        sort: function (searchObject, options) {
            // On utilise le champ sortby tel quel
            return (options.search.props.sortby);
        },

        fields: function (searchObject, options) {
            let fulldata = (options.search.props.map !== true)
            let admin = checkUserRole('admin streamer', options.userId);
            if (admin === false) fulldata = false;

            if (fulldata === true) {
                // All data except name
                return { name: 0 };
            }
            else {
                // Data for map
                // If public map, only shows allowed names
                // FIXME Also chan should be mandatory
                let chan = options.search.props.channel;

                let fobj =
                {
                    allow: 1,
                    latitude: 1,
                    longitude: 1,
                    steamer: 1
                };

                if (chan) {
                    fobj[chan + '-lastreq'] = 1;
                    fobj[chan + '-msg'] = 1;
                }

                // Faire une projection pour n'avoir qu'un champ pour les noms, en fonction du flag 'allow'
                // mapname = dname if() allow==true)
                if (admin === true) {
                    fobj.dname = 1;
                    return fobj;
                }
                else {
                    fobj.mapname = 1;
                    return fobj;
                }
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

// Map badges
//export const 

export const Images = new FilesCollection({
    //debug: true,
    collectionName: 'Images',
    // Required to let you remove uploaded file
    allowClientCode: false,
    onBeforeUpload: function (file) {
        // Allow upload files under 100Kb, and only in png/jpg/jpeg formats
        console.error('before upload', file);
        if ((file.size <= 100 * 1024) && /png|jpg/i.test(file.extension)) {
            return true;
        } else {
            return 'File too big or wrong extension !';
        }
    }
});
