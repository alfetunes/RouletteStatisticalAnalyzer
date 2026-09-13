import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    getPockets,
    getPocketCount,
    getColor,
    getParity,
    getRange,
    getDozen,
    getColumn,
    isValidResult,
} from '../js/roulette.js';

test('European roulette has exactly 37 pockets: 0-36', () => {
    const pockets = getPockets('european');
    assert.equal(pockets.length, 37);
    assert.equal(getPocketCount('european'), 37);
    assert.equal(pockets[0], '0');
    assert.ok(pockets.includes('36'));
    assert.ok(!pockets.includes('00'));
});

test('American roulette has exactly 38 pockets: 0, 00, 1-36', () => {
    const pockets = getPockets('american');
    assert.equal(pockets.length, 38);
    assert.equal(getPocketCount('american'), 38);
    assert.ok(pockets.includes('0'));
    assert.ok(pockets.includes('00'));
    assert.ok(pockets.includes('36'));
});

test('isValidResult rejects 00 for European and accepts it for American', () => {
    assert.equal(isValidResult('00', 'european'), false);
    assert.equal(isValidResult('00', 'american'), true);
    assert.equal(isValidResult('37', 'european'), false);
    assert.equal(isValidResult('17', 'european'), true);
});

test('color mapping: zero pockets are green, known reds/blacks are correct', () => {
    assert.equal(getColor('0'), 'green');
    assert.equal(getColor('00'), 'green');
    assert.equal(getColor('1'), 'red');
    assert.equal(getColor('2'), 'black');
    assert.equal(getColor('17'), 'black');
    assert.equal(getColor('32'), 'red');
});

test('every non-zero number is either red or black, never both', () => {
    for (let n = 1; n <= 36; n++) {
        const color = getColor(String(n));
        assert.ok(color === 'red' || color === 'black');
    }
});

test('parity mapping excludes zero/00', () => {
    assert.equal(getParity('0'), null);
    assert.equal(getParity('00'), null);
    assert.equal(getParity('2'), 'even');
    assert.equal(getParity('3'), 'odd');
});

test('range mapping: 1-18 low, 19-36 high, zero excluded', () => {
    assert.equal(getRange('0'), null);
    assert.equal(getRange('00'), null);
    assert.equal(getRange('1'), 'low');
    assert.equal(getRange('18'), 'low');
    assert.equal(getRange('19'), 'high');
    assert.equal(getRange('36'), 'high');
});

test('dozen mapping covers 1-12/13-24/25-36 and excludes zero', () => {
    assert.equal(getDozen('0'), null);
    assert.equal(getDozen('1'), 1);
    assert.equal(getDozen('12'), 1);
    assert.equal(getDozen('13'), 2);
    assert.equal(getDozen('24'), 2);
    assert.equal(getDozen('25'), 3);
    assert.equal(getDozen('36'), 3);
});

test('column mapping assigns every non-zero number to exactly one column', () => {
    assert.equal(getColumn('0'), null);
    for (let n = 1; n <= 36; n++) {
        const col = getColumn(String(n));
        assert.ok([1, 2, 3].includes(col), `number ${n} should have a column`);
    }
    assert.equal(getColumn('1'), 1);
    assert.equal(getColumn('2'), 2);
    assert.equal(getColumn('3'), 3);
    assert.equal(getColumn('36'), 3);
});
