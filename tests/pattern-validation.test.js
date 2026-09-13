// Advanced spec §5-§7: Pattern Detector Validation as a production feature
// (promoted from the ad-hoc experiment in tests/pattern-false-positive.test.js
// into js/pattern-validation.js, now backing a real UI page).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runPatternDetectorValidation, DETECTOR_CATEGORIES } from '../js/pattern-validation.js';

test('runPatternDetectorValidation reports one trigger-rate row per detector category', () => {
    const report = runPatternDetectorValidation({ datasetCount: 30, roundsPerDataset: 500, rouletteType: 'european' });
    assert.equal(report.detectorTriggerRates.length, DETECTOR_CATEGORIES.length);
    for (const row of report.detectorTriggerRates) {
        // Each rate is the fraction of datasets where that detector fired at
        // least once — a bounded probability, not an average row count (a
        // category with many possible rows, like all 37 numbers, would
        // otherwise report an average exceeding 100%, which would be
        // meaningless as a percentage in the UI).
        assert.ok(row.anyDeviationRate >= 0 && row.anyDeviationRate <= 1);
        assert.ok(row.moderateOrStrongerRate >= 0 && row.moderateOrStrongerRate <= 1);
        assert.ok(row.strongRate >= 0 && row.strongRate <= 1);
        assert.ok(row.moderateOrStrongerRate <= row.anyDeviationRate + 1e-9);
        assert.ok(row.strongRate <= row.moderateOrStrongerRate + 1e-9);
    }
});

test('runPatternDetectorValidation calls onProgress exactly once per dataset, in order', () => {
    const seen = [];
    runPatternDetectorValidation({
        datasetCount: 12, roundsPerDataset: 200, rouletteType: 'european',
        onProgress: (done, total) => seen.push([done, total]),
    });
    assert.equal(seen.length, 12);
    assert.deepEqual(seen[0], [1, 12]);
    assert.deepEqual(seen[11], [12, 12]);
});

test('runPatternDetectorValidation includes the multiple-testing note and a bounded interpretation rate', () => {
    const report = runPatternDetectorValidation({ datasetCount: 20, roundsPerDataset: 300, rouletteType: 'american' });
    assert.match(report.multipleTestingNote, /multiple/i);
    assert.ok(report.datasetsWithAnyStrongFindingRate >= 0 && report.datasetsWithAnyStrongFindingRate <= 1);
    assert.match(report.interpretation, /random/i);
});

test('runPatternDetectorValidation never retains per-round raw data in its output', () => {
    const report = runPatternDetectorValidation({ datasetCount: 10, roundsPerDataset: 1000, rouletteType: 'european' });
    const serialized = JSON.stringify(report);
    assert.ok(serialized.length < 20_000, `report serialized to ${serialized.length} bytes — looks larger than an aggregate-only report should be`);
});
