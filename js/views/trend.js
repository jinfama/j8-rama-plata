// ════════ Tendencias mundiales — WHEP balanced ════════
import { State } from '../state.js?v=20260906m';
import Data from '../data-loader.js?v=20260906m';
import { ICONS, SEQ_COLORS, AEGEAN_COLORS, seqScale, scaleTicks, fmt, fmtUnit, NODATA, LAND_BG, ZERO_COL,
         coverageByYear, coverageThreshold, firstCoveredYear } from '../utils.js?v=20260906m';
import { mapSetup, sizeOf, fitProjection, observeResize, renderLegend, noAntarctica } from '../mapkit.js?v=20260906m';
import { showTip, hideTip } from '../tip.js?v=20260906m';

let T, G, SVG, ZOOM, domainCache = {};

/* Mismo guardia que en atlas.js: T.meta.indicators viene de JSON.parse y
   responde a __proto__, constructor o toString por la cadena de prototipos,
   asi que un ?tind= imposible se colaba y dejaba el mapa sin pintar. */
const has = (o, k) => Object.prototype.hasOwnProperty.call(o || {}, k);

const V = {
  navLabel: 'Tendencias', icon: ICONS.trend, usesTimeline: true, usesRail: true,
  source: 'WHEP balanced · superficie · producción · rendimiento · comercio directo',
  title: () => ({ main: 'Tendencias mundiales', sub: 'superficie · producción · comercio del aceite' }),

  async init(ctx) {
    V.ctx = ctx;
    T = await Data.trend();
    const m = mapSetup('#trend-svg'); SVG = m.svg; G = m.g; ZOOM = m.zoom;
    observeResize('#trend-svg', () => { if (State.get('view') === 'trend') V.update(); });
  },
  yearDomain() {
    const ind = State.get('trendInd'), ys = T.meta.years;
    let lo = Infinity, hi = -Infinity;
    for (const r of Object.values(T.countries)) { const a = r[ind]; if (!a) continue; for (let i = 0; i < a.length; i++) if (a[i] != null) { const y = ys[i]; if (y < lo) lo = y; if (y > hi) hi = y; } }
    return lo === Infinity ? [ys[0], ys[ys.length - 1]] : [lo, hi];
  },

  // Primer año con cobertura suficiente para que el mapa se lea (ver utils.js).
  startYear() {
    const ys = T.meta.years;
    return firstCoveredYear(ys, coverageByYear(Object.values(T.countries), State.get('trendInd'), ys.length));
  },

  controls(c) {
    const inds = T.meta.indicators; const cur = has(inds, State.get('trendInd')) ? State.get('trendInd') : 'production';
    State.set('trendInd', cur);
    const sel = document.createElement('select'); sel.className = 'sel';
    sel.innerHTML = Object.entries(inds).map(([k, i]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${i.label}</option>`).join('');
    sel.onchange = () => {
      State.set('trendInd', sel.value);
      V.ctx.TL.setDomain(V.yearDomain());
      V._ensureYearHasData();
      V.update(); V.ctx.refreshRail();
    };
    c.appendChild(sel);
    const st = document.createElement('div'); st.className = 'pillset';
    const stype = State.get('scaleType');
    /* La pastilla decía "lineal" y nunca lo fue: es una escala de potencia de
       exponente 0,42. Ahora se llama por su nombre. Los valores del permalink
       (pow | log) no cambian. */
    st.innerHTML = `<button class="pill ${stype === 'pow' ? 'on' : ''}" data-t="pow" title="escala de potencia, exponente 0,42">raíz</button><button class="pill ${stype === 'log' ? 'on' : ''}" data-t="log" title="escala logarítmica (por defecto)">log</button>`;
    st.querySelectorAll('.pill').forEach(b => b.onclick = () => { State.set('scaleType', b.dataset.t); const cc = document.querySelector('#tb-controls'); cc.innerHTML = ''; V.controls(cc); V.update(); });
    c.appendChild(st);
  },

  _ensureYearHasData() {
    const ys = T.meta.years;
    const counts = coverageByYear(Object.values(T.countries), State.get('trendInd'), ys.length);
    const need = coverageThreshold(counts);
    if (!need) return;
    if (counts[V._yi(State.get('year'))] < need) State.set('year', V.startYear());
  },

  _isTrade(ind) { return ind.startsWith('oil_ex') || ind.startsWith('oil_im'); },
  _colors(ind) { return this._isTrade(ind) ? AEGEAN_COLORS : SEQ_COLORS; },

  _scale(ind) {
    const key = ind + '|' + State.get('scaleType');
    const all = [];
    for (const r of Object.values(T.countries)) if (r[ind]) for (const v of r[ind]) if (v != null) all.push(v);
    return seqScale(all, { type: State.get('scaleType'), colors: this._colors(ind) });
  },
  _yi(year) { const ys = T.meta.years; return Math.max(0, Math.min(ys.length - 1, ys.indexOf(year) >= 0 ? ys.indexOf(year) : ys.findIndex(y => y >= year))); },

  async update() {
    const ind = State.get('trendInd'), year = State.get('year');
    const geo = await Data.geo('geo_world.json');
    const feats = noAntarctica(geo.features);
    const [w, h] = sizeOf('#trend-svg');
    SVG.attr('viewBox', `0 0 ${w} ${h}`);
    const proj = fitProjection(feats, w, h, { type: 'robinson', pad: 10 });
    const path = d3.geoPath(proj);
    const sc = this._scale(ind);
    const j = this._yi(year);
    document.querySelector('#trend-year').textContent = T.meta.years[j];
    const inds = T.meta.indicators;

    const datum = f => {
      const r = T.countries[f.properties.name];
      if (!r) return { r: null };
      const val = r[ind] ? r[ind][j] : null;
      const est = r.est && r.est[ind] ? r.est[ind][j] : false;
      return { r, val, est, name: r.name };
    };
    G.selectAll('*').remove();
    /* Un cero medido no es un hueco de datos: hasta 2026-09-06 los dos caían en
       el mismo NODATA y el mapa decía "no sé" donde la fuente dice "no hay". */
    let nData = 0, nEst = 0;
    for (const f of feats) {
      const dt = datum(f);
      if (!dt.r || dt.val == null) continue;
      nData++; if (dt.est) nEst++;
    }
    const showEst = nEst > 0 && nEst < nData;
    G.classed('show-est', showEst);
    G.selectAll('.region').data(feats).enter().append('path')
      .attr('class', 'region').attr('d', path)
      .attr('fill', f => {
        const dt = datum(f);
        if (!dt.r) return LAND_BG;
        if (dt.val == null || dt.val < 0) return NODATA;
        if (dt.val === 0) return ZERO_COL;
        return sc.fn(dt.val);
      })
      .classed('est', f => { const dt = datum(f); return !!dt.est && dt.val != null; })
      .on('mousemove', (e, f) => {
        const dt = datum(f);
        showTip(e, { title: f.properties.name, val: dt.r && dt.val != null ? fmtUnit(dt.val, inds[ind].unit) : 'Sin dato',
          sub: `${inds[ind].label} · ${T.meta.years[j]}`, chip: dt.est ? 'estimado' : (dt.r ? 'observado' : null) });
      }).on('mouseleave', hideTip);
    if (geo.bordersMesh) G.append('path').datum(geo.bordersMesh).attr('class', 'border-mesh').attr('d', path);
    if (geo.outlineMesh) G.append('path').datum(geo.outlineMesh).attr('class', 'outline-mesh').attr('d', path);

    renderLegend(document.querySelector('#trend-legend'), {
      title: inds[ind].label, unit: inds[ind].unit,
      sc, ticks: scaleTicks(sc), fmt,
      note: sc.type === 'log'
        ? 'escala logarítmica · el color de un país significa lo mismo en todos los años'
        : 'escala de potencia (0,42) · el color de un país significa lo mismo en todos los años',
      keys: [{ color: ZERO_COL, label: '0' }, { color: NODATA, label: 'sin dato' },
             { color: LAND_BG, label: 'fuera del conjunto' }],
      foot: showEst
        ? `<span class="dash"></span> trazo discontinuo = celda estimada (${fmt(nEst)} de ${fmt(nData)})`
        : (nData && nEst === nData ? 'todas las celdas de este año son estimaciones' : ''),
    });
  },

  rail(head, body) {
    const ind = State.get('trendInd'); const j = this._yi(State.get('year'));
    const inds = T.meta.indicators;
    head.innerHTML = `<h3>Ranking mundial</h3><p>${inds[ind].label} · ${T.meta.years[j]}</p>`;
    const rows = Object.values(T.countries).map(r => ({ name: r.name, v: r[ind] ? r[ind][j] : null }))
      .filter(r => r.v != null && r.v > 0).sort((a, b) => b.v - a.v).slice(0, 18);
    const max = rows.length ? rows[0].v : 1;
    body.innerHTML = rows.length ? rows.map((r, i) =>
      `<div class="rank-row"><span class="rank-num">${i + 1}</span><div class="rank-body"><div class="rank-name">${r.name}</div><div class="rank-bar" style="width:${Math.max(4, r.v / max * 100)}%;background:${this._isTrade(ind) ? 'var(--aegean)' : 'var(--gold)'}"></div></div><span class="rank-val">${fmt(r.v)}</span></div>`
    ).join('') : '<p style="color:var(--ink-3);font-size:12px">Sin datos.</p>';
  },
  /* CSV of what the map is showing: every territory painted this year, with its
     value, its unit and whether the cell is estimated. The generic fallback in
     app.js only dumped the 18 rows of the side ranking and named the file
     minerva_trend.csv, which said neither indicator nor year. */
  download() {
    const ind = State.get('trendInd'), j = this._yi(State.get('year'));
    const year = T.meta.years[j];
    const meta = T.meta.indicators[ind];
    const esc = v => /[",\r\n;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? '');
    const rows = Object.entries(T.countries)
      .map(([code, r]) => ({ code, name: r.name, v: r[ind] ? r[ind][j] : null,
                             est: r.est ? (Array.isArray(r.est) ? r.est[j] : (r.est[ind] ? r.est[ind][j] : false)) : false }))
      .filter(r => r.v != null)
      .sort((a, b) => b.v - a.v);
    if (!rows.length) return null;
    const head = 'codigo,territorio,indicador,unidad,ano,valor,estimado';
    const body = rows.map(r => [r.code, r.name, meta.label, meta.unit || '', year, r.v, r.est ? 1 : 0]
      .map(esc).join(',')).join('\n');
    return { name: `minerva_tendencias_${ind}_${year}.csv`, csv: `${head}\n${body}` };
  },
  resize() { if (State.get('view') === 'trend') V.update(); },
};
export default V;
