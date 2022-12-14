import { Session } from 'meteor/session';


// Search for html id, recursively
export function getParentId(el) {
  while ((el.id === undefined || el.id === "") && el.parentElement != undefined) {
    el = el.parentElement;
  }
  return el.id;
}

/**
 * Handles Search events, stores the result in a Session variable
 * @param {*} event : change event 
 * @param {*} vname : Session variable's name
 */
export function manageSearchEvents(event, vname,rx) {
  let n = event.target.name;
  let t = event.target.type;
  let sel = Session.get(vname);
  if (!sel) { console.error('No Session var with name ', vname); }
  sel = sel || {};
  let v;
  if (t === 'checkbox') {
    v = event.target.checked;
  }
  else {
    v = event.target.value.trim();
  }

  // regex i texte
  if (rx===true) {
    if (t==='text') {
      if (v.length>0) {
        v = new RegExp('.*' + v + '.*', 'i');
      }
      else
      v = undefined;
    }
  }
  
  sel[n] = v;
  console.error('search', vname, sel);
  Session.set(vname, sel);
}

/**
 * Handles Search events, stores the result in a Session variable
 * @param {*} event : event (click)  
 * @param {*} field : Prefix used for naming session variables 
 *                    (var_sort_field, var_sort_dir)
 */
export function manageSortEvent(event, field) {
  let n = event.currentTarget.getAttribute('name');
  let field_name = field + '_sort_field';
  let field_dir = field + '_sort_dir';
  if (Session.equals(field_name, n)) {
    let d = Session.get(field_dir);
    Session.set(field_dir, -d);
  }
  else {
    Session.set(field_name, n);
    Session.set(field_dir, 1);
  }
}


export function genDataBlob(data, elementId, ext) {
  ext = ext || 'dot';
  let d = document.getElementById(elementId);
  if (!d) {
    console.error('No Element with ID', elementId);
    return;
  }
  let blob = new Blob([data], { type: 'text/dot' });
  let csvUrl = URL.createObjectURL(blob);
  let dte = new Date();
  let cur_month = dte.getMonth() + 1;
  let cur_year = dte.getFullYear();
  if (cur_month < 10) cur_month = "0" + cur_month;
  let cur_day = dte.getDate();
  d.download = 'export' + cur_year + '-' + cur_month + '-' + cur_day + '.' + ext;
  d.href = csvUrl;
  d.innerHTML = 'Download ' + d.download;
}


/**
* Decode color query param. If no param, use default color
* r,g,b   => rgb(r,g,b)
* r,g,b,a => rgba(r,g,b,a)
* otherwise accepts a stadard color name (white,...)  
 * 
 * @param {*} param : name of parameter (textcol...)
 * @param {*} defaultcol (optional)
 * @returns 
 */
export function decodecolor(param, defaultcol) {
  if (!defaultcol) defaultcol= 'rgb(255,255,255)';
    const col = FlowRouter.getQueryParam(param);
    if (!col) return defaultcol;

    const nv = col.split(',').length;
    if (nv===3)
        return "rgb(" + col + ")";
    if (nv===4)
        return "rgba(" + col + ")";
    return col;
}