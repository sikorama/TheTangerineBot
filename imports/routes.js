import { Session } from 'meteor/session'


FlowRouter.notFound = {
  action: function () {
    FlowRouter.go("/");
  }
};

FlowRouter.route('/settings', {
  name: 'settings',
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'Settings',
    });
  }
});

FlowRouter.route('/commands', {
  name: 'commands',
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'CommandsTable',
    });
  }
});


FlowRouter.route('/about', {
  name: 'about',
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'About',
    });
  }
});


FlowRouter.route('/countries', {
  name: 'countries',
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'Stats',
    });
  }
});

FlowRouter.route('/live', {
  name: 'live',
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'LiveChannels',
    });
  }
});

FlowRouter.route('/live-embed', {
  name: 'channel',
  action: function (params, queryParams) {
    BlazeLayout.render('LiveChannels', {
    });
  }
});



FlowRouter.route('/radio', {
  name: 'radio',
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'RadioControl',
    });
  }
});


FlowRouter.route('/from', {
  name: 'from',
  action: function (params, queryParams) {
    Session.set('edit_mode', false);
    BlazeLayout.render('MainPage', {
      main: 'LatestLocations',
    });
  }
});

FlowRouter.route('/from/edit', {
  name: 'from',
  action: function (params, queryParams) {
    Session.set('edit_mode', true);
    BlazeLayout.render('MainPage', {
      main: 'LatestLocations',
    });
  }
});

FlowRouter.route('/greetings', {
  name: 'greetings',
  action: function (params, queryParams) {
    Session.set('edit_mode', false);
    BlazeLayout.render('MainPage', {
      main: 'Greetings',
    });
  }
});

FlowRouter.route('/greetings/edit', {
  name: 'greetings',
  action: function (params, queryParams) {
    Session.set('edit_mode', true);
    BlazeLayout.render('MainPage', {
      main: 'Greetings',
    });
  }
});

FlowRouter.route('/shoutouts', {
  name: 'greetings',
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'Shoutouts',
    });
  }
});


FlowRouter.route('/', {
  name: 'map',
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'WorldMap',
    });
  }
});

FlowRouter.route('/map', {
  name: 'map',
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'WorldMap',
    });
  }
});


FlowRouter.route('/mapsearch', {
  name: 'map',
  action: function (params, queryParams) {
    BlazeLayout.render('WorldMap', {
      main: '',
      search_mode: true
    });
  }
});


FlowRouter.route('/quizz', {
  name: 'quizz',
  action: function (params, queryParams) {
    Session.set('edit_mode', false);
    BlazeLayout.render('MainPage', {
      main: 'QuizzTable',
    });
  }
});

FlowRouter.route('/quizz/scores', {
  name: 'quizz',
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'QuizzScores',
    });
  }
});

FlowRouter.route('/quizz/settings', {
  name: 'quizz',
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'QuizzSettings',
    });
  }
});


FlowRouter.route('/quizz/edit', {
  name: 'quizz',
  action: function (params, queryParams) {
    Session.set('edit_mode', true);
    BlazeLayout.render('MainPage', {
      main: 'QuizzTable',
    });
  }
});


FlowRouter.route('/disconnect', {
  name: 'disconnect',
  action: function (params, queryParams) {
    AccountsTemplates.logout();
    FlowRouter.go('/');
  }
});



// ---------- PUBLIC PAGES / PER CHANNEL ------------

FlowRouter.route('/c/:chan', {
  name: 'channel',
  action: function (params, queryParams) {
    BlazeLayout.render('ChannelPage', {
      main: 'DirectMap'
    });

  }
});

FlowRouter.route('/c/:chan/map', {
  name: 'channel',
  action: function (params, queryParams) {
    BlazeLayout.render('ChannelPage', {
      main: 'DirectMap'
    });
  }
});

FlowRouter.route('/c/:chan/overlay', {
  name: 'channel',
  action: function (params, queryParams) {
    BlazeLayout.render('GreetingsOverlay', {
    });
  }
});

FlowRouter.route('/c/:chan/commands', {
  name: 'channel',
  action: function (params, queryParams) {
    BlazeLayout.render('ChannelPage', {
      main: 'CommandsTable'
    });
  }
});

FlowRouter.route('/c/:chan/live', {
  name: 'channel',
  action: function (params, queryParams) {
    BlazeLayout.render('ChannelPage', {
      main: 'ChanAbout'
    });
  }
});

FlowRouter.route('/c/:chan/about', {
  name: 'channel',
  action: function (params, queryParams) {
    BlazeLayout.render('ChannelPage', {
      main: 'About'
    });
  }
});

