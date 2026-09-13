// Main-thread client for js/workers/heavy-compute.worker.js (advanced spec
// §38/§63). Wraps postMessage/onmessage in a Promise API, and — critically —
// tracks the latest job id per "channel" (lab / monte-carlo / pattern
// validation) so a slow job's result arriving after a newer job was started
// on the same channel is discarded instead of overwriting fresher UI state.
//
// If constructing a module Worker throws (some older/restrictive browser
// environments), falls back to running the same pure functions
// synchronously on the main thread — slower and can briefly block the UI
// for the largest presets, but never breaks the feature outright.

import { generateRandomSequence } from './random.js';
import { getPockets, getColor } from './roulette.js';
import { calculateMeanMedianFromFrequency } from './statistics.js';
import { runMonteCarlo } from './monte-carlo.js';
import { runPatternDetectorValidation } from './pattern-validation.js';

let worker = null;
let workerInitFailed = false;
let nextJobId = 1;
const pendingJobs = new Map(); // id -> { resolve, reject, onProgress }
const latestJobIdByChannel = new Map(); // channel -> id

function getWorker() {
    if (worker || workerInitFailed) return worker;
    try {
        worker = new Worker(new URL('./workers/heavy-compute.worker.js', import.meta.url), { type: 'module' });
        worker.onmessage = (event) => {
            const { id, kind, ...rest } = event.data;
            const job = pendingJobs.get(id);
            if (!job) return; // job was already resolved/rejected or superseded and cleaned up
            if (kind === 'progress') {
                job.onProgress?.(rest.done, rest.total);
            } else if (kind === 'result') {
                pendingJobs.delete(id);
                job.resolve(rest.payload);
            } else if (kind === 'error') {
                pendingJobs.delete(id);
                job.reject(new Error(rest.message));
            }
        };
        worker.onerror = (event) => {
            // A worker-level error (e.g. a syntax error in the module) fails
            // every job currently in flight rather than hanging forever.
            for (const [, job] of pendingJobs) job.reject(new Error(event.message || 'Worker error'));
            pendingJobs.clear();
        };
    } catch {
        workerInitFailed = true;
        worker = null;
    }
    return worker;
}

/** Synchronous main-thread fallback for generateSample, mirroring the worker's streaming logic. */
function generateSampleSync({ rouletteType, size }, onProgress) {
    const pockets = getPockets(rouletteType);
    const numberCounts = Object.fromEntries(pockets.map((p) => [p, 0]));
    let redCount = 0, blackCount = 0, greenCount = 0;
    const results = generateRandomSequence(rouletteType, size);
    for (const r of results) {
        numberCounts[r] += 1;
        const color = getColor(r);
        if (color === 'red') redCount += 1;
        else if (color === 'black') blackCount += 1;
        else greenCount += 1;
    }
    onProgress?.(size, size);
    const frequencyEntries = pockets.filter((p) => p !== '00').map((p) => ({ value: Number(p), count: numberCounts[p] }));
    const { mean, median } = calculateMeanMedianFromFrequency(frequencyEntries);
    const maxCount = Math.max(...Object.values(numberCounts));
    const modes = pockets.filter((p) => numberCounts[p] === maxCount);
    return { rouletteType, size, numberCounts, colorCounts: { red: redCount, black: blackCount, green: greenCount }, checkpoints: [], mean, median, modes };
}

const SYNC_FALLBACKS = {
    generateSample: (payload, onProgress) => generateSampleSync(payload, onProgress),
    monteCarlo: (payload, onProgress) => runMonteCarlo({ ...payload, onProgress }),
    patternValidation: (payload, onProgress) => runPatternDetectorValidation({ ...payload, onProgress }),
};

/**
 * Runs a heavy job (either in the Web Worker, or synchronously as a
 * fallback), superseding any earlier in-flight job on the same `channel`.
 * @param {string} channel a stable name grouping mutually-exclusive jobs
 *   (e.g. "statistical-test-lab", "monte-carlo-lab") so starting a new job
 *   invalidates the previous one's eventual result.
 * @param {'generateSample'|'monteCarlo'|'patternValidation'} type
 * @param {object} payload
 * @param {(done: number, total: number) => void} [onProgress]
 * @returns {Promise<object>} resolves with the job's result, or never
 *   resolves/rejects if superseded (caller should ignore the dangling
 *   promise rather than await it blockingly after starting a new job)
 */
export function runHeavyJob(channel, type, payload, onProgress) {
    const id = nextJobId++;
    latestJobIdByChannel.set(channel, id);

    const isStale = () => latestJobIdByChannel.get(channel) !== id;
    const guardedProgress = (done, total) => {
        if (!isStale()) onProgress?.(done, total);
    };

    const w = getWorker();
    if (w) {
        return new Promise((resolve, reject) => {
            pendingJobs.set(id, {
                onProgress: guardedProgress,
                resolve: (result) => (isStale() ? undefined : resolve(result)),
                reject: (err) => (isStale() ? undefined : reject(err)),
            });
            w.postMessage({ id, type, payload });
        });
    }

    // Synchronous fallback: still respects the staleness contract, even
    // though there's no real concurrency to race against on this path.
    return Promise.resolve().then(() => {
        if (isStale()) return undefined;
        const result = SYNC_FALLBACKS[type](payload, guardedProgress);
        return isStale() ? undefined : result;
    });
}
