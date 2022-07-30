import './RadioControl.html';

Template.RadioControl.events({
 'click button' : function(event) {
    let name = event.currentTarget.name;
    console.error(name);     
    Meteor.call(name, function(err,res) {
        console.error(err);
        console.log(res);
    });
 }
});