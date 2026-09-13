# Testing

This project has one automated test command:

```bash
npm test
```

which runs `node --test tests/*.test.js` — Node's built-in test runner, no
extra test framework dependency. Use the explicit glob (not `node --test
tests/`); the bare-directory form did not discover files on this Windows/
Git-Bash/Node 24 setup.

To syntax-check a single module without running the suite:

```bash
node --check js/<file>.js
```

There is no build step and no separate `test:unit`/`test:e2e`/etc. split —
everything in `tests/*.test.js` runs together in one pass (~11-13s), and the
project intentionally has no browser-automation dependency (Playwright etc.)
checked in, to keep the static-site deployment story simple. See
"Browser/E2E testing" below for how that layer is exercised instead.

## Test files and what they cover

| File | Covers |
|---|---|
| `tests/random.test.js` | RNG validity for both wheel types, sequence generation, coverage sanity |
| `tests/roulette.test.js` | Pocket count/labels, color/parity/range/dozen/column mapping, `00` handling |
| `tests/probability.test.js` | Theoretical probabilities, house edge, EV per bet type |
| `tests/statistics.test.js` | Mean/median/mode/frequency/sequences/chi-square over deterministic datasets |
| `tests/history.test.js` | 1000-cap eviction, add/filter/sort/paginate |
| `tests/storage.test.js` | localStorage read/write, corruption recovery, defaults |
| `tests/export.test.js` | CSV build/parse, validation, truncation, round-trip |
| `tests/simulation.test.js` | Bankroll bookkeeping, bet resolution, `stopOnBankroll`, multi-bet comparison |
| `tests/large-scale-randomness.test.js` | 100k/1M-spin validity, distribution-sum checks, Law of Large Numbers |
| `tests/independent-validation.test.js` | From-scratch chi-square p-value / Wilson CI / EV / house-edge cross-checks against independently-derived math |
| `tests/monte-carlo.test.js` | Deterministic drawdown, Monte Carlo scale, bankroll depletion, EV convergence, house-edge convergence, simulation independence |
| `tests/pattern-false-positive.test.js` | Pattern Detective positive detection, negative (no-overclaim) case, false-positive rate experiment over many random datasets |
| `tests/synthetic-bias.test.js` | Known-random benchmark, synthetic bias injection + sensitivity scaling, classification-language audit |
| `tests/property.test.js` | Cross-module invariants (derived-attribute consistency, history cap, probability sums, payout sign) across many generated results |
| `tests/fuzz.test.js` | CSV parser and localStorage loaders against malformed/adversarial input — must never throw |
| `tests/helpers.js` | Shared in-memory `localStorage` polyfill for Node (not a test file itself) |

## Statistical testing methodology

Several tests here draw from the application's **real, unseeded**
`crypto.getRandomValues()`-backed RNG (never a mock, and production
randomness is never weakened to make a test deterministic — see spec §96 of
the QA spec this suite was built against). That means naive fixed-threshold
assertions on random output would eventually flake. Instead:

- **Standard-error banding.** For any check of the form "does this observed
  statistic land near its theoretical value", the test computes the
  statistic's own theoretical standard error (e.g. `sqrt(p(1-p)/n)` for a
  proportion) and asserts the observed deviation is within a **wide,
  explicit multiple** of that (typically 6σ). A 6σ false failure has
  probability on the order of 1e-9 per run — effectively never — while still
  being a real, non-tautological check (it would catch a genuinely broken
  RNG or a wrong probability formula immediately).
- **Reference values are computed, not guessed.** Where a test compares
  against a "known" chi-square p-value or similar, that reference number was
  computed once with an independent implementation (see below) and pinned
  as a comment showing the derivation, rather than typed from memory.
- **Trend checks, not exact convergence.** Monte Carlo/LLN tests compare
  behavior at two or more sample sizes (e.g. n=2,000 vs n=200,000) and
  assert the larger sample's error bound is tighter, rather than asserting
  any single run hits an exact number — per the QA spec's explicit
  instruction not to require exact convergence on every random execution.
- **False-positive/sensitivity experiments report and sanity-check, they
  don't demand zero.** The QA spec is explicit that some pattern-detector
  triggers on pure random data are *expected* (multiple-testing), so those
  tests assert the trigger rate stays in a plausible range and doesn't
  explode, and print the raw counts to the console for a human to review if
  investigating a regression.

### Independent validation (no Python available)

`tests/independent-validation.test.js` re-implements the chi-square p-value
(via the regularized incomplete gamma function — log-gamma + a
series/continued-fraction expansion) and the Wilson confidence interval from
their mathematical definitions, in code that shares nothing with
`js/statistics.js` (which doesn't even compute a p-value itself), then
cross-checks both against the application's output. EV and house-edge
formulas are independently re-derived from raw bet probabilities and
hard-coded payout knowledge rather than by calling `getBetPayout()`. This
was the fallback approach because no working Python interpreter was
available in the environment this suite was built in (only a Windows Store
execution-alias stub) — if Python/`scipy` becomes available, an even
stronger independent check would call `scipy.stats.chisquare` on the same
fixed datasets used in that test file and compare.

## Benchmarks worth knowing about

- Generating 100,000 results (either wheel type) takes ~0.5s; 1,000,000
  takes ~5s on the machine this was measured on. If `npm test` starts
  feeling slow, the 1,000,000-spin large-scale test and the two
  300,000-round-per-case house-edge Monte Carlo tests are the biggest single
  contributors (~5s and ~7.5s respectively) — consider gating them behind an
  opt-in env var if `npm test` needs to be fast for everyday development.
- All statistical tests were run 3 consecutive times during development with
  zero flakiness observed. If a statistical test ever does fail
  intermittently, per the QA spec's own instruction: **do not just raise the
  tolerance** — first check whether the standard-error band was computed
  correctly for the actual estimator in play (this is the most common way
  such a test is subtly wrong).

## Browser/E2E testing

There is no checked-in browser-automation suite (Playwright etc. is
deliberately not a `package.json` dependency, to keep this a true
zero-build static site). Browser-level scenarios — the spin/settings
concurrency race, rapid-click spin-lock behavior, tab navigation, running a
simulation, and the responsive-width sweep — were verified manually for this
QA pass using a temporary, uncommitted Playwright script against `npx serve .`,
documented in full (including exact assertions and outcomes) in
`QA_REPORT.md`'s "Bugs Found" and "Deployment" sections.

**To re-run that kind of check by hand:**

```bash
npm install --no-save playwright
npx playwright install chromium
npx --yes serve . -p 4173 &
# then drive http://localhost:4173/ with a small Playwright script,
# or open it in a real browser and follow the manual checklist below
```

Afterward, clean up so the repo stays dependency-free:

```bash
npm uninstall playwright
rm -rf node_modules package-lock.json
```

### Manual checklist (spec §99, Phase 1 rows only)

```text
[x] Roulette page — spin, bet, bankroll update, wheel animation
[x] History — table, filters, sort, pagination, clear (with confirm)
[x] Analyzer — History Analysis, Pattern Explorer, Sample Comparison sub-tabs
[x] Pattern Detective (part of Analyzer)
[ ] Statistical Test Lab — N/A, Phase 2, not built
[x] Simulation Lab
[ ] Monte Carlo Lab — N/A, Phase 2, not built
[ ] Wheel Bias Analyzer — N/A, Phase 2, not built
[x] Charts (all 8 in History Analysis)
[x] Import (CSV)
[x] Export (CSV)
[x] Settings
[x] Mobile layout (390px viewport + 320-1920px sweep)
[x] Empty states (no history yet)
[x] Error states (invalid bet, insufficient bankroll, malformed CSV rows)
[~] Loading states — the app has no async loading states beyond the spin
    animation itself (everything else is synchronous); the spin lock IS the
    loading state and was tested extensively (see QA_REPORT.md BUG-001)
```

## Limitations

See `QA_REPORT.md`'s "Limitations" section for the full list (Phase 2
features, real Netlify deployment, cross-browser beyond Chromium, long
memory-leak soak testing, full keyboard/screen-reader flows) — each with a
note on how to test it manually when it becomes relevant.
