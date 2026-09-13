// Round history management: a capped (1000) append-only log of spins, plus
// filter/sort/paginate helpers for the History table UI. No DOM, no storage
// I/O here — see js/storage.js for persistence.

import { describeResult } from './roulette.js';

export const MAX_HISTORY_SIZE = 1000;

function generateId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Creates a new History instance backed by a plain array (spec §15/§16). */
export function createHistory(initialRounds = []) {
    const rounds = [...initialRounds];

    function addRound(result, roundNumber, extra = {}) {
        const derived = describeResult(result);
        const round = {
            id: generateId(),
            roundNumber,
            timestamp: new Date().toISOString(),
            ...derived,
            ...extra,
        };
        rounds.push(round);
        if (rounds.length > MAX_HISTORY_SIZE) {
            rounds.shift();
        }
        return round;
    }

    function getAll() {
        return [...rounds];
    }

    function getRecent(n) {
        return rounds.slice(Math.max(0, rounds.length - n));
    }

    function clear() {
        rounds.length = 0;
    }

    function size() {
        return rounds.length;
    }

    return { addRound, getAll, getRecent, clear, size };
}

/** Applies search + attribute filters to a round list. */
export function filterRounds(rounds, { search, color, parity, range, dozen, column } = {}) {
    return rounds.filter((round) => {
        if (search && !String(round.result).includes(search.trim())) return false;
        if (color && round.color !== color) return false;
        if (parity && round.parity !== parity) return false;
        if (range && round.range !== range) return false;
        if (dozen && round.dozen !== Number(dozen)) return false;
        if (column && round.column !== Number(column)) return false;
        return true;
    });
}

const SORT_ACCESSORS = {
    round: (r) => r.roundNumber,
    number: (r) => Number(r.result === '00' ? -1 : r.result),
    color: (r) => r.color,
    parity: (r) => r.parity ?? '',
    range: (r) => r.range ?? '',
    dozen: (r) => r.dozen ?? -1,
    column: (r) => r.column ?? -1,
    time: (r) => r.timestamp,
};

export function sortRounds(rounds, field = 'round', direction = 'desc') {
    const accessor = SORT_ACCESSORS[field] || SORT_ACCESSORS.round;
    const sorted = [...rounds].sort((a, b) => {
        const av = accessor(a);
        const bv = accessor(b);
        if (av < bv) return -1;
        if (av > bv) return 1;
        return 0;
    });
    return direction === 'desc' ? sorted.reverse() : sorted;
}

export function paginate(rounds, page = 1, pageSize = 25) {
    const totalPages = Math.max(1, Math.ceil(rounds.length / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    return {
        items: rounds.slice(start, start + pageSize),
        page: safePage,
        pageSize,
        totalPages,
        totalItems: rounds.length,
    };
}
