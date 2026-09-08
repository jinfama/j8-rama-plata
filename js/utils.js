// ════════════════════════════════════════════════════════════════
//  MINERVA · utils — design tokens, colour scales, formatters, icons
// ════════════════════════════════════════════════════════════════

/* ── Data ramps — revised 2026-09-06 (see CLAUDE.md, "Escalas de mapa") ─────
   Built on an even CIELAB lightness ladder (L* 86 → 18, steps of 8.4–8.6 ΔL*)
   inside the gamut of the approved cover V5_mancha-de-aceite: its oil stain is
   rgb(150,106,20) (L*48 h78) and its grove is #4F7A2A / #3C4A1C / #28311D, so
   the ramp walks parchment → oil → grove without ever entering the amphora
   accent --terra #B05620 (closest approach dE2000 = 20.9, so a datum can never
   be read as a button). Neighbouring stops are ≥ 6.8 dE2000 apart under normal
   vision, deuteranopia AND protanopia. Do not hand-edit a stop: the ladder is
   what makes the map discriminate. */
// Sequential: parchment → oil-gold → olive → deep grove
export const SEQ_COLORS = [
  '#E3D7B2', '#D8BD81', '#CBA357', '#B88B38',
  '#957A29', '#6D6A24', '#4D5822', '#38441F', '#26301A'
];
/* Diverging: oil-gold (deficit) → parchment → Aegean (surplus). No user in the
   code today; kept correct so the next one does not inherit a broken axis.
   The old terracotta↔olive pair was a red/green axis and collapsed to 5 of its
   7 steps under deuteranopia. Gold↔Aegean keeps all 7 under both, and the warm
   arm sits on the oil hue (h≈80), not on the amphora hue of --terra (h≈54):
   closest approach to the accent goes from 3,0 to 17,5 dE2000. */
export const DIV_COLORS = [
  '#5B430F', '#967120', '#C5AE7A', '#E4DFD2',
  '#85B8CD', '#0080AC', '#054C6C'
];
/* Aegean sequential (trade): the sea, not the grove. Same lightness ladder,
   hue 214°→274°, muted toward the cover's own sea rgb(124,150,137). */
export const AEGEAN_COLORS = [
  '#BDD6DB', '#98C2CD', '#73ADC1', '#5098B4',
  '#2B83A7', '#196C94', '#15577D', '#164265', '#152E4B'
];

const NF = new Intl.NumberFormat('es-ES');
const NF1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

export function fmt(v) {
  if (v == null || isNaN(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return NF1.format(v / 1e9) + ' MM';
  if (a >= 1e6) return NF1.format(v / 1e6) + ' M';
  if (a >= 1e3) return NF1.format(v / 1e3) + ' mil';
  if (a >= 1) return NF.format(Math.round(v));
  return NF1.format(v);
}
export function fmtFull(v) { return v == null || isNaN(v) ? '—' : NF.format(Math.round(v)); }
export function fmtUnit(v, unit) {
  if (v == null || isNaN(v)) return '—';
  return fmt(v) + (unit ? ' ' + unit : '');
}
// year → historical label (BCE/CE)
export function fmtYear(y) {
  if (y == null) return '—';
  if (y < 0) return `${Math.abs(y).toLocaleString('es-ES')} a.C.`;
  if (y === 0) return '0';
  return `${y.toLocaleString('es-ES')} d.C.`;
}

/* Sequential scale over a whole indicator (every territory, every year, so the
   colour of a place means the same thing at every stop of the timeline).

   `type` defaults to 'log' since 2026-09-06. The old default was a power scale
   with exponent 0.42, and on these distributions it wasted the ramp: measured
   over all the units painted on the map, pow gave 74 perceptually separable
   tones across eleven indicator×year cases and log gives 110 (worst case, the
   provincial yield of 2000, went from 2 tones to 5). The pill in the toolbar
   still offers the power scale; what changed is which one you land on.

   The scale also hands the legend everything it needs to tell the truth:
   `at(t)` is the colour at ramp position t (so the legend bar is the ramp, not
   an approximation of it), `norm(v)` where a value sits on the bar, and `inv(t)`
   the value at a position. `min` is the FOOT OF THE PAINTED RAMP, not the raw
   data minimum: under log everything below max/1e5 is clamped, and the legend
   used to print a left-hand number the map never used. */
export function seqScale(vals, { type = 'log', colors = SEQ_COLORS } = {}) {
  const nums = vals.filter(v => v != null && !isNaN(v) && v > 0);
  const interp = d3.interpolateRgbBasis(colors);
  const at = t => interp(t < 0 ? 0 : t > 1 ? 1 : t);
  if (!nums.length) {
    return { fn: () => colors[1], at, norm: () => 0, inv: () => 0, min: 0, max: 0, interp, type };
  }
  let min = d3.min(nums), max = d3.max(nums);
  if (min === max) min = min > 0 ? min / 10 : 0;
  let norm, inv;
  if (type === 'log') {
    const lo = Math.max(min, max / 1e5) || 1;
    const s = d3.scaleLog().domain([lo, max]).range([0, 1]).clamp(true);
    norm = v => s(Math.max(lo, v)); inv = t => s.invert(t); min = lo;
  } else {
    const s = d3.scalePow().exponent(0.42).domain([min, max]).range([0, 1]).clamp(true);
    norm = v => s(v); inv = t => s.invert(t);
  }
  return { fn: v => (v == null || isNaN(v)) ? null : interp(norm(v)), at, norm, inv, min, max, interp, type };
}
export function divScale(vals, colors = DIV_COLORS) {
  const nums = vals.filter(v => v != null && !isNaN(v));
  const interp = d3.interpolateRgbBasis(colors);
  const absMax = d3.max(nums, v => Math.abs(v)) || 1;
  const s = d3.scaleLinear().domain([-absMax, 0, absMax]).range([0, 0.5, 1]).clamp(true);
  return { fn: v => (v == null || isNaN(v)) ? null : interp(s(v)), at: t => interp(t), min: -absMax, max: absMax, interp };
}

/* Ticks for a legend that has to sit ON the ramp, at the place the map really
   puts each value. Rounded to one significant digit so the labels are readable;
   the position is then recomputed from the rounded number, never from the
   un-rounded one, or the tick would point at a colour it does not name. */
function oneSig(v) {
  if (!(v > 0)) return 0;
  const e = Math.floor(Math.log10(v));
  return Math.round(v / Math.pow(10, e)) * Math.pow(10, e);
}
export function scaleTicks(sc, k = 3) {
  if (!(sc.max > 0) || !(sc.max > sc.min)) return [];
  const out = [];
  if (sc.type === 'log') {
    const lo = Math.log10(sc.min), hi = Math.log10(sc.max);
    let step = Math.max(1, Math.ceil((hi - lo) / (k + 1)));
    for (let e = Math.ceil(lo); e <= Math.floor(hi); e += step) out.push(Math.pow(10, e));
  } else {
    for (let i = 1; i <= k; i++) out.push(oneSig(sc.inv(i / (k + 1))));
  }
  const seen = new Set(), ticks = [];
  for (const v of out) {
    const t = sc.norm(v);
    if (v <= sc.min || v >= sc.max || t < 0.08 || t > 0.92) continue;
    const key = v.toPrecision(3);
    if (seen.has(key)) continue;
    if (ticks.length && Math.abs(t - ticks[ticks.length - 1].t) < 0.13) continue;
    seen.add(key); ticks.push({ v, t });
  }
  return ticks;
}

// normalise a country/region name for matching
export function norm(s) {
  return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/* ── The three things on a choropleth that are NOT values ──────────────────
   Warm = a measurement; neutral grey = not a measurement. That is the whole
   rule, and it is a hue rule so it survives colour blindness.
   Before 2026-09-06 the three of them were warm parchments a couple of dE
   apart: "cero" and the foot of the ramp were 2.11 dE2000 from each other (a
   municipality with no olive looked exactly like the one with the least olive),
   and "sin dato" was 3.4 dE from the inert land. Now every pair is ≥ 5 dE:
   cero↔pie de rampa 5.1 · cero↔papel 8.2 · tierra↔sin dato 7.7 ·
   tierra↔pie de rampa 5.6 · sin dato↔pie de rampa 10.4 · tierra↔papel 7.7.
   The inert land stays WARM on purpose — it is most of the world map and the
   cover is parchment; it is the pale tan closest to the cover's own land
   rgb(216,199,160) that still clears 5 dE from the foot of the ramp. */
export const ZERO_COL = '#F7EEC8';  // measured, and there is no olive: pale parchment, the foot of the family
export const NODATA = '#BEBBB2';    // in the dataset, no value this year: neutral grey, off the value axis
export const LAND_BG = '#DCD0BB';   // land outside the dataset: pale warm tan, recedes under the data
export const LAND_STROKE = 'rgba(120,96,54,0.28)';

// view icons (stroked SVG paths, 24-box)
export const ICONS = {
  atlas: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  evidence: '<path d="M12 3l2.2 5.2L20 9l-4 3.8L17 19l-5-3-5 3 1-6.2L4 9l5.8-.8z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  trend: '<path d="M3 17l5-6 4 3 6-9M20 5v5M20 5h-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  bilateral: '<path d="M4 8h11M12 5l4 3-4 3M20 16H9M12 13l-4 3 4 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 11v6M12 7.6h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
  pause: '<path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor"/>',
};

// olive-branch flourish (used as hairline ornament)
export const OLIVE_BRANCH = `<svg viewBox="0 0 120 24" class="olive-branch" aria-hidden="true">
  <path d="M4 12h112" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
  <g fill="currentColor">
    <ellipse cx="60" cy="12" rx="3" ry="4.4"/>
    <path d="M48 12c-4-5-11-5-15-2 4 4 11 4 15 2zM72 12c4-5 11-5 15-2-4 4-11 4-15 2zM40 9c-3-4-9-4-13-1 4 3 10 3 13 1zM80 15c3-4 9-4 13-1-4 3-10 3-13 1z" opacity="0.85"/>
  </g></svg>`;

export function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/* ── Cobertura por año ───────────────────────────────────────────────────────
   El primer año del dominio suele ser simbólico: en 1961 solo 5 de las 249
   regiones del mundo tienen superficie de olivar, y en 1580 solo 1 de los 785
   municipios andaluces. Al abrir una vista en ese año el mapa salía en blanco.
   coverageByYear cuenta cuántos territorios tienen dato en cada año y
   firstCoveredYear devuelve el primero que llega a la cuarta parte del máximo
   (con un suelo de 3 territorios), que es el primero que se ve como un mapa. */
export const COVERAGE_FRACTION = 0.25;
export const COVERAGE_MIN = 3;

export function coverageByYear(rows, indicator, nYears) {
  const counts = new Array(nYears).fill(0);
  for (const row of rows) {
    const arr = row[indicator];
    if (!arr) continue;
    for (let i = 0; i < arr.length && i < nYears; i++) if (arr[i] != null) counts[i]++;
  }
  return counts;
}

export function coverageThreshold(counts) {
  const max = counts.length ? Math.max(...counts) : 0;
  return max ? Math.max(COVERAGE_MIN, max * COVERAGE_FRACTION) : 0;
}

export function firstCoveredYear(years, counts) {
  const need = coverageThreshold(counts);
  if (!need) return years[0];
  const i = counts.findIndex(c => c >= need);
  return i < 0 ? years[0] : years[i];
}
