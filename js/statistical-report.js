// Statistical Report (advanced spec §34): assembles a single structured
// summary of a result sample — probabilities, descriptive statistics,
// sequences/gaps/repetitions, bias analysis, and (if supplied) a Monte
// Carlo result — then serializes it as CSV, JSON, or a printable HTML
// string. Pure data/string building only; triggering an actual download or
// print dialog is the caller's job (see js/export.js's triggerCsvDownload
// pattern), keeping this module testable in Node.

import { getColor, getParity } from './roulette.js';
import { getSingleNumberProbability, getRedOrBlackProbability, getGreenProbability } from './probability.js';
import { calculateMean, calculateMedian, calculateMode, calculateSequences, calculateRepetitions } from './statistics.js';
import { analyzePatterns, buildPatternNarratives } from './pattern-analyzer.js';
import { analyzeWheelBias } from './bias-analyzer.js';
import { escapeCsvField } from './export.js';

/**
 * Builds the full structured report for a sample.
 * @param {string[]} results pocket-label results
 * @param {'european'|'american'} rouletteType
 * @param {object} [options]
 * @param {object} [options.monteCarloResult] a result from js/monte-carlo.js's runMonteCarlo, if available
 */
export function buildStatisticalReport(results, rouletteType, options = {}) {
    const sampleSize = results.length;
    const pattern = analyzePatterns(results, rouletteType);
    const bias = analyzeWheelBias(results, rouletteType);
    const colorSequences = calculateSequences(results, getColor);
    const paritySequences = calculateSequences(results, getParity);
    const repetitions = calculateRepetitions(results);

    return {
        generatedAt: new Date().toISOString(),
        rouletteType,
        sampleSize,
        theoreticalProbabilities: {
            singleNumber: getSingleNumberProbability(rouletteType),
            red: getRedOrBlackProbability(rouletteType),
            black: getRedOrBlackProbability(rouletteType),
            green: getGreenProbability(rouletteType),
        },
        descriptiveStatistics: {
            mean: calculateMean(results),
            median: calculateMedian(results),
            mode: calculateMode(results),
        },
        topNumbers: pattern.hotNumbers,
        bottomNumbers: pattern.coldNumbers,
        sequences: {
            color: colorSequences,
            parity: paritySequences,
        },
        repetitions,
        biasAnalysis: bias,
        potentialAnomalies: [
            ...pattern.numberDeviations,
            ...pattern.colorImbalance,
            ...pattern.parityImbalance,
            ...pattern.dozenConcentration,
            ...pattern.columnConcentration,
        ],
        narratives: buildPatternNarratives(pattern),
        monteCarloResult: options.monteCarloResult ?? null,
    };
}

/** Flat key/value CSV rendering of the report's headline numbers (not the full anomaly tables — those export separately via export.js's history CSV). */
export function buildReportCsv(report) {
    const rows = [
        ['Generated at', report.generatedAt],
        ['Roulette type', report.rouletteType],
        ['Sample size', report.sampleSize],
        ['Theoretical P(single number)', report.theoreticalProbabilities.singleNumber],
        ['Theoretical P(red)', report.theoreticalProbabilities.red],
        ['Theoretical P(green)', report.theoreticalProbabilities.green],
        ['Mean', report.descriptiveStatistics.mean.mean],
        ['Median', report.descriptiveStatistics.median.median],
        ['Mode(s)', report.descriptiveStatistics.mode.modes.join('; ')],
        ['Chi-square (numbers)', report.biasAnalysis.numberChiSquare.chiSquare],
        ['Degrees of freedom (numbers)', report.biasAnalysis.numberChiSquare.degreesOfFreedom],
        ['p-value (numbers)', report.biasAnalysis.numberChiSquare.pValue],
        ['Evidence level (numbers)', report.biasAnalysis.numberChiSquare.evidenceLevel],
        ['Longest red sequence', report.sequences.color.longest.red ?? 0],
        ['Longest black sequence', report.sequences.color.longest.black ?? 0],
        ['Immediate repeats', report.repetitions.immediateRepeats],
    ];
    const header = 'Metric,Value';
    const body = rows.map(([k, v]) => `${escapeCsvField(k)},${escapeCsvField(v)}`).join('\n');
    return `${header}\n${body}`;
}

/** JSON rendering of the full report (safe to pretty-print or minify). */
export function buildReportJson(report, pretty = true) {
    return JSON.stringify(report, null, pretty ? 2 : undefined);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Self-contained, printable HTML rendering of the report (no external assets, safe to open standalone). */
export function buildReportHtml(report) {
    const pct = (v) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(2)}%`);
    const topRows = report.topNumbers.slice(0, 5)
        .map((n) => `<tr><td>${escapeHtml(n.result)}</td><td>${n.occurrences}</td><td>${pct(n.observedPct / 100)}</td><td>${pct(n.expectedPct / 100)}</td></tr>`)
        .join('');
    const narrativeItems = report.narratives.map((line) => `<li>${escapeHtml(line)}</li>`).join('');

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Roulette Statistical Report</title>
<style>
body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; color: #1a1a1a; }
h1 { font-size: 1.4rem; } h2 { font-size: 1.1rem; margin-top: 2rem; border-bottom: 1px solid #ccc; padding-bottom: .25rem; }
table { border-collapse: collapse; width: 100%; margin-top: .5rem; }
td, th { border: 1px solid #ccc; padding: 4px 8px; text-align: left; font-size: .9rem; }
.caveat { background: #fff3cd; border: 1px solid #ffe08a; padding: .75rem; border-radius: 4px; font-size: .85rem; margin-top: 1rem; }
</style>
</head>
<body>
<h1>Roulette Statistical Report</h1>
<p>Generated: ${escapeHtml(report.generatedAt)} — Roulette type: ${escapeHtml(report.rouletteType)} — Sample size: ${report.sampleSize} rounds</p>

<h2>Theoretical probabilities</h2>
<p>Single number: ${pct(report.theoreticalProbabilities.singleNumber)} · Red: ${pct(report.theoreticalProbabilities.red)} · Black: ${pct(report.theoreticalProbabilities.black)} · Green: ${pct(report.theoreticalProbabilities.green)}</p>

<h2>Descriptive statistics</h2>
<p>Mean: ${report.descriptiveStatistics.mean.mean ?? '—'} · Median: ${report.descriptiveStatistics.median.median ?? '—'} · Mode: ${report.descriptiveStatistics.mode.modes.join(', ') || '—'}</p>

<h2>Top 5 most frequent numbers</h2>
<table><thead><tr><th>Number</th><th>Occurrences</th><th>Observed %</th><th>Expected %</th></tr></thead><tbody>${topRows}</tbody></table>

<h2>Wheel Bias Analyzer</h2>
<p>${escapeHtml(report.biasAnalysis.numberChiSquare.pValueInterpretation)}</p>
<p>${escapeHtml(report.biasAnalysis.numberChiSquare.biasInterpretation ?? '')}</p>

<h2>Observations</h2>
<ul>${narrativeItems}</ul>

<div class="caveat">
This report describes a specific historical sample. A random process can produce
clusters, streaks, hot numbers, cold numbers, and gaps without any underlying
predictive mechanism. Nothing in this report should be used to predict the
outcome of the next independent spin.
</div>
</body>
</html>`;
}
