// Spec §37/§38/§39/§82: independent mathematical validation.
//
// These tests deliberately do NOT import the algorithm under test and
// re-run it — they re-derive each formula from a trusted mathematical
// reference (regularized incomplete gamma function for the chi-square
// p-value; the closed-form Wilson score interval definition; the raw
// probability/EV formulas) using separate code, then compare against the
// application's output on fixed, deterministic inputs. No Python/scipy was
// available in this environment (see docs/QA_REPORT.md), so the "independent"
// leg is a from-scratch second implementation in plain JS rather than a
// second language/library — this still satisfies "do not copy the same
// algorithm into two locations and call that independent validation"
// because the numerical method (continued-fraction incomplete gamma) is
// unrelated to anything in js/statistics.js, which does not compute
// p-values at all.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateChiSquare, calculateConfidenceInterval } from '../js/statistics.js';
import {
    getSingleNumberProbability,
    getRedOrBlackProbability,
    getGreenProbability,
    getDozenOrColumnProbability,
    getBetProbability,
    calculateExpectedValue,
    getHouseEdge,
    BET_TYPES,
} from '../js/probability.js';

// --- Independent regularized incomplete gamma function (Numerical Recipes
// style series/continued-fraction), used only here to compute a chi-square
// p-value from scratch, never imported by the application. ---
function logGamma(x) {
    const cof = [
        676.5203681218851, -1259.1392167224028, 771.32342877765313,
        -176.61502916214059, 12.507343278686905, -0.13857109526572012,
        9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    if (x < 0.5) {
        return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
    }
    x -= 1;
    let a = 0.99999999999980993;
    const t = x + 7.5;
    for (let i = 0; i < cof.length; i++) a += cof[i] / (x + i + 1);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function lowerIncompleteGammaSeries(a, x) {
    let sum = 1 / a;
    let term = sum;
    for (let n = 1; n < 500; n++) {
        term *= x / (a + n);
        sum += term;
        if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
}

function upperIncompleteGammaContinuedFraction(a, x) {
    let b = x + 1 - a;
    let c = 1e300;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i < 500; i++) {
        const an = -i * (i - a);
        b += 2;
        d = an * d + b;
        if (Math.abs(d) < 1e-300) d = 1e-300;
        c = b + an / c;
        if (Math.abs(c) < 1e-300) c = 1e-300;
        d = 1 / d;
        const delta = d * c;
        h *= delta;
        if (Math.abs(delta - 1) < 1e-15) break;
    }
    return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

/** Upper-tail p-value of the chi-square distribution: P(X >= chiSquare). */
function chiSquarePValue(chiSquare, degreesOfFreedom) {
    const a = degreesOfFreedom / 2;
    const x = chiSquare / 2;
    if (x <= 0) return 1;
    if (x < a + 1) return 1 - lowerIncompleteGammaSeries(a, x);
    return upperIncompleteGammaContinuedFraction(a, x);
}

test('independent chi-square implementation matches a known textbook example', () => {
    // Classic textbook example: observed [10,10,10,10,10,10] vs uniform die
    // (perfectly uniform) -> chiSquare = 0, p = 1.
    const observed = [10, 10, 10, 10, 10, 10];
    const expectedFractions = observed.map(() => 1 / 6);
    const { chiSquare, degreesOfFreedom } = calculateChiSquare(observed, expectedFractions, 1);
    assert.equal(chiSquare, 0);
    assert.equal(degreesOfFreedom, 5);
    assert.equal(chiSquarePValue(chiSquare, degreesOfFreedom), 1);
});

test('independent chi-square p-value cross-check against the application chi-square statistic', () => {
    // A deliberately skewed die: 60 rolls, one face way over-represented.
    const observed = [20, 8, 8, 8, 8, 8]; // total 60, expected 10 each
    const expectedFractions = observed.map(() => 1 / 6);
    const { chiSquare, degreesOfFreedom, insufficientSample } = calculateChiSquare(observed, expectedFractions, 5);
    assert.equal(insufficientSample, false);

    // Hand-computed chi-square for this exact table: (20-10)^2/10 + 5*(8-10)^2/10
    // = 10 + 5*0.4 = 12
    assert.ok(Math.abs(chiSquare - 12) < 1e-9, `expected chiSquare=12, got ${chiSquare}`);

    const p = chiSquarePValue(chiSquare, degreesOfFreedom);
    // Reference value for chi2(12, df=5): standard chi-square tables place
    // the 0.05/0.025 critical values at 11.070/12.833 for df=5, bracketing
    // this result; the exact regularized-gamma value is ~0.0348.
    assert.ok(Math.abs(p - 0.0348) < 0.001, `expected p~=0.0348, got ${p}`);
    assert.ok(p < 0.05, 'this deliberately skewed distribution should read as statistically significant at alpha=0.05');
});

test('independent chi-square p-value on a realistic roulette-shaped table finds no significance in a fair sample', () => {
    // 37 European pockets, 3700 spins, perfectly uniform (100 each) -> chiSquare 0.
    const observed = new Array(37).fill(100);
    const expectedFractions = new Array(37).fill(1 / 37);
    const { chiSquare, degreesOfFreedom } = calculateChiSquare(observed, expectedFractions, 5);
    assert.equal(chiSquare, 0);
    assert.equal(chiSquarePValue(chiSquare, degreesOfFreedom), 1);
});

test('independent Wilson confidence interval re-derivation matches statistics.js within floating-point tolerance', () => {
    // Independently written closed-form Wilson score interval (not a copy of
    // js/statistics.js's implementation — different variable structure).
    function independentWilson(k, n, z) {
        const phat = k / n;
        const denom = 1 + (z * z) / n;
        const centre = phat + (z * z) / (2 * n);
        const half = z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n);
        return { lower: (centre - half) / denom, upper: (centre + half) / denom };
    }

    const cases = [
        { k: 500, n: 1000 },
        { k: 100, n: 1000 },
        { k: 900, n: 1000 },
        { k: 1, n: 37 },
    ];
    for (const { k, n } of cases) {
        const app = calculateConfidenceInterval(k, n, 0.95);
        const ref = independentWilson(k, n, 1.96);
        assert.ok(Math.abs(app.lower - ref.lower) < 1e-9, `lower mismatch for k=${k},n=${n}`);
        assert.ok(Math.abs(app.upper - ref.upper) < 1e-9, `upper mismatch for k=${k},n=${n}`);
    }
});

test('confidence interval never escapes [0, 1] at the boundaries (spec §39)', () => {
    const zero = calculateConfidenceInterval(0, 100);
    assert.ok(zero.lower >= 0 && zero.lower <= 1);
    assert.ok(zero.upper >= 0 && zero.upper <= 1);

    const all = calculateConfidenceInterval(100, 100);
    assert.ok(all.lower >= 0 && all.lower <= 1);
    assert.ok(all.upper >= 0 && all.upper <= 1);
});

test('independent probability formulas match the application for both wheel types (spec §12/§13)', () => {
    for (const [type, pocketCount, greenCount] of [['european', 37, 1], ['american', 38, 2]]) {
        assert.ok(Math.abs(getSingleNumberProbability(type) - 1 / pocketCount) < 1e-12);
        assert.ok(Math.abs(getRedOrBlackProbability(type) - 18 / pocketCount) < 1e-12);
        assert.ok(Math.abs(getGreenProbability(type) - greenCount / pocketCount) < 1e-12);
        assert.ok(Math.abs(getDozenOrColumnProbability(type) - 12 / pocketCount) < 1e-12);

        // Probability sum tests (spec §13): red + black + green = 1, and all
        // 37/38 single-pocket probabilities sum to 1.
        const sumColors = getRedOrBlackProbability(type) * 2 + getGreenProbability(type);
        assert.ok(Math.abs(sumColors - 1) < 1e-12);
        const sumPockets = getSingleNumberProbability(type) * pocketCount;
        assert.ok(Math.abs(sumPockets - 1) < 1e-12);
    }
});

test('independent EV/house-edge re-derivation matches probability.js for every bet type (spec §49/§50/§82)', () => {
    for (const type of ['european', 'american']) {
        const pocketCount = type === 'american' ? 38 : 37;
        for (const betType of Object.values(BET_TYPES)) {
            const p = getBetProbability(betType, type);
            const payout = { [BET_TYPES.STRAIGHT]: 35 }[betType]
                ?? (Object.values(BET_TYPES).slice(1, 7).includes(betType) ? 1 : 2);
            // Independently re-derive EV = p*payout - (1-p), from the raw
            // probability fraction rather than calling calculateExpectedValue.
            const independentEv = p * payout - (1 - p);
            const appEv = calculateExpectedValue(betType, type);
            assert.ok(Math.abs(independentEv - appEv) < 1e-12, `${betType}/${type} EV mismatch`);
        }
        // House edge: independently, for a 1:1 bet, houseEdge = (1 - 2p) where
        // p = P(red). For European p=18/37 -> edge = 1/37 ~= 2.70%.
        const p = 18 / pocketCount;
        const independentEdge = 1 - 2 * p;
        assert.ok(Math.abs(getHouseEdge(type) - independentEdge) < 1e-12);
    }
    const europeanEdge = getHouseEdge('european') * 100;
    const americanEdge = getHouseEdge('american') * 100;
    assert.ok(Math.abs(europeanEdge - 2.7027) < 0.01, `European house edge ${europeanEdge} should be ~2.70%`);
    assert.ok(Math.abs(americanEdge - 5.2632) < 0.01, `American house edge ${americanEdge} should be ~5.26%`);
});
