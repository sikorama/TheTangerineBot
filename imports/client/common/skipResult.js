import { Session } from 'meteor/session';
import './skipResult.html';

Template.SkipResult.helpers({
    pages() {
      try {
  
      let d = Template.currentData();
      
      let t = d.t;
      if (!d.t) {
        t = Session.get(d.var+'_count');
      }
  
      //t = 0;
      let npp = parseInt(Session.get(d.var + "_limit"));
      if (isNaN(npp)) {
        console.error(d.var + "_limit = ", npp );
        return;
      }
      let nbp = Math.ceil(parseInt(t) / npp);
      Session.set(d.var + '_numpages', nbp);
  
      let p = Session.get(d.var + '_page');
      //console.info('page', d.var, p,nbp,npp,t);
      // Si la page courante est supérieure au nombre de pages 
      // On retourne a la page 0
      if (p>nbp || p<1)  {
        //console.error('Reinit current page');
        Session.set(d.var + '_page',1);
      }
  
      if (nbp <= 1) return;
      const nbmax=17; // impair
  
      if (nbp<nbmax)
        return _.range(1, nbp + 1);
      // il y a bcp de pags, on affiche les nbmax, centrées autour de la page courante
      let nb0 = Session.get(d.var + '_page');
      nb0-=Math.floor(nbmax/2);
      if (nb0<1) nb0=1;
      let nb1 = nb0+nbmax;
      if (nb1>nbp+1)
      {
        nb1= nbp+1;
        nb0 = nbp+1-nbmax;
      }
      
      // TODO: on pourrait ajouter la 1ere et derniere page avec des ... pour indiquer qu'il y a plus
      let res = _.range(nb0, nb1);
      //if (nb0>2) res.unshift('...');
      //if (nb0>1) res.unshift(1);
      //if (nb1<nbp-1) res.push(nbp-1);
      return res;
    }
    catch(e) {
      console.error(e);    
    }
    },
    classIsSelected(i) {
      let d = Template.currentData();
      if (Session.equals(d.var + '_page', i)) {
        return "active";
      }
      return '';
    },
    first() { 
      let d = Template.currentData();
      return (Session.equals(d.var + '_page', 1)); },
    last() {
      let d = Template.currentData();
      let nbp = Session.get(d.var + '_numpages');
      return (Session.equals(d.var + '_page', nbp));
    },
  });
  
  Template.SkipResult.events({
    'click .prevpage': function (event) {
      let d = Template.currentData();
      let sv = d.var + '_page';
      let v = parseInt(Session.get(sv)) - 1;
      Session.set(sv, v);
    },
    'click .nextpage': function (event) {
      let d = Template.currentData();
      let sv = d.var + '_page';
      let v = parseInt(Session.get(sv)) + 1;
      Session.set(sv, v);
    },
    'click .setpage': function (event) {
      let d = Template.currentData();
      let sv = d.var + '_page';
      let v = parseInt(event.currentTarget.textContent);
      Session.set(sv, v);
    }
  });
  
  