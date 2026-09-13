import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    calculateMean,
    calculateMedian,
    calculateMode,
    calculateNumberFrequency,
    calculateSequences,
    calculateChiSquare,
} from '../js/statistics.js';
import { getColor } from '../js/roulette.js';

test('calculateMean excludes "00" from arithmetic and reports the exclusion count', () => {
    const { mean, count, excluded } = calculateMean(['1', '2', '3', '00']);
    assert.equal(mean, 2);
    assert.equal(count, 3);
    assert.equal(excluded, 1);
});

test('calculateMedian handles even/odd counts correctly', () => {
    assert.equal(calculateMedian(['1', '2', '3']).median, 2);
    assert.equal(calculateMedian(['1', '2', '3', '4']).median, 2.5);
});

test('calculateMode returns all tied modes', () => {
    const { modes, count } = calculateMode(['5', '5', '7', '7', '9']);
    assert.equal(count, 2);
    assert.deepEqual(new Set(modes), new Set(['5', '7']));
});

test('calculateNumberFrequency reports occurrences and percentages that sum sensibly', () => {
    const results = ['0', '0', '1', '2'];
    const freq = calculateNumberFrequency(results, 'european');
    const zero = freq.find((f) => f.result === '0');
    assert.equal(zero.occurrences, 2);
    assert.equal(zero.observedPct, 50);
    assert.ok(Math.abs(zero.expectedPct - (100 / 37)) < 1e-9);
});

test('calculateNumberFrequency tracks rounds-since-last-occurrence per pocket', () => {
    const results = ['5', '1', '2', '5'];
    const freq = calculateNumberFrequency(results, 'european');
    const five = freq.find((f) => f.result === '5');
    assert.equal(five.roundsSinceLastOccurrence, 0); // last index is the final round
    const one = freq.find((f) => f.result === '1');
    assert.equal(one.roundsSinceLastOccurrence, 2);
});

test('calculateSequences tracks current and longest streaks per label', () => {
    // red, red, red, black, black -> colors: r,r,r,b,b
    const results = ['1', '3', '5', '2', '4']; // 1,3,5 red; 2,4 black
    const seq = calculateSequences(results, getColor);
    assert.equal(seq.current, 'black');
    assert.equal(seq.currentLength, 2);
    assert.equal(seq.longest.red, 3);
    assert.equal(seq.longest.black, 2);
});

test('calculateChiSquare flags insufficient sample sizes', () => {
    const result = calculateChiSquare([1, 1, 1], [1 / 3, 1 / 3, 1 / 3]);
    assert.equal(result.insufficientSample, true);
    assert.equal(result.chiSquare, null);
});

test('calculateChiSquare computes a value once the sample is large enough', () => {
    const result = calculateChiSquare([40, 40, 40], [1 / 3, 1 / 3, 1 / 3]);
    assert.equal(result.insufficientSample, false);
    assert.equal(result.chiSquare, 0);
});
