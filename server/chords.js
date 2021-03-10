
import {randElement} from './tools.js';

export const noteArray=['A','B','C','D','E','F','G','A#','C#','D#','F#','G#'];
export const chordArray=['', '-', 'sus', 'sus4', '7', '-7', '-9', '6', '13', '11', '5+', '-5b', 'maj7', 'maj9', '-maj7', '69'];

export function genChord(options) {
    let roots = noteArray;
  let chordtype = chordArray;

  if (!options)
    options = {}

  if (!options.num) {
    options.num = 1;
  }

  if (options.chords)
    if (options.chords.length > 0)
      chordtype = options.chords;

  if (options.notes)
    if (options.notes.length > 0)
      roots = options.notes;

  let res = [];

  for (i = 0; i < options.num; i++) {
    let r = randElement(roots);
    if (!options.onlynotes)
      r += randElement(chordtype);
    res.push(r);
  }

  let sres = res[0]
  for (let i = 1; i < res.length; i++) {
    sres+=' / ' + res[i];
  }


  return sres;
}


export function genProgression(options) {
    let opt = {
     num : 1,
     notes: options.notes,
     chords: options.chords,
     onlynotes : true
    };

    let note = genChord(opt);

    options.notes = ['I','II','III','IV','V','VI','VII'];
    options.onlynotes = true;

    let prog = genChord(options);

    res = note+' ( ';
    res+=prog;

    res +=' )';
    return res;
}
