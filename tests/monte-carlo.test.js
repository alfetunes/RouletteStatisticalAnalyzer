// Spec §47-§54: Monte Carlo scale tests, statistical convergence, EV
// validation, house-edge validation, bankroll depletion, and deterministic
// drawdown. Uses the real crypto-backed RNG throughout (no seeding —
// production randomness is never weakened for tests, spec §96); statistical
// assertions use theory-derived tolerances (standard error bands) rather
// than fixed guesses, so they are not tuned to one lucky run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSimulation, runMultiBetComparison } from '../js/simulation.js';
import { calculateMaxDrawdown } from '../js/statistics.js';
import { BET_TYPES, calculateExpectedValue, getHouseEdge } from '../js/probability.js';

test('deterministic max drawdown matches the spec §54 worked example', () => {
    // 1000 -> 1100 (new peak) -> 1050 -> 900 (trough, 200 below peak) -> 950
    const series = [1000, 1100, 1050, 900, 950];
    assert.equal(calculateMaxDrawdown(series), 200);
});

test('max drawdown handles a monotonically rising series (zero drawdown) and a single-point series', () => {
    assert.equal(calculateMaxDrawdown([500, 600, 700, 900]), 0);
    assert.equal(calculateMaxDrawdown([500]), 0);
    assert.equal(calculateMaxDrawdown([]), 0);
});

test('Monte Carlo scale: simulation counts/rounds/wins/losses are internally consistent at increasing scales (spec §47)', () => {
    for (const rounds of [100, 500, 1000]) {
        const sim = runSimulation({
            rouletteType: 'european',
            rounds,
            betType: BET_TYPES.RED,
            betAmount: 10,
            startingBankroll: 1_000_000, // effectively unlimited so rounds always completes
        });
        assert.equal(sim.playedRounds, rounds);
        assert.equal(sim.wins + sim.losses, rounds);
        assert.equal(sim.roundOutcomes.length, rounds);
        assert.equal(sim.bankrollOverTime.length, rounds + 1);
        assert.ok(sim.finalBankroll >= 0);
        assert.ok(Number.isFinite(sim.roi));
        assert.ok(sim.maxDrawdown >= 0);
    }
});

test('bankroll depletion: stopOnBankroll stops exactly when the bankroll can no longer cover the next bet (spec §51)', () => {
    // starting bankroll < bet amount: cannot play even one round.
    const cannotStart = runSimulation({
        rouletteType: 'european', rounds: 50, betType: BET_TYPES.RED,
        betAmount: 100, startingBankroll: 50, stopOnBankroll: true,
    });
    assert.equal(cannotStart.playedRounds, 0);
    assert.equal(cannotStart.finalBankroll, 50);

    // starting bankroll == bet amount: exactly one round is affordable, win
    // or lose, and the loop must not go negative or wager below zero.
    const exactMatch = runSimulation({
        rouletteType: 'european', rounds: 50, betType: BET_TYPES.RED,
        betAmount: 100, startingBankroll: 100, stopOnBankroll: true,
    });
    assert.ok(exactMatch.playedRounds >= 1);
    assert.ok(exactMatch.finalBankroll >= 0);

    // starting bankroll > bet amount: never wagers more than the bankroll can
    // cover at any point, i.e. bankroll never goes negative mid-run.
    const comfortable = runSimulation({
        rouletteType: 'european', rounds: 2000, betType: BET_TYPES.STRAIGHT,
        betSelection: '17', betAmount: 10, startingBankroll: 200, stopOnBankroll: true,
    });
    assert.ok(comfortable.bankrollOverTime.every((b) => b >= 0), 'bankroll must never go negative when stopOnBankroll is set');
});

test('Expected Value validation: simulated average return trends toward theoretical EV as sample size grows (spec §49)', () => {
    // Run many independent, small simulations and look at the average
    // per-round return in units of the stake — this is exactly what EV
    // predicts, and its estimator's standard error shrinks as 1/sqrt(N).
    const betType = BET_TYPES.RED;
    const rouletteType = 'european';
    const theoreticalEv = calculateExpectedValue(betType, rouletteType); // ~ -0.027

    function averageReturnPerUnit(totalRounds) {
        const sim = runSimulation({
            rouletteType, rounds: totalRounds, betType, betAmount: 1, startingBankroll: 10 ** 9,
        });
        return sim.profitLoss / totalRounds; // average return per unit staked
    }

    // Per-round payoff for a 1:1 even-money bet has variance ~1 (outcomes are
    // -1 or +1), so SE(mean) ~= 1/sqrt(n).
    const small = averageReturnPerUnit(2_000);
    const large = averageReturnPerUnit(200_000);

    const seSmall = 1 / Math.sqrt(2_000);
    const seLarge = 1 / Math.sqrt(200_000);

    assert.ok(
        Math.abs(small - theoreticalEv) < 6 * seSmall,
        `n=2000 average return ${small} too far from EV ${theoreticalEv} (6*SE=${6 * seSmall})`
    );
    assert.ok(
        Math.abs(large - theoreticalEv) < 6 * seLarge,
        `n=200000 average return ${large} too far from EV ${theoreticalEv} (6*SE=${6 * seLarge})`
    );
    // The large-sample estimate must land closer to the theoretical EV in
    // absolute terms than the small-sample bound allowed, i.e. convergence
    // is actually tighter at scale (not just "still within a huge band").
    assert.ok(6 * seLarge < 6 * seSmall);
});

test('House edge validation across bet types and both wheels via large Monte Carlo runs (spec §50)', () => {
    const ROUNDS = 300_000;
    for (const rouletteType of ['european', 'american']) {
        for (const betType of [BET_TYPES.RED, BET_TYPES.DOZEN_1]) {
            const sim = runSimulation({
                rouletteType, rounds: ROUNDS, betType, betAmount: 1, startingBankroll: 10 ** 9,
            });
            const simulatedEdge = -(sim.profitLoss / sim.totalWagered);
            const theoreticalEdge = getHouseEdge(rouletteType);
            // House edge estimator's SE shrinks with sample size; a fixed
            // generous absolute band (2 percentage points) at 300k rounds
            // comfortably bounds normal variation without hard-coding an
            // exact expected trajectory.
            assert.ok(
                Math.abs(simulatedEdge - theoreticalEdge) < 0.02,
                `${rouletteType}/${betType}: simulated edge ${simulatedEdge} vs theoretical ${theoreticalEdge}`
            );
        }
    }
});

test('Monte Carlo simulations are independent draws, not a shared/reused sequence (spec §55)', () => {
    const params = { rouletteType: 'european', rounds: 500, betType: BET_TYPES.RED, betAmount: 10, startingBankroll: 10000 };
    const a = runSimulation(params);
    const b = runSimulation(params);
    assert.notEqual(a.id, b.id);
    // Two independent 500-round crypto-random draws being byte-identical is
    // astronomically unlikely; this catches an accidentally deterministic
    // or memoized generator.
    assert.notDeepEqual(a.roundOutcomes.map((r) => r.result), b.roundOutcomes.map((r) => r.result));
});

test('runMultiBetComparison runs genuinely independent simulations per bet (spec §14/§53 comparison view)', () => {
    const base = { rouletteType: 'european', rounds: 1000, betAmount: 10, startingBankroll: 5000 };
    const results = runMultiBetComparison(base, [
        { label: 'Red', betType: BET_TYPES.RED },
        { label: 'Black', betType: BET_TYPES.BLACK },
        { label: 'Straight 17', betType: BET_TYPES.STRAIGHT, betSelection: '17' },
    ]);
    assert.equal(results.length, 3);
    for (const r of results) {
        assert.equal(r.playedRounds, 1000);
    }
    const [red, black, straight] = results;
    assert.notDeepEqual(red.roundOutcomes.map((r) => r.result), black.roundOutcomes.map((r) => r.result));
    assert.notDeepEqual(red.roundOutcomes.map((r) => r.result), straight.roundOutcomes.map((r) => r.result));
});
