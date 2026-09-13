// Advanced spec §34: Statistical Report generation and export formats.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateRandomSequence } from '../js/random.js';
import { buildStatisticalReport, buildReportCsv, buildReportJson, buildReportHtml } from '../js/statistical-report.js';

test('buildStatisticalReport includes every section required by the spec', () => {
    const results = generateRandomSequence('european', 800);
    const report = buildStatisticalReport(results, 'european');
    assert.equal(report.sampleSize, 800);
    assert.equal(report.rouletteType, 'european');
    assert.ok(report.theoreticalProbabilities.singleNumber > 0);
    assert.ok(report.descriptiveStatistics.mean.mean !== null);
    assert.ok(Array.isArray(report.topNumbers) && report.topNumbers.length > 0);
    assert.ok(Array.isArray(report.bottomNumbers) && report.bottomNumbers.length > 0);
    assert.ok(report.sequences.color.longest);
    assert.ok(report.repetitions);
    assert.ok(report.biasAnalysis.numberChiSquare);
    assert.ok(Array.isArray(report.potentialAnomalies));
    assert.ok(Array.isArray(report.narratives) && report.narratives.length > 0);
    assert.equal(report.monteCarloResult, null);
});

test('buildStatisticalReport embeds a supplied Monte Carlo result when given one', () => {
    const results = generateRandomSequence('european', 300);
    const fakeMonteCarlo = { config: { simulations: 100 }, summary: { mean: 990 } };
    const report = buildStatisticalReport(results, 'european', { monteCarloResult: fakeMonteCarlo });
    assert.deepEqual(report.monteCarloResult, fakeMonteCarlo);
});

test('buildReportCsv produces a well-formed two-column CSV, one row per metric, no empty lines', () => {
    const results = generateRandomSequence('european', 300);
    const report = buildStatisticalReport(results, 'european');
    const csv = buildReportCsv(report);
    const lines = csv.split('\n');
    assert.equal(lines[0], 'Metric,Value');
    assert.ok(lines.length > 10, 'expected more than 10 metric rows plus header');
    for (const line of lines.slice(1)) {
        assert.ok(line.length > 0, 'no blank lines expected in the report CSV');
        assert.ok(line.includes(','), `line missing its Metric,Value separator: ${line}`);
    }
});

test('buildReportJson round-trips as valid JSON containing the same sample size', () => {
    const results = generateRandomSequence('american', 400);
    const report = buildStatisticalReport(results, 'american');
    const json = buildReportJson(report);
    const parsed = JSON.parse(json);
    assert.equal(parsed.sampleSize, 400);
    assert.equal(parsed.rouletteType, 'american');
});

test('buildReportHtml produces self-contained, printable HTML with no external asset references', () => {
    const results = generateRandomSequence('european', 300);
    const report = buildStatisticalReport(results, 'european');
    const html = buildReportHtml(report);
    assert.ok(html.startsWith('<!doctype html>'));
    assert.ok(!html.includes('<script'));
    assert.ok(!/src=["']https?:/.test(html), 'report HTML must not reference external network assets');
    assert.ok(html.includes('next independent spin'));
});
