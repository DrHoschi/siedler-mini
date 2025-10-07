/* ============================================================================
 * Datei    : core/boot.js
 * Projekt  : Neue Siedler
 * Version  : v19.0.3 (2025-10-06)
 * Zweck    : Robuster Start + Map sichtbar machen (MapRuntime)
 * Events   : cb:assets-ready, cb:registry:ready (aus Registry), cb:game-start (aus Game)
 * ============================================================================
 */

(function(){
  // ---------- Mini-Toast ----------
  function toast(msg, isErr){
    let box = document.getElementById('boot-toast');
    if(!box){
      box = document.createElement('div');
      box.id = 'boot-toast';
      box.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9999;padding:8px 12px;border-radius:8px;background:rgba(0,0,0,.65);color:#fff;font:12px/1.4 system-ui,Segoe UI,Roboto,sans-serif;max-width:75vw;';
      document.body.appendChild(box);
    }
    box.textContent = (isErr ? '❌ ' : 'ℹ️ ') + String(msg);
    clearTimeout(toast._t); toast._t = setTimeout(()=>{ box.textContent=''; }, 3500);
  }
  const log = (...a)=>{ try{ console.log('[BOOT]',...a);}catch(_){} toast(a.join(' '), false); };
  const err = (...a)=>{ try{ console.error('[BOOT]',...a);}catch(_){} toast(a.join(' '), true); };

  // ---------- JSON-Loader ----------
  async function loadJSON(path){
    const url = path + (path.includes('?')?'&':'?') + 'v=' + Date.now();
    log('lade', path);
    const res = await fetch(url, { cache:'no-store' }).catch(e=>{ err('Netzwerkfehler:', e?.message||e); throw e; });
    if(!res || !res.ok){ const t = res ? await res.text().catch(()=> '') : ''; err('HTTP/Fetch-Fehler @', path, t.slice(0,120)); throw new Error('Fetch '+path); }
    try{ return await res.json(); } catch(e){ err('JSON-Fehler @', path, e?.message||e); throw e; }
  }

  // ---------- UI-Helfer ----------
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
    $start.style.display   = 'none';
    $start.style.visibility= 'hidden';
  }
  function autoOpenBuildDock(){
    const $btn = document.getElementById('btn-build');
    if($btn && $btn.getAttribute('aria-expanded')!=='true'){
      $btn.click();
    }
  }

  // ---------- Hauptstart ----------
  async function boot(){
    hideStartHard();
    showHudAndDock();

    try{
      // 1) Assets-Phase
      window.dispatchEvent(new CustomEvent('cb:assets-ready')); log('cb:assets-ready');

      // 2) Registry
      await Registry.init(loadJSON);
      log('Registry initialisiert');

      // 3) MAP SICHTBAR MACHEN (neu)
      try{
        if (window.MapRuntime && typeof MapRuntime.init === 'function'){
          await MapRuntime.init('game'); // liest data-map am Canvas
          MapRuntime.start();
          log('MapRuntime aktiv');
        } else {
          err('MapRuntime fehlt – bitte core/map-runtime.js einbinden');
        }
      }catch(e){
        err('MapRuntime Fehler:', e?.message||e);
      }

      // 4) Spiel-Engine starten
      Game.start();
      log('Game.start() ok → cb:game-start sollte folgen');

      // 5) Komfort
      autoOpenBuildDock();
    }catch(e){
      err('Start fehlgeschlagen:', e?.message||e);
      alert('Start fehlgeschlagen:\n'+(e?.message||e));
    }
  }

  function wireStart(){
    const kick = ()=> boot();
    const $btnNew   = document.getElementById('btn-new');
    const $btnStart = document.getElementById('btn-start');
    if($btnNew)   $btnNew.onclick = kick;
    if($btnStart) $btnStart.onclick = kick;
    window.addEventListener('keydown', (e)=>{
      if(e.key==='Enter' || e.key===' '){
        const p = document.getElementById('start-panel');
        if(p && !p.classList.contains('hidden')) boot();
      }
    });
    log('Start verdrahtet');
  }

  window.addEventListener('cb:registry:ready', ()=> log('cb:registry:ready'));
  window.addEventListener('cb:game-start',     ()=> log('cb:game-start'));
  window.addEventListener('load', wireStart);
})();
// Debug: Zeige, welche Map gerade geladen wird
(function(){
  const cv = document.getElementById('game');
  const url = cv?.getAttribute('data-map');
  (window.CBLog?.ok || console.log)('[boot] map-canvas data-map =', url);
  window.addEventListener('cb:map:loaded',  e => (window.CBLog?.ok   || console.log)('[map] loaded', e.detail));
  window.addEventListener('cb:map:fallback',e => (window.CBLog?.warn || console.warn)('[map] fallback', e.detail));
})();
