

// actual international code
// key = translation code, data: {says, name}
// see https://sites.google.com/site/opti365/translate_codes

export const tr_lang_desc = {
    'ar': {name: 'Arabic', says:''},
    'ca': {name: 'Catalan', says:''},
    'cs': {name: 'Czech', says:''},
    'da': {name: 'Danish', says:''},
    'de': {name: 'German', says:'sagt'},
    'en': {name: 'English', says:'says'},    
    'el': {name: 'Greek', says:''},
    'es': {name: 'Spanish', says:''},
    'et': {name: 'Estonian', says:''},
    'eu': {name: 'Basque', says:''},
    'fi': {name: 'Finnish', says:''},
    'fr': {name: 'French', says:'dit'},
    'hi': {name: 'Hindi', says:''},
    'hu': {name: 'Hungarian', says:''},
    'it': {name: 'Italian', says:''},
    'ja': {name: 'Japanese', says:''},
    'ko': {name: 'Korean', says:''},
    'nl': {name: 'Dutch', says:''},
    'no': {name: 'Norwegian', says:''},
    'pt': {name: 'Portuguese', says:'disse'},
    'pl': {name: 'Polish', says:''},
    'ro': {name: 'Romanian', says:''},
    'ru': {name: 'Russian', says:''},
    'sv': {name: 'Swedish', says:''},
    'tl': {name: 'Filipino', says:''},
    'tr': {name: 'Turkish', says:''},
    'uk': {name: 'Ukrainian', says:''},
    'vi': {name: 'Vietnamese', says:''},
    'zh': {name: 'Simplified Chinese', says:''},
};

// additional alias translation commands
// key == command, value = translate code
export const tr_lang_alias = {
    'br': 'pt',
    'cn': 'zh',
    'co': 'ko',
    'du': 'nl',
    'eng': 'en',
    'esp': 'es',
    'ge': 'de',
    'gr': 'el', 
    'ger': 'de',
    'kr': 'ko',
    'sp': 'es',
    'sw': 'sv',
    'tu': 'tr', 
    'tw': 'zh',
  };
  

/** Generate command list, using alias and lang list */
export function tr_commands() {
    let cmds={};
    let keys = Object.keys(tr_lang_desc);
    keys = keys.concat(Object.keys(tr_lang_alias));
    keys.forEach((k)=> {

        let cmd = tr_lang_alias[k];
        if (!cmd) cmd = k;
        let desc = tr_lang_desc[cmd];
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