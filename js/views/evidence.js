// ════════ Evidencia arqueológica — olivar 02_evidence ════════
// Four sub-tabs: map · region × period · type × region · sources & QA.
import { State } from '../state.js?v=20260906m';
import Data from '../data-loader.js?v=20260906m';
import { ICONS, fmtYear, SEQ_COLORS } from '../utils.js?v=20260906m';
import { mapSetup, sizeOf, fitProjection, observeResize, noAntarctica } from '../mapkit.js?v=20260906m';
import { showTip, hideTip } from '../tip.js?v=20260906m';

let E, G, SVG, ZOOM, GEO, TYPES, PROJ;
let ACTIVE = null;              // Set of active types (module-level — NOT in State: Set breaks JSON diff)
let AGG = null;                 // corpus-wide aggregates (unfiltered), built once
let TAB = State.get('evTab') || 'mapa';   // mapa | st | tipo | qa (mirrored in the permalink)
let ST_MODE = 'n';              // n | pct   (matrix región × periodo)
let TR_MODE = 'n';              // n | pct   (matrix tipo × región)
let SRC_SORT = 'n';             // n | tag | trace
let SRC_Q = '';                 // search box
const GALLERY_CAP = 140;
const PERIODS = [
  ['Todo', -12000, 2026], ['Prehistoria', -12000, -1200], ['Bronce–Hierro', -3000, -800],
  ['Grecia', -900, -146], ['Roma', -146, 476], ['Medieval', 476, 1492], ['Moderno', 1492, 2026],
];
const SUBTABS = [
  ['mapa', 'Mapa'], ['st', 'Espacio × Tiempo'], ['tipo', 'Tipo × Región'], ['qa', 'Fuentes / QA'],
];

// ── canonical period buckets (ported from olivar/figures/_code/build_coverage_atlas.py) ──
const PBUCKETS = ['prehistoric', 'bronze_age', 'iron_age', 'classical', 'roman',
  'late_antique', 'islamic', 'medieval', 'early_modern', 'modern', 'unknown'];
const PLABEL = {
  prehistoric: 'Prehist.', bronze_age: 'Bronce', iron_age: 'Hierro', classical: 'Clásico',
  roman: 'Romano', late_antique: 'Tardoant.', islamic: 'Islámico', medieval: 'Medieval',
  early_modern: 'E. Moderna', modern: 'Moderno', unknown: 'Sin clasif.',
};
const PLONG = {
  prehistoric: 'Prehistoria', bronze_age: 'Edad del Bronce', iron_age: 'Edad del Hierro',
  classical: 'Época clásica', roman: 'Época romana', late_antique: 'Antigüedad tardía',
  islamic: 'Islámico', medieval: 'Medieval', early_modern: 'Edad Moderna',
  modern: 'Contemporáneo', unknown: 'Periodo sin clasificar',
};
const PMAP = {
  early_medieval: 'medieval', high_medieval: 'medieval', late_medieval: 'medieval',
  colonial: 'early_modern',
};
function canonPeriod(raw) {
  if (!raw) return 'unknown';
  const low = String(raw).trim().toLowerCase().replace(/\s+/g, '_');
  if (PMAP[low]) return PMAP[low];
  return PBUCKETS.includes(low) ? low : 'unknown';
}

// ── macro-regions from ISO3 (same buckets as the coverage atlas, extended) ──
const ISO3_MACRO = {
  ESP: 'Iberia', PRT: 'Iberia', AND: 'Iberia', GIB: 'Iberia',
  ITA: 'Italia', MLT: 'Italia', SMR: 'Italia', VAT: 'Italia',
  FRA: 'Francia', MCO: 'Francia',
  GRC: 'Egeo-Anatolia', CYP: 'Egeo-Anatolia', TUR: 'Egeo-Anatolia',
  HRV: 'Balcanes', SVN: 'Balcanes', MNE: 'Balcanes', ALB: 'Balcanes', MKD: 'Balcanes',
  BIH: 'Balcanes', SRB: 'Balcanes', BGR: 'Balcanes', ROU: 'Balcanes', XKX: 'Balcanes',
  ISR: 'Levante', PSE: 'Levante', LBN: 'Levante', SYR: 'Levante', JOR: 'Levante', IRQ: 'Levante',
  MAR: 'Magreb-Egipto', DZA: 'Magreb-Egipto', TUN: 'Magreb-Egipto', LBY: 'Magreb-Egipto', EGY: 'Magreb-Egipto',
  USA: 'América', CAN: 'América', PER: 'América', CHL: 'América', ARG: 'América',
  MEX: 'América', BRA: 'América', URY: 'América', ECU: 'América', SLV: 'América',
  DEU: 'Europa atl. y central', GBR: 'Europa atl. y central', CHE: 'Europa atl. y central',
  BEL: 'Europa atl. y central', NLD: 'Europa atl. y central', AUT: 'Europa atl. y central',
  POL: 'Europa atl. y central', SWE: 'Europa atl. y central', LUX: 'Europa atl. y central',
  UKR: 'Europa atl. y central', HUN: 'Europa atl. y central', SVK: 'Europa atl. y central',
  CZE: 'Europa atl. y central', DNK: 'Europa atl. y central', IRL: 'Europa atl. y central',
  NOR: 'Europa atl. y central', FIN: 'Europa atl. y central', RUS: 'Europa atl. y central',
  EST: 'Europa atl. y central', LVA: 'Europa atl. y central', LTU: 'Europa atl. y central',
  BLR: 'Europa atl. y central', MDA: 'Europa atl. y central',
};
const MACROS = ['Iberia', 'Italia', 'Francia', 'Egeo-Anatolia', 'Balcanes', 'Levante',
  'Magreb-Egipto', 'Europa atl. y central', 'América', 'Otros', 'Sin país'];
const MSHORT = {
  'Egeo-Anatolia': 'Egeo-Anat.', 'Magreb-Egipto': 'Magreb-Eg.',
  'Europa atl. y central': 'Eur. atl.',
};
function macroOf(c) { return !c ? 'Sin país' : (ISO3_MACRO[c] || 'Otros'); }

/* Las matrices de recuento usan LA MISMA rampa que los coropletos (2026-09-06):
   una sola familia para "cantidad" en todo el visor. La rampa anterior
   (pergamino → oro → terracota → vino) pasaba a 3,4 dE2000 del acento de
   interacción --terra #B05620, o sea que había celdas de dato pintadas del color
   de un botón; la de ahora se queda a 20,9 dE.
   La tinta de la cifra cambia de oscura a crema en t = 0,45, el punto donde las
   dos curvas de contraste se cruzan: el mínimo a lo largo de la rampa sube de
   2,52:1 a 3,55:1. Como 3,55 sigue por debajo del 4,5:1 de la WCAG para un
   cuerpo de 10,5 px, la cifra lleva además un halo del color contrario
   (.mx-val en styles.css), que es lo que la separa del fondo de la celda. */
const RAMP = SEQ_COLORS;
const cScale = d3.scaleSequential(d3.interpolateRgbBasis(RAMP));
const CELL_INK_T = 0.45;
function cellFill(v, max) { return v ? cScale(Math.sqrt(v / max)) : 'var(--cream-2)'; }
function cellDark(v, max) { return !!v && Math.sqrt(v / max) > CELL_INK_T; }
function cellInk(v, max) { return cellDark(v, max) ? '#F9F6EC' : '#28311D'; }
function cellHalo(v, max) { return cellDark(v, max) ? 'rgba(40,49,29,.55)' : 'rgba(249,246,236,.75)'; }

const V = {
  navLabel: 'Evidencia', icon: ICONS.evidence, usesTimeline: false, usesRail: false,
  source: 'Olivar · 02_evidence · 10.456 registros arqueológicos e históricos',
  title: () => ({ main: 'Evidencia arqueológica', sub: 'ocho mil años del árbol de Atenea' }),

  async init(ctx) {
    V.ctx = ctx;
    document.querySelector('#loading')?.classList.remove('gone');
    E = await Data.evidence();
    document.querySelector('#loading')?.classList.add('gone');
    TYPES = E.meta.types;
    ACTIVE = new Set(Object.keys(TYPES));
    GEO = await Data.geo('geo_world.json');
    const m = mapSetup('#ev-svg'); SVG = m.svg; G = m.g; ZOOM = m.zoom;
    observeResize('#ev-svg', () => { if (State.get('view') === 'evidence' && TAB === 'mapa') V.drawMap(); });
    V._aggregate();
    TAB = State.get('evTab') || 'mapa';
    V._buildTabs();
    if (TAB !== 'mapa') {
      document.querySelectorAll('.ev-panel').forEach(p => p.classList.toggle('on', p.id === 'ev-panel-' + TAB));
    }
    V._buildTypes();
    V._buildDetail();
  },

  // ─────────────── corpus-wide aggregates (never filtered) ───────────────
  _aggregate() {
    const pts = E.points;
    const st = {}, tr = {}, src = new Map();
    MACROS.forEach(r => { st[r] = {}; PBUCKETS.forEach(p => { st[r][p] = 0; }); });
    Object.keys(TYPES).forEach(t => { tr[t] = {}; MACROS.forEach(r => { tr[t][r] = 0; }); });
    const qa = { geo: 0, country: 0, dates: 0, period: 0, link: 0, ref: 0, low: 0 };
    for (const p of pts) {
      const r = macroOf(p.c), b = canonPeriod(p.p);
      st[r][b]++;
      if (tr[p.t]) tr[p.t][r]++;
      if (!p.c) qa.country++;
      if (p.d0 == null && p.d1 == null) qa.dates++;
      if (b === 'unknown') qa.period++;
      if (!p.doi && !p.url) qa.link++;
      if (!p.ref) qa.ref++;
      if (String(p.q || '').toLowerCase() === 'low') qa.low++;
      const key = p.tag || '(sin fuente declarada)';
      let s = src.get(key);
      if (!s) {
        s = {
          tag: key, n: 0, doi: 0, url: 0, ref: 0, q: { high: 0, medium: 0, low: 0, otra: 0 },
          types: {}, regions: {}, d0: null, d1: null,
          refs: new Map(), dois: new Map(), urls: new Map(),
        };
        src.set(key, s);
      }
      s.n++;
      if (p.doi) { s.doi++; s.dois.set(p.doi, (s.dois.get(p.doi) || 0) + 1); }
      if (p.url) { s.url++; s.urls.set(p.url, (s.urls.get(p.url) || 0) + 1); }
      if (p.ref) { s.ref++; s.refs.set(p.ref, (s.refs.get(p.ref) || 0) + 1); }
      const q = String(p.q || '').toLowerCase();
      s.q[q === 'high' || q === 'medium' || q === 'low' ? q : 'otra']++;
      s.types[p.t] = (s.types[p.t] || 0) + 1;
      s.regions[r] = (s.regions[r] || 0) + 1;
      const y0 = p.d0 != null ? p.d0 : p.d1, y1 = p.d1 != null ? p.d1 : p.d0;
      if (y0 != null) s.d0 = s.d0 == null ? y0 : Math.min(s.d0, y0);
      if (y1 != null) s.d1 = s.d1 == null ? y1 : Math.max(s.d1, y1);
    }
    // rows declared in the corpus but without usable coordinates (they never reach points[]).
    // meta.n_corpus is written by build/build_evidence.py; older payloads only carry per-type counts.
    const declared = E.meta.n_corpus
      || Object.values(TYPES).reduce((a, t) => a + (t.n || 0), 0);
    qa.geo = E.meta.n_unmapped != null ? E.meta.n_unmapped : Math.max(0, declared - pts.length);
    const top = m => { let k = null, v = -1; m.forEach((c, s) => { if (c > v) { v = c; k = s; } }); return k; };
    const sources = [...src.values()].map(s => Object.assign(s, {
      topRef: top(s.refs), topDoi: top(s.dois), topUrl: top(s.urls),
      trace: s.n ? (s.doi + s.url) / s.n : 0,
    })).sort((a, b) => b.n - a.n);
    AGG = { st, tr, qa, sources, declared, mapped: pts.length };
  },

  // ─────────────── sub-tabs ───────────────
  _buildTabs() {
    const el = document.querySelector('#ev-tabs');
    el.innerHTML = SUBTABS.map(([k, l]) =>
      `<button class="ev-tab ${k === TAB ? 'on' : ''}" role="tab" aria-selected="${k === TAB}" data-k="${k}">${l}</button>`).join('');
    el.querySelectorAll('.ev-tab').forEach(b => { b.onclick = () => V.setTab(b.dataset.k); });
  },

  setTab(k) {
    if (TAB === k) return;
    TAB = k; State.set('evTab', k); hideTip(true); V.hideDetail();
    document.querySelectorAll('#ev-tabs .ev-tab').forEach(b => {
      const on = b.dataset.k === k; b.classList.toggle('on', on); b.setAttribute('aria-selected', on);
    });
    document.querySelectorAll('.ev-panel').forEach(p => p.classList.toggle('on', p.id === 'ev-panel-' + k));
    const cc = document.querySelector('#tb-controls'); cc.innerHTML = ''; V.controls(cc);
    V.update();
  },

  controls(c) {
    if (TAB !== 'mapa') {
      const note = document.createElement('span');
      note.className = 'ev-corpus-note';
      note.innerHTML = `Corpus completo · <b>${AGG.declared.toLocaleString('es-ES')}</b> registros ` +
        `(<b>${AGG.mapped.toLocaleString('es-ES')}</b> cartografiables) · sin filtro de periodo ni de tipo`;
      c.appendChild(note);
      return;
    }
    const [a, b] = State.get('evRange');
    const wrap = document.createElement('div'); wrap.className = 'pillset';
    wrap.innerHTML = PERIODS.map(([lbl, y0, y1]) =>
      `<button class="pill ${a === y0 && b === y1 ? 'on' : ''}" data-r="${y0},${y1}">${lbl}</button>`).join('');
    wrap.querySelectorAll('.pill').forEach(btn => {
      btn.onclick = () => {
        const [y0, y1] = btn.dataset.r.split(',').map(Number);
        State.set('evRange', [y0, y1]);
        const cc = document.querySelector('#tb-controls'); cc.innerHTML = ''; V.controls(cc);
        V.update();
      };
    });
    c.appendChild(wrap);
    const span = document.createElement('span');
    span.style.cssText = 'font-size:12px;color:var(--ink-3);margin-left:6px';
    span.id = 'ev-range-label'; span.textContent = `${fmtYear(a)} — ${fmtYear(b)}`;
    c.appendChild(span);
    // all / none
    const tog = document.createElement('div'); tog.className = 'pillset';
    tog.innerHTML = '<button class="pill" data-all="1">Todos</button><button class="pill" data-all="0">Ninguno</button>';
    tog.querySelectorAll('.pill').forEach(btn => {
      btn.onclick = () => {
        ACTIVE = btn.dataset.all === '1' ? new Set(Object.keys(TYPES)) : new Set();
        V._buildTypes(); V.update();
      };
    });
    c.appendChild(tog);
  },

  _buildTypes() {
    const el = document.querySelector('#ev-types');
    el.innerHTML = Object.entries(TYPES).map(([k, t]) =>
      `<span class="ev-type ${ACTIVE.has(k) ? '' : 'off'}" data-t="${k}"><span class="dot" style="background:${t.color}"></span>${t.label}<span class="n">${t.n}</span></span>`).join('');
    el.querySelectorAll('.ev-type').forEach(s => {
      s.onclick = () => {
        const k = s.dataset.t;
        if (ACTIVE.has(k)) ACTIVE.delete(k); else ACTIVE.add(k);
        s.classList.toggle('off');
        V.update();
      };
    });
  },

  _buildDetail() {
    let d = document.querySelector('#ev-detail');
    if (!d) {
      d = document.createElement('div'); d.id = 'ev-detail'; d.className = 'ev-detail';
      document.querySelector('.ev-side').appendChild(d);
    }
  },

  _filtered() {
    const [a, b] = State.get('evRange');
    return E.points.filter(p => ACTIVE.has(p.t) && (p.d0 == null || (p.d0 <= b && (p.d1 == null ? p.d0 : p.d1) >= a)));
  },

  update() {
    if (TAB === 'mapa') {
      V.drawMap(); V.drawGallery();
      const l = document.querySelector('#ev-range-label'); const [a, b] = State.get('evRange');
      if (l) l.textContent = `${fmtYear(a)} — ${fmtYear(b)}`;
    } else if (TAB === 'st') V.drawST();
    else if (TAB === 'tipo') V.drawTipo();
    else if (TAB === 'qa') V.drawQA();
  },

  drawMap() {
    const [w, h] = sizeOf('#ev-svg');
    SVG.attr('viewBox', `0 0 ${w} ${h}`);
    const feats = noAntarctica(GEO.features);
    PROJ = fitProjection(feats, w, h, { type: 'robinson', pad: 8 });
    const path = d3.geoPath(PROJ);
    G.selectAll('*').remove();
    G.append('path').datum({ type: 'FeatureCollection', features: feats }).attr('d', path)
      .attr('fill', 'var(--land-bg,#DCD0BB)').attr('stroke', 'rgba(120,96,54,.22)').attr('stroke-width', .4);
    if (GEO.bordersMesh) G.append('path').datum(GEO.bordersMesh).attr('class', 'border-mesh').attr('d', path);
    const pts = V._filtered();
    const gP = G.append('g');
    gP.selectAll('circle').data(pts).enter().append('circle').attr('class', 'ev-pt')
      .attr('cx', d => { const p = PROJ([d.lo, d.la]); return p ? p[0] : -99; })
      .attr('cy', d => { const p = PROJ([d.lo, d.la]); return p ? p[1] : -99; })
      .attr('r', d => d.qs ? 1.7 + d.qs * 2.2 : 2.2)
      .attr('fill', d => TYPES[d.t]?.color || '#8A7A3A')
      /* La fiabilidad se contaba dos veces, en el tamaño Y en la opacidad, y la
         opacidad se estaba comiendo la codificación principal, que es el TIPO:
         compuesto sobre la tierra a 0,42 de opacidad, un deuteranope separaba 7
         de los 13 tipos y polen (3.188 puntos) y ánforas (1.916) caían a 1,7
         dE2000, o sea el mismo color. A 0,88 constante son 11 de 13, y la
         fiabilidad sigue leyéndose en el radio. (2026-09-06) */
      .attr('fill-opacity', 0.88)
      .attr('stroke', 'rgba(250,246,235,.62)').attr('stroke-width', .45)
      .style('cursor', 'pointer')
      .on('mousemove', (e, d) => showTip(e, {
        title: (d.s || 'Sitio') + (d.rg ? ` · ${d.rg}` : ''), val: TYPES[d.t]?.label || d.t,
        sub: `${d.d0 != null ? fmtYear(d.d0) + (d.d1 != null && d.d1 !== d.d0 ? '–' + fmtYear(d.d1) : '') : (d.p || '')} · ${d.dm}`,
        chip: 'clic para ficha',
      })).on('mouseleave', hideTip)
      .on('click', (e, d) => { e.stopPropagation(); V.showDetail(d); });
    SVG.on('click', () => V.hideDetail());

    document.querySelector('#ev-legend').innerHTML =
      `<b style="color:var(--ink)">${pts.length.toLocaleString('es-ES')}</b> registros en el mapa · ` +
      '<span style="color:var(--ink-3)">color = tipo · tamaño = fiabilidad · clic = ficha</span>';
  },

  // ═══════════ 2 · Espacio × Tiempo ═══════════
  drawST() {
    const host = document.querySelector('#ev-panel-st');
    const rowTot = {}, colTot = {};
    MACROS.forEach(r => { rowTot[r] = PBUCKETS.reduce((a, p) => a + AGG.st[r][p], 0); });
    PBUCKETS.forEach(p => { colTot[p] = MACROS.reduce((a, r) => a + AGG.st[r][p], 0); });
    const rows = MACROS.filter(r => rowTot[r] > 0);
    const cols = PBUCKETS.filter(p => colTot[p] > 0);
    const grand = rows.reduce((a, r) => a + rowTot[r], 0);
    const val = (r, p) => (ST_MODE === 'pct'
      ? (rowTot[r] ? 100 * AGG.st[r][p] / rowTot[r] : 0) : AGG.st[r][p]);
    const max = d3.max(rows, r => d3.max(cols, p => val(r, p))) || 1;

    host.innerHTML = `
      <div class="ev-pan-head">
        <h3>Espacio × Tiempo — región × periodo</h3>
        <p>Cuántos registros documentan cada macro-región en cada horizonte cronológico. Una celda vacía es
           un hueco de la investigación, no una ausencia de olivar: se lee de un vistazo el sesgo romano y el
           vacío medieval-islámico. Los periodos son los canónicos del corpus <i>02_evidence</i>.</p>
        <div class="ev-modes" id="st-modes">
          <button class="pill ${ST_MODE === 'n' ? 'on' : ''}" data-m="n">Nº de registros</button>
          <button class="pill ${ST_MODE === 'pct' ? 'on' : ''}" data-m="pct">% de la región</button>
        </div>
      </div>
      <div class="ev-mx-scroll"><svg class="ev-mx" id="st-mx"></svg></div>
      <div class="ev-mx-legend" id="st-legend"></div>
      <div class="ev-pan-foot">Total <b>${grand.toLocaleString('es-ES')}</b> registros cartografiables ·
        columna <b>Σ</b> = total de la región · fila <b>Σ</b> = total del periodo ·
        <span class="ev-hint">pasa el ratón o toca una celda para ver el detalle</span></div>`;
    host.querySelectorAll('#st-modes .pill').forEach(b => { b.onclick = () => { ST_MODE = b.dataset.m; V.drawST(); }; });

    V._matrix('#st-mx', {
      rows, cols,
      rowLabel: r => MSHORT[r] || r, colLabel: p => PLABEL[p],
      value: (r, p) => AGG.st[r][p], shown: (r, p) => val(r, p), max,
      fmt: v => (ST_MODE === 'pct' ? (v >= 0.5 ? Math.round(v) + '%' : (v > 0 ? '·' : '')) : (v ? v.toLocaleString('es-ES') : '')),
      rowTot, colTot, grand, cellW: 68, labW: 128, totLabel: 'Σ periodo',
      tip: (r, p) => ({
        title: `${r} · ${PLONG[p]}`,
        val: `${AGG.st[r][p].toLocaleString('es-ES')} registros`,
        sub: `${rowTot[r] ? (100 * AGG.st[r][p] / rowTot[r]).toFixed(1) : 0} % de la región · ` +
             `${colTot[p] ? (100 * AGG.st[r][p] / colTot[p]).toFixed(1) : 0} % del periodo`,
        chip: `${rowTot[r].toLocaleString('es-ES')} en ${r}`,
      }),
    });
    V._ramp('#st-legend', max, ST_MODE === 'pct' ? '% de la región' : 'registros por celda');
  },

  // ═══════════ 3 · Tipo × Región ═══════════
  drawTipo() {
    const host = document.querySelector('#ev-panel-tipo');
    const tks = Object.keys(TYPES).filter(t => AGG.tr[t]);
    const rowTot = {}, colTot = {};
    tks.forEach(t => { rowTot[t] = MACROS.reduce((a, r) => a + AGG.tr[t][r], 0); });
    MACROS.forEach(r => { colTot[r] = tks.reduce((a, t) => a + AGG.tr[t][r], 0); });
    const rows = tks.filter(t => rowTot[t] > 0);
    const cols = MACROS.filter(r => colTot[r] > 0);
    const grand = rows.reduce((a, t) => a + rowTot[t], 0);
    const val = (t, r) => (TR_MODE === 'pct' ? (colTot[r] ? 100 * AGG.tr[t][r] / colTot[r] : 0) : AGG.tr[t][r]);
    const max = d3.max(rows, t => d3.max(cols, r => val(t, r))) || 1;

    host.innerHTML = `
      <div class="ev-pan-head">
        <h3>Tipo × Región — qué clase de dato hay en cada zona</h3>
        <p>La evidencia no está hecha de lo mismo en las dos orillas: el polen domina donde hay turberas y
           lagos, las ánforas siguen la ruta bética-tiberina, la epigrafía y las prensas marcan el corazón
           romano. Saber de qué material está hecho el dato de cada región es el primer control de sesgo.</p>
        <div class="ev-modes" id="tr-modes">
          <button class="pill ${TR_MODE === 'n' ? 'on' : ''}" data-m="n">Nº de registros</button>
          <button class="pill ${TR_MODE === 'pct' ? 'on' : ''}" data-m="pct">% de la región</button>
        </div>
      </div>
      <div class="ev-sub">Composición de cada región (100 %)</div>
      <div class="ev-mx-scroll"><svg class="ev-mx" id="tr-bars"></svg></div>
      <div class="ev-typekey" id="tr-key"></div>
      <div class="ev-sub">Matriz tipo × región</div>
      <div class="ev-mx-scroll"><svg class="ev-mx" id="tr-mx"></svg></div>
      <div class="ev-mx-legend" id="tr-legend"></div>
      <div class="ev-pan-foot">Total <b>${grand.toLocaleString('es-ES')}</b> registros cartografiables ·
        ${rows.length} tipos de evidencia · ${cols.length} macro-regiones ·
        <span class="ev-hint">pasa el ratón o toca para ver el detalle</span><br>
        Las cifras por tipo son algo menores que las del filtro del mapa porque aquí solo entran los
        registros con coordenadas: ${AGG.qa.geo.toLocaleString('es-ES')} de los
        ${AGG.declared.toLocaleString('es-ES')} del corpus no las tienen (ver <i>Fuentes / QA</i>).</div>`;
    host.querySelectorAll('#tr-modes .pill').forEach(b => { b.onclick = () => { TR_MODE = b.dataset.m; V.drawTipo(); }; });

    document.querySelector('#tr-key').innerHTML = rows.map(t =>
      `<span class="tkey"><i style="background:${TYPES[t].color}"></i>${TYPES[t].glyph} ${TYPES[t].label}
        <b>${rowTot[t].toLocaleString('es-ES')}</b></span>`).join('');

    V._stack('#tr-bars', cols, rows, colTot);
    V._matrix('#tr-mx', {
      rows, cols,
      rowLabel: t => `${TYPES[t].glyph} ${TYPES[t].label}`, colLabel: r => MSHORT[r] || r,
      rowColor: t => TYPES[t].color,
      value: (t, r) => AGG.tr[t][r], shown: (t, r) => val(t, r), max,
      fmt: v => (TR_MODE === 'pct' ? (v >= 0.5 ? Math.round(v) + '%' : (v > 0 ? '·' : '')) : (v ? v.toLocaleString('es-ES') : '')),
      rowTot, colTot, grand, cellW: 82, labW: 176, totLabel: 'Σ región',
      tip: (t, r) => ({
        title: `${TYPES[t].label} · ${r}`,
        val: `${AGG.tr[t][r].toLocaleString('es-ES')} registros`,
        sub: `${colTot[r] ? (100 * AGG.tr[t][r] / colTot[r]).toFixed(1) : 0} % de la región · ` +
             `${rowTot[t] ? (100 * AGG.tr[t][r] / rowTot[t]).toFixed(1) : 0} % del tipo`,
        chip: `${rowTot[t].toLocaleString('es-ES')} de este tipo en total`,
      }),
    });
    V._ramp('#tr-legend', max, TR_MODE === 'pct' ? '% de la región' : 'registros por celda');
  },

  // ═══════════ 4 · Fuentes / QA ═══════════
  drawQA() {
    const host = document.querySelector('#ev-panel-qa');
    const q = AGG.qa, N = AGG.declared, M = AGG.mapped;
    const withDoi = AGG.sources.reduce((a, s) => a + s.doi, 0);
    const withUrl = AGG.sources.reduce((a, s) => a + s.url, 0);
    const withRef = AGG.sources.reduce((a, s) => a + s.ref, 0);
    const conf = AGG.sources.reduce((a, s) => {
      a.high += s.q.high; a.medium += s.q.medium; a.low += s.q.low; a.otra += s.q.otra; return a;
    }, { high: 0, medium: 0, low: 0, otra: 0 });
    const pc = (v, t) => (t ? (100 * v / t) : 0);
    const card = (v, l) => `<div class="ev-kpi"><b>${v}</b><span>${l}</span></div>`;
    const CONF_LBL = { high: 'Alta', medium: 'Media', low: 'Baja', otra: 'Sin declarar' };
    /* Verde / ámbar / rojo es la trampa clásica del daltonismo: alta y baja
       quedaban a 5,5 dE2000 bajo deuteranopia. Hoja / oro / vino / gris mantiene
       las cuatro clases separadas (peor par 16,2 dE bajo deuteranopia, 18,3 bajo
       protanopia) y ninguno de los cuatro es el acento --terra. (2026-09-06) */
    const CONF_COL = { high: '#4F7A2A', medium: '#C9A227', low: '#7A2A3A', otra: '#9A968A' };
    /* El rótulo dentro del segmento tiene que leerse SOBRE SU segmento: en crema
       sobre el oro daba 2,24:1 medido en pantalla. Tinta oscura en los claros,
       crema en los oscuros: 2,24:1 -> 5,61:1 medido sobre pixeles reales (el
       segmento verde de "alta" se queda en 4,69:1, que ya pasaba). */
    const CONF_INK = { high: '#FBF6EA', medium: '#28311D', low: '#FBF6EA', otra: '#28311D' };
    const CONF_SHADOW = { high: '0 1px 2px rgba(0,0,0,.25)', medium: '0 1px 1px rgba(255,252,240,.45)',
                          low: '0 1px 2px rgba(0,0,0,.25)', otra: '0 1px 1px rgba(255,252,240,.45)' };
    const FLAGS = [
      ['Sin coordenadas (no cartografiable)', q.geo, N],
      ['Sin fechas absolutas (solo periodo)', q.dates, M],
      ['Sin país asignado', q.country, M],
      ['Periodo sin clasificar', q.period, M],
      ['Fiabilidad declarada baja', q.low, M],
      ['Sin referencia bibliográfica', q.ref, M],
      ['Sin DOI ni URL', q.link, M],
    ].sort((a, b) => b[1] - a[1]);
    const fmax = d3.max(FLAGS, f => f[1]) || 1;

    host.innerHTML = `
      <div class="ev-pan-head">
        <h3>Fuentes y control de calidad — de dónde sale cada registro</h3>
        <p>Ningún dato de este atlas es anónimo: cada registro declara su repositorio de origen, su
           referencia bibliográfica, su método de datación y una fiabilidad. Esta pestaña expone lo que
           falta con el mismo detalle que lo que hay, para que la crítica pueda dirigirse a huecos
           concretos y no al conjunto.</p>
      </div>
      <div class="ev-kpis">
        ${card(N.toLocaleString('es-ES'), 'registros en el corpus')}
        ${card(M.toLocaleString('es-ES'), 'cartografiables')}
        ${card(AGG.sources.length.toLocaleString('es-ES'), 'fuentes / repositorios')}
        ${card(pc(withRef, M).toFixed(1) + ' %', 'con referencia')}
        ${card(pc(withDoi, M).toFixed(1) + ' %', 'con DOI')}
        ${card(pc(withUrl, M).toFixed(1) + ' %', 'con URL')}
      </div>

      <div class="ev-sub">Fiabilidad declarada</div>
      <div class="ev-confbar">${['high', 'medium', 'low', 'otra'].filter(k => conf[k]).map(k => {
        const w = pc(conf[k], M);
        // a sliver cannot hold a label: name it in the foot line and in the title attribute instead
        return `<span class="seg" style="width:${w}%;background:${CONF_COL[k]}" title="${CONF_LBL[k]}: ${conf[k].toLocaleString('es-ES')}">`
          + (w >= 9 ? `<i style="color:${CONF_INK[k]};text-shadow:${CONF_SHADOW[k]}">${CONF_LBL[k]} ${w.toFixed(0)} %</i>` : '') + '</span>';
      }).join('')}</div>
      <div class="ev-pan-foot">${conf.high.toLocaleString('es-ES')} alta · ${conf.medium.toLocaleString('es-ES')} media ·
        ${conf.low.toLocaleString('es-ES')} baja${conf.otra ? ` · ${conf.otra.toLocaleString('es-ES')} sin declarar` : ''}</div>

      <div class="ev-sub">Huecos declarados del corpus</div>
      <div class="ev-flags">${FLAGS.map(([l, v, base]) => `
        <div class="ev-flag">
          <span class="fl">${l}</span>
          <span class="fb"><i style="width:${Math.max(1.5, 100 * v / fmax)}%"></i></span>
          <span class="fv">${v.toLocaleString('es-ES')}<em>${pc(v, base).toFixed(1)} %</em></span>
        </div>`).join('')}</div>
      <div class="ev-pan-foot">Porcentajes sobre los ${M.toLocaleString('es-ES')} registros cartografiables,
        salvo «sin coordenadas», que se calcula sobre los ${N.toLocaleString('es-ES')} del corpus.</div>

      <div class="ev-sub">Procedencia por fuente <span class="ev-sub-n">${AGG.sources.length} repositorios</span></div>
      <div class="ev-srcbar">
        <input class="ev-search" id="qa-q" type="search" placeholder="Buscar fuente o referencia…" value="${esc(SRC_Q)}">
        <div class="pillset">
          <button class="pill ${SRC_SORT === 'n' ? 'on' : ''}" data-s="n">Por volumen</button>
          <button class="pill ${SRC_SORT === 'trace' ? 'on' : ''}" data-s="trace">Por trazabilidad</button>
          <button class="pill ${SRC_SORT === 'tag' ? 'on' : ''}" data-s="tag">Alfabético</button>
        </div>
      </div>
      <div class="ev-tbl-scroll"><table class="ev-tbl" id="qa-tbl"></table></div>
      <div class="ev-pan-foot" id="qa-tbl-foot"></div>`;

    const qi = host.querySelector('#qa-q');
    qi.oninput = () => { SRC_Q = qi.value; V._srcTable(); };
    host.querySelectorAll('.ev-srcbar .pill').forEach(b => {
      b.onclick = () => {
        SRC_SORT = b.dataset.s;
        host.querySelectorAll('.ev-srcbar .pill').forEach(x => x.classList.toggle('on', x === b));
        V._srcTable();
      };
    });
    V._srcTable();
  },

  _srcTable() {
    const tbl = document.querySelector('#qa-tbl'); if (!tbl) return;
    const needle = SRC_Q.trim().toLowerCase();
    let rows = AGG.sources.filter(s => !needle
      || s.tag.toLowerCase().includes(needle) || String(s.topRef || '').toLowerCase().includes(needle));
    if (SRC_SORT === 'tag') rows = rows.slice().sort((a, b) => a.tag.localeCompare(b.tag, 'es'));
    else if (SRC_SORT === 'trace') rows = rows.slice().sort((a, b) => b.trace - a.trace || b.n - a.n);
    else rows = rows.slice().sort((a, b) => b.n - a.n);
    const nmax = AGG.sources[0] ? AGG.sources[0].n : 1;
    const yr = v => (v == null ? '—' : fmtYear(v));
    const CONF_COL = { high: '#4F7A2A', medium: '#C9A227', low: '#7A2A3A', otra: '#9A968A' };
    const link = s => {
      const out = [];
      if (s.topDoi) out.push(`<a href="https://doi.org/${esc(String(s.topDoi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, ''))}" target="_blank" rel="noopener">DOI</a>`);
      if (s.topUrl) out.push(`<a href="${esc(s.topUrl)}" target="_blank" rel="noopener">URL</a>`);
      return out.length ? out.join(' · ') : '<span class="ev-none">—</span>';
    };
    tbl.innerHTML =
      `<thead><tr><th>Fuente / repositorio</th><th class="num">Registros</th><th>Tipos</th>
        <th>Cronología</th><th>Fiabilidad</th><th>Enlaces</th><th>Referencia principal</th></tr></thead><tbody>`
      + rows.map(s => {
        const tks = Object.entries(s.types).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const segs = ['high', 'medium', 'low', 'otra'].filter(k => s.q[k]).map(k =>
          `<i style="width:${100 * s.q[k] / s.n}%;background:${CONF_COL[k]}"></i>`).join('');
        return `<tr>
          <td class="src">${esc(s.tag)}</td>
          <td class="num"><span class="nbar"><i style="width:${Math.max(2, 100 * s.n / nmax)}%"></i></span>${s.n.toLocaleString('es-ES')}</td>
          <td class="tks">${tks.map(([t, c]) => `<span class="tk" style="color:${TYPES[t] ? TYPES[t].color : '#8A7A3A'}" title="${esc(TYPES[t] ? TYPES[t].label : t)}: ${c}">${TYPES[t] ? TYPES[t].glyph : '•'}</span>`).join('')}</td>
          <td class="yrs">${yr(s.d0)}${s.d1 != null && s.d1 !== s.d0 ? ' – ' + yr(s.d1) : ''}</td>
          <td class="conf"><span class="cbar">${segs}</span></td>
          <td class="lnk">${link(s)}</td>
          <td class="ref">${s.topRef ? esc(String(s.topRef).slice(0, 160)) : '<span class="ev-none">sin referencia</span>'}</td>
        </tr>`;
      }).join('') + '</tbody>';
    const shown = rows.reduce((a, s) => a + s.n, 0);
    document.querySelector('#qa-tbl-foot').innerHTML =
      `${rows.length.toLocaleString('es-ES')} de ${AGG.sources.length.toLocaleString('es-ES')} fuentes · `
      + `${shown.toLocaleString('es-ES')} de ${AGG.mapped.toLocaleString('es-ES')} registros cartografiables · `
      + 'fiabilidad: <b style="color:#3C4A1C">alta</b> · <b style="color:#7A5F10">media</b> · <b style="color:#6B2432">baja</b>';
  },

  // ─────────────── generic SVG matrix ───────────────
  _matrix(sel, o) {
    const { rows, cols, cellW, labW } = o, cellH = 30, headH = 34, totW = 78, footH = 30;
    const w = labW + cols.length * cellW + totW, h = headH + rows.length * cellH + footH;
    const svg = d3.select(sel).attr('viewBox', `0 0 ${w} ${h}`).attr('width', w).attr('height', h);
    svg.selectAll('*').remove();
    const bind = (node, tip) => node.style('cursor', 'pointer')
      .on('pointermove', e => { if (e.pointerType !== 'touch') showTip(e, tip()); })
      .on('pointerleave', e => { if (e.pointerType !== 'touch') hideTip(); })
      .on('click', e => { e.stopPropagation(); showTip(e, tip()); });
    // column headers
    const gh = svg.append('g');
    cols.forEach((c, j) => gh.append('text').attr('class', 'mx-head')
      .attr('x', labW + j * cellW + cellW / 2).attr('y', headH - 11).attr('text-anchor', 'middle')
      .text(o.colLabel(c)));
    gh.append('text').attr('class', 'mx-head tot')
      .attr('x', labW + cols.length * cellW + totW / 2).attr('y', headH - 11).attr('text-anchor', 'middle').text('Σ');
    // rows
    rows.forEach((r, i) => {
      const y = headH + i * cellH;
      const g = svg.append('g');
      g.append('text').attr('class', 'mx-row').attr('x', labW - 10).attr('y', y + cellH / 2 + 4)
        .attr('text-anchor', 'end').text(o.rowLabel(r));
      if (o.rowColor) {
        g.append('rect').attr('x', 2).attr('y', y + 8).attr('width', 4).attr('height', cellH - 16)
          .attr('rx', 2).attr('fill', o.rowColor(r));
      }
      cols.forEach((c, j) => {
        const sv = o.shown(r, c);
        const x = labW + j * cellW;
        const cell = g.append('g').attr('class', 'mx-cell');
        cell.append('rect').attr('x', x + 1).attr('y', y + 1).attr('width', cellW - 2).attr('height', cellH - 2)
          .attr('rx', 3).attr('fill', cellFill(sv, o.max))
          .attr('stroke', 'rgba(120,96,54,.14)').attr('stroke-width', .6);
        cell.append('text').attr('x', x + cellW / 2).attr('y', y + cellH / 2 + 4).attr('text-anchor', 'middle')
          .attr('class', 'mx-val').attr('fill', cellInk(sv, o.max))
          .attr('stroke', cellHalo(sv, o.max)).text(o.fmt(sv));
        const t = o.tip(r, c);
        cell.append('title').text(`${t.title}: ${o.value(r, c)}`);
        bind(cell, () => o.tip(r, c));
      });
      // row total
      const xt = labW + cols.length * cellW;
      g.append('rect').attr('x', xt + 3).attr('y', y + 1).attr('width', totW - 6).attr('height', cellH - 2)
        .attr('rx', 3).attr('fill', 'var(--cream-3)');
      g.append('text').attr('x', xt + totW / 2).attr('y', y + cellH / 2 + 4).attr('text-anchor', 'middle')
        .attr('class', 'mx-val tot').text(o.rowTot[r].toLocaleString('es-ES'));
    });
    // column totals
    const yf = headH + rows.length * cellH;
    const gf = svg.append('g');
    gf.append('text').attr('class', 'mx-row tot').attr('x', labW - 10).attr('y', yf + 19)
      .attr('text-anchor', 'end').text(o.totLabel || 'Σ');
    cols.forEach((c, j) => gf.append('text').attr('class', 'mx-val tot')
      .attr('x', labW + j * cellW + cellW / 2).attr('y', yf + 19).attr('text-anchor', 'middle')
      .text(o.colTot[c].toLocaleString('es-ES')));
    gf.append('text').attr('class', 'mx-val grand')
      .attr('x', labW + cols.length * cellW + totW / 2).attr('y', yf + 19).attr('text-anchor', 'middle')
      .text(o.grand.toLocaleString('es-ES'));
  },

  // ─────────────── 100 % stacked bars, one row per region ───────────────
  _stack(sel, groups, types, groupTot) {
    const labW = 176, barW = 520, rowH = 28, padTop = 8, valW = 92;
    const w = labW + barW + valW, h = padTop + groups.length * rowH + 10;
    const svg = d3.select(sel).attr('viewBox', `0 0 ${w} ${h}`).attr('width', w).attr('height', h);
    svg.selectAll('*').remove();
    groups.forEach((r, i) => {
      const y = padTop + i * rowH;
      const g = svg.append('g');
      g.append('text').attr('class', 'mx-row').attr('x', labW - 10).attr('y', y + rowH / 2 + 4)
        .attr('text-anchor', 'end').text(r);
      let x = labW; const tot = groupTot[r] || 1;
      types.forEach(t => {
        const v = AGG.tr[t][r]; if (!v) return;
        const wd = barW * v / tot;
        const tip = () => ({
          title: `${r} · ${TYPES[t].label}`, val: `${v.toLocaleString('es-ES')} registros`,
          sub: `${(100 * v / tot).toFixed(1)} % de la evidencia de ${r}`,
          chip: `${tot.toLocaleString('es-ES')} en la región`,
        });
        const seg = g.append('rect').attr('x', x).attr('y', y + 5).attr('width', Math.max(0.6, wd))
          .attr('height', rowH - 12).attr('fill', TYPES[t].color).attr('fill-opacity', .88)
          .style('cursor', 'pointer')
          .on('pointermove', e => { if (e.pointerType !== 'touch') showTip(e, tip()); })
          .on('pointerleave', e => { if (e.pointerType !== 'touch') hideTip(); })
          .on('click', e => { e.stopPropagation(); showTip(e, tip()); });
        seg.append('title').text(`${TYPES[t].label}: ${v}`);
        x += wd;
      });
      g.append('text').attr('class', 'mx-val tot').attr('x', labW + barW + valW / 2).attr('y', y + rowH / 2 + 4)
        .attr('text-anchor', 'middle').text(tot.toLocaleString('es-ES'));
    });
  },

  _ramp(sel, max, label) {
    const el = document.querySelector(sel); if (!el) return;
    const steps = 22;
    el.innerHTML = `<span class="rl">${label}</span>`
      + `<span class="rn">0</span>`
      + `<span class="rbar">${d3.range(steps).map(i =>
        `<i style="background:${cScale(Math.sqrt((i + 0.5) / steps))}"></i>`).join('')}</span>`
      + `<span class="rn">${Math.round(max).toLocaleString('es-ES')}</span>`
      + '<span class="rl dim">escala de raíz cuadrada · celda en crema = sin datos</span>';
  },

  drawGallery() {
    const pts = V._filtered();
    const byType = {};
    for (const p of pts) (byType[p.t] = byType[p.t] || []).push(p);
    for (const k in byType) byType[k].sort((a, b) => (b.qs || 0) - (a.qs || 0) || (b.d0 || -99999) - (a.d0 || -99999));
    const order = Object.keys(TYPES).filter(k => byType[k]);
    const shown = []; let i = 0;
    while (shown.length < GALLERY_CAP && order.some(k => byType[k].length > i)) {
      for (const k of order) { if (byType[k][i]) { shown.push(byType[k][i]); if (shown.length >= GALLERY_CAP) break; } }
      i++;
    }
    const el = document.querySelector('#ev-gallery');
    const head = `<div class="ev-count">Mostrando <b>${shown.length}</b> de <b>${pts.length.toLocaleString('es-ES')}</b> registros · una muestra de cada tipo, por fiabilidad. <span style="color:var(--ink-3)">Clic en una ficha para el detalle.</span></div>`;
    el.innerHTML = head + shown.map((p, idx) => V._card(p, idx)).join('');
    el.querySelectorAll('.ev-card').forEach(c => { c.onclick = () => V.showDetail(shown[+c.dataset.i]); });
  },

  _card(p, idx) {
    const t = TYPES[p.t] || { label: p.t, color: '#8A7A3A', glyph: '•' };
    const date = p.d0 != null ? `${fmtYear(p.d0)}${p.d1 != null && p.d1 !== p.d0 ? ' – ' + fmtYear(p.d1) : ''}` : (p.p || '—');
    const loc = [p.rg, p.c].filter(Boolean).join(' · ');
    const isText = p.t === 'literary' || p.t === 'epigraphy';
    const quote = isText && p.note ? `<div class="ev-card-quote">${esc(p.note).slice(0, 220)}</div>` : '';
    const tags = [
      p.st ? `<span class="ev-tag">${esc(p.st)}</span>` : '',
      p.dm ? `<span class="ev-tag dating">${esc(p.dm)}</span>` : '',
      p.v != null ? `<span class="ev-tag val">${fmtV(p.v)}${p.u ? ' ' + esc(p.u) : ''}</span>` : '',
    ].join('');
    return `<article class="ev-card" data-i="${idx}" style="border-left-color:${t.color}">
      <div class="ev-card-top"><span class="ev-card-type" style="color:${t.color}">${t.glyph} ${t.label}</span><span class="ev-card-date">${date}</span></div>
      <div class="ev-card-site">${esc(p.s || 'Sitio sin nombre')}</div>
      ${loc ? `<div class="ev-card-loc">${esc(loc)}</div>` : ''}
      <div class="ev-card-meta">${tags}</div>${quote}</article>`;
  },

  showDetail(p) {
    const t = TYPES[p.t] || { label: p.t, color: '#8A7A3A', glyph: '•' };
    const date = p.d0 != null ? `${fmtYear(p.d0)}${p.d1 != null && p.d1 !== p.d0 ? ' – ' + fmtYear(p.d1) : ''}` : (p.p || '—');
    const refLink = p.doi ? `https://doi.org/${String(p.doi).replace(/^https?:\/\/doi.org\//, '')}` : p.url;
    const row = (k, v) => (v ? `<div class="ev-d-row"><span class="ev-d-k">${k}</span><span class="ev-d-v">${v}</span></div>` : '');
    const d = document.querySelector('#ev-detail');
    d.innerHTML = `
      <button class="ev-d-close" aria-label="Cerrar">← volver a la galería</button>
      <div class="ev-d-badge" style="background:${t.color}">${t.glyph} ${t.label}${p.st ? ' · ' + esc(p.st) : ''}</div>
      <h3 class="ev-d-site">${esc(p.s || 'Sitio sin nombre')}</h3>
      <div class="ev-d-loc">${esc([p.rg, p.c].filter(Boolean).join(' · ') || '')}${p.la != null ? ` · ${p.la}, ${p.lo}` : ''}</div>
      <div class="ev-d-grid">
        ${row('Datación', esc(date))}
        ${row('Periodo', esc(p.p))}
        ${row('Método', esc(p.dm))}
        ${row('Valor', p.v != null ? fmtV(p.v) + (p.u ? ' ' + esc(p.u) : '') : '')}
        ${row('Fiabilidad', p.q ? `${esc(p.q)}${p.qs != null ? ` (${p.qs})` : ''}` : '')}
        ${row('País (ISO3)', esc(p.c))}
      </div>
      ${p.note ? `<div class="ev-d-note"><span class="ev-d-k">Nota / pasaje</span><p>${esc(p.note)}</p></div>` : ''}
      ${p.ref ? `<div class="ev-d-ref"><span class="ev-d-k">Referencia</span><p>${refLink ? `<a href="${esc(refLink)}" target="_blank" rel="noopener">${esc(p.ref)}</a>` : esc(p.ref)}</p></div>` : ''}
      ${p.tag ? `<div class="ev-d-src">Fuente de datos: <b>${esc(p.tag)}</b></div>` : ''}`;
    d.querySelector('.ev-d-close').onclick = () => V.hideDetail();
    d.classList.add('on');
    // highlight point on map
    G.selectAll('.ev-pt').attr('stroke', dd => (dd === p ? 'var(--ink)' : 'rgba(255,250,235,.5)')).attr('stroke-width', dd => (dd === p ? 1.6 : .3));
    if (p.la != null && PROJ) {
      const xy = PROJ([p.lo, p.la]);
      if (xy) {
        G.append('circle').attr('class', 'ev-focus').attr('cx', xy[0]).attr('cy', xy[1]).attr('r', 10)
          .attr('fill', 'none').attr('stroke', t.color).attr('stroke-width', 2).attr('opacity', 1)
          .transition().duration(900).attr('r', 22)
          .attr('opacity', 0)
          .remove();
      }
    }
  },
  hideDetail() { const d = document.querySelector('#ev-detail'); if (d) d.classList.remove('on'); },

  download() {
    const q = s => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
    if (TAB === 'st') {
      const cols = ['region'].concat(PBUCKETS.map(p => PLONG[p])).concat(['total']);
      const rows = MACROS.map(r => {
        const vals = PBUCKETS.map(p => AGG.st[r][p]);
        return [r].concat(vals).concat([vals.reduce((a, b) => a + b, 0)]).map(q).join(',');
      });
      return { name: 'minerva_evidencia_region_x_periodo.csv', csv: cols.join(',') + '\n' + rows.join('\n') };
    }
    if (TAB === 'tipo') {
      const cols = ['tipo'].concat(MACROS).concat(['total']);
      const rows = Object.keys(TYPES).map(t => {
        const vals = MACROS.map(r => AGG.tr[t][r]);
        return [TYPES[t].label].concat(vals).concat([vals.reduce((a, b) => a + b, 0)]).map(q).join(',');
      });
      return { name: 'minerva_evidencia_tipo_x_region.csv', csv: cols.join(',') + '\n' + rows.join('\n') };
    }
    if (TAB === 'qa') {
      const cols = ['fuente', 'registros', 'con_doi', 'con_url', 'con_referencia',
        'fiab_alta', 'fiab_media', 'fiab_baja', 'fiab_sin_declarar',
        'anio_min', 'anio_max', 'doi', 'url', 'referencia_principal'];
      const rows = AGG.sources.map(s => [s.tag, s.n, s.doi, s.url, s.ref,
        s.q.high, s.q.medium, s.q.low, s.q.otra, s.d0, s.d1, s.topDoi, s.topUrl, s.topRef].map(q).join(','));
      return { name: 'minerva_evidencia_fuentes_qa.csv', csv: cols.join(',') + '\n' + rows.join('\n') };
    }
    const pts = V._filtered();
    const cols = ['tipo', 'subtipo', 'sitio', 'lat', 'lon', 'pais', 'region', 'macroregion', 'anio_inicio',
      'anio_fin', 'periodo', 'periodo_canonico', 'datacion', 'valor', 'unidad', 'referencia', 'doi', 'url',
      'fuente', 'fiabilidad'];
    const rows = pts.map(p => [TYPES[p.t] ? TYPES[p.t].label : p.t, p.st, p.s, p.la, p.lo, p.c, p.rg,
      macroOf(p.c), p.d0, p.d1, p.p, PLONG[canonPeriod(p.p)], p.dm, p.v, p.u, p.ref, p.doi, p.url, p.tag,
      p.q].map(q).join(','));
    return { name: 'minerva_evidencia.csv', csv: cols.join(',') + '\n' + rows.join('\n') };
  },
  resize() { if (State.get('view') === 'evidence' && TAB === 'mapa') V.drawMap(); },
};
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function fmtV(v) { return Number.isInteger(v) ? v.toLocaleString('es-ES') : (+v).toLocaleString('es-ES', { maximumFractionDigits: 2 }); }
export default V;
