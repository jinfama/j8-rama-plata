// Permalink: the visible state travels in the URL and is restored on load.
//
// Without it, an olive figure of this atlas could not be cited in a paper nor
// reopened in class: a reload always dropped the reader back on the cover with
// the world map of the default year. Only values that differ from the defaults
// are written, so the plain entry URL stays clean.

import { State } from './state.js?v=20260908b';

// Snapshot taken at import time, before any view can touch the state.
const DEFAULTS = { ...State.all() };

const VIEWS = ['atlas', 'evidence', 'trend', 'bilateral'];
const EV_TABS = ['mapa', 'st', 'tipo', 'qa'];

// Closed vocabularies: every field the interface offers as pills or tabs.
// A hand-edited URL that carries anything else is not an error to shout
// about, it is simply ignored, and the field keeps its default value.
// Vocabularies that depend on the payload (ind, tind, item, terr) cannot
// be checked here -- the data is not loaded yet -- so the view normalises
// them when it builds its controls.
const ATLAS_SCALES = ['world', 'es_prov', 'and_muni'];   // SCALES in views/atlas.js
const RANK_MODES = ['total', 'rel'];
const BI_DIRS = ['export', 'import'];
const BI_METRICS = ['v', 'w'];                           // MET in views/bilateral.js

const FIELDS = [
  { key: 'view',       param: 'v',     type: 'string', allow: VIEWS },
  { key: 'atlasScale', param: 'scale', type: 'string', allow: ATLAS_SCALES },
  { key: 'atlasInd',   param: 'ind',   type: 'string' },   // validado en views/atlas.js
  { key: 'rankMode',   param: 'rank',  type: 'string', allow: RANK_MODES },
  { key: 'trendInd',   param: 'tind',  type: 'string' },   // validado en views/trend.js
  { key: 'biItem',     param: 'item',  type: 'string' },   // validado en views/bilateral.js
  { key: 'biExporter', param: 'terr',  type: 'string' },   // validado en views/bilateral.js
  { key: 'biDir',      param: 'dir',   type: 'string', allow: BI_DIRS },
  { key: 'biMetric',   param: 'met',   type: 'string', allow: BI_METRICS },
  { key: 'scaleType',  param: 'st',    type: 'string', allow: ['pow', 'log'] },
  { key: 'evTab',      param: 'ev',    type: 'string', allow: EV_TABS },
  { key: 'evRange',    param: 'evr',   type: 'range' },
  { key: 'year',       param: 'year',  type: 'number' },
];

function same(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => v === b[i]);
  return a === b;
}

function encode(field, value) {
  if (field.type === 'range') return (value || []).join('~');
  return String(value);
}

function decode(field, raw) {
  if (field.type === 'range') {
    const parts = raw.split('~').map(Number);
    if (parts.length !== 2 || parts.some(n => !Number.isFinite(n))) return null;
    return [Math.min(...parts), Math.max(...parts)];
  }
  if (field.type === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return raw;
}

// Reads the URL and returns { patch, year } or null. A hand-edited URL must
// never be able to push a value the app cannot render, so anything with a
// declared vocabulary is validated against it.
export function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  if (![...params.keys()].length) return null;
  const patch = {};
  let year = null;
  for (const field of FIELDS) {
    if (!params.has(field.param)) continue;
    const value = decode(field, params.get(field.param));
    if (value == null || value === '') continue;
    if (field.allow && !field.allow.includes(value)) continue;
    if (field.key === 'year') { year = value; continue; }
    patch[field.key] = value;
  }
  if (!Object.keys(patch).length && year == null) return null;
  return { patch, year };
}

let _pending = false;

function writeUrl() {
  _pending = false;
  const params = new URLSearchParams();
  for (const field of FIELDS) {
    const value = State.get(field.key);
    if (value == null) continue;
    if (Array.isArray(value) && !value.length) continue;
    if (same(value, DEFAULTS[field.key])) continue;
    params.set(field.param, encode(field, value));
  }
  const query = params.toString();
  window.history.replaceState(null, '', query
    ? `${window.location.pathname}?${query}`
    : window.location.pathname);
}

function schedule() {
  if (_pending) return;
  _pending = true;
  window.setTimeout(writeUrl, 80);
}

// Starts mirroring the state into the address bar. Call once the app is up.
export function startPermalink() {
  FIELDS.forEach(f => State.subscribe(f.key, schedule));
  writeUrl();
}

// Back to square one: every field the permalink knows about returns to its
// boot value, and the address bar is cleared with it.
export function resetToDefaults() {
  const patch = {};
  for (const f of FIELDS) {
    const value = DEFAULTS[f.key];
    patch[f.key] = Array.isArray(value) ? [...value] : value;
  }
  patch.selected = null;
  State.patch(patch);
  window.history.replaceState(null, '', window.location.pathname);
  return DEFAULTS.view || 'atlas';
}

// "Copiar enlace" for the current view; falls back to a prompt where the
// clipboard API is unavailable (http on a phone, for instance).
export async function copyPermalink() {
  writeUrl();
  try {
    await navigator.clipboard.writeText(window.location.href);
    return true;
  } catch (_) {
    window.prompt('Copia el enlace:', window.location.href);
    return false;
  }
}
