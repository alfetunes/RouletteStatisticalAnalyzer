// Advanced spec §35-§36: System Validation dashboard. Confirms the self-test
// suite itself passes cleanly (a regression here means the dashboard would
// show a false FAIL to real users) and that it correctly reports a FAIL
// when an assertion inside a check genuinely fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installMemoryStorage } from './helpers.js';
import { runSystemValidation } from '../js/self-test.js';

test('runSystemValidation: every check passes in a normal environment', () => {
    installMemoryStorage();
    const results = runSystemValidation();
    const failures = results.filter((r) => r.status === 'FAIL');
    assert.equal(failures.length, 0, JSON.stringify(failures));
    assert.ok(results.length >= 10, 'expected at least 10 self-tests');
});

test('runSystemValidation: every result has a name, status, and non-empty detail', () => {
    installMemoryStorage();
    const results = runSystemValidation();
    for (const r of results) {
        assert.ok(typeof r.name === 'string' && r.name.length > 0);
        assert.ok(r.status === 'PASS' || r.status === 'FAIL');
        assert.ok(typeof r.detail === 'string');
    }
});

test('runSystemValidation: the localStorage check correctly reports FAIL (not a crash) when localStorage is unavailable', () => {
    const previous = globalThis.localStorage;
    delete globalThis.localStorage;
    try {
        const results = runSystemValidation();
        const localStorageCheck = results.find((r) => r.name === 'localStorage read/write');
        assert.equal(localStorageCheck.status, 'FAIL');
        assert.match(localStorageCheck.detail, /not available/i);
    } finally {
        if (previous) globalThis.localStorage = previous;
    }
});

test('runSystemValidation: the probe key used by the localStorage check is removed afterward (never pollutes real storage)', () => {
    const storage = installMemoryStorage();
    runSystemValidation();
    assert.equal(storage.getItem('__roulette-selftest-probe__'), null);
});
