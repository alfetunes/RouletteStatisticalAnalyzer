import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCsv, parseCsv } from '../js/export.js';

test('buildCsv produces a header plus one row per round', () => {
    const rounds = [
        { roundNumber: 1, result: '17', color: 'black', parity: 'odd', range: 'low', dozen: 2, column: 2, timestamp: '2026-01-01T00:00:00.000Z' },
    ];
    const csv = buildCsv(rounds);
    const lines = csv.split('\n');
    assert.equal(lines.length, 2);
    assert.match(lines[0], /roundNumber,result,color/);
    assert.match(lines[1], /^1,17,black,odd,low,2,2,/);
});

test('parseCsv accepts valid rows and derives color/parity/etc from the result', () => {
    const csv = 'result\n17\n0\n32';
    const { records, errors } = parseCsv(csv, 'european');
    assert.equal(errors.length, 0);
    assert.equal(records.length, 3);
    assert.equal(records[0].color, 'black');
    assert.equal(records[1].color, 'green');
    assert.equal(records[2].color, 'red');
});

test('parseCsv rejects "00" for European roulette but accepts it for American', () => {
    const csv = 'result\n00';
    const european = parseCsv(csv, 'european');
    assert.equal(european.records.length, 0);
    assert.equal(european.errors.length, 1);

    const american = parseCsv(csv, 'american');
    assert.equal(american.records.length, 1);
    assert.equal(american.records[0].color, 'green');
});

test('parseCsv skips invalid rows without throwing and reports errors', () => {
    const csv = 'result\n17\n99\nnotanumber\n';
    const { records, errors } = parseCsv(csv, 'european');
    assert.equal(records.length, 1);
    assert.equal(errors.length, 2);
});

test('parseCsv rejects a file missing the required "result" column', () => {
    const csv = 'foo,bar\n1,2';
    const { records, errors } = parseCsv(csv, 'european');
    assert.equal(records.length, 0);
    assert.ok(errors[0].includes('result'));
});

test('parseCsv caps imports at 1000 records and reports truncation', () => {
    const rows = Array.from({ length: 1100 }, () => '17').join('\n');
    const csv = `result\n${rows}`;
    const { records, truncated } = parseCsv(csv, 'european');
    assert.equal(records.length, 1000);
    assert.equal(truncated, true);
});

test('buildCsv -> parseCsv round-trips result values', () => {
    const rounds = [
        { roundNumber: 1, result: '00', color: 'green', parity: null, range: null, dozen: null, column: null, timestamp: new Date().toISOString() },
    ];
    const csv = buildCsv(rounds);
    const { records, errors } = parseCsv(csv, 'american');
    assert.equal(errors.length, 0);
    assert.equal(records[0].result, '00');
});
