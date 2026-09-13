// CSV import/export. Building/parsing CSV text is pure and unit-testable;
// only triggerDownload/readFileAsText touch the DOM/File APIs (spec §21-22).

import { describeResult, isValidResult } from './roulette.js';

const CSV_COLUMNS = ['roundNumber', 'result', 'color', 'parity', 'range', 'dozen', 'column', 'timestamp'];
const MAX_IMPORT_RECORDS = 1000;

export function escapeCsvField(value) {
    const str = value === null || value === undefined ? '' : String(value);
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/** Builds CSV text from an array of round records. */
export function buildCsv(rounds) {
    const header = CSV_COLUMNS.join(',');
    const rows = rounds.map((round) => CSV_COLUMNS.map((col) => escapeCsvField(round[col])).join(','));
    return [header, ...rows].join('\n');
}

/** Minimal RFC4180-ish CSV line splitter supporting quoted fields. */
function parseCsvLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (inQuotes) {
            if (char === '"') {
                if (line[i + 1] === '"') {
                    current += '"';
                    i += 1;
                } else {
                    inQuotes = false;
                }
            } else {
                current += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === ',') {
            fields.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    fields.push(current);
    return fields;
}

/**
 * Parses CSV text into validated round records for a given roulette type.
 * Invalid rows are skipped (not thrown) so a partially malformed file can
 * still yield a usable import (spec §22).
 * @returns {{records: object[], errors: string[], truncated: boolean}}
 */
export function parseCsv(text, rouletteType) {
    const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
        return { records: [], errors: ['File is empty'], truncated: false };
    }

    const header = parseCsvLine(lines[0]).map((h) => h.trim());
    const requiredColumns = ['result'];
    const missing = requiredColumns.filter((c) => !header.includes(c));
    if (missing.length > 0) {
        return { records: [], errors: [`Missing required column(s): ${missing.join(', ')}`], truncated: false };
    }

    const records = [];
    const errors = [];
    const dataLines = lines.slice(1);
    const truncated = dataLines.length > MAX_IMPORT_RECORDS;

    for (const [i, line] of dataLines.entries()) {
        if (records.length >= MAX_IMPORT_RECORDS) break;

        const fields = parseCsvLine(line);
        const row = Object.fromEntries(header.map((col, idx) => [col, fields[idx]]));
        const result = (row.result ?? '').trim();

        if (!result) {
            errors.push(`Row ${i + 2}: missing result`);
            continue;
        }
        if (!isValidResult(result, rouletteType)) {
            errors.push(`Row ${i + 2}: "${result}" is not a valid ${rouletteType} pocket`);
            continue;
        }
        if (row.timestamp && Number.isNaN(Date.parse(row.timestamp))) {
            errors.push(`Row ${i + 2}: invalid timestamp`);
            continue;
        }

        const derived = describeResult(result);
        records.push({
            roundNumber: Number.isFinite(Number(row.roundNumber)) ? Number(row.roundNumber) : records.length + 1,
            ...derived,
            timestamp: row.timestamp && !Number.isNaN(Date.parse(row.timestamp)) ? row.timestamp : new Date().toISOString(),
        });
    }

    return { records, errors, truncated };
}

/** Triggers a browser download of arbitrary text content. Not testable in Node — DOM only. */
export function triggerTextDownload(text, filename, mimeType) {
    const blob = new Blob([text], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/** Triggers a browser download of CSV text. Not testable in Node — DOM only. */
export function triggerCsvDownload(csvText, filename = 'roulette-history.csv') {
    triggerTextDownload(csvText, filename, 'text/csv');
}

/** Reads a File/Blob as text via FileReader, wrapped in a Promise. */
export function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}
