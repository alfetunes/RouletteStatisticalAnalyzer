// Spec §87-§90: known-random and synthetic-bias benchmarks. This checks both
// halves of the same concern: sensitivity (can the analyzer detect a real,
// deliberately injected deviation?) and false-positive control (does it
// leave clean random data alone?). The biased generator below is TEST-ONLY —
// it is never imported by application code, and js/random.js (the app's
// single production RNG, spec §7) is completely untouched by this file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateRandomSequence } from '../js/random.js';
import { getPockets } from '../js/roulette.js';
import { calculateNumberFrequency, calculateChiSquare, calculateZScore } from '../js/statistics.js';
import { analyzePatterns, CLASSIFICATIONS } from '../js/pattern-analyzer.js';
import { getSingleNumberProbability } from '../js/probability.js';

/**
 * TEST-ONLY synthetic generator: draws from the real RNG, then re-labels a
 * `biasRate` fraction of draws as `biasedPocket` regardless of what was
 * drawn. This is an independent injection mechanism (not a weighted die
 * built into random.js), so it cannot leak into production behavior.
 */
function generateBiasedSequence(rouletteType, count, biasedPocket, biasRate) {
    const base = generateRandomSequence(rouletteType, count);
    const rng = generateRandomSequence(rouletteType, count); // independent draw stream used only as a coin-flip source
    return base.map((value, i) => {
        const pocketIndex = getPockets(rouletteType).indexOf(rng[i]);
        const threshold = biasRate * getPockets(rouletteType).length;
        return pocketIndex < threshold ? biasedPocket : value;
    });
}

test('known-random benchmark: unbiased samples do not systematically get flagged as biased (spec §87)', () => {
    // Run several independent unbiased samples; on average, the single most
    // extreme per-number z-score across 37 numbers should look like ordinary
    // multiple-testing noise, not a runaway value.
    const trials = 20;
    let flaggedAsPotentiallyUnusualCount = 0;
    for (let t = 0; t < trials; t++) {
        const results = generateRandomSequence('european', 2000);
        const findings = analyzePatterns(results, 'european');
        if (findings.numberDeviations.some((d) => d.classification === CLASSIFICATIONS.POTENTIALLY_UNUSUAL)) {
            flaggedAsPotentiallyUnusualCount += 1;
        }
    }
    // With 37 independent-ish tests per trial, P(no |z|>=3 at all) is high
    // but not guaranteed; across 20 trials we should NOT see it firing on
    // most of them (that would mean the classifier is miscalibrated/broken).
    assert.ok(
        flaggedAsPotentiallyUnusualCount < trials * 0.5,
        `unbiased data triggered "Potentially unusual" on ${flaggedAsPotentiallyUnusualCount}/${trials} trials — classifier looks miscalibrated`
    );
});

test('synthetic bias benchmark: a large artificial bias on number 17 is detected by frequency + chi-square + pattern analyzer (spec §88)', () => {
    const rouletteType = 'european';
    const spins = 3000;
    const results = generateBiasedSequence(rouletteType, spins, '17', 0.15); // +15% of draws forced to 17

    const freq = calculateNumberFrequency(results, rouletteType);
    const seventeen = freq.find((f) => f.result === '17');
    assert.ok(seventeen.observedPct > seventeen.expectedPct * 2, 'number 17 should be far above its expected frequency');

    const p = getSingleNumberProbability(rouletteType);
    const observedCounts = freq.map((f) => f.occurrences);
    const expectedFractions = freq.map(() => p);
    const { chiSquare, insufficientSample } = calculateChiSquare(observedCounts, expectedFractions, 5);
    assert.equal(insufficientSample, false);
    assert.ok(chiSquare > 100, `chi-square (${chiSquare}) should be large for a 15%-biased number over ${spins} spins`);

    const findings = analyzePatterns(results, rouletteType);
    const seventeenDeviation = findings.numberDeviations.find((d) => d.result === '17');
    assert.equal(seventeenDeviation.classification, CLASSIFICATIONS.POTENTIALLY_UNUSUAL);
});

test('sensitivity: detector strength increases monotonically-ish with bias magnitude, without hard-coded p-values (spec §89)', () => {
    const rouletteType = 'european';
    const spins = 4000;
    const p = getSingleNumberProbability(rouletteType);
    const biasLevels = [0, 0.01, 0.03, 0.08]; // none, very small, small, moderate/large
    const zScores = biasLevels.map((rate) => {
        const results = rate === 0
            ? generateRandomSequence(rouletteType, spins)
            : generateBiasedSequence(rouletteType, spins, '17', rate);
        const freq = calculateNumberFrequency(results, rouletteType);
        const seventeen = freq.find((f) => f.result === '17');
        return Math.abs(calculateZScore(seventeen.occurrences, spins, p) ?? 0);
    });

    // Zero bias should look ordinary; the largest engineered bias must
    // clearly dominate it. We don't assert strict monotonicity at every
    // step (very-small bias can be statistically indistinguishable from
    // noise, which is itself the point of spec §90 — small biases require
    // larger samples), only that detection strength trends upward overall
    // and the largest bias is unambiguously detected.
    assert.ok(zScores[3] > zScores[0], 'largest bias should produce a bigger |z| than no bias');
    assert.ok(zScores[3] > 3, `largest engineered bias should be clearly detectable (|z|=${zScores[3]})`);
});

test('the analyzer never claims physical proof of bias — only descriptive/statistical language (spec §88 sensitivity+false-positive-control pairing)', () => {
    // Cross-check against pattern-analyzer.js's own narrative text, which is
    // exercised via buildPatternNarratives elsewhere; here we just confirm
    // the classification vocabulary itself contains no proof/certainty claims.
    const classificationLabels = Object.values(CLASSIFICATIONS);
    for (const label of classificationLabels) {
        assert.doesNotMatch(label.toLowerCase(), /proof|guarantee|certain|will happen|predict/);
    }
});
