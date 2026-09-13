// Advanced spec §21-§28: Monte Carlo Lab. Distinct from tests/monte-carlo.test.js
// (which exercises js/simulation.js's single-run engine) — this covers the
// new js/monte-carlo.js multi-run aggregator: output shape, percentile/
// histogram correctness, risk metrics, EV comparison, and strategy
// comparison, plus the memory-discipline requirement (advanced spec §39).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runMonteCarlo, runMonteCarloComparison } from '../js/monte-carlo.js';
import { calculateExpectedValue } from '../js/probability.js';

test('runMonteCarlo produces one final bankroll per simulation and internally consistent win/loss totals', () => {
    const simulations = 300;
    const spinsPerSimulation = 100;
    const result = runMonteCarlo({
        rouletteType: 'european', simulations, spinsPerSimulation,
        betType: 'red', betAmount: 10, startingBankroll: 1000,
    });
    assert.equal(result.finalBankrolls.length, simulations);
    assert.equal(result.wins + result.losses, simulations * spinsPerSimulation);
    assert.ok(result.summary.min <= result.summary.mean && result.summary.mean <= result.summary.max);
});

test('runMonteCarlo does not retain per-spin data — output size stays bounded by `simulations`, not `simulations*spinsPerSimulation` (spec §39)', () => {
    const result = runMonteCarlo({
        rouletteType: 'european', simulations: 500, spinsPerSimulation: 1000,
        betType: 'black', betAmount: 5, startingBankroll: 500,
    });
    // The only large array in the output is finalBankrolls, sized by
    // `simulations` (500), never by simulations*spinsPerSimulation (500,000).
    const serialized = JSON.stringify(result);
    assert.ok(serialized.length < 2_000_000, `output serialized to ${serialized.length} bytes — looks like raw per-spin data leaked into the result`);
    assert.equal(result.finalBankrolls.length, 500);
});

test('runMonteCarlo percentiles are monotonically non-decreasing and bracket the min/max', () => {
    const result = runMonteCarlo({
        rouletteType: 'european', simulations: 400, spinsPerSimulation: 200,
        betType: 'red', betAmount: 10, startingBankroll: 1000,
    });
    const { p5, p25, p50, p75, p95 } = result.summary.percentiles;
    assert.ok(p5 <= p25 && p25 <= p50 && p50 <= p75 && p75 <= p95);
    assert.ok(result.summary.min <= p5);
    assert.ok(p95 <= result.summary.max);
});

test('runMonteCarlo risk metrics are valid probabilities and drawdown is non-negative', () => {
    const result = runMonteCarlo({
        rouletteType: 'american', simulations: 300, spinsPerSimulation: 300,
        betType: 'straight', betSelection: '17', betAmount: 5, startingBankroll: 200,
    });
    for (const key of ['probabilityBelowStart', 'probabilityOfProfit', 'probabilityOfLoss', 'probabilityOfDepletion']) {
        const v = result.riskMetrics[key];
        assert.ok(v >= 0 && v <= 1, `${key}=${v} is not a valid probability`);
    }
    assert.ok(result.riskMetrics.maxDrawdown.mean >= 0);
    assert.ok(result.riskMetrics.maxDrawdown.max >= result.riskMetrics.maxDrawdown.mean);
});

test('runMonteCarlo histogram buckets sum to the total simulation count', () => {
    const simulations = 250;
    const result = runMonteCarlo({
        rouletteType: 'european', simulations, spinsPerSimulation: 150,
        betType: 'red', betAmount: 10, startingBankroll: 1000,
    });
    const total = result.histogram.buckets.reduce((a, b) => a + b.count, 0);
    assert.equal(total, simulations);
});

test('Expected Value vs simulation: overall ROI trends toward theoretical EV at moderate scale (spec §25)', () => {
    const rouletteType = 'european';
    const betType = 'red';
    const result = runMonteCarlo({
        rouletteType, simulations: 2000, spinsPerSimulation: 200,
        betType, betAmount: 1, startingBankroll: 10 ** 6,
    });
    const theoreticalEv = calculateExpectedValue(betType, rouletteType) * 100;
    assert.ok(Math.abs(result.roi.theoreticalEvPct - theoreticalEv) < 1e-9);
    // 2000*200 = 400,000 trials; SE of the mean return (in %) is well under
    // 1 percentage point at this scale, so a generous 2pp band is safe.
    assert.ok(Math.abs(result.roi.overallPct - theoreticalEv) < 2, `overall ROI ${result.roi.overallPct}% too far from EV ${theoreticalEv}%`);
});

test('Monte Carlo convergence checkpoints are recorded in increasing simulation-count order', () => {
    const result = runMonteCarlo({
        rouletteType: 'european', simulations: 1000, spinsPerSimulation: 50,
        betType: 'red', betAmount: 10, startingBankroll: 1000,
    });
    assert.ok(result.convergence.length > 1);
    for (let i = 1; i < result.convergence.length; i++) {
        assert.ok(result.convergence[i].simulationsSoFar > result.convergence[i - 1].simulationsSoFar);
    }
    assert.equal(result.convergence[result.convergence.length - 1].simulationsSoFar, 1000);
});

test('runMonteCarloComparison runs independent simulations per strategy (spec §28)', () => {
    const results = runMonteCarloComparison(
        { rouletteType: 'european', simulations: 100, spinsPerSimulation: 100, betAmount: 10, startingBankroll: 1000 },
        [
            { label: 'Red', betType: 'red' },
            { label: 'Black', betType: 'black' },
            { label: 'Straight 17', betType: 'straight', betSelection: '17' },
        ]
    );
    assert.equal(results.length, 3);
    assert.deepEqual(results.map((r) => r.label), ['Red', 'Black', 'Straight 17']);
    // A 35:1 straight-number bet has much higher payout variance than an
    // even-money bet, so its final-bankroll spread should be visibly wider.
    assert.ok(results[2].summary.standardDeviation > results[0].summary.standardDeviation);
});
