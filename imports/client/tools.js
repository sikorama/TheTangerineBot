import { Session } from 'meteor/session';


// Search for html id, recursively
export function getParentId(el) {
    while ((el.id === undefined || el.id === "") && el.parentElement != undefined) {
      el = el.parentElement;
    }
    return el.id;
  }


  export function manageSearchEvents(event, vname) {
    let n = event.target.name;
    let t = event.target.type;
    let sel = Session.get(vname);
    let v;
    if (t === 'checkbox') {
      v = event.target.checked;
    }
    else {
      v = event.target.value.trim();
    }
    sel[n] = v;
    console.error(vname, sel);
    Session.set(vname, sel);
  }
