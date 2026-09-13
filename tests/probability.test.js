import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    getSingleNumberProbability,
    getRedOrBlackProbability,
    getGreenProbability,
    getHouseEdge,
    calculateExpectedValue,
    BET_TYPES,
} from '../js/probability.js';

test('European individual pocket probability is 1/37', () => {
    assert.equal(getSingleNumberProbability('european'), 1 / 37);
});

test('American individual pocket probability is 1/38', () => {
    assert.equal(getSingleNumberProbability('american'), 1 / 38);
});

test('European red/black probability is 18/37', () => {
    assert.equal(getRedOrBlackProbability('european'), 18 / 37);
});

test('American red/black probability is 18/38', () => {
    assert.equal(getRedOrBlackProbability('american'), 18 / 38);
});

test('green probability is 1/37 for European and 2/38 for American', () => {
    assert.equal(getGreenProbability('european'), 1 / 37);
    assert.equal(getGreenProbability('american'), 2 / 38);
});

test('house edge is approximately 2.70% for European and 5.26% for American', () => {
    assert.ok(Math.abs(getHouseEdge('european') - 0.027) < 0.001);
    assert.ok(Math.abs(getHouseEdge('american') - 0.0526) < 0.001);
});

test('expected value of an even-money bet matches the house edge (negative)', () => {
    const ev = calculateExpectedValue(BET_TYPES.RED, 'european');
    assert.ok(ev < 0);
    assert.ok(Math.abs(ev + 0.027) < 0.001);
});
