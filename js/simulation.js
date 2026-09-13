// Betting simulation engine: runs N independent rounds through the same
// random generator as real spins and tracks bankroll/ROI/streaks/drawdown.
// Pure — callers own random.js's crypto-backed generator; simulation.js just
// wires generation + bet resolution together (spec §7, §49-53).

import { generateRandomSequence } from './random.js';
import { getColor, getParity, getRange, getDozen, getColumn } from './roulette.js';
import { BET_TYPES, getBetPayout } from './probability.js';

/** Shared bet-resolution logic — used by both simulations and real spins (spec §7). */
export function evaluateBet(result, betType, betSelection) {
    return resolveBet(result, betType, betSelection);
}

function resolveBet(result, betType, betSelection) {
    switch (betType) {
        case BET_TYPES.STRAIGHT:
            return String(result) === String(betSelection);
        case BET_TYPES.RED:
            return getColor(result) === 'red';
        case BET_TYPES.BLACK:
            return getColor(result) === 'black';
        case BET_TYPES.EVEN:
            return getParity(result) === 'even';
        case BET_TYPES.ODD:
            return getParity(result) === 'odd';
        case BET_TYPES.LOW:
            return getRange(result) === 'low';
        case BET_TYPES.HIGH:
            return getRange(result) === 'high';
        case BET_TYPES.DOZEN_1:
            return getDozen(result) === 1;
        case BET_TYPES.DOZEN_2:
            return getDozen(result) === 2;
        case BET_TYPES.DOZEN_3:
            return getDozen(result) === 3;
        case BET_TYPES.COLUMN_1:
            return getColumn(result) === 1;
        case BET_TYPES.COLUMN_2:
            return getColumn(result) === 2;
        case BET_TYPES.COLUMN_3:
            return getColumn(result) === 3;
        default:
            throw new Error(`Unknown bet type: ${betType}`);
    }
}

function generateSimulationId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }
    return `sim-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Runs a full betting simulation.
 * @param {object} params
 * @param {'european'|'american'} params.rouletteType
 * @param {number} params.rounds
 * @param {string} params.betType one of BET_TYPES
 * @param {string|number} [params.betSelection] required for STRAIGHT bets
 * @param {number} params.betAmount stake per round
 * @param {number} params.startingBankroll
 * @param {boolean} [params.stopOnBankroll=false] stop early if bankroll can't cover the next bet
 */
export function runSimulation({
    rouletteType,
    rounds,
    betType,
    betSelection,
    betAmount,
    startingBankroll,
    stopOnBankroll = false,
}) {
    if (betAmount <= 0) throw new Error('Bet amount must be greater than zero');
    if (betType === BET_TYPES.STRAIGHT && (betSelection === undefined || betSelection === null)) {
        throw new Error('A number selection is required for straight bets');
    }

    const payout = getBetPayout(betType);
    const results = generateRandomSequence(rouletteType, rounds);

    let bankroll = startingBankroll;
    let wins = 0;
    let losses = 0;
    let totalWagered = 0;
    let totalReturn = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let peakBankroll = startingBankroll;
    let maxDrawdown = 0;

    const bankrollOverTime = [startingBankroll];
    const roundOutcomes = [];

    for (let i = 0; i < results.length; i++) {
        if (stopOnBankroll && bankroll < betAmount) break;

        const result = results[i];
        const won = resolveBet(result, betType, betSelection);
        totalWagered += betAmount;

        if (won) {
            const profit = betAmount * payout;
            const roundReturn = betAmount + profit;
            bankroll += profit;
            totalReturn += roundReturn;
            wins += 1;
            currentWinStreak += 1;
            currentLossStreak = 0;
            longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
        } else {
            bankroll -= betAmount;
            losses += 1;
            currentLossStreak += 1;
            currentWinStreak = 0;
            longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
        }

        peakBankroll = Math.max(peakBankroll, bankroll);
        maxDrawdown = Math.max(maxDrawdown, peakBankroll - bankroll);
        bankrollOverTime.push(bankroll);
        roundOutcomes.push({ roundNumber: i + 1, result, won, bankrollAfter: bankroll });
    }

    const playedRounds = roundOutcomes.length;
    const profitLoss = bankroll - startingBankroll;

    return {
        id: generateSimulationId(),
        timestamp: new Date().toISOString(),
        rouletteType,
        requestedRounds: rounds,
        playedRounds,
        betType,
        betSelection: betType === BET_TYPES.STRAIGHT ? betSelection : null,
        betAmount,
        startingBankroll,
        finalBankroll: bankroll,
        wins,
        losses,
        winRate: playedRounds > 0 ? (wins / playedRounds) * 100 : 0,
        totalWagered,
        totalReturn,
        profitLoss,
        roi: totalWagered > 0 ? (profitLoss / totalWagered) * 100 : 0,
        longestWinStreak,
        longestLossStreak,
        maxDrawdown,
        bankrollOverTime,
        roundOutcomes,
    };
}

/** Runs several independent simulations for side-by-side comparison (spec §53). */
export function runMultiBetComparison(baseParams, bets) {
    return bets.map((bet) => ({
        label: bet.label ?? bet.betType,
        ...runSimulation({ ...baseParams, betType: bet.betType, betSelection: bet.betSelection }),
    }));
}
