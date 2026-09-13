// Wheel Bias Analyzer (advanced spec §15-§19): compares an observed sample
// against the theoretical roulette distribution using chi-square, p-values,
// standardized residuals, and confidence intervals. Pure, DOM-free — never
// concludes "the wheel is biased", only ever states the statistical
// evidence level via js/insight-engine.js's shared vocabulary.

import { getPockets, getColor } from './roulette.js';
import { getSingleNumberProbability, getRedOrBlackProbability, getGreenProbability } from './probability.js';
import {
    calculateNumberFrequency,
    calculateChiSquare,
    calculateChiSquarePValue,
    calculateStandardizedResiduals,
    calculateConfidenceInterval,
} from './statistics.js';
import { classifyByPValue, interpretPValue, interpretBiasEvidence, sampleSizeWarning, SIGNIFICANCE_CAVEAT } from './insight-engine.js';

const MIN_EXPECTED_PER_CATEGORY = 5;

function chiSquareBlock(observedCounts, expectedFractions, sampleSize) {
    const { chiSquare, degreesOfFreedom, insufficientSample } = calculateChiSquare(observedCounts, expectedFractions, MIN_EXPECTED_PER_CATEGORY);
    const pValue = insufficientSample ? null : calculateChiSquarePValue(chiSquare, degreesOfFreedom);
    const evidenceLevel = classifyByPValue(pValue);
    return {
        chiSquare,
        degreesOfFreedom,
        pValue,
        insufficientSample,
        evidenceLevel,
        pValueInterpretation: insufficientSample
            ? `Sample size (${sampleSize}) is too small for a reliable chi-square test here (each category needs an expected count of at least ${MIN_EXPECTED_PER_CATEGORY}).`
            : interpretPValue(pValue, sampleSize),
        biasInterpretation: insufficientSample ? null : interpretBiasEvidence(evidenceLevel, sampleSize),
    };
}

/**
 * Full Wheel Bias Analyzer report for a sample of pocket-label results.
 * @param {string[]} results
 * @param {'european'|'american'} rouletteType
 */
export function analyzeWheelBias(results, rouletteType) {
    const sampleSize = results.length;
    const pockets = getPockets(rouletteType);
    const singleP = getSingleNumberProbability(rouletteType);

    // Per-number chi-square + standardized residuals.
    const freq = calculateNumberFrequency(results, rouletteType);
    const observedCounts = freq.map((f) => f.occurrences);
    const expectedFractions = pockets.map(() => singleP);
    const numberChiSquare = chiSquareBlock(observedCounts, expectedFractions, sampleSize);
    const residuals = calculateStandardizedResiduals(observedCounts, expectedFractions);
    const numberResiduals = freq.map((f, i) => ({
        result: f.result,
        occurrences: f.occurrences,
        observedPct: f.observedPct,
        expectedPct: f.expectedPct,
        standardizedResidual: residuals[i],
    })).sort((a, b) => Math.abs(b.standardizedResidual ?? 0) - Math.abs(a.standardizedResidual ?? 0));

    // Color chi-square (red/black/green).
    const redCount = results.filter((r) => getColor(r) === 'red').length;
    const blackCount = results.filter((r) => getColor(r) === 'black').length;
    const greenCount = sampleSize - redCount - blackCount;
    const redBlackP = getRedOrBlackProbability(rouletteType);
    const greenP = getGreenProbability(rouletteType);
    const colorChiSquare = chiSquareBlock([redCount, blackCount, greenCount], [redBlackP, redBlackP, greenP], sampleSize);

    // Confidence intervals for the three headline proportions.
    const redCi = calculateConfidenceInterval(redCount, sampleSize);
    const blackCi = calculateConfidenceInterval(blackCount, sampleSize);
    const topNumber = numberResiduals[0];
    const topNumberCi = topNumber ? calculateConfidenceInterval(topNumber.occurrences, sampleSize) : null;

    return {
        sampleSize,
        rouletteType,
        sampleSizeWarning: sampleSizeWarning(sampleSize),
        numberChiSquare,
        numberResiduals,
        colorChiSquare,
        colorCounts: { red: redCount, black: blackCount, green: greenCount },
        confidenceIntervals: {
            red: { observed: redCount / sampleSize, ...redCi },
            black: { observed: blackCount / sampleSize, ...blackCi },
            mostDeviatedNumber: topNumber ? { result: topNumber.result, observed: topNumber.occurrences / sampleSize, ...topNumberCi } : null,
        },
        significanceCaveat: SIGNIFICANCE_CAVEAT,
    };
}
