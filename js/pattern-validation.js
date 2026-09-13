// "Pattern Detector Validation" (advanced spec §5-§7): runs the Pattern
// Detective against many independent random datasets and aggregates how
// often each detector category fires, to answer "how often does the
// analyzer find apparently meaningful patterns in pure random data?"
//
// This is the orchestration layer (composes random.js + pattern-analyzer.js,
// same pattern as simulation.js composing random.js + roulette.js), kept
// separate from pattern-analyzer.js so that module can stay pure/RNG-free.

import { generateRandomSequence } from './random.js';
import { analyzePatterns, CLASSIFICATIONS } from './pattern-analyzer.js';
import { MULTIPLE_TESTING_NOTE } from './insight-engine.js';

const DETECTOR_CATEGORIES = [
    { key: 'numberDeviations', label: 'Number frequency (hot/cold)' },
    { key: 'colorImbalance', label: 'Red/black imbalance' },
    { key: 'parityImbalance', label: 'Even/odd imbalance' },
    { key: 'dozenConcentration', label: 'Dozen imbalance' },
    { key: 'columnConcentration', label: 'Column imbalance' },
];

function emptyDetectorTally() {
    const tally = {};
    for (const { key } of DETECTOR_CATEGORIES) {
        tally[key] = { datasetsWithAnyDeviation: 0, datasetsWithModerateOrStronger: 0, datasetsWithStrong: 0 };
    }
    return tally;
}

/**
 * Runs the false-positive experiment described in advanced spec §5.
 * @param {object} params
 * @param {number} params.datasetCount
 * @param {number} params.roundsPerDataset
 * @param {'european'|'american'} params.rouletteType
 * @param {(processed: number, total: number) => void} [params.onProgress]
 *   optional callback for chunked/worker progress reporting (advanced §38).
 * @returns {object} aggregated report, safe to serialize (no raw per-round data retained)
 */
export function runPatternDetectorValidation({ datasetCount, roundsPerDataset, rouletteType, onProgress }) {
    const tally = emptyDetectorTally();
    let totalFindingsChecked = 0;
    let datasetsWithAnyStrongFinding = 0;
    let longSequenceCount = 0; // current color sequence length >= 5, purely descriptive

    for (let i = 0; i < datasetCount; i++) {
        const results = generateRandomSequence(rouletteType, roundsPerDataset);
        const findings = analyzePatterns(results, rouletteType);

        // Per-dataset booleans (not raw row counts): the spec's example
        // table expresses each detector's trigger rate as a percentage of
        // datasets where it fired at all (e.g. "Red imbalance 4.8%"), not an
        // average count of flagged rows — the latter would exceed 100% for
        // categories with many possible rows (37 numbers) and be
        // meaningless as a percentage.
        let datasetHasStrongFinding = false;
        for (const { key } of DETECTOR_CATEGORIES) {
            const rows = findings[key];
            totalFindingsChecked += rows.length;
            if (rows.length > 0) tally[key].datasetsWithAnyDeviation += 1;
            if (rows.some((row) => row.classification === CLASSIFICATIONS.MODERATE_DEVIATION || row.classification === CLASSIFICATIONS.POTENTIALLY_UNUSUAL)) {
                tally[key].datasetsWithModerateOrStronger += 1;
            }
            if (rows.some((row) => row.classification === CLASSIFICATIONS.POTENTIALLY_UNUSUAL)) {
                tally[key].datasetsWithStrong += 1;
                datasetHasStrongFinding = true;
            }
        }
        if (findings.currentColorSequence.length >= 5) longSequenceCount += 1;
        if (datasetHasStrongFinding) datasetsWithAnyStrongFinding += 1;

        if (onProgress) onProgress(i + 1, datasetCount);
    }

    const detectorTriggerRates = DETECTOR_CATEGORIES.map(({ key, label }) => ({
        key,
        label,
        anyDeviationRate: tally[key].datasetsWithAnyDeviation / datasetCount,
        moderateOrStrongerRate: tally[key].datasetsWithModerateOrStronger / datasetCount,
        strongRate: tally[key].datasetsWithStrong / datasetCount,
    }));

    return {
        datasetCount,
        roundsPerDataset,
        rouletteType,
        totalFindingsChecked,
        detectorTriggerRates,
        longSequenceRate: longSequenceCount / datasetCount,
        datasetsWithAnyStrongFindingRate: datasetsWithAnyStrongFinding / datasetCount,
        multipleTestingNote: MULTIPLE_TESTING_NOTE,
        interpretation: `Across ${datasetCount} independent random dataset(s) of ${roundsPerDataset} rounds each, ${(datasetsWithAnyStrongFinding / datasetCount * 100).toFixed(1)}% produced at least one "Strong statistical deviation" classification somewhere among ${DETECTOR_CATEGORIES.length} detector categories. This is the expected signature of testing many things at once on random data, not evidence that the detector or the RNG is broken.`,
    };
}

export { DETECTOR_CATEGORIES };
