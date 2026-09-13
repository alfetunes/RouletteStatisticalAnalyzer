// Advanced spec §15-§19/§44: Wheel Bias Analyzer. Verifies it (a) does not
// cry wolf on known-random data, (b) correctly flags an injected bias, and
// (c) never emits "the wheel is biased" language.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateRandomSequence } from '../js/random.js';
import { getPockets } from '../js/roulette.js';
import { analyzeWheelBias } from '../js/bias-analyzer.js';

test('Wheel Bias Analyzer does not flag a large, genuinely random European sample as significant most of the time', () => {
    let significantCount = 0;
    const trials = 15;
    for (let i = 0; i < trials; i++) {
        const results = generateRandomSequence('european', 3000);
        const report = analyzeWheelBias(results, 'european');
        if (report.numberChiSquare.pValue !== null && report.numberChiSquare.pValue < 0.01) significantCount += 1;
    }
    assert.ok(significantCount < trials * 0.5, `unbiased data triggered p<0.01 on ${significantCount}/${trials} trials`);
});

test('Wheel Bias Analyzer detects a deliberately biased sample via chi-square and p-value', () => {
    const rouletteType = 'european';
    const pockets = getPockets(rouletteType);
    const base = generateRandomSequence(rouletteType, 3000);
    const coinFlip = generateRandomSequence(rouletteType, 3000);
    const biased = base.map((v, i) => (pockets.indexOf(coinFlip[i]) < pockets.length * 0.15 ? '17' : v));

    const report = analyzeWheelBias(biased, rouletteType);
    assert.equal(report.numberChiSquare.insufficientSample, false);
    assert.ok(report.numberChiSquare.chiSquare > 100);
    assert.ok(report.numberChiSquare.pValue < 0.001);
    assert.equal(report.numberChiSquare.evidenceLevel, 'Strong statistical deviation');
});

test('Wheel Bias Analyzer report never claims the wheel is biased, only states evidence level', () => {
    const results = generateRandomSequence('european', 1000);
    const report = analyzeWheelBias(results, 'european');
    const allText = JSON.stringify(report).toLowerCase();
    assert.doesNotMatch(allText, /the wheel is biased/);
    assert.doesNotMatch(allText, /is definitely biased/);
    assert.match(report.numberChiSquare.biasInterpretation ?? report.numberChiSquare.pValueInterpretation, /sample|too small/i);
});

test('Wheel Bias Analyzer flags insufficient sample size instead of a misleading chi-square on tiny samples', () => {
    const results = generateRandomSequence('european', 10);
    const report = analyzeWheelBias(results, 'european');
    assert.equal(report.numberChiSquare.insufficientSample, true);
    assert.equal(report.numberChiSquare.chiSquare, null);
    assert.equal(report.numberChiSquare.pValue, null);
});

test('Wheel Bias Analyzer color counts and confidence intervals sum correctly and stay within [0,1]', () => {
    const results = generateRandomSequence('american', 2000);
    const report = analyzeWheelBias(results, 'american');
    assert.equal(report.colorCounts.red + report.colorCounts.black + report.colorCounts.green, 2000);
    for (const key of ['red', 'black']) {
        const ci = report.confidenceIntervals[key];
        assert.ok(ci.lower >= 0 && ci.lower <= 1);
        assert.ok(ci.upper >= 0 && ci.upper <= 1);
        assert.ok(ci.lower <= ci.observed && ci.observed <= ci.upper);
    }
});

test('Wheel Bias Analyzer works for both wheel types with correct pocket counts (spec §37 American validation)', () => {
    for (const rouletteType of ['european', 'american']) {
        const results = generateRandomSequence(rouletteType, 5000);
        const report = analyzeWheelBias(results, rouletteType);
        assert.equal(report.numberResiduals.length, getPockets(rouletteType).length);
    }
});
