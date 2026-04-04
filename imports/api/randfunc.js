

/**
 * Pick randomly an element in an array
 * @param {array} a
 */
export function randElement(a) {
    try {
        let n = a.length;
        //same as a[Math.floor(Math.random() * (n))];
        return a[~~(Math.random() * (n))];
    }
    catch (e) {
        console.error(a, e.stack);
    }
}
