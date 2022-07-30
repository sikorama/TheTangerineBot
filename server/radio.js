/* 
 * Control of ffmpeg encoder server
 */
/*
import { Meteor } from 'meteor/meteor';
import { Settings } from '../imports/api/collections.js';
import { hasRole } from './user_management.js';

const http = require('http');

export function init_radio() {

    let ffmpeg_server_url = Settings.findOne({ param: 'ffmpeg_server_url' });
    let ffmpeg_server_port = Settings.findOne({ param: 'ffmpeg_server_port' });
    if (!ffmpeg_server_url)
        return;

    console.error(ffmpeg_server_port, ffmpeg_server_url);

    let post_options = {
        host: ffmpeg_server_url.val,
        port: ffmpeg_server_port.val,
        method: 'POST',
        headers: {
            'Content-Type': 'test/html',
            //           'Content-Length': ...
        }
    };


    Meteor.methods({
        convert: function () {
            if (hasRole(this.userId, ['stream_control'])) {
            }
        },
        stopStream: function () {
            try {

                if (hasRole(this.userId, ['stream_control'])) {

                    post_options.path = 'stop';
                    console.error(post_options);
                    let post_req = http.request(post_options, Meteor.bindEnvironment(function (res) {
                        //res.setEncoding('utf8');
                        res.on('data', function (chunk) {
                            console.log(chunk);
                        });
                        res.on('end', Meteor.bindEnvironment(function () {

                        }));

                    }));

                    if (post_req) {
                        post_req.on('error', function (errd) {
                            console.error(errd);
                        });
                        //                post_req.write(source);
                        post_req.end();
                    }
                }
            } catch (e) {
                console.error(e);
            }

        },
        startStream: function () {
            if (hasRole(this.userId, ['stream_control'])) {

            }

        }
    });

}

*/