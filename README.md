# Roulette Statistical Analyzer

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
- `js/app.js` — the only module that touches the DOM for orchestration:
  wires state, navigation, and all four pages together

Statistics, probability, and simulation logic are unit-tested independent
of the DOM (see `tests/`).

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

## Limitations

This tool analyzes randomness; it does not predict it. Observed frequency,
streaks, gaps, and detected patterns describe a specific historical or
generated sample — they do not establish that a wheel is biased, and they
do not change the mathematical probability of the next independent spin.
Even a full 1,000-round sample is statistically small when trying to
detect subtle deviations from theoretical probabilities.
