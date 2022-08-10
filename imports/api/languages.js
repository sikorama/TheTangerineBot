

// actual international code
// key = translation code, data: {says, name}
// see https://sites.google.com/site/opti365/translate_codes

export const tr_lang_desc = {
    //1 	Afrikaans 	Afrikaans 	af
    //3 	Arabic 	عربي 	ar
    'ar': {name: 'Arabic', says:''},
    //5 	Azerbaijani 	آذربایجان دیلی 	az
    //7 	Belarusian 	Беларуская 	be
    //8 	Bulgarian 	Български 	bg
    //9 	Catalan 	Català 	ca
    'ca': {name: 'Catalan', says:''},
    //13 	Czech 	Čeština 	cs
    'cs': {name: 'Czech', says:''},
    //14 	Danish 	Dansk 	da
    'da': {name: 'Danish', says:''},
    //23 	German 	Deutsch 	de
    'de': {name: 'German', says:'sagt'},
    //15 	Dutch 	Nederlands 	nl
    'du': {name: 'Dutch', says:''},    
    //16 	English 	English 	en
    'en': {name: 'English', says:'says'},    
    //24 	Greek 	Ελληνικά 	el
    'el': {name: 'Greek', says:''},
    'es': {name: 'Spanish', says:''},
    //17 	Estonian 	Eesti keel 	et
    'et': {name: 'Estonian', says:''},
    //6 	Basque 	Euskara 	eu
    'eu': {name: 'Basque', says:''},
    //19 	Finnish 	Suomi 	fi
    'fi': {name: 'Finnish', says:''},
    //20 	French 	Français 	fr
    'fr': {name: 'French', says:'dit'},
    //12 	Croatian 	Hrvatski 	hr
    //27 	Hindi 	हिन्दी 	hi
    'hi': {name: 'Hindi', says:''},
    //28 	Hungarian 	Magyar 	hu
    'hu': {name: 'Hungarian', says:''},
    //4 	Armenian 	Հայերէն 	hy
    //32 	Italian 	Italiano 	it
    'it': {name: 'Italian', says:''},
    //33 	Japanese 	日本語 	ja
    'ja': {name: 'Japanese', says:''},
    'pt': {name: 'Portuguese', says:'disse'},

    //34 	Korean 	한국어 	ko
    'ko': {name: 'Korean', says:''},
    'tr': {name: 'Turkish', says:''},
    //45 	Russian 	Русский 	ru
    'ru': {name: 'Russian', says:''},
    'pl': {name: 'Polish', says:''},
    'ro': {name: 'Romanian', says:''},
    //2 	Albanian 	Shqip 	sq
    'sv': {name: 'Swedish', says:''},
    //18 	Filipino 	Filipino 	tl
    'tl': {name: 'Filipino', says:''},
    //10 	Chinese (Simplified) 	中文简体 	zh-CN
    //11 	Chinese (Traditional) 	中文繁體 	zh-TW
    'zh': {name: 'Simplified Chinese', says:''},
};

//21 	Galician 	Galego 	gl
//22 	Georgian 	ქართული 	ka
//25 	Haitian Creole 	Kreyòl ayisyen 	ht
//26 	Hebrew 	עברית 	iw
//29 	Icelandic 	Íslenska 	is
//30 	Indonesian 	Bahasa Indonesia 	id
//31 	Irish 	Gaeilge 	ga
//35 	Latvian 	Latviešu 	lv
//36 	Lithuanian 	Lietuvių kalba 	lt
//37 	Macedonian 	Македонски 	mk
//38 	Malay 	Malay 	ms
//39 	Maltese 	Malti 	mt
//40 	Norwegian 	Norsk 	no
//41 	Persian 	فارسی 	fa
//42 	Polish 	Polski 	pl
//43 	Portuguese 	Português 	pt
//44 	Romanian 	Română 	ro
//46 	Serbian 	Српски 	sr <- osong request 
//47 	Slovak 	Slovenčina 	sk
//48 	Slovenian 	Slovensko 	sl <- songlist OO
//49 	Spanish 	Español 	es
//50 	Swahili 	Kiswahili 	sw
//51 	Swedish 	Svenska 	sv
//52 	Thai 	ไทย 	th
//53 	Turkish 	Türkçe 	tr
//54 	Ukrainian 	Українська 	uk
//55 	Urdu 	اردو 	ur
//56 	Vietnamese 	Tiếng Việt 	vi
//57 	Welsh 	Cymraeg 	cy
//58 	Yiddish 	ייִדיש 	yi
//
//


// additional alias translation commands
// key == command, value = translate code
export const tr_lang_alias = {
    'br': 'pt',
    'cn': 'zh',
    'co': 'ko',
    'eng': 'en',
    'esp': 'es',
    'ge': 'de',
    'gr': 'el', 
    'ger': 'de',
    'kr': 'ko',
    'sp': 'es',
    'sw': 'sv',
    'tu': 'tr', // turkish
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