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


  export function manageSortEvent(event, field) {
    let n = event.currentTarget.getAttribute('name');
    field_name = field + '_sort_field';
    field_dir = field + '_sort_dir';
    if (Session.equals(field_name, n)) {
      let d = Session.get(field_dir);
      Session.set(field_dir, -d);
    }
    else {
      Session.set(field_name, n);
      Session.set(field_dir, 1);
    }
  };
  

  export function genDataBlob(data, elementId,ext) {  
    ext = ext || 'dot';
    let d = document.getElementById(elementId);
      if (!d) {
          console.error('No Element with ID', elementId);
          return;
      }
      let blob = new Blob([data], { type: 'text/dot' });
      let csvUrl = URL.createObjectURL(blob);
      let dte = new Date()
      let cur_month = dte.getMonth() + 1;
      let cur_year = dte.getFullYear();
      if (cur_month < 10) cur_month = "0" + cur_month;
      let cur_day = dte.getDay();
      d.download = 'export' + cur_year + '-' + cur_month + '-' + cur_day + '.' + ext;
      d.href = csvUrl;
      d.innerHTML = 'Download ' + d.download;
  }
  
