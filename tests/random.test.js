import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateRandomResult, generateRandomSequence } from '../js/random.js';
import { isValidResult } from '../js/roulette.js';

test('generateRandomResult only ever returns valid European pockets', () => {
    for (let i = 0; i < 500; i++) {
        const result = generateRandomResult('european');
        assert.ok(isValidResult(result, 'european'), `invalid European result: ${result}`);
    }
});

test('generateRandomResult only ever returns valid American pockets', () => {
    for (let i = 0; i < 500; i++) {
        const result = generateRandomResult('american');
        assert.ok(isValidResult(result, 'american'), `invalid American result: ${result}`);
    }
});

test('generateRandomSequence returns the requested number of results', () => {
    const seq = generateRandomSequence('european', 250);
    assert.equal(seq.length, 250);
    for (const r of seq) assert.ok(isValidResult(r, 'european'));
});

test('a large sample eventually covers every pocket (sanity check on distribution)', () => {
    const seen = new Set(generateRandomSequence('american', 2000));
    assert.equal(seen.size, 38);
});
