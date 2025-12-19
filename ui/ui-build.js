/* ============================================================================
 * Datei    : ui/ui-build.js
 * Projekt  : Neue Siedler
 * Version  : v25.12.19-force-open-debug
 * Zweck    : Baumenü/Dock – Robust-Open + Debug-Instrumentation
 *
 * Problem-Hintergrund:
 * - In manchen Ständen kommt der Klick/Event an, aber das Dock bleibt unsichtbar.
 * - Oder: der Klick erreicht den Handler nicht (Overlay/Pointer/Capture).
 *
 * Lösung in diesem Patch:
 *  1) Dock wird IMMER als DOM-Knoten garantiert (failsafe).
 *  2) Minimal-Template wird gebaut, wenn im DOM nichts drin ist.
 *  3) Open/Close/Toggle hört auf window UND document:
 *     - cb:build:open / cb:build:close / cb:build:toggle
 *  4) #btn-build wird direkt gebunden (pointerdown+click) UND zusätzlich per
 *     Capture-Listener überwacht, damit wir im Log sicher sehen, ob der Tap ankommt.
 *  5) openDock() setzt: hidden=false + display:block (Failsafe gegen CSS/hidden)
 * ========================================================================== */

(function(){
  'use strict';

  /* ------------------------------- Logger --------------------------------- */
  const LOG = (...m)=> (window.CBLog?.log   || console.log )('[build]', ...m);
  const INF = (...m)=> (window.CBLog?.info  || console.info)('[build]', ...m);
  const WRN = (...m)=> (window.CBLog?.warn  || console.warn)('[build]', ...m);
  const ERR = (...m)=> (window.CBLog?.error || console.error)('[build]', ...m);

  /* ------------------------------- DOM ------------------------------------ */
  function ensureDock(){
    let dock = document.getElementById('build-dock');
    if (!dock){
      dock = document.createElement('div');
      dock.id = 'build-dock';
      dock.hidden = true;
      document.body.appendChild(dock);
      INF('Failsafe: #build-dock erzeugt.');
    }
    // Minimal-Failsafe-Styles (nur wenn CSS/hidden uns killt)
    dock.style.pointerEvents = 'auto';
    return dock;
  }

  function buildTemplateIfEmpty(dock){
    // Wenn bereits Template vorhanden, nichts machen
    if (dock.querySelector('.build-dock__body')) return;

    dock.innerHTML = `
      <div class="build-dock__body">
        <div class="build-dock__head">
          <div class="build-dock__title">
            <span>Bauen</span>
            <span id="build-count">…</span>
          </div>
          <button type="button" class="build-dock__close" aria-label="Schließen">✕</button>
        </div>
        <div class="build-dock__cats" id="build-cats"></div>
        <div class="build-dock__grid" id="build-grid"></div>
        <div class="build-dock__empty" id="build-empty" style="display:none; padding:10px;">
          (keine Gebäude)
        </div>
      </div>
    `;

    const btnClose = dock.querySelector('.build-dock__close');
    btnClose?.addEventListener('click', ()=> closeDock());
    INF('Template gebaut (failsafe).');
  }

  const $dock = ensureDock();
  buildTemplateIfEmpty($dock);

  /* ------------------------------ State ----------------------------------- */
  let IS_OPEN = false;

  /* ------------------------------ Open/Close ------------------------------ */
  function openDock(src='unknown'){
    IS_OPEN = true;
    // Wichtig: hidden entfernen UND display erzwingen
    $dock.hidden = false;
    $dock.style.display = 'block';
    $dock.setAttribute('data-open', '1');
    INF('openDock()', {src});
  }

  function closeDock(src='unknown'){
    IS_OPEN = false;
    $dock.hidden = true;
    $dock.style.display = '';
    $dock.removeAttribute('data-open');
    INF('closeDock()', {src});
  }

  function toggleDock(src='unknown'){
    if (IS_OPEN || !$dock.hidden) closeDock(src);
    else openDock(src);
  }

  /* ------------------------------ Button Bind ----------------------------- */
  function bindBtnBuild(){
    const btn = document.getElementById('btn-build');
    if (!btn){
      WRN('DOM: #btn-build fehlt (kann trotzdem per cb:build:* geöffnet werden).');
      return;
    }
    // Mehrfachbindung vermeiden
    if (btn.dataset.buildBound === '1') return;
    btn.dataset.buildBound = '1';

    const handler = (ev)=>{
      INF('btn-build input → toggleDock()', {type: ev.type});
      toggleDock('btn-build:'+ev.type);
    };

    // iOS: pointerdown ist zuverlässig, click manchmal delayed
    btn.addEventListener('pointerdown', handler, {passive:true});
    btn.addEventListener('click', handler, {passive:true});

    INF('#btn-build gebunden (pointerdown+click).');
  }

  // Sofort binden + nach DOMContentLoaded nochmal (falls Script früh lädt)
  bindBtnBuild();
  document.addEventListener('DOMContentLoaded', bindBtnBuild);

  /* ------------------------------ Capture Debug --------------------------- */
  // Damit wir IMMER sehen, ob überhaupt ein Tap auf btn-build ankommt.
  document.addEventListener('pointerdown', (ev)=>{
    const t = ev.target;
    const id = t && t.id;
    if (id === 'btn-build'){
      INF('CAPTURE pointerdown auf #btn-build', {tag: t.tagName});
    }
  }, {capture:true, passive:true});

  /* ------------------------------ Event Wiring ---------------------------- */
  function on(name, fn){
    window.addEventListener(name, fn);
    document.addEventListener(name, fn);
  }

  on('cb:build:open',   (ev)=> openDock('event:'+ev.type));
  on('cb:build:close',  (ev)=> closeDock('event:'+ev.type));
  on('cb:build:toggle', (ev)=> toggleDock('event:'+ev.type));

  // Zusätzlich: wenn das Spiel startet, bleibt Dock standardmäßig zu,
  // aber wir loggen den Zustand.
  on('cb:game:start', ()=> INF('cb:game:start gesehen; build-dock ready.', {hidden: $dock.hidden}));

  INF('ui-build geladen (force-open-debug).');
})();
