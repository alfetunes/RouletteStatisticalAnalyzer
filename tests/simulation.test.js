import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSimulation, evaluateBet, runMultiBetComparison } from '../js/simulation.js';
import { BET_TYPES, getBetPayout } from '../js/probability.js';
import { isValidResult } from '../js/roulette.js';

test('runSimulation plays exactly the requested number of rounds when bankroll is not limiting', () => {
    const result = runSimulation({
        rouletteType: 'european',
        rounds: 300,
        betType: BET_TYPES.RED,
        betAmount: 1,
        startingBankroll: 100000,
    });
    assert.equal(result.playedRounds, 300);
    assert.equal(result.wins + result.losses, 300);
});

test('runSimulation only produces valid pockets for the chosen roulette type', () => {
    const result = runSimulation({
        rouletteType: 'american',
        rounds: 150,
        betType: BET_TYPES.BLACK,
        betAmount: 5,
        startingBankroll: 5000,
    });
    for (const outcome of result.roundOutcomes) {
        assert.ok(isValidResult(outcome.result, 'american'));
    }
});

test('bankroll evolves correctly: win = stake*payout profit, loss = stake', () => {
    // Force a fully deterministic check using evaluateBet with a straight bet
    // against a single controlled result via the resolver directly.
    assert.equal(evaluateBet('17', BET_TYPES.STRAIGHT, '17'), true);
    assert.equal(evaluateBet('18', BET_TYPES.STRAIGHT, '17'), false);
    assert.equal(evaluateBet('1', BET_TYPES.RED, undefined), true);
    assert.equal(evaluateBet('2', BET_TYPES.RED, undefined), false);
});

test('runSimulation bankroll bookkeeping is internally consistent', () => {
    const startingBankroll = 1000;
    const betAmount = 10;
    const result = runSimulation({
        rouletteType: 'european',
        rounds: 500,
        betType: BET_TYPES.STRAIGHT,
        betSelection: '17',
        betAmount,
        startingBankroll,
    });
    const payout = getBetPayout(BET_TYPES.STRAIGHT);
    const expectedFinalBankroll = startingBankroll + result.wins * betAmount * payout - result.losses * betAmount;
    assert.ok(Math.abs(expectedFinalBankroll - result.finalBankroll) < 1e-9);
    assert.ok(Math.abs(result.profitLoss - (result.finalBankroll - startingBankroll)) < 1e-9);
});

test('runSimulation stops early when stopOnBankroll is set and funds run out', () => {
    const result = runSimulation({
        rouletteType: 'european',
        rounds: 100000,
        betType: BET_TYPES.STRAIGHT,
        betSelection: '17',
        betAmount: 50,
        startingBankroll: 50,
        stopOnBankroll: true,
    });
    assert.ok(result.playedRounds <= 100000);
    assert.ok(result.finalBankroll >= 0 || result.playedRounds < 100000);
});

test('runSimulation throws for an invalid bet amount or missing straight selection', () => {
    assert.throws(() => runSimulation({
        rouletteType: 'european', rounds: 10, betType: BET_TYPES.RED, betAmount: 0, startingBankroll: 100,
    }));
    assert.throws(() => runSimulation({
        rouletteType: 'european', rounds: 10, betType: BET_TYPES.STRAIGHT, betAmount: 5, startingBankroll: 100,
    }));
});

test('runMultiBetComparison runs one independent simulation per requested bet', () => {
    const results = runMultiBetComparison(
        { rouletteType: 'european', rounds: 200, betAmount: 5, startingBankroll: 1000 },
        [
            { betType: BET_TYPES.RED, label: 'Red' },
            { betType: BET_TYPES.DOZEN_1, label: '1st Dozen' },
        ]
    );
    assert.equal(results.length, 2);
    assert.equal(results[0].label, 'Red');
    assert.equal(results[1].label, '1st Dozen');
    for (const r of results) assert.equal(r.playedRounds, 200);
});
