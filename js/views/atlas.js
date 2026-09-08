// ════════ Atlas subnacional — olivar 01_tabular ════════
import { State } from '../state.js?v=20260906m';
import Data from '../data-loader.js?v=20260906m';
import { ICONS, seqScale, scaleTicks, fmt, fmtUnit, NODATA, LAND_BG, ZERO_COL,
         coverageByYear, coverageThreshold, firstCoveredYear } from '../utils.js?v=20260906m';
import { mapSetup, sizeOf, fitProjection, observeResize, renderLegend, noAntarctica } from '../mapkit.js?v=20260906m';
import { showTip, hideTip } from '../tip.js?v=20260906m';

const SCALES = {
  world: { label: 'Mundo · regiones', geoType: 'robinson', name: 'id', pad: 8 },
  es_prov: { label: 'España · provincias', geoType: 'mercator', name: 'code', pad: 22 },
  and_muni: { label: 'Andalucía · municipios', geoType: 'mercator', name: 'code', pad: 20 },
};
let SUB, ctxG, ctxSvg, ctxZoom, ro, domainCache = {};

/* Los diccionarios del payload salen de JSON.parse, asi que una clave como
   __proto__, constructor o toString contesta "si existe" por la cadena de
   prototipos: el guardia de mas abajo la daba por buena y el indicador
   imposible llegaba vivo al bucle de pintado (r[ind] is not iterable, mapa
   en blanco). La pertenencia se pregunta siempre por propiedad propia. */
const has = (o, k) => Object.prototype.hasOwnProperty.call(o || {}, k);

/* A hand-edited ?scale= used to hand every caller an undefined payload and
   take the atlas down before it painted anything. The permalink already
   refuses keys outside SCALES; D() closes the other door -- a scale the
   build has not published -- by dropping to the first one that exists. */
function D() {
  const k = State.get('atlasScale');
  if (has(SUB, k)) return SUB[k];
  const fb = Object.keys(SCALES).find(s => has(SUB, s)) || Object.keys(SUB)[0];
  if (fb && fb !== k) State.set('atlasScale', fb);
  return SUB[fb];
}
function regionsOf(d) { return d.regions || d.countries; }

const V = {
  navLabel: 'Atlas', icon: ICONS.atlas, usesTimeline: true, usesRail: true,
  source: 'Olivar · series subnacionales (INE · FAOSTAT · GEHR · Catastro)',
  title: () => ({ main: 'Atlas subnacional del olivar', sub: 'del mundo a la provincia' }),

  async init(ctx) {
    V.ctx = ctx;
    SUB = await Data.subnational();
    const m = mapSetup('#atlas-svg'); ctxSvg = m.svg; ctxG = m.g; ctxZoom = m.zoom;
    ro = observeResize('#atlas-svg', () => { if (State.get('view') === 'atlas') V.update(); });
  },

  yearDomain() {
    // trim to the years that actually have data for the current indicator
    const d = D(), ind = State.get('atlasInd'), regs = regionsOf(d);
    let lo = Infinity, hi = -Infinity;
    for (const r of Object.values(regs)) {
      const arr = r[ind]; if (!arr) continue;
      for (let i = 0; i < arr.length; i++) if (arr[i] != null) { const y = d.years[i]; if (y < lo) lo = y; if (y > hi) hi = y; }
    }
    if (lo === Infinity) { const ys = d.years; return [ys[0], ys[ys.length - 1]]; }
    return [lo, hi];
  },

  _coverage() {
    const d = D();
    return coverageByYear(Object.values(regionsOf(d)), State.get('atlasInd'), d.years.length);
  },

  // Primer año que se ve como un mapa, no como un puñado de territorios sueltos.
  startYear() { const d = D(); return firstCoveredYear(d.years, V._coverage()); },

  /* Al cambiar de escala o de indicador el año elegido puede quedarse en una
     combinación sin datos (p. ej. 1996 del mundo aterriza en 1850 de Andalucía,
     con 1 municipio de 785). En ese caso se salta al primer año con cobertura. */
  _ensureYearHasData() {
    const d = D(), counts = V._coverage();
    const need = coverageThreshold(counts);
    if (!need) return;
    if (counts[V._yearIndex(d, State.get('year'))] < need) State.set('year', V.startYear());
  },

  // El zoom vive en el <g>, no en la geometría: sin reiniciarlo, al cambiar de
  // escala la nueva capa aparecía ampliada ×4 sobre un trozo arbitrario del mapa.
  resetZoom() { if (ctxSvg && ctxZoom) ctxSvg.call(ctxZoom.transform, d3.zoomIdentity); },

  controls(c) {
    const scale = State.get('atlasScale');
    // scale pills
    const pills = document.createElement('div'); pills.className = 'pillset';
    pills.innerHTML = Object.entries(SCALES).map(([k, s]) =>
      `<button class="pill ${k === scale ? 'on' : ''}" data-scale="${k}">${s.label}</button>`).join('');
    pills.querySelectorAll('.pill').forEach(b => b.onclick = () => {
      State.set('atlasScale', b.dataset.scale);
      const inds = D().indicators;
      if (!has(inds, State.get('atlasInd'))) State.set('atlasInd', Object.keys(inds)[0]);
      V.resetZoom();
      V.rebuildControls(); V.ctx.TL.setDomain(V.yearDomain()); V._ensureYearHasData();
      V.update(); V.ctx.refreshRail();
    });
    c.appendChild(pills);
    // indicator select
    const inds = D().indicators; const cur = has(inds, State.get('atlasInd')) ? State.get('atlasInd') : Object.keys(inds)[0];
    State.set('atlasInd', cur);
    const sel = document.createElement('select'); sel.className = 'sel';
    sel.innerHTML = Object.entries(inds).map(([k, i]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${i.label}</option>`).join('');
    sel.onchange = () => { State.set('atlasInd', sel.value); V.ctx.TL.setDomain(V.yearDomain()); V._ensureYearHasData(); V.update(); V.ctx.refreshRail(); };
    c.appendChild(sel);
    // scale type
    const st = document.createElement('div'); st.className = 'pillset';
    const stype = State.get('scaleType');
    /* La pastilla decía "lineal" y nunca lo fue: es una escala de potencia de
       exponente 0,42. Ahora se llama por su nombre. Los valores del permalink
       (pow | log) no cambian. */
    st.innerHTML = `<button class="pill ${stype === 'pow' ? 'on' : ''}" data-t="pow" title="escala de potencia, exponente 0,42">raíz</button><button class="pill ${stype === 'log' ? 'on' : ''}" data-t="log" title="escala logarítmica (por defecto)">log</button>`;
    st.querySelectorAll('.pill').forEach(b => b.onclick = () => { State.set('scaleType', b.dataset.t); V.rebuildControls(); V.update(); });
    c.appendChild(st);
  },
  rebuildControls() { const c = document.querySelector('#tb-controls'); c.innerHTML = ''; V.controls(c); },

  _domain(scaleKey, ind) {
    const key = scaleKey + '|' + ind;
    if (domainCache[key]) return domainCache[key];
    const regs = regionsOf(SUB[scaleKey]); const all = [];
    for (const r of Object.values(regs)) if (r[ind]) for (const v of r[ind]) if (v != null) all.push(v);
    const sc = seqScale(all, { type: State.get('scaleType') });
    domainCache[key + '|' + State.get('scaleType')] = sc; return sc;
  },

  _yearIndex(d, year) {
    const ys = d.years; let best = 0, bd = 1e9;
    for (let i = 0; i < ys.length; i++) { const dd = Math.abs(ys[i] - year); if (dd < bd) { bd = dd; best = i; } }
    return best;
  },

  async update() {
    const scale = State.get('atlasScale'), ind = State.get('atlasInd');
    const d = D(); const regs = regionsOf(d);
    const geo = await Data.geo(d.geo);
    const [w, h] = sizeOf('#atlas-svg');
    ctxSvg.attr('viewBox', `0 0 ${w} ${h}`);
    // España: drop Canarias (35,38) so the peninsula fills the frame (olive there is negligible)
    let feats = geo.features;
    if (scale === 'es_prov') feats = feats.filter(f => !['35', '38'].includes(String(f.properties.code)));
    // fit: world scale frames the whole globe (region geometry spans it); else fit to the regions
    // Every fetch is resolved BEFORE a single node is touched. Two updates can
    // be in flight at once (a view switch and the ResizeObserver of the same
    // svg): if one of them awaited after ctxG.selectAll('*').remove(), its land
    // backing landed on top of the other's choropleth and the atlas opened as a
    // blank tan world. With no await left after the first mutation, the last
    // writer simply wins, whole.
    const worldGeo = (scale === 'world' || scale === 'es_prov') ? await Data.geo('geo_world.json') : null;
    let fitFeats = feats;
    if (scale === 'world') fitFeats = noAntarctica(worldGeo.features);
    const proj = fitProjection(fitFeats, w, h, { type: SCALES[scale].geoType, pad: SCALES[scale].pad || 10 });
    const path = d3.geoPath(proj);
    const scKey = scale + '|' + ind + '|' + State.get('scaleType');
    const sc = seqScale((() => { const a = []; for (const r of Object.values(regs)) if (r[ind]) for (const v of r[ind]) if (v != null) a.push(v); return a; })(), { type: State.get('scaleType') });
    const j = V._yearIndex(d, State.get('year'));
    const snapYear = d.years[j];
    document.querySelector('#atlas-year').textContent = snapYear < 0 ? Math.abs(snapYear) + ' a.C.' : snapYear;

    const nameKey = SCALES[scale].name;
    const datum = f => {
      const k = String(f.properties[nameKey]);   // 'id' (world) | 'code' (es/and)
      const r = regs[k]; if (!r) return { r: null, val: undefined, est: false, name: f.properties.name || f.properties.NAME || k, k };
      const val = r[ind] ? r[ind][j] : null;
      const est = r.est ? (Array.isArray(r.est) ? r.est[j] : (r.est[ind] ? r.est[ind][j] : false)) : false;
      return { r, val, est, name: r.name || k, k };
    };

    ctxG.selectAll('*').remove();
    /* Tres cosas que no son valores, y que desde 2026-09-06 se separan de la
       rampa y entre sí por hue además de por claridad (ver utils.js):
       LAND_BG = tierra fuera del conjunto · NODATA = dentro pero sin valor este
       año · ZERO_COL = medido, y no hay olivar. */
    const fillOf = f => {
      const dt = datum(f);
      if (dt.r == null) return scale === 'world' ? LAND_BG : NODATA;
      if (dt.val == null) return NODATA;   // NA ≠ 0
      if (dt.val === 0) return ZERO_COL;
      if (dt.val < 0) return NODATA;
      return sc.fn(dt.val) || ZERO_COL;
    };
    /* La leyenda prometía "trazo discontinuo = estimación" y el mapa no dibujaba
       ninguno: .region.est no tenía regla de estilo. Ahora la tiene, pero solo se
       enciende cuando la marca dice algo — en las provincias españolas el 100 %
       de las celdas son estimaciones y rayar el mapa entero no informa de nada;
       en ese caso la leyenda lo dice con palabras. */
    let nData = 0, nEst = 0;
    for (const f of feats) {
      const dt = datum(f);
      if (dt.r == null || dt.val == null) continue;
      nData++; if (dt.est) nEst++;
    }
    const showEst = nEst > 0 && nEst < nData;
    ctxG.classed('show-est', showEst);
    // solid land backing — fills coverage holes so the stage never shows through
    if (scale === 'world') {
      const wf = noAntarctica(worldGeo.features);
      // uniform world land, NO country borders (only region borders are drawn)
      ctxG.append('path').datum({ type: 'FeatureCollection', features: wf }).attr('d', path)
        .attr('fill', LAND_BG).attr('stroke', 'none');
    } else if (scale === 'es_prov') {
      const es = worldGeo.features.find(f => f.properties.name === 'Spain');
      if (es) ctxG.append('path').datum(es).attr('d', path).attr('fill', NODATA).attr('stroke', 'none');
    } else {
      ctxG.append('g').selectAll('path').data(feats).enter().append('path')
        .attr('d', path).attr('fill', NODATA)
        .style('stroke', NODATA).style('stroke-width', 2.6).style('stroke-linejoin', 'round');
    }
    // data choropleth (world geometry is clean → thin border; es/and dilate to close source gaps)
    const strokeColor = scale === 'world' ? 'rgba(120,96,54,.28)' : fillOf;
    const strokeW = scale === 'world' ? 0.3 : 0.9;
    ctxG.selectAll('.region').data(feats).enter().append('path')
      .attr('class', d => 'region')
      .attr('d', path)
      .attr('fill', fillOf)
      .style('stroke', strokeColor).style('stroke-width', strokeW)
      .classed('est', f => { const dt = datum(f); return !!dt.est && dt.val != null; })
      .classed('sel', f => datum(f).k === State.get('selected'))
      .on('mousemove', (e, f) => {
        const dt = datum(f);
        showTip(e, {
          title: dt.name, val: dt.val == null ? 'Sin dato' : (dt.val === 0 ? '0 ' + d.indicators[ind].unit + ' · sin olivar' : fmtUnit(dt.val, d.indicators[ind].unit)),
          sub: `${d.indicators[ind].label} · ${snapYear < 0 ? Math.abs(snapYear) + ' a.C.' : snapYear}${scale === 'world' && dt.r && dt.r.iso3 === 'ESP' ? ' · clic: ver provincias' : ''}`,
          chip: dt.est ? 'estimado' : (dt.r && dt.val != null ? 'observado' : null),
        });
      })
      .on('mouseleave', hideTip)
      .on('click', (e, f) => {
        const dt = datum(f);
        if (scale === 'world' && dt.r && dt.r.iso3 === 'ESP') {   // España: drill a datos provinciales (más finos)
          State.set('atlasScale', 'es_prov'); V.resetZoom(); V.rebuildControls();
          V.ctx.TL.setDomain(V.yearDomain()); V._ensureYearHasData();
          V.update(); V.ctx.refreshRail(); return;
        }
        State.set('selected', dt.k === State.get('selected') ? null : dt.k); V.update();
      });

    // borders (topojson mesh) or per-path handled by stroke
    if (geo.bordersMesh) ctxG.append('path').datum(geo.bordersMesh).attr('class', 'border-mesh').attr('d', path);
    if (geo.outlineMesh && scale === 'world') ctxG.append('path').datum(geo.outlineMesh).attr('class', 'outline-mesh').attr('d', path);

    renderLegend(document.querySelector('#atlas-legend'), {
      title: d.indicators[ind].label, unit: d.indicators[ind].unit,
      sc, ticks: scaleTicks(sc), fmt,
      note: sc.type === 'log'
        ? 'escala logarítmica · el color de un territorio significa lo mismo en todos los años'
        : 'escala de potencia (0,42) · el color de un territorio significa lo mismo en todos los años',
      keys: [{ color: ZERO_COL, label: '0 · sin olivar' }, { color: NODATA, label: 'sin dato' }]
        .concat(scale === 'world' ? [{ color: LAND_BG, label: 'fuera del conjunto' }] : []),
      foot: showEst
        ? `<span class="dash"></span> trazo discontinuo = celda estimada (${fmt(nEst)} de ${fmt(nData)})`
        : (nData && nEst === nData ? 'todas las celdas de este año son estimaciones' : ''),
    });
  },

  rail(head, body) {
    const scale = State.get('atlasScale'), ind = State.get('atlasInd');
    const d = D(); const regs = regionsOf(d); const j = V._yearIndex(d, State.get('year'));
    const canRel = scale === 'world' && ind !== 'share' && ind !== 'yield';   // relativo = valor / superficie del territorio
    const rel = canRel && State.get('rankMode') === 'rel';
    head.innerHTML = `<h3>Ranking · ${d.indicators[ind].label}</h3><p>${scale === 'world' ? 'Regiones' : scale === 'es_prov' ? 'Provincias' : 'Municipios'} · ${d.years[j] < 0 ? Math.abs(d.years[j]) + ' a.C.' : d.years[j]}</p>` +
      (canRel ? `<div class="pillset" style="margin-top:7px"><button class="pill ${!rel ? 'on' : ''}" data-rk="total">Total</button><button class="pill ${rel ? 'on' : ''}" data-rk="rel">Por superficie</button></div>` : '');
    const rows = Object.entries(regs).map(([k, r]) => {
      let v = r[ind] ? r[ind][j] : null;
      if (rel && v != null && r.surf) v = v / r.surf * (ind === 'area' ? 100 : 1000);  // area→%, prod→kg/ha de territorio
      else if (rel) v = null;
      return { k, name: (r.name || k) + (scale === 'world' && r.iso3 ? ` · ${r.iso3}` : ''), v };
    }).filter(r => r.v != null && r.v > 0).sort((a, b) => b.v - a.v).slice(0, 18);
    const max = rows.length ? rows[0].v : 1;
    const suf = rel ? (ind === 'area' ? ' %' : ' kg/ha') : '';
    body.innerHTML = rows.length ? rows.map((r, i) =>
      `<div class="rank-row"><span class="rank-num">${i + 1}</span><div class="rank-body"><div class="rank-name">${r.name}</div><div class="rank-bar" style="width:${Math.max(4, r.v / max * 100)}%"></div></div><span class="rank-val">${fmt(r.v)}${suf}</span></div>`
    ).join('') : '<p style="color:var(--ink-3);font-size:12px">Sin datos para este año.</p>';
    head.querySelectorAll('[data-rk]').forEach(b => b.onclick = () => { State.set('rankMode', b.dataset.rk); V.ctx.refreshRail(); });
  },

  /* CSV of what the map is showing: every territory of the visible scale with
     its value at the visible year, plus the estimated flag. The generic
     fallback in app.js only dumped the 18 rows of the side ranking, and named
     the file minerva_atlas.csv — neither indicator nor year. */
  download() {
    const scale = State.get('atlasScale'), ind = State.get('atlasInd');
    const d = D(), regs = regionsOf(d), j = V._yearIndex(d, State.get('year'));
    const year = d.years[j];
    const meta = d.indicators[ind];
    const esc = v => /[",\r\n;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? '');
    const rows = Object.entries(regs).map(([k, r]) => ({
      k, iso: r.iso3 || '', name: r.name || k,
      v: r[ind] ? r[ind][j] : null,
      est: r.est ? (Array.isArray(r.est) ? r.est[j] : (r.est[ind] ? r.est[ind][j] : false)) : false,
    })).filter(r => r.v != null).sort((a, b) => b.v - a.v);
    if (!rows.length) return null;
    const head = 'codigo,iso3,territorio,escala,indicador,unidad,ano,valor,estimado';
    const body = rows.map(r => [r.k, r.iso, r.name, scale, meta.label, meta.unit || '', year, r.v, r.est ? 1 : 0]
      .map(esc).join(',')).join('\n');
    const tag = year < 0 ? `${Math.abs(year)}aC` : year;
    return { name: `minerva_atlas_${scale}_${ind}_${tag}.csv`, csv: `${head}\n${body}` };
  },

  resize() { if (State.get('view') === 'atlas') V.update(); },
};
export default V;
