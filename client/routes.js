import { Session } from 'meteor/session';
import { FlowRouter }  from 'meteor/ostrio:flow-router-extra';


FlowRouter.route('*', {
  action: function () {
    FlowRouter.go("/");
  }
});

FlowRouter.route('/settings', {
  name: 'settings',
  waitOn() {
    return import ('/imports/client/Settings');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'Settings',
    });
  }
});

FlowRouter.route('/commands', {
  waitOn() {
    return import ('/imports/client/CommandsTable');
  },
  name: 'commands',
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'CommandsTable',
    });
  }
});

FlowRouter.route('/about', {
  name: 'about',
  waitOn() {
//    return import ('/imports/client/');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'About',
    });
  }
});


FlowRouter.route('/stats', {
  name: 'stats',
  waitOn() {
    return import ('/imports/client/Stats');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'Stats',
    });
  }
});

FlowRouter.route('/live', {
  name: 'live',
  waitOn() {
   // return import ('/imports/client/');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'LiveChannels',
    });
  }
});

FlowRouter.route('/live-embed', {
  name: 'channel',
  waitOn() {
  //  return import ('/imports/client/');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('LiveChannels', {
    });
  }
});

FlowRouter.route('/from', {
  name: 'from',
  waitOn() {
    return import ('/imports/client/LocationsTable');
  },
  action: function (params, queryParams) {
    Session.set('edit_mode', false);
    BlazeLayout.render('MainPage', {
      main: 'LatestLocations',
    });
  }
});

FlowRouter.route('/from/edit', {
  name: 'from',
  waitOn() {
    return import ('/imports/client/LocationsTable');
  },
  action: function (params, queryParams) {
    Session.set('edit_mode', true);
    BlazeLayout.render('MainPage', {
      main: 'LatestLocations',
    });
  }
});

FlowRouter.route('/customcommands', {
  name: 'customcommands',
  waitOn() {
   // return import ('/imports/client/');
  },
  action: function (params, queryParams) {
    Session.set('edit_mode', false);
    BlazeLayout.render('MainPage', {
      main: 'CustomCommands',
    });
  }
});

FlowRouter.route('/irlevents', {
  name: 'irlevents',
  waitOn() {
  //  return import ('/imports/client/');
  },
  action: function (params, queryParams) {
    Session.set('edit_mode', false);
    BlazeLayout.render('MainPage', {
      main: 'IRLEvents',
    });
  }
});



FlowRouter.route('/greetings', {
  name: 'greetings',
  waitOn() {
    return import ('/imports/client/GreetingsTable');
  },
  action: function (params, queryParams) {
    Session.set('edit_mode', false);
    BlazeLayout.render('MainPage', {
      main: 'Greetings',
    });
  }
});

FlowRouter.route('/greetings/edit', {
  name: 'greetings',
  waitOn() {
    return import ('/imports/client/GreetingsTable');
  },
  action: function (params, queryParams) {
    Session.set('edit_mode', true);
    BlazeLayout.render('MainPage', {
      main: 'Greetings',
    });
  }
});

FlowRouter.route('/shoutouts', {
  name: 'greetings',
  waitOn() {
    return import ('/imports/client/Shoutout');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'Shoutouts',
    });
  }
});


FlowRouter.route('/', {
  name: 'map',
  waitOn() {
//    return import ('/imports/client/');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'WorldMap',
    });
  }
});

FlowRouter.route('/map', {
  name: 'map',
  waitOn() {
    return import ('/imports/client/WorldMap');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'WorldMap',
    });
  }
});


FlowRouter.route('/mapsearch', {
  name: 'map',
  waitOn() {
    return import ('/imports/client/WorldMap');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('WorldMap', {
      main: '',
      search_mode: true
    });
  }
});


FlowRouter.route('/quizz', {
  name: 'quizz',
  waitOn() {
    return import ('/imports/client/QuizzTable');
  },
  action: function (params, queryParams) {
    Session.set('edit_mode', false);
    BlazeLayout.render('MainPage', {
      main: 'QuizzTable',
    });
  }
});

FlowRouter.route('/quizz/scores', {
  name: 'quizz',
  waitOn() {
    return import ('/imports/client/QuizzTable');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'QuizzScores',
    });
  }
});

FlowRouter.route('/quizz/settings', {
  name: 'quizz',
  waitOn() {
    return import ('/imports/client/QuizzTable');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'QuizzSettings',
    });
  }
});


FlowRouter.route('/quizz/edit', {
  name: 'quizz',
  waitOn() {
    return import ('/imports/client/QuizzTable');
  },
  action: function (params, queryParams) {
    Session.set('edit_mode', true);
    BlazeLayout.render('MainPage', {
      main: 'LyrucsTable',
    });
  }
});

FlowRouter.route('/lyricsquizz', {
  name: 'lyricsquizz',
  waitOn() {
    return import ('/imports/client/lyricsquizz_overlay');
  },
  action: function (params, queryParams) {
    Session.set('edit_mode', false);
    BlazeLayout.render('MainPage', {
      main: 'LyricsTable',
    });
  }
});

FlowRouter.route('/lyricsquizz/scores', {
  name: 'lyricsquizz',
  waitOn() {
    return import ('/imports/client/lyricsquizz_table');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'LyricsQuizzScores',
    });
  }
});

FlowRouter.route('/lyricsquizz/settings', {
  name: 'lyricsquizz',
  waitOn() {
    return import ('/imports/client/lyricsquizz_table');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('MainPage', {
      main: 'LyricsQuizzSettings',
    });
  }
});


FlowRouter.route('/lyricsquizz/edit', {
  name: 'lyricsquizz',
  waitOn() {
    return import ('/imports/client/lyricsquizz_table');
  },
  action: function (params, queryParams) {
    Session.set('edit_mode', true);
    BlazeLayout.render('MainPage', {
      main: 'LyricsTable',
    });
  }
});




FlowRouter.route('/disconnect', {
  name: 'disconnect',
  waitOn() {
//    return import ('/imports/client/');
  },
  action: function (params, queryParams) {
    AccountsTemplates.logout();
    FlowRouter.go('/');
  }
});



// ---------- PUBLIC PAGES / PER CHANNEL ------------

FlowRouter.route('/c/:chan', {
  name: 'channel',
  waitOn() {
    return import ('/imports/client/');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('ChannelPage', {
      main: 'DirectMap'
    });

  }
});

FlowRouter.route('/c/:chan/map', {
  name: 'channel',
  waitOn() {
    return import ('/imports/client/WorldMap');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('ChannelPage', {
      main: 'DirectMap'
    });
  }
});

FlowRouter.route('/c/:chan/overlay', {
  name: 'channel',
  waitOn() {
    return import ('/imports/client/overlays');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('GreetingsOverlay', {
    });
  }
});


FlowRouter.route('/c/:chan/lyricsquizz', {
  name: 'channel',
  waitOn() {
    return import ('/imports/client/lyricsquizz_overlay');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('LyricsQuizzOverlay', {
    });
  }
});


FlowRouter.route('/c/:chan/commands', {
  name: 'channel',
  waitOn() {
//    return import ('/imports/client/');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('ChannelPage', {
      main: 'CommandsTable'
    });
  }
});

FlowRouter.route('/c/:chan/live', {
  name: 'channel',
  waitOn() {
//    return import ('/imports/client/about');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('ChannelPage', {
      main: 'ChanAbout'
    });
  }
});

FlowRouter.route('/c/:chan/about', {
  name: 'channel',
  waitOn() {
//    return import ('/imports/client/about');
  },
  action: function (params, queryParams) {
    BlazeLayout.render('ChannelPage', {
      main: 'About'
    });
  }
});

