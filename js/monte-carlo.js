// Monte Carlo Lab (advanced spec §21-§28): runs many independent betting
// simulations and aggregates risk/return statistics. Deliberately
// independent from js/simulation.js's single-run betting simulator (used by
// the Roulette page and Simulation Lab) — this module never touches
// js/history.js or localStorage (advanced spec §39/§59: large synthetic runs
// must never leak into the normal round history).
//
// Memory discipline (advanced spec §39): only the final bankroll and max
// drawdown of each simulation are retained (arrays of length `simulations`,
// so at most ~10,000 numbers per metric even at the largest offered
// preset) — the per-spin path within a simulation is discarded once that
// simulation's aggregate is computed, never accumulated across simulations.

import { generateRandomSequence } from './random.js';
import { getBetPayout } from './probability.js';
import { evaluateBet } from './simulation.js';
import { calculatePercentile, calculateMaxDrawdown } from './statistics.js';
import { calculateExpectedValue } from './probability.js';

/** Runs a single simulation's worth of spins and returns only its aggregate outcome (no per-spin retention beyond this call). */
function runOneSimulation({ rouletteType, spinsPerSimulation, betType, betSelection, betAmount, startingBankroll, payout }) {
    const results = generateRandomSequence(rouletteType, spinsPerSimulation);
    let bankroll = startingBankroll;
    const bankrollPath = new Array(spinsPerSimulation + 1);
    bankrollPath[0] = bankroll;
    let wins = 0;

    for (let i = 0; i < results.length; i++) {
        const won = evaluateBet(results[i], betType, betSelection);
        if (won) {
            bankroll += betAmount * payout;
            wins += 1;
        } else {
            bankroll -= betAmount;
        }
        bankrollPath[i + 1] = bankroll;
    }

    return {
        finalBankroll: bankroll,
        profitLoss: bankroll - startingBankroll,
        wins,
        losses: spinsPerSimulation - wins,
        maxDrawdown: calculateMaxDrawdown(bankrollPath),
    };
}

function buildHistogram(values, bucketCount = 20) {
    if (!values.length) return { buckets: [], bucketSize: 0, min: 0, max: 0 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
        return { buckets: [{ rangeStart: min, rangeEnd: max, count: values.length }], bucketSize: 0, min, max };
    }
    const bucketSize = (max - min) / bucketCount;
    const counts = new Array(bucketCount).fill(0);
    for (const v of values) {
        const index = Math.min(bucketCount - 1, Math.floor((v - min) / bucketSize));
        counts[index] += 1;
    }
    const buckets = counts.map((count, i) => ({
        rangeStart: min + i * bucketSize,
        rangeEnd: min + (i + 1) * bucketSize,
        count,
    }));
    return { buckets, bucketSize, min, max };
}

/**
 * Runs a full Monte Carlo Lab experiment.
 * @param {object} params
 * @param {'european'|'american'} params.rouletteType
 * @param {number} params.simulations number of independent simulations
 * @param {number} params.spinsPerSimulation spins within each simulation
 * @param {string} params.betType one of BET_TYPES
 * @param {string|number} [params.betSelection]
 * @param {number} params.betAmount
 * @param {number} params.startingBankroll
 * @param {(completed: number, total: number) => void} [params.onProgress]
 *   invoked periodically for chunked/worker progress reporting (advanced §38)
 * @returns {object} aggregated report — no raw per-spin data retained
 */
export function runMonteCarlo({
    rouletteType, simulations, spinsPerSimulation, betType, betSelection,
    betAmount, startingBankroll, onProgress,
}) {
    const payout = getBetPayout(betType);
    const finalBankrolls = new Array(simulations);
    const profitLosses = new Array(simulations);
    const maxDrawdowns = new Array(simulations);
    let totalWins = 0;
    let totalLosses = 0;

    // Convergence checkpoints (advanced spec §26): cumulative average return
    // (in bankroll units) sampled at a handful of points through the run, so
    // a chart can show "average simulated return vs number of simulations"
    // without re-running anything or storing every intermediate simulation.
    const checkpointCount = Math.min(12, simulations);
    const checkpointStride = Math.max(1, Math.floor(simulations / checkpointCount));
    const convergence = [];
    let runningProfitSum = 0;

    for (let i = 0; i < simulations; i++) {
        const outcome = runOneSimulation({ rouletteType, spinsPerSimulation, betType, betSelection, betAmount, startingBankroll, payout });
        finalBankrolls[i] = outcome.finalBankroll;
        profitLosses[i] = outcome.profitLoss;
        maxDrawdowns[i] = outcome.maxDrawdown;
        totalWins += outcome.wins;
        totalLosses += outcome.losses;
        runningProfitSum += outcome.profitLoss;

        if ((i + 1) % checkpointStride === 0 || i === simulations - 1) {
            convergence.push({
                simulationsSoFar: i + 1,
                averageReturnSoFar: runningProfitSum / (i + 1) / (betAmount * spinsPerSimulation),
            });
        }
        if (onProgress) onProgress(i + 1, simulations);
    }

    // calculateMean (statistics.js) expects roulette pocket-label strings and
    // excludes "00" — final bankrolls are arbitrary numbers, so the mean is
    // computed directly here instead of reusing that helper.
    const meanFinalBankroll = finalBankrolls.reduce((a, b) => a + b, 0) / simulations;
    const stdDevFinalBankroll = (() => {
        if (simulations < 2) return null;
        const variance = finalBankrolls.reduce((acc, v) => acc + (v - meanFinalBankroll) ** 2, 0) / (simulations - 1);
        return Math.sqrt(variance);
    })();

    const belowStartCount = finalBankrolls.filter((b) => b < startingBankroll).length;
    const depletedCount = finalBankrolls.filter((b) => b <= 0).length;
    const profitCount = finalBankrolls.filter((b) => b > startingBankroll).length;

    const totalWagered = simulations * spinsPerSimulation * betAmount;
    const totalProfitLoss = profitLosses.reduce((a, b) => a + b, 0);
    const overallRoi = totalWagered > 0 ? (totalProfitLoss / totalWagered) * 100 : 0;

    const theoreticalEv = calculateExpectedValue(betType, rouletteType);

    return {
        config: { rouletteType, simulations, spinsPerSimulation, betType, betSelection: betType === 'straight' ? betSelection : null, betAmount, startingBankroll },
        finalBankrolls,
        summary: {
            mean: meanFinalBankroll,
            median: calculatePercentile(finalBankrolls, 50),
            min: Math.min(...finalBankrolls),
            max: Math.max(...finalBankrolls),
            standardDeviation: stdDevFinalBankroll,
            percentiles: {
                p5: calculatePercentile(finalBankrolls, 5),
                p25: calculatePercentile(finalBankrolls, 25),
                p50: calculatePercentile(finalBankrolls, 50),
                p75: calculatePercentile(finalBankrolls, 75),
                p95: calculatePercentile(finalBankrolls, 95),
            },
        },
        riskMetrics: {
            probabilityBelowStart: belowStartCount / simulations,
            probabilityOfProfit: profitCount / simulations,
            probabilityOfLoss: belowStartCount / simulations,
            probabilityOfDepletion: depletedCount / simulations,
            worstPercentile: calculatePercentile(finalBankrolls, 5),
            bestPercentile: calculatePercentile(finalBankrolls, 95),
            volatility: stdDevFinalBankroll,
            maxDrawdown: {
                mean: maxDrawdowns.reduce((a, b) => a + b, 0) / simulations,
                median: calculatePercentile(maxDrawdowns, 50),
                p95: calculatePercentile(maxDrawdowns, 95),
                max: Math.max(...maxDrawdowns),
            },
        },
        profitLoss: {
            average: profitLosses.reduce((a, b) => a + b, 0) / simulations,
            median: calculatePercentile(profitLosses, 50),
        },
        roi: {
            overallPct: overallRoi,
            theoreticalEvPct: theoreticalEv * 100,
        },
        wins: totalWins,
        losses: totalLosses,
        histogram: buildHistogram(finalBankrolls),
        convergence,
    };
}

/** Runs one Monte Carlo experiment per requested strategy for side-by-side comparison (advanced spec §28). */
export function runMonteCarloComparison(baseParams, strategies) {
    return strategies.map((s) => ({
        label: s.label ?? s.betType,
        ...runMonteCarlo({ ...baseParams, betType: s.betType, betSelection: s.betSelection }),
    }));
}
