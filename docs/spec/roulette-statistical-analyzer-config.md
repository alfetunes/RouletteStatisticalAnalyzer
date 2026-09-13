# Roulette Statistical Analyzer — Final Project Specification

## 1. Project Overview

Build a complete static web application called **Roulette Statistical Analyzer**.

The application must combine:

- A visually realistic roulette wheel
- Random roulette spins
- Configurable bankroll and bet amount
- A persistent history of the last 1,000 rounds
- Statistical analysis
- Probability calculations
- Pattern analysis
- Automatic insights
- Charts and data visualization
- Betting simulations
- Sample generation and comparison
- CSV import/export

The application is intended as a **statistical analysis and simulation tool**, not as a gambling recommendation or prediction engine.

The application must clearly distinguish:

1. Mathematical probability
2. Observed historical frequency
3. Statistical variation
4. Apparent patterns
5. Predictive claims

Historical results must NEVER be presented as proof that a particular number, color, or bet is more likely to occur on the next independent roulette spin.

---

# 2. Core Architectural Requirement

## 2.1 100% Client-Side

This is a strict requirement.

The application must run **100% inside the user's browser**.

Do NOT create:

- Backend
- Database
- REST API
- GraphQL API
- Authentication system
- User accounts
- Server-side application
- Cloud database
- Remote data storage
- Custom server

The application must be deployable as a **static website**.

The final application should be compatible with:

- Netlify
- GitHub Pages
- Cloudflare Pages
- Any standard static web hosting

The production application must not require Node.js, Docker, PHP, Python, Java, or any backend runtime.

Node/npm may be used during development if useful, but the final application must remain a static client-side application.

---

# 3. Deployment Requirement

The application must be deployable to Netlify.

Prefer a zero-build architecture.

The final project should work with:

```text
index.html
css/
js/
assets/
```

If a build system is used during development, it must not be required for the final static deployment unless absolutely necessary.

The project should include a `README.md` containing Netlify deployment instructions.

If useful, include:

```text
netlify.toml
```

but do not add it unless necessary.

The final application must not contain server-side code.

---

# 4. Technology Stack

Use:

- HTML5
- CSS3
- Modern JavaScript (ES6+)
- SVG and/or Canvas for roulette rendering
- Chart.js or another lightweight charting library if needed
- Browser localStorage
- Browser crypto API

Avoid frontend frameworks unless there is a compelling reason.

Prefer vanilla JavaScript.

The application should be easy to understand and maintain.

---

# 5. Project Structure

Use a modular structure similar to:

```text
roulette-statistical-analyzer/
│
├── index.html
│
├── css/
│   ├── style.css
│   ├── roulette.css
│   ├── dashboard.css
│   └── responsive.css
│
├── js/
│   ├── app.js
│   ├── random.js
│   ├── roulette.js
│   ├── roulette-animation.js
│   ├── history.js
│   ├── storage.js
│   ├── statistics.js
│   ├── probability.js
│   ├── pattern-analyzer.js
│   ├── simulation.js
│   ├── charts.js
│   └── export.js
│
├── assets/
│
├── tests/
│
├── README.md
│
└── netlify.toml
```

The exact structure may be adjusted if a better architecture is identified.

Do not put the entire application into one JavaScript file.

---

# 6. User-Configurable Settings

The only user-configurable settings are:

## 6.1 Number of Zeros

Allow only:

- 1 zero — European roulette
- 2 zeros — American roulette

No other roulette configuration should be exposed.

### European Roulette

Numbers:

```text
0–36
```

Total pockets:

```text
37
```

### American Roulette

Numbers:

```text
0
00
1–36
```

Total pockets:

```text
38
```

---

## 6.2 Bankroll

Allow the user to define:

```text
Starting bankroll
```

Example:

```text
R$ 1,000.00
```

---

## 6.3 Bet Amount

Allow the user to define:

```text
Bet amount per round
```

Example:

```text
R$ 10.00
```

Validate:

- Must be greater than zero
- Must be a valid numeric value
- Must not exceed the available bankroll when placing a real simulated bet

Do not add additional roulette configuration options.

---

# 7. Random Number Generation

The random result must be generated locally in the browser.

Prefer:

```javascript
crypto.getRandomValues()
```

over `Math.random()`.

Create a dedicated random module.

Example API:

```javascript
generateRandomResult(rouletteType)
```

This function must return a valid pocket according to the configured roulette.

The same core result-generation logic must be used by:

- Real spins
- Simulations
- Pattern/sample generation

Do not create different random algorithms for different parts of the application.

---

# 8. Roulette Wheel

Create a visually convincing roulette wheel.

The wheel must display:

- Correct roulette numbers
- Correct red/black colors
- Green zero
- Green 00 for American roulette
- Number labels
- Wheel center
- Ball
- Pointer/marker

The wheel should be responsive.

---

# 9. Roulette Animation

The roulette animation must be synchronized with the actual randomly selected result.

The correct flow is:

```text
1. Generate random result
2. Determine target pocket
3. Start wheel animation
4. Animate wheel and ball
5. Decelerate
6. Stop exactly at the selected pocket
7. Display result
8. Record round
9. Update statistics
```

The visual position of the ball must NEVER determine the result.

The result must already be known before the animation begins.

The animation exists only to visualize the previously generated random result.

Use realistic easing and multiple wheel rotations.

Do not make every spin visually identical.

---

# 10. Spin Result

After every spin, display:

- Result
- Color
- Parity
- Low/High
- Dozen
- Column
- Round number
- Timestamp

Example:

```text
ROUND #153

17

RED
ODD
1–18
2ND COLUMN
2ND DOZEN
```

The result must be visually prominent.

---

# 11. Betting

Support these bet types:

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

For a single-number bet, allow the user to select the number.

Do not support betting on zero as a separate configuration unless naturally represented by the single-number bet.

---

# 12. Standard Roulette Payouts

Use standard payouts:

| Bet | Payout |
|---|---:|
| Single number | 35:1 |
| Red | 1:1 |
| Black | 1:1 |
| Even | 1:1 |
| Odd | 1:1 |
| 1–18 | 1:1 |
| 19–36 | 1:1 |
| Dozen | 2:1 |
| Column | 2:1 |

When a bet wins:

```text
profit = betAmount * payout
```

The original stake is also returned.

Therefore:

```text
totalReturn = betAmount + profit
```

When a bet loses:

```text
loss = betAmount
```

Make the bankroll calculations explicit and test them carefully.

---

# 13. Main Navigation

Create four primary sections:

```text
🎰 Roulette
📜 History
📊 Analyzer
🧪 Simulation
```

The interface should behave like a single-page application while remaining a static client-side application.

---

# 14. Main Dashboard

The Roulette page should display:

- Roulette wheel
- Current result
- Bankroll
- Bet amount
- Current bet type
- Spin button
- Number of recorded rounds
- Recent results
- Quick statistics

Example cards:

```text
BANKROLL
R$ 1,000.00

BET
R$ 10.00

ROUNDS
153

LAST RESULT
17 RED
```

---

# 15. History

Store the last **1,000 rounds**.

Each record should contain at least:

```javascript
{
    id,
    roundNumber,
    result,
    color,
    parity,
    range,
    dozen,
    column,
    timestamp
}
```

If betting information is available for that round, it may also contain:

```javascript
{
    betType,
    betSelection,
    betAmount,
    won,
    profit,
    bankrollAfter
}
```

---

# 16. History Limit

The history must never exceed 1,000 rounds.

When adding a new record:

```javascript
history.push(newRound);

if (history.length > 1000) {
    history.shift();
}
```

The oldest record must be removed first.

---

# 17. Local Persistence

Use browser `localStorage`.

Store:

- Settings
- History
- Bankroll state
- Relevant simulation data if appropriate

Suggested keys:

```text
roulette-settings
roulette-history
roulette-bankroll
```

Validate all data loaded from localStorage.

Do not blindly trust stored JSON.

Handle:

- Invalid JSON
- Missing properties
- Invalid numbers
- Invalid colors
- Invalid timestamps
- Invalid roulette type
- Corrupted history

If stored data is invalid, recover gracefully without crashing the application.

---

# 18. Privacy

All user data must remain in the browser.

Do not send:

- History
- Bankroll
- Bets
- Simulations
- Statistics

to any external server.

No account or login is required.

No analytics or tracking is required.

---

# 19. Offline-Friendly Architecture

The core application must not depend on an external API.

The following must work locally:

- Random generation
- Roulette
- History
- Statistics
- Probability calculations
- Pattern analysis
- Simulations
- CSV export
- CSV import

If a chart library is used through a CDN, prefer making the application capable of using a local copy so the core functionality can also operate without an internet connection.

---

# 20. History Table

Create a professional data table:

```text
Round | Number | Color | Parity | Range | Dozen | Column | Time
```

Features:

- Pagination
- Search
- Sorting
- Filters
- Recent-first ordering

Filters may include:

- Red
- Black
- Green
- Even
- Odd
- 1–18
- 19–36
- Dozen
- Column
- Number

---

# 21. History Export

Allow the user to export history to CSV.

The CSV must be generated entirely in the browser using:

```javascript
Blob
URL.createObjectURL()
```

No server upload.

---

# 22. History Import

Allow CSV import.

The file must be processed locally.

Validate:

- File structure
- Required columns
- Valid roulette results
- Color
- Timestamp
- Maximum 1,000 records

Invalid rows should be rejected safely.

Do not crash because of malformed CSV.

---

# 23. Statistical Analyzer

Create a dedicated Analyzer page.

It should analyze the current history or a generated sample.

Provide selectable analysis windows:

- Last 10
- Last 25
- Last 50
- Last 100
- Last 250
- Last 500
- Last 1,000
- Entire available history

If fewer rounds exist than the selected window, use the available rounds and clearly indicate the actual sample size.

---

# 24. Number Frequency

For every number calculate:

- Occurrences
- Observed percentage
- Expected percentage
- Difference in percentage points
- Last occurrence
- Rounds since last occurrence
- Average interval between occurrences
- Minimum interval
- Maximum interval
- Largest gap

Display:

```text
Number | Occurrences | Observed % | Expected % | Difference | Last Seen | Gap
```

---

# 25. Mathematical Probability

For European roulette:

Each individual pocket:

```text
1 / 37
≈ 2.70%
```

For American roulette:

Each individual pocket:

```text
1 / 38
≈ 2.63%
```

For red:

European:

```text
18 / 37
≈ 48.65%
```

American:

```text
18 / 38
≈ 47.37%
```

For black:

Same as red.

European zero:

```text
1 / 37
≈ 2.70%
```

American zero:

```text
1 / 38
≈ 2.63%
```

American 00:

```text
1 / 38
≈ 2.63%
```

---

# 26. Next-Round Probability Section

Create a prominent section:

```text
Next Round — Mathematical Probability
```

Show probabilities for all possible outcomes.

For individual numbers:

```text
17 — 2.70%
32 — 2.70%
7  — 2.70%
...
```

For colors:

```text
Red
48.65%

Black
48.65%

Green
2.70%
```

for European roulette.

For American roulette:

```text
Red
47.37%

Black
47.37%

Green
5.26%
```

Do not rank individual numbers as if one has a higher mathematical probability than another.

---

# 27. Explanation of Next-Round Probability

The interface must explain WHY.

Example:

```text
Why does every individual number have the same probability?

Because each pocket represents one equally likely outcome of the wheel.

European roulette has 37 pockets.
Therefore each number has a probability of 1/37 ≈ 2.70%.

Previous spins do not change the mathematical probability of the next independent spin.
```

For color:

```text
There are 18 red pockets, 18 black pockets, and 1 green pocket in European roulette.

Therefore:

Red = 18/37 = 48.65%
Black = 18/37 = 48.65%
Green = 1/37 = 2.70%
```

---

# 28. Observed Probability

Separately display:

```text
Observed Frequency
```

Example:

```text
17

Observed:
3.10%

Expected:
2.70%

Difference:
+0.40 percentage points
```

Explain:

```text
The observed frequency is calculated from the selected historical sample.

It does not change the mathematical probability of the next independent spin.
```

---

# 29. Mean

Calculate:

- Mean of results
- Expected mean
- Difference

For standard roulette numbers 0–36, the theoretical mean is:

```text
18
```

For American roulette, handle `00` correctly and do not treat it as an ordinary decimal number.

A suitable internal representation may be used for calculations, but the UI must clearly explain how 00 is handled.

---

# 30. Median

Calculate:

- Overall median
- Median for selected analysis window
- Comparison with theoretical distribution where meaningful

Show:

```text
Observed Median
Expected / Reference Median
Difference
```

---

# 31. Mode

Calculate:

- Overall mode
- Top 5 numbers
- Top 10 numbers

Handle ties correctly.

Example:

```text
1. 17 — 32 occurrences
2. 8  — 30 occurrences
3. 23 — 29 occurrences
```

If multiple numbers share the same highest frequency, identify all modes.

---

# 32. Color Analysis

Calculate:

- Red count
- Black count
- Green count
- Observed percentages
- Expected percentages
- Difference

Show charts.

---

# 33. Parity Analysis

Calculate:

- Even
- Odd
- Zero/00 excluded from parity

Display observed vs expected.

---

# 34. Range Analysis

Calculate:

- 1–18
- 19–36
- Zero/00 separately

Display observed vs expected.

---

# 35. Dozen Analysis

Calculate:

- 1st dozen
- 2nd dozen
- 3rd dozen
- Zero/00

Display:

- Counts
- Percentages
- Expected percentages
- Difference

---

# 36. Column Analysis

Calculate:

- 1st column
- 2nd column
- 3rd column
- Zero/00

Display:

- Counts
- Percentages
- Expected percentages
- Difference

---

# 37. Charts

Create responsive charts for:

1. Frequency by number
2. Observed vs expected number frequency
3. Red vs black vs green
4. Even vs odd
5. Low vs high
6. Dozens
7. Columns
8. Distribution of results
9. Rolling mean
10. Frequency over time
11. Bankroll evolution
12. Simulation results

Charts should update automatically.

Avoid excessive chart rendering and memory leaks.

Destroy/reuse chart instances when appropriate.

---

# 38. Rolling Statistics

Provide rolling statistics where meaningful.

For example:

- Rolling mean over 25 rounds
- Rolling mean over 50 rounds
- Rolling red percentage
- Rolling black percentage
- Rolling number frequency

Make the selected window visible.

---

# 39. Sequence Analysis

Analyze sequences of:

- Red
- Black
- Even
- Odd
- Low
- High

Calculate:

- Current sequence
- Longest sequence
- Average sequence length
- Frequency of sequence lengths

Example:

```text
Current:
Red × 6

Longest red sequence:
8
```

Do not call a color "due" after a long sequence.

---

# 40. Number Repetition Analysis

Detect:

- Immediate number repetitions
- Repetition within 2 rounds
- Repetition within 3 rounds
- Repeated number pairs
- Repeated number triplets

Show these as descriptive statistics.

Example:

```text
17 appeared in consecutive rounds 2 times in the selected sample.
```

Do not imply that repetition predicts future results.

---

# 41. Gap Analysis

For each number calculate:

- Rounds since last occurrence
- Average gap
- Minimum gap
- Maximum gap
- Median gap

Use the term:

```text
Rounds since last occurrence
```

instead of presenting a number as "due".

Include an explanation:

```text
A long gap does not increase the mathematical probability of the number appearing on the next spin.
```

---

# 42. Pattern Analysis

Create a dedicated section:

```text
Pattern Detective
```

The system should search for descriptive patterns such as:

- Hot numbers
- Cold numbers
- Long sequences
- Short sequences
- Repeated numbers
- Number clusters
- Dozen concentration
- Column concentration
- Color imbalance
- Parity imbalance
- Rolling changes
- Large deviations from expected frequencies

The labels must clearly indicate these are observations.

---

# 43. Pattern Classification

Classify findings as:

```text
Observation
Weak evidence
Moderate deviation
Potentially unusual
```

Do not call something "predictive" merely because it deviates from expectation.

Do not claim that a detected pattern can predict the next result.

---

# 44. Automatic Insights

Generate dynamic insights from actual data.

Examples:

```text
The number 17 was the most frequent number in the last 500 rounds.
```

```text
Red occurred 4.2 percentage points above its mathematical expectation in this sample.
```

```text
The third dozen appeared less frequently than expected in the selected window.
```

```text
The current sample contains 1,000 rounds.
```

```text
The observed distribution differs from the theoretical distribution, but this does not establish that the wheel is biased.
```

The system must never generate fake insights.

Insights must be based on actual calculations.

---

# 45. Statistical Tests

Where appropriate, implement:

- Expected frequency comparison
- Percentage deviation
- Z-score approximation for proportions
- Chi-square goodness-of-fit for number distribution
- Chi-square analysis for color distribution
- Confidence intervals where appropriate

Explain results in plain language.

Example:

```text
Chi-square compares the observed distribution with the theoretical distribution.

A deviation does not automatically mean the wheel is biased.
Random samples naturally fluctuate around their expected values.
```

If sample size is too small:

```text
Insufficient sample size for a meaningful statistical assessment.
```

---

# 46. Sample Size Indicator

Display:

```text
Sample Size
```

Suggested labels:

```text
0–30:
Very small sample

31–100:
Small sample

101–250:
Moderate sample

251–500:
Good sample

501–1000:
Large sample for this tool
```

Explain:

```text
Even 1,000 rounds are limited when attempting to detect small deviations from theoretical probabilities.
```

---

# 47. Roulette Analyzer Mode

Create a feature allowing the user to enter or generate up to:

```text
1,000 rounds
```

Then analyze the entire sequence.

The purpose is to investigate whether a sequence displays unusual characteristics.

The analyzer should produce:

- Number frequencies
- Color frequencies
- Parity
- Dozens
- Columns
- Mean
- Median
- Mode
- Standard deviation where meaningful
- Sequences
- Repetitions
- Gaps
- Expected vs observed
- Statistical tests
- Insights

---

# 48. Manual Data / Imported Data Analysis

The analyzer should support analyzing imported historical roulette results.

Allow the user to import up to 1,000 rounds through CSV.

The imported sequence should be analyzed exactly like generated rounds.

Validate that imported numbers are valid for the selected roulette configuration.

If the imported data contains 00:

- Only accept it for American roulette.
- Treat it as a green pocket.
- Do not include it as an ordinary numeric value in arithmetic statistics without a clearly defined methodology.

---

# 49. Simulation Lab

Create a separate page:

```text
Simulation Lab
```

Allow:

```text
100 rounds
200 rounds
500 rounds
1000 rounds
```

The user selects:

- Bet type
- Number when applicable
- Bet amount comes from the main configuration
- Starting bankroll comes from the main configuration

---

# 50. Simulation Bet Types

Support:

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

---

# 51. Simulation Output

Show:

```text
Rounds
Bet
Starting bankroll
Bet amount
Wins
Losses
Win rate
Total wagered
Total return
Profit/Loss
Final bankroll
ROI
Longest winning streak
Longest losing streak
Maximum drawdown
```

Create a bankroll-over-time chart.

---

# 52. Simulation Reproducibility

Each simulation should produce a new independent random sequence.

If useful, display a simulation identifier and timestamp.

Do not imply that the simulation predicts actual future roulette results.

---

# 53. Multi-Bet Comparison

Allow users to compare several independent simulations.

Example:

```text
1,000 rounds

Red
Black
Number 17
1st dozen
2nd column
```

Show:

| Bet | Wins | Win Rate | ROI | Profit/Loss |
|---|---:|---:|---:|---:|

This is a statistical comparison only.

Do not recommend a "best bet" based solely on one simulation.

---

# 54. Sample Generator / Pattern Explorer

Create:

```text
Pattern Explorer
```

Allow generation of:

- 100
- 200
- 500
- 1000

random rounds.

Then automatically analyze:

- Most frequent numbers
- Least frequent numbers
- Mean
- Median
- Mode
- Color distribution
- Number distribution
- Longest sequences
- Repetitions
- Gaps
- Expected vs observed
- Statistical deviations

Allow:

```text
Generate New Sample
```

to create another independent sample.

---

# 55. Sample Comparison

Allow:

```text
Sample A
vs
Sample B
```

Each may contain up to 1,000 rounds.

Compare:

- Mean
- Median
- Mode
- Number frequencies
- Colors
- Dozens
- Columns
- Sequence lengths
- Deviations
- Statistical indicators

This feature should demonstrate that two random samples can look noticeably different.

---

# 56. Expected Value

Calculate theoretical expected value for standard bets.

European roulette house edge:

```text
≈ 2.70%
```

American roulette house edge:

```text
≈ 5.26%
```

Explain that the zero/00 pockets create the casino advantage.

For a standard even-money bet:

European:

```text
EV ≈ -2.70%
```

American:

```text
EV ≈ -5.26%
```

Use correct formulas for other bets as appropriate.

---

# 57. Responsible Statistical Messaging

The UI must include educational explanations.

Avoid wording such as:

```text
This number is going to come next.
```

```text
Bet black because red appeared many times.
```

```text
17 is due.
```

```text
This pattern guarantees a win.
```

Instead use:

```text
17 appeared more frequently in this sample.
```

```text
The observed frequency differs from the theoretical expectation.
```

```text
Previous independent spins do not change the mathematical probability of the next spin.
```

---

# 58. Statistical Summary

Create a final summary card:

```text
Analysis Summary
```

Example:

```text
You analyzed 1,000 rounds.

The observed distribution contains several deviations from the theoretical distribution.

Number 17 was the most frequent result in this sample.

Red appeared above its expected frequency.

These observations describe the sample but do not establish that the roulette wheel is biased or that the next result can be predicted.

For the next independent spin, the mathematical probability of each individual pocket remains unchanged.
```

Generate this dynamically from the actual data.

---

# 59. User Interface Design

Use a professional dark analytics/casino design.

Suggested visual language:

- Dark background
- Casino-inspired roulette colors
- Cards
- Clean typography
- High-quality spacing
- Subtle animations
- Responsive charts
- Responsive tables

Avoid making the UI look like a cheap casino website.

It should look more like:

```text
Casino + Statistical Laboratory + Data Analytics Dashboard
```

---

# 60. Responsive Design

The application must work on:

- Desktop
- Laptop
- Tablet
- Mobile

On mobile:

- Stack cards
- Make charts responsive
- Make the roulette wheel smaller
- Allow horizontal scrolling for complex tables
- Keep the main result visible
- Keep controls usable

---

# 61. Accessibility

Implement:

- Semantic HTML
- Accessible buttons
- Keyboard navigation
- Sufficient contrast
- Visible focus states
- ARIA labels where appropriate
- Do not rely only on color to communicate results

For example, red/black results should also display the text:

```text
RED
BLACK
GREEN
```

---

# 62. Performance

The application must comfortably handle:

- 1,000 history records
- Multiple statistical calculations
- Multiple charts
- Simulation of 1,000 rounds

Avoid unnecessary DOM updates.

Avoid recreating charts unnecessarily.

Use efficient calculations.

Keep modules independent.

---

# 63. Data Model

Create a consistent internal data model.

Suggested round:

```javascript
{
    id: "unique-id",
    roundNumber: 153,
    result: "17",
    color: "red",
    parity: "odd",
    range: "low",
    dozen: 2,
    column: 2,
    timestamp: "2026-09-13T01:00:00.000Z"
}
```

For American `00`:

```javascript
{
    result: "00",
    color: "green",
    parity: null,
    range: null,
    dozen: null,
    column: null
}
```

Do not represent 00 as an ordinary numeric 0 internally when that would create statistical errors.

---

# 64. Utility Functions

Create reusable functions for:

```text
getColor(result)
getParity(result)
getRange(result)
getDozen(result)
getColumn(result)
getExpectedProbability(...)
calculateMean(...)
calculateMedian(...)
calculateMode(...)
calculateFrequency(...)
calculateSequences(...)
calculateGaps(...)
calculateChiSquare(...)
calculateROI(...)
calculateExpectedValue(...)
```

Keep pure statistical functions independent from the DOM.

---

# 65. Separation of Concerns

Strictly separate:

```text
Data
Business logic
Statistics
Probability
Simulation
UI
Animation
Persistence
Charts
Export/import
```

Do not mix DOM manipulation into statistical calculation functions.

---

# 66. Testing

Create tests for:

## Roulette

- European roulette only generates 0–36
- American roulette only generates 0, 00, 1–36
- No invalid result
- Color mapping
- Dozen mapping
- Column mapping

## Probability

- European individual probability = 1/37
- American individual probability = 1/38
- European red = 18/37
- American red = 18/38
- Correct green probability

## History

- Maximum 1,000 records
- Oldest record removed
- Persistence
- Recovery from corrupted storage

## Statistics

- Mean
- Median
- Mode
- Frequency
- Percentages
- Sequences
- Gaps

## Betting

- Correct payouts
- Correct bankroll calculation
- Correct wins/losses
- Correct ROI

## Simulation

- Correct number of rounds
- Valid results
- Correct bankroll evolution
- Correct statistics

---

# 67. Security / Robustness

Never use unsafe dynamic HTML insertion for untrusted imported data.

Validate imported CSV.

Escape user-provided content.

Do not use `eval()`.

Do not execute imported JavaScript.

Do not trust localStorage blindly.

---

# 68. No Secrets

The final project must contain:

- No API keys
- No passwords
- No tokens
- No secrets
- No environment variables required for production

The project must work as a static site.

---

# 69. README

Create a complete `README.md`.

Include:

## Project

What the application does.

## Features

List all major features.

## Architecture

Explain client-side architecture.

## Running Locally

Explain how to open/run the application.

## Netlify

Explain how to deploy:

1. Create/open a Netlify account
2. Deploy the static project
3. No database required
4. No backend required

## Data Storage

Explain that history is stored in browser localStorage.

## Privacy

Explain that data remains locally in the browser.

## Roulette Mathematics

Explain European and American roulette probabilities.

## Statistics

Explain mean, median, mode, frequency, deviations, sequences, gaps, chi-square, etc.

## Simulation

Explain how betting simulations work.

## Limitations

Explain that statistical observations do not predict independent future roulette spins.

---

# 70. Final Acceptance Criteria

Before considering the project complete, verify all of the following:

### Architecture

- [ ] 100% client-side
- [ ] No backend
- [ ] No database
- [ ] No API server
- [ ] No authentication
- [ ] Static hosting compatible
- [ ] Netlify compatible

### Roulette

- [ ] European roulette works
- [ ] American roulette works
- [ ] Correct pockets
- [ ] Correct colors
- [ ] Correct animation
- [ ] Ball stops at the actual generated result
- [ ] Random generation occurs locally

### History

- [ ] Maximum 1,000 records
- [ ] localStorage persistence
- [ ] Reload recovery
- [ ] Search
- [ ] Filters
- [ ] Pagination
- [ ] CSV export
- [ ] CSV import

### Statistics

- [ ] Frequency
- [ ] Expected frequency
- [ ] Mean
- [ ] Median
- [ ] Mode
- [ ] Color analysis
- [ ] Parity
- [ ] Low/high
- [ ] Dozens
- [ ] Columns
- [ ] Sequences
- [ ] Gaps
- [ ] Repetitions
- [ ] Rolling statistics
- [ ] Statistical tests
- [ ] Automatic insights

### Probability

- [ ] Correct mathematical probabilities
- [ ] Correct European probabilities
- [ ] Correct American probabilities
- [ ] Next-round explanation
- [ ] Clear distinction between mathematical probability and historical frequency

### Simulation

- [ ] 100 rounds
- [ ] 200 rounds
- [ ] 500 rounds
- [ ] 1,000 rounds
- [ ] All supported bet types
- [ ] Correct payouts
- [ ] Correct bankroll
- [ ] ROI
- [ ] Drawdown
- [ ] Streaks
- [ ] Charts

### Quality

- [ ] Responsive
- [ ] Accessible
- [ ] No console errors
- [ ] No broken charts
- [ ] No broken imports
- [ ] No invalid localStorage state
- [ ] No fake insights
- [ ] No predictive gambling claims
- [ ] README complete

---

# 71. Final Development Instruction

Do not merely create a visual mockup.

Implement the complete functional application.

After implementation:

1. Run the application.
2. Generate roulette rounds.
3. Generate at least 1,000 rounds.
4. Verify that only the last 1,000 are retained.
5. Reload the page and verify persistence.
6. Test European roulette.
7. Test American roulette.
8. Test all bet types.
9. Test all simulation sizes.
10. Test CSV export.
11. Test CSV import.
12. Inspect all statistical calculations.
13. Inspect all probability calculations.
14. Verify charts.
15. Test mobile/responsive layout.
16. Check browser console for errors.
17. Fix all discovered bugs.
18. Review the project for unnecessary dependencies.
19. Confirm that no backend or database is required.
20. Confirm that the project can be deployed as a static site to Netlify.

The final result should feel like a polished:

**Roulette + Probability Laboratory + Statistical Analyzer + Simulation Dashboard**

rather than simply a roulette game.

The most important principle is:

> Analyze randomness without pretending to predict randomness.
