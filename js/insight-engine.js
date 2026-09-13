// Shared statistical-language vocabulary (advanced spec §8, §16, §18, §32,
// §33). Every feature that turns a number into a sentence — Pattern
// Detective, Wheel Bias Analyzer, the Statistical Report — goes through
// here, so "never call it proof of bias" and "never say a number is due"
// are enforced in exactly one place instead of re-implemented per feature
// (avoids the QA spec's "duplicated logic" architecture smell).
//
// Pure, DOM-free: returns plain data/strings only.

export const EVIDENCE_LEVELS = Object.freeze({
    NONE: 'No statistically significant deviation',
    WEAK: 'Weak deviation',
    MODERATE: 'Moderate deviation',
    STRONG: 'Strong statistical deviation',
});

/** Classifies |z| magnitude into the shared 4-tier vocabulary (never "biased"/"proof"). */
export function classifyByZScore(z) {
    if (z === null || z === undefined) return EVIDENCE_LEVELS.NONE;
    const abs = Math.abs(z);
    if (abs < 1) return EVIDENCE_LEVELS.NONE;
    if (abs < 2) return EVIDENCE_LEVELS.WEAK;
    if (abs < 3) return EVIDENCE_LEVELS.MODERATE;
    return EVIDENCE_LEVELS.STRONG;
}

/** Classifies a p-value into the same 4-tier vocabulary, for chi-square-based findings. */
export function classifyByPValue(p) {
    if (p === null || p === undefined) return EVIDENCE_LEVELS.NONE;
    if (p >= 0.05) return EVIDENCE_LEVELS.NONE;
    if (p >= 0.01) return EVIDENCE_LEVELS.WEAK;
    if (p >= 0.001) return EVIDENCE_LEVELS.MODERATE;
    return EVIDENCE_LEVELS.STRONG;
}

/**
 * Plain-language p-value interpretation (advanced spec §18). Never treats
 * the p-value as "the probability the wheel is biased".
 */
export function interpretPValue(p, sampleSize) {
    if (p === null || p === undefined) {
        return `A p-value could not be computed for this sample (n=${sampleSize}) — the sample is likely too small for this test.`;
    }
    const formatted = p < 0.001 ? '< 0.001' : p.toFixed(3);
    if (p >= 0.05) {
        return `p-value = ${formatted}. The observed distribution is not unusual under the assumed theoretical distribution (n=${sampleSize}).`;
    }
    return `p-value = ${formatted}. The observed distribution would be relatively unusual if the outcomes followed the assumed theoretical distribution (n=${sampleSize}). This is evidence of a statistical deviation, not proof of a physically biased wheel.`;
}

/**
 * Bias-analyzer-specific interpretation paragraph (advanced spec §16).
 * Always states sample size; never asserts physical bias either way.
 */
export function interpretBiasEvidence(evidenceLevel, sampleSize) {
    if (evidenceLevel === EVIDENCE_LEVELS.NONE) {
        return `No statistically significant deviation was detected under the selected test (sample size: ${sampleSize} rounds).`;
    }
    return [
        `The observed distribution differs from the theoretical distribution (sample size: ${sampleSize} rounds).`,
        `The statistical evidence is: ${evidenceLevel.toLowerCase()}.`,
        'This result alone does not prove physical wheel bias. Additional independent data and investigation would be required.',
    ].join(' ');
}

/**
 * Builds a structured four-part insight (advanced spec §33): Observation,
 * Evidence, Interpretation, Limitation. Returns an object (for UI rendering)
 * and a flattened narrative string (for reports/CSV/plain-text contexts).
 */
export function buildInsight({ observation, evidence, interpretation, limitation }) {
    const narrative = `Observation: ${observation} Evidence: ${evidence} Interpretation: ${interpretation} Limitation: ${limitation}`;
    return { observation, evidence, interpretation, limitation, narrative };
}

/** Standard hot-number insight, reused by Pattern Detective and the Statistical Report. */
export function buildHotNumberInsight({ result, occurrences, expectedOccurrences, sampleSize }) {
    return buildInsight({
        observation: `${result} occurred ${occurrences} times in ${sampleSize} rounds.`,
        evidence: `Expected frequency ≈ ${expectedOccurrences.toFixed(1)} occurrences.`,
        interpretation: `${result} occurred above its expected frequency in this sample.`,
        limitation: `This does not demonstrate that ${result} is more likely to appear on the next spin. A hot number is simply a number that appeared frequently in the selected sample.`,
    });
}

/** Standard cold-number / gap insight — explicitly avoids "due" language (advanced spec §10, §14). */
export function buildColdNumberInsight({ result, roundsSinceLastOccurrence }) {
    return buildInsight({
        observation: roundsSinceLastOccurrence === null
            ? `${result} has not occurred yet in this sample.`
            : `${result} last occurred ${roundsSinceLastOccurrence} round(s) ago.`,
        evidence: 'Under independent, memoryless spins, gap length between occurrences of a single number naturally varies widely, even for a perfectly fair wheel.',
        interpretation: `This is a description of rounds since last occurrence, not an indicator of anything special about ${result}.`,
        limitation: `A long gap does not increase the mathematical probability of ${result} on the next independent spin. This number is not "due".`,
    });
}

/** Sample-size warning text (advanced spec §86 / QA spec §86), reused wherever a small sample is analyzed. */
export function sampleSizeWarning(n) {
    if (n < 30) return `This sample (${n} rounds) is too small for strong statistical conclusions.`;
    if (n < 100) return `This sample (${n} rounds) is small; treat any deviation findings cautiously.`;
    return null;
}

/** Multiple-testing educational note (advanced spec §7 / QA spec §43). */
export const MULTIPLE_TESTING_NOTE = 'When many statistical tests are performed at once (individual numbers, colors, parities, dozens, columns, sequences, gaps), some unusual-looking results will occur by chance even if the underlying process is perfectly random. No correction for multiple comparisons (e.g. Bonferroni) is applied to the headline findings below — treat any single "unusual" result as one of many tests run, not as an isolated strong signal.';

/** Statistical-significance vs practical-significance note (QA spec §85). */
export const SIGNIFICANCE_CAVEAT = 'A statistically significant deviation does not automatically imply a large practical effect, physical bias, or predictive usefulness. Likewise, a non-significant result does not prove perfect randomness — it only means this sample did not provide strong evidence against it.';
