
import { Session } from 'meteor/session';
import { BotChannels } from '../api/collections.js';
import { tr_commands } from '../api/languages.js';
import './CommandsTable.html';

Template.CommandsTable.helpers({
    team() {
      let sc = Session.get('sel_channel');
      if (!sc) return false;
      let bc = BotChannels.findOne({ channel: sc });
      if (!bc) return false;
      return bc.team;
    },
    lang() {
      let ocmd = tr_commands();
      console.error(ocmd);    
      let res = Object.keys(ocmd).sort().map((c)=> {
        return { name: c , code: ocmd[c].map((l)=>'!'+l) };
      });
      console.error(res);
      // Into 2 columns?
      let rows=[];
      const numcol = 2;
      for (let i=0; i<res.length ; i+=numcol) {
        let row=[];
        for (let j=0; j<numcol; j++) {
            row.push(res[i+j]);
        }
        rows.push(row);
      }  
      return rows;
    }
  });