import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHistory, MAX_HISTORY_SIZE, filterRounds, sortRounds, paginate } from '../js/history.js';

test('history never exceeds 1000 records and evicts the oldest first', () => {
    const history = createHistory();
    for (let i = 0; i < MAX_HISTORY_SIZE + 50; i++) {
        history.addRound('17', i + 1);
    }
    const all = history.getAll();
    assert.equal(all.length, MAX_HISTORY_SIZE);
    // the first 50 rounds (roundNumber 1-50) should have been evicted
    assert.equal(all[0].roundNumber, 51);
    assert.equal(all[all.length - 1].roundNumber, MAX_HISTORY_SIZE + 50);
});

test('addRound derives color/parity/range/dozen/column from the result', () => {
    const history = createHistory();
    const round = history.addRound('1', 1);
    assert.equal(round.color, 'red');
    assert.equal(round.parity, 'odd');
    assert.equal(round.range, 'low');
    assert.equal(round.dozen, 1);
    assert.equal(round.column, 1);
});

test('filterRounds applies each filter independently', () => {
    const rounds = [
        { result: '1', color: 'red', parity: 'odd', range: 'low', dozen: 1, column: 1 },
        { result: '2', color: 'black', parity: 'even', range: 'low', dozen: 1, column: 2 },
        { result: '0', color: 'green', parity: null, range: null, dozen: null, column: null },
    ];
    assert.equal(filterRounds(rounds, { color: 'red' }).length, 1);
    assert.equal(filterRounds(rounds, { parity: 'even' }).length, 1);
    assert.equal(filterRounds(rounds, { search: '2' }).length, 1);
    assert.equal(filterRounds(rounds, {}).length, 3);
});

test('sortRounds sorts numerically by round and can reverse direction', () => {
    const rounds = [{ roundNumber: 3 }, { roundNumber: 1 }, { roundNumber: 2 }];
    const asc = sortRounds(rounds, 'round', 'asc');
    assert.deepEqual(asc.map((r) => r.roundNumber), [1, 2, 3]);
    const desc = sortRounds(rounds, 'round', 'desc');
    assert.deepEqual(desc.map((r) => r.roundNumber), [3, 2, 1]);
});

test('paginate slices items and clamps page numbers', () => {
    const items = Array.from({ length: 55 }, (_, i) => i);
    const page1 = paginate(items, 1, 25);
    assert.equal(page1.items.length, 25);
    assert.equal(page1.totalPages, 3);

    const overflow = paginate(items, 99, 25);
    assert.equal(overflow.page, 3);
    assert.equal(overflow.items.length, 5);
});
