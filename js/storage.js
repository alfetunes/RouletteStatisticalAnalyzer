// localStorage persistence with defensive validation. Never trusts stored
// JSON blindly (spec §17) — invalid/corrupted data is dropped and the app
// falls back to sane defaults instead of crashing.

import { ROULETTE_TYPES, isValidResult } from './roulette.js';

export const STORAGE_KEYS = Object.freeze({
    SETTINGS: 'roulette-settings',
    HISTORY: 'roulette-history',
    BANKROLL: 'roulette-bankroll',
});

const DEFAULT_SETTINGS = Object.freeze({
    rouletteType: ROULETTE_TYPES.EUROPEAN,
    betAmount: 10,
    startingBankroll: 1000,
});

function getBackend() {
    return globalThis.localStorage || null;
}

function safeParse(raw) {
    if (typeof raw !== 'string') return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function safeWrite(key, value) {
    const backend = getBackend();
    if (!backend) return false;
    try {
        backend.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

export function loadSettings() {
    const backend = getBackend();
    if (!backend) return { ...DEFAULT_SETTINGS };
    const parsed = safeParse(backend.getItem(STORAGE_KEYS.SETTINGS));
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_SETTINGS };

    const rouletteType = Object.values(ROULETTE_TYPES).includes(parsed.rouletteType)
        ? parsed.rouletteType
        : DEFAULT_SETTINGS.rouletteType;
    const betAmount = Number.isFinite(parsed.betAmount) && parsed.betAmount > 0
        ? parsed.betAmount
        : DEFAULT_SETTINGS.betAmount;
    const startingBankroll = Number.isFinite(parsed.startingBankroll) && parsed.startingBankroll > 0
        ? parsed.startingBankroll
        : DEFAULT_SETTINGS.startingBankroll;

    return { rouletteType, betAmount, startingBankroll };
}

export function saveSettings(settings) {
    return safeWrite(STORAGE_KEYS.SETTINGS, settings);
}

export function loadBankroll(fallback = 1000) {
    const backend = getBackend();
    if (!backend) return fallback;
    const parsed = safeParse(backend.getItem(STORAGE_KEYS.BANKROLL));
    if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed < 0) return fallback;
    return parsed;
}

export function saveBankroll(bankroll) {
    return safeWrite(STORAGE_KEYS.BANKROLL, bankroll);
}

function isValidRoundRecord(record, rouletteType) {
    if (!record || typeof record !== 'object') return false;
    if (typeof record.id !== 'string' && typeof record.id !== 'number') return false;
    if (!Number.isFinite(record.roundNumber)) return false;
    if (typeof record.result !== 'string' || !isValidResult(record.result, rouletteType)) return false;
    if (!['red', 'black', 'green'].includes(record.color)) return false;
    if (typeof record.timestamp !== 'string' || Number.isNaN(Date.parse(record.timestamp))) return false;
    return true;
}

/** Loads and validates history, silently dropping any corrupted records. */
export function loadHistory(rouletteType) {
    const backend = getBackend();
    if (!backend) return [];
    const parsed = safeParse(backend.getItem(STORAGE_KEYS.HISTORY));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((record) => isValidRoundRecord(record, rouletteType)).slice(-1000);
}

export function saveHistory(rounds) {
    return safeWrite(STORAGE_KEYS.HISTORY, rounds.slice(-1000));
}

export function clearAll() {
    const backend = getBackend();
    if (!backend) return;
    Object.values(STORAGE_KEYS).forEach((key) => {
        try {
            backend.removeItem(key);
        } catch {
            /* ignore */
        }
    });
}
