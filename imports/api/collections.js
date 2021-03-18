import { Mongo } from 'meteor/mongo';
import { Index, MongoDBEngine } from 'meteor/easy:search'
import {checkUserRole} from './roles.js';

// Collection contenant la localisation déclarée des utilisateurs (ainsi que leur channels)
export const UserLocations = new Mongo.Collection('userloc');
export const BotChannels = new Mongo.Collection('botchannels');
export const GreetMessages = new Mongo.Collection('greetmessages');
export const Settings = new Mongo.Collection('settings');
export const QuizzQuestions = new Mongo.Collection('quizzquestions');
export const QuizzScores = new Mongo.Collection('quizzscores');
export const Stats = new Mongo.Collection('statistics');

/// Index pour les localisations
/*const*/ UserLocIndex = new Index({
    collection: UserLocations,
    fields: ['name', 'msg', 'location','country','streamer'],
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
                let chfilter = {$exists:true};
                // Add Active filter
                if (options.search.props.hasOwnProperty('activeSince')) {
                    chfilter.$gt= options.search.props.activeSince;
                }
                selector[options.search.props.channel] = chfilter;
            }

            // Soit par le tableau channels  (donc la ou on s'est enregistré)
            //if (options.search.props.hasOwnProperty('regchannel')) {
            //    selector.channels = options.search.props.regchannels;
            // }

           if (options.search.props.hasOwnProperty('msg')) {
               selector.msg = {
                   $exists: true,$ne:''
                };
            }
            if (options.search.props.hasOwnProperty('streamer')) {
                selector.streamer = true
            }

            return selector;
        },
        sort: function (searchObject, options) {
            // On utilise le champ sortby tel quel
            return (options.search.props.sortby);
        },

        fields: function(searchObject, options) {
            let fulldata = (options.search.props.map!==true)
            let admin = checkUserRole('admin streamer', options.userId);
            if (admin===false ) fulldata=false;
            if (fulldata===true) {
                // Toutes les données
                return {name:0};
               }
            else {
                // Données map, si admin on a tous les noms
                // Faire une projection pour n'avoir qu'un champ pour les noms, en fonction du flag 'allow'
                // mapname = dname if() allow==true)
                if (admin===true) {
                    return {dname:1, allow:1, msg:1, latitude:1, longitude:1, steamer:1,lastreq:1};
                }
                else
                    return {mapname:1, lastreq:1,/*dname:1,*/ allow:1,msg:1, latitude:1, longitude:1/*, streamer:1*/};
            }
        }
    })
});

// Index pour les questions, uniquemnt pour les admins
/*const*/ QuizzIndex = new Index({
    collection: QuizzQuestions,
    fields: ['question', 'answers', 'comment','topics'],
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
