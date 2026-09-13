# Roulette Statistical Analyzer — Maximum QA, Testing & Validation Specification

## Objective

Perform an exhaustive QA, software validation, statistical validation, performance validation, security review, and UX validation of the **Roulette Statistical Analyzer**.

This is not a request to merely describe tests.

The agent MUST:

1. Inspect the complete project.
2. Identify the current architecture.
3. Run the application.
4. Run existing automated tests.
5. Create missing tests.
6. Execute the tests.
7. Identify failures.
8. Fix the implementation.
9. Re-run the failed tests.
10. Perform statistical validation.
11. Perform large-scale simulations.
12. Perform performance tests.
13. Perform robustness tests.
14. Perform browser/E2E tests where possible.
15. Perform a final code review.
16. Repeat testing after every significant fix.
17. Produce a final QA report.

Do not stop after finding the first problem.

The goal is to make the application as reliable as reasonably possible.

---

# 1. Golden Rule

Do not simply say:

```text
This should work.
```

Actually test it whenever technically possible.

Do not simply recommend:

```text
You should add a test.
```

Create the test and execute it.

Do not simply identify a bug.

Fix it, then run the relevant tests again.

---

# 2. Test Strategy

Use multiple layers:

```text
Unit Tests
    ↓
Integration Tests
    ↓
Statistical Tests
    ↓
Simulation Tests
    ↓
Property-Based Tests
    ↓
Performance Tests
    ↓
Browser / E2E Tests
    ↓
Robustness Tests
    ↓
Security Review
    ↓
Final Regression
```

The exact tools may be chosen based on the existing project.

Prefer lightweight tools that do not complicate the final static deployment.

Testing dependencies may exist in development only.

---

# 3. Establish Baseline

Before changing code:

1. Inspect all source files.
2. Inspect package.json if present.
3. Inspect README.
4. Inspect configuration.
5. Inspect tests.
6. Run the existing test suite.
7. Run linting if available.
8. Run the application.
9. Record current failures.
10. Record console errors.
11. Record build errors.
12. Record performance problems.

Create a baseline report.

---

# 4. Architecture Audit

Review whether the application properly separates:

```text
UI
Roulette engine
Random generation
Statistics
Probability
Betting
Simulation
Monte Carlo
Pattern analysis
Bias analysis
Storage
CSV
Charts
Animation
```

Look for:

- duplicated logic
- circular dependencies
- global state
- unnecessary coupling
- DOM logic inside statistical functions
- duplicated probability calculations
- duplicated roulette rules
- inconsistent result representations
- duplicated random generators

Refactor when necessary.

---

# 5. Random Number Generator Tests

Test the random generator extensively.

## European Roulette

Generate:

```text
100
1,000
10,000
100,000
1,000,000
```

results where practical.

Verify:

```text
Only:
0–36
```

can occur.

Verify no:

```text
-1
37
38
00
null
undefined
NaN
```

can occur.

---

# 6. American Roulette Tests

Verify only:

```text
0
00
1–36
```

can occur.

Explicitly verify:

```text
00 !== 0
```

from a domain-model perspective.

Ensure:

- 0 is green
- 00 is green
- 0 is not treated as ordinary numeric 0 when that would cause analytical errors
- 00 is not treated as a second numeric 0
- parity excludes 0 and 00
- dozens exclude 0 and 00
- columns exclude 0 and 00

---

# 7. Random Generator Implementation

Inspect whether the application uses:

```javascript
crypto.getRandomValues()
```

or another appropriate cryptographically strong browser random source.

If it uses:

```javascript
Math.random()
```

evaluate whether it should be replaced.

The random generator must be centralized.

No UI component should independently generate roulette results.

---

# 8. Roulette Result Consistency

For every spin verify:

```text
Generated result
=
Recorded result
=
Displayed result
=
Animation target
```

The animation must never determine the result.

Test hundreds of spins.

Look for off-by-one errors in wheel positioning.

---

# 9. Roulette Wheel Mapping

Verify the physical wheel sequence for:

## European

Use the standard European roulette wheel order.

## American

Use the standard American roulette wheel order.

Check:

- number ordering
- red/black positions
- green positions
- ball target
- pointer alignment

The visual result must match the generated result.

---

# 10. Animation Testing

Test:

- first spin
- repeated spins
- rapid clicking
- double-clicking
- clicking during animation
- starting another simulation during animation
- switching roulette type during animation
- resizing browser during animation
- mobile viewport

The application must prevent inconsistent state.

Possible acceptable behavior:

```text
Disable Spin while animation is active.
```

Do not allow multiple simultaneous spins unless explicitly supported and correctly implemented.

---

# 11. Roulette Configuration Tests

Test:

```text
European
→
American
→
European
→
American
```

multiple times.

Verify:

- probabilities update
- wheel updates
- available pockets update
- statistics update
- 00 appears only in American
- expected probabilities update
- payout logic remains correct

---

# 12. Probability Tests

Verify exact theoretical probabilities.

## European

Individual pocket:

```text
1 / 37
```

Red:

```text
18 / 37
```

Black:

```text
18 / 37
```

Green:

```text
1 / 37
```

## American

Individual pocket:

```text
1 / 38
```

Red:

```text
18 / 38
```

Black:

```text
18 / 38
```

Green:

```text
2 / 38
```

Ensure displayed percentages use appropriate rounding but calculations retain sufficient precision.

---

# 13. Probability Sum Tests

For every roulette type:

```text
Sum of all individual pocket probabilities = 1
```

Test within a reasonable floating-point tolerance.

Also verify:

```text
Red + Black + Green = 1
```

---

# 14. Bet Probability Tests

Verify:

```text
Single number
Red
Black
Even
Odd
1–18
19–36
Dozens
Columns
```

against theoretical probabilities.

Do not accidentally include zero/00 in even-money bets.

---

# 15. Betting Payout Tests

Test all payouts.

Expected:

```text
Single number = 35:1
Even-money bets = 1:1
Dozens = 2:1
Columns = 2:1
```

Verify:

```text
profit
stake return
total return
loss
bankroll
```

Use deterministic test cases.

Do not use random results for payout unit tests.

---

# 16. Bankroll Tests

Test:

```text
Starting bankroll = 1000
Bet = 10
```

Win.

Expected:

```text
1000 - 10 + 20
=
1010
```

for an even-money bet.

Test single-number win:

```text
1000 - 10 + 360
=
1350
```

assuming a 35:1 profit plus original stake.

Test losses.

Test zero bankroll.

Test bet equal to bankroll.

Test bet larger than bankroll.

Test decimals.

Test very small bets.

Test invalid values.

---

# 17. History Tests

Verify:

- new round appended
- round number increments
- timestamp generated
- all derived properties are correct
- betting information is correct
- history survives reload

---

# 18. 1,000-Round Limit

Generate:

```text
1,001 rounds
```

Verify exactly:

```text
1,000 records
```

remain.

Verify:

```text
record #1
```

is removed and:

```text
record #2–#1001
```

remain.

Repeat with:

```text
1,100
2,000
10,000
```

where practical.

---

# 19. localStorage Tests

Test:

1. Start application.
2. Generate rounds.
3. Reload.
4. Verify history.
5. Close browser.
6. Reopen.
7. Verify history.

Then deliberately corrupt localStorage.

Examples:

```text
invalid JSON
null
[]
{}
wrong property types
invalid result
invalid timestamp
negative bankroll
NaN-like values
```

The application must recover gracefully.

It must not crash.

---

# 20. CSV Export Tests

Export:

- empty history
- 1 round
- 10 rounds
- 1,000 rounds

Verify:

- correct headers
- correct row count
- correct values
- correct handling of 00
- correct timestamps
- no broken commas
- no malformed fields

---

# 21. CSV Import Tests

Import:

- valid CSV
- empty CSV
- malformed CSV
- missing headers
- duplicated rows
- invalid numbers
- invalid colors
- invalid timestamps
- more than 1,000 rows
- European data
- American data with 00

The application must validate everything.

Never execute imported content.

---

# 22. Statistics Unit Tests

Create deterministic datasets.

Example:

```text
1, 2, 3, 4, 5
```

Verify:

```text
mean
median
mode
```

Create datasets with:

- one mode
- multiple modes
- no unique mode
- repeated values
- zeros
- 00

Verify every result.

---

# 23. Mean Tests

Verify known results.

Example:

```text
1,2,3,4,5
mean = 3
```

Test:

- empty dataset
- one value
- decimals
- zeros
- American 00

Ensure 00 handling is explicitly defined.

---

# 24. Median Tests

Test:

```text
odd number of values
even number of values
duplicates
zero
00
```

Verify correct behavior.

---

# 25. Mode Tests

Test:

```text
one mode
two modes
multiple modes
all values unique
empty dataset
```

Verify ties are correctly handled.

---

# 26. Frequency Tests

For deterministic datasets verify:

```text
count
percentage
expected percentage
difference
```

with exact expected values.

---

# 27. Color Analysis

Create known datasets and verify:

```text
red
black
green
```

counts.

Ensure 0 and 00 are always green.

---

# 28. Parity Analysis

Verify:

```text
Even
Odd
Green excluded
```

For American roulette verify:

```text
0 and 00
```

do not affect parity counts.

---

# 29. Range Analysis

Verify:

```text
1–18
19–36
0/00 excluded
```

---

# 30. Dozen Tests

Verify:

```text
1st dozen = 1–12
2nd dozen = 13–24
3rd dozen = 25–36
```

Zero and 00 excluded.

---

# 31. Column Tests

Verify standard roulette columns.

Test boundary values:

```text
1
2
3
12
13
24
25
36
```

and:

```text
0
00
```

---

# 32. Sequence Tests

Create deterministic sequences:

```text
R R R B B R
```

Verify:

- current streak
- longest streak
- streak counts
- average streak
- median streak

Repeat for:

- colors
- parity
- ranges

---

# 33. Gap Tests

Use deterministic sequences.

Example:

```text
17
...
...
17
```

Verify:

```text
gap
average gap
minimum gap
maximum gap
median gap
```

Ensure definitions are documented.

---

# 34. Repetition Tests

Test:

```text
17,17
17,x,17
17,x,x,17
```

Verify immediate repetition and within-window repetition.

---

# 35. Rolling Statistics

Verify:

```text
rolling mean
rolling frequency
rolling color percentage
```

for windows:

```text
10
25
50
100
```

Test datasets shorter than the requested window.

---

# 36. Expected vs Observed

For deterministic datasets verify:

```text
observed percentage
expected percentage
difference
```

Use the correct theoretical probability for European/American roulette.

---

# 37. Chi-Square Tests

Use known deterministic distributions.

Verify:

```text
chi-square statistic
degrees of freedom
p-value
```

against an independent trusted mathematical implementation if possible.

Do not rely solely on the application's own implementation to validate itself.

---

# 38. Independent Statistical Verification

Where practical, independently validate key statistical calculations using:

- Python
- a known statistics library
- independently implemented formulas
- trusted mathematical references

Do not copy the same algorithm into two locations and call that independent validation.

Compare:

```text
Application result
vs
Independent result
```

for:

- chi-square
- p-values
- confidence intervals
- Monte Carlo averages
- expected values

---

# 39. Confidence Interval Tests

Verify confidence intervals using deterministic examples.

Check:

- correct sample size
- correct proportion
- correct interval method
- correct boundary behavior

Do not allow impossible probabilities:

```text
< 0%
> 100%
```

---

# 40. Pattern Detector Tests

Create deterministic datasets specifically designed to trigger:

- hot number
- cold number
- color imbalance
- long streak
- repeated number
- large gap
- dozen imbalance
- column imbalance

Verify that the correct pattern is detected.

---

# 41. Pattern Detector Negative Tests

Create normal/random datasets where strong pattern claims should NOT be generated.

Verify the system does not exaggerate ordinary randomness.

---

# 42. False Positive Experiment

Run:

```text
100 datasets × 1,000 random spins
```

Then:

```text
500 datasets × 1,000 random spins
```

Then, if performance allows:

```text
1,000 datasets × 1,000 random spins
```

For every dataset:

1. Generate random data.
2. Run Pattern Detector.
3. Record every pattern.
4. Aggregate results.

Report:

```text
Total datasets
Patterns detected
Strong deviations
Potential anomalies
False-positive trigger rates
```

Do not expect zero pattern detections.

The objective is to understand how often ordinary random variation produces pattern-like signals.

---

# 43. Multiple Testing Validation

If the analyzer tests many numbers and metrics, evaluate whether it produces excessive false positives.

For example:

```text
37 individual numbers
+
colors
+
parity
+
dozens
+
columns
+
sequences
+
gaps
```

The more tests performed, the more likely some apparently unusual result will occur by chance.

Review whether the UI communicates this correctly.

If multiple-testing corrections are implemented, independently validate them.

---

# 44. Hot/Cold Validation

Generate random samples and measure how often the analyzer identifies:

```text
Hot number
Cold number
```

This should be expected.

Verify that the UI does NOT interpret hot/cold status as predictive evidence.

---

# 45. "Due Number" Validation

Search the entire project for misleading wording:

```text
due
overdue
must appear
will appear
next number
likely next
guaranteed
prediction
```

Review every occurrence.

Replace misleading statements with statistically correct language.

---

# 46. Next-Round Probability Validation

Verify that the probability displayed for the next independent spin does NOT change simply because a number:

- appeared recently
- has not appeared recently
- is hot
- is cold
- appeared repeatedly
- has a long gap

The mathematical probability must remain unchanged.

---

# 47. Monte Carlo Tests

Run:

```text
100 simulations
500 simulations
1,000 simulations
5,000 simulations
10,000 simulations
```

where feasible.

Test:

```text
100 spins
200 spins
500 spins
1,000 spins
```

per simulation.

Verify:

- number of simulations
- number of rounds
- bankroll
- bet amount
- wins
- losses
- final bankroll
- ROI
- drawdown

---

# 48. Monte Carlo Statistical Convergence

For the same strategy run increasing numbers of simulations.

Compare:

```text
100 simulations
1,000 simulations
10,000 simulations
```

The average return should generally become more stable as the number of simulations increases.

Do not require exact convergence in every random execution.

Use statistically appropriate tolerances.

---

# 49. Expected Value Validation

For every supported bet:

1. Calculate theoretical EV independently.
2. Run large Monte Carlo simulations.
3. Compare theoretical EV with simulated average.

The simulation should trend toward the theoretical expectation as sample size grows.

If it does not, investigate the implementation.

---

# 50. House Edge Validation

Verify:

European:

```text
≈ 2.70%
```

American:

```text
≈ 5.26%
```

for standard roulette bets.

Test several bet types.

The house edge should be consistent with the roulette configuration and payout structure.

---

# 51. Bankroll Depletion Tests

Test simulations where:

```text
starting bankroll < bet amount
starting bankroll = bet amount
starting bankroll > bet amount
```

Verify no invalid negative wagering occurs unless explicitly supported.

The application must define what happens when the bankroll cannot cover another bet.

---

# 52. Monte Carlo Distribution

Verify that the histogram contains exactly the expected number of simulation outcomes.

Check:

```text
minimum
maximum
median
mean
percentiles
```

against independently calculated values.

---

# 53. Percentile Tests

Use deterministic arrays where percentiles are known.

Verify:

```text
5th
25th
50th
75th
95th
```

definitions.

Document the percentile methodology.

---

# 54. Drawdown Tests

Create deterministic bankroll paths.

Verify maximum drawdown.

Example:

```text
1000
1100
1050
900
950
```

The maximum drawdown should be calculated from the previous peak correctly.

---

# 55. Simulation Independence

Verify that separate Monte Carlo simulations are independent.

Do not accidentally reuse the same generated sequence.

Do not accidentally use a deterministic sequence unless explicitly testing reproducibility.

---

# 56. Large-Scale Randomness Test

Generate at least:

```text
100,000
```

results for European roulette.

Analyze:

- number distribution
- color distribution
- parity
- dozens
- columns

Then repeat for American roulette.

If computationally feasible:

```text
1,000,000
```

results.

---

# 57. Law of Large Numbers Validation

Verify that observed frequencies generally move toward theoretical probabilities as sample size increases.

Do not hard-code an expected trajectory.

The trajectory will naturally fluctuate.

Validate convergence statistically, not visually only.

---

# 58. Distribution Sum Validation

For generated samples verify:

```text
sum of number counts = total rounds
```

and:

```text
sum of percentages ≈ 100%
```

within floating-point tolerance.

---

# 59. History vs Synthetic Samples

Ensure large Statistical Lab datasets do not accidentally enter:

```text
normal history
localStorage
roulette round counter
bankroll history
```

unless explicitly requested.

---

# 60. State Isolation

Test that:

```text
Normal Roulette
History
Analyzer
Simulation
Monte Carlo
Statistical Test Lab
```

do not corrupt each other's state.

For example:

Running 1,000 Monte Carlo simulations must not create 1,000 historical roulette rounds.

---

# 61. UI State Tests

Test:

- switching tabs
- changing roulette type
- changing bet type
- changing bet amount
- changing bankroll
- resetting data
- importing data
- exporting data
- running simulations
- running Monte Carlo
- navigating during calculations

---

# 62. Rapid Interaction Tests

Test:

- rapid Spin clicks
- rapid tab switching
- repeated Generate Sample clicks
- repeated Monte Carlo clicks
- repeated Import clicks
- changing settings during simulation

Prevent race conditions.

---

# 63. Concurrency

If Web Workers are used:

Test:

- starting a worker
- cancelling if supported
- completing a worker
- starting multiple jobs
- returning results to correct UI
- worker errors
- worker termination

No stale simulation result should overwrite a newer simulation.

---

# 64. Chart Testing

Verify every chart:

- renders
- has correct labels
- has correct values
- updates after new data
- updates after changing roulette type
- does not duplicate itself
- does not leak memory
- handles empty datasets
- handles 1,000 records
- handles large synthetic samples

---

# 65. Chart Data Validation

Compare chart datasets against the underlying statistical values.

The chart must not display:

```text
48.65%
```

while the underlying statistic is:

```text
47.65%
```

---

# 66. Responsive Testing

Test at approximate widths:

```text
320px
375px
414px
768px
1024px
1366px
1920px
```

Check:

- wheel
- tables
- charts
- navigation
- forms
- cards
- buttons

No horizontal overflow unless explicitly intended for tables.

---

# 67. Accessibility Testing

Check:

- semantic HTML
- keyboard navigation
- focus visibility
- button labels
- form labels
- ARIA where necessary
- screen-reader-friendly result information
- no color-only communication

Verify that red/black/green are also represented as text.

---

# 68. Browser Compatibility

Test where available:

- Chromium/Chrome
- Firefox
- Edge
- Safari considerations

Pay special attention to:

- Canvas/SVG
- localStorage
- Web Crypto
- Web Workers
- Blob downloads
- FileReader
- CSV import

---

# 69. Security Review

Search for:

```text
eval()
new Function()
innerHTML
document.write()
unsafe URL handling
```

Review whether any are necessary.

Avoid unsafe DOM insertion for imported data.

Ensure imported CSV cannot execute HTML or JavaScript.

---

# 70. LocalStorage Security

Verify that localStorage data is treated as untrusted input.

Do not assume:

```text
localStorage
```

contains valid application data.

Validate all loaded data.

---

# 71. Dependency Audit

Inspect all dependencies.

Identify:

- unused dependencies
- outdated dependencies
- unnecessary dependencies
- CDN dependencies
- dependencies that create unnecessary network requirements

The final application should remain lightweight.

---

# 72. Offline Test

Where possible:

1. Load the application.
2. Disable network access.
3. Reload or continue using it.

Verify core functionality still works.

Core features should not require external APIs.

---

# 73. Netlify Static Deployment Test

Verify that the final project can be deployed as a static website.

Check:

```text
No backend
No database
No server
No required environment variables
No API keys
```

If possible, create a production/static build and verify it.

---

# 74. Build Test

If the project has a build process:

```text
npm install
npm run build
```

or equivalent.

Verify:

- build succeeds
- no warnings that indicate actual problems
- output is deployable
- no missing assets

If there is no build process, verify direct static execution.

---

# 75. Console Error Audit

Run the complete application and inspect browser console.

There must be no unexpected:

```text
Error
Unhandled Promise Rejection
TypeError
ReferenceError
404
CORS error
```

Warnings should also be reviewed.

---

# 76. Memory Leak Testing

Repeatedly:

```text
spin
switch tabs
open charts
run simulations
run Monte Carlo
generate samples
```

Monitor whether memory continuously increases.

Look for:

- chart instances not destroyed
- event listeners duplicated
- timers not cleared
- workers not terminated
- animation loops not cancelled

---

# 77. Timer / Animation Cleanup

Verify:

- animation timers are cleared
- requestAnimationFrame loops are stopped
- event listeners are not duplicated
- no animation continues after leaving the page/section

---

# 78. Error Handling

Deliberately create:

- invalid settings
- invalid CSV
- invalid localStorage
- huge simulation
- invalid bet amount
- invalid bankroll
- missing data
- empty data

The application should display useful errors instead of crashing.

---

# 79. Reset Function

If a reset function exists, test it.

Verify it clearly resets only the intended data.

Potential categories:

```text
Reset History
Reset Bankroll
Reset Settings
Reset All
```

Do not silently delete data.

If "Reset All" exists, require an explicit confirmation.

---

# 80. Data Integrity

Verify that:

```text
round number
timestamp
result
color
parity
range
dozen
column
```

always agree.

Example:

If result is:

```text
17
```

then:

```text
color = red
parity = odd
range = 1–18
dozen = 2
column = 2
```

must all be correct.

---

# 81. Cross-Module Consistency

Do not allow:

```text
roulette.js
```

to classify 17 differently from:

```text
statistics.js
```

Create centralized domain logic where appropriate.

---

# 82. Mathematical Reference Validation

For all important formulas, independently verify:

- probability
- payout
- EV
- house edge
- expected frequency
- chi-square
- p-value
- confidence interval
- sequence probability
- repetition probability

Use trusted mathematical references or independent calculations during development.

---

# 83. Statistical Language Audit

Search the UI and source code for potentially misleading phrases.

Look for:

```text
prediction
guaranteed
due
hot = likely
cold = due
best bet
safe bet
winning strategy
sure win
high probability next
```

Replace or qualify them.

The application is a statistical analyzer, not a prediction system.

---

# 84. Pattern Explanation Quality

Every detected pattern should explain:

```text
What was observed?
How unusual is it?
What is the expected value?
What statistical method was used?
What is the sample size?
What are the limitations?
```

Avoid vague claims.

---

# 85. Statistical Significance vs Practical Significance

Ensure the application explains that:

A statistically significant deviation does not automatically imply:

```text
large practical effect
physical bias
predictive usefulness
```

Likewise:

A non-significant result does not prove perfect randomness.

---

# 86. Sample Size Warnings

Verify that small datasets display appropriate warnings.

For example:

```text
This sample is too small for strong statistical conclusions.
```

Do not overinterpret 10, 20, or 30 spins.

---

# 87. Known-Random Benchmark

Create a benchmark mode where the source is known to be generated by the application's random generator.

Use this to validate:

- Pattern Detector
- Bias Analyzer
- statistical tests

A correctly functioning analyzer should not systematically classify known-random data as biased.

---

# 88. Synthetic Bias Benchmark

Create an internal test-only dataset generator that deliberately introduces known bias.

For example:

```text
Number 17 has artificially increased probability.
```

Then verify:

- frequency analysis detects the deviation
- chi-square detects the deviation when statistically appropriate
- bias analyzer reports an anomaly
- the system does NOT claim physical proof

This is an extremely important test because it checks both:

```text
Sensitivity
+
False-positive control
```

---

# 89. Sensitivity Testing

Create several synthetic biased datasets:

```text
Very small bias
Small bias
Moderate bias
Large bias
```

Measure whether the analyzer becomes more sensitive as the bias increases.

Do not hard-code expected p-values without independent calculation.

---

# 90. Power Analysis Consideration

Where practical, estimate the ability of the statistical tests to detect known deviations.

Document that:

```text
Small biases require much larger samples to detect reliably.
```

Do not imply that 1,000 rounds can reliably detect every possible wheel imperfection.

---

# 91. Regression Testing

After every significant fix:

```text
Run full automated test suite.
```

Do not only test the modified feature.

A change in:

```text
roulette.js
```

may affect:

```text
statistics
simulation
charts
history
```

---

# 92. Final Automated Test Suite

Create a convenient command such as:

```bash
npm test
```

or the equivalent.

Ideally provide:

```text
npm run test:unit
npm run test:integration
npm run test:statistics
npm run test:e2e
npm run test:performance
npm run test:all
```

Only create commands that actually work.

---

# 93. Test Report

At the end, create:

```text
QA_REPORT.md
```

Include:

## Executive Summary

Overall result.

## Environment

Browser, Node version, OS, etc.

## Test Counts

```text
Tests executed:
Passed:
Failed:
Skipped:
```

## Bugs Found

For each:

```text
ID
Severity
Description
Root cause
Fix
Regression test
```

## Statistical Validation

Include:

- random distribution
- Monte Carlo convergence
- chi-square validation
- false-positive experiments
- synthetic bias tests

## Performance

Include:

- generation times
- simulation times
- memory observations

## Security

Include findings.

## Accessibility

Include findings.

## Deployment

State whether static Netlify deployment was validated.

---

# 94. Severity Classification

Use:

```text
CRITICAL
HIGH
MEDIUM
LOW
INFO
```

Examples:

### CRITICAL

Data corruption, impossible roulette results, incorrect probability engine, security vulnerability.

### HIGH

Incorrect bankroll calculations, incorrect payouts, broken American roulette, major statistical calculation errors.

### MEDIUM

Broken chart, import failure, persistence issue.

### LOW

Minor UI issue.

### INFO

Improvement opportunity.

---

# 95. Do Not Hide Failures

If a test fails:

Do not remove the test simply to make the suite pass.

Instead:

1. Investigate.
2. Determine whether the test or implementation is wrong.
3. Fix the correct component.
4. Re-run.

If a statistical test occasionally fails because of legitimate random variation, redesign the test using statistically appropriate criteria rather than simply increasing an arbitrary tolerance.

---

# 96. Random Test Reproducibility

For debugging statistical failures, provide a way to record:

```text
test name
sample size
roulette type
seed or test metadata
```

If the production RNG is intentionally non-seeded, do not weaken production randomness merely to make tests deterministic.

A deterministic test generator may be used separately for unit tests.

---

# 97. Property-Based Testing

Where practical, test invariants such as:

For every valid result:

```text
getColor(result)
getParity(result)
getRange(result)
getDozen(result)
getColumn(result)
```

must always return internally consistent values.

For every history:

```text
history.length <= 1000
```

must always hold.

For every probability distribution:

```text
sum(probabilities) ≈ 1
```

must hold.

For every valid bet:

```text
payout calculation is non-negative
```

and follows the configured payout rules.

---

# 98. Fuzz Testing

Fuzz:

- CSV parser
- localStorage parser
- settings
- bankroll
- bet amount
- imported results

Use:

- empty strings
- whitespace
- huge numbers
- negative numbers
- decimal values
- malformed CSV
- Unicode
- unexpected columns
- duplicated columns
- missing values
- extremely long values

The application must not crash.

---

# 99. Final Manual QA Checklist

After automated validation, manually inspect:

```text
[ ] Roulette page
[ ] History
[ ] Analyzer
[ ] Pattern Detective
[ ] Statistical Test Lab
[ ] Simulation Lab
[ ] Monte Carlo Lab
[ ] Wheel Bias Analyzer
[ ] Charts
[ ] Import
[ ] Export
[ ] Settings
[ ] Mobile layout
[ ] Empty states
[ ] Error states
[ ] Loading states
```

---

# 100. Final Quality Gate

Do not declare the project complete until:

```text
No known critical bugs
No known high-severity bugs
Automated tests pass
Statistical tests pass
Randomness benchmark behaves correctly
Synthetic bias benchmark behaves correctly
False-positive behavior is understood
Monte Carlo results are consistent with theory
No major console errors
No obvious memory leaks
Static deployment works
README is updated
QA_REPORT.md is generated
```

If something cannot be tested automatically, clearly document:

```text
What was not tested
Why it could not be tested
How it should be tested manually
```

---

# 101. Final Deliverables

At the end of this QA phase, produce:

```text
QA_REPORT.md
```

and, if appropriate:

```text
TESTING.md
```

Document:

- test architecture
- commands
- test categories
- statistical methodology
- benchmarks
- limitations

The final project should contain a maintainable automated test suite.

---

# 102. Final Instruction to the Coding Agent

You are acting as:

```text
Senior QA Engineer
+
Test Automation Engineer
+
Statistical Software Reviewer
+
Performance Engineer
+
Security Reviewer
```

Do not merely inspect the project.

**Execute the tests.**

Do not merely report defects.

**Fix the defects.**

Do not merely claim that statistics are correct.

**Independently validate the statistics.**

Do not merely test one random sample.

**Run large-scale random benchmarks.**

Do not merely test that the Pattern Detector finds patterns.

**Test whether it finds false patterns in known-random data.**

Do not merely test random data.

**Also test synthetic biased data to verify that the analyzer can detect real statistical deviations.**

After all fixes, run the full regression suite again.

The final goal is:

> Build confidence that the Roulette Statistical Analyzer is technically reliable, statistically responsible, performant, robust, and ready for static deployment.

The application must remain:

**100% client-side, database-free, backend-free, and Netlify-compatible.**
