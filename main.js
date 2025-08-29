// main.js – v16.1.19
// Verdrahtet Start-Panel, Inspector-Button, Cache-Booster,
// ruft GameLoader._start(mapUrl) auf und zeigt Status im Panel-Log.

(function(){
  const logEl = document.getElementById('start-log');
  const startPanel = document.getElementById('start-panel');
  const mapSelect = document.getElementById('map-select');
  const btnStart   = document.getElementById('btn-start');
  const btnRestart = document.getElementById('btn-restart');
  const btnCopyLog = document.getElementById('btn-log-copy');
  const btnCache   = document.getElementById('btn-cache');
  const btnInspector = document.getElementById('btn-inspector');
  const btnBuild     = document.getElementById('btn-build');

  // -------- kleines Log-Helferlein (spiegelt auch in Inspector) ----------
  function panelLog(kind, txt){
    const now = new Date().toTimeString().slice(0,8);
    const line = `[${now}] ${kind.toUpperCase()} ${txt}\n`;
    if (logEl) logEl.textContent += line;

    // Inspector-Hooks (falls vorhanden)
    try{
      if (window.CBLog) {
        if (kind === 'ok')   window.CBLog.ok(txt);
        else if (kind === 'warn') window.CBLog.warn(txt);
        else if (kind === 'err')  window.CBLog.err(txt);
        else window.CBLog.push('log', txt);
      } else {
        console[kind==='err'?'error':kind==='warn'?'warn':'log'](txt);
      }
    }catch(_){}
  }

  // -------- Cache-Booster ----------
  async function cacheBooster(){
    try{
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      panelLog('ok', 'Cache/Storage geleert – Seite ggf. neu laden');
    }catch(e){
      panelLog('warn', 'Cache-Booster: ' + e.message);
    }
  }

  // -------- Inspector-Button ----------
  btnInspector?.addEventListener('click', ()=>{
    try {
      // Falls dein Inspector ein globales Toggle hat:
      if (window.GameInspector?.toggle) {
        window.GameInspector.toggle(true);
      } else {
        // Fallback: Minimal-Overlay anzeigen
        alert('Inspector (Fallback) – kein GameInspector.toggle() gefunden.');
      }
    } catch(e) {
      panelLog('warn', 'Inspector: ' + e.message);
    }
  });

  // -------- Bau-Button (öffnet dein Build-UI) ----------
  function setBuildButtonActive(active){
    if (!btnBuild) return;
    btnBuild.classList.toggle('visible', !!active);
  }
  btnBuild?.addEventListener('click', ()=>{
    try{
      // Erwartete globale Bridge aus ui-bridge.js:
      window.GameUI?.openBuildMenu?.();
      panelLog('ok', 'Bau-Menü geöffnet');
    }catch(e){
      panelLog('warn', 'Bau-Menü API nicht gefunden – erwarte window.GameUI.openBuildMenu()');
    }
  });

  // -------- Start/Neu-Start ----------
  async function startSelectedMap(){
    const url = mapSelect?.value || './assets/maps/map-mini.json';
    panelLog('ok', `Start gedrückt → ${url}`);

    // Warten bis Engine fertig → GameLoader._start muss existieren
    const T0 = performance.now();
    while (!(window.GameLoader && typeof window.GameLoader._start === 'function')) {
      if (performance.now() - T0 > 2500) { // 2.5s Timeout
        panelLog('err', 'GameLoader.start ist nicht verfügbar – game.js / Engine noch nicht initialisiert?');
        return;
      }
      panelLog('warn', 'Engine noch nicht bereit – warte auf GameLoader.start …');
      await new Promise(r => setTimeout(r, 150));
    }

    try{
      await window.GameLoader._start(url);
      // Start-Panel ausblenden
      startPanel?.setAttribute('hidden', 'hidden');
      setBuildButtonActive(true);
    }catch(e){
      panelLog('err', 'Start fehlgeschlagen: ' + e.message);
    }
  }

  btnStart?.addEventListener('click', startSelectedMap);
  btnRestart?.addEventListener('click', ()=> {
    panelLog('ok', 'Neu-Start angefordert');
    startSelectedMap();
  });

  btnCopyLog?.addEventListener('click', async ()=>{
    try{
      await navigator.clipboard.writeText(logEl?.textContent || '');
      panelLog('ok', 'Log in Zwischenablage');
    }catch(e){
      panelLog('warn', 'Konnte Log nicht kopieren: ' + e.message);
    }
  });

  btnCache?.addEventListener('click', cacheBooster);

  // -------- Events aus Engine/Index ----------
  window.addEventListener('cb:ui-ready', (e)=>{
    panelLog('ok', `UI bereit (index ${e.detail?.v || 'unbekannt'})`);
    // index-Version in Meta bereits gesetzt; DPR aktualisiert der index.
  });

  window.addEventListener('cb:engine-ready', (e)=>{
    const ver = e.detail?.v || 'unbekannt';
    const metaGame = document.getElementById('meta-game');
    if (metaGame) metaGame.textContent = 'game.js: ' + ver;
    panelLog('ok', `game.js geladen, ${ver}`);
  });

  window.addEventListener('cb:game-started', ()=>{
    panelLog('ok', 'Game gestartet');
  });

  // Beim ersten Laden schon mal die Index-Infos im Panel aktualisieren
  try {
    const metaIndex = document.getElementById('meta-index');
    if (metaIndex && window.__cb?.indexVersion) {
      metaIndex.textContent = 'index ' + window.__cb.indexVersion;
    }
    const metaDpr = document.getElementById('meta-dpr');
    if (metaDpr) {
      const dpr = Math.max(1, Math.round((window.devicePixelRatio||1)*100)/100);
      metaDpr.textContent = 'dpr: ' + dpr;
    }
  } catch(_){}
})();
