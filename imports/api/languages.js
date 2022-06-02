// see https://sites.google.com/site/opti365/translate_codes
// key == command, value = translate code
export const tr_lang = {
  'ar': ['ar', ''],
  'br': ['pt', 'disse'],
  'cn': ['zh', ''],
  'co': ['ko', ''],
  'de': ['de', 'sagt'],
  'du': ['du', ''],
  'en': ['en', 'says'],
  //'english': ['en', 'says'],
  'eng': ['en', 'says'],
  'el': ['el', ''], // greek
  'es': ['es', ''],
  'esp': ['es', ''],
  'fi': ['fi', ''],
  'fr': ['fr', 'dit'],
  'ge': ['de', 'sagt'],
  'gr': ['el', ''], // greek
  'ger': ['de', 'sagt'],
  'hu': ['hu', ''],
  'it': ['it', ''],
  'jp': ['ja', ''],
  'ko': ['ko', ''],
  'kr': ['ko', ''],
  'sp': ['es', ''],
  'pl': ['pl', ''],
  'pt': ['pt', 'disse'],
  'ro': ['ro', ''],
  'ru': ['ru', ''],
  'sv': ['sv', ''], // swedishh
  'sw': ['sv', ''],
  'tu': ['tr', ''], // turkish
  'tr': ['tr', ''], // turkish
  'tw': ['zh', ''],
};

// key = translation code, data: {says, name}
export const tr_land_desc = {
    'ar': {name: 'Arabic', says:''},
    'de': {name: 'German', says:'sagt'},
    'du': {name: 'Dutch', says:''},

    'el': {name: 'Greek', says:''},
    'es': {name: 'Spanish', says:''},
    'fi': {name: 'Finnish', says:''},
    'hu': {name: 'Hungarian', says:''},
    'it': {name: 'Italian', says:''},
    'ja': {name: 'Japanese', says:''},
    'pt': {name: 'Portuguese', says:'disse'},

    'ko': {name: 'Korean', says:''},
    'tr': {name: 'Turkish', says:''},
    'ru': {name: 'Russian', says:''},
    'pl': {name: 'Polish', says:''},
    'ro': {name: 'Romanian', says:''},
    'sv': {name: 'Swedish', says:''},
    'zh': {name: 'Simplified Chinese', says:''},
    'fr': {name: 'French', says:'dit'},
};



export function tr_commands() {
    let cmds={};
    Object.keys(tr_lang).forEach((k)=> {
        let cmd = tr_lang[k][0];
        let desc = tr_land_desc[cmd];
        if (desc) {
            let name = desc.name;
            if (cmds[name]) 
                cmds[name].push(k); 
            else 
                cmds[name]=[k];
        }
    });
    return cmds;
}