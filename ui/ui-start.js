/* ============================================================================
 * Datei   : ui/ui-start.js
 * Version : v25.11.07 (final)
 * Zweck   : Startfenster + Splash-Hintergrund, saubere Events, Guards.
 *
 * Sendet  : cb:ui-ready (GENAU 1×), req:game:start/continue/reset, req:fullscreen:toggle
 * Lauscht : cb:game:start (Panel schließen), cb:game:paused (Panel öffnen)
 *
 * Klassen : html.panel-open  → Startpanel sichtbar
 *           body.is-playing  → Spiel-Layout aktiv (HUD/Canvas oben)
 * ========================================================================== */

(function(){
  'use strict';

  const LOG = (m)=> (window.CBLog?.ok || console.log)(`[ui-start] ${m}`);

  /* --------------------------- Run-Once Guards ----------------------------- */
  if (window.__UI_START_INIT__) { console.warn('[ui-start] Doppel-Init verhindert.'); return; }
  window.__UI_START_INIT__ = true;

  /* --------------------------- Wurzelknoten -------------------------------- */
  const root = document.getElementById('ui-root') || document.body;

  /* --------------------------- Splash (optional) --------------------------- */
  // Falls du kein CSS dafür hast, injizieren wir ein minimales:
  (function ensureSplash(){
    if (document.getElementById('start-splash')) return;
    const styleId = 'ui-start-inline-style';
    if (!document.getElementById(styleId)){
      const st = document.createElement('style'); st.id = styleId;
      st.textContent = `
:root{ --start-bg:url("assets/ui/start-bg.jpg"); }
#start-splash{ position:fixed; inset:0; background:#111 center/cover no-repeat var(--start-bg);
               display:grid; place-items:center; z-index:100; }
.panel-open #start-splash{ display:grid; }
body.is-playing #start-splash{ display:none; }`;
      document.head.appendChild(st);
    }
    const splash = document.createElement('div');
    splash.id = 'start-splash';
    document.body.appendChild(splash);
  })();

  /* --------------------------- Panel erstellen ----------------------------- */
  const panel = document.createElement('div');
  panel.id = 'start-panel';
  panel.style.display = 'grid'; // initial sichtbar
  panel.innerHTML = `
    <div class="box wood-frame">
      <h1>Neue Siedler</h1>
      <div class="actions">
        <button id="btn-start"      title="Neues Spiel starten">Spiel starten</button>
        <button id="btn-continue"   title="Fortsetzen (falls Save vorhanden)">Weiterspielen</button>
        <button id="btn-reset"      title="Alle Spielstände/Cache zurücksetzen">Reset</button>
        <button id="btn-fullscreen" title="Vollbild umschalten">Vollbild</button>
      </div>
    </div>`;
  (root || document.body).appendChild(panel);

  // Panel-Status auf HTML-Root
  const html = document.documentElement;
  html.classList.add('panel-open');         // Panel sichtbar bis Spielstart
  document.body.classList.remove('is-playing');

  /* --------------------------- UI ready (GENAU 1×) ------------------------ */
  if (!window.__UI_READY_EMITTED__) {
    window.__UI_READY_EMITTED__ = true;
    window.dispatchEvent(new CustomEvent('cb:ui-ready', { detail:{ ok:true } }));
    LOG('Startpanel bereit → cb:ui-ready');
  }

  /* --------------------------- Helpers ------------------------------------ */
  async function toggleFullscreen(){
    const el = document.documentElement;
    try{
      if(!document.fullscreenElement){
        await (el.requestFullscreen?.() || el.webkitRequestFullscreen?.call(el));
      }else{
        await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
      }
    }catch(e){ LOG('ℹ️ Vollbild evtl. blockiert (iOS Restriktionen).'); }
  }
  function closePanel(){
    panel.style.display = 'none';
    html.classList.remove('panel-open');
    document.body.classList.add('is-playing');
  }
  function openPanel(){
    panel.style.display = 'grid';
    html.classList.add('panel-open');
    document.body.classList.remove('is-playing');
  }

  /* --------------------------- Buttons ------------------------------------ */
  panel.querySelector('#btn-start')     .addEventListener('click', ()=>{ closePanel(); window.dispatchEvent(new CustomEvent('req:game:start',    { detail:{ mode:'new'       }})); });
  panel.querySelector('#btn-continue')  .addEventListener('click', ()=>{ closePanel(); window.dispatchEvent(new CustomEvent('req:game:continue', { detail:{ mode:'continue'  }})); });
  panel.querySelector('#btn-reset')     .addEventListener('click', ()=>{ try{ localStorage.clear(); }catch(_){} window.dispatchEvent(new CustomEvent('req:game:reset')); });
  panel.querySelector('#btn-fullscreen').addEventListener('click', toggleFullscreen);

  /* --------------------------- Event-Brücken ------------------------------- */
  window.addEventListener('cb:game:start',  closePanel); // Spiel los → Panel weg
  window.addEventListener('cb:game:paused', openPanel);  // Pause     → Panel da

  // Optional: ESC löst Pause an → Panel danach zeigen
  document.addEventListener('keydown', (ev)=>{
    if (ev.key === 'Escape') {
      window.dispatchEvent(new CustomEvent('req:game:pause'));
      setTimeout(()=>{ if (!html.classList.contains('panel-open')) openPanel(); }, 60);
    }
  });

})();
