// ════════════════════════════════════════════════════════════════
//  MINERVA · boot — the atlas opens straight onto its own content.
//
//  There is no cover inside the application any more. The front door is
//  index.html (the "mancha de aceite" cover) and each of its buttons lands on
//  a figure of this viewer. What used to live in js/landing.js — the 3D grove,
//  the fresco fallback and the "Entrar al atlas" button that booted the app —
//  was removed on 2026-09-06; only the boot survives, and it runs by itself.
// ════════════════════════════════════════════════════════════════
import Data from './data-loader.js?v=20260908b';
import App from './app.js?v=20260908b';

// Read before anything runs: App.init() ends in startPermalink(), which rewrites
// the address bar from the state and drops any parameter it does not own.
const WANTS_ABOUT = new URLSearchParams(location.search).get('about') === '1';

function fail(err) {
  console.error(err);
  const box = document.querySelector('#loading');
  if (!box) return;
  box.classList.remove('gone');
  box.innerHTML = '';
  const msg = document.createElement('p');
  msg.style.cssText = 'max-width:34em;padding:0 24px;text-align:center;line-height:1.6;color:var(--ink-2)';
  msg.textContent = 'No se pudieron cargar los datos del atlas. Recarga la página; '
    + 'si el problema sigue, la consola del navegador dice por qué.';
  box.appendChild(msg);
}

(async function boot() {
  // The payloads the first paint needs. The spinner of #loading covers the wait;
  // App.init() is the one that takes it down.
  try { await Data.boot(); } catch (err) { console.error(err); }
  try {
    await App.init();
    // The cover's "Acerca del proyecto" button asks for the methods panel. It is
    // not permalink state, just a one-shot instruction from the front door.
    if (WANTS_ABOUT) {
      const btn = document.querySelector('#btn-about');
      if (btn) btn.click();
    }
  } catch (err) { fail(err); }
})();
