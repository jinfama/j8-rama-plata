// ════════════════════════════════════════════════════════════════
//  MINERVA · state — tiny pub/sub store
// ════════════════════════════════════════════════════════════════
const _s = {
  view: 'atlas',                 // atlas | evidence | trend | bilateral | about
  // atlas (subnational)
  atlasScale: 'world',           // world | es_prov | and_muni
  atlasInd: 'area',
  rankMode: 'total',             // total | rel (por superficie del territorio)
  // trend
  trendInd: 'production',
  // bilateral
  biItem: '261',
  biExporter: 'all',
  biDir: 'export',        // export | import  (rol del país seleccionado)
  biMetric: 'v',          // v = valor USD | w = volumen toneladas
  // shared timeline
  year: 2020,
  yearRange: [1900, 2020],
  playing: false,
  speed: 140,
  scaleType: 'log',              // log | pow — log by default since 2026-09-06 (ver CLAUDE.md)
  // evidence
  evTab: 'mapa',                 // mapa | st | tipo | qa  (mirrored in the permalink)
  evTypes: null,                 // Set of active types (null = all)
  evRange: [-1500, 2026],
  selected: null,                // hovered/clicked region key
};
const subs = new Map();          // key -> Set(fn)
const wild = new Set();

export const State = {
  get: k => _s[k],
  all: () => _s,
  set(k, v) {
    if (JSON.stringify(_s[k]) === JSON.stringify(v)) return;
    _s[k] = v;
    (subs.get(k) || []).forEach(fn => fn(v, k));
    wild.forEach(fn => fn(v, k));
  },
  patch(obj) { Object.entries(obj).forEach(([k, v]) => this.set(k, v)); },
  subscribe(k, fn) {
    if (k === '*') { wild.add(fn); return; }
    if (!subs.has(k)) subs.set(k, new Set());
    subs.get(k).add(fn);
  },
};
