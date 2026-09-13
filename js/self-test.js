// "System Validation" dashboard (advanced spec §35-§37): lightweight
// runtime self-tests the app can run in the browser to show whether its own
// core invariants hold, independent of the Node test suite in tests/. Each
// check is fast (no large samples) so this can run instantly from a button
// click. Pure logic only — the localStorage check is the one exception,
// and it uses a dedicated, cleaned-up probe key so it never touches real
// application data.

import { getPockets, isValidResult, describeResult } from './roulette.js';
import { generateRandomResult } from './random.js';
import { getSingleNumberProbability, getRedOrBlackProbability, getGreenProbability, getBetPayout, BET_TYPES } from './probability.js';
import { calculateMean, calculateMedian, calculateMode, calculateChiSquare } from './statistics.js';
import { createHistory, MAX_HISTORY_SIZE } from './history.js';
import { runSimulation, evaluateBet } from './simulation.js';
import { buildCsv, parseCsv } from './export.js';

function check(name, fn) {
    try {
        const detail = fn();
        return { name, status: 'PASS', detail: detail ?? '' };
    } catch (err) {
        return { name, status: 'FAIL', detail: err instanceof Error ? err.message : String(err) };
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) throw new Error(message ?? `expected ${expected}, got ${actual}`);
}

function assertTrue(condition, message) {
    if (!condition) throw new Error(message ?? 'assertion failed');
}

/** Runs the full System Validation suite and returns an array of {name, status, detail}. */
export function runSystemValidation() {
    const results = [];

    results.push(check('Random generation', () => {
        for (let i = 0; i < 300; i++) {
            const r = generateRandomResult('european');
            assertTrue(getPockets('european').includes(r), `invalid European result: ${r}`);
        }
        for (let i = 0; i < 300; i++) {
            const r = generateRandomResult('american');
            assertTrue(getPockets('american').includes(r), `invalid American result: ${r}`);
        }
        return '300 European + 300 American spins, all valid';
    }));

    results.push(check('European roulette pockets', () => {
        const pockets = getPockets('european');
        assertEqual(pockets.length, 37);
        assertTrue(!pockets.includes('00'), 'European pockets must not include "00"');
        assertEqual(describeResult('0').color, 'green');
        return '37 pockets (0-36), no "00"';
    }));

    results.push(check('American roulette pockets', () => {
        const pockets = getPockets('american');
        assertEqual(pockets.length, 38);
        assertTrue(pockets.includes('00'), 'American pockets must include "00"');
        assertEqual(describeResult('00').color, 'green');
        assertEqual(describeResult('00').parity, null);
        return '38 pockets (0, 00, 1-36)';
    }));

    results.push(check('Probability calculations', () => {
        const p37 = getSingleNumberProbability('european');
        assertTrue(Math.abs(p37 - 1 / 37) < 1e-12);
        const p38 = getSingleNumberProbability('american');
        assertTrue(Math.abs(p38 - 1 / 38) < 1e-12);
        const sumEuropean = getRedOrBlackProbability('european') * 2 + getGreenProbability('european');
        assertTrue(Math.abs(sumEuropean - 1) < 1e-9, 'European red+black+green must sum to 1');
        return `P(single)=1/37≈${(p37 * 100).toFixed(2)}%, 1/38≈${(p38 * 100).toFixed(2)}%`;
    }));

    results.push(check('Payout calculations', () => {
        assertEqual(getBetPayout(BET_TYPES.STRAIGHT), 35);
        assertEqual(getBetPayout(BET_TYPES.RED), 1);
        assertEqual(getBetPayout(BET_TYPES.DOZEN_1), 2);
        assertEqual(evaluateBet('17', BET_TYPES.RED, null), false); // 17 is black
        assertEqual(evaluateBet('1', BET_TYPES.RED, null), true); // 1 is red
        return 'Straight=35:1, even-money=1:1, dozen/column=2:1, resolution verified';
    }));

    results.push(check('History limit', () => {
        const history = createHistory();
        for (let i = 0; i < 1200; i++) history.addRound(String(i % 36), i + 1);
        assertEqual(history.size(), MAX_HISTORY_SIZE);
        const all = history.getAll();
        assertEqual(all[0].roundNumber, 201);
        return `1200 additions capped at ${MAX_HISTORY_SIZE}, oldest evicted first`;
    }));

    results.push(check('Statistics (mean/median/mode)', () => {
        assertEqual(calculateMean(['1', '2', '3', '4', '5']).mean, 3);
        assertEqual(calculateMedian(['1', '2', '3', '4']).median, 2.5);
        assertEqual(calculateMode(['5', '5', '7']).modes[0], '5');
        return 'mean([1..5])=3, median([1..4])=2.5, mode([5,5,7])=5';
    }));

    results.push(check('Chi-square', () => {
        const uniform = calculateChiSquare([10, 10, 10], [1 / 3, 1 / 3, 1 / 3]);
        assertEqual(uniform.chiSquare, 0);
        assertEqual(uniform.degreesOfFreedom, 2);
        const skewed = calculateChiSquare([20, 8, 8, 8, 8, 8], new Array(6).fill(1 / 6));
        assertTrue(Math.abs(skewed.chiSquare - 12) < 1e-9);
        return 'uniform table -> chi-square=0; deliberately skewed table -> chi-square=12 (hand-verified)';
    }));

    results.push(check('Simulation bankroll bookkeeping', () => {
        const sim = runSimulation({
            rouletteType: 'european', rounds: 200, betType: BET_TYPES.RED,
            betAmount: 10, startingBankroll: 1000,
        });
        assertEqual(sim.wins + sim.losses, 200);
        const expectedBankroll = 1000 + sim.wins * 10 - sim.losses * 10;
        assertEqual(sim.finalBankroll, expectedBankroll);
        return `200-round simulation: ${sim.wins}W/${sim.losses}L, bankroll bookkeeping consistent`;
    }));

    results.push(check('CSV import/export round-trip', () => {
        const rounds = ['0', '17', '1', '36'].map((result, i) => ({ ...describeResult(result), roundNumber: i + 1, timestamp: new Date().toISOString() }));
        const csv = buildCsv(rounds);
        const { records, errors } = parseCsv(csv, 'european');
        assertEqual(records.length, rounds.length);
        assertEqual(errors.length, 0);
        return `${rounds.length} rounds exported and re-imported without loss`;
    }));

    results.push(check('localStorage read/write', () => {
        if (typeof globalThis.localStorage === 'undefined') {
            throw new Error('localStorage is not available in this environment');
        }
        const probeKey = '__roulette-selftest-probe__';
        const probeValue = JSON.stringify({ ok: true, ts: Date.now() });
        try {
            globalThis.localStorage.setItem(probeKey, probeValue);
            const readBack = globalThis.localStorage.getItem(probeKey);
            assertEqual(readBack, probeValue);
        } finally {
            globalThis.localStorage.removeItem(probeKey);
        }
        return 'write/read/remove round-trip on a dedicated probe key succeeded';
    }));

    return results;
}
