// ════════ Flujos bilaterales — Comtrade DB3 ════════
import { State } from '../state.js?v=20260906m';
import Data from '../data-loader.js?v=20260906m';
import { ICONS, fmt } from '../utils.js?v=20260906m';
import { mapSetup, sizeOf, fitProjection, observeResize, noAntarctica } from '../mapkit.js?v=20260906m';
import { showTip, hideTip } from '../tip.js?v=20260906m';

let B, G, SVG, ZOOM, GEO, FEATS, CENTROID = {}, PROJ, PATH, countryList = [];
const MET = { v: { label: 'Valor', unit: 'USD', pre: '$ ', suf: '' }, w: { label: 'Volumen', unit: 't', pre: '', suf: ' t' } };
const fmtM = (x, m) => MET[m].pre + fmt(x) + MET[m].suf;
// Snapshot taken at import time, before the permalink can patch the state:
// the item an unknown ?item= falls back to (same trick as permalink.js).
// Object.keys() would not do: numeric-looking keys come out sorted, so the
// "first" item of the payload is 260 (aceitunas), not 261 (aceite de oliva).
const DEFAULT_ITEM = State.get('biItem');

// Mismo guardia que en atlas.js y trend.js: B.meta.items y B.totals vienen
// de JSON.parse, y un ?item=toString respondia "existe" por la cadena de
// prototipos, dejaba pasar el codigo imposible y el mapa salia vacio.
const has = (o, k) => Object.prototype.hasOwnProperty.call(o || {}, k);

const V = {
  navLabel: 'Comercio', icon: ICONS.bilateral, usesTimeline: true, usesRail: true,
  source: 'UN Comtrade · FAOSTAT DB3 · comercio bilateral del aceite de oliva',
  title: () => ({ main: 'Flujos bilaterales', sub: 'el viaje del aceite entre países' }),

  async init(ctx) {
    V.ctx = ctx;
    B = await Data.bilateral();
    GEO = await Data.geo('geo_world.json');
    FEATS = noAntarctica(GEO.features);
    FEATS.forEach(f => { CENTROID[f.properties.name] = d3.geoCentroid(f); });
    const m = mapSetup('#bi-svg'); SVG = m.svg; G = m.g; ZOOM = m.zoom;
    observeResize('#bi-svg', () => { if (State.get('view') === 'bilateral') V.update(); });
    V._buildCountryList();
  },
  yearDomain() { const ys = B.meta.years; return [ys[0], ys[ys.length - 1]]; },

  /* The item list lives in the payload, so the permalink cannot check it:
     a hand-edited ?item= with an unknown code used to reach B.totals[item]
     as undefined and take the whole view down. Anything the payload does
     not carry falls back to the item the view opens with, in silence. */
  _item() {
    const items = B.meta.items || {};
    const cur = State.get('biItem');
    if (has(items, cur) && has(B.totals, cur)) return cur;
    const fallback = (has(items, DEFAULT_ITEM) && has(B.totals, DEFAULT_ITEM))
      ? DEFAULT_ITEM : Object.keys(items).find(k => has(B.totals, k));
    if (fallback) State.set('biItem', fallback);
    return fallback || cur;
  },

  _buildCountryList() {
    const item = V._item(), dir = State.get('biDir'), met = State.get('biMetric');
    const idx = met === 'w' ? 3 : 2, key = dir === 'import' ? 'im' : 'ex';
    const tot = has(B.totals, item) ? B.totals[item] : null; if (!tot) { countryList = []; return; }
    const acc = {};
    for (const y of Object.keys(tot)) for (const r of tot[y][key]) { acc[r[0]] = acc[r[0]] || { name: r[1], v: 0 }; acc[r[0]].v += r[idx]; }
    countryList = Object.entries(acc).map(([iso, o]) => ({ iso, name: o.name, v: o.v })).sort((a, b) => b.v - a.v).slice(0, 34);
    if (State.get('biExporter') !== 'all' && !countryList.find(e => e.iso === State.get('biExporter'))) State.set('biExporter', 'all');
  },

  controls(c) {
    const items = B.meta.items;
    c.appendChild(sel('bi-item', Object.entries(items).map(([k, l]) => [k, l]), State.get('biItem'), v => { State.set('biItem', v); V._buildCountryList(); V.rebuild(); V.update(); V.ctx.refreshRail(); }));
    // direction pills
    const dir = document.createElement('div'); dir.className = 'pillset';
    dir.innerHTML = `<button class="pill ${State.get('biDir') === 'export' ? 'on' : ''}" data-d="export">Exporta ↗</button><button class="pill ${State.get('biDir') === 'import' ? 'on' : ''}" data-d="import">Importa ↘</button>`;
    dir.querySelectorAll('.pill').forEach(b => b.onclick = () => { State.set('biDir', b.dataset.d); V._buildCountryList(); V.rebuild(); V.update(); V.ctx.refreshRail(); });
    c.appendChild(dir);
    // country select
    const opts = [['all', State.get('biDir') === 'import' ? 'Todos los importadores' : 'Todos los exportadores']].concat(countryList.map(e => [e.iso, e.name]));
    c.appendChild(sel('bi-country', opts, State.get('biExporter'), v => { State.set('biExporter', v); V.update(); V.ctx.refreshRail(); }));
    // metric pills
    const met = document.createElement('div'); met.className = 'pillset';
    met.innerHTML = `<button class="pill ${State.get('biMetric') === 'v' ? 'on' : ''}" data-m="v">Valor&nbsp;$</button><button class="pill ${State.get('biMetric') === 'w' ? 'on' : ''}" data-m="w">Volumen&nbsp;t</button>`;
    met.querySelectorAll('.pill').forEach(b => b.onclick = () => { State.set('biMetric', b.dataset.m); V._buildCountryList(); V.rebuild(); V.update(); V.ctx.refreshRail(); });
    c.appendChild(met);
  },
  rebuild() { const c = document.querySelector('#tb-controls'); c.innerHTML = ''; V.controls(c); },

  _flows() {
    const item = State.get('biItem'), y = State.get('year'), country = State.get('biExporter'), dir = State.get('biDir'), met = State.get('biMetric');
    let arr = (B.flows[item] && B.flows[item][y]) || [];
    arr = country === 'all' ? arr.slice() : arr.filter(d => (dir === 'import' ? d.im : d.ex) === country);
    arr = arr.filter(d => CENTROID[d.exn] && CENTROID[d.imn]);
    arr.sort((a, b) => b[met] - a[met]);
    return arr.slice(0, country === 'all' ? 46 : 32);
  },

  _ribbon(p0, p1, wmax) {
    const dist = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const curv = Math.min(dist * 0.26, 120);
    const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2, cp = [mx, Math.max(14, my - curv)];
    const N = 44, pts = [];
    for (let i = 0; i <= N; i++) { const t = i / N, u = 1 - t; pts.push([u * u * p0[0] + 2 * u * t * cp[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * cp[1] + t * t * p1[1]]); }
    const top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const wl = wmax * (Math.sin(i / N * Math.PI) * 0.5 + 0.5);
      const a = pts[Math.min(i + 1, N)], b = pts[Math.max(i - 1, 0)];
      let nx = -(a[1] - b[1]), ny = a[0] - b[0]; const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
      top.push([pts[i][0] + nx * wl, pts[i][1] + ny * wl]); bot.push([pts[i][0] - nx * wl, pts[i][1] - ny * wl]);
    }
    return 'M' + top.map(p => p.join(',')).join('L') + 'L' + bot.reverse().map(p => p.join(',')).join('L') + 'Z';
  },

  async update() {
    const [w, h] = sizeOf('#bi-svg');
    SVG.attr('viewBox', `0 0 ${w} ${h}`);
    PROJ = fitProjection(FEATS, w, h, { type: 'robinson', pad: 10 });
    PATH = d3.geoPath(PROJ);
    document.querySelector('#bi-year').textContent = State.get('year');
    const met = State.get('biMetric'), dir = State.get('biDir'), country = State.get('biExporter');
    const flows = this._flows();
    const maxV = d3.max(flows, d => d[met]) || 1;
    const wScale = d3.scalePow().exponent(0.6).domain([0, maxV]).range([0.6, 13]).clamp(true);
    // node totals (the "other" endpoint)
    const recv = {}; flows.forEach(f => { const k = dir === 'import' ? f.exn : f.imn; recv[k] = (recv[k] || 0) + f[met]; });
    const focusNodes = new Set(flows.map(f => dir === 'import' ? f.imn : f.exn)); // highlighted country side
    const ribbonColor = dir === 'import' ? 'var(--aegean)' : 'var(--gold)';

    G.selectAll('*').remove();
    G.append('path').datum({ type: 'FeatureCollection', features: FEATS }).attr('d', PATH)
      .attr('fill', 'var(--land-bg,#DCD0BB)').attr('stroke', 'rgba(120,96,54,.25)').attr('stroke-width', .4);
    if (GEO.bordersMesh) G.append('path').datum(GEO.bordersMesh).attr('class', 'border-mesh').attr('d', PATH);

    const gArc = G.append('g');
    flows.forEach((f, i) => {
      const p0 = PROJ(CENTROID[f.exn]), p1 = PROJ(CENTROID[f.imn]); if (!p0 || !p1) return;
      gArc.append('path').attr('d', this._ribbon(p0, p1, wScale(f[met]))).attr('fill', ribbonColor)
        .attr('fill-opacity', 0).style('pointer-events', 'stroke')
        .on('mousemove', e => showTip(e, { title: `${f.exn} → ${f.imn}`, val: fmtM(f[met], met), sub: `${met === 'v' ? fmt(f.w) + ' t' : '$ ' + fmt(f.v)} · ${B.meta.items[State.get('biItem')]} · ${State.get('year')}` }))
        .on('mouseleave', hideTip)
        .transition().delay(i * 20).duration(600).attr('fill-opacity', country === 'all' ? 0.4 : 0.5);
    });

    const gN = G.append('g');
    Object.entries(recv).forEach(([name, v]) => {
      const p = PROJ(CENTROID[name]); if (!p) return;
      gN.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', Math.max(2.4, Math.min(11, Math.sqrt(v / maxV) * 13)))
        .attr('fill', dir === 'import' ? 'var(--terra)' : 'var(--aegean)').attr('fill-opacity', .8).attr('stroke', 'var(--paper)').attr('stroke-width', 1)
        .on('mousemove', e => showTip(e, { title: name, val: fmtM(v, met), sub: dir === 'import' ? 'exporta hacia el país' : 'importaciones recibidas' })).on('mouseleave', hideTip);
    });
    focusNodes.forEach(name => {
      const p = PROJ(CENTROID[name]); if (!p) return;
      gN.append('circle').attr('class', 'bi-src').attr('cx', p[0]).attr('cy', p[1]).attr('r', 4.6);
      if (country !== 'all') gN.append('text').attr('class', 'bi-label').attr('x', p[0] + 6).attr('y', p[1] + 3).text(name);
    });

    document.querySelector('#bi-legend').innerHTML =
      `<div class="legend-title">${dir === 'import' ? 'Importaciones' : 'Exportaciones'} de ${B.meta.items[State.get('biItem')]} · ${State.get('year')}</div>` +
      // Los dos puntos redondos son la leyenda de los nodos redondos del mapa:
      // excepción consciente a los bordes cuadrados.
      `<div class="legend-foot"><span style="width:11px;height:11px;border-radius:50%;background:var(--terra);display:inline-block"></span> ${dir === 'import' ? 'importador' : 'exportador'} &nbsp; <span style="width:11px;height:11px;border-radius:50%;background:var(--aegean);display:inline-block"></span> ${dir === 'import' ? 'exportador' : 'importador'}</div>` +
      `<div class="legend-foot">Grosor ∝ ${MET[met].label.toLowerCase()} (${MET[met].unit})</div>`;
  },

  rail(head, body) {
    const item = State.get('biItem'), y = State.get('year'), country = State.get('biExporter'), dir = State.get('biDir'), met = State.get('biMetric');
    const idx = met === 'w' ? 3 : 2, tot = B.totals[item][y];
    if (country === 'all') {
      const key = dir === 'import' ? 'im' : 'ex';
      head.innerHTML = `<h3>Mayores ${dir === 'import' ? 'importadores' : 'exportadores'}</h3><p>${B.meta.items[item]} · ${MET[met].label} · ${y}</p>`;
      const rows = (tot ? tot[key] : []).slice().sort((a, b) => b[idx] - a[idx]).slice(0, 16);
      const max = rows.length ? rows[0][idx] : 1;
      body.innerHTML = rows.map((r, i) => `<div class="rank-row"><span class="rank-num">${i + 1}</span><div class="rank-body"><div class="rank-name">${r[1]}</div><div class="rank-bar" style="width:${Math.max(4, r[idx] / max * 100)}%;background:var(--terra)"></div></div><span class="rank-val">${fmtM(r[idx], met)}</span></div>`).join('');
    } else {
      const flows = this._flows();
      const name = (dir === 'import' ? flows[0]?.imn : flows[0]?.exn) || countryList.find(e => e.iso === country)?.name || country;
      head.innerHTML = `<h3>${name}</h3><p>${dir === 'import' ? 'Procedencia del aceite' : 'Destinos del aceite'} · ${MET[met].label} · ${y}</p>`;
      const max = flows.length ? flows[0][met] : 1;
      body.innerHTML = flows.length ? flows.map((f, i) => {
        const other = dir === 'import' ? f.exn : f.imn;
        return `<div class="rank-row"><span class="rank-num">${i + 1}</span><div class="rank-body"><div class="rank-name">${other}</div><div class="rank-bar" style="width:${Math.max(4, f[met] / max * 100)}%;background:var(--aegean)"></div></div><span class="rank-val">${fmtM(f[met], met)}</span></div>`;
      }).join('') : '<p style="color:var(--ink-3);font-size:12px">Sin flujos registrados este año.</p>';
    }
  },
  download() {
    const flows = this._flows(); const q = s => `"${String(s).replace(/"/g, '""')}"`;
    const rows = flows.map(f => [f.exn, f.imn, f.v, f.w].map(q).join(','));
    return { name: 'minerva_bilateral.csv', csv: 'exportador,importador,valor_usd,volumen_t\n' + rows.join('\n') };
  },
  resize() { if (State.get('view') === 'bilateral') V.update(); },
};
function sel(id, opts, cur, onchange) {
  const s = document.createElement('select'); s.className = 'sel'; s.id = id;
  s.innerHTML = opts.map(([v, l]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`).join('');
  s.onchange = () => onchange(s.value); return s;
}
export default V;
