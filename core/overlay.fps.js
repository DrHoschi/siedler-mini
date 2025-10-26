/* ============================================================================
 * Datei   : core/overlay.fps.js
 * Projekt : Neue Siedler
 * Version : v25.10.27-fps1
 * Zweck   : Kleines Performance-Overlay (FPS + Δt), oben rechts im Spiel
 *
 * Lauscht : cb:game:tick { fps, dt }, req:overlay:fps:toggle
 * Hotkey  : F9 (toggle)
 * ============================================================================ */
(() => {
  'use strict';

  const TAG = '[overlay.fps]';
  const LOG = (window.CBLog?.info || console.info).bind(console, TAG);

  // Skip, wenn Nutzer reduzierte Bewegungen wünscht (zugänglichkeitsfreundlich)
  const REDUCED = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  // --- DOM bauen -------------------------------------------------------------
  let box = null;
  function ensureBox(){
    if (box) return box;
    injectCSS();
    box = document.createElement('div');
    box.id = 'fps-overlay';
    box.innerHTML = `
      <div class="fps-row">
        <span class="label">FPS</span><b id="fps-val">—</b>
      </div>
      <div class="fps-row">
        <span class="label">Δt</span><b id="fps-dt">—</b><span class="unit">ms</span>
      </div>`;
    document.body.appendChild(box);
    return box;
  }

  function injectCSS(){
    if (document.getElementById('fps-overlay-style')) return;
    const css = `
      #fps-overlay{position:fixed;lefth:10px;down:10px;z-index:9999;
        background:rgba(0,0,0,.55);backdrop-filter:saturate(120%) blur(2px);
        color:#e8e8f0;border:1px solid #41414a;border-radius:6px;padding:6px 8px;
        font:12px/1.2 system-ui,Segoe UI,Roboto,Ubuntu,sans-serif; user-select:none}
      #fps-overlay .fps-row{display:flex;align-items:baseline;gap:6px}
      #fps-overlay .label{opacity:.8}
      #fps-overlay b{font-variant-numeric:tabular-nums}
      #fps-overlay .unit{opacity:.7}
      @media (max-width:760px){ #fps-overlay{transform:scale(.9); transform-origin:top right} }
      .fps-hide{display:none !important;}
    `;
    const tag = document.createElement('style');
    tag.id='fps-overlay-style'; tag.textContent = css;
    document.head.appendChild(tag);
  }

  // --- Anzeige aktualisieren -------------------------------------------------
  let visible = !REDUCED; // bei reduced-motion standardmäßig aus
  function setVisible(v){
    visible = !!v;
    ensureBox();
    box.classList.toggle('fps-hide', !visible);
  }

  function update(fps, dtSec){
    if (!visible) return;
    const elFPS = document.getElementById('fps-val');
    const elDT  = document.getElementById('fps-dt');
    if (!elFPS || !elDT) return;
    elFPS.textContent = String(Math.max(0, fps|0));
    elDT.textContent  = (Math.max(0, dtSec)*1000).toFixed(2);
  }

  // --- Event-Bindings --------------------------------------------------------
  window.addEventListener('cb:game:tick', (e)=>{
    const d = e?.detail||{};
    update(Number(d.fps||0), Number(d.dt||0));
  }, { passive:true });

  // Toggle per Event
  window.addEventListener('req:overlay:fps:toggle', ()=> setVisible(!visible));

  // Toggle per Hotkey (F9)
  window.addEventListener('keydown', (ev)=>{
    if (ev.code==='F9' && !ev.repeat){
      setVisible(!visible);
    }
  });

  // Startup
  ensureBox();
  setVisible(visible);
  LOG('aktiv – Toggle: F9 / req:overlay:fps:toggle');
})();
