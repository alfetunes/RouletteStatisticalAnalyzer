# Roulette Statistical Analyzer

**Live demo: [roulettestatisticalanalyzer.netlify.app](https://roulettestatisticalanalyzer.netlify.app/)**

A 100% client-side roulette simulation, probability, and statistical
analysis laboratory. It is a **statistical analysis and simulation tool**,
not a gambling recommendation or prediction engine — it never claims that
historical results predict the next independent spin.

## Project

The application combines a visually realistic roulette wheel with
cryptographically-random spins, a persistent history of the last 1,000
rounds, betting and bankroll simulation, and an in-depth statistical
analyzer (frequency tables, probability explanations, sequences, gaps,
pattern detection, chi-square/z-score tests, and automatic insights).

## Features

- European (1 zero, 37 pockets) and American (0 and 00, 38 pockets) wheels
- SVG roulette wheel in true physical pocket order, animated to a
  pre-generated result (the animation never decides the outcome)
- Configurable starting bankroll and bet amount, with all standard bet
  types (straight, red/black, even/odd, low/high, dozens, columns) and
  standard payouts
- **Auto Spin**: spin automatically a set number of times (5–100, or until
  stopped), pausing briefly between spins. Settings and bet controls lock
  for the whole session — same generate-before-animate flow and the same
  bankroll/selection checks as a manual spin, so it stops on its own if the
  bankroll can no longer cover the bet.
- Round history (max 1,000 rounds) with search, filters, sorting,
  pagination, and CSV import/export
- Analyzer page: next-round mathematical probability (with plain-language
  explanations), number frequency and gaps, mean/median/mode, color/parity/
  range/dozen/column analysis, rolling statistics, sequence and repetition
  analysis, chi-square/z-score/confidence-interval tests, a "Pattern
  Detective" that classifies deviations (Observation / Weak evidence /
  Moderate deviation / Potentially unusual), automatic insights, and a
  dynamic analysis summary
- Pattern Explorer (generate up to 1,000 independent rounds and analyze
  them) and Sample A/B Comparison (demonstrates that two random samples can
  look noticeably different)
- Simulation Lab: run 100–1,000 round betting simulations with full
  bankroll/ROI/streak/drawdown statistics and a bankroll-over-time chart,
  plus a multi-bet comparison mode
- **Statistical Test Lab**: generate very large disposable synthetic samples
  (1,000 to 1,000,000 rounds, never added to your round history) to watch
  observed frequencies converge toward theoretical probabilities (Law of
  Large Numbers), and a **Pattern Detector Validation** tool that runs the
  Pattern Detective against many independent random datasets to measure its
  own false-positive rate
- **Monte Carlo Lab**: run hundreds to thousands of independent betting
  simulations at once (separate from the single-run Simulation Lab above)
  and see the full distribution of outcomes — percentiles, a final-bankroll
  histogram, risk metrics (probability of profit/loss/depletion, drawdown
  distribution), a Monte-Carlo-vs-theoretical-EV convergence chart, and a
  strategy comparison table
- **Wheel Bias Analyzer**: chi-square goodness-of-fit, p-values, and 95%
  confidence intervals for the current analysis window's number and color
  distributions, always phrased as statistical evidence levels — never as a
  claim that a wheel is physically biased
- **Statistical Report**: generates one structured summary of the current
  analysis window (probabilities, descriptive statistics, sequences, gaps,
  repetitions, bias analysis, observations) exportable as CSV, JSON, or a
  self-contained printable HTML file, with no server involved
- **System Validation**: a one-click, in-browser self-test dashboard that
  checks the app's own core logic (random generation, roulette mapping,
  probability, payouts, history limits, statistics, chi-square, simulation
  bookkeeping, CSV round-tripping, localStorage) — a lightweight sanity
  check, not a replacement for the automated test suite in `tests/`
- Large computations (1,000,000-round sample generation, multi-thousand-run
  Monte Carlo, Pattern Detector Validation) run in a background Web Worker
  where available, so the page stays interactive instead of freezing —
  falling back to the same logic on the main thread if Web Workers are
  unavailable
- Dark casino/analytics UI, responsive down to mobile, with semantic HTML,
  keyboard-navigable controls, and color-independent result labeling

## Architecture

The app is a zero-build static site: `index.html` plus plain CSS and ES
modules under `js/` — no bundler, no framework, no backend. Modules are
strictly separated by concern:

- `js/random.js` — the single source of randomness (uses
  `crypto.getRandomValues`), used identically by real spins, simulations,
  and sample generation
- `js/roulette.js` — pure pocket/color/parity/dozen/column mapping
- `js/probability.js` — theoretical probabilities, payouts, expected value
- `js/statistics.js` — mean/median/mode/frequency/sequences/gaps/chi-square/
  z-score/confidence intervals (pure, DOM-free)
- `js/pattern-analyzer.js` — descriptive-only pattern/deviation detection
- `js/simulation.js` — the betting/bankroll simulation engine
- `js/history.js` / `js/storage.js` — capped round history and its
  validated `localStorage` persistence
- `js/export.js` — CSV build/parse (pure) plus browser download/upload glue
- `js/charts.js` — a thin Chart.js wrapper that reuses/destroys instances
- `js/roulette-animation.js` — the SVG wheel and its spin animation
- `js/insight-engine.js` — the single shared statistical-language vocabulary
  (evidence levels, p-value/bias interpretation text, sample-size and
  multiple-testing warnings) reused by the Pattern Detective, Wheel Bias
  Analyzer, and Statistical Report, so "never call it proof of bias" is
  enforced in exactly one place
- `js/bias-analyzer.js` — the Wheel Bias Analyzer (chi-square, p-values,
  standardized residuals, confidence intervals)
- `js/monte-carlo.js` — the Monte Carlo Lab engine (independent from
  `js/simulation.js`'s single-run engine); streams per-simulation
  aggregates instead of retaining every spin, so memory stays bounded even
  at 10,000 simulations
- `js/pattern-validation.js` — the Pattern Detector Validation false-positive
  experiment runner
- `js/statistical-report.js` — assembles and serializes the Statistical
  Report (CSV/JSON/printable HTML)
- `js/self-test.js` — the System Validation dashboard's in-browser checks
- `js/worker-client.js` / `js/workers/heavy-compute.worker.js` — runs large
  sample generation, Monte Carlo, and Pattern Detector Validation jobs in a
  background Web Worker (with a synchronous main-thread fallback), and
  discards a job's result if a newer job on the same "channel" supersedes it
  before it finishes
- `js/app.js` — the only module that touches the DOM for orchestration:
  wires state, navigation, and all pages together

Statistics, probability, simulation, Monte Carlo, and bias-analysis logic
are unit-tested independent of the DOM (see `tests/`), including the
worker-client's job orchestration (Node has no `Worker` global, so those
tests automatically exercise the synchronous fallback path — the same code
that must also work correctly in a browser where Worker construction
fails).

## Running Locally

No build step is required, but you **must** serve the project root through
a local web server — do not open `index.html` by double-clicking it or
pasting a `file://` path into the browser. The app is built from ES modules
(`<script type="module">`), and browsers block module imports on the
`file://` protocol as a CORS restriction; opened that way, no JavaScript
runs at all (the wheel stays empty and buttons do nothing, with no visible
error). For example:

```bash
npx serve .
# or
python -m http.server 8000
```

Then open the printed `http://localhost:...` URL. To run the test suite
(Node.js 18+):

```bash
npm test
```

## Netlify

1. Create or open a Netlify account.
2. Deploy this repository (drag-and-drop the folder, or connect it as a
   Git repo) with the publish directory set to the project root — no
   build command is required.
3. No database or backend is required or provisioned.
4. That's it — the app is fully static and works from any CDN edge node.

The production deployment lives at
[roulettestatisticalanalyzer.netlify.app](https://roulettestatisticalanalyzer.netlify.app/).

## Documentation

- [`docs/QA_REPORT.md`](docs/QA_REPORT.md) — full QA results: bugs found and
  fixed, statistical validation methodology, performance, security, and
  accessibility findings, plus what was and wasn't tested and why.
- [`docs/TESTING.md`](docs/TESTING.md) — the automated test suite's
  architecture, statistical testing methodology, and how to run a manual
  browser QA pass.
- [`docs/spec/`](docs/spec/) — the original planning specifications this app
  was built against (base app, advanced-analytics "Phase 2", and the
  maximum-QA methodology).

## Data Storage

All application state — settings, bankroll, and the round history — is
stored in the browser's `localStorage` under the keys `roulette-settings`,
`roulette-history`, and `roulette-bankroll`. Data loaded from storage is
validated defensively; corrupted or invalid entries are discarded instead
of crashing the app.

## Privacy

History, bankroll, bets, simulations, and statistics never leave your
browser. There is no account, login, analytics, or tracking, and no data is
ever sent to a server.

## Roulette Mathematics

- European roulette: 37 pockets (0–36). Each number ≈ 2.70% (1/37); red and
  black are each 18/37 ≈ 48.65%; green (0) is 1/37 ≈ 2.70%.
- American roulette: 38 pockets (0, 00, 1–36). Each number ≈ 2.63% (1/38);
  red and black are each 18/38 ≈ 47.37%; green (0 and 00) is 2/38 ≈ 5.26%.
- These probabilities are constant for every future independent spin —
  historical frequency never changes them.
- House edge (driven by the zero pocket(s)): ≈2.70% European, ≈5.26%
  American. A standard even-money bet has the corresponding negative
  expected value.

## Statistics

The Analyzer computes observed vs. expected frequency per number and per
category (color, parity, range, dozen, column); mean, median, mode, and
standard deviation (with "00" excluded from arithmetic, since it is not an
ordinary numeric zero); rolling statistics; current/longest streaks and
repetition counts; per-number gap statistics ("rounds since last
occurrence"); and chi-square goodness-of-fit, z-score approximations, and
confidence intervals, each with a plain-language explanation and an
"insufficient sample size" fallback when the sample is too small.

## Simulation

The Simulation Lab runs an independent random sequence of 100–1,000 rounds
against a chosen bet type, using the bankroll and bet amount from Settings
as its starting point. It reports wins/losses, win rate, total wagered/
returned, profit or loss, ROI, longest win/loss streaks, maximum drawdown,
and a bankroll-over-time chart. The Multi-Bet Comparison mode runs several
such simulations side by side for statistical comparison only — it never
recommends a "best bet."

## Advanced Analytics

**Expected vs. observed.** Every distribution table in the app (numbers,
colors, parity, dozens, columns) shows the observed percentage next to the
theoretical one and their difference. A difference is expected under
ordinary randomness — the question is *how much* difference is unusual,
which is what the tests below quantify.

**Law of Large Numbers.** The Statistical Test Lab's Large Sample Generator
demonstrates that observed frequencies drift closer to theoretical
probabilities as sample size grows (1,000 → 1,000,000 rounds), while making
no claim about the trajectory of any single run — random sequences fluctuate
on the way there.

**Chi-square and p-values.** The Wheel Bias Analyzer computes a chi-square
statistic (`Σ (Observed − Expected)² / Expected`) against the theoretical
per-number and per-color distributions, converts it to a p-value via the
regularized incomplete gamma function, and reports a plain-language
interpretation. A low p-value means the observed sample would be unusual
*if* the theoretical distribution were exactly true — it is evidence of a
statistical deviation, never proof that a wheel is physically biased.

**Confidence intervals.** Proportions (red/black share, individual-number
share) are reported with a 95% Wilson score confidence interval, which
stays valid at small sample sizes where a naive normal approximation would
not.

**Monte Carlo.** The Monte Carlo Lab runs many independent betting
simulations (100 to 10,000, each with 100–1,000 spins) and reports the full
distribution of outcomes — mean, percentiles, a final-bankroll histogram,
and risk metrics — rather than treating one simulation as representative.
Its ROI is shown next to the theoretical expected value; the two converge
as the number of simulations grows, exactly as EV theory predicts.

**False positives and multiple testing.** The Pattern Detector Validation
tool runs the same Pattern Detective used on real history against many
purely random datasets and reports how often each detector fires. Because
the app simultaneously tests 37/38 numbers, 2–3 colors, parities, 3 dozens,
and 3 columns every time, *some* apparently unusual result is expected on
random data by chance alone — this is a direct consequence of running many
statistical tests at once, not a sign that the detector or the random
generator is broken.

**Pattern detection.** The Pattern Detective classifies every deviation on
a 4-tier scale (Observation → Weak deviation → Moderate deviation → Strong
statistical deviation) based on its z-score magnitude, and every finding is
phrased as a description of the sample, never a prediction of the next spin.

**Wheel bias analysis.** The Wheel Bias Analyzer is intentionally
conservative in its language: it will say a distribution "differs from the
theoretical distribution" with evidence rated weak/moderate/strong, but it
will never conclude "the wheel is biased" — real-world bias detection would
require far more data and independent physical investigation than any
browser-based statistical test can provide.

## Important Statistical Limitation

A random process can produce clusters, streaks, hot numbers, cold numbers,
gaps, and other apparent patterns without any underlying predictive
mechanism. Every tool in this application — the Pattern Detective, the
Wheel Bias Analyzer, the Statistical Test Lab, and the Monte Carlo Lab — is
built to describe and quantify that fact, not to work around it. Nothing in
this application should be used to predict the outcome of the next
independent spin.

## Limitations

This tool analyzes randomness; it does not predict it. Observed frequency,
streaks, gaps, and detected patterns describe a specific historical or
generated sample — they do not establish that a wheel is biased, and they
do not change the mathematical probability of the next independent spin.
Even a full 1,000-round sample is statistically small when trying to
detect subtle deviations from theoretical probabilities; the Statistical
Test Lab and Monte Carlo Lab exist specifically to make that limitation
visible (via sample-size warnings and by showing how much a fixed-size
sample can vary) rather than to overcome it.
