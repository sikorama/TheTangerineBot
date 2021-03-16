import { Session} from 'meteor/session'


FlowRouter.route('/settings', {
  name: 'settings',
  action: function(params, queryParams) {
    BlazeLayout.render('MainPage', {
       main: 'Settings',
     });
   }
});

FlowRouter.route('/commands', {
    name: 'commands',
    action: function(params, queryParams) {
      BlazeLayout.render('MainPage', {
         main: 'CommandsTable',
       });
     }
  });

  FlowRouter.route('/c/:chan', {
    name: 'countries',
    action: function(params, queryParams) {
      BlazeLayout.render('DirectMap', {
//         main: 'DirectMap',
       });

     }
  });



FlowRouter.route('/countries', {
    name: 'countries',
    action: function(params, queryParams) {
      BlazeLayout.render('MainPage', {
         main: 'Countries',
       });
     }
  });

  FlowRouter.route('/from', {
    name: 'from',
    action: function(params, queryParams) {
      Session.set('edit_mode',false);
      BlazeLayout.render('MainPage', {
         main: 'LatestLocations',
       });
     }
  });

  FlowRouter.route('/from/edit', {
    name: 'from',
    action: function(params, queryParams) {
      Session.set('edit_mode',true);
      BlazeLayout.render('MainPage', {
         main: 'LatestLocations',
       });
     }
  });

  FlowRouter.route('/greetings', {
    name: 'greetings',
    action: function(params, queryParams) {
      Session.set('edit_mode',false);
      BlazeLayout.render('MainPage', {
         main: 'Greetings',
       });
     }
  });

  FlowRouter.route('/greetings/edit', {
    name: 'greetings',
    action: function(params, queryParams) {
      Session.set('edit_mode',true);
      BlazeLayout.render('MainPage', {
         main: 'Greetings',
       });
     }
  });

  FlowRouter.route('/', {
    action: function(params, queryParams) {
            FlowRouter.go('/map');
     }
  });


  FlowRouter.route('/map', {
    name: 'map',
    action: function(params, queryParams) {
      BlazeLayout.render('MainPage', {
         main: 'WorldMap',
       });
     }
  });

  FlowRouter.route('/mapsearch', {
    name: 'map',
    action: function(params, queryParams) {
      BlazeLayout.render('WorldMap', {
         main: '',
         search_mode: true
       });
     }
  });

  FlowRouter.route('/about', {
    name: 'about',
    action: function(params, queryParams) {
      BlazeLayout.render('MainPage', {
         main: 'About',
       });
     }
  });


  FlowRouter.route('/quizz', {
    name: 'quizz',
    action: function(params, queryParams) {
      Session.set('edit_mode',false);
      BlazeLayout.render('MainPage', {
         main: 'QuizzTable',
       });
     }
  });

  FlowRouter.route('/quizz/scores', {
    name: 'quizz',
    action: function(params, queryParams) {
      BlazeLayout.render('MainPage', {
         main: 'QuizzScores',
       });
     }
  });

  FlowRouter.route('/quizz/settings', {
    name: 'quizz',
    action: function(params, queryParams) {
      BlazeLayout.render('MainPage', {
         main: 'QuizzSettings',
       });
     }
  });


  FlowRouter.route('/quizz/edit', {
    name: 'quizz',
    action: function(params, queryParams) {
      Session.set('edit_mode',true);
      BlazeLayout.render('MainPage', {
         main: 'QuizzTable',
       });
     }
  });


  FlowRouter.route('/disconnect', {
    name: 'disconnect',
    action: function(params, queryParams) {
      AccountsTemplates.logout();
      FlowRouter.go('/');
     }
  });
