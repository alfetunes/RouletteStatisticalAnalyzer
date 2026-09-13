# Roulette Statistical Analyzer — Advanced Analytics & Validation Specification

## Purpose

This document defines the **second development phase** of the Roulette Statistical Analyzer.

The base application already implements:

- Static client-side architecture
- European and American roulette
- Roulette animation
- Local random generation
- Bankroll and bet amount
- Last 1,000 rounds
- localStorage persistence
- Historical analysis
- Probability calculations
- Basic charts
- Betting simulation

Now extend the application into a more serious **statistical laboratory for randomness, simulation, pattern analysis, and roulette-wheel anomaly analysis**.

The most important principle remains:

> Analyze randomness without pretending to predict randomness.

Do not introduce any feature that claims to reliably predict the next roulette result.

---

# 1. Advanced Statistical Test Lab

Create a new section:

```text
Statistical Test Lab
```

This section is independent from the normal 1,000-round history.

It must be possible to generate very large synthetic samples without storing them in the normal history.

Supported sample sizes:

- 1,000
- 10,000
- 100,000
- 1,000,000

Optionally allow larger values only if performance remains acceptable.

The generated samples must use the same local random-generation engine as the roulette.

The large sample must NOT be inserted into the normal 1,000-round history.

---

# 2. Law of Large Numbers Demonstration

Use the Statistical Test Lab to demonstrate convergence toward theoretical probabilities.

For example, European roulette:

```text
Red theoretical probability:
48.6486%

Black theoretical probability:
48.6486%

Green theoretical probability:
2.7027%
```

Show observed percentages at increasing sample sizes.

Example:

```text
Rounds       Red       Black     Green
1,000        49.10%    48.30%    2.60%
10,000       48.71%    48.63%    2.66%
100,000      48.66%    48.64%    2.70%
1,000,000    48.65%    48.65%    2.70%
```

Create a chart showing:

```text
Observed probability
vs
Theoretical probability
```

as the number of rounds increases.

The chart should make convergence visually obvious.

---

# 3. Large-Sample Number Distribution

For each number calculate:

- Observed frequency
- Expected frequency
- Absolute difference
- Percentage-point difference

For example:

```text
Number   Observed   Expected   Difference
17       2.71%      2.70%      +0.01 pp
32       2.66%      2.70%      -0.04 pp
7        2.73%      2.70%      +0.03 pp
```

Provide a chart showing all numbers.

---

# 4. Random Sample Demonstration

Add a feature:

```text
Generate Random Sample
```

Allow generation of multiple independent samples.

The purpose is to demonstrate that random samples can look very different even when generated from exactly the same theoretical distribution.

Example:

```text
Sample A
1,000 rounds

Sample B
1,000 rounds
```

Compare:

- Number frequency
- Red/black/green
- Mean
- Median
- Mode
- Sequences
- Gaps
- Dúzias
- Columns

Explain that differences between samples are expected under randomness.

---

# 5. Pattern Detector Validation

This is an important QA/statistical feature.

The application must be able to test whether its own Pattern Detector generates too many false positives.

Create:

```text
Pattern Detector Validation
```

Allow:

- Number of datasets
- Rounds per dataset
- Roulette type

Suggested presets:

```text
100 datasets × 1,000 rounds
500 datasets × 1,000 rounds
1,000 datasets × 1,000 rounds
```

For each dataset:

1. Generate an independent random sequence.
2. Run the Pattern Detector.
3. Record every detected pattern.
4. Record the severity/classification.
5. Aggregate the results.

Show:

```text
Datasets analyzed
Patterns detected
Potential anomalies
Strong anomalies
Statistically significant results
False-positive rate
```

The goal is to answer:

> How often does the analyzer identify apparently meaningful patterns in completely random data?

---

# 6. False Positive Analysis

For every detector, calculate how often it triggers on known-random data.

Examples:

```text
Red/black imbalance detector
Number frequency detector
Long sequence detector
Repeated number detector
Dozen imbalance detector
Column imbalance detector
Gap detector
```

Display:

```text
Pattern Detector          Trigger Rate
Red imbalance              4.8%
Hot number                 100%
Long sequence               7.2%
Repeated number              2.1%
Dozen imbalance              5.0%
```

Do not assume a trigger is an actual anomaly.

Explain that some patterns are expected to appear in random samples.

---

# 7. Multiple Testing Warning

The application must account for the fact that testing many numbers, colors, patterns, windows, and statistics increases the chance of finding something apparently unusual by chance.

Add an educational explanation:

> When many statistical tests are performed, some unusual-looking results will occur by chance even if the underlying process is perfectly random.

Where appropriate, consider:

- Bonferroni correction
- False Discovery Rate
- Benjamini-Hochberg correction

Do not implement these unless the statistical methodology is correct.

If implemented, clearly explain the methodology.

---

# 8. Pattern Classification

Improve Pattern Detective.

Each pattern should have:

```text
Observation
Weak deviation
Moderate deviation
Strong statistical deviation
```

However, avoid calling something "proof of bias".

A strong statistical deviation should be described as:

> A result that is unusual under the assumed theoretical distribution.

Not:

> The wheel is definitely biased.

---

# 9. Hot Numbers

Implement:

```text
Hot Numbers
```

Definition:

Numbers with the highest observed frequency in the selected sample.

Show:

```text
Number
Occurrences
Observed %
Expected %
Difference
```

Important warning:

```text
A hot number is simply a number that appeared frequently in the selected sample.

It does not have a higher mathematical probability of appearing on the next independent spin.
```

---

# 10. Cold Numbers

Implement:

```text
Cold Numbers
```

Definition:

Numbers with the lowest observed frequency.

Show:

- Occurrences
- Observed percentage
- Expected percentage
- Difference
- Rounds since last occurrence

Never use language suggesting the number is "due".

Use:

```text
Rounds since last occurrence
```

instead of:

```text
Number is due
```

---

# 11. Sequence Analysis

Expand sequence analysis.

Analyze:

- Red sequences
- Black sequences
- Even sequences
- Odd sequences
- Low sequences
- High sequences

Calculate:

- Current sequence
- Longest sequence
- Average sequence
- Median sequence
- Frequency by sequence length

Example:

```text
Longest red sequence:
8

Current red sequence:
6

Average red sequence:
1.94
```

Explain that long sequences can occur naturally in random sequences.

---

# 12. Probability of Sequences

Where mathematically appropriate, calculate the theoretical probability of sequences.

Example for consecutive red results:

European roulette:

```text
P(5 reds in a row)
=
(18/37)^5
```

Show the formula and numerical result.

This is educational only.

Do not use sequence probabilities to recommend betting.

---

# 13. Repetition Analysis

Analyze:

- Same number immediately repeated
- Same number within 2 rounds
- Same number within 3 rounds
- Repeated pairs
- Repeated triplets

Compare observed repetition rates against theoretical expectations where feasible.

Example:

```text
Immediate same-number repetition

Observed:
2.68%

Expected:
2.70%
```

The exact theoretical expectation must be derived correctly for the roulette configuration.

---

# 14. Gap Analysis

For every number calculate:

- Current gap
- Average gap
- Median gap
- Minimum gap
- Maximum gap
- Distribution of gaps

Create a visualization.

Add:

```text
Important:
A long gap does not increase the mathematical probability of that number on the next independent spin.
```

---

# 15. Wheel Bias Analyzer

Create a dedicated feature:

```text
Wheel Bias Analyzer
```

Its purpose is to analyze historical/imported sequences and compare them with the expected roulette distribution.

Allow up to 1,000 rounds in the normal analyzer.

Potentially allow larger imported datasets if performance permits, but keep the main UI focused on 1,000 rounds.

Calculate:

- Number frequency
- Expected frequency
- Chi-square statistic
- Degrees of freedom
- p-value
- Standardized residuals where appropriate
- Color distribution
- Color chi-square
- Other appropriate goodness-of-fit measurements

---

# 16. Bias Analysis Interpretation

Do NOT output:

```text
The wheel is biased.
```

Instead use:

```text
The observed distribution differs from the theoretical distribution.

The statistical evidence is:
[weak / moderate / strong]

This result alone does not prove physical wheel bias.
Additional independent data and investigation would be required.
```

If no unusual deviation is detected:

```text
No statistically significant deviation was detected under the selected test.
```

Always state the sample size.

---

# 17. Chi-Square Test

Implement a correct chi-square goodness-of-fit test for number frequencies.

For European roulette:

Expected probability for each number:

```text
1/37
```

For American roulette:

```text
1/38
```

Calculate:

```text
χ² = Σ ((Observed - Expected)² / Expected)
```

Use the correct degrees of freedom.

For N equally likely categories:

```text
df = N - 1
```

If the implementation uses estimated parameters, adjust the degrees of freedom appropriately.

---

# 18. P-Value Interpretation

Display:

```text
p-value
```

with a plain-language interpretation.

Example:

```text
p-value = 0.42

Interpretation:
The observed distribution is not unusual under the assumed theoretical distribution.
```

For a low p-value:

```text
p-value = 0.008

Interpretation:
The observed distribution would be relatively unusual if the roulette outcomes followed the assumed theoretical distribution.

This is evidence of a statistical deviation, not proof of a physically biased wheel.
```

Do not treat p-values as probabilities that the wheel is biased.

---

# 19. Confidence Intervals

Where appropriate, calculate confidence intervals for proportions.

Examples:

- Red proportion
- Black proportion
- Individual number proportion

Show:

```text
Observed:
51.2%

95% confidence interval:
48.1% – 54.3%
```

Use statistically appropriate methods.

Do not use inappropriate normal approximations for very small counts without considering their limitations.

---

# 20. Randomness Score

Create an optional dashboard indicator:

```text
Randomness / Distribution Consistency
```

This must NOT be an arbitrary number.

If a composite score is implemented, document exactly how it is calculated.

Prefer displaying individual test results rather than inventing a single "randomness score".

Possible display:

```text
Number distribution       PASS
Color distribution        PASS
Parity distribution       PASS
Sequence analysis         NORMAL
Repetition analysis       NORMAL
```

The meaning of each status must be explained.

---

# 21. Monte Carlo Simulation

Create:

```text
Monte Carlo Lab
```

This must be independent from the normal betting simulation.

Allow:

```text
Number of spins per simulation:
100
200
500
1000

Number of independent simulations:
100
500
1000
5000
10000
```

Only offer larger values if browser performance remains acceptable.

---

# 22. Monte Carlo Betting Analysis

Allow the user to choose:

- Single number
- Red
- Black
- Even
- Odd
- 1–18
- 19–36
- 1st dozen
- 2nd dozen
- 3rd dozen
- 1st column
- 2nd column
- 3rd column

Use the configured bankroll and bet amount.

Run many independent simulations.

---

# 23. Monte Carlo Output

Show:

```text
Simulations:
10,000

Spins per simulation:
1,000

Starting bankroll:
R$ 1,000

Bet:
Red

Bet amount:
R$ 10
```

Calculate:

- Average final bankroll
- Median final bankroll
- Minimum final bankroll
- Maximum final bankroll
- Standard deviation
- 5th percentile
- 25th percentile
- 50th percentile
- 75th percentile
- 95th percentile
- Probability of finishing below starting bankroll
- Probability of losing entire bankroll, if applicable
- Average profit/loss
- Median profit/loss
- ROI distribution
- Maximum drawdown distribution

---

# 24. Monte Carlo Distribution Chart

Create a histogram/distribution chart of final bankroll.

Example conceptual output:

```text
Final Bankroll Distribution

R$ 0        █████
R$ 500      █████████
R$ 1,000    █████████████████
R$ 1,500    ███████████
R$ 2,000    ███
```

Also show vertical/reference markers for:

- Starting bankroll
- Expected value
- Median outcome

---

# 25. Expected Value vs Simulation

For every betting strategy calculate theoretical expected value.

Compare:

```text
Theoretical expectation
vs
Monte Carlo average
```

Example:

```text
Theoretical EV:
-2.70%

Monte Carlo:
-2.68%
```

Explain that Monte Carlo estimates converge toward theoretical expectation as the number of simulations increases.

---

# 26. Monte Carlo Convergence

Create a chart showing:

```text
Number of simulations
vs
Average simulated return
```

with the theoretical EV as a reference line.

This should demonstrate convergence.

---

# 27. Risk Metrics

For Monte Carlo simulations calculate:

- Maximum drawdown
- Probability of loss
- Probability of profit
- Probability of bankroll depletion
- Worst percentile
- Best percentile
- Volatility of final bankroll

Explain each metric.

---

# 28. Comparing Betting Strategies

Allow comparison of multiple independent Monte Carlo simulations.

Example:

```text
Red
Black
Number 17
1st dozen
2nd column
```

Show:

| Strategy | Win Rate | Avg P/L | Median P/L | ROI | Risk |
|---|---:|---:|---:|---:|---:|

Do not label any strategy as a guaranteed winner.

---

# 29. Randomness Laboratory

Create a section:

```text
Randomness Laboratory
```

It should allow users to generate random datasets and observe:

- Frequency variation
- Sequence variation
- Mean variation
- Median variation
- Mode variation
- Color variation
- Number variation

Allow repeated generation.

The purpose is educational:

> Random data does not necessarily look "even" in small samples.

---

# 30. Expected Range Visualization

Where mathematically appropriate, show an expected range around theoretical probabilities.

Example:

```text
Expected red probability:
48.65%

Observed:
51.20%

95% interval:
[calculated interval]
```

Use statistically correct intervals.

Avoid claiming that values outside an interval are impossible.

---

# 31. Anomaly Detection

Add:

```text
Potential Anomalies
```

An anomaly should mean:

> A result that is unusual relative to the selected statistical model.

Examples:

- unusually high number frequency
- unusually low number frequency
- unusual color imbalance
- unusual sequence length
- unusual repetition rate

Every anomaly must include:

- Sample size
- Metric
- Observed value
- Expected value
- Statistical method
- Significance level, where applicable
- Interpretation
- Limitations

---

# 32. Avoiding False Pattern Claims

This is mandatory.

The application must NEVER say:

```text
This pattern predicts the next spin.
```

```text
This number is more likely to appear next.
```

```text
Black is due.
```

```text
The wheel will probably land on 17.
```

Instead:

```text
This pattern was observed in the selected sample.
```

```text
The deviation is unusual under the theoretical model.
```

```text
The next independent spin retains the same mathematical probabilities.
```

---

# 33. Final Insight Engine

Improve the existing insight engine.

Each insight must include:

```text
Observation
Evidence
Interpretation
Limitation
```

Example:

```text
Observation:
17 occurred 31 times in 1,000 rounds.

Evidence:
Expected frequency ≈ 27 occurrences.

Interpretation:
17 occurred above its expected frequency in this sample.

Limitation:
This does not demonstrate that 17 is more likely to appear on the next spin.
```

---

# 34. Statistical Report

Add a button:

```text
Generate Statistical Report
```

The report should summarize:

- Sample size
- Roulette type
- Theoretical probabilities
- Observed distribution
- Top numbers
- Bottom numbers
- Mean
- Median
- Mode
- Sequences
- Gaps
- Repetitions
- Chi-square
- p-value
- Confidence intervals
- Potential anomalies
- Monte Carlo results if available
- Interpretation

Allow export as:

- CSV
- JSON
- Printable HTML

Do not require a server.

---

# 35. QA / Self-Test Dashboard

Create:

```text
System Validation
```

Show whether the application passes internal validation tests.

Examples:

```text
Random generation             PASS
European roulette             PASS
American roulette             PASS
Probability calculations     PASS
Payout calculations           PASS
History limit                 PASS
Statistics                    PASS
Chi-square                    PASS
Simulation                    PASS
CSV import                    PASS
CSV export                    PASS
localStorage                  PASS
```

---

# 36. Distribution Sanity Test

Create automated tests that generate a large sample.

For example:

```text
Generate 100,000 European roulette results.
```

Verify that:

- All results are valid.
- No impossible result occurs.
- The distribution is approximately compatible with theoretical expectations.

Do NOT hard-code an arbitrary narrow percentage threshold that would incorrectly fail legitimate random samples.

Use statistically defensible tolerances.

---

# 37. American Roulette Validation

Perform the same validation for:

```text
0
00
1–36
```

Verify:

- 38 possible pockets
- Correct green probability
- Correct red probability
- Correct black probability
- Correct number probability
- Correct payout calculations
- Correct statistical analysis

---

# 38. Performance Testing

Test:

- 1,000 rounds
- 10,000 synthetic rounds
- 100,000 synthetic rounds
- 1,000,000 synthetic rounds if feasible

Measure approximate execution time.

Do not freeze the browser during large simulations.

If necessary, use:

- Web Workers
- chunked processing
- requestAnimationFrame
- asynchronous batches

A Web Worker is preferred for computationally heavy Monte Carlo operations if required.

The core application must remain client-side.

---

# 39. Browser Memory

Ensure large temporary simulation datasets are released after analysis.

Do not keep:

```text
1,000,000 raw rounds
```

in memory unnecessarily after summary statistics have been calculated.

Prefer streaming/aggregated statistics where possible.

For Monte Carlo simulations, avoid retaining every spin if only aggregate results are required.

---

# 40. No Backend Regression

After adding all advanced functionality, confirm:

- No backend was introduced.
- No database was introduced.
- No API server was introduced.
- No user account was introduced.
- No remote storage was introduced.
- No secrets were introduced.

Everything must remain client-side.

---

# 41. Netlify Compatibility

The advanced features must remain compatible with static deployment.

The final project must work on Netlify without:

- Database configuration
- Environment variables
- Backend functions
- Server setup

If Web Workers are used, they must be loaded from static local files.

---

# 42. Final Architecture Review

After implementation, review the architecture.

Ensure separation between:

```text
random.js
roulette.js
statistics.js
probability.js
pattern-analyzer.js
simulation.js
monte-carlo.js
bias-analyzer.js
charts.js
storage.js
export.js
```

Do not put statistical calculations directly inside UI event handlers.

Statistical functions should be pure whenever possible.

---

# 43. Documentation

Update README with:

## Advanced Analytics

Explain:

- Expected vs observed
- Law of Large Numbers
- Chi-square
- p-values
- Confidence intervals
- Monte Carlo
- False positives
- Multiple testing
- Pattern detection
- Wheel bias analysis

## Important Statistical Limitation

Explicitly explain:

> A random process can produce clusters, streaks, hot numbers, cold numbers, gaps, and other apparent patterns without any underlying predictive mechanism.

---

# 44. Final Acceptance Tests

Before finishing the implementation:

## Randomness

- [ ] Generate 100,000 European results
- [ ] Generate 100,000 American results
- [ ] Verify all results are valid
- [ ] Verify theoretical probabilities
- [ ] Verify distribution

## Pattern Detector

- [ ] Generate many random datasets
- [ ] Run Pattern Detector
- [ ] Measure trigger rates
- [ ] Check false positives
- [ ] Verify warnings

## Monte Carlo

- [ ] Run 100 simulations
- [ ] Run 1,000 simulations
- [ ] Run 10,000 simulations if performance permits
- [ ] Compare average result to theoretical EV
- [ ] Verify bankroll calculations
- [ ] Verify percentiles
- [ ] Verify drawdown

## Wheel Bias Analyzer

- [ ] Analyze known-random generated data
- [ ] Verify it does not falsely declare bias
- [ ] Verify chi-square
- [ ] Verify p-value
- [ ] Verify sample size interpretation

## UI

- [ ] Desktop
- [ ] Tablet
- [ ] Mobile
- [ ] No console errors
- [ ] Charts render correctly
- [ ] Large simulations do not freeze the interface

## Deployment

- [ ] Static deployment
- [ ] Netlify compatible
- [ ] No backend
- [ ] No database
- [ ] No API keys
- [ ] No environment variables required

---

# 45. Development Philosophy

The purpose of this second phase is to turn the application from a simple roulette simulator into a:

**Statistical Laboratory for Randomness**

The application should help users understand:

- Why random sequences can look patterned
- Why historical frequency does not change future independent probabilities
- How observed distributions converge toward theoretical expectations
- How statistical tests work
- Why a low p-value is not proof of physical bias
- How Monte Carlo simulation works
- Why one simulation is not enough to evaluate a strategy
- How multiple testing can create false discoveries
- How to distinguish descriptive patterns from predictive evidence

The final product should be technically impressive but statistically responsible.

The central principle remains:

> **Analyze randomness without pretending to predict randomness.**
