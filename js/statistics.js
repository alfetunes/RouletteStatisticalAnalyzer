// Pure descriptive statistics over arrays of roulette results. Operates only
// on plain pocket-label strings (e.g. "17", "0", "00") plus roulette-type
// metadata — no DOM, no localStorage, no randomness (spec §65).

import { getPockets, getColor, getParity, getRange, getDozen, getColumn } from './roulette.js';
import { getSingleNumberProbability, getRedOrBlackProbability, getGreenProbability, getDozenOrColumnProbability } from './probability.js';

/** Numeric value of a pocket for arithmetic stats; null for "00" (spec §29/§63). */
export function toNumericValue(result) {
    if (result === '00') return null;
    return Number(result);
}

export function calculateMean(results) {
    const values = results.map(toNumericValue).filter((v) => v !== null);
    const excluded = results.length - values.length;
    if (values.length === 0) return { mean: null, count: 0, excluded };
    const sum = values.reduce((a, b) => a + b, 0);
    return { mean: sum / values.length, count: values.length, excluded };
}

export function calculateMedian(results) {
    const values = results.map(toNumericValue).filter((v) => v !== null).sort((a, b) => a - b);
    const excluded = results.length - values.length;
    if (values.length === 0) return { median: null, count: 0, excluded };
    const mid = Math.floor(values.length / 2);
    const median = values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
    return { median, count: values.length, excluded };
}

export function calculateStandardDeviation(results) {
    const { mean, count } = calculateMean(results);
    if (mean === null || count < 2) return null;
    const values = results.map(toNumericValue).filter((v) => v !== null);
    const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (count - 1);
    return Math.sqrt(variance);
}

/** Returns all modes (ties included) among raw pocket labels. */
export function calculateMode(results) {
    if (results.length === 0) return { modes: [], count: 0 };
    const counts = new Map();
    for (const r of results) counts.set(r, (counts.get(r) || 0) + 1);
    const maxCount = Math.max(...counts.values());
    const modes = [...counts.entries()].filter(([, c]) => c === maxCount).map(([result]) => result);
    return { modes, count: maxCount };
}

/** Top-N most frequent pockets, sorted descending, ties broken by pocket label. */
export function calculateTopN(results, n) {
    const counts = new Map();
    for (const r of results) counts.set(r, (counts.get(r) || 0) + 1);
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { numeric: true }))
        .slice(0, n)
        .map(([result, count]) => ({ result, count }));
}

/**
 * Per-number frequency table with observed vs expected percentage, gaps, and
 * last-occurrence tracking (spec §24, §41).
 */
export function calculateNumberFrequency(results, rouletteType) {
    const pockets = getPockets(rouletteType);
    const expectedProbability = getSingleNumberProbability(rouletteType);
    const total = results.length;

    const table = new Map(pockets.map((p) => [p, {
        result: p,
        occurrences: 0,
        indices: [],
    }]));

    results.forEach((r, i) => {
        const entry = table.get(r);
        if (entry) {
            entry.occurrences += 1;
            entry.indices.push(i);
        }
    });

    return pockets.map((p) => {
        const entry = table.get(p);
        const observedPct = total > 0 ? (entry.occurrences / total) * 100 : 0;
        const expectedPct = expectedProbability * 100;
        const gaps = entry.indices.slice(1).map((idx, i) => idx - entry.indices[i]);
        const lastIndex = entry.indices.length ? entry.indices[entry.indices.length - 1] : null;
        const roundsSinceLast = lastIndex === null ? null : total - 1 - lastIndex;

        return {
            result: p,
            occurrences: entry.occurrences,
            observedPct,
            expectedPct,
            differencePct: observedPct - expectedPct,
            roundsSinceLastOccurrence: roundsSinceLast,
            averageGap: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null,
            minGap: gaps.length ? Math.min(...gaps) : null,
            maxGap: gaps.length ? Math.max(...gaps) : null,
            medianGap: gaps.length ? median(gaps) : null,
        };
    });
}

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Denominator is always the full sample (zero/00 included), matching how the
// spec expresses expected percentages (e.g. red = 18/37 ≈ 48.65%, not 50%);
// categories a classifier maps null to (zero/00) simply don't add to any bucket.
function distribution(results, classify, categories, expectedFractions) {
    const total = results.length;
    const counts = new Map(categories.map((c) => [c, 0]));
    for (const r of results) {
        const c = classify(r);
        if (counts.has(c)) counts.set(c, counts.get(c) + 1);
    }
    return categories.map((c) => {
        const count = counts.get(c);
        const observedPct = total > 0 ? (count / total) * 100 : 0;
        const expectedPct = expectedFractions[c] * 100;
        return { category: c, count, observedPct, expectedPct, differencePct: observedPct - expectedPct };
    });
}

export function calculateColorDistribution(results, rouletteType) {
    const green = getGreenProbability(rouletteType);
    const redBlack = getRedOrBlackProbability(rouletteType);
    return distribution(results, getColor, ['red', 'black', 'green'], { red: redBlack, black: redBlack, green });
}

export function calculateParityDistribution(results, rouletteType) {
    const evenMoney = getRedOrBlackProbability(rouletteType);
    return distribution(results, getParity, ['even', 'odd'], { even: evenMoney, odd: evenMoney });
}

export function calculateRangeDistribution(results, rouletteType) {
    const evenMoney = getRedOrBlackProbability(rouletteType);
    return distribution(results, getRange, ['low', 'high'], { low: evenMoney, high: evenMoney });
}

export function calculateDozenDistribution(results, rouletteType) {
    const dozenProbability = getDozenOrColumnProbability(rouletteType);
    return distribution(results, getDozen, [1, 2, 3], { 1: dozenProbability, 2: dozenProbability, 3: dozenProbability });
}

export function calculateColumnDistribution(results, rouletteType) {
    const columnProbability = getDozenOrColumnProbability(rouletteType);
    return distribution(results, getColumn, [1, 2, 3], { 1: columnProbability, 2: columnProbability, 3: columnProbability });
}

/**
 * Streak analysis for a binary/ternary classifier (e.g. getColor, getParity).
 * Ignores results where the classifier returns null (e.g. zero for parity).
 */
export function calculateSequences(results, classify) {
    const labeled = results.map(classify).filter((v) => v !== null);
    if (labeled.length === 0) {
        return { current: null, currentLength: 0, longest: {}, averageLength: 0, lengthFrequency: {} };
    }

    const runs = [];
    let currentLabel = labeled[0];
    let currentLength = 1;
    for (let i = 1; i < labeled.length; i++) {
        if (labeled[i] === currentLabel) {
            currentLength += 1;
        } else {
            runs.push({ label: currentLabel, length: currentLength });
            currentLabel = labeled[i];
            currentLength = 1;
        }
    }
    runs.push({ label: currentLabel, length: currentLength });

    const longest = {};
    const lengthFrequency = {};
    const totalsByLabel = {};
    for (const run of runs) {
        longest[run.label] = Math.max(longest[run.label] || 0, run.length);
        lengthFrequency[run.length] = (lengthFrequency[run.length] || 0) + 1;
        totalsByLabel[run.label] = totalsByLabel[run.label] || { sum: 0, count: 0 };
        totalsByLabel[run.label].sum += run.length;
        totalsByLabel[run.label].count += 1;
    }
    const lastRun = runs[runs.length - 1];

    return {
        current: lastRun.label,
        currentLength: lastRun.length,
        longest,
        averageLength: runs.reduce((a, r) => a + r.length, 0) / runs.length,
        lengthFrequency,
        runs,
    };
}

/** Detects immediate and near-term repetitions of the same number (spec §40). */
export function calculateRepetitions(results) {
    let immediate = 0;
    let within2 = 0;
    let within3 = 0;
    const pairs = new Map();
    const triplets = new Map();

    for (let i = 1; i < results.length; i++) {
        if (results[i] === results[i - 1]) immediate += 1;
        if (i >= 2 && results[i] === results[i - 2]) within2 += 1;
        if (i >= 3 && results[i] === results[i - 3]) within3 += 1;
    }
    for (let i = 1; i < results.length; i++) {
        const key = `${results[i - 1]}-${results[i]}`;
        pairs.set(key, (pairs.get(key) || 0) + 1);
    }
    for (let i = 2; i < results.length; i++) {
        const key = `${results[i - 2]}-${results[i - 1]}-${results[i]}`;
        triplets.set(key, (triplets.get(key) || 0) + 1);
    }

    return {
        immediateRepeats: immediate,
        within2Rounds: within2,
        within3Rounds: within3,
        repeatedPairs: [...pairs.entries()].filter(([, c]) => c > 1).map(([pair, count]) => ({ pair, count })),
        repeatedTriplets: [...triplets.entries()].filter(([, c]) => c > 1).map(([triplet, count]) => ({ triplet, count })),
    };
}

export function calculateRollingMean(results, windowSize) {
    const values = results.map(toNumericValue);
    const output = [];
    for (let i = 0; i < values.length; i++) {
        const start = Math.max(0, i - windowSize + 1);
        const windowValues = values.slice(start, i + 1).filter((v) => v !== null);
        output.push(windowValues.length ? windowValues.reduce((a, b) => a + b, 0) / windowValues.length : null);
    }
    return output;
}

export function calculateRollingPercentage(results, windowSize, classify, targetLabel) {
    const output = [];
    for (let i = 0; i < results.length; i++) {
        const start = Math.max(0, i - windowSize + 1);
        const windowResults = results.slice(start, i + 1);
        const relevant = windowResults.filter((r) => classify(r) !== null);
        const hits = relevant.filter((r) => classify(r) === targetLabel);
        output.push(relevant.length ? (hits.length / relevant.length) * 100 : null);
    }
    return output;
}

/**
 * Chi-square goodness-of-fit test against a uniform (or given) expected
 * distribution. Returns null if the sample is too small to be meaningful.
 */
export function calculateChiSquare(observedCounts, expectedFractions, minExpectedPerCategory = 5) {
    const total = observedCounts.reduce((a, b) => a + b, 0);
    const expectedCounts = expectedFractions.map((f) => f * total);
    if (total === 0 || expectedCounts.some((e) => e < minExpectedPerCategory)) {
        return { chiSquare: null, degreesOfFreedom: observedCounts.length - 1, insufficientSample: true };
    }
    const chiSquare = observedCounts.reduce((acc, obs, i) => acc + (obs - expectedCounts[i]) ** 2 / expectedCounts[i], 0);
    return { chiSquare, degreesOfFreedom: observedCounts.length - 1, insufficientSample: false };
}

/** Z-score approximation for a single proportion vs its expected value. */
export function calculateZScore(observedCount, sampleSize, expectedProbability) {
    if (sampleSize === 0) return null;
    const observedProbability = observedCount / sampleSize;
    const standardError = Math.sqrt((expectedProbability * (1 - expectedProbability)) / sampleSize);
    if (standardError === 0) return null;
    return (observedProbability - expectedProbability) / standardError;
}

/** Wilson score confidence interval for a proportion (default 95%). */
export function calculateConfidenceInterval(observedCount, sampleSize, confidence = 0.95) {
    if (sampleSize === 0) return null;
    const z = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.645;
    const p = observedCount / sampleSize;
    const n = sampleSize;
    const denominator = 1 + (z ** 2) / n;
    const center = p + (z ** 2) / (2 * n);
    const margin = z * Math.sqrt((p * (1 - p)) / n + (z ** 2) / (4 * n ** 2));
    return {
        lower: Math.max(0, (center - margin) / denominator),
        upper: Math.min(1, (center + margin) / denominator),
    };
}

/** Maximum peak-to-trough drop in a bankroll/value series (spec §54). */
export function calculateMaxDrawdown(series) {
    if (!series.length) return 0;
    let peak = series[0];
    let maxDrawdown = 0;
    for (const value of series) {
        peak = Math.max(peak, value);
        maxDrawdown = Math.max(maxDrawdown, peak - value);
    }
    return maxDrawdown;
}

// --- Chi-square p-value (regularized incomplete gamma function, Lanczos
// approximation for log-gamma). This is a genuine second numerical method
// from the chi-square statistic itself — it lets the Wheel Bias Analyzer and
// Statistical Report state a plain-language p-value instead of only the raw
// statistic (advanced spec §17-§18). It is independently exercised in
// tests/independent-validation.test.js against a from-scratch reference
// implementation that shares no code with this one. ---

function logGamma(x) {
    const cof = [
        676.5203681218851, -1259.1392167224028, 771.32342877765313,
        -176.61502916214059, 12.507343278686905, -0.13857109526572012,
        9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    if (x < 0.5) {
        return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
    }
    x -= 1;
    let a = 0.99999999999980993;
    const t = x + 7.5;
    for (let i = 0; i < cof.length; i++) a += cof[i] / (x + i + 1);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function lowerIncompleteGammaSeries(a, x) {
    let sum = 1 / a;
    let term = sum;
    for (let n = 1; n < 500; n++) {
        term *= x / (a + n);
        sum += term;
        if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
}

function upperIncompleteGammaContinuedFraction(a, x) {
    let b = x + 1 - a;
    let c = 1e300;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i < 500; i++) {
        const an = -i * (i - a);
        b += 2;
        d = an * d + b;
        if (Math.abs(d) < 1e-300) d = 1e-300;
        c = b + an / c;
        if (Math.abs(c) < 1e-300) c = 1e-300;
        d = 1 / d;
        const delta = d * c;
        h *= delta;
        if (Math.abs(delta - 1) < 1e-15) break;
    }
    return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

/**
 * Upper-tail p-value of the chi-square distribution: P(X >= chiSquare) for
 * the given degrees of freedom. Returns 1 for chiSquare <= 0 (or null input).
 */
export function calculateChiSquarePValue(chiSquare, degreesOfFreedom) {
    if (chiSquare === null || degreesOfFreedom <= 0) return null;
    const a = degreesOfFreedom / 2;
    const x = chiSquare / 2;
    if (x <= 0) return 1;
    const p = x < a + 1 ? 1 - lowerIncompleteGammaSeries(a, x) : upperIncompleteGammaContinuedFraction(a, x);
    return Math.min(1, Math.max(0, p));
}

/** Standardized (Pearson) residual per category: (observed-expected)/sqrt(expected*(1-p)). */
export function calculateStandardizedResiduals(observedCounts, expectedFractions) {
    const total = observedCounts.reduce((a, b) => a + b, 0);
    return observedCounts.map((obs, i) => {
        const p = expectedFractions[i];
        const expected = p * total;
        const denominator = Math.sqrt(expected * (1 - p));
        return denominator > 0 ? (obs - expected) / denominator : null;
    });
}

/**
 * Percentile of a numeric array using linear interpolation between closest
 * ranks (the "R type 7" / Excel PERCENTILE.INC method — documented here
 * since spec §53 asks for the methodology to be stated explicitly).
 * @param {number[]} values
 * @param {number} p a value in [0, 100]
 */
export function calculatePercentile(values, p) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    if (p <= 0) return sorted[0];
    if (p >= 100) return sorted[sorted.length - 1];
    const rank = (p / 100) * (sorted.length - 1);
    const lowerIndex = Math.floor(rank);
    const upperIndex = Math.ceil(rank);
    if (lowerIndex === upperIndex) return sorted[lowerIndex];
    const fraction = rank - lowerIndex;
    return sorted[lowerIndex] + fraction * (sorted[upperIndex] - sorted[lowerIndex]);
}

/** Theoretical probability of `n` consecutive independent hits of an event with probability `p` (spec §12). Educational only — never used to recommend betting. */
export function calculateSequenceProbability(p, n) {
    return p ** n;
}

/**
 * Exact mean/median computed from a {value, count} frequency table instead
 * of a raw array of every observation. Roulette results are drawn from a
 * small fixed alphabet (37/38 pockets), so a running per-pocket count is
 * enough to reconstruct the exact mean and median in O(distinct values)
 * time/space — this lets a 1,000,000+ round summary be computed via
 * streaming aggregation instead of holding every round in memory at once
 * (advanced spec §39). Used by the Statistical Test Lab's large-sample
 * generator; `value` must already be numeric (callers exclude "00" before
 * calling, same convention as `toNumericValue`).
 * @param {{value: number, count: number}[]} frequencyEntries
 */
export function calculateMeanMedianFromFrequency(frequencyEntries) {
    const total = frequencyEntries.reduce((acc, e) => acc + e.count, 0);
    if (total === 0) return { mean: null, median: null, count: 0 };

    const sum = frequencyEntries.reduce((acc, e) => acc + e.value * e.count, 0);
    const mean = sum / total;

    const sorted = [...frequencyEntries].sort((a, b) => a.value - b.value);
    const lowRank = Math.floor((total - 1) / 2) + 1;
    const highRank = Math.floor(total / 2) + 1;
    let cumulative = 0;
    let lowValue = null;
    let highValue = null;
    for (const entry of sorted) {
        cumulative += entry.count;
        if (lowValue === null && cumulative >= lowRank) lowValue = entry.value;
        if (highValue === null && cumulative >= highRank) highValue = entry.value;
        if (lowValue !== null && highValue !== null) break;
    }
    return { mean, median: (lowValue + highValue) / 2, count: total };
}

export function getSampleSizeLabel(n) {
    if (n <= 30) return 'Very small sample';
    if (n <= 100) return 'Small sample';
    if (n <= 250) return 'Moderate sample';
    if (n <= 500) return 'Good sample';
    return 'Large sample for this tool';
}
