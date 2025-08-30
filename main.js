// main.js – v16.1.19
// ------------------------------------------------------------
// - Start-Panel bedienbar halten
// - GameLoader._start(mapUrl) aufrufen
// - Log-Ausgaben an CBLog (falls vorhanden)
// - auf 'cb:game-started' reagieren -> Build-Button einblenden

(function(){
  const LOG = (t,m)=> (window.CBLog?.[t]||console.log)(m);

  const startPanel = document.getElementById('start-panel');
  const mapSelect  = startPanel?.querySelector('select, input[list]') || null;
  const btnStart   = startPanel?.querySelector('[data-action="start"], .btn-start') || null;
  const btnRestart = startPanel?.querySelector('[data-action="restart"], .btn-restart, .btn-reset') || null;
  const btnCopyLog = startPanel?.querySelector('[data-action="copylog"], .btn-copylog') || null;
  const btnCache   = startPanel?.querySelector('[data-action="cachebooster"], .btn-cache') || null;

  // kleine Utils
  function getMapUrl(){
    // dein Select enthält z.B. "map-mini.json" – gleiche Logik wie bisher
    let v = (mapSelect && (mapSelect.value || mapSelect.textContent || '')).trim();
    if (!v) v = 'map-mini.json';
    if (!v.endsWith('.json')) v += '.json';
    if (!v.startsWith('./assets/maps/')) v = './assets/maps/' + v;
    return v;
  }

  // Buttons verdrahten (einmalig)
  if (btnStart && !btnStart.__wired){
    btnStart.__wired = true;
    btnStart.addEventListener('click', ()=>{
      const url = getMapUrl();
      LOG('ok', `Start gedrückt → ${url}`);
      // Engine-Start
      if (window.GameLoader?._start){
        window.GameLoader._start(url).catch(e=>{
          LOG('err', 'Start fehlgeschlagen: ' + (e?.message||e));
        });
      } else {
        LOG('warn', 'Engine noch nicht bereit – warte auf GameLoader.start …');
        // kleiner Retry nach kurzer Zeit (Safari-Cache helps)
        setTimeout(()=>{
          if (window.GameLoader?._start){
            LOG('ok', 'Retry Start → ' + url);
            window.GameLoader._start(url).catch(e=>LOG('err','Start fehlgeschlagen: '+(e?.message||e)));
          }else{
            LOG('err', 'GameLoader.start ist nicht verfügbar – game.js / Engine noch nicht initialisiert?');
          }
        }, 1200);
      }
    }, { passive:true });
  }

  if (btnRestart && !btnRestart.__wired){
    btnRestart.__wired = true;
    btnRestart.addEventListener('click', ()=>{
      LOG('ok', 'Neu-Start angefordert');
      try{
        localStorage.clear(); caches?.keys?.().then(keys=>keys.forEach(k=>caches.delete(k)));
      }catch(_){}
      location.reload();
    }, { passive:true });
  }

  if (btnCopyLog && !btnCopyLog.__wired){
    btnCopyLog.__wired = true;
    btnCopyLog.addEventListener('click', ()=>{
      try{
        const text = window.CBLog?.dump ? window.CBLog.dump() : (document.querySelector('#log')?.innerText||'');
        navigator.clipboard.writeText(text||'').then(()=>LOG('ok','Log in Zwischenablage'));
      }catch(e){ LOG('err','Konnte Log nicht kopieren: '+e.message); }
    }, { passive:true });
  }

  if (btnCache && !btnCache.__wired){
    btnCache.__wired = true;
    btnCache.addEventListener('click', ()=>{
      try{
        localStorage.clear();
        caches?.keys?.().then(keys=>keys.forEach(k=>caches.delete(k)));
        LOG('ok', 'Cache/Storage geleert – Seite ggf. neu laden');
      }catch(e){ LOG('warn','Cache-Booster Fehler: '+e.message); }
    }, { passive:true });
  }

  // Game-Lifecycle: auf "game started" reagieren
  function onGameStartedOnce(){
    LOG('ok', 'Game gestartet');
    try { window.GameUI?.onGameStarted?.(); } catch(_){}
    // Startpanel kannst du hier automatisch ausblenden – falls das deine aktuelle Logik ist.
    // (Lässt du das Panel sichtbar, bleibt das Layout 1:1 wie bei dir.)
  }
  window.addEventListener('cb:game-started', onGameStartedOnce, { once:true });

  // UI ready -> Log
  (function(){
    const v = (window.__cb && window.__cb.indexVersion) || 'unbekannt';
    LOG('ok', `UI bereit (index ${v})`);
  })();
})();
