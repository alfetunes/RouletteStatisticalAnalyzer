# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Implemented and verified working** (built 2026-09-13; see "Implementation
progress" below for the full history). The app is a complete, zero-build
static site: `index.html` + `css/` + `js/` at the repo root, `tests/` for the
Node test suite, plus `README.md` and `netlify.toml`.

Commands:
- `npm test` — runs `node --test tests/*.test.js` (55 tests, all passing).
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
engine. The full spec is in `roulette-statistical-analyzer-config.md`
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
  - `roulette-statistical-analyzer-advanced-spec.md` — a "phase 2" brief:
    Statistical Test Lab (up to 1M synthetic rows), Law-of-Large-Numbers
    convergence charts, Pattern Detector false-positive validation across
    many synthetic datasets, a Wheel Bias Analyzer (chi-square + p-value +
    confidence intervals framed carefully as "not proof of bias"), a
    Monte Carlo Lab (thousands of simulated bankroll runs, percentiles,
    drawdown distributions, Web-Worker-based if needed for performance), a
    Statistical Report export (CSV/JSON/printable HTML), and a "QA /
    Self-Test Dashboard".
  - `roulette-statistical-analyzer-maximum-qa-spec.md` — an exhaustive
    QA methodology (unit → integration → statistical → property-based →
    performance → E2E → security → regression) to be run against
    *everything*, including the phase-2 features above.
  - **Neither has been implemented or acted on.** This is a large amount of
    additional scope (each document is comparable in size to the original
    spec). Do not start building it without explicit user confirmation in
    chat — check whether the user actually wants phase 2 / the QA pass
    before touching it, since it wasn't requested through the conversation.

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
