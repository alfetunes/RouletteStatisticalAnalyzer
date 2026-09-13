// Spec §5/§6/§56/§58: large-scale RNG validity and distribution-sum checks.
// Runs real crypto.getRandomValues()-backed generation (not a mock), at
// sizes large enough to be a meaningful smoke test of the RNG's validity
// and coverage, without making `npm test` slow.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateRandomSequence } from '../js/random.js';
import { getPockets, getColor, getParity, getDozen, getColumn } from '../js/roulette.js';

function checkValidityAndCoverage(rouletteType, count) {
    const results = generateRandomSequence(rouletteType, count);
    assert.equal(results.length, count);

    const validPockets = new Set(getPockets(rouletteType));
    const counts = new Map([...validPockets].map((p) => [p, 0]));

    for (const r of results) {
        assert.ok(validPockets.has(r), `unexpected pocket "${r}" for ${rouletteType}`);
        assert.notEqual(r, -1);
        assert.notEqual(r, null);
        assert.notEqual(r, undefined);
        assert.ok(!Number.isNaN(r));
        counts.set(r, counts.get(r) + 1);
    }

    // Forbidden cross-contamination between wheel types.
    if (rouletteType === 'european') {
        assert.ok(!results.includes('00'), 'European sequence must never contain "00"');
        assert.equal(validPockets.size, 37);
    } else {
        assert.equal(validPockets.size, 38);
        assert.ok(results.includes('00'), `expected at least one "00" in ${count} American spins`);
    }

    // Distribution-sum validation (spec §58): counts sum to total, every
    // pocket that can occur was observed at this sample size, and derived
    // classifiers stay internally consistent for every observed pocket
    // (property check folded in here rather than re-generating, spec §97).
    const totalCounted = [...counts.values()].reduce((a, b) => a + b, 0);
    assert.equal(totalCounted, count);
    for (const p of validPockets) {
        assert.ok(counts.get(p) > 0, `pocket "${p}" never appeared in ${count} spins — suspicious for this sample size`);
    }
    for (const p of validPockets) {
        const color = getColor(p);
        assert.ok(['red', 'black', 'green'].includes(color));
        if (p === '0' || p === '00') {
            assert.equal(color, 'green');
            assert.equal(getParity(p), null);
            assert.equal(getDozen(p), null);
            assert.equal(getColumn(p), null);
        } else {
            assert.ok(['even', 'odd'].includes(getParity(p)));
            assert.ok([1, 2, 3].includes(getDozen(p)));
            assert.ok([1, 2, 3].includes(getColumn(p)));
        }
    }

    return { results, counts };
}

test('European roulette: 100,000 spins are all valid pockets (0-36), no 00/-1/37/NaN', () => {
    checkValidityAndCoverage('european', 100_000);
});

test('American roulette: 100,000 spins are all valid pockets (0, 00, 1-36)', () => {
    checkValidityAndCoverage('american', 100_000);
});

test('European roulette: 1,000,000 spins remain valid at large scale (feasibility check, spec §56)', () => {
    checkValidityAndCoverage('european', 1_000_000);
});

test('Law of Large Numbers: European red-frequency error shrinks as sample size grows (spec §57)', () => {
    // Statistical, not visual: compare |observed - theoretical| at increasing
    // n. Individual runs fluctuate, so we don't assert monotonic decrease on
    // one draw — we compare against the theoretical standard error at each
    // n, which itself shrinks as 1/sqrt(n), and require the observed error
    // stays within a generous (6 sigma) band at every scale. A 6-sigma
    // failure has probability ~1e-9 per run, so this is not flaky in
    // practice while still being a real, non-hardcoded check.
    const theoreticalP = 18 / 37;
    const sizes = [1_000, 10_000, 100_000];
    for (const n of sizes) {
        const results = generateRandomSequence('european', n);
        const redCount = results.filter((r) => getColor(r) === 'red').length;
        const observedP = redCount / n;
        const standardError = Math.sqrt((theoreticalP * (1 - theoreticalP)) / n);
        const error = Math.abs(observedP - theoreticalP);
        assert.ok(
            error < 6 * standardError,
            `n=${n}: observed red rate ${observedP} deviates ${error} from theoretical ${theoreticalP} (6*SE=${6 * standardError})`
        );
    }
});
