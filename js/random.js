// Single source of randomness for the entire application. Real spins,
// simulations, and sample/pattern generation must all call generateRandomResult
// so results are always drawn from the exact same process (spec §7).

import { getPockets } from './roulette.js';

/**
 * Returns a cryptographically secure integer in [0, maxExclusive) using
 * rejection sampling, avoiding modulo bias.
 */
function secureRandomInt(maxExclusive) {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new RangeError('maxExclusive must be a positive integer');
    }

    const cryptoObj = globalThis.crypto;
    if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
        throw new Error('Web Crypto API (crypto.getRandomValues) is not available');
    }

    const range = maxExclusive;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8) || 1;
    const maxValid = Math.floor(256 ** bytesNeeded / range) * range - 1;

    const buffer = new Uint8Array(bytesNeeded);
    for (;;) {
        cryptoObj.getRandomValues(buffer);
        let value = 0;
        for (let i = 0; i < bytesNeeded; i++) {
            value = value * 256 + buffer[i];
        }
        if (value <= maxValid) {
            return value % range;
        }
    }
}

/**
 * Generates a single random roulette result for the given roulette type.
 * @param {'european'|'american'} rouletteType
 * @returns {string} pocket label, e.g. "17", "0", "00"
 */
export function generateRandomResult(rouletteType) {
    const pockets = getPockets(rouletteType);
    const index = secureRandomInt(pockets.length);
    return pockets[index];
}

/**
 * Generates a sequence of N independent random results using the same
 * generation logic as a single spin.
 */
export function generateRandomSequence(rouletteType, count) {
    const results = new Array(count);
    for (let i = 0; i < count; i++) {
        results[i] = generateRandomResult(rouletteType);
    }
    return results;
}

export { secureRandomInt };
