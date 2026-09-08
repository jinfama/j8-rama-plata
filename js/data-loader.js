// ════════════════════════════════════════════════════════════════
//  MINERVA · data-loader — fetch + cache payloads & geometry
// ════════════════════════════════════════════════════════════════
const V = '20260905a';
const _cache = {};
const _geo = {};
const _promises = {};

async function _get(path) {
  if (_cache[path]) return _cache[path];
  if (!_promises[path]) {
    _promises[path] = fetch(`${path}?v=${V}`).then(r => {
      if (!r.ok) throw new Error(`${path}: ${r.status}`);
      return r.json();
    }).then(j => (_cache[path] = j));
  }
  return _promises[path];
}

export const Data = {
  // ---- core payloads ----
  subnational: () => _get('data/subnational.json'),
  trend: () => _get('data/trend.json'),
  bilateral: () => _get('data/bilateral.json'),
  evidence: () => _get('data/evidence.json'),
  names: () => _get('data/geo_names.json'),

  // ---- geometry (topojson or geojson) ----
  async geo(file) {
    if (_geo[file]) return _geo[file];
    const raw = await _get('data/' + file);
    let features, object = null;
    if (raw.type === 'Topology') {
      // pick object: prefer 'countries' | 'data' | first
      const key = raw.objects.countries ? 'countries' : (raw.objects.data ? 'data' : Object.keys(raw.objects)[0]);
      object = key;
      const fc = topojson.feature(raw, raw.objects[key]);
      features = fc.features;
      _geo[file] = { features, topo: raw, object: key, mesh: (a, b) => topojson.mesh(raw, raw.objects[key], a === undefined ? undefined : a) };
      // convenience meshes
      _geo[file].bordersMesh = topojson.mesh(raw, raw.objects[key], (a, b) => a !== b);
      _geo[file].outlineMesh = topojson.mesh(raw, raw.objects[key], (a, b) => a === b);
    } else {
      features = raw.features;
      _geo[file] = { features, topo: null };
    }
    return _geo[file];
  },

  // preload the light stuff needed before first paint
  async boot() {
    await Promise.all([this.names(), this.subnational(), this.geo('geo_world.json')]);
  },
};
export default Data;
