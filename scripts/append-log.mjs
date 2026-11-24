import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODEL_COLUMNS = [
  'Date', 'Prompt ID', 'Stage', 'Surface', 'Model', 'Reasoning effort',
  'Why this model and effort', 'Outcome and reason', 'PR or commit link',
];
const MISTAKE_COLUMNS = ['What', 'How caught', 'Fix link'];
const LOGS = {
  model: { columns: MODEL_COLUMNS, filename: 'model-log.md', toRow: modelRow },
  mistake: { columns: MISTAKE_COLUMNS, filename: 'mistakes-caught.md', toRow: mistakeRow },
};
const STAGES = ['UNDERSTAND', 'PLAN', 'BUILD', 'TEST', 'DEBUG', 'REVIEW', 'SHIP', 'AUTOMATE'];
const SURFACES = ['CLI', 'IDE', 'Cloud', 'App', 'GitHub', 'Action', 'Scheduled'];
const EFFORTS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
const OUTCOMES = ['accepted', 'revised', 'rejected'];
const DETECTION_METHODS = ['test', 'review', 'property test', 'human'];
const MIN_SEPARATOR_WIDTH = 3;

export function appendLog({ kind, entry, path }) {
  const log = getLog(kind);
  const row = log.toRow(entry).map(escapeCell);
  const destination = path ?? fileURLToPath(new URL('../docs/evidence/' + log.filename, import.meta.url));
  const lock = destination + '.lock';
  mkdirSync(lock);
  try {
    const rows = readRows(readFileSync(destination, 'utf8'), log.columns);
    const temporary = join(lock, log.filename);
    writeFileSync(temporary, formatTable({ kind, rows: [...rows, row] }));
    renameSync(temporary, destination);
  } finally {
    rmSync(lock, { recursive: true });
  }
}

export function formatTable({ kind, rows }) {
  const { columns } = getLog(kind);
  const widths = columns.map((column, index) => rows.reduce(
    (width, row) => Math.max(width, row[index].length),
    Math.max(column.length, MIN_SEPARATOR_WIDTH),
  ));
  const render = (row) => '| ' + row.map((cell, index) => cell.padEnd(widths[index])).join(' | ') + ' |';
  const separator = widths.map((width) => '-'.repeat(width));
  return [columns, separator, ...rows].map(render).join('\n') + '\n';
}

function getLog(kind) {
  if (!Object.hasOwn(LOGS, kind)) throw new Error('Log kind must be model or mistake.');
  return LOGS[kind];
}

function readRows(markdown, columns) {
  const lines = markdown.trimEnd().split(/\r?\n/);
  const [header, separator, ...rows] = lines.map((line) => readRow(line, columns.length));
  if (header.some((cell, index) => cell !== columns[index]) ||
      !separator?.every((cell) => /^-{3,}$/.test(cell))) {
    throw new Error('Unexpected evidence table header.');
  }
  return rows;
}

function readRow(line, columnCount) {
  if (!line.startsWith('|') || !line.endsWith('|')) throw new Error('Expected a Markdown table row.');
  const cells = line.slice(1, -1).split(/(?<!\\)\|/u).map((cell) => cell.trim());
  if (cells.length !== columnCount) throw new Error('Unexpected evidence table column count.');
  return cells;
}

function escapeCell(value) {
  return value
    .replaceAll('\\', '&#92;')
    .replaceAll('|', '\\|');
}

function modelRow(entry) {
  const { date, promptId, stage, surface, model, effort, rationale, outcome, reason, link } =
    validateFields(entry, [
      'date', 'promptId', 'stage', 'surface', 'model', 'effort', 'rationale', 'outcome', 'reason', 'link',
    ]);
  validateDate(date);
  validateChoice('stage', stage, STAGES);
  validateChoice('surface', surface, SURFACES);
  validateIdentifier('promptId', promptId);
  validateIdentifier('model', model);
  validateChoice('effort', effort, EFFORTS);
  validateChoice('outcome', outcome, OUTCOMES);
  validateLink('link', link);
  return [date, promptId, stage, surface, model, effort, rationale, outcome + ' · ' + reason, link];
}

function mistakeRow(entry) {
  const { what, caughtBy, fixLink } = validateFields(entry, ['what', 'caughtBy', 'fixLink']);
  validateChoice('caughtBy', caughtBy, DETECTION_METHODS);
  validateLink('fixLink', fixLink);
  return [what, caughtBy, fixLink];
}

function validateFields(entry, fields) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error('Expected a JSON object.');
  }
  if (Object.keys(entry).some((field) => !fields.includes(field))) {
    throw new Error('Unexpected entry field.');
  }
  return Object.fromEntries(fields.map((field) => [field, requireText(entry[field], field)]));
}

function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim() || /[\p{Cc}\u2028\u2029]/u.test(value)) {
    throw new Error(field + ' must be nonempty text on one line.');
  }
  return value.trim();
}

function validateDate(date) {
  const timestamp = Date.parse(date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString().slice(0, date.length) !== date) {
    throw new Error('date must be a calendar date in YYYY-MM-DD format.');
  }
}

function validateIdentifier(field, value) {
  if (!/^[a-z\d][a-z\d._/-]*$/i.test(value)) {
    throw new Error(field + ' must be an identifier.');
  }
}

function validateChoice(field, value, allowed) {
  if (!allowed.includes(value)) throw new Error(field + ' must be one of ' + allowed.join(', ') + '.');
}

function validateLink(field, value) {
  if (value === 'TODO') return;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(field + ' must be an HTTP(S) link or TODO.');
  }
  if (!/^https?:\/\/[^\s]+$/i.test(value) || url.username || url.password) {
    throw new Error(field + ' must be an HTTP(S) link without credentials or TODO.');
  }
}

function run() {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node scripts/append-log.mjs model|mistake < entry.json');
    const kind = process.argv[2];
    getLog(kind);
    const entry = JSON.parse(readFileSync(0, 'utf8'));
    appendLog({ kind, entry });
    console.log('Appended one ' + kind + ' evidence row.');
  } catch (error) {
    const message = error instanceof SyntaxError ? 'Expected valid JSON on stdin.' : error.message;
    console.error(message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
