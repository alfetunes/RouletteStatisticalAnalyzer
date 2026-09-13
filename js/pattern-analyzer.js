// "Pattern Detective": descriptive-only pattern detection over a result
// sample. Every finding is phrased as an observation, never a prediction
// (spec §42-44, §57). Classification is driven purely by z-score magnitude.

import { getColor, getParity } from './roulette.js';
import {
    calculateNumberFrequency,
    calculateColorDistribution,
    calculateParityDistribution,
    calculateDozenDistribution,
    calculateColumnDistribution,
    calculateSequences,
    calculateZScore,
} from './statistics.js';
import { getSingleNumberProbability } from './probability.js';
import {
    EVIDENCE_LEVELS,
    classifyByZScore as sharedClassifyByZScore,
    buildHotNumberInsight,
    buildColdNumberInsight,
    sampleSizeWarning,
    MULTIPLE_TESTING_NOTE,
} from './insight-engine.js';

// Re-exported under the original key names (OBSERVATION/WEAK_EVIDENCE/...)
// for backward compatibility with existing callers, but backed by the
// single shared vocabulary in insight-engine.js (advanced spec §8: avoid
// duplicating the same classification logic per feature).
export const CLASSIFICATIONS = Object.freeze({
    OBSERVATION: EVIDENCE_LEVELS.NONE,
    WEAK_EVIDENCE: EVIDENCE_LEVELS.WEAK,
    MODERATE_DEVIATION: EVIDENCE_LEVELS.MODERATE,
    POTENTIALLY_UNUSUAL: EVIDENCE_LEVELS.STRONG,
});

const classifyByZScore = sharedClassifyByZScore;

function hotAndColdNumbers(results, rouletteType, topN = 5) {
    const freq = calculateNumberFrequency(results, rouletteType);
    const withOccurrences = freq.filter((f) => f.occurrences > 0);
    const sortedDesc = [...withOccurrences].sort((a, b) => b.occurrences - a.occurrences);
    const sortedAsc = [...freq].sort((a, b) => a.occurrences - b.occurrences);
    return {
        hot: sortedDesc.slice(0, topN),
        cold: sortedAsc.slice(0, topN),
    };
}

function numberDeviations(results, rouletteType) {
    const total = results.length;
    const p = getSingleNumberProbability(rouletteType);
    return calculateNumberFrequency(results, rouletteType)
        .map((f) => ({
            ...f,
            zScore: calculateZScore(f.occurrences, total, p),
        }))
        .map((f) => ({ ...f, classification: classifyByZScore(f.zScore) }))
        .filter((f) => f.classification !== CLASSIFICATIONS.OBSERVATION)
        .sort((a, b) => Math.abs(b.zScore ?? 0) - Math.abs(a.zScore ?? 0));
}

function categoryDeviations(distributionRows, total) {
    return distributionRows
        .map((row) => ({
            ...row,
            zScore: calculateZScore(row.count, total, row.expectedPct / 100),
        }))
        .map((row) => ({ ...row, classification: classifyByZScore(row.zScore) }))
        .filter((row) => row.classification !== CLASSIFICATIONS.OBSERVATION)
        .sort((a, b) => Math.abs(b.zScore ?? 0) - Math.abs(a.zScore ?? 0));
}

/**
 * Runs the full descriptive pattern scan over a result sample.
 * @returns {object} structured findings, all labeled as observations
 */
export function analyzePatterns(results, rouletteType) {
    const total = results.length;
    const { hot, cold } = hotAndColdNumbers(results, rouletteType);

    const colorSequences = calculateSequences(results, getColor);
    const paritySequences = calculateSequences(results, getParity);

    const colorImbalance = categoryDeviations(calculateColorDistribution(results, rouletteType), total);
    const parityImbalance = categoryDeviations(calculateParityDistribution(results, rouletteType), total);
    const dozenConcentration = categoryDeviations(calculateDozenDistribution(results, rouletteType), total);
    const columnConcentration = categoryDeviations(calculateColumnDistribution(results, rouletteType), total);
    const numberDeviationList = numberDeviations(results, rouletteType);

    return {
        sampleSize: total,
        hotNumbers: hot,
        coldNumbers: cold,
        longestColorSequences: colorSequences.longest,
        currentColorSequence: { label: colorSequences.current, length: colorSequences.currentLength },
        longestParitySequences: paritySequences.longest,
        currentParitySequence: { label: paritySequences.current, length: paritySequences.currentLength },
        colorImbalance,
        parityImbalance,
        dozenConcentration,
        columnConcentration,
        numberDeviations: numberDeviationList,
    };
}

/**
 * Renders the pattern findings as plain-language observation strings,
 * following the required "descriptive, never predictive" phrasing.
 */
export function buildPatternNarratives(findings) {
    const lines = [];

    if (findings.hotNumbers.length && findings.hotNumbers[0].occurrences > 0) {
        const top = findings.hotNumbers[0];
        lines.push(`${top.result} was the most frequent number in this sample (${top.occurrences} occurrences, ${top.observedPct.toFixed(2)}% observed vs ${top.expectedPct.toFixed(2)}% expected).`);
    }

    for (const dev of findings.colorImbalance) {
        const sign = dev.differencePct > 0 ? 'above' : 'below';
        lines.push(`${capitalize(dev.category)} occurred ${Math.abs(dev.differencePct).toFixed(2)} percentage points ${sign} its mathematical expectation in this sample (${dev.classification}).`);
    }

    for (const dev of findings.dozenConcentration) {
        const sign = dev.differencePct > 0 ? 'more' : 'less';
        lines.push(`The ${ordinal(dev.category)} dozen appeared ${sign} frequently than expected in the selected window (${dev.classification}).`);
    }

    for (const dev of findings.columnConcentration) {
        const sign = dev.differencePct > 0 ? 'more' : 'less';
        lines.push(`The ${ordinal(dev.category)} column appeared ${sign} frequently than expected in the selected window (${dev.classification}).`);
    }

    if (findings.currentColorSequence.length >= 4 && findings.currentColorSequence.label) {
        lines.push(`The current sequence shows ${capitalize(findings.currentColorSequence.label)} appearing ${findings.currentColorSequence.length} times in a row. This is a descriptive observation, not a prediction of the next spin.`);
    }

    lines.push(`The current sample contains ${findings.sampleSize} round${findings.sampleSize === 1 ? '' : 's'}.`);
    lines.push('The observed distribution may differ from the theoretical distribution, but this does not establish that the wheel is biased.');

    const warning = sampleSizeWarning(findings.sampleSize);
    if (warning) lines.push(warning);
    lines.push(MULTIPLE_TESTING_NOTE);

    return lines;
}

/**
 * Structured Observation/Evidence/Interpretation/Limitation insights
 * (advanced spec §33) for the single hottest and coldest numbers in the
 * sample — used by the Statistical Report and can be rendered directly in
 * the UI as a four-line card instead of a single narrative sentence.
 */
export function buildStructuredInsights(findings, rouletteType) {
    const insights = [];
    const total = findings.sampleSize;
    if (findings.hotNumbers.length && findings.hotNumbers[0].occurrences > 0) {
        const top = findings.hotNumbers[0];
        insights.push(buildHotNumberInsight({
            result: top.result,
            occurrences: top.occurrences,
            expectedOccurrences: getSingleNumberProbability(rouletteType) * total,
            sampleSize: total,
        }));
    }
    if (findings.coldNumbers.length) {
        const bottom = findings.coldNumbers[0];
        insights.push(buildColdNumberInsight({
            result: bottom.result,
            roundsSinceLastOccurrence: bottom.roundsSinceLastOccurrence,
        }));
    }
    return insights;
}

function capitalize(s) {
    return typeof s === 'string' && s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function ordinal(n) {
    return { 1: '1st', 2: '2nd', 3: '3rd' }[n] ?? `${n}th`;
}
