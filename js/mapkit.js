// shared map plumbing: zoomable svg, projection fit, resize observer
export function mapSetup(svgSel) {
  const svg = d3.select(svgSel);
  svg.selectAll('*').remove();
  const g = svg.append('g');
  const zoom = d3.zoom().scaleExtent([0.6, 12]).on('zoom', e => g.attr('transform', e.transform));
  svg.call(zoom).on('dblclick.zoom', null);
  return { svg, g, zoom };
}
export function sizeOf(svgSel) {
  const el = document.querySelector(svgSel);
  const r = el.getBoundingClientRect();
  return [Math.max(320, r.width), Math.max(240, r.height)];
}
export function fitProjection(features, w, h, { type = 'mercator', pad = 26, center, scale } = {}) {
  const proj = type === 'robinson' && d3.geoRobinson ? d3.geoRobinson()
    : type === 'natural' ? d3.geoNaturalEarth1()
    : type === 'equal' ? d3.geoEqualEarth() : d3.geoMercator();
  if (center && scale) { proj.center(center).scale(scale).translate([w / 2, h / 2]); }
  else proj.fitExtent([[pad, pad], [w - pad, h - pad]], { type: 'FeatureCollection', features });
  return proj;
}
// world features minus Antarctica (and tiny sliver islands) for cleaner global maps
export function noAntarctica(features) {
  return features.filter(f => (f.properties && f.properties.name) !== 'Antarctica');
}
export function observeResize(svgSel, fn) {
  let t; const el = document.querySelector(svgSel);
  const ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(fn, 120); });
  ro.observe(el.parentElement);
  return ro;
}
/* Legend for a continuous choropleth.
   Until 2026-09-06 this drew eight equal blocks over a continuous fill, with a
   number only at each end. It promised classes the map does not have, and the
   blocks were equally spaced in ramp index while the map maps values through a
   log (or power) transform, so a block sat wherever the eye put it and nowhere
   the data did. It is now the ramp itself, sampled from the same scale object
   the map paints with, with the value ticks standing at the position that scale
   actually gives them and the transform named out loud. */
export function renderLegend(el, { title, unit, sc, ticks = [], fmt = String, note, keys = [], foot }) {
  const N = 40;
  const stops = [];
  for (let i = 0; i <= N; i++) stops.push(`${sc.at(i / N)} ${(i / N * 100).toFixed(1)}%`);
  const tickMarks = ticks.map(t =>
    `<i style="left:${(t.t * 100).toFixed(2)}%"></i>`).join('');
  const tickLabels = ticks.map(t =>
    `<span style="left:${(t.t * 100).toFixed(2)}%">${fmt(t.v)}</span>`).join('');
  el.innerHTML =
    `<div class="legend-title">${title}${unit ? ` · ${unit}` : ''}</div>` +
    `<div class="legend-bar cont" style="background:linear-gradient(to right,${stops.join(',')})">${tickMarks}</div>` +
    (ticks.length ? `<div class="legend-ticks">${tickLabels}</div>` : '') +
    `<div class="legend-labels"><span>${fmt(sc.min)}</span><span>${fmt(sc.max)}</span></div>` +
    (note ? `<div class="legend-note">${note}</div>` : '') +
    (keys.length ? `<div class="legend-keys">${keys.map(k =>
      `<span class="lk"><i style="background:${k.color}"></i>${k.label}</span>`).join('')}</div>` : '') +
    (foot ? `<div class="legend-foot">${foot}</div>` : '');
}
