import { BotChannels, Settings } from '../imports/api/collections';

let httpreq = require('httpreq');

export function sendDiscord(title, discord_url, embeds) {
  let payload = {
    content: title,
  }

  if (embeds)
    payload.embeds = embeds;


  httpreq.post(discord_url, {
    json: payload
  }, function (err, res) {
    if (!err) {
      console.info("sendDiscord: ", JSON.stringify(res));
    } else {
      console.error("sendDiscord error:", err);
      console.error("sendDiscord res:", res);
    }
  });
}

export function sendLiveDiscord(channel, discord_url) {
  sendChannelDiscord(channel + " is now live!", channel, discord_url);
}

function genChanEmbed(channel) {
  let embed = {
    title: "https://twitch.tv/" + channel,
    url: "https://twitch.tv/" + channel,
    image: {
      url: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_' + channel + '.jpg'
    }
  }
  return embed;
}

export function sendChannelDiscord(text, channel, discord_url) {
  let embed = genChanEmbed(channel);
  sendDiscord(text, discord_url, [embed]);
}


export function sendRaidChannelDiscord(text, channel, raider, discord_url) {
  let embedc1 = genChanEmbed(channel);
  let embedc2 = genChanEmbed(raider);
  sendDiscord(text, discord_url, [embedc1, embedc2]);
}

export function getTwitchToken(client_id, client_secret) {



  console.error('Regenerate Twitch TOKEN');
  body = {
    'client_id': client_id,
    'client_secret': client_secret,
    "grant_type": 'client_credentials'
  }
  let url = 'https://id.twitch.tv/oauth2/token';

  httpreq.post(url, {
    //    headers: header,
    json: body

  }, Meteor.bindEnvironment(function (err, res) {
    if (!err) {
      //    console.info("get oauth", res);
      let body = JSON.parse(res.body);
      if (body) {
        console.info(body.access_token);
        Settings.upsert({ param: 'client_token' }, { $set: { val: body.access_token } });
        Settings.upsert({ param: 'client_token_raw' }, { $set: { val: body } });
        Settings.upsert({ param: 'client_token_expiration' }, { $set: { val: body.expires_in } });
      }
    } else {
      console.error("get oauth", err);
    }
  }));
}


export function checkLiveChannels(client_id, client_private) {
  try {

    let token_param = Settings.findOne({ param: 'client_token' });

    if (!token_param) {
      getTwitchToken(client_id, client_private);
      return;
    }

    let client_token = token_param.val;

    streamer_name = 'sikorama';

    let channels = BotChannels.find().fetch().map((item) => item.channel);
    //  channels = ["sikorama","douteuxtv1","moman"]

    let headers = {
      'Client-ID': client_id,
      'Authorization': 'Bearer ' + client_token
    }

    let url = "https://api.twitch.tv/helix/streams?";
    url += channels.map((item) => 'user_login=' + item).join('&');

    httpreq.get(url, {
      headers: headers,
    }, Meteor.bindEnvironment(function (err, res) {
      if (!err) {
        console.info("helix: ", JSON.parse(res.body));
        let body = JSON.parse(res.body);
        channels.forEach((chan) => {
          let f = body.data.find((item) => item.user_login == chan);
          console.error(chan, f);
          if (f) {

            let c = BotChannels.findOne({ channel: chan });
            if (c) {
              if (c.live !== true) {
                if (c.discord_goinglive_url1)
                  sendLiveDiscord(chan, c.discord_goinglive_url1)
                if (c.discord_goinglive_url2)
                  sendLiveDiscord(chan, c.discord_goinglive_url2)
              }
              BotChannels.upsert({ channel: chan }, { $set: { live: true } })
              BotChannels.upsert({ channel: chan }, { $set: { live_started: f.started_at } })
              BotChannels.upsert({ channel: chan }, { $set: { live_title: f.title } })
            }
          }
          else {

            BotChannels.upsert({ channel: chan }, { $set: { live: false } })
          }
        })
      } else {
        console.error("helix Err:", err);
        // probably means the token has expired
        getTwitchToken(client_id, client_private);
      }
    }));
  } catch (e) {
    console.error(e);
  }

}

/*

function sendRocket: function (title, text, icon, title_link, channel, additional_attachments) {
    var payload = {};
    payload.text = title;
    if (!text) text = title;

    payload.attachments = [{
      "title": text,
      "text": JSON.stringify(additional_attachments, null, ' '),
      'title_link': title_link
    }];

    if (icon !== undefined) {
      payload.icon_emoji = icon;
    }

    var sender = getParam('Name');
    if (sender !== undefined) {
      payload.username = sender;
    }

    // Channel par défaut = #portail
    if (channel)
      payload.channel = channel;
    else
      payload.channel = '#portail';

    try {
      var url = getParam('rocketIP');
      var token = getParam('rocketToken');

      var urlWebHook_rocket = url + '/hooks/' + token;
      //        console.error('sendRocket', payload, 'to', urlWebHook_rocket);

      httpreq.post(urlWebHook_rocket, {
        json: payload
      }, function (err, res) {
        if (!err) {
          //console.info("sendRocket: " + JSON.stringify(res));
        } else {
          console.error("sendRocket:", res, err);
        }
      });

    } catch (e) {
      console.error('sendRocket: ', text, e.stack);
    }
  },
*/