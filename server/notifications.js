
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
