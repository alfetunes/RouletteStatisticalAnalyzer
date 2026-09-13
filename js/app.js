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
import { buildCsv, parseCsv, triggerCsvDownload, readFileAsText } from './export.js';
import { renderBarChart, renderLineChart, renderDoughnutChart, PALETTE } from './charts.js';
import { createRouletteWheel } from './roulette-animation.js';

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
    analyzerTab: 'history',
    analysisWindow: 100,
    historyFilters: {},
    historySort: { field: 'round', direction: 'desc' },
    historyPage: 1,
    simTab: 'single',
    explorerSample: null,
    compareSamples: null,
    wheel: null,
    spinning: false,
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

function renderAnalyzerTab(tab) {
    ['history', 'explorer', 'compare'].forEach((name) => {
        $(`analyzer-tab-${name}`).hidden = name !== tab;
    });
    if (tab === 'history') renderAnalyzerHistory();
}

function renderSimTab(tab) {
    $('sim-tab-single').hidden = tab !== 'single';
    $('sim-tab-multi').hidden = tab !== 'multi';
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
    state.bet.type = betType;
    state.bet.selection = betType === BET_TYPES.STRAIGHT ? ($('straight-number').value || '0') : null;
    document.querySelectorAll('#bet-type-grid .bet-type-btn').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.dataset.betType === betType));
    });
    $('straight-number-row').hidden = betType !== BET_TYPES.STRAIGHT;
    $('bet-message').textContent = '';
}

function clearBet() {
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

$('btn-spin').addEventListener('click', () => {
    if (state.spinning) return;

    if (state.bet.type === BET_TYPES.STRAIGHT && !state.bet.selection) {
        $('bet-message').textContent = 'Select a number for your straight bet.';
        return;
    }
    if (state.bet.type && state.settings.betAmount > state.bankroll) {
        $('bet-message').textContent = 'Bet amount exceeds available bankroll.';
        return;
    }

    state.spinning = true;
    $('btn-spin').disabled = true;
    $('bet-message').textContent = '';

    const result = generateRandomResult(state.settings.rouletteType);

    state.wheel.spinToResult(result, () => {
        completeSpin(result);
        state.spinning = false;
        $('btn-spin').disabled = false;
    });
});

function completeSpin(result) {
    const roundNumber = state.history.size() + 1;
    let betInfo = {};

    if (state.bet.type) {
        const betAmount = state.settings.betAmount;
        const payout = getBetPayout(state.bet.type);
        const won = evaluateBet(result, state.bet.type, state.bet.selection);
        const profit = won ? betAmount * payout : -betAmount;
        state.bankroll += profit;
        betInfo = {
            betType: state.bet.type,
            betSelection: state.bet.selection ?? null,
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
// Init
// ---------------------------------------------------------------------------

function init() {
    applySettingsToForm();
    populateBetTypeGrid();
    populateStraightNumberSelect();
    populateSimBetTypeSelect();
    populateSimNumberSelect();
    buildMultiBetList();
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
