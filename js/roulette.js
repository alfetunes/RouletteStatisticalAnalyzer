// Pure roulette domain mapping: pockets, colors, parity, range, dozen, column.
// No DOM access here — see js/roulette-animation.js and js/app.js for UI wiring.

export const ROULETTE_TYPES = Object.freeze({
    EUROPEAN: 'european',
    AMERICAN: 'american',
});

const RED_NUMBERS = new Set([
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

const COLUMN_1 = new Set([1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]);
const COLUMN_2 = new Set([2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35]);
const COLUMN_3 = new Set([3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]);

/**
 * Returns the ordered list of pocket labels for a roulette type.
 * European: ['0','1',...,'36'] (37 pockets)
 * American: ['0','00','1',...,'36'] (38 pockets)
 */
export function getPockets(rouletteType) {
    const numbers = Array.from({ length: 36 }, (_, i) => String(i + 1));
    if (rouletteType === ROULETTE_TYPES.AMERICAN) {
        return ['0', '00', ...numbers];
    }
    return ['0', ...numbers];
}

export function getPocketCount(rouletteType) {
    return rouletteType === ROULETTE_TYPES.AMERICAN ? 38 : 37;
}

function isZeroPocket(result) {
    return result === '0' || result === '00';
}

/** @returns {'red'|'black'|'green'} */
export function getColor(result) {
    if (isZeroPocket(result)) return 'green';
    const n = Number(result);
    return RED_NUMBERS.has(n) ? 'red' : 'black';
}

/** @returns {'even'|'odd'|null} null for 0/00 */
export function getParity(result) {
    if (isZeroPocket(result)) return null;
    const n = Number(result);
    return n % 2 === 0 ? 'even' : 'odd';
}

/** @returns {'low'|'high'|null} 1-18 / 19-36, null for 0/00 */
export function getRange(result) {
    if (isZeroPocket(result)) return null;
    const n = Number(result);
    return n <= 18 ? 'low' : 'high';
}

/** @returns {1|2|3|null} */
export function getDozen(result) {
    if (isZeroPocket(result)) return null;
    const n = Number(result);
    if (n <= 12) return 1;
    if (n <= 24) return 2;
    return 3;
}

/** @returns {1|2|3|null} */
export function getColumn(result) {
    if (isZeroPocket(result)) return null;
    const n = Number(result);
    if (COLUMN_1.has(n)) return 1;
    if (COLUMN_2.has(n)) return 2;
    if (COLUMN_3.has(n)) return 3;
    return null;
}

/** Builds the full derived-attribute record for a raw pocket result. */
export function describeResult(result) {
    return {
        result,
        color: getColor(result),
        parity: getParity(result),
        range: getRange(result),
        dozen: getDozen(result),
        column: getColumn(result),
    };
}

export function isValidResult(result, rouletteType) {
    return getPockets(rouletteType).includes(String(result));
}
