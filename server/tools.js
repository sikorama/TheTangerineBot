
/**
 *   Randomly Returns an item from an array
 * @param {array} a
 */
export function randElement(a) {
  try {
    let n = a.length;
//    return a[Math.floor(Math.random() * (n))];
    return a[~~(Math.random() * (n))];
  }
  catch (e) { console.error(a, e.stack); }
  return '...';
}
