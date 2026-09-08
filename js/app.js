// ════════════════════════════════════════════════════════════════
//  MINERVA · app controller
// ════════════════════════════════════════════════════════════════
import { State } from './state.js?v=20260906m';
import { ICONS } from './utils.js?v=20260906m';
import { moveTip, hideTip } from './tip.js?v=20260906m';
import AtlasView from './views/atlas.js?v=20260906m';
import EvidenceView from './views/evidence.js?v=20260906m';
import TrendView from './views/trend.js?v=20260906m';
import BilateralView from './views/bilateral.js?v=20260906m';
import { renderAbout } from './about.js?v=20260906m';
import { exportActivePng, toast } from './export-png.js?v=20260906m';
import { copyPermalink, readUrlState, resetToDefaults, startPermalink } from './permalink.js?v=20260906m';

const $ = s => document.querySelector(s);
const VIEWS = { atlas: AtlasView, evidence: EvidenceView, trend: TrendView, bilateral: BilateralView };
const ORDER = ['atlas', 'evidence', 'trend', 'bilateral'];
let current = null;

// ─────────────── timeline ───────────────
const TL = {
  el: {}, domain: [1900, 2020], playing: false, timer: null, speeds: [1, 2, 4, 8], si: 0,
  init() {
    this.el = {
      play: $('#tl-play'), speed: $('#tl-speed'), track: $('#tl-track'),
      fill: $('#tl-fill'), handle: $('#tl-handle'), year: $('#tl-year'),
    };
    this.el.play.onclick = () => this.toggle();
    this.el.speed.onclick = () => { this.si = (this.si + 1) % this.speeds.length; this.el.speed.textContent = this.speeds[this.si] + '×'; if (this.playing) this.play(); };
    const seek = ev => {
      const r = this.el.track.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      const y = Math.round(this.domain[0] + t * (this.domain[1] - this.domain[0]));
      State.set('year', y);
    };
    let dragging = false;
    this.el.track.addEventListener('pointerdown', e => { dragging = true; this.el.track.setPointerCapture(e.pointerId); seek(e); });
    this.el.track.addEventListener('pointermove', e => { if (dragging) seek(e); });
    this.el.track.addEventListener('pointerup', () => dragging = false);
  },
  setDomain(d) {
    this.domain = d;
    const y = State.get('year');
    if (y < d[0] || y > d[1]) State.set('year', d[0]);   // keep year if still valid (indicator/scale toggles)
    this.render();
  },
  render() {
    const [a, b] = this.domain, y = State.get('year');
    const t = b > a ? (y - a) / (b - a) : 1;
    this.el.fill.style.width = (t * 100) + '%';
    this.el.handle.style.left = (t * 100) + '%';
    this.el.year.innerHTML = fmtYr(y);
  },
  toggle() { this.playing ? this.pause() : this.play(); },
  play() {
    this.pause(); this.playing = true;
    this.el.play.innerHTML = `<svg viewBox="0 0 24 24">${ICONS.pause}</svg>`;
    const step = 260 / this.speeds[this.si];
    this.timer = setInterval(() => {
      let y = State.get('year') + 1;
      if (y > this.domain[1]) y = this.domain[0];
      State.set('year', y);
    }, step);
  },
  pause() { this.playing = false; clearInterval(this.timer); this.el.play.innerHTML = `<svg viewBox="0 0 24 24">${ICONS.play}</svg>`; },
};
function fmtYr(y) {
  if (y < 0) return `${Math.abs(y)} <small>a.C.</small>`;
  return `${y}`;
}

// ─────────────── view switching ───────────────
function buildSidebar() {
  const nav = $('#sb-nav');
  nav.innerHTML = ORDER.map(id => {
    const v = VIEWS[id];
    return `<button class="sb-btn" data-view="${id}"><svg viewBox="0 0 24 24">${v.icon}</svg><span class="lbl">${v.navLabel}</span></button>`;
  }).join('');
  nav.querySelectorAll('.sb-btn').forEach(b => b.onclick = () => switchView(b.dataset.view));
}

/* ─────────────── rail as a bottom sheet on narrow screens ─────────────── */
function setRail(open) {
  const r = $('#rail'); if (!r) return;
  r.classList.toggle('open', !!open);
  const b = $('#btn-rail'); if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
}
$('#btn-rail').onclick = () => setRail(!$('#rail').classList.contains('open'));
$('#rail-sheet-close').onclick = () => setRail(false);

/* Entering a view sets its year, and the 'year' subscription answers with an
   update() of its own. That second, concurrent update races the one switchView
   is about to await: each starts with ctxG.selectAll('*').remove(), so the
   loser's land backing could land on top of the winner's choropleth and the
   atlas opened as a blank tan world. While a switch is in flight the year
   subscription only refreshes the readouts. */
let switching = false;

async function switchView(id) {
  if (current === id) return;
  switching = true;
  TL.pause();
  hideTip(true);  // a pinned touch card must not follow the reader into the next view
  setRail(false);
  current = id;
  const v = VIEWS[id];
  document.querySelectorAll('.sb-btn').forEach(b => b.classList.toggle('on', b.dataset.view === id));
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('on', el.id === 'view-' + id));
  $('#about').classList.remove('on');
  State.set('view', id);
  $('#footer-src').textContent = v.source || 'Minerva · Historia del olivar';

  // initialise (loads data) BEFORE building controls / rendering
  if (!v._inited) { await v.init({ TL, refreshRail }); v._inited = true; }
  if (current !== id) return; // a newer switch superseded us (the newer one owns the flag)

  // title
  const t = v.title();
  $('#tb-title').innerHTML = `${t.main}${t.sub ? `<span class="sub">${t.sub}</span>` : ''}`;
  // topbar controls
  const tc = $('#tb-controls'); tc.innerHTML = ''; v.controls(tc);
  // rail
  const usesRail = v.usesRail;
  $('#rail').style.display = usesRail ? '' : 'none';
  $('#btn-rail').style.display = usesRail ? '' : 'none';
  if (usesRail) { $('#rail-head').innerHTML = ''; $('#rail-body').innerHTML = ''; }
  // timeline visibility + domain — on entering a view, start at a year that has data.
  // The first year of the domain is often a token one (5 of 249 world regions in 1961,
  // 1 of 785 Andalusian municipalities in 1580): the map opened effectively blank.
  $('#timeline').style.display = v.usesTimeline ? '' : 'none';
  if (v.usesTimeline) {
    const dom = v.yearDomain();
    TL.setDomain(dom);
    State.set('year', v.startYear ? v.startYear() : dom[0]);
  }
  switching = false;
  await v.update();
  refreshCaption();
  if (usesRail) refreshRail();
}

/* Title, year and source printed inside the frame of the map, so a screen
   capture is readable outside the atlas. One caption per view; the evidence
   sub-tabs that are not the map have no frame of their own. */
const CAPTIONS = { atlas: '#atlas-caption', evidence: '#ev-caption', trend: '#trend-caption', bilateral: '#bi-caption' };
function refreshCaption() {
  // `current` is still undefined while the permalink patches the state during
  // boot, and querySelector('') throws a SyntaxError instead of returning null:
  // that killed App.init and left the reader on the cover with "error al cargar"
  // for every link carrying scale/ind/tind/item/dir/met/ev.
  const sel = CAPTIONS[current];
  if (!sel) return;
  const box = document.querySelector(sel);
  if (!box) return;
  const v = VIEWS[current];
  const t = v && v.title ? v.title() : { main: '', sub: '' };
  const y = v && v.usesTimeline ? ` · ${fmtYr(State.get('year')).replace(/<[^>]+>/g, '')}` : '';
  box.querySelector('strong').textContent = `${t.main || ''}${t.sub ? ' — ' + t.sub : ''}${y}`;
  box.querySelector('span').textContent = (v && v.source) || 'Minerva · Historia del olivar';
  const hidden = current === 'evidence' && State.get('evTab') !== 'mapa';
  box.hidden = hidden;
}

function refreshRail() {
  const v = VIEWS[current]; if (!v || !v.usesRail || !v.rail) return;
  v.rail($('#rail-head'), $('#rail-body'));
}

// year changes → update active view (+ timeline readout)
State.subscribe('year', () => {
  TL.render();
  refreshCaption();
  if (switching) return;
  const v = VIEWS[current];
  if (v && v.usesTimeline) { v.update(); if (v.usesRail) refreshRail(); }
});
['atlasInd', 'atlasScale', 'trendInd', 'biItem', 'biDir', 'biMetric', 'evTab']
  .forEach(k => State.subscribe(k, refreshCaption));

// ─────────────── about ───────────────
function openAbout() {
  TL.pause();
  renderAbout($('#about-inner'));
  $('#about').classList.add('on');
}
$('#btn-about').onclick = openAbout;
$('#about-close').onclick = () => $('#about').classList.remove('on');

// ─────────────── footer ───────────────
$('#btn-fs').onclick = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
};
function saveCSV(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
$('#btn-png').onclick = () => { exportActivePng(); };

$('#btn-link').onclick = async () => {
  // The label carries two spans (long / short), so the confirmation goes to the
  // toast instead of overwriting the button's text.
  if (await copyPermalink()) toast('Enlace copiado al portapapeles');
};

// Reset: back to the state the atlas opens in, zoom included.
$('#btn-reset').onclick = async () => {
  TL.pause();
  hideTip(true);
  setRail(false);
  // Same reason as in switchView: the state patch moves the year, and the
  // repaint it would trigger must not race the one switchView awaits.
  switching = true;
  const target = resetToDefaults();
  Object.values(VIEWS).forEach(v => { if (v.resetZoom) v.resetZoom(); });
  if (current === target) { current = null; }
  await switchView(target);
  toast('Vista reiniciada');
};

$('#btn-download').onclick = () => {
  const v = VIEWS[current];
  if (v && v.download) { const d = v.download(); if (d) saveCSV(d.name, d.csv); return; }
  // generic: export the current rail ranking
  const rows = [...document.querySelectorAll('#rail-body .rank-row')].map(r =>
    `"${r.querySelector('.rank-name').textContent.replace(/"/g, '""')}",${r.querySelector('.rank-val').textContent.replace(/[^0-9.,-]/g, '')}`);
  // The fallback name has to carry the year, or the file is not citable.
  if (rows.length) saveCSV(`minerva_${current}_${State.get('year')}.csv`, 'nombre,valor\n' + rows.join('\n'));
};

document.addEventListener('mousemove', e => { const t = $('#tt'); if (t && t.classList.contains('on')) moveTip(e); });
window.addEventListener('resize', () => { const v = VIEWS[current]; if (v && v.resize) v.resize(); });

const App = {
  async init() {
    buildSidebar();
    $('#btn-about').querySelector('svg').innerHTML = ICONS.info;
    TL.init();
    $('#app').classList.add('ready');
    $('#loading').classList.add('gone');
    // A URL that carries state is a citation: restore it before the first paint,
    // then put the reader on the view that was linked.
    const restored = readUrlState();
    if (restored) State.patch(restored.patch);
    await switchView(restored?.patch?.view || 'atlas');
    // The year is applied last: switchView resets it to the first covered year.
    if (restored && restored.year != null) {
      const [lo, hi] = TL.domain;
      if (restored.year >= lo && restored.year <= hi) State.set('year', restored.year);
    }
    startPermalink();
  },
};
export default App;
