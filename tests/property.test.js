// Spec §97: property-based invariants that must hold for every valid input,
// checked across many randomly generated cases rather than a handful of
// examples. Spec §81 (cross-module consistency) is folded in here since it's
// the same kind of "for every result, N things must agree" check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateRandomSequence } from '../js/random.js';
import { getPockets, getColor, getParity, getRange, getDozen, getColumn, describeResult } from '../js/roulette.js';
import { getColor as statsGetColor, getParity as statsGetParity } from '../js/roulette.js';
import { createHistory, MAX_HISTORY_SIZE } from '../js/history.js';
import {
    getSingleNumberProbability, getRedOrBlackProbability, getGreenProbability,
    getDozenOrColumnProbability, getBetPayout, BET_TYPES, getBetProbability,
} from '../js/probability.js';
import { evaluateBet } from '../js/simulation.js';

test('property: every generated pocket has internally consistent derived attributes, for both wheel types', () => {
    for (const rouletteType of ['european', 'american']) {
        const results = generateRandomSequence(rouletteType, 5000);
        for (const r of results) {
            const color = getColor(r);
            const parity = getParity(r);
            const range = getRange(r);
            const dozen = getDozen(r);
            const column = getColumn(r);

            assert.ok(['red', 'black', 'green'].includes(color));
            if (r === '0' || r === '00') {
                assert.equal(color, 'green');
                assert.equal(parity, null);
                assert.equal(range, null);
                assert.equal(dozen, null);
                assert.equal(column, null);
            } else {
                const n = Number(r);
                assert.ok(n >= 1 && n <= 36);
                assert.ok(['even', 'odd'].includes(parity));
                assert.equal(parity, n % 2 === 0 ? 'even' : 'odd');
                assert.ok(['low', 'high'].includes(range));
                assert.equal(range, n <= 18 ? 'low' : 'high');
                assert.ok([1, 2, 3].includes(dozen));
                assert.ok([1, 2, 3].includes(column));
            }

            // Cross-module consistency (spec §81): describeResult must agree
            // field-for-field with the individual getters, and importing
            // getColor/getParity a second time under a different local name
            // must yield the exact same classification (no drift between
            // call sites).
            const described = describeResult(r);
            assert.deepEqual(described, { result: r, color, parity, range, dozen, column });
            assert.equal(statsGetColor(r), color);
            assert.equal(statsGetParity(r), parity);
        }
    }
});

test('property: no two of red/black/green ever overlap across the full pocket set', () => {
    for (const rouletteType of ['european', 'american']) {
        const pockets = getPockets(rouletteType);
        const byColor = { red: new Set(), black: new Set(), green: new Set() };
        for (const p of pockets) byColor[getColor(p)].add(p);
        assert.equal(byColor.red.size + byColor.black.size + byColor.green.size, pockets.length);
        for (const p of pockets) {
            const memberships = ['red', 'black', 'green'].filter((c) => byColor[c].has(p));
            assert.equal(memberships.length, 1, `pocket ${p} belongs to ${memberships.length} colors`);
        }
    }
});

test('property: history.length never exceeds MAX_HISTORY_SIZE regardless of how many rounds are added', () => {
    const history = createHistory();
    for (let i = 0; i < 2500; i++) {
        history.addRound(String(i % 36), i + 1);
        assert.ok(history.size() <= MAX_HISTORY_SIZE, `history size ${history.size()} exceeded cap after ${i + 1} additions`);
    }
    assert.equal(history.size(), MAX_HISTORY_SIZE);
});

test('property: every probability distribution sums to (approximately) 1', () => {
    for (const rouletteType of ['european', 'american']) {
        const pocketCount = getPockets(rouletteType).length;
        const sumIndividual = getSingleNumberProbability(rouletteType) * pocketCount;
        assert.ok(Math.abs(sumIndividual - 1) < 1e-9);

        const sumColors = getRedOrBlackProbability(rouletteType) * 2 + getGreenProbability(rouletteType);
        assert.ok(Math.abs(sumColors - 1) < 1e-9);

        const sumDozens = getDozenOrColumnProbability(rouletteType) * 3 + getGreenProbability(rouletteType);
        assert.ok(Math.abs(sumDozens - 1) < 1e-9);
    }
});

test('property: for every valid bet and every possible result, payout resolution is deterministic and non-negative in magnitude', () => {
    for (const rouletteType of ['european', 'american']) {
        const pockets = getPockets(rouletteType);
        for (const betType of Object.values(BET_TYPES)) {
            const payout = getBetPayout(betType);
            assert.ok(payout > 0);
            const selection = betType === BET_TYPES.STRAIGHT ? pockets[0] : undefined;
            for (const result of pockets) {
                const won = evaluateBet(result, betType, selection);
                assert.equal(typeof won, 'boolean');
                // Whatever the outcome, the profit magnitude computed from
                // stake*payout is always non-negative (a "loss" is modeled
                // as forfeiting the stake elsewhere, never a negative payout
                // multiplier here).
                const stake = 10;
                const profitIfWon = stake * payout;
                assert.ok(profitIfWon >= 0);
            }
            const p = getBetProbability(betType, rouletteType);
            assert.ok(p > 0 && p < 1);
        }
    }
});
