// shared tooltip
//
// With a finger there is no hover: the compatibility mouse events that Chrome
// fires on a tap do open the card, but nothing ever fires mouseleave, so it
// stayed pinned on screen and survived a change of view; and, anchored to the
// tap point, it was clipped by the right edge of a 390 px phone. On a coarse
// pointer the card is therefore anchored to the bottom of the screen, carries
// its own close button, and is dismissed by the next press outside a map shape.
const el = () => document.getElementById('tt');
const coarse = () => window.matchMedia('(pointer:coarse)').matches;
const HIT = '.region,.ev-pt,.bi-node,.bi-flow,.rank-row,circle,path,rect';
let bound = false;
// A touch card must survive the mouseleave that Chrome fires when the finger lifts:
// in Tendencias that compatibility event closed the tooltip the instant it opened.
let pinned = false;

export function showTip(ev, { title, val, sub, chip } = {}) {
  const t = el(); if (!t) return;
  const touch = coarse();
  t.innerHTML =
    (title ? `<div class="tt-title">${title}</div>` : '') +
    (val != null ? `<div class="tt-val">${val}</div>` : '') +
    (sub ? `<div class="tt-sub">${sub}</div>` : '') +
    (chip ? `<span class="tt-chip">${chip}</span>` : '') +
    (touch ? '<button type="button" class="tt-close" aria-label="Cerrar">&times;</button>' : '');
  t.classList.toggle('touch', touch);
  t.classList.add('on');
  pinned = touch;
  bindDismiss();
  if (touch) { t.style.left = ''; t.style.top = ''; return; }  // anchored by CSS
  moveTip(ev);
}
export function moveTip(ev) {
  const t = el(); if (!t || !t.classList.contains('on')) return;
  if (t.classList.contains('touch')) return;   // anchored card: do not chase the pointer
  const pad = 16, w = t.offsetWidth, h = t.offsetHeight;
  const vw = window.visualViewport ? window.visualViewport.width : innerWidth;
  const vh = window.visualViewport ? window.visualViewport.height : innerHeight;
  let x = ev.clientX + pad, y = ev.clientY + pad;
  if (x + w > vw - 8) x = ev.clientX - w - pad;
  if (y + h > vh - 8) y = ev.clientY - h - pad;
  t.style.left = Math.max(8, x) + 'px'; t.style.top = Math.max(8, y) + 'px';
}
/* hideTip(true) fuerza el cierre (cambio de vista, aspa, toque fuera). Sin argumento
   respeta la tarjeta táctil: d3 lo engancha como `.on('mouseleave', hideTip)`, que
   entrega un Event como primer argumento, nunca `true`. */
export function hideTip(force) {
  if (pinned && force !== true) return;
  pinned = false;
  const t = el(); if (t) t.classList.remove('on');
}

function bindDismiss() {
  if (bound) return;
  bound = true;
  document.addEventListener('pointerdown', ev => {
    const t = el(); if (!t || !t.classList.contains('on')) return;
    const target = ev.target;
    if (!target || !target.closest) return;
    if (target.closest('.tt')) return;          // the card itself (close button included)
    if (target.closest(HIT)) return;            // a new shape: its handler will refresh the card
    hideTip(true);
  }, { capture: true, passive: true });
  document.addEventListener('click', ev => {
    if (ev.target && ev.target.closest && ev.target.closest('.tt-close')) {
      ev.preventDefault(); ev.stopPropagation(); hideTip(true);
    }
  }, true);
}
