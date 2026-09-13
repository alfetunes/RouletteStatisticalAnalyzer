// Advanced spec §12/§17/§18/§53: percentile methodology, chi-square
// p-value, standardized residuals, and sequence-probability formulas added
// for Phase 2 (Statistical Test Lab / Wheel Bias Analyzer / Monte Carlo Lab).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    calculatePercentile,
    calculateChiSquarePValue,
    calculateStandardizedResiduals,
    calculateSequenceProbability,
    calculateMeanMedianFromFrequency,
    calculateMean,
    calculateMedian,
} from '../js/statistics.js';

test('calculatePercentile matches known values on a simple deterministic array', () => {
    const values = [10, 20, 30, 40, 50];
    assert.equal(calculatePercentile(values, 0), 10);
    assert.equal(calculatePercentile(values, 100), 50);
    assert.equal(calculatePercentile(values, 50), 30);
    // Linear interpolation (R-7 / Excel PERCENTILE.INC method): rank = 0.25*4 = 1 -> exactly index 1.
    assert.equal(calculatePercentile(values, 25), 20);
    assert.equal(calculatePercentile(values, 75), 40);
});

test('calculatePercentile interpolates between ranks for values not landing exactly on an index', () => {
    const values = [1, 2, 3, 4];
    // rank = 0.5 * 3 = 1.5 -> interpolate between index 1 (2) and index 2 (3) -> 2.5
    assert.equal(calculatePercentile(values, 50), 2.5);
});

test('calculatePercentile returns null for an empty array and is order-independent', () => {
    assert.equal(calculatePercentile([], 50), null);
    assert.equal(calculatePercentile([5, 1, 3, 2, 4], 50), calculatePercentile([1, 2, 3, 4, 5], 50));
});

test('calculateChiSquarePValue matches known reference values', () => {
    assert.equal(calculateChiSquarePValue(0, 5), 1);
    assert.equal(calculateChiSquarePValue(null, 5), null);
    // Same worked example as tests/independent-validation.test.js: chi2=12, df=5 -> p~=0.0348.
    const p = calculateChiSquarePValue(12, 5);
    assert.ok(Math.abs(p - 0.0348) < 0.001, `expected ~0.0348, got ${p}`);
});

test('calculateChiSquarePValue is a valid probability for a range of inputs', () => {
    for (const [chi, df] of [[0.5, 1], [5, 3], [50, 10], [200, 37]]) {
        const p = calculateChiSquarePValue(chi, df);
        assert.ok(p >= 0 && p <= 1, `p=${p} out of [0,1] for chi=${chi}, df=${df}`);
    }
});

test('calculateStandardizedResiduals is near zero for a perfectly uniform table and large for a skewed one', () => {
    const uniform = calculateStandardizedResiduals([100, 100, 100, 100], [0.25, 0.25, 0.25, 0.25]);
    for (const r of uniform) assert.equal(r, 0);

    const skewed = calculateStandardizedResiduals([300, 100, 100, 100], [0.25, 0.25, 0.25, 0.25]);
    assert.ok(skewed[0] > 5, `expected a large positive residual for the over-represented category, got ${skewed[0]}`);
    assert.ok(skewed[1] < 0, 'under-represented categories should have negative residuals');
});

test('calculateSequenceProbability matches the spec §12 worked example: P(5 reds in a row) European = (18/37)^5', () => {
    const p = calculateSequenceProbability(18 / 37, 5);
    const expected = (18 / 37) ** 5;
    assert.ok(Math.abs(p - expected) < 1e-15);
    assert.ok(Math.abs(p - 0.02746) < 0.001, `expected ~2.746%, got ${(p * 100).toFixed(3)}%`);
});

function frequencyEntriesFor(results) {
    const counts = new Map();
    for (const r of results) counts.set(Number(r), (counts.get(Number(r)) || 0) + 1);
    return [...counts.entries()].map(([value, count]) => ({ value, count }));
}

test('calculateMeanMedianFromFrequency exactly matches the direct array-based mean/median (spec §39 streaming aggregation)', () => {
    const odd = ['1', '2', '3', '4', '5', '5', '7', '7', '7'];
    assert.equal(calculateMeanMedianFromFrequency(frequencyEntriesFor(odd)).mean, calculateMean(odd).mean);
    assert.equal(calculateMeanMedianFromFrequency(frequencyEntriesFor(odd)).median, calculateMedian(odd).median);

    const even = ['1', '2', '3', '4'];
    assert.equal(calculateMeanMedianFromFrequency(frequencyEntriesFor(even)).mean, calculateMean(even).mean);
    assert.equal(calculateMeanMedianFromFrequency(frequencyEntriesFor(even)).median, calculateMedian(even).median);
});

test('calculateMeanMedianFromFrequency handles an empty frequency table', () => {
    const result = calculateMeanMedianFromFrequency([]);
    assert.equal(result.mean, null);
    assert.equal(result.median, null);
    assert.equal(result.count, 0);
});
