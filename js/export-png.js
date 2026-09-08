// PNG export of what the active view is actually showing.
//
// "Descargar datos" makes the numbers citable; this makes the figure citable.
// The visible SVG is cloned, its computed styles are inlined (CSS classes do
// not travel inside a serialised SVG) and the result is drawn on the parchment
// with a caption that repeats title, year and source, so a screenshot pasted
// into a slide still reads on its own.

import { State } from './state.js?v=20260906m';

const SCALE = 2;
const CAPTION_H = 62;
const PAPER = '#F2EEE1';
const INK = '#28311D';
const INK_2 = '#4C5738';
const TERRA = '#B05620';

const STYLE_PROPS = [
  'fill', 'fill-opacity', 'fill-rule',
  'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray',
  'stroke-linecap', 'stroke-linejoin',
  'opacity', 'display', 'visibility',
  'font-family', 'font-size', 'font-weight', 'font-style',
  'letter-spacing', 'text-anchor', 'dominant-baseline',
  'paint-order', 'mix-blend-mode', 'shape-rendering',
];

function slug(value) {
  return String(value ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'figura';
}

function activeSvg() {
  const view = document.querySelector('.view.on');
  if (!view) return null;
  const svgs = [...view.querySelectorAll('svg')].filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 80 && r.height > 80;
  });
  if (!svgs.length) return null;
  return svgs.sort((a, b) => {
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    return (rb.width * rb.height) - (ra.width * ra.height);
  })[0];
}

function inlineStyles(source, clone) {
  const from = source.querySelectorAll('*');
  const to = clone.querySelectorAll('*');
  const apply = (src, dst) => {
    const cs = window.getComputedStyle(src);
    let text = '';
    for (const prop of STYLE_PROPS) {
      const value = cs.getPropertyValue(prop);
      if (value && value !== 'normal' && value !== 'auto') text += `${prop}:${value};`;
    }
    dst.setAttribute('style', text);
  };
  apply(source, clone);
  for (let i = 0; i < from.length && i < to.length; i++) apply(from[i], to[i]);
}

function fmtYear(y) {
  if (y == null) return '';
  return y < 0 ? `${Math.abs(y)} a.C.` : String(y);
}

export function captionFor() {
  const titleEl = document.querySelector('#tb-title');
  const main = titleEl ? (titleEl.childNodes[0]?.textContent || titleEl.textContent || '').trim() : '';
  const sub = titleEl?.querySelector('.sub')?.textContent?.trim() || '';
  const timelineOn = document.querySelector('#timeline')?.style.display !== 'none';
  return {
    title: [main, sub].filter(Boolean).join(' — '),
    when: timelineOn ? fmtYear(State.get('year')) : '',
    source: document.getElementById('footer-src')?.textContent || 'Minerva · Historia del olivar',
    brand: 'Minerva · Atlas de la historia del olivar',
  };
}

function drawCaption(ctx, W, H, caption) {
  ctx.save();
  ctx.scale(SCALE, SCALE);
  const w = W / SCALE, h = H / SCALE;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, h - CAPTION_H, w, CAPTION_H);
  ctx.fillStyle = TERRA;
  ctx.fillRect(18, h - CAPTION_H + 8, 44, 3);
  ctx.fillStyle = INK;
  ctx.font = '600 16px "Bodoni Moda", Georgia, serif';
  const head = caption.when ? `${caption.title} · ${caption.when}` : caption.title;
  ctx.fillText(head, 18, h - CAPTION_H + 32);
  ctx.fillStyle = INK_2;
  ctx.font = '400 11px "Alegreya Sans", system-ui, sans-serif';
  ctx.fillText(caption.source, 18, h - CAPTION_H + 50);
  ctx.textAlign = 'right';
  ctx.font = '600 11px "Alegreya Sans", system-ui, sans-serif';
  ctx.fillText(caption.brand, w - 18, h - CAPTION_H + 50);
  ctx.restore();
}

function notify(message) {
  let box = document.getElementById('export-toast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'export-toast';
    box.className = 'export-toast';
    box.setAttribute('role', 'status');
    document.body.appendChild(box);
  }
  box.textContent = message;
  box.classList.add('visible');
  clearTimeout(box._timer);
  box._timer = setTimeout(() => box.classList.remove('visible'), 3200);
}

export { notify as toast };

export async function exportActivePng() {
  const svg = activeSvg();
  if (!svg) {
    notify('Esta vista no es una figura: usa «Descargar datos».');
    return null;
  }
  const rect = svg.getBoundingClientRect();
  const w = Math.max(320, Math.round(rect.width));
  const h = Math.max(240, Math.round(rect.height));

  const clone = svg.cloneNode(true);
  inlineStyles(svg, clone);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', w);
  clone.setAttribute('height', h);
  if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${w} ${h}`);

  const markup = new XMLSerializer().serializeToString(clone);
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);

  const caption = captionFor();
  const canvas = document.createElement('canvas');
  canvas.width = w * SCALE;
  canvas.height = (h + CAPTION_H) * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const image = new Image();
  const ok = await new Promise(resolve => {
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
  });
  if (!ok) { notify('No se ha podido componer la figura.'); return null; }
  ctx.drawImage(image, 0, 0, w * SCALE, h * SCALE);
  drawCaption(ctx, canvas.width, canvas.height, caption);

  const view = State.get('view');
  const indicator = view === 'atlas' ? State.get('atlasInd')
    : view === 'trend' ? State.get('trendInd')
      : view === 'bilateral' ? State.get('biItem')
        : State.get('evTab');
  const name = ['minerva', slug(view), slug(indicator), slug(caption.when || 'sin_ano')].join('_') + '.png';

  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
  if (!blob) { notify('No se ha podido guardar la figura.'); return null; }
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = name;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(href), 4000);
  notify(`Descargado ${name}`);
  return name;
}
