// Thin wrapper around Chart.js: keeps one Chart instance per canvas id and
// destroys/recreates instead of leaking (spec §37, §62).

const instances = new Map();

const PALETTE = {
    red: '#c0392b',
    black: '#2c2c2c',
    green: '#1e8a4c',
    accent: '#d4af37',
    accentSoft: 'rgba(212, 175, 55, 0.35)',
    grid: 'rgba(255, 255, 255, 0.08)',
    text: '#e8e6e1',
};

function getChartLib() {
    if (typeof globalThis.Chart === 'undefined') {
        throw new Error('Chart.js is not loaded');
    }
    return globalThis.Chart;
}

function renderChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const existing = instances.get(canvasId);
    if (existing) {
        existing.destroy();
        instances.delete(canvasId);
    }

    const Chart = getChartLib();
    const chart = new Chart(canvas, config);
    instances.set(canvasId, chart);
    return chart;
}

function destroyChart(canvasId) {
    const existing = instances.get(canvasId);
    if (existing) {
        existing.destroy();
        instances.delete(canvasId);
    }
}

function destroyAll() {
    for (const chart of instances.values()) chart.destroy();
    instances.clear();
}

const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { labels: { color: PALETTE.text } },
    },
    scales: {
        x: { ticks: { color: PALETTE.text }, grid: { color: PALETTE.grid } },
        y: { ticks: { color: PALETTE.text }, grid: { color: PALETTE.grid } },
    },
};

function renderBarChart(canvasId, { labels, datasets }, extraOptions = {}) {
    return renderChart(canvasId, {
        type: 'bar',
        data: { labels, datasets },
        options: { ...baseOptions, ...extraOptions },
    });
}

function renderLineChart(canvasId, { labels, datasets }, extraOptions = {}) {
    return renderChart(canvasId, {
        type: 'line',
        data: { labels, datasets },
        options: { ...baseOptions, elements: { point: { radius: 0 } }, ...extraOptions },
    });
}

function renderDoughnutChart(canvasId, { labels, data, colors }) {
    return renderChart(canvasId, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: PALETTE.text } } },
        },
    });
}

export { PALETTE, renderBarChart, renderLineChart, renderDoughnutChart, destroyChart, destroyAll };
