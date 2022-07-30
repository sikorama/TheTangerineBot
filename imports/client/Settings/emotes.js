import { ReactiveVar } from 'meteor/reactive-var';
import { Images } from '../../api/collections.js';

import './emotes.html';

Template.UploadForm.onCreated(function () {
    this.currentUpload = new ReactiveVar(false);
});

Template.UploadForm.helpers({
    currentUpload: function () {
        return Template.instance().currentUpload.get();
    },
});

Template.UploadForm.events({
    'change #fileInput': function (e, template) {
        if (e.currentTarget.files && e.currentTarget.files[0]) {
            // We upload only one file, in case
            // multiple files were selected
            console.error(e.currentTarget.files);

            Images.insert({
                file: e.currentTarget.files[0],
                onStart() {
                    template.currentUpload.set(this);
                },
                onUploaded(error, fileObj) {
                    if (error) {
                        console.error(error);
                    }
                    else {
                        console.error('OK', fileObj.name);
                    }
                    template.currentUpload.set(false);

                },
                chunkSize: 'dynamic'
            });
        }
    }
});



Template.EmoteSettings.helpers({
    pictures() {
        return Images.find();
    },
    link(o) {
        return Images.link(o);
    },

});
