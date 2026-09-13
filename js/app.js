// Application entry point: wires all pure modules to the DOM. This file owns
// UI state and event handling only — statistics/probability/simulation logic
// lives in their own modules (spec §65).

import { ROULETTE_TYPES, getPockets, getColor, getParity } from './roulette.js';
import { generateRandomResult, generateRandomSequence } from './random.js';
import {
    BET_TYPES,
    getBetPayout,
    getSingleNumberProbability,
    getRedOrBlackProbability,
    getGreenProbability,
    getEvenMoneyProbability,
    getDozenOrColumnProbability,
    getHouseEdge,
} from './probability.js';
import {
    calculateMean,
    calculateMedian,
    calculateMode,
    calculateStandardDeviation,
    calculateTopN,
    calculateNumberFrequency,
    calculateColorDistribution,
    calculateParityDistribution,
    calculateRangeDistribution,
    calculateDozenDistribution,
    calculateColumnDistribution,
    calculateSequences,
    calculateRepetitions,
    calculateRollingMean,
    calculateRollingPercentage,
    calculateChiSquare,
    calculateZScore,
    calculateConfidenceInterval,
    getSampleSizeLabel,
} from './statistics.js';
import { analyzePatterns, buildPatternNarratives, CLASSIFICATIONS } from './pattern-analyzer.js';
import { runSimulation, runMultiBetComparison, evaluateBet } from './simulation.js';
import { createHistory, filterRounds, sortRounds, paginate } from './history.js';
import { loadSettings, saveSettings, loadBankroll, saveBankroll, loadHistory, saveHistory, clearAll } from './storage.js';
import { buildCsv, parseCsv, triggerCsvDownload, triggerTextDownload, readFileAsText } from './export.js';
import { renderBarChart, renderLineChart, renderDoughnutChart, PALETTE } from './charts.js';
import { createRouletteWheel } from './roulette-animation.js';
import { analyzeWheelBias } from './bias-analyzer.js';
import { runPatternDetectorValidation } from './pattern-validation.js';
import { calculateExpectedValue } from './probability.js';
import { runSystemValidation } from './self-test.js';
import { buildStatisticalReport, buildReportCsv, buildReportJson, buildReportHtml } from './statistical-report.js';
import { runHeavyJob } from './worker-client.js';

const $ = (id) => document.getElementById(id);

const BET_TYPE_LABELS = {
    [BET_TYPES.STRAIGHT]: 'Number',
    [BET_TYPES.RED]: 'Red',
    [BET_TYPES.BLACK]: 'Black',
    [BET_TYPES.EVEN]: 'Even',
    [BET_TYPES.ODD]: 'Odd',
    [BET_TYPES.LOW]: '1-18',
    [BET_TYPES.HIGH]: '19-36',
    [BET_TYPES.DOZEN_1]: '1st Dozen',
    [BET_TYPES.DOZEN_2]: '2nd Dozen',
    [BET_TYPES.DOZEN_3]: '3rd Dozen',
    [BET_TYPES.COLUMN_1]: '1st Column',
    [BET_TYPES.COLUMN_2]: '2nd Column',
    [BET_TYPES.COLUMN_3]: '3rd Column',
};

const BET_TYPE_ORDER = [
    BET_TYPES.RED, BET_TYPES.BLACK, BET_TYPES.EVEN, BET_TYPES.ODD, BET_TYPES.LOW, BET_TYPES.HIGH,
    BET_TYPES.DOZEN_1, BET_TYPES.DOZEN_2, BET_TYPES.DOZEN_3,
    BET_TYPES.COLUMN_1, BET_TYPES.COLUMN_2, BET_TYPES.COLUMN_3, BET_TYPES.STRAIGHT,
];

const ANALYSIS_WINDOWS = [10, 25, 50, 100, 250, 500, 1000, 'all'];
const EXPECTED_MEAN = 18;
const EXPECTED_MEDIAN = 18;
const EXPECTED_STD_DEV = Math.sqrt((37 * 37 - 1) / 12);

function formatCurrency(value) {
    const n = Number.isFinite(value) ? value : 0;
    return `R$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Locale-independent thousands-grouped integer (always en-US style, like formatCurrency — never inherits the browser's locale). */
function formatInt(value) {
    return Number(value).toLocaleString('en-US');
}

function formatPct(value, digits = 2) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return `${value.toFixed(digits)}%`;
}

function formatSignedPct(value, digits = 2) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(digits)} pp`;
}

function formatNumber(value, digits = 2) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return value.toFixed(digits);
}

function classificationBadgeClass(classification) {
    switch (classification) {
        case CLASSIFICATIONS.WEAK_EVIDENCE: return 'badge badge--weak';
        case CLASSIFICATIONS.MODERATE_DEVIATION: return 'badge badge--moderate';
        case CLASSIFICATIONS.POTENTIALLY_UNUSUAL: return 'badge badge--unusual';
        default: return 'badge badge--observation';
    }
}

function colorBadgeClass(color) {
    return `badge badge--${color}`;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state = {
    settings: loadSettings(),
    bankroll: 0,
    history: null,
    bet: { type: null, selection: null },
    autoSpin: { active: false, remaining: 0, timer: null },
    analyzerTab: 'history',
    analysisWindow: 100,
    historyFilters: {},
    historySort: { field: 'round', direction: 'desc' },
    historyPage: 1,
    simTab: 'single',
    labTab: 'samples',
    explorerSample: null,
    compareSamples: null,
    wheel: null,
    spinning: false,
    currentReport: null,
};

state.bankroll = loadBankroll(state.settings.startingBankroll);
state.history = createHistory(loadHistory(state.settings.rouletteType));

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function showPage(pageName) {
    document.querySelectorAll('[data-page-panel]').forEach((el) => {
        el.hidden = el.dataset.pagePanel !== pageName;
    });
    document.querySelectorAll('.app-nav__button[data-page]').forEach((btn) => {
        if (btn.dataset.page === pageName) btn.setAttribute('aria-current', 'page');
        else btn.removeAttribute('aria-current');
    });
    if (pageName === 'history') renderHistoryTable();
    if (pageName === 'analyzer') renderAnalyzerTab(state.analyzerTab);
    if (pageName === 'simulation') renderSimTab(state.simTab);
    if (pageName === 'lab') renderLabTab(state.labTab);
}

document.querySelectorAll('.app-nav__button[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
});

document.querySelectorAll('[data-analyzer-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
        state.analyzerTab = btn.dataset.analyzerTab;
        document.querySelectorAll('[data-analyzer-tab]').forEach((b) => {
            if (b === btn) b.setAttribute('aria-current', 'page');
            else b.removeAttribute('aria-current');
        });
        renderAnalyzerTab(state.analyzerTab);
    });
});

document.querySelectorAll('[data-sim-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
        state.simTab = btn.dataset.simTab;
        document.querySelectorAll('[data-sim-tab]').forEach((b) => {
            if (b === btn) b.setAttribute('aria-current', 'page');
            else b.removeAttribute('aria-current');
        });
        renderSimTab(state.simTab);
    });
});

document.querySelectorAll('[data-lab-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
        state.labTab = btn.dataset.labTab;
        document.querySelectorAll('[data-lab-tab]').forEach((b) => {
            if (b === btn) b.setAttribute('aria-current', 'page');
            else b.removeAttribute('aria-current');
        });
        renderLabTab(state.labTab);
    });
});

function renderAnalyzerTab(tab) {
    ['history', 'explorer', 'compare', 'bias', 'report'].forEach((name) => {
        $(`analyzer-tab-${name}`).hidden = name !== tab;
    });
    if (tab === 'history') renderAnalyzerHistory();
    if (tab === 'bias') renderBiasAnalyzer();
}

function renderSimTab(tab) {
    $('sim-tab-single').hidden = tab !== 'single';
    $('sim-tab-multi').hidden = tab !== 'multi';
    $('sim-tab-montecarlo').hidden = tab !== 'montecarlo';
}

function renderLabTab(tab) {
    $('lab-tab-samples').hidden = tab !== 'samples';
    $('lab-tab-validation').hidden = tab !== 'validation';
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

function applySettingsToForm() {
    $('setting-roulette-type').value = state.settings.rouletteType;
    $('setting-bankroll').value = state.settings.startingBankroll;
    $('setting-bet-amount').value = state.settings.betAmount;
}

function setSettingsMessage(message, isError = false) {
    const el = $('settings-message');
    el.textContent = message;
    el.style.color = isError ? 'var(--danger)' : '';
}

$('btn-apply-settings').addEventListener('click', () => {
    if (state.spinning) {
        setSettingsMessage('Please wait for the current spin to finish before changing settings.', true);
        return;
    }
    const newRouletteType = $('setting-roulette-type').value;
    const newStartingBankroll = Number($('setting-bankroll').value);
    const newBetAmount = Number($('setting-bet-amount').value);

    if (!Number.isFinite(newStartingBankroll) || newStartingBankroll <= 0) {
        setSettingsMessage('Starting bankroll must be a valid number greater than zero.', true);
        return;
    }
    if (!Number.isFinite(newBetAmount) || newBetAmount <= 0) {
        setSettingsMessage('Bet amount must be a valid number greater than zero.', true);
        return;
    }

    const rouletteTypeChanged = newRouletteType !== state.settings.rouletteType;
    if (rouletteTypeChanged && state.history.size() > 0) {
        const confirmed = window.confirm(
            'Changing the roulette type makes existing history incompatible (different pockets) and will clear it. Continue?'
        );
        if (!confirmed) {
            applySettingsToForm();
            return;
        }
        state.history.clear();
        saveHistory([]);
        state.explorerSample = null;
        state.compareSamples = null;
    }

    state.settings = { rouletteType: newRouletteType, startingBankroll: newStartingBankroll, betAmount: newBetAmount };
    saveSettings(state.settings);

    if (rouletteTypeChanged) {
        state.wheel.setRouletteType(newRouletteType);
        populateStraightNumberSelect();
        populateSimNumberSelect();
        populateMonteCarloNumberSelect();
        buildMultiBetList();
        clearBet();
    }

    setSettingsMessage('Settings applied.');
    renderDashboard();
    renderResultPanel(null);
    renderRecentResults();
});

$('btn-reset-bankroll').addEventListener('click', () => {
    state.bankroll = state.settings.startingBankroll;
    saveBankroll(state.bankroll);
    renderDashboard();
    setSettingsMessage('Bankroll reset to starting value.');
});

// ---------------------------------------------------------------------------
// Roulette page
// ---------------------------------------------------------------------------

function populateBetTypeGrid() {
    const grid = $('bet-type-grid');
    grid.innerHTML = '';
    for (const betType of BET_TYPE_ORDER) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bet-type-btn';
        btn.dataset.betType = betType;
        btn.setAttribute('aria-pressed', 'false');
        btn.textContent = BET_TYPE_LABELS[betType];
        btn.addEventListener('click', () => selectBetType(betType));
        grid.appendChild(btn);
    }
}

function selectBetType(betType) {
    if (state.spinning) return;
    state.bet.type = betType;
    state.bet.selection = betType === BET_TYPES.STRAIGHT ? ($('straight-number').value || '0') : null;
    document.querySelectorAll('#bet-type-grid .bet-type-btn').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.dataset.betType === betType));
    });
    $('straight-number-row').hidden = betType !== BET_TYPES.STRAIGHT;
    $('bet-message').textContent = '';
}

function clearBet() {
    if (state.spinning) return;
    state.bet = { type: null, selection: null };
    document.querySelectorAll('#bet-type-grid .bet-type-btn').forEach((btn) => btn.setAttribute('aria-pressed', 'false'));
    $('straight-number-row').hidden = true;
    $('bet-message').textContent = '';
}

$('btn-clear-bet').addEventListener('click', clearBet);

function populateStraightNumberSelect() {
    const select = $('straight-number');
    const pockets = getPockets(state.settings.rouletteType);
    select.innerHTML = pockets.map((p) => `<option value="${p}">${p}</option>`).join('');
    $('straight-00-hint').textContent = state.settings.rouletteType === ROULETTE_TYPES.AMERICAN ? ', 00' : '';
}

$('straight-number').addEventListener('change', () => {
    if (state.spinning) return;
    if (state.bet.type === BET_TYPES.STRAIGHT) state.bet.selection = $('straight-number').value;
});

function renderDashboard() {
    $('stat-bankroll').textContent = formatCurrency(state.bankroll);
    $('stat-bet-amount').textContent = formatCurrency(state.settings.betAmount);
    $('stat-rounds').textContent = String(state.history.size());
    const rounds = state.history.getAll();
    const last = rounds[rounds.length - 1];
    $('stat-last-result').textContent = last ? `${last.result} ${last.color.toUpperCase()}` : '—';
}

function renderResultPanel(round) {
    $('result-round').textContent = `Round #${round ? round.roundNumber : state.history.size()}`;
    const container = $('result-display');
    if (!round) {
        container.innerHTML = '<div class="result-panel__placeholder">Spin the wheel to generate a result</div>';
        return;
    }
    const tags = [];
    tags.push(`<span class="badge ${colorBadgeClass(round.color)}">${round.color.toUpperCase()}</span>`);
    if (round.parity) tags.push(`<span class="badge">${round.parity.toUpperCase()}</span>`);
    if (round.range) tags.push(`<span class="badge">${round.range === 'low' ? '1-18' : '19-36'}</span>`);
    if (round.dozen) tags.push(`<span class="badge">${round.dozen}${round.dozen === 1 ? 'st' : round.dozen === 2 ? 'nd' : 'rd'} dozen</span>`);
    if (round.column) tags.push(`<span class="badge">${round.column}${round.column === 1 ? 'st' : round.column === 2 ? 'nd' : 'rd'} column</span>`);
    container.innerHTML = `
        <div class="result-panel__number result-panel__number--${round.color}">${round.result}</div>
        <div class="result-panel__tags">${tags.join('')}</div>
    `;
    if (round.won !== undefined) {
        const msg = round.won
            ? `Bet won: +${formatCurrency(round.profit)}`
            : `Bet lost: ${formatCurrency(round.profit)}`;
        $('bet-message').textContent = msg;
    }
}

function renderRecentResults() {
    const recent = state.history.getRecent(30).slice().reverse();
    $('recent-results').innerHTML = recent
        .map((r) => `<span class="recent-results__chip recent-results__chip--${r.color}" title="Round ${r.roundNumber}">${r.result}</span>`)
        .join('');
}

/**
 * Runs one spin end-to-end (validation -> generate -> lock controls ->
 * animate -> record). Shared by the manual Spin button and the Auto Spin
 * loop so there is exactly one place that implements the generate-before-
 * animate invariant and the mid-animation lock (spec §10/§60/§62/§80).
 * @param {() => void} onDone called once the spin's animation completes and
 *   the round has been recorded — the caller decides whether to unlock
 *   controls immediately (a single manual spin) or chain another spin
 *   (Auto Spin).
 * @returns {boolean} true if the spin actually started, false if a
 *   validation check (missing straight-number selection, insufficient
 *   bankroll) rejected it — in which case `onDone` is never called and
 *   `bet-message` already explains why.
 */
function startSpin(onDone) {
    if (state.spinning) return false;

    if (state.bet.type === BET_TYPES.STRAIGHT && !state.bet.selection) {
        $('bet-message').textContent = 'Select a number for your straight bet.';
        return false;
    }
    if (state.bet.type && state.settings.betAmount > state.bankroll) {
        $('bet-message').textContent = 'Bet amount exceeds available bankroll.';
        return false;
    }

    // Snapshot the roulette type and bet along with the result so that any
    // settings/bet change the user makes while the animation plays cannot
    // retroactively alter how this already-decided spin gets recorded or
    // resolved (spec §10/§60/§62/§80 — no inconsistent state mid-animation).
    const activeBet = { type: state.bet.type, selection: state.bet.selection, amount: state.settings.betAmount };

    state.spinning = true;
    setSpinLockedControlsDisabled(true);
    $('bet-message').textContent = '';

    const result = generateRandomResult(state.settings.rouletteType);

    state.wheel.spinToResult(result, () => {
        completeSpin(result, activeBet);
        state.spinning = false;
        onDone();
    });
    return true;
}

$('btn-spin').addEventListener('click', () => {
    startSpin(() => setSpinLockedControlsDisabled(false));
});

function setSpinLockedControlsDisabled(disabled) {
    $('btn-spin').disabled = disabled;
    $('btn-apply-settings').disabled = disabled;
    $('btn-clear-bet').disabled = disabled;
    $('straight-number').disabled = disabled;
    $('auto-spin-count').disabled = disabled;
    document.querySelectorAll('#bet-type-grid .bet-type-btn').forEach((btn) => { btn.disabled = disabled; });
}

// ---------------------------------------------------------------------------
// Auto Spin
// ---------------------------------------------------------------------------

const AUTO_SPIN_DELAY_MS = 600;

function stopAutoSpin(statusMessage) {
    if (state.autoSpin.timer !== null) {
        window.clearTimeout(state.autoSpin.timer);
        state.autoSpin.timer = null;
    }
    state.autoSpin.active = false;
    $('btn-auto-spin').textContent = 'Auto Spin';
    $('btn-auto-spin').setAttribute('aria-pressed', 'false');
    $('auto-spin-status').textContent = statusMessage ?? '';
    // A spin already in flight (state.spinning) must still finish and
    // unlock controls itself; only unlock immediately if nothing is running.
    if (!state.spinning) setSpinLockedControlsDisabled(false);
}

function runNextAutoSpin() {
    if (!state.autoSpin.active) return;
    if (state.autoSpin.remaining <= 0) {
        stopAutoSpin('Auto spin finished.');
        return;
    }

    $('auto-spin-status').textContent = Number.isFinite(state.autoSpin.remaining)
        ? `Auto spin: ${state.autoSpin.remaining} spin(s) remaining…`
        : 'Auto spin running — click Stop Auto Spin to end.';

    const started = startSpin(() => {
        if (!state.autoSpin.active) {
            // Stopped while this spin was still animating: stopAutoSpin()
            // deliberately left controls locked for *this* spin to finish
            // and unlock them itself, since state.spinning was still true
            // at the moment Stop was clicked.
            setSpinLockedControlsDisabled(false);
            return;
        }
        state.autoSpin.remaining -= 1;
        state.autoSpin.timer = window.setTimeout(runNextAutoSpin, AUTO_SPIN_DELAY_MS);
    });

    // startSpin() already set an explanatory bet-message (missing straight
    // number, insufficient bankroll) when it returns false.
    if (!started) stopAutoSpin();
}

$('btn-auto-spin').addEventListener('click', () => {
    if (state.autoSpin.active) {
        stopAutoSpin('Auto spin stopped.');
        return;
    }
    if (state.spinning) {
        $('auto-spin-status').textContent = 'Please wait for the current spin to finish.';
        return;
    }

    const rawCount = $('auto-spin-count').value;
    state.autoSpin.active = true;
    state.autoSpin.remaining = rawCount === 'infinite' ? Infinity : Number(rawCount);
    $('btn-auto-spin').textContent = 'Stop Auto Spin';
    $('btn-auto-spin').setAttribute('aria-pressed', 'true');
    runNextAutoSpin();
});

function completeSpin(result, bet) {
    const roundNumber = state.history.size() + 1;
    let betInfo = {};

    if (bet.type) {
        const betAmount = bet.amount;
        const payout = getBetPayout(bet.type);
        const won = evaluateBet(result, bet.type, bet.selection);
        const profit = won ? betAmount * payout : -betAmount;
        state.bankroll += profit;
        betInfo = {
            betType: bet.type,
            betSelection: bet.selection ?? null,
            betAmount,
            won,
            profit,
            bankrollAfter: state.bankroll,
        };
    }

    const round = state.history.addRound(result, roundNumber, betInfo);
    saveHistory(state.history.getAll());
    saveBankroll(state.bankroll);

    renderDashboard();
    renderResultPanel(round);
    renderRecentResults();
}

// ---------------------------------------------------------------------------
// History page
// ---------------------------------------------------------------------------

function currentHistoryFilters() {
    return {
        search: $('history-search').value,
        color: $('filter-color').value,
        parity: $('filter-parity').value,
        range: $('filter-range').value,
        dozen: $('filter-dozen').value,
        column: $('filter-column').value,
    };
}

['history-search', 'filter-color', 'filter-parity', 'filter-range', 'filter-dozen', 'filter-column'].forEach((id) => {
    $(id).addEventListener('input', () => {
        state.historyPage = 1;
        renderHistoryTable();
    });
});

$('btn-reset-filters').addEventListener('click', () => {
    $('history-search').value = '';
    $('filter-color').value = '';
    $('filter-parity').value = '';
    $('filter-range').value = '';
    $('filter-dozen').value = '';
    $('filter-column').value = '';
    state.historyPage = 1;
    renderHistoryTable();
});

document.querySelectorAll('#history-table th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (state.historySort.field === field) {
            state.historySort.direction = state.historySort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            state.historySort = { field, direction: 'desc' };
        }
        renderHistoryTable();
    });
});

function renderHistoryTable() {
    const all = state.history.getAll();
    $('history-count-label').textContent = `${all.length} round${all.length === 1 ? '' : 's'} recorded (max 1,000)`;

    const filtered = filterRounds(all, currentHistoryFilters());
    const sorted = sortRounds(filtered, state.historySort.field, state.historySort.direction);
    const { items, page, totalPages, totalItems } = paginate(sorted, state.historyPage, 25);
    state.historyPage = page;

    const tbody = $('history-table-body');
    tbody.innerHTML = items.map((r) => `
        <tr>
            <td>${r.roundNumber}</td>
            <td class="text-${r.color}"><strong>${r.result}</strong></td>
            <td class="text-${r.color}">${r.color.toUpperCase()}</td>
            <td>${r.parity ? r.parity.toUpperCase() : '—'}</td>
            <td>${r.range ? (r.range === 'low' ? '1-18' : '19-36') : '—'}</td>
            <td>${r.dozen ?? '—'}</td>
            <td>${r.column ?? '—'}</td>
            <td>${new Date(r.timestamp).toLocaleString()}</td>
        </tr>
    `).join('') || '<tr><td colspan="8" class="text-muted">No rounds match the current filters.</td></tr>';

    $('history-pagination').innerHTML = `
        <button class="btn btn--ghost" id="hist-prev" ${page <= 1 ? 'disabled' : ''}>Previous</button>
        <span class="text-muted">Page ${page} of ${totalPages} (${totalItems} rounds)</span>
        <button class="btn btn--ghost" id="hist-next" ${page >= totalPages ? 'disabled' : ''}>Next</button>
    `;
    $('hist-prev')?.addEventListener('click', () => { state.historyPage -= 1; renderHistoryTable(); });
    $('hist-next')?.addEventListener('click', () => { state.historyPage += 1; renderHistoryTable(); });
}

$('btn-export-csv').addEventListener('click', () => {
    const csv = buildCsv(state.history.getAll());
    triggerCsvDownload(csv, `roulette-history-${Date.now()}.csv`);
});

$('import-csv-input').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await readFileAsText(file);
    const { records, errors, truncated } = parseCsv(text, state.settings.rouletteType);

    for (const record of records) {
        state.history.addRound(record.result, state.history.size() + 1, { timestamp: record.timestamp });
    }
    saveHistory(state.history.getAll());

    let message = `Imported ${records.length} round(s).`;
    if (truncated) message += ' Only the first 1,000 rows were processed.';
    if (errors.length) message += ` ${errors.length} row(s) were skipped as invalid.`;
    $('history-message').textContent = message;

    event.target.value = '';
    renderHistoryTable();
    renderDashboard();
    renderRecentResults();
});

$('btn-clear-history').addEventListener('click', () => {
    if (!window.confirm('This will permanently delete all recorded rounds. Continue?')) return;
    state.history.clear();
    saveHistory([]);
    renderHistoryTable();
    renderDashboard();
    renderRecentResults();
    $('history-message').textContent = 'History cleared.';
});

// ---------------------------------------------------------------------------
// Analyzer — shared helpers
// ---------------------------------------------------------------------------

function getAnalysisResults() {
    const all = state.history.getAll().map((r) => r.result);
    const windowSize = state.analysisWindow === 'all' ? all.length : Math.min(state.analysisWindow, all.length);
    return all.slice(all.length - windowSize);
}

function renderProbabilitySection(rouletteType) {
    const green = getGreenProbability(rouletteType) * 100;
    const redBlack = getRedOrBlackProbability(rouletteType) * 100;
    $('probability-colors').innerHTML = `
        <div class="card"><div class="card__title text-red">Red</div><div class="card__value">${formatPct(redBlack)}</div></div>
        <div class="card"><div class="card__title">Black</div><div class="card__value">${formatPct(redBlack)}</div></div>
        <div class="card"><div class="card__title text-green">Green</div><div class="card__value">${formatPct(green)}</div></div>
    `;

    const evenMoney = getEvenMoneyProbability(rouletteType) * 100;
    const group = getDozenOrColumnProbability(rouletteType) * 100;
    $('probability-groups').innerHTML = `
        <div class="card"><div class="card__title">Even / Odd</div><div class="card__value">${formatPct(evenMoney)}</div></div>
        <div class="card"><div class="card__title">1-18 / 19-36</div><div class="card__value">${formatPct(evenMoney)}</div></div>
        <div class="card"><div class="card__title">Any dozen</div><div class="card__value">${formatPct(group)}</div></div>
        <div class="card"><div class="card__title">Any column</div><div class="card__value">${formatPct(group)}</div></div>
    `;

    const single = getSingleNumberProbability(rouletteType) * 100;
    $('probability-numbers').innerHTML = getPockets(rouletteType)
        .map((p) => `<div class="probability-grid__cell"><strong>${p}</strong>${formatPct(single)}</div>`)
        .join('');

    const pocketCount = getPockets(rouletteType).length;
    const houseEdge = getHouseEdge(rouletteType) * 100;
    $('probability-explainer').innerHTML = `
        <p><strong>Why does every individual number have the same probability?</strong> Because each pocket represents one equally likely outcome of the wheel. ${rouletteType === 'american' ? 'American' : 'European'} roulette has ${pocketCount} pockets, so each number has a probability of 1/${pocketCount} ≈ ${formatPct(single)}.</p>
        <p>Previous spins do not change the mathematical probability of the next independent spin.</p>
        <p>The house edge on this wheel is ≈ ${formatPct(houseEdge)}, created by the zero${rouletteType === 'american' ? ' and 00' : ''} pocket(s).</p>
    `;
}

function renderAnalyzerHistory() {
    const rouletteType = state.settings.rouletteType;
    renderProbabilitySection(rouletteType);

    const results = getAnalysisResults();
    const sampleSize = results.length;
    $('sample-size-label').textContent = sampleSize > 0
        ? `Sample size: ${sampleSize} round(s) — ${getSampleSizeLabel(sampleSize)}. Even 1,000 rounds are limited when attempting to detect small deviations from theoretical probabilities.`
        : 'No rounds available yet. Spin the wheel or import history to see analysis.';

    renderCentralTendency(results);
    renderFrequencyTable(results, rouletteType);
    renderAnalyzerCharts(results, rouletteType);
    renderSequenceSection(results);
    renderStatisticalTests(results, rouletteType);
    renderPatternDetective(results, rouletteType);
}

function renderCentralTendency(results) {
    const mean = calculateMean(results);
    const median = calculateMedian(results);
    const mode = calculateMode(results);
    const stdDev = calculateStandardDeviation(results);

    $('central-tendency-cards').innerHTML = `
        <div class="card">
            <div class="card__title">Mean</div>
            <div class="card__value">${formatNumber(mean.mean)}</div>
            <div class="text-muted" style="font-size:0.78rem">Expected ${EXPECTED_MEAN} · diff ${mean.mean !== null ? formatNumber(mean.mean - EXPECTED_MEAN) : '—'}${mean.excluded ? ` · ${mean.excluded} "00" excluded` : ''}</div>
        </div>
        <div class="card">
            <div class="card__title">Median</div>
            <div class="card__value">${formatNumber(median.median)}</div>
            <div class="text-muted" style="font-size:0.78rem">Reference ${EXPECTED_MEDIAN} · diff ${median.median !== null ? formatNumber(median.median - EXPECTED_MEDIAN) : '—'}</div>
        </div>
        <div class="card">
            <div class="card__title">Mode</div>
            <div class="card__value">${mode.modes.join(', ') || '—'}</div>
            <div class="text-muted" style="font-size:0.78rem">${mode.count} occurrence(s)</div>
        </div>
        <div class="card">
            <div class="card__title">Std. Deviation</div>
            <div class="card__value">${formatNumber(stdDev)}</div>
            <div class="text-muted" style="font-size:0.78rem">Reference ≈ ${formatNumber(EXPECTED_STD_DEV)}</div>
        </div>
    `;
}

function renderFrequencyTable(results, rouletteType) {
    const rows = calculateNumberFrequency(results, rouletteType);
    $('frequency-table-body').innerHTML = rows.map((r) => `
        <tr>
            <td>${r.result}</td>
            <td>${r.occurrences}</td>
            <td>${formatPct(r.observedPct)}</td>
            <td>${formatPct(r.expectedPct)}</td>
            <td>${formatSignedPct(r.differencePct)}</td>
            <td>${r.roundsSinceLastOccurrence ?? '—'}</td>
            <td>${formatNumber(r.averageGap, 1)}</td>
        </tr>
    `).join('');
}

function renderAnalyzerCharts(results, rouletteType) {
    const pockets = getPockets(rouletteType);
    const freq = calculateNumberFrequency(results, rouletteType);
    const colors = pockets.map((p) => {
        const c = getColor(p);
        return c === 'red' ? PALETTE.red : c === 'black' ? '#555' : PALETTE.green;
    });

    renderBarChart('chart-number-frequency', {
        labels: pockets,
        datasets: [{ label: 'Occurrences', data: freq.map((f) => f.occurrences), backgroundColor: colors }],
    });

    const colorDist = calculateColorDistribution(results, rouletteType);
    renderDoughnutChart('chart-color', {
        labels: colorDist.map((c) => c.category),
        data: colorDist.map((c) => c.count),
        colors: [PALETTE.red, '#555', PALETTE.green],
    });

    const parityDist = calculateParityDistribution(results, rouletteType);
    renderDoughnutChart('chart-parity', {
        labels: parityDist.map((c) => c.category),
        data: parityDist.map((c) => c.count),
        colors: [PALETTE.accent, PALETTE.blue],
    });

    const rangeDist = calculateRangeDistribution(results, rouletteType);
    renderDoughnutChart('chart-range', {
        labels: rangeDist.map((c) => (c.category === 'low' ? '1-18' : '19-36')),
        data: rangeDist.map((c) => c.count),
        colors: [PALETTE.accent, PALETTE.blue],
    });

    const dozenDist = calculateDozenDistribution(results, rouletteType);
    renderBarChart('chart-dozens', {
        labels: dozenDist.map((c) => `Dozen ${c.category}`),
        datasets: [{ label: 'Observed %', data: dozenDist.map((c) => c.observedPct), backgroundColor: PALETTE.accent }],
    });

    const columnDist = calculateColumnDistribution(results, rouletteType);
    renderBarChart('chart-columns', {
        labels: columnDist.map((c) => `Column ${c.category}`),
        datasets: [{ label: 'Observed %', data: columnDist.map((c) => c.observedPct), backgroundColor: PALETTE.blue }],
    });

    const rollingMean = calculateRollingMean(results, 25);
    renderLineChart('chart-rolling-mean', {
        labels: rollingMean.map((_, i) => i + 1),
        datasets: [{ label: 'Rolling mean (25)', data: rollingMean, borderColor: PALETTE.accent, backgroundColor: PALETTE.accentSoft }],
    });

    const rollingRed = calculateRollingPercentage(results, 25, getColor, 'red');
    renderLineChart('chart-frequency-time', {
        labels: rollingRed.map((_, i) => i + 1),
        datasets: [{ label: 'Rolling red % (25)', data: rollingRed, borderColor: PALETTE.red, backgroundColor: 'rgba(192,57,43,0.25)' }],
    });
}

function renderSequenceSection(results) {
    const colorSeq = calculateSequences(results, getColor);
    const paritySeq = calculateSequences(results, getParity);
    const repetitions = calculateRepetitions(results);

    $('sequence-cards').innerHTML = `
        <div class="card"><div class="card__title">Current streak</div><div class="card__value">${colorSeq.current ? `${colorSeq.current} × ${colorSeq.currentLength}` : '—'}</div></div>
        <div class="card"><div class="card__title">Longest red streak</div><div class="card__value">${colorSeq.longest.red ?? 0}</div></div>
        <div class="card"><div class="card__title">Longest black streak</div><div class="card__value">${colorSeq.longest.black ?? 0}</div></div>
        <div class="card"><div class="card__title">Avg. color streak</div><div class="card__value">${formatNumber(colorSeq.averageLength, 2)}</div></div>
        <div class="card"><div class="card__title">Longest even streak</div><div class="card__value">${paritySeq.longest.even ?? 0}</div></div>
        <div class="card"><div class="card__title">Longest odd streak</div><div class="card__value">${paritySeq.longest.odd ?? 0}</div></div>
    `;

    $('repetition-summary').innerHTML = `
        <p>Immediate repetitions (same number twice in a row): ${repetitions.immediateRepeats}. Within 2 rounds: ${repetitions.within2Rounds}. Within 3 rounds: ${repetitions.within3Rounds}.</p>
        <p>${repetitions.repeatedPairs.length} distinct number pair(s) and ${repetitions.repeatedTriplets.length} distinct triplet(s) occurred more than once in this sample.</p>
        <p>These are descriptive observations. A streak or repetition does not predict the next independent spin.</p>
    `;
}

function renderStatisticalTests(results, rouletteType) {
    const sampleSize = results.length;
    const pockets = getPockets(rouletteType);
    const freq = calculateNumberFrequency(results, rouletteType);
    const observedNumberCounts = freq.map((f) => f.occurrences);
    const expectedNumberFractions = pockets.map(() => 1 / pockets.length);
    const chiNumbers = calculateChiSquare(observedNumberCounts, expectedNumberFractions);

    const colorDist = calculateColorDistribution(results, rouletteType);
    const chiColor = calculateChiSquare(
        colorDist.map((c) => c.count),
        colorDist.map((c) => c.expectedPct / 100)
    );

    const redCount = colorDist.find((c) => c.category === 'red')?.count ?? 0;
    const redProbability = getRedOrBlackProbability(rouletteType);
    const zRed = calculateZScore(redCount, sampleSize, redProbability);
    const ciRed = calculateConfidenceInterval(redCount, sampleSize);

    const insufficientMsg = '<p class="text-muted">Insufficient sample size for a meaningful statistical assessment.</p>';

    $('statistical-tests').innerHTML = `
        <div class="explainer">
            <p><strong>Chi-square goodness-of-fit (numbers):</strong> ${chiNumbers.insufficientSample
                ? insufficientMsg
                : `χ² = ${formatNumber(chiNumbers.chiSquare)}, degrees of freedom = ${chiNumbers.degreesOfFreedom}.`}
            </p>
            <p><strong>Chi-square goodness-of-fit (colors):</strong> ${chiColor.insufficientSample
                ? insufficientMsg
                : `χ² = ${formatNumber(chiColor.chiSquare)}, degrees of freedom = ${chiColor.degreesOfFreedom}.`}
            </p>
            <p><strong>Z-score approximation (red proportion):</strong> ${zRed === null ? '—' : formatNumber(zRed)}</p>
            <p><strong>95% confidence interval (red proportion):</strong> ${ciRed ? `${formatPct(ciRed.lower * 100)} – ${formatPct(ciRed.upper * 100)}` : '—'}</p>
            <p>Chi-square and z-score compare the observed distribution with the theoretical distribution. A deviation does not automatically mean the wheel is biased — random samples naturally fluctuate around their expected values.</p>
        </div>
    `;
}

function renderPatternDetective(results, rouletteType) {
    const findings = analyzePatterns(results, rouletteType);
    const rows = [];

    for (const dev of findings.colorImbalance) {
        rows.push([`${capitalize(dev.category)} deviates ${formatSignedPct(dev.differencePct)} from expectation`, dev.classification]);
    }
    for (const dev of findings.parityImbalance) {
        rows.push([`${capitalize(dev.category)} deviates ${formatSignedPct(dev.differencePct)} from expectation`, dev.classification]);
    }
    for (const dev of findings.dozenConcentration) {
        rows.push([`Dozen ${dev.category} deviates ${formatSignedPct(dev.differencePct)} from expectation`, dev.classification]);
    }
    for (const dev of findings.columnConcentration) {
        rows.push([`Column ${dev.category} deviates ${formatSignedPct(dev.differencePct)} from expectation`, dev.classification]);
    }
    for (const dev of findings.numberDeviations.slice(0, 8)) {
        rows.push([`Number ${dev.result} deviates ${formatSignedPct(dev.differencePct)} from expectation`, dev.classification]);
    }

    $('pattern-table-body').innerHTML = rows.length
        ? rows.map(([label, classification]) => `
            <tr class="classification-row">
                <td>${label}</td>
                <td><span class="${classificationBadgeClass(classification)}">${classification}</span></td>
            </tr>
        `).join('')
        : '<tr><td colspan="2" class="text-muted">No notable deviations detected in this sample.</td></tr>';

    $('insight-list').innerHTML = buildPatternNarratives(findings).map((line) => `<li>${line}</li>`).join('');
    $('analysis-summary').textContent = buildAnalysisSummary(results, rouletteType, findings);
}

function buildAnalysisSummary(results, rouletteType, findings) {
    const sampleSize = results.length;
    if (sampleSize === 0) {
        return 'No rounds have been recorded yet. Spin the wheel or import history to generate an analysis summary.';
    }
    const topNumber = findings.hotNumbers[0];
    const topColor = findings.colorImbalance[0];
    const parts = [`You analyzed ${sampleSize} round(s).`];
    if (topNumber && topNumber.occurrences > 0) {
        parts.push(`Number ${topNumber.result} was the most frequent result in this sample (${topNumber.occurrences} occurrences).`);
    }
    if (topColor) {
        const sign = topColor.differencePct > 0 ? 'above' : 'below';
        parts.push(`${capitalize(topColor.category)} appeared ${Math.abs(topColor.differencePct).toFixed(2)} percentage points ${sign} its mathematical expectation.`);
    }
    parts.push('These observations describe the sample but do not establish that the roulette wheel is biased or that the next result can be predicted.');
    parts.push(`For the next independent spin, the mathematical probability of each individual pocket remains 1/${getPockets(rouletteType).length}.`);
    return parts.join(' ');
}

function capitalize(s) {
    return typeof s === 'string' && s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function buildAnalysisWindowButtons() {
    const container = $('analysis-window-select');
    container.innerHTML = ANALYSIS_WINDOWS.map((w) => `
        <button type="button" data-window="${w}" aria-pressed="${w === state.analysisWindow}">${w === 'all' ? 'Entire history' : `Last ${w}`}</button>
    `).join('');
    container.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
            const value = btn.dataset.window;
            state.analysisWindow = value === 'all' ? 'all' : Number(value);
            container.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
            renderAnalyzerHistory();
        });
    });
}

// ---------------------------------------------------------------------------
// Analyzer — Pattern Explorer tab
// ---------------------------------------------------------------------------

function renderSampleSummaryCards(containerId, results, rouletteType) {
    const mean = calculateMean(results);
    const median = calculateMedian(results);
    const mode = calculateMode(results);
    const top5 = calculateTopN(results, 5);
    const colorDist = calculateColorDistribution(results, rouletteType);
    const longest = calculateSequences(results, getColor).longest;

    $(containerId).innerHTML = `
        <div class="card"><div class="card__title">Sample size</div><div class="card__value">${results.length}</div></div>
        <div class="card"><div class="card__title">Mean</div><div class="card__value">${formatNumber(mean.mean)}</div></div>
        <div class="card"><div class="card__title">Median</div><div class="card__value">${formatNumber(median.median)}</div></div>
        <div class="card"><div class="card__title">Mode</div><div class="card__value">${mode.modes.join(', ') || '—'}</div></div>
        <div class="card"><div class="card__title">Top 5 numbers</div><div class="card__value" style="font-size:1rem">${top5.map((t) => `${t.result} (${t.count})`).join(', ')}</div></div>
        <div class="card"><div class="card__title">Red / Black / Green</div><div class="card__value" style="font-size:1rem">${colorDist.map((c) => `${c.count}`).join(' / ')}</div></div>
        <div class="card"><div class="card__title">Longest red streak</div><div class="card__value">${longest.red ?? 0}</div></div>
        <div class="card"><div class="card__title">Longest black streak</div><div class="card__value">${longest.black ?? 0}</div></div>
    `;
}

$('btn-generate-sample').addEventListener('click', () => {
    const size = Number($('explorer-size').value);
    const rouletteType = state.settings.rouletteType;
    state.explorerSample = generateRandomSequence(rouletteType, size);
    $('explorer-results').hidden = false;
    renderSampleSummaryCards('explorer-summary-cards', state.explorerSample, rouletteType);
    const findings = analyzePatterns(state.explorerSample, rouletteType);
    $('explorer-insight-list').innerHTML = buildPatternNarratives(findings).map((line) => `<li>${line}</li>`).join('');
});

// ---------------------------------------------------------------------------
// Analyzer — Sample Comparison tab
// ---------------------------------------------------------------------------

function sampleMetrics(results, rouletteType) {
    const mean = calculateMean(results);
    const median = calculateMedian(results);
    const mode = calculateMode(results);
    const stdDev = calculateStandardDeviation(results);
    const colorDist = calculateColorDistribution(results, rouletteType);
    const longest = calculateSequences(results, getColor).longest;
    return { mean, median, mode, stdDev, colorDist, longest };
}

$('btn-generate-compare').addEventListener('click', () => {
    const size = Number($('compare-size').value);
    const rouletteType = state.settings.rouletteType;
    const sampleA = generateRandomSequence(rouletteType, size);
    const sampleB = generateRandomSequence(rouletteType, size);
    state.compareSamples = { sampleA, sampleB };

    const a = sampleMetrics(sampleA, rouletteType);
    const b = sampleMetrics(sampleB, rouletteType);
    const pctOf = (dist, cat) => dist.find((d) => d.category === cat)?.observedPct ?? 0;

    const rows = [
        ['Mean', formatNumber(a.mean.mean), formatNumber(b.mean.mean)],
        ['Median', formatNumber(a.median.median), formatNumber(b.median.median)],
        ['Mode', a.mode.modes.join(', ') || '—', b.mode.modes.join(', ') || '—'],
        ['Std. Deviation', formatNumber(a.stdDev), formatNumber(b.stdDev)],
        ['Red %', formatPct(pctOf(a.colorDist, 'red')), formatPct(pctOf(b.colorDist, 'red'))],
        ['Black %', formatPct(pctOf(a.colorDist, 'black')), formatPct(pctOf(b.colorDist, 'black'))],
        ['Green %', formatPct(pctOf(a.colorDist, 'green')), formatPct(pctOf(b.colorDist, 'green'))],
        ['Longest red streak', a.longest.red ?? 0, b.longest.red ?? 0],
        ['Longest black streak', a.longest.black ?? 0, b.longest.black ?? 0],
    ];

    $('compare-table-body').innerHTML = rows.map(([label, va, vb]) => `
        <tr><td>${label}</td><td>${va}</td><td>${vb}</td></tr>
    `).join('');
    $('compare-results').hidden = false;
});

// ---------------------------------------------------------------------------
// Simulation page
// ---------------------------------------------------------------------------

function populateSimBetTypeSelect() {
    const select = $('sim-bet-type');
    select.innerHTML = BET_TYPE_ORDER.map((t) => `<option value="${t}">${BET_TYPE_LABELS[t]}</option>`).join('');
    select.addEventListener('change', () => {
        $('sim-number-row').hidden = select.value !== BET_TYPES.STRAIGHT;
    });
}

function populateSimNumberSelect() {
    const select = $('sim-number');
    select.innerHTML = getPockets(state.settings.rouletteType).map((p) => `<option value="${p}">${p}</option>`).join('');
}

$('btn-run-simulation').addEventListener('click', () => {
    const rounds = Number($('sim-rounds').value);
    const betType = $('sim-bet-type').value;
    const betSelection = betType === BET_TYPES.STRAIGHT ? $('sim-number').value : undefined;

    const result = runSimulation({
        rouletteType: state.settings.rouletteType,
        rounds,
        betType,
        betSelection,
        betAmount: state.settings.betAmount,
        startingBankroll: state.settings.startingBankroll,
    });

    $('sim-results').hidden = false;
    $('sim-summary-cards').innerHTML = `
        <div class="card"><div class="card__title">Rounds played</div><div class="card__value">${result.playedRounds}</div></div>
        <div class="card"><div class="card__title">Wins</div><div class="card__value">${result.wins}</div></div>
        <div class="card"><div class="card__title">Losses</div><div class="card__value">${result.losses}</div></div>
        <div class="card"><div class="card__title">Win rate</div><div class="card__value">${formatPct(result.winRate)}</div></div>
        <div class="card"><div class="card__title">Total wagered</div><div class="card__value">${formatCurrency(result.totalWagered)}</div></div>
        <div class="card"><div class="card__title">Total return</div><div class="card__value">${formatCurrency(result.totalReturn)}</div></div>
        <div class="card"><div class="card__title">Profit / Loss</div><div class="card__value" style="color:${result.profitLoss >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatCurrency(result.profitLoss)}</div></div>
        <div class="card"><div class="card__title">Final bankroll</div><div class="card__value">${formatCurrency(result.finalBankroll)}</div></div>
        <div class="card"><div class="card__title">ROI</div><div class="card__value">${formatPct(result.roi)}</div></div>
        <div class="card"><div class="card__title">Longest win streak</div><div class="card__value">${result.longestWinStreak}</div></div>
        <div class="card"><div class="card__title">Longest loss streak</div><div class="card__value">${result.longestLossStreak}</div></div>
        <div class="card"><div class="card__title">Max drawdown</div><div class="card__value">${formatCurrency(result.maxDrawdown)}</div></div>
    `;

    renderLineChart('chart-sim-bankroll', {
        labels: result.bankrollOverTime.map((_, i) => i),
        datasets: [{ label: 'Bankroll', data: result.bankrollOverTime, borderColor: PALETTE.accent, backgroundColor: PALETTE.accentSoft }],
    });
});

function buildMultiBetList() {
    const container = $('multi-bet-list');
    container.innerHTML = BET_TYPE_ORDER.map((t) => `
        <label class="multi-bet-row">
            <input type="checkbox" value="${t}" ${[BET_TYPES.RED, BET_TYPES.BLACK, BET_TYPES.STRAIGHT, BET_TYPES.DOZEN_1, BET_TYPES.COLUMN_2].includes(t) ? 'checked' : ''} />
            <span>${BET_TYPE_LABELS[t]}${t === BET_TYPES.STRAIGHT ? ' (17)' : ''}</span>
        </label>
    `).join('');
}

$('btn-run-multi').addEventListener('click', () => {
    const rounds = Number($('multi-rounds').value);
    const selected = [...$('multi-bet-list').querySelectorAll('input[type="checkbox"]:checked')].map((el) => el.value);
    if (selected.length === 0) return;

    const bets = selected.map((betType) => ({
        betType,
        betSelection: betType === BET_TYPES.STRAIGHT ? '17' : undefined,
        label: BET_TYPE_LABELS[betType] + (betType === BET_TYPES.STRAIGHT ? ' (17)' : ''),
    }));

    const results = runMultiBetComparison({
        rouletteType: state.settings.rouletteType,
        rounds,
        betAmount: state.settings.betAmount,
        startingBankroll: state.settings.startingBankroll,
    }, bets);

    $('multi-table-body').innerHTML = results.map((r) => `
        <tr>
            <td>${r.label}</td>
            <td>${r.wins}</td>
            <td>${formatPct(r.winRate)}</td>
            <td class="${r.roi >= 0 ? 'positive' : 'negative'}">${formatPct(r.roi)}</td>
            <td class="${r.profitLoss >= 0 ? 'positive' : 'negative'}">${formatCurrency(r.profitLoss)}</td>
        </tr>
    `).join('');
    $('multi-results').hidden = false;
});

// ---------------------------------------------------------------------------
// Progress bar helper (Statistical Lab / Monte Carlo Lab — worker-backed jobs)
// ---------------------------------------------------------------------------

function setProgress(prefix, done, total, label) {
    const bar = $(`${prefix}-progress-bar`);
    const fill = $(`${prefix}-progress-fill`);
    const labelEl = $(`${prefix}-progress-label`);
    if (done >= total) {
        bar.hidden = true;
        labelEl.textContent = '';
        return;
    }
    bar.hidden = false;
    fill.style.width = `${Math.min(100, (done / total) * 100)}%`;
    labelEl.textContent = label ?? `${done} / ${total}`;
}

// ---------------------------------------------------------------------------
// Analyzer — Wheel Bias Analyzer tab
// ---------------------------------------------------------------------------

function renderBiasAnalyzer() {
    const results = getAnalysisResults();
    const rouletteType = state.settings.rouletteType;
    $('bias-sample-size-label').textContent = `Using the current analysis window: ${results.length} round(s).`;

    if (results.length === 0) {
        $('bias-results').hidden = true;
        return;
    }
    $('bias-results').hidden = false;

    const report = analyzeWheelBias(results, rouletteType);

    $('bias-warning-card').hidden = !report.sampleSizeWarning;
    if (report.sampleSizeWarning) $('bias-sample-warning').textContent = report.sampleSizeWarning;

    const chiSquareCards = (block) => `
        <div class="card"><div class="card__title">Chi-square</div><div class="card__value">${block.chiSquare !== null ? block.chiSquare.toFixed(3) : '—'}</div></div>
        <div class="card"><div class="card__title">Degrees of freedom</div><div class="card__value">${block.degreesOfFreedom}</div></div>
        <div class="card"><div class="card__title">p-value</div><div class="card__value">${block.pValue !== null ? block.pValue.toFixed(4) : '—'}</div></div>
        <div class="card"><div class="card__title">Evidence level</div><div class="card__value" style="font-size:1rem">${block.evidenceLevel}</div></div>
    `;

    $('bias-number-chisquare-cards').innerHTML = chiSquareCards(report.numberChiSquare);
    $('bias-number-interpretation').textContent = [report.numberChiSquare.pValueInterpretation, report.numberChiSquare.biasInterpretation].filter(Boolean).join(' ');

    $('bias-color-chisquare-cards').innerHTML = chiSquareCards(report.colorChiSquare);
    $('bias-color-interpretation').textContent = [report.colorChiSquare.pValueInterpretation, report.colorChiSquare.biasInterpretation].filter(Boolean).join(' ');

    const ciCard = (title, data) => !data ? '' : `
        <div class="card">
            <div class="card__title">${title}</div>
            <div class="card__value" style="font-size:1rem">${formatPct(data.observed * 100)}</div>
            <div class="text-muted" style="font-size:0.78rem">95% CI: ${formatPct(data.lower * 100)} – ${formatPct(data.upper * 100)}</div>
        </div>`;
    $('bias-ci-cards').innerHTML =
        ciCard('Red proportion', report.confidenceIntervals.red) +
        ciCard('Black proportion', report.confidenceIntervals.black) +
        (report.confidenceIntervals.mostDeviatedNumber ? ciCard(`Number ${report.confidenceIntervals.mostDeviatedNumber.result} proportion`, report.confidenceIntervals.mostDeviatedNumber) : '');

    $('bias-residuals-table-body').innerHTML = report.numberResiduals.slice(0, 15).map((r) => `
        <tr>
            <td>${r.result}</td>
            <td>${r.occurrences}</td>
            <td>${formatPct(r.observedPct)}</td>
            <td>${formatPct(r.expectedPct)}</td>
            <td>${r.standardizedResidual !== null ? r.standardizedResidual.toFixed(2) : '—'}</td>
        </tr>
    `).join('');

    $('bias-significance-caveat').textContent = report.significanceCaveat;
}

// ---------------------------------------------------------------------------
// Analyzer — Statistical Report tab
// ---------------------------------------------------------------------------

$('btn-generate-report').addEventListener('click', () => {
    const results = getAnalysisResults();
    if (results.length === 0) {
        $('report-message').textContent = 'No rounds available yet. Spin the wheel or import history to generate a report.';
        $('report-preview-card').hidden = true;
        state.currentReport = null;
        return;
    }
    state.currentReport = buildStatisticalReport(results, state.settings.rouletteType);
    $('report-message').textContent = `Report generated for ${results.length} round(s).`;
    $('report-preview-card').hidden = false;
    $('report-preview').innerHTML = state.currentReport.narratives.map((line) => `<p>${line}</p>`).join('');
});

$('btn-export-report-csv').addEventListener('click', () => {
    if (!state.currentReport) return;
    triggerTextDownload(buildReportCsv(state.currentReport), `roulette-statistical-report-${Date.now()}.csv`, 'text/csv');
});
$('btn-export-report-json').addEventListener('click', () => {
    if (!state.currentReport) return;
    triggerTextDownload(buildReportJson(state.currentReport), `roulette-statistical-report-${Date.now()}.json`, 'application/json');
});
$('btn-export-report-html').addEventListener('click', () => {
    if (!state.currentReport) return;
    triggerTextDownload(buildReportHtml(state.currentReport), `roulette-statistical-report-${Date.now()}.html`, 'text/html');
});

// ---------------------------------------------------------------------------
// Simulation — Monte Carlo Lab tab
// ---------------------------------------------------------------------------

function populateMonteCarloBetTypeSelect() {
    const select = $('mc-bet-type');
    select.innerHTML = BET_TYPE_ORDER.map((t) => `<option value="${t}">${BET_TYPE_LABELS[t]}</option>`).join('');
    select.addEventListener('change', () => {
        $('mc-number-row').hidden = select.value !== BET_TYPES.STRAIGHT;
    });
}

function populateMonteCarloNumberSelect() {
    $('mc-number').innerHTML = getPockets(state.settings.rouletteType).map((p) => `<option value="${p}">${p}</option>`).join('');
}

function buildMonteCarloCompareList() {
    const container = $('mc-compare-bet-list');
    container.innerHTML = BET_TYPE_ORDER.map((t) => `
        <label class="multi-bet-row">
            <input type="checkbox" value="${t}" ${[BET_TYPES.RED, BET_TYPES.BLACK, BET_TYPES.STRAIGHT, BET_TYPES.DOZEN_1].includes(t) ? 'checked' : ''} />
            <span>${BET_TYPE_LABELS[t]}${t === BET_TYPES.STRAIGHT ? ' (17)' : ''}</span>
        </label>
    `).join('');
}

function renderMonteCarloResult(result) {
    $('mc-results').hidden = false;
    const s = result.summary;
    $('mc-summary-cards').innerHTML = `
        <div class="card"><div class="card__title">Mean final bankroll</div><div class="card__value">${formatCurrency(s.mean)}</div></div>
        <div class="card"><div class="card__title">Median final bankroll</div><div class="card__value">${formatCurrency(s.median)}</div></div>
        <div class="card"><div class="card__title">Min</div><div class="card__value">${formatCurrency(s.min)}</div></div>
        <div class="card"><div class="card__title">Max</div><div class="card__value">${formatCurrency(s.max)}</div></div>
        <div class="card"><div class="card__title">Std. deviation</div><div class="card__value">${formatCurrency(s.standardDeviation ?? 0)}</div></div>
    `;
    const p = s.percentiles;
    $('mc-percentile-cards').innerHTML = `
        <div class="card"><div class="card__title">5th percentile</div><div class="card__value">${formatCurrency(p.p5)}</div></div>
        <div class="card"><div class="card__title">25th percentile</div><div class="card__value">${formatCurrency(p.p25)}</div></div>
        <div class="card"><div class="card__title">50th percentile</div><div class="card__value">${formatCurrency(p.p50)}</div></div>
        <div class="card"><div class="card__title">75th percentile</div><div class="card__value">${formatCurrency(p.p75)}</div></div>
        <div class="card"><div class="card__title">95th percentile</div><div class="card__value">${formatCurrency(p.p95)}</div></div>
    `;
    const r = result.riskMetrics;
    $('mc-risk-cards').innerHTML = `
        <div class="card"><div class="card__title">P(below starting bankroll)</div><div class="card__value">${formatPct(r.probabilityBelowStart * 100)}</div></div>
        <div class="card"><div class="card__title">P(profit)</div><div class="card__value">${formatPct(r.probabilityOfProfit * 100)}</div></div>
        <div class="card"><div class="card__title">P(bankroll depleted)</div><div class="card__value">${formatPct(r.probabilityOfDepletion * 100)}</div></div>
        <div class="card"><div class="card__title">Avg. max drawdown</div><div class="card__value">${formatCurrency(r.maxDrawdown.mean)}</div></div>
        <div class="card"><div class="card__title">Worst-case max drawdown</div><div class="card__value">${formatCurrency(r.maxDrawdown.max)}</div></div>
    `;
    $('mc-ev-comparison').textContent = `Theoretical expected value: ${formatPct(result.roi.theoreticalEvPct)} per unit staked. Observed across this Monte Carlo run: ${formatPct(result.roi.overallPct)}. These should converge as the number of simulations grows — one run of any size is still a single sample from a random process.`;

    renderBarChart('chart-mc-histogram', {
        labels: result.histogram.buckets.map((b) => formatCurrency((b.rangeStart + b.rangeEnd) / 2)),
        datasets: [{ label: 'Simulations', data: result.histogram.buckets.map((b) => b.count), backgroundColor: PALETTE.accentSoft, borderColor: PALETTE.accent }],
    });

    renderLineChart('chart-mc-convergence', {
        labels: result.convergence.map((c) => c.simulationsSoFar),
        datasets: [
            { label: 'Average simulated return (%)', data: result.convergence.map((c) => c.averageReturnSoFar * 100), borderColor: PALETTE.accent, backgroundColor: PALETTE.accentSoft },
            { label: 'Theoretical EV (%)', data: result.convergence.map(() => result.roi.theoreticalEvPct), borderColor: PALETTE.text, borderDash: [6, 4], pointRadius: 0 },
        ],
    });
}

$('btn-run-montecarlo').addEventListener('click', async () => {
    const rouletteType = state.settings.rouletteType;
    const simulations = Number($('mc-simulations').value);
    const spinsPerSimulation = Number($('mc-spins').value);
    const betType = $('mc-bet-type').value;
    const betSelection = betType === BET_TYPES.STRAIGHT ? $('mc-number').value : undefined;

    $('btn-run-montecarlo').disabled = true;
    setProgress('mc', 0, simulations);
    const result = await runHeavyJob('monte-carlo-lab', 'monteCarlo', {
        rouletteType, simulations, spinsPerSimulation, betType, betSelection,
        betAmount: state.settings.betAmount, startingBankroll: state.settings.startingBankroll,
    }, (done, total) => setProgress('mc', done, total, `Running simulation ${formatInt(done)} of ${formatInt(total)}…`));
    $('btn-run-montecarlo').disabled = false;
    setProgress('mc', 1, 1);
    if (!result) return; // superseded by a newer run on this channel
    renderMonteCarloResult(result);
});

$('btn-run-mc-compare').addEventListener('click', async () => {
    const selected = [...$('mc-compare-bet-list').querySelectorAll('input[type="checkbox"]:checked')].map((el) => el.value);
    if (selected.length === 0) return;

    const rouletteType = state.settings.rouletteType;
    const simulations = Number($('mc-simulations').value);
    const spinsPerSimulation = Number($('mc-spins').value);
    const baseParams = {
        rouletteType, simulations, spinsPerSimulation,
        betAmount: state.settings.betAmount, startingBankroll: state.settings.startingBankroll,
    };

    $('btn-run-mc-compare').disabled = true;
    const results = [];
    for (const betType of selected) {
        const betSelection = betType === BET_TYPES.STRAIGHT ? '17' : undefined;
        const label = BET_TYPE_LABELS[betType] + (betType === BET_TYPES.STRAIGHT ? ' (17)' : '');
        // Sequential, not Promise.all: keeps each job well-defined as "the
        // latest" on this channel, so a fresh click cancels a stale run
        // cleanly instead of racing several in-flight worker jobs at once.
        const result = await runHeavyJob('monte-carlo-compare', 'monteCarlo', { ...baseParams, betType, betSelection });
        if (!result) { $('btn-run-mc-compare').disabled = false; return; } // superseded mid-loop
        results.push({ label, ...result });
    }
    $('btn-run-mc-compare').disabled = false;

    $('mc-compare-table-body').innerHTML = results.map((r) => `
        <tr>
            <td>${r.label}</td>
            <td>${formatCurrency(r.summary.mean)}</td>
            <td class="${r.profitLoss.median >= 0 ? 'positive' : 'negative'}">${formatCurrency(r.profitLoss.median)}</td>
            <td class="${r.roi.overallPct >= 0 ? 'positive' : 'negative'}">${formatPct(r.roi.overallPct)}</td>
            <td>${formatCurrency(r.summary.standardDeviation ?? 0)}</td>
        </tr>
    `).join('');
    $('mc-compare-results').hidden = false;
});

// ---------------------------------------------------------------------------
// Statistical Test Lab — Large Sample Generator tab
// ---------------------------------------------------------------------------

function renderLabSampleResult(result) {
    $('lab-results').hidden = false;
    const rouletteType = result.rouletteType;
    const total = result.size;
    const redPct = (result.colorCounts.red / total) * 100;
    const blackPct = (result.colorCounts.black / total) * 100;
    const greenPct = (result.colorCounts.green / total) * 100;
    const theoreticalRed = getRedOrBlackProbability(rouletteType) * 100;
    const theoreticalGreen = getGreenProbability(rouletteType) * 100;

    $('lab-summary-cards').innerHTML = `
        <div class="card"><div class="card__title">Sample size</div><div class="card__value">${formatInt(total)}</div></div>
        <div class="card"><div class="card__title">Mean</div><div class="card__value">${formatNumber(result.mean)}</div></div>
        <div class="card"><div class="card__title">Median</div><div class="card__value">${formatNumber(result.median)}</div></div>
        <div class="card"><div class="card__title">Mode</div><div class="card__value" style="font-size:1rem">${result.modes.join(', ')}</div></div>
        <div class="card"><div class="card__title text-red">Red</div><div class="card__value">${formatPct(redPct)}</div><div class="text-muted" style="font-size:0.78rem">Theoretical: ${formatPct(theoreticalRed)}</div></div>
        <div class="card"><div class="card__title">Black</div><div class="card__value">${formatPct(blackPct)}</div><div class="text-muted" style="font-size:0.78rem">Theoretical: ${formatPct(theoreticalRed)}</div></div>
        <div class="card"><div class="card__title text-green">Green</div><div class="card__value">${formatPct(greenPct)}</div><div class="text-muted" style="font-size:0.78rem">Theoretical: ${formatPct(theoreticalGreen)}</div></div>
    `;

    renderLineChart('chart-lab-convergence', {
        labels: result.checkpoints.map((c) => formatInt(c.n)),
        datasets: [
            { label: 'Red % (observed)', data: result.checkpoints.map((c) => c.redPct), borderColor: PALETTE.red, pointRadius: 0 },
            { label: 'Red % (theoretical)', data: result.checkpoints.map(() => theoreticalRed), borderColor: PALETTE.red, borderDash: [5, 4], pointRadius: 0 },
            { label: 'Green % (observed)', data: result.checkpoints.map((c) => c.greenPct), borderColor: PALETTE.green, pointRadius: 0 },
            { label: 'Green % (theoretical)', data: result.checkpoints.map(() => theoreticalGreen), borderColor: PALETTE.green, borderDash: [5, 4], pointRadius: 0 },
        ],
    });

    const pockets = getPockets(rouletteType);
    const singlePct = getSingleNumberProbability(rouletteType) * 100;
    const numberRows = pockets.map((p) => {
        const occurrences = result.numberCounts[p];
        const observedPct = (occurrences / total) * 100;
        return { result: p, occurrences, observedPct, expectedPct: singlePct, diff: observedPct - singlePct };
    });

    renderBarChart('chart-lab-numbers', {
        labels: numberRows.map((r) => r.result),
        datasets: [{ label: 'Difference from expected (pp)', data: numberRows.map((r) => r.diff), backgroundColor: PALETTE.accentSoft, borderColor: PALETTE.accent }],
    });

    const sortedByDiff = [...numberRows].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 15);
    $('lab-numbers-table-body').innerHTML = sortedByDiff.map((r) => `
        <tr>
            <td>${r.result}</td>
            <td>${r.occurrences}</td>
            <td>${formatPct(r.observedPct)}</td>
            <td>${formatPct(r.expectedPct)}</td>
            <td class="${r.diff >= 0 ? 'positive' : 'negative'}">${formatSignedPct(r.diff)}</td>
        </tr>
    `).join('');
}

$('btn-generate-lab-sample').addEventListener('click', async () => {
    const rouletteType = state.settings.rouletteType;
    const size = Number($('lab-sample-size').value);

    $('btn-generate-lab-sample').disabled = true;
    setProgress('lab', 0, size);
    const result = await runHeavyJob('stat-lab-sample', 'generateSample', { rouletteType, size }, (done, total) => setProgress('lab', done, total, `Generated ${formatInt(done)} of ${formatInt(total)}…`));
    $('btn-generate-lab-sample').disabled = false;
    setProgress('lab', 1, 1);
    if (!result) return; // superseded by a newer generation request
    renderLabSampleResult(result);
});

// ---------------------------------------------------------------------------
// Statistical Test Lab — Pattern Detector Validation tab
// ---------------------------------------------------------------------------

$('btn-run-pattern-validation').addEventListener('click', async () => {
    const datasetCount = Number($('pv-dataset-count').value);
    const roundsPerDataset = Number($('pv-rounds-per-dataset').value);
    const rouletteType = state.settings.rouletteType;

    $('btn-run-pattern-validation').disabled = true;
    setProgress('pv', 0, datasetCount);
    const report = await runHeavyJob('stat-lab-pattern-validation', 'patternValidation', { datasetCount, roundsPerDataset, rouletteType }, (done, total) => setProgress('pv', done, total, `Analyzed ${done} of ${total} dataset(s)…`));
    $('btn-run-pattern-validation').disabled = false;
    setProgress('pv', 1, 1);
    if (!report) return; // superseded by a newer run

    $('pv-results').hidden = false;
    $('pv-table-body').innerHTML = report.detectorTriggerRates.map((row) => `
        <tr>
            <td>${row.label}</td>
            <td>${formatPct(row.anyDeviationRate * 100)}</td>
            <td>${formatPct(row.moderateOrStrongerRate * 100)}</td>
            <td>${formatPct(row.strongRate * 100)}</td>
        </tr>
    `).join('');
    $('pv-interpretation').textContent = report.interpretation;
    $('pv-multiple-testing-note').textContent = report.multipleTestingNote;
});

// ---------------------------------------------------------------------------
// System Validation page
// ---------------------------------------------------------------------------

$('btn-run-validation').addEventListener('click', () => {
    const results = runSystemValidation();
    const passCount = results.filter((r) => r.status === 'PASS').length;
    $('validation-summary').textContent = `${passCount} / ${results.length} checks passed.`;
    $('validation-results').hidden = false;
    $('validation-table-body').innerHTML = results.map((r) => `
        <tr>
            <td>${r.name}</td>
            <td class="validation-status--${r.status.toLowerCase()}">${r.status}</td>
            <td class="text-muted" style="font-size:0.82rem">${r.detail}</td>
        </tr>
    `).join('');
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

function init() {
    applySettingsToForm();
    populateBetTypeGrid();
    populateStraightNumberSelect();
    populateSimBetTypeSelect();
    populateSimNumberSelect();
    populateMonteCarloBetTypeSelect();
    populateMonteCarloNumberSelect();
    buildMultiBetList();
    buildMonteCarloCompareList();
    buildAnalysisWindowButtons();

    state.wheel = createRouletteWheel($('wheel-container'), state.settings.rouletteType);

    renderDashboard();
    renderResultPanel(null);
    renderRecentResults();

    showPage('roulette');

    // Tells the file://-detection fallback script in index.html that the
    // module graph actually loaded and ran (see the inline <script> in <head>).
    window.__ROULETTE_APP_READY__ = true;
}

init();
