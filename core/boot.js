/* ============================================================================
 * Datei    : core/boot.js
 * Projekt  : Neue Siedler
 * Version  : v21.0.0 (2025-10-07)
 * Zweck    : Robuster Spielstart – Registry laden, Map aktivieren, HUD sichtbar machen
 *
 * Ablauf:
 *   1. Startpanel ausblenden
 *   2. Assets-Phase (cb:assets-ready)
 *   3. Registry laden (inkl. resources.json)
 *   4. MapRuntime starten
 *   5. Spiel-Engine starten (Game.start)
 *   6. HUD und BuildDock sichtbar machen
 *
 * Events:
 *   - cb:assets-ready          → signalisiert, dass Grund-Assets geladen sind
 *   - cb:registry:ready        → Registry bereit (aus core/registry.js)
 *   - cb:map:loaded / fallback → MapRuntime meldet Status
 *   - cb:game-start            → Spiel-Engine aktiv
 *
 * Emits:
 *   - cb:assets-ready
 *   - cb:game-start (über Game.start)
 *
 * Abhängigkeiten:
 *   - core/registry.js
 *   - core/map-runtime.js
 *   - core/game.js
 *   - ui/ui-hud.js
 *   - ui/ui-build.js
 * ========================================================================== */

(function(){
  // -------------------------------------------------------------------------
  // [00] Toast / Log-Helfer (Infofenster unten links)
  // -------------------------------------------------------------------------
  function toast(msg, isErr){
    let box = document.getElementById('boot-toast');
    if(!box){
      box = document.createElement('div');
      box.id = 'boot-toast';
      box.style.cssText =
        'position:fixed;left:12px;bottom:12px;z-index:9999;'+
        'padding:8px 12px;border-radius:8px;'+
        'background:rgba(0,0,0,.65);color:#fff;'+
        'font:12px/1.4 system-ui,Segoe UI,Roboto,sans-serif;'+
        'max-width:75vw;';
      document.body.appendChild(box);
    }
    box.textContent = (isErr ? '❌ ' : 'ℹ️ ') + String(msg);
    clearTimeout(toast._t);
    toast._t = setTimeout(()=>{ box.textContent=''; }, 3500);
  }

  const log = (...a)=>{ console.log('[BOOT]',...a); toast(a.join(' '), false); };
  const err = (...a)=>{ console.error('[BOOT]',...a); toast(a.join(' '), true); };

  // -------------------------------------------------------------------------
  // [01] JSON Loader (Cache-Bust, Fehlerrobust)
  // -------------------------------------------------------------------------
  async function loadJSON(path){
    const url = path + (path.includes('?')?'&':'?') + 'v=' + Date.now();
    log('lade', path);
    const res = await fetch(url, { cache:'no-store' }).catch(e=>{
      err('Netzwerkfehler:', e?.message||e); throw e;
    });
    if(!res || !res.ok){
      const txt = res ? await res.text().catch(()=> '') : '';
      err('HTTP/Fetch-Fehler @', path, txt.slice(0,120));
      throw new Error('Fetch '+path);
    }
    try { return await res.json(); }
    catch(e){ err('JSON-Fehler @', path, e?.message||e); throw e; }
  }

  // -------------------------------------------------------------------------
  // [02] UI-Helfer
  // -------------------------------------------------------------------------
  function showHudAndDock(){
    const $hud  = document.getElementById('hud-top');
    const $dock = document.getElementById('build-dock');
    $hud  && $hud.classList.remove('hidden');
    $dock && $dock.classList.remove('hidden');
  }

  function hideStartHard(){
    const $start = document.getElementById('start-panel');
    if(!$start) return;
    $start.classList.add('hidden');
    $start.style.display    = 'none';
    $start.style.visibility = 'hidden';
  }

  function autoOpenBuildDock(){
    const $btn = document.getElementById('btn-build');
    if($btn && $btn.getAttribute('aria-expanded')!=='true'){
      $btn.click();
    }
  }

  // -------------------------------------------------------------------------
  // [03] Hauptstartfunktion
  // -------------------------------------------------------------------------
  async function boot(){
    hideStartHard();
    showHudAndDock();

    try {
      // 1) Assets → cb:assets-ready
      window.dispatchEvent(new CustomEvent('cb:assets-ready'));
      log('cb:assets-ready');

      // 2) Registry initialisieren
      await Registry.init(loadJSON);
      log('Registry initialisiert');

      // 3) MapRuntime starten
      if (window.MapRuntime && typeof MapRuntime.init === 'function'){
        await MapRuntime.init('game');       // liest data-map am Canvas
        MapRuntime.start();
        log('MapRuntime aktiv');
      } else {
        err('MapRuntime fehlt – bitte core/map-runtime.js einbinden');
      }

      // 4) Spiel-Engine starten
      if (window.Game && typeof Game.start === 'function'){
        Game.start();
        log('Game.start() ok → cb:game-start sollte folgen');
      } else {
        err('Game.start() fehlt – bitte core/game.js prüfen');
      }

      // 5) Komfort – BuildDock öffnen
      autoOpenBuildDock();

    } catch(e){
      err('Start fehlgeschlagen:', e?.message||e);
      alert('Start fehlgeschlagen:\n' + (e?.message || e));
    }
  }

  // -------------------------------------------------------------------------
  // [04] Verdrahtung (Startbuttons & Keyboard)
  // -------------------------------------------------------------------------
  function wireStart(){
    const kick = ()=> boot();
    const $btnNew   = document.getElementById('btn-new');
    const $btnStart = document.getElementById('btn-start');
    if($btnNew)   $btnNew.onclick   = kick;
    if($btnStart) $btnStart.onclick = kick;

    // ENTER oder SPACE startet das Spiel aus dem Startpanel heraus
    window.addEventListener('keydown', (e)=>{
      if(e.key==='Enter' || e.key===' '){
        const p = document.getElementById('start-panel');
        if(p && !p.classList.contains('hidden')) boot();
      }
    });
    log('Start verdrahtet');
  }

  // -------------------------------------------------------------------------
  // [05] Event-Hooks / Debug
  // -------------------------------------------------------------------------
  window.addEventListener('cb:registry:ready', ()=> log('cb:registry:ready'));
  window.addEventListener('cb:game-start',      ()=> log('cb:game-start'));
  window.addEventListener('load', wireStart);

  // Debug-Ausgabe Map-Info
  const cv = document.getElementById('game');
  const url = cv?.getAttribute('data-map');
  (window.CBLog?.ok || console.log)('[boot] map-canvas data-map =', url);
  window.addEventListener('cb:map:loaded',   e => (window.CBLog?.ok   || console.log)('[map] loaded', e.detail));
  window.addEventListener('cb:map:fallback', e => (window.CBLog?.warn || console.warn)('[map] fallback', e.detail));

})();
