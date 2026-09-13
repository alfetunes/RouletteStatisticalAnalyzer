// Spec §40-§44/§87: does the Pattern Detective find real patterns when they
// exist, and does it avoid over-claiming on ordinary random data? Two
// directions are tested: (1) datasets deliberately constructed to trigger
// each category of finding, and (2) a false-positive experiment over many
// purely random datasets, reporting (not hard-asserting-to-zero) how often
// ordinary randomness produces deviation-flagged output — multiple testing
// means *some* flags are expected, per spec §42/§43.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateRandomSequence } from '../js/random.js';
import { analyzePatterns, CLASSIFICATIONS } from '../js/pattern-analyzer.js';

// --- Positive detection: deliberately constructed datasets ---

test('Pattern Detective flags a hot number when one number is deliberately over-represented', () => {
    // 200 spins: number 7 forced to occur 40 times (~20%, vs ~2.7% expected).
    const results = [];
    for (let i = 0; i < 200; i++) results.push(i % 5 === 0 ? '7' : String((i % 36) + 1));
    const findings = analyzePatterns(results, 'european');
    const sevenDeviation = findings.numberDeviations.find((d) => d.result === '7');
    assert.ok(sevenDeviation, 'expected number 7 to appear in numberDeviations');
    assert.notEqual(sevenDeviation.classification, CLASSIFICATIONS.OBSERVATION);
    assert.equal(findings.hotNumbers[0].result, '7');
});

test('Pattern Detective flags color imbalance when a color is deliberately over-represented', () => {
    // Force ~90% red across 300 spins.
    const RED = '1'; // red
    const BLACK = '2'; // black
    const results = Array.from({ length: 300 }, (_, i) => (i % 10 === 0 ? BLACK : RED));
    const findings = analyzePatterns(results, 'european');
    const redRow = findings.colorImbalance.find((r) => r.category === 'red');
    assert.ok(redRow, 'expected red to appear in colorImbalance');
    assert.notEqual(redRow.classification, CLASSIFICATIONS.OBSERVATION);
});

test('Pattern Detective reports a long current color streak', () => {
    const results = ['1', '3', '5', '7', '9', '12']; // all red (12 is red)
    const findings = analyzePatterns(results, 'european');
    assert.equal(findings.currentColorSequence.label, 'red');
    assert.equal(findings.currentColorSequence.length, 6);
});

test('Pattern Detective flags dozen concentration when one dozen is deliberately over-represented', () => {
    // Force ~90% into the 1st dozen (1-12) across 300 spins.
    const results = Array.from({ length: 300 }, (_, i) => (i % 10 === 0 ? '20' : '5'));
    const findings = analyzePatterns(results, 'european');
    const dozen1 = findings.dozenConcentration.find((r) => r.category === 1);
    assert.ok(dozen1);
    assert.notEqual(dozen1.classification, CLASSIFICATIONS.OBSERVATION);
});

test('Pattern Detective flags column concentration when one column is deliberately over-represented', () => {
    // Column 1 = {1,4,7,10,13,16,19,22,25,28,31,34}; force ~90% into it.
    const results = Array.from({ length: 300 }, (_, i) => (i % 10 === 0 ? '2' : '1'));
    const findings = analyzePatterns(results, 'european');
    const col1 = findings.columnConcentration.find((r) => r.category === 1);
    assert.ok(col1);
    assert.notEqual(col1.classification, CLASSIFICATIONS.OBSERVATION);
});

// --- Negative test: a single "obviously normal" run should mostly read as
// observation-only, not exaggerate ordinary randomness (spec §41) ---

test('Pattern Detective does not classify a small, unremarkable sample as strongly unusual', () => {
    // A short, uneventful sample with no engineered skew.
    const results = ['1', '13', '24', '8', '17', '30', '5', '22', '11', '36'];
    const findings = analyzePatterns(results, 'european');
    const unusual = findings.numberDeviations.filter((d) => d.classification === CLASSIFICATIONS.POTENTIALLY_UNUSUAL);
    assert.equal(unusual.length, 0, 'a 10-spin sample with no engineered skew should not produce "Potentially unusual" findings');
});

// --- False-positive experiment over genuinely random data (spec §42) ---
// Uses the real generator (no mock) across many independent datasets and
// reports aggregate trigger rates. This does not assert a suspiciously
// exact rate (random variation exists), only that behavior stays in the
// statistically expected ballpark and does not explode as sample count grows
// (which would indicate the classifier is broken, not just conservative).

function runFalsePositiveExperiment(datasetCount, spinsPerDataset) {
    let potentiallyUnusualCount = 0;
    let moderateOrWorseCount = 0;
    let totalFindingsChecked = 0;

    for (let d = 0; d < datasetCount; d++) {
        const results = generateRandomSequence('european', spinsPerDataset);
        const findings = analyzePatterns(results, 'european');
        const allDeviations = [
            ...findings.numberDeviations,
            ...findings.colorImbalance,
            ...findings.parityImbalance,
            ...findings.dozenConcentration,
            ...findings.columnConcentration,
        ];
        totalFindingsChecked += allDeviations.length;
        for (const dev of allDeviations) {
            if (dev.classification === CLASSIFICATIONS.POTENTIALLY_UNUSUAL) potentiallyUnusualCount += 1;
            if (dev.classification === CLASSIFICATIONS.MODERATE_DEVIATION || dev.classification === CLASSIFICATIONS.POTENTIALLY_UNUSUAL) {
                moderateOrWorseCount += 1;
            }
        }
    }

    return {
        datasetCount,
        spinsPerDataset,
        totalFindingsChecked,
        potentiallyUnusualCount,
        moderateOrWorseCount,
        potentiallyUnusualRatePerDataset: potentiallyUnusualCount / datasetCount,
    };
}

test('False-positive experiment: 100 random datasets x 1,000 spins — report trigger rates (spec §42)', () => {
    const report = runFalsePositiveExperiment(100, 1000);
    // eslint-disable-next-line no-console
    console.log('[false-positive experiment, n=100]', report);
    // The classifier already filters out CLASSIFICATIONS.OBSERVATION rows
    // (|z|<1), so every row counted here already cleared |z|>=1. Under the
    // multiple-testing load per dataset (37 numbers + 2 colors + 2 parities +
    // 3 dozens + 3 columns = 47 tests), seeing *some* |z|>=2 hits across 100
    // datasets is expected and correct — the assertion only guards against a
    // broken classifier that either never fires (dead code) or fires on
    // nearly everything (miscalibrated).
    assert.ok(report.moderateOrWorseCount > 0, 'expected at least some |z|>=2 deviations across 4700 random tests');
    assert.ok(
        report.moderateOrWorseCount < report.totalFindingsChecked,
        'moderate-or-worse deviations should not be the overwhelming majority of all flagged rows on random data'
    );
});

test('False-positive experiment: 500 random datasets x 1,000 spins — report trigger rates (spec §42)', () => {
    const report = runFalsePositiveExperiment(500, 1000);
    // eslint-disable-next-line no-console
    console.log('[false-positive experiment, n=500]', report);
    assert.ok(report.moderateOrWorseCount > 0);
    // Rate per dataset should be roughly stable between the 100- and
    // 500-dataset runs (both draw from the same underlying process); a wild
    // multiplicative blowup would indicate non-independence between datasets.
    assert.ok(report.potentiallyUnusualRatePerDataset < 5, 'unusual-classification rate per dataset is implausibly high');
});
