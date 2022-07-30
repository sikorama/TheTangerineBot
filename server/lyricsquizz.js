import { Lyrics, LyricsQuizz, QuizzScores, Settings } from "../imports/api/collections";
import { assertMethodAccess } from "./user_management";

export function stopLyricsQuizz(chan) {
  console.error('stop Lyrics Quizz', chan);

  const cq = LyricsQuizz.findOne({ chan: chan, type: 'S' });
  if (!cq) return;

  if (cq.gameover===true) {
    console.warn('Game is already over, doing nothing');
    return;
  }

  // Unmask everthing
  cq.words.forEach((item) => {

    item.displayed = item.original;
  });

  let obj = {
    gameover: true,
    words: cq.words,
    displayed_title: cq.title,
    displayed_author: cq.author
  };

  LyricsQuizz.update(cq._id, { $set: obj });
}

export function startLyricsQuizz(chan) {
  console.error('startLyricsQuizz', chan);

  if (!chan) return;
  // TODO: check chan exists
  // Check if a quizz already started
  // It must be over, 
  let exq = LyricsQuizz.findOne({ chan: chan, type: 'S' });
  let allow = false;

  if (exq) {
    console.error('found a quizz:', exq._id);
    if (exq.gameover === true)
      allow = true;
  }
  else {
    allow = true;
  }

  console.error('Allow to start: ', allow);

  if (!allow) return;

  // Remove all previous data in db
  console.info('Lyrics quizz STARTED on', chan);
  let w;
  LyricsQuizz.remove({ chan: chan });
  // pick a song
  let song = selectSong();
  console.error('get song', song);
  // parse lyrics, initialize data

  let pl = parseLyrics(song);

  console.error('pl=', pl);

  if (pl) {
    // insert docs in db
    LyricsQuizz.insert(
      {
        chan: chan,
        type: 'S',
        title: song.title,
        author: pl.author,
        words: pl.words,
        index: pl.index,
        displayed_title: song.title.replace(/\w/g, '*'),
        displayed_author: pl.author.replace(/\w/g, '*'),
        started: Date.now(),
        numlines: pl.numlines
      });
    Object.keys(pl.index).forEach((k) => {
      w = pl.index[k];
      LyricsQuizz.insert({
        chan: chan,
        type: 'W',
        word: k,
        original: w.original,
        displayed: w.displayed,
        ref: w.ref,
        found: false
      });
    });
  }
}

export function processWordLyricsQuizz(chan, word, username) {
  word = word.toLowerCase();
  

  let res = {};
  let cq = LyricsQuizz.findOne({ type: 'S', chan: chan });
  //console.error(cq);
  if (!cq) return;

  // Check if title matches
  console.info('Quizz: Process', word, 'title?', cq.title.toLowerCase(), word === cq.title.toLowerCase());

  if (word === cq.title.toLowerCase()) {
    res.titleFound = true;
    res.points = 50;
    QuizzScores.upsert({ chan: chan, type: 'lyricsquizz', user: username }, { $inc: { score: res.points } });
    stopLyricsQuizz(chan);

    return res;
  }

  // Search word in word list 
  // Check if it si only one word?

  let points = word.length;
  let w = LyricsQuizz.findOne({ chan: chan, type: 'W', word: word, found: false });
  if (w) {
    console.error("matching word!", w);
    if (w.ref) {
      points *= w.ref.length;
      w.ref.forEach((ref) => {
        console.error(ref);
        cq.words[ref.index].displayed = cq.words[ref.index].original;
      });
    }
    else {
      console.error('w.ref manquant');
    }

    // Update user score +  word.length*w.ref.length
    QuizzScores.upsert({ chan: chan, type: 'lyricsquizz', user: username }, { $inc: { score: points } });
    // Update word, mark it as found 
    LyricsQuizz.update(w._id, { $set: { found: true, foundby: username } });
    // Update whole text array
    LyricsQuizz.update(cq._id, { $set: { words: cq.words } });
    res.points = points;
    res.wordFound = true;
    return res;
  }

  return false;

}


export function addSong(title, author, text, topics) {
  if (title === undefined || text === undefined) return;
  title = title.trim();

  let doc = {
    title: title,
    author: author,
    text: text,
    topic: topics,
    enabled: true,
    timestamp: new Date()
  };
  Lyrics.insert(doc);
}


// --------- Lyrics ----------------
export function selectSong() {
  console.info('Select Song');
  let pipeline = [];
  let q;
  //    if (mhid != undefined)
  let p = Settings.findOne({ param: 'lyricsquizz_enabled_topics' });
  //  console.error(p);
  let sel = {
    enabled: true
  };

  if ((p != undefined) && (p.val.length > 0))
    sel.topics = { $in: p.val };
  //  console.error(sel);

  pipeline.push({
    $match: sel
  });
  pipeline.push({
    $sample: {
      size: 1
    }
  });

  let res = Lyrics.aggregate(pipeline);

  if (res.length > 0) {
    q = res[0];
    Lyrics.update(q._id, { $set: { enabled: false } });
  }
  else {
    console.warn("Lyrics Quizz : Questions reset!");

    // On réactive toutes les questions et on en reprend une au pif
    Lyrics.update({}, { $set: { enabled: true } }, { multi: true });
    res = Lyrics.aggregate(pipeline);
    if (res.length > 0) {
      q = res[0];
      Lyrics.update(q._id, { $set: { enabled: false } });
    }
  }

  console.error('Selected song', q.title);
  return q;
}


Meteor.methods({
  'addSong': function (title, author, text, topics) {
    assertMethodAccess('addSong', this.userId, 'admin');
    addSong(title, author, text, topics);
  },
  'removeSong': function (id) {
    if (id === undefined) return;
    assertMethodAccess('removeSong', this.userId, 'admin');
    // TODO: Uniquement admin?
    Lyrics.remove(id);
  },
  'updateSong': function (id, s) {
    console.error('updateSong', id, s);
    assertMethodAccess('updateSong', this.userId, 'admin');
    Lyrics.update(id, { $set: s });
  },
  /* 'getNumQuestions': function () {
     assertMethodAccess('getNumQuestions', this.userId);
     return numSongs;
   },*/
  'startLyricsQuizz': function (chan) {
    assertMethodAccess('addSong', this.userId, 'admin');
    startLyricsQuizz(chan);
  },
  'stopLyricsQuizz': function (chan) {
    assertMethodAccess('addSong', this.userId, 'admin');
    stopLyricsQuizz(chan);
  }
});





export function parseLyrics(song) {
  if (song?.text) {

    let globindex = 0;
    let index = {};
    let wl = song.text.split('\n');
    let ftext = [];
    let numlines = wl.length;

    //console.error(ws);
    wl.forEach((line, nl) => {
      let ws = line.split(' ');
      ws.forEach((w, i) => {

        // removing unnecessary characters
        let w1 = w.replace(/[,.()]/g, ' ');
        // w1 not empty?
        w1 = w1.trim().toLowerCase();
        // replaces characters in w1 by '*'
        let w2 = w1.replace(/\w/g, '*');
        let obj = {
          index: globindex,
          original: w,
          displayed: w2
        };
        if (!index[w1]) {
          index[w1] = {
            ref: [obj]
          };
        }
        else {
          index[w1].ref.push(obj);
        }
        //console.error(nl, i, globindex, w, w1, w2);
        ftext.push(obj);
        globindex += 1;
      });

      let obj = {
        index: globindex,
        original: '<br>',
        displayed: '<br>'
      };
      ftext.push(obj);
      globindex += 1;


    });

    let obj = {
      songid: song._id,
      numlines: numlines,
      words: ftext,
      index: index,
      title: song.title,
      author: song.author,
    };
    console.error('obj :===>', obj);
    return obj;
  }

}