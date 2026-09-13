// Pure theoretical-probability calculations. Never mixes in observed/historical
// data — see js/statistics.js and js/pattern-analyzer.js for that side.

import { getPocketCount, ROULETTE_TYPES } from './roulette.js';

/** Probability of any single specific pocket, e.g. 1/37 or 1/38. */
export function getSingleNumberProbability(rouletteType) {
    return 1 / getPocketCount(rouletteType);
}

/** Probability of the ball landing on any green pocket (0, or 0+00). */
export function getGreenProbability(rouletteType) {
    const greens = rouletteType === ROULETTE_TYPES.AMERICAN ? 2 : 1;
    return greens / getPocketCount(rouletteType);
}

/** Probability of red (equal to black). */
export function getRedOrBlackProbability(rouletteType) {
    return 18 / getPocketCount(rouletteType);
}

/** Probability of even/odd, low/high (18 numbers each, excludes green). */
export function getEvenMoneyProbability(rouletteType) {
    return 18 / getPocketCount(rouletteType);
}

/** Probability of a dozen or a column (12 numbers each). */
export function getDozenOrColumnProbability(rouletteType) {
    return 12 / getPocketCount(rouletteType);
}

export const BET_TYPES = Object.freeze({
    STRAIGHT: 'straight',
    RED: 'red',
    BLACK: 'black',
    EVEN: 'even',
    ODD: 'odd',
    LOW: 'low',
    HIGH: 'high',
    DOZEN_1: 'dozen1',
    DOZEN_2: 'dozen2',
    DOZEN_3: 'dozen3',
    COLUMN_1: 'column1',
    COLUMN_2: 'column2',
    COLUMN_3: 'column3',
});

export const BET_PAYOUTS = Object.freeze({
    [BET_TYPES.STRAIGHT]: 35,
    [BET_TYPES.RED]: 1,
    [BET_TYPES.BLACK]: 1,
    [BET_TYPES.EVEN]: 1,
    [BET_TYPES.ODD]: 1,
    [BET_TYPES.LOW]: 1,
    [BET_TYPES.HIGH]: 1,
    [BET_TYPES.DOZEN_1]: 2,
    [BET_TYPES.DOZEN_2]: 2,
    [BET_TYPES.DOZEN_3]: 2,
    [BET_TYPES.COLUMN_1]: 2,
    [BET_TYPES.COLUMN_2]: 2,
    [BET_TYPES.COLUMN_3]: 2,
});

export function getBetPayout(betType) {
    const payout = BET_PAYOUTS[betType];
    if (payout === undefined) {
        throw new Error(`Unknown bet type: ${betType}`);
    }
    return payout;
}

/** Theoretical win probability for a given bet type on a given wheel. */
export function getBetProbability(betType, rouletteType) {
    switch (betType) {
        case BET_TYPES.STRAIGHT:
            return getSingleNumberProbability(rouletteType);
        case BET_TYPES.RED:
        case BET_TYPES.BLACK:
            return getRedOrBlackProbability(rouletteType);
        case BET_TYPES.EVEN:
        case BET_TYPES.ODD:
        case BET_TYPES.LOW:
        case BET_TYPES.HIGH:
            return getEvenMoneyProbability(rouletteType);
        case BET_TYPES.DOZEN_1:
        case BET_TYPES.DOZEN_2:
        case BET_TYPES.DOZEN_3:
        case BET_TYPES.COLUMN_1:
        case BET_TYPES.COLUMN_2:
        case BET_TYPES.COLUMN_3:
            return getDozenOrColumnProbability(rouletteType);
        default:
            throw new Error(`Unknown bet type: ${betType}`);
    }
}

/**
 * Expected value per unit bet: EV = p*payout - (1-p)*1, expressed as a
 * fraction of the stake (e.g. -0.027 for European even-money).
 */
export function calculateExpectedValue(betType, rouletteType) {
    const p = getBetProbability(betType, rouletteType);
    const payout = getBetPayout(betType);
    return p * payout - (1 - p);
}

/** House edge as a positive fraction (e.g. ~0.027 for European). */
export function getHouseEdge(rouletteType) {
    return -calculateExpectedValue(BET_TYPES.RED, rouletteType);
}
