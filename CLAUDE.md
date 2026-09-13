# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Implemented and verified working, Phase 1 + Phase 2** (Phase 1 built
2026-09-13; Phase 2 — the "Statistical Laboratory" advanced-analytics spec —
built later the same day; see "Implementation progress" below for the full
history). The app is a complete, zero-build static site: `index.html` +
`css/` + `js/` at the repo root, `tests/` for the Node test suite, plus
`README.md`, `docs/QA_REPORT.md`, `docs/TESTING.md`, and `netlify.toml`.

Commands:
- `npm test` — runs `node --test tests/*.test.js` (142 tests, all passing —
  see "Implementation progress" below for what each QA/Phase-2 pass added).
  Use the explicit glob, not `node --test tests/` — the bare-directory form
  did not discover files on this Windows/Git-Bash/Node 24 setup.
- `npx serve .` (or any static file server) — run the app locally. No build
  step exists or is needed.
- To syntax-check a single module without running the suite:
  `node --check js/<file>.js`.

If you're resuming mid-task, read "Implementation progress" below first —
it has the checklist, the bugs already found/fixed, and design decisions
made along the way that aren't in the spec file.

## What this project is

**Roulette Statistical Analyzer** — a 100% client-side static web app that
simulates roulette spins and provides statistical/probability analysis,
pattern detection, betting simulations, and CSV import/export of round
history. It is explicitly a statistics/education tool, not a prediction
engine. The full spec is in `docs/spec/roulette-statistical-analyzer-config.md`
(read it before implementing — it is long and detailed; summarized below are
only the constraints most likely to be violated by a naive implementation).

## Hard architectural constraints (non-negotiable per spec)

- **Zero backend.** No server, database, REST/GraphQL API, auth, or user
  accounts. Must be deployable as a static site (Netlify / GitHub Pages /
  Cloudflare Pages). Node/npm may be used only as a dev-time tool, never a
  production runtime requirement.
- **Vanilla JS preferred.** Avoid frontend frameworks unless there's a
  compelling reason. Use HTML5/CSS3/ES6+, SVG/Canvas for the wheel, and
  Chart.js (or similar) for charts if needed.
- **One RNG module used everywhere.** A single `generateRandomResult(rouletteType)`
  function (using `crypto.getRandomValues()`, not `Math.random()`) must back
  real spins, simulations, and sample/pattern generation. Never fork separate
  random logic per feature.
- **Animation never determines the outcome.** Flow is always: generate result
  → determine target pocket → animate → land on the already-known result.
  The ball's visual position must never be the source of truth.
- **History is capped at 1,000 rounds**, oldest-first eviction (`push` then
  `shift` when `length > 1000`). Persisted to `localStorage`; all data loaded
  from storage must be validated defensively (corrupt JSON, missing fields,
  bad numbers/colors/timestamps must degrade gracefully, never crash).
- **American `00` is not numeric 0.** It must be modeled as its own green
  pocket with `parity`/`range`/`dozen`/`column` all `null` — never coerced
  into ordinary arithmetic alongside numbered pockets.
- **Messaging discipline:** the app must never present historical
  frequency, streaks, or "gaps" as predictive of the next independent spin.
  Avoid words like "due"; use neutral phrasing ("rounds since last
  occurrence", "observed vs. expected"). This constraint affects copy
  throughout the UI (Analyzer, Pattern Detective, insights, summaries), not
  just one section — see spec §57 for the banned/preferred phrasing list.

## Suggested module structure (from spec §5)

```
index.html
css/ (style.css, roulette.css, dashboard.css, responsive.css)
js/
  app.js                  - orchestration/entry point
  random.js               - single source of RNG, used by spins/sim/samples
  roulette.js             - pocket/color/dozen/column mapping (pure)
  roulette-animation.js   - wheel/ball animation (visual only)
  history.js              - round history management (1000-cap, eviction)
  storage.js              - localStorage read/write + validation/recovery
  statistics.js           - mean/median/mode/frequency/sequences/gaps (pure)
  probability.js          - theoretical probabilities, EV, house edge (pure)
  pattern-analyzer.js     - descriptive pattern/deviation detection
  simulation.js           - betting simulation engine (bankroll, ROI, streaks)
  charts.js               - Chart.js wiring; must destroy/reuse instances
  export.js               - CSV import/export via Blob/URL.createObjectURL
assets/
tests/
netlify.toml (only if actually needed)
```

Keep statistics/probability/simulation/roulette-mapping functions pure and
DOM-free (spec §65) — this is what makes them testable per spec §66.

## Key domain rules to get right

- European: pockets 0–36 (37 total), P(single) = 1/37 ≈ 2.70%,
  P(red)=P(black) = 18/37 ≈ 48.65%, P(green) = 1/37 ≈ 2.70%.
- American: pockets 0, 00, 1–36 (38 total), P(single) = 1/38 ≈ 2.63%,
  P(red)=P(black) = 18/38 ≈ 47.37%, P(green) = 2/38 ≈ 5.26%.
- Payouts: single number 35:1; red/black/even/odd/1-18/19-36 1:1; dozen/column
  2:1. Winning bet returns stake + (bet × payout); losing bet forfeits stake.
- House edge: ≈2.70% European, ≈5.26% American, driven by the zero(es).

## Testing expectations (spec §66)

Once code exists, tests should cover: roulette pocket generation validity and
color/dozen/column mapping; probability formulas for both wheel types;
history cap/eviction/persistence/corruption-recovery; core statistics (mean,
median, mode, frequency, sequences, gaps); betting payout/bankroll/ROI
correctness; simulation round-count/result-validity/bankroll evolution.

## Implementation progress

Status: **feature-complete and verified** — all checklist items below are
done. Keep this section updated if the app changes; it's the fastest way
for a fresh session to know what's real vs. still planned.

### Pure logic modules (js/) — all done
random.js, roulette.js, probability.js, statistics.js, pattern-analyzer.js,
simulation.js, history.js, storage.js, export.js. All covered by tests/.

### DOM / UI — all done
css/ (style.css, roulette.css, dashboard.css, responsive.css), index.html
(4 sections: Roulette, History, Analyzer with 3 sub-tabs, Simulation with
2 sub-tabs), roulette-animation.js (SVG wheel in real physical pocket
order), charts.js (Chart.js wrapper), app.js (all wiring).

### Project files — all done
package.json, tests/ (55 tests passing), README.md, netlify.toml.

### Verification performed
- `npm test`: 55/55 passing (roulette, random, probability, statistics,
  history, storage, simulation, export).
- Real-browser smoke test via Playwright (chromium installed locally for
  this, then `node_modules`/`package-lock.json` removed afterward — it is
  NOT a project dependency, just how it was verified): served with
  `npx serve .`, drove the actual UI — spun the wheel with and without a
  bet, checked bankroll math, generated 16 rounds, checked History table/
  pagination, all three Analyzer sub-tabs (History Analysis incl. all 8
  charts, Pattern Explorer, Sample Comparison), Simulation Lab, Multi-Bet
  Comparison, CSV export, and a 390px mobile viewport. Zero console/page
  errors in any of it. Screenshots aren't kept in the repo (they lived in
  the session's scratchpad).

### Bugs found by the browser smoke test and fixed (none of these were
### visible from `node --check` or the unit tests — all three are the
### reason the manual browser pass mattered)
1. **Chart.js CDN URL was wrong.** Guessed
   `Chart.js/4.4.4/chart.umd.min.js` — that version/file doesn't exist on
   cdnjs (404). Fixed to the real UMD build:
   `https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.5.1/chart.umd.min.js`.
   If bumping the Chart.js version later, verify with
   `curl -sI <url>` and confirm it's the `.umd.` file (plain `chart.min.js`
   on cdnjs 4.x is an ES module and will throw "Cannot use import statement
   outside a module" in a plain `<script>` tag).
2. **`[hidden]` was being silently overridden.** Any element with both the
   `hidden` attribute and a class that sets `display` (e.g. `.form-row {
   display: flex }`) stayed visible, because author CSS beats the UA
   `[hidden]{display:none}` rule at equal specificity. Fixed with a single
   `[hidden]{display:none!important}` rule near the top of `css/style.css`.
   Symptom was the straight-number `<select>` showing even with no bet
   selected — check for this class of bug again if a new hideable element
   is added and behaves oddly.
3. **The roulette wheel animation was completely broken visually** (wheel
   flew off-center during spins) because `js/roulette-animation.js` set an
   SVG `transform="translate(...)"` *attribute* on the same `<g>` that then
   got `style.transform = 'rotate(...)'` via CSS — CSS transform fully
   replaces an attribute transform on the same element rather than
   composing with it. Fixed by splitting into two nested groups: a static
   `centerGroup` (attribute-based translate only) wrapping the `wheelGroup`
   that CSS actually rotates (with explicit `transform-origin: 0 0`, since
   its local origin is the wheel center thanks to the parent's translate).
   If touching this file again: never mix SVG-attribute `transform` and
   CSS `style.transform`/`class`-based transform on the *same* element.

### 2026-09-13 follow-up session: bug fixes + newly discovered specs

- **Bug fix — "Spin does nothing".** Root cause: the user opened `index.html`
  via `file://` (double-click), which blocks ES module `<script type="module">`
  imports under browser CORS policy — confirmed by reproducing with Playwright
  (`Access to script at 'file:///.../js/app.js' from origin 'null' has been
  blocked by CORS policy`). With app.js never executing, the wheel never
  renders and no button does anything, silently. Fixes:
  - `index.html` `<head>` now has an inline (non-module) fallback script that
    shows a visible red banner if `window.__ROULETTE_APP_READY__` is not set
    ~2.5s after DOMContentLoaded, explaining the file:// issue by name.
  - `js/app.js` `init()` now sets `window.__ROULETTE_APP_READY__ = true` at
    the end as the signal the banner script checks for.
  - README's "Running Locally" section rewritten — no longer suggests
    file:// "also works"; now states plainly that a local server is required
    and why.
  - **If this class of bug resurfaces:** always test via `npx serve .` (or
    equivalent), never by opening the file directly.
- **Bug fix — ball didn't land on the winning pocket.** `js/roulette-animation.js`
  spun the ball to an arbitrary final angle unrelated to where the wheel's
  target pocket ended up, so the ball visually landed nowhere near the
  actual result. Fixed by computing the ball's cumulative rotation so it
  always ends at exactly -90° (the pointer's fixed angle), matching where
  the winning pocket comes to rest — verified programmatically via Playwright
  (`getBoundingClientRect` on the ball vs. the wheel center) across 5
  consecutive spins, angle was exactly -90.00° every time.
- **Polish added** to the same file: a visible ball-track ring, a radial-
  gradient "pearl" ball fill instead of flat white, and the ball now keeps
  rolling ~0.5-1s after the wheel settles (`ballDurationMs` > `wheelDurationMs`)
  for a slightly more physical finish. Not asked for explicitly but directly
  serves the user's "I want a proper animated wheel + ball, not a static
  number" request.
- **`.claude/settings.json`**: at the user's explicit request, added
  `"permissions": { "defaultMode": "bypassPermissions" }` (keeping the
  existing `allow` entry) so this project no longer prompts for tool-use
  confirmation. This is a real, user-owned settings.json — distinct from the
  `--dangerously-skip-permissions` CLI flag the user asked for earlier in
  the session and which was declined (running that flag via Bash would have
  spawned a separate nested session and wasn't the right mechanism anyway).
  Takes effect from the next session start, not retroactively.
- **Two new spec files appeared in the project root partway through this
  session, authored by someone other than this agent** (noticed via a stray
  `find` listing — they were not mentioned in chat):
  - `docs/spec/roulette-statistical-analyzer-advanced-spec.md` — a "phase 2" brief:
    Statistical Test Lab (up to 1M synthetic rows), Law-of-Large-Numbers
    convergence charts, Pattern Detector false-positive validation across
    many synthetic datasets, a Wheel Bias Analyzer (chi-square + p-value +
    confidence intervals framed carefully as "not proof of bias"), a
    Monte Carlo Lab (thousands of simulated bankroll runs, percentiles,
    drawdown distributions, Web-Worker-based if needed for performance), a
    Statistical Report export (CSV/JSON/printable HTML), and a "QA /
    Self-Test Dashboard".
  - `docs/spec/roulette-statistical-analyzer-maximum-qa-spec.md` — an exhaustive
    QA methodology (unit → integration → statistical → property-based →
    performance → E2E → security → regression) to be run against
    *everything*, including the phase-2 features above.
  - **Status as of 2026-09-13 (later same day): both now implemented.** The
    QA-spec pass happened first (see the dated entry below), then the user
    explicitly asked for "phase 2 and whatever is missing," so
    `docs/spec/roulette-statistical-analyzer-advanced-spec.md` was built in full — see
    the "2026-09-13 Phase 2 implementation" entry further down for what was
    built, the architecture decisions made, and what's still not done.

### Notes for resuming / design decisions not in the spec
- Settings model is `{ rouletteType, betAmount, startingBankroll }` in
  storage.js (spec's example only showed two fields — startingBankroll was
  added because simulations must use the *configured* starting bankroll,
  not the live/depleted one, per spec §49).
- `js/simulation.js` exports `evaluateBet(result, betType, betSelection)`
  so real spins in app.js and the simulation engine share one bet-
  resolution code path (not just one RNG path).
- Changing roulette type in Settings clears history (with a confirm
  dialog) since old rounds may reference pockets invalid for the new wheel
  (e.g. "00" under European) — not explicitly specified but follows from
  the "validate against current roulette type" requirement (spec §17, §48).
- Pattern Explorer and Sample Comparison live as sub-tabs inside the
  Analyzer page (spec's 4 top-level nav items don't have room for them as
  siblings); Multi-Bet Comparison is a sub-tab inside Simulation similarly.
- Not yet done, optional future work: no automated CSV-import browser test
  (only unit-tested via tests/export.test.js), no automated check that
  1,000+ real spins actually evict oldest history in a live browser
  session (unit-tested in tests/history.test.js instead).

### 2026-09-13 QA pass (`docs/spec/roulette-statistical-analyzer-maximum-qa-spec.md`)

Ran the full 102-section maximum-QA spec against **Phase 1 only** (explicit
user decision — the Statistical Test Lab / Monte Carlo Lab / Wheel Bias
Analyzer from the two "phase 2" spec files mentioned above are still not
built and were marked N/A rather than attempted). Full detail in
`docs/QA_REPORT.md` and `docs/TESTING.md`; summary:

- **Found and fixed one CRITICAL bug:** nothing gated Settings (roulette
  type), bet-type selection, or bet amount behind the existing
  `state.spinning` lock, so changing them mid-animation could let an
  American `"00"` result land in a just-switched-to European history, or let
  a bet resolve against parameters changed after the outcome was already
  decided. Fixed in `js/app.js` (spin-time bet snapshot passed into
  `completeSpin`, plus `setSpinLockedControlsDisabled()` disabling
  Apply/Clear-bet/bet-type-buttons/straight-number during a spin, plus
  defense-in-depth `state.spinning` checks inside each handler so the JS
  guard holds even if a `disabled` attribute were ever bypassed) and in
  `js/roulette-animation.js` (`setRouletteType`/`destroy`/`spinToResult` now
  cancel any pending completion timer). Verified live in Chromium via a
  scripted race that tries the exploit twice — once normally, once after
  forcibly re-enabling the disabled button — both fully blocked, zero
  console errors.
- Added 44 new tests across 7 new files (`tests/large-scale-randomness.test.js`,
  `tests/independent-validation.test.js`, `tests/monte-carlo.test.js`,
  `tests/pattern-false-positive.test.js`, `tests/synthetic-bias.test.js`,
  `tests/property.test.js`, `tests/fuzz.test.js`) — 99/99 total passing, run
  3x with no flakiness. These cover large-scale RNG validity (100k/1M
  spins), an independent (from-scratch, non-Python — none was available in
  this environment) re-implementation of the chi-square p-value/Wilson
  CI/EV/house-edge formulas, Monte Carlo convergence and house-edge
  validation, Pattern Detective false-positive rate experiments, a
  synthetic-bias sensitivity benchmark, cross-module property invariants,
  and CSV/localStorage fuzz testing.
- Extracted `calculateMaxDrawdown(series)` as a pure, exported function in
  `js/statistics.js` (previously inline peak-tracking inside
  `runSimulation`) specifically so the spec's deterministic drawdown example
  (`[1000,1100,1050,900,950]` → 200) could be unit-tested directly.
  `js/simulation.js` now calls it as a single post-pass over
  `bankrollOverTime` instead of streaming the peak/drawdown inline —
  behavior is unchanged (confirmed by the existing simulation tests still
  passing unmodified).
- Security/wording audit: no `eval`/`new Function`/`document.write`; every
  `innerHTML` call site only ever receives static text or values already
  validated against the closed roulette-pocket set (confirmed with a CSV
  fuzz test using `<script>`/`onerror` payloads — both rejected as invalid
  results); one hit for "due" in index.html is the ordinary English sense,
  not the gambling-fallacy sense — no change needed.
- Browser QA (temporary Playwright install, removed afterward — same
  pattern as the original browser smoke test): responsive sweep across all
  7 requested widths (320-1920px) with no horizontal overflow, wheel SVG has
  a proper `aria-label`, zero console/page errors across normal spins, a
  rapid-spin-click hammering test, tab navigation, and running a simulation.
- Documented but not performed (see docs/QA_REPORT.md "Limitations" for why and
  how to do each manually): real Netlify deployment, cross-browser beyond
  Chromium, long-session memory-leak soak testing, full keyboard/screen-
  reader flows.

### 2026-09-13 Phase 2 implementation (`docs/spec/roulette-statistical-analyzer-advanced-spec.md`)

Built the full advanced-analytics spec after explicit user confirmation
("faça a segunda parte do projeto e aquilo que falta"). All 45 sections
implemented; nothing scoped out. 43 new tests added (99 → 142), all passing,
plus a full manual browser QA pass (see below) — 29/29 checks passing with
zero console errors, and a dedicated worker-responsiveness check.

**New pure logic modules (all DOM-free, all unit-tested):**
- `js/insight-engine.js` — the single shared statistical-language vocabulary
  (4-tier evidence levels: Observation/Weak deviation/Moderate deviation/
  Strong statistical deviation; p-value and bias interpretation text;
  sample-size and multiple-testing warnings). `js/pattern-analyzer.js`'s
  `CLASSIFICATIONS` now re-exports this module's `EVIDENCE_LEVELS` under its
  original key names instead of duplicating the classification logic —
  this was a deliberate refactor to satisfy the QA spec's "avoid duplicated
  logic across features" architecture-audit guidance, since the same
  vocabulary is now also used by the Wheel Bias Analyzer and the
  Statistical Report.
- `js/bias-analyzer.js` — Wheel Bias Analyzer: chi-square, p-value (via a
  new `calculateChiSquarePValue` in `js/statistics.js`, computed with the
  regularized incomplete gamma function), standardized residuals,
  confidence intervals. Never emits "the wheel is biased" — always routes
  through insight-engine's evidence-level language.
- `js/monte-carlo.js` — Monte Carlo Lab engine, deliberately independent
  from `js/simulation.js`'s single-run engine. Streams per-simulation
  aggregates (final bankroll, max drawdown) and discards each simulation's
  full spin-by-spin path immediately after computing it, so memory stays
  O(simulations) instead of O(simulations × spins) even at the largest
  offered preset (10,000 × 1,000 = 10M spins) — this directly satisfies
  spec §39's "do not retain every spin" requirement.
- `js/pattern-validation.js` — Pattern Detector Validation (the
  false-positive experiment), promoted from the ad hoc script used in the
  earlier QA pass's `tests/pattern-false-positive.test.js` into a real
  production feature. **Important correctness fix made during
  implementation**: the trigger-rate metrics are per-dataset booleans
  ("did this detector fire at least once in this dataset?"), not an average
  count of flagged rows — the latter would exceed 100% for the
  number-frequency detector (up to 37 possible flagged numbers per dataset)
  and wouldn't match the advanced spec §6 example table's percentage
  format (e.g. "Hot number 100%"). Verified against that exact example: a
  100-dataset run showed `numberDeviations` at ~100% any-deviation rate,
  matching the spec's "Hot number 100%" line almost exactly.
- `js/self-test.js` — System Validation's 11 in-browser self-checks
  (random generation, both wheel types, probability, payouts, history cap,
  statistics, chi-square, simulation bookkeeping, CSV round-trip,
  localStorage round-trip). The localStorage check uses a dedicated
  `__roulette-selftest-probe__` key that it always removes afterward, so it
  can never pollute real app data — this is tested explicitly.
- `js/statistical-report.js` — assembles the Statistical Report and
  serializes it as CSV/JSON/printable self-contained HTML (no external
  assets, safe to open standalone or print).
- `js/statistics.js` additions: `calculateChiSquarePValue` (independent
  numerical method from the one already cross-validated in
  `tests/independent-validation.test.js` during the QA pass — that test
  file's from-scratch implementation was extended with new assertions
  against this new production function, rather than replaced, to keep the
  "independent validation" property intact), `calculatePercentile`
  (documented as R-7/Excel PERCENTILE.INC method, per spec §53's
  methodology-must-be-stated requirement), `calculateStandardizedResiduals`,
  `calculateSequenceProbability` (the `(18/37)^5` style spec §12 formula,
  explicitly educational-only), and `calculateMeanMedianFromFrequency` — an
  exact (not approximate) mean/median computed from a `{value, count}`
  frequency table in O(distinct values) instead of O(n), which is what
  makes the 1,000,000-round Large Sample Generator able to report an exact
  mean/median without ever holding 1,000,000 raw results in memory at once
  (roulette pockets are a small fixed alphabet, so this works exactly,
  unlike a general streaming-median algorithm which would only be
  approximate).

**Web Worker infrastructure (spec §38/§39/§41/§63):**
- `js/workers/heavy-compute.worker.js` — a module Worker (loaded as a
  static local file, no bundler) that handles `generateSample`,
  `monteCarlo`, and `patternValidation` jobs entirely off the main thread,
  generating large samples in bounded-memory chunks (20,000 at a time) and
  throttling progress messages to ~every 150ms.
- `js/worker-client.js` — main-thread wrapper (`runHeavyJob(channel, type,
  payload, onProgress)`) that (a) falls back to running the exact same pure
  functions synchronously on the main thread if constructing a module
  Worker throws, and (b) tracks the latest job id per named "channel" so
  that starting a new job on the same channel makes any still-in-flight
  older job on that channel resolve to `undefined` and suppresses its
  progress callback — satisfying spec §63's "no stale simulation result
  should overwrite a newer simulation" requirement. This is fully unit
  tested in `tests/worker-client.test.js`: since Node has no `Worker`
  global, every test there automatically exercises the synchronous fallback
  path, which is exactly the code path that also has to be correct for a
  browser where Worker construction fails.
- Verified live in Chromium that a 1,000,000-round generation genuinely
  runs off the main thread: a `requestAnimationFrame` heartbeat installed
  before starting the job kept ticking at a healthy rate (~60/s) for the
  full ~4.5s duration of generation, which would not happen if the work
  were blocking the main thread synchronously.

**UI additions:**
- Two new top-level pages: **Statistical Test Lab** (sub-tabs: Large Sample
  Generator with an LLN convergence chart and number-distribution chart;
  Pattern Detector Validation with a per-detector trigger-rate table) and
  **System Validation** (the self-test dashboard).
- Two new Analyzer sub-tabs: **Wheel Bias Analyzer** and **Statistical
  Report** (with CSV/JSON/printable-HTML export buttons).
- One new Simulation sub-tab: **Monte Carlo Lab** (summary/percentile/risk
  cards, a final-bankroll histogram, an EV-convergence chart, and a
  "Compare Strategies" mini-table that runs one Monte Carlo job per
  selected bet type, sequentially, so each stays the well-defined "latest"
  job on its channel).
- All large/slow actions (Large Sample Generator, Pattern Detector
  Validation, Monte Carlo Lab, Monte Carlo Compare) show a progress bar
  driven by the worker's throttled progress messages and disable their
  trigger button while running.
- Added `js/export.js`'s `triggerTextDownload` (CSV download generalized to
  any text/mimetype) so the Statistical Report's three export formats reuse
  one download code path instead of three.
- Added `formatInt()` in `js/app.js` (always `toLocaleString('en-US')`) for
  every plain integer count shown in the new UI — a bug caught during the
  browser QA pass: bare `.toLocaleString()` (no locale argument) inherits
  the browser's own locale, so "10,000" rendered as "10.000" in this
  environment's non-en-US default locale. `formatCurrency` already forced
  `'en-US'`; the new count-formatting call sites didn't, and now do.

**Not built / explicitly scoped down** (all documented in-app rather than
silently omitted):
- Bonferroni/Benjamini-Hochberg multiple-testing corrections — spec §7
  explicitly says "do not implement these unless the statistical
  methodology is correct" and to prefer an educational note instead; the
  Pattern Detector Validation page and `MULTIPLE_TESTING_NOTE` in
  `js/insight-engine.js` carry that explanation instead of a correction
  algorithm.
- A single composite "randomness score" — spec §20 explicitly prefers
  showing individual test results over inventing one; System Validation and
  the Wheel Bias Analyzer both follow that (PASS/FAIL rows and separate
  chi-square/CI blocks, no single score).
- The "Random Sample Demonstration" (spec §4) was **not** duplicated as a
  new feature — the pre-existing Analyzer → Sample Comparison tab already
  covers generating and comparing two independent samples; duplicating it
  in the new Statistical Test Lab would have violated the QA spec's own
  "avoid duplicated logic" guidance for no user-facing benefit.
- Real cross-browser testing (only Chromium via Playwright, temporarily
  installed and removed afterward, same as the QA pass) and a real Netlify
  deployment were not performed — same limitations as the QA pass, see
  docs/QA_REPORT.md.

### Repo made public: reorganization + Auto Spin feature (2026-09-13, later same day)

- **Docs reorganized**: `roulette-statistical-analyzer-*.md` spec files and
  `QA_REPORT.md`/`TESTING.md` moved into `docs/` (specs under `docs/spec/`)
  via `git mv` to preserve history. `README.md` and this file stay at the
  repo root — that's where GitHub and Claude Code expect to find them.
  Every path reference to the moved files across `CLAUDE.md` and
  `tests/independent-validation.test.js` was updated to match.
- **`.gitignore` added** (none existed before) — `node_modules/`/
  `package-lock.json` (this project has zero declared dependencies; these
  only appear when a dev tool like Playwright is installed temporarily for
  manual QA, per the established pattern in this log), `.env*`,
  `.claude/settings.local.json` (personal override, never shared),
  editor/OS cruft.
- **`.claude/settings.json`**: removed `"defaultMode": "bypassPermissions"`
  at the user's explicit request, specifically because the repo was about
  to go public — that setting would have silently applied to anyone who
  cloned the repo and opened it with Claude Code. The `allow` entry was
  kept. (This reverses the addition made earlier in this same file's log,
  from when the repo was still private-use-only.)
- **README**: added the live-site link
  (`https://roulettestatisticalanalyzer.netlify.app/`) near the top and in
  the Netlify section, plus a "Documentation" section pointing at the new
  `docs/` layout.
- **Auto Spin feature** added to the Roulette page: a spin-count `<select>`
  (5/10/25/50/100/"until stopped") next to a toggle button. Implementation
  extracted the manual Spin button's click handler into a reusable
  `startSpin(onDone)` in `js/app.js` — the exact same validation
  (straight-number selected, bankroll covers the bet), snapshot-before-
  animate, and control-locking logic now backs both a single manual spin
  and each step of an Auto Spin run, so there's still only one code path
  that generates a result and only one place that enforces the
  no-mid-animation-state-change invariant from the earlier concurrency bug
  fix. `runNextAutoSpin()` chains spins with a 600ms pause via
  `setTimeout`, decrementing `state.autoSpin.remaining` (`Infinity` for
  "until stopped" — decrementing it is a no-op, so no special-casing was
  needed) and stopping on its own the moment `startSpin` rejects a spin
  (insufficient bankroll, mid-run bet exceeding the live bankroll, etc.).
  - **Bug found and fixed by this session's own browser QA, before
    shipping**: if "Stop Auto Spin" was clicked while a spin was still
    mid-animation, controls stayed disabled forever afterward.
    `stopAutoSpin()` correctly deferred re-enabling controls to "whoever
    finishes the in-flight spin" (since `state.spinning` was still true),
    but the in-flight spin's own completion callback saw
    `state.autoSpin.active === false` and just `return`ed early without
    ever calling `setSpinLockedControlsDisabled(false)` itself — so nobody
    did it. Fixed by having that early-return branch re-enable controls
    before returning. Caught via a Playwright script that specifically
    starts an "until stopped" run, waits ~2.5s (long enough that the first
    spin's ~4-6.6s animation is still in flight), clicks Stop, and asserts
    the Spin button re-enables — this scenario is not expressible as a
    Node unit test (depends on real timer/animation timing), so if this
    code is touched again, re-verify manually the same way: start Auto
    Spin, click Stop while the wheel is visibly still spinning, confirm
    every control re-enables.
  - Also verified: a full 5-spin run completes and re-enables everything;
    rapid start/stop/start/stop toggling (6x in under a second) leaves no
    leaked `setTimeout` still scheduling spins afterward and controls end
    up correctly enabled; starting Auto Spin with a bet that exceeds the
    bankroll rejects immediately with the existing bankroll message,
    exactly like a manual spin would.
