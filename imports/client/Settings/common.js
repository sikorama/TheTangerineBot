

import './common.html';

function getparamvalue(c,n) {
    if (!c) return;
    console.info('getparamvalue',n,c[n]);
    if (n)
        return c[n];
}

Template.SettingsSection.helpers( {
    getparamvalue:getparamvalue,
});


Template.SettingsTextParam.helpers( {
    getparamvalue:getparamvalue,
});

Template.SettingsBoolParam.helpers( {
    getparamvalue:getparamvalue,
});

Template.SettingsParam.helpers( {
    getparamvalue:getparamvalue,
});
