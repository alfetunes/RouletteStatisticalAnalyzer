// Web Worker for heavy, potentially slow computations (advanced spec §38:
// "do not freeze the browser during large simulations" — a Web Worker is
// explicitly preferred here). Runs entirely off the main thread so the UI
// stays interactive during a 1,000,000-round sample generation or a
// 10,000-simulation Monte Carlo run. Loaded as a static local module file —
// no bundler, no external URL (advanced spec §41: Netlify-compatible,
// static-only).
//
// Message protocol (main thread -> worker): { id, type, payload }
// Message protocol (worker -> main thread):
//   { id, kind: 'progress', done, total }
//   { id, kind: 'result', payload }
//   { id, kind: 'error', message }
// `id` lets the client discard stale results from a superseded job
// (advanced spec §63: "no stale simulation result should overwrite a newer
// simulation").

import { generateRandomSequence } from '../random.js';
import { getPockets, getColor } from '../roulette.js';
import { calculateMeanMedianFromFrequency } from '../statistics.js';
import { runMonteCarlo } from '../monte-carlo.js';
import { runPatternDetectorValidation } from '../pattern-validation.js';

const CHUNK_SIZE = 20_000;
const PROGRESS_THROTTLE_MS = 150;

function post(id, kind, data) {
    self.postMessage({ id, kind, ...data });
}

/**
 * Streaming large-sample generation for the Statistical Test Lab (advanced
 * spec §1-§3): generates `size` results in bounded-memory chunks, never
 * holding more than one chunk's worth of raw results at a time, and reports
 * Law-of-Large-Numbers convergence checkpoints as it goes.
 */
function generateSample(id, { rouletteType, size }) {
    const pockets = getPockets(rouletteType);
    const numberCounts = Object.fromEntries(pockets.map((p) => [p, 0]));
    let redCount = 0;
    let blackCount = 0;
    let greenCount = 0;
    const checkpoints = [];
    const checkpointStride = Math.max(1, Math.floor(size / 20));
    let nextCheckpointAt = checkpointStride;

    let generated = 0;
    let lastProgressPost = 0;
    while (generated < size) {
        const chunkSize = Math.min(CHUNK_SIZE, size - generated);
        const chunk = generateRandomSequence(rouletteType, chunkSize);
        for (const r of chunk) {
            numberCounts[r] += 1;
            const color = getColor(r);
            if (color === 'red') redCount += 1;
            else if (color === 'black') blackCount += 1;
            else greenCount += 1;
        }
        generated += chunkSize;

        if (generated >= nextCheckpointAt || generated === size) {
            checkpoints.push({
                n: generated,
                redPct: (redCount / generated) * 100,
                blackPct: (blackCount / generated) * 100,
                greenPct: (greenCount / generated) * 100,
            });
            nextCheckpointAt += checkpointStride;
        }

        const now = Date.now();
        if (now - lastProgressPost > PROGRESS_THROTTLE_MS || generated === size) {
            post(id, 'progress', { done: generated, total: size });
            lastProgressPost = now;
        }
        // `chunk` goes out of scope here — not retained across iterations,
        // so peak memory stays O(CHUNK_SIZE), not O(size) (advanced §39).
    }

    const frequencyEntries = pockets
        .filter((p) => p !== '00')
        .map((p) => ({ value: Number(p), count: numberCounts[p] }));
    const { mean, median } = calculateMeanMedianFromFrequency(frequencyEntries);
    const maxCount = Math.max(...Object.values(numberCounts));
    const modes = pockets.filter((p) => numberCounts[p] === maxCount);

    return {
        rouletteType,
        size,
        numberCounts,
        colorCounts: { red: redCount, black: blackCount, green: greenCount },
        checkpoints,
        mean,
        median,
        modes,
    };
}

self.onmessage = (event) => {
    const { id, type, payload } = event.data;
    try {
        let result;
        switch (type) {
            case 'generateSample':
                result = generateSample(id, payload);
                break;
            case 'monteCarlo': {
                let lastPost = 0;
                result = runMonteCarlo({
                    ...payload,
                    onProgress: (done, total) => {
                        const now = Date.now();
                        if (now - lastPost > PROGRESS_THROTTLE_MS || done === total) {
                            post(id, 'progress', { done, total });
                            lastPost = now;
                        }
                    },
                });
                break;
            }
            case 'patternValidation': {
                let lastPost = 0;
                result = runPatternDetectorValidation({
                    ...payload,
                    onProgress: (done, total) => {
                        const now = Date.now();
                        if (now - lastPost > PROGRESS_THROTTLE_MS || done === total) {
                            post(id, 'progress', { done, total });
                            lastPost = now;
                        }
                    },
                });
                break;
            }
            default:
                throw new Error(`Unknown worker job type: ${type}`);
        }
        post(id, 'result', { payload: result });
    } catch (err) {
        post(id, 'error', { message: err instanceof Error ? err.message : String(err) });
    }
};
