/* ============================================================================
 * Datei    : core/boot.js
 * Projekt  : Neue Siedler
 * Version  : v19.0.1 (2025-10-05)
 * Zweck    : Zuverlässige Boot-Kette + laute Fehler/Logs für iOS/Safari
 * Events   :
 *   OUT : cb:assets-ready, cb:registry:ready (aus registry.js), cb:game-start
 * ============================================================================
 */

(function(){
  // ---------- Minimal-Logger (konsole + sichtbares Toast) ----------
  function log(...a){ try{ console.log('[BOOT]', ...a); }catch(_){} showToast(a.join(' ')); }
  function err(...a){ try{ console.error('[BOOT]', ...a); }catch(_){} showToast('❌ '+a.join(' ')); }
  function showToast(msg){
    let x = document.getElementById('boot-toast');
    if(!x){
      x = document.createElement('div');
      x.id = 'boot-toast';
      x.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9999;padding:8px 12px;border-radius:8px;background:rgba(0,0,0,.6);color:#fff;font:12px/1.3 system-ui;max-width:70vw;';
      document.body.appendChild(x);
    }
    x.textContent = String(msg);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(()=>{ x.textContent=''; }, 4000);
  }

  // ---------- JSON Loader (mit deutlicher Fehlerausgabe) ----------
  async function loadJSON(path){
    const bust = (path.includes('?') ? '&' : '?') + 'v=' + Date.now(); // Cachebuster
    const url = path + bust;
    log('lade', path);
    let res;
    try{
      res = await fetch(url, { cache:'no-store' });
    }catch(e){
      err('Netzwerkfehler bei', path, e && e.message || e);
      throw e;
    }
    if(!res.ok){
      const t = await res.text().catch(()=> '');
      err('HTTP '+res.status+' für', path, 'Payload:', t.slice(0,140));
      throw new Error('HTTP '+res.status+' @ '+path);
    }
    try{
      return await res.json();
    }catch(e){
      err('JSON-Parsefehler in', path, e && e.message || e);
      throw e;
    }
  }

  // ---------- Haupt-Boot-Sequenz ----------
  async function boot(){
    // UI sichtbar machen (Startpanel zu, HUD/Dock an)
    const $start = document.getElementById('start-panel');
    const $hud   = document.getElementById('hud-top');
    const $dock  = document.getElementById('build-dock');
    $start && $start.classList.add('hidden');
    $hud   && $hud.classList.remove('hidden');
    $dock  && $dock.classList.remove('hidden');

    try{
      // 1) (optional) Assets-Phase signalisieren
      window.dispatchEvent(new CustomEvent('cb:assets-ready'));
      log('cb:assets-ready');

      // 2) Registry laden
      await Registry.init(loadJSON); // emit cb:registry:ready kommt aus registry.js
      log('Registry initialisiert');

      // 3) Game starten
      Game.start();
      log('Game.start() ok → cb:game-start sollte folgen');
    }catch(e){
      err('BOOT abgebrochen:', e && e.message || e);
      alert('Start fehlgeschlagen:\n'+(e && e.message || e));
    }
  }

  // ---------- Start-Knöpfe zuverlässig verdrahten ----------
  function wireStartButtons(){
    const $btnNew   = document.getElementById('btn-new');
    const $btnStart = document.getElementById('btn-start');   // versteckter Fallback
    const kick = ()=> boot();

    if($btnNew){ $btnNew.onclick = kick; }
    if($btnStart){ $btnStart.onclick = kick; }

    // Sicherheitsnetz: falls jemand das Startpanel bereits versteckt hat
    // oder der Klick nicht ankam, erlaube Start auch per Tastatur:
    window.addEventListener('keydown', (e)=>{
      if(e.key==='Enter' || e.key===' '){
        const p = document.getElementById('start-panel');
        const visible = p && !p.classList.contains('hidden');
        if(visible){ boot(); }
      }
    });

    log('Start verdrahtet');
  }

  // ---------- Autokonfiguration ----------
  window.addEventListener('load', wireStartButtons);
})();
