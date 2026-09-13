import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installMemoryStorage } from './helpers.js';
import {
    loadSettings,
    saveSettings,
    loadHistory,
    saveHistory,
    loadBankroll,
    saveBankroll,
    STORAGE_KEYS,
} from '../js/storage.js';

test('loadSettings returns defaults when nothing is stored', () => {
    installMemoryStorage();
    const settings = loadSettings();
    assert.equal(settings.rouletteType, 'european');
    assert.equal(settings.betAmount, 10);
    assert.equal(settings.startingBankroll, 1000);
});

test('saveSettings/loadSettings round-trip valid data', () => {
    installMemoryStorage();
    saveSettings({ rouletteType: 'american', betAmount: 25, startingBankroll: 500 });
    const settings = loadSettings();
    assert.equal(settings.rouletteType, 'american');
    assert.equal(settings.betAmount, 25);
    assert.equal(settings.startingBankroll, 500);
});

test('loadSettings recovers gracefully from corrupted JSON', () => {
    const storage = installMemoryStorage();
    storage.setItem(STORAGE_KEYS.SETTINGS, '{not valid json');
    const settings = loadSettings();
    assert.equal(settings.rouletteType, 'european');
    assert.equal(settings.betAmount, 10);
});

test('loadSettings falls back to defaults for invalid field values', () => {
    const storage = installMemoryStorage();
    storage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ rouletteType: 'martian', betAmount: -5 }));
    const settings = loadSettings();
    assert.equal(settings.rouletteType, 'european');
    assert.equal(settings.betAmount, 10);
});

test('loadHistory drops corrupted or invalid round records instead of throwing', () => {
    const storage = installMemoryStorage();
    const validRound = {
        id: 'a', roundNumber: 1, result: '17', color: 'black', parity: 'odd', range: 'low',
        dozen: 2, column: 2, timestamp: new Date().toISOString(),
    };
    const invalidRound = { id: 'b', result: '99', color: 'red', timestamp: 'not-a-date' };
    storage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([validRound, invalidRound, 'garbage']));

    const history = loadHistory('european');
    assert.equal(history.length, 1);
    assert.equal(history[0].id, 'a');
});

test('loadHistory returns an empty array when storage is not valid JSON', () => {
    const storage = installMemoryStorage();
    storage.setItem(STORAGE_KEYS.HISTORY, 'null');
    assert.deepEqual(loadHistory('european'), []);

    storage.setItem(STORAGE_KEYS.HISTORY, '{"not":"an array"}');
    assert.deepEqual(loadHistory('european'), []);
});

test('saveHistory truncates to the most recent 1000 records', () => {
    installMemoryStorage();
    const rounds = Array.from({ length: 1200 }, (_, i) => ({
        id: String(i), roundNumber: i + 1, result: '1', color: 'red', parity: 'odd',
        range: 'low', dozen: 1, column: 1, timestamp: new Date().toISOString(),
    }));
    saveHistory(rounds);
    const loaded = loadHistory('european');
    assert.equal(loaded.length, 1000);
    assert.equal(loaded[0].roundNumber, 201);
});

test('bankroll persistence round-trips and falls back safely on invalid data', () => {
    const storage = installMemoryStorage();
    saveBankroll(742.5);
    assert.equal(loadBankroll(1000), 742.5);

    storage.setItem(STORAGE_KEYS.BANKROLL, '"not-a-number"');
    assert.equal(loadBankroll(1000), 1000);
});
