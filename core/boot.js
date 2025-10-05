/* ============================================================================
 * Datei    : core/boot.js
 * Projekt  : Neue Siedler
 * Version  : v19.0.2 (2025-10-05)
 * Zweck    : Robuster Start (iOS/WebKit-freundlich) + klare UI-Sichtbarkeit
 * Events   : cb:assets-ready (hier), cb:registry:ready (aus Registry), cb:game-start (aus Game)
 * ============================================================================
 */

(function(){
  // ---------- Mini-Toast (sichtbare Hinweise, auch mobil) ----------
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
  function log(...a){ try{ console.log('[BOOT]', ...a); }catch(_){} toast(a.join(' '), false); }
  function err(...a){ try{ console.error('[BOOT]', ...a); }catch(_){} toast(a.join(' '), true); }

  // ---------- JSON-Loader (mit Cache-Buster & Fehlerausgabe) ----------
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
    // Klasse + Fallback inline (falls CSS .hidden irgendwo fehlt/übersteuert)
    $start.classList.add('hidden');
    $start.style.display   = 'none';
    $start.style.visibility= 'hidden';
  }
  function autoOpenBuildDock(){
    const $btn = document.getElementById('btn-build');
    if($btn && $btn.getAttribute('aria-expanded')!=='true'){
      $btn.click(); // triggert unser Inline-Wiring und öffnet das Dock
    }
  }

  // ---------- Hauptstart ----------
  async function boot(){
    // 0) UI sichtbar schalten
    hideStartHard();
    showHudAndDock();

    try{
      // 1) Assets-Phase (Marker)
      window.dispatchEvent(new CustomEvent('cb:assets-ready')); log('cb:assets-ready');

      // 2) Registry laden → cb:registry:ready kommt aus registry.js
      await Registry.init(loadJSON);
      log('Registry initialisiert');

      // 3) Nach Registry: Baumenü sicher befüllt? Wenn leer → Hinweis
      setTimeout(()=>{
        try{
          const list = (typeof Registry.list==='function') ? Registry.list('buildings', {epoche:1}) : [];
          if(!list || !list.length){
            err('Hinweis: Keine Gebäude für Epoche 1 gefunden – prüfe data/buildings.json & Icons.');
          } else {
            log('Gebäude gefunden:', list.length);
          }
        }catch(e){}
      }, 0);

      // 4) Game starten (loop ohne Renderer ist OK; Place/Build funktioniert)
      Game.start();
      log('Game.start() ok → cb:game-start sollte folgen');

      // 5) Komfort: Baumenü automatisch öffnen (du siehst sofort die Kacheln)
      autoOpenBuildDock();

    }catch(e){
      err('Start fehlgeschlagen:', e?.message||e);
      alert('Start fehlgeschlagen:\n'+(e?.message||e));
    }
  }

  // ---------- Startknöpfe (zuverlässig) ----------
  function wireStart(){
    const kick = ()=> boot();
    const $btnNew   = document.getElementById('btn-new');
    const $btnStart = document.getElementById('btn-start'); // Fallback
    if($btnNew)   $btnNew.onclick = kick;
    if($btnStart) $btnStart.onclick = kick;
    // Enter/Space im Startpanel:
    window.addEventListener('keydown', (e)=>{
      if(e.key==='Enter' || e.key===' '){
        const p = document.getElementById('start-panel');
        if(p && !p.classList.contains('hidden')) boot();
      }
    });
    log('Start verdrahtet');
  }

  // ---------- Event-Feedback ----------
  window.addEventListener('cb:registry:ready', ()=> log('cb:registry:ready'));
  window.addEventListener('cb:game-start',     ()=> log('cb:game-start'));

  // ---------- Init ----------
  window.addEventListener('load', wireStart);
})();
