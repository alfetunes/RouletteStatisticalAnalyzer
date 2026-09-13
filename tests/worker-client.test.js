// Advanced spec §38/§63: heavy-compute job orchestration. Node has no
// `Worker` global, so every job here automatically exercises the
// synchronous main-thread fallback path — which is exactly the code path
// that must also be correct for browsers where Worker construction fails.
// The stale-job-discarding contract (spec §63: "no stale simulation result
// should overwrite a newer simulation") is the same code regardless of
// which execution path is used, so it's fully covered here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runHeavyJob } from '../js/worker-client.js';

test('runHeavyJob (sync fallback) generateSample returns a complete, valid result', async () => {
    const result = await runHeavyJob('lab-test-1', 'generateSample', { rouletteType: 'european', size: 3000 });
    assert.equal(result.rouletteType, 'european');
    assert.equal(result.size, 3000);
    const totalCounted = Object.values(result.numberCounts).reduce((a, b) => a + b, 0);
    assert.equal(totalCounted, 3000);
    assert.equal(result.colorCounts.red + result.colorCounts.black + result.colorCounts.green, 3000);
    assert.ok(result.mean > 0 && result.mean < 37);
    assert.ok(Array.isArray(result.modes) && result.modes.length > 0);
});

test('runHeavyJob (sync fallback) monteCarlo delegates correctly and returns a valid Monte Carlo report', async () => {
    const result = await runHeavyJob('mc-test-1', 'monteCarlo', {
        rouletteType: 'european', simulations: 100, spinsPerSimulation: 50,
        betType: 'red', betAmount: 10, startingBankroll: 1000,
    });
    assert.equal(result.finalBankrolls.length, 100);
    assert.equal(result.wins + result.losses, 100 * 50);
});

test('runHeavyJob (sync fallback) patternValidation delegates correctly', async () => {
    const result = await runHeavyJob('pv-test-1', 'patternValidation', {
        datasetCount: 15, roundsPerDataset: 200, rouletteType: 'european',
    });
    assert.equal(result.datasetCount, 15);
    assert.ok(Array.isArray(result.detectorTriggerRates));
});

test('runHeavyJob discards a superseded job on the same channel (spec §63)', async () => {
    const first = runHeavyJob('same-channel', 'generateSample', { rouletteType: 'european', size: 2000 });
    const second = runHeavyJob('same-channel', 'generateSample', { rouletteType: 'american', size: 2000 });
    const [firstResult, secondResult] = await Promise.all([first, second]);
    assert.equal(firstResult, undefined, 'the first (superseded) job must resolve to undefined, not overwrite state');
    assert.equal(secondResult.rouletteType, 'american');
});

test('runHeavyJob on different channels does not interfere with each other', async () => {
    const a = runHeavyJob('channel-a', 'generateSample', { rouletteType: 'european', size: 1000 });
    const b = runHeavyJob('channel-b', 'generateSample', { rouletteType: 'american', size: 1000 });
    const [resultA, resultB] = await Promise.all([a, b]);
    assert.equal(resultA.rouletteType, 'european');
    assert.equal(resultB.rouletteType, 'american');
});

test('runHeavyJob reports progress callbacks that reach (done === total) by completion', async () => {
    const progressCalls = [];
    await runHeavyJob('progress-test', 'monteCarlo', {
        rouletteType: 'european', simulations: 50, spinsPerSimulation: 20,
        betType: 'black', betAmount: 5, startingBankroll: 500,
    }, (done, total) => progressCalls.push([done, total]));
    assert.ok(progressCalls.length > 0);
    const last = progressCalls[progressCalls.length - 1];
    assert.equal(last[0], last[1]);
});

test('a superseded job never invokes its stale onProgress callback after being superseded', async () => {
    const staleProgress = [];
    const first = runHeavyJob('progress-race', 'monteCarlo', {
        rouletteType: 'european', simulations: 200, spinsPerSimulation: 100,
        betType: 'red', betAmount: 10, startingBankroll: 1000,
    }, (done, total) => staleProgress.push([done, total]));
    // Immediately supersede it before it can resolve.
    const second = runHeavyJob('progress-race', 'generateSample', { rouletteType: 'european', size: 10 });
    await Promise.all([first, second]);
    // The synchronous fallback runs to completion before yielding, so the
    // first job's progress callback (guarded by staleness) should never
    // have fired at all once superseded — it only reports at 100% via a
    // single call in the sync path, and that call must be suppressed.
    assert.equal(staleProgress.length, 0, `expected the superseded job's progress callback to be fully suppressed, got ${JSON.stringify(staleProgress)}`);
});
