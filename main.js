// main.js – v16.1.19
// Start-/Boot-Logik für das UI. Layout bleibt unberührt.
// - Verdrahtet Start, Neu-Start, Cache-Booster, Log kopieren
// - Wartet robust auf GameLoader (start/_start) und cb:engine-ready
// - Zeigt Bau-Button erst nach cb:game-started
// - Inspector-Fallback-Button (rechts unten) bleibt nutzbar

(function(){
  const UI_VERSION = 'v16.1.19';

  // ---------- kleine Log-Helfer ----------
  const log = {
    ok:   (m)=> window.CBLog?.ok ? window.CBLog.ok(m)   : console.log(`OK ${m}`),
    warn: (m)=> window.CBLog?.warn? window.CBLog.warn(m): console.warn(`WARN ${m}`),
    err:  (m)=> window.CBLog?.err ? window.CBLog.err(m)  : console.error(`ERR ${m}`),
    push: (lvl,m)=> window.CBLog?.push ? window.CBLog.push(lvl,m): console.log(`${lvl||'LOG'} ${m}`)
  };

  // ---------- DOM-Griffe (IDs aus deinem Start-Panel) ----------
  const $ = (sel)=> document.querySelector(sel);
  const panel     = $('#start-panel');
  const btnStart  = panel?.querySelector('button[data-action="start"]')    || panel?.querySelector('#btn-start');
  const btnReset  = panel?.querySelector('button[data-action="reset"]')    || panel?.querySelector('#btn-reset');
  const btnCopy   = panel?.querySelector('button[data-action="copy-log"]') || panel?.querySelector('#btn-copy-log');
  const btnCache  = panel?.querySelector('button[data-action="cache"]')    || panel?.querySelector('#btn-cache');
  const selMap    = panel?.querySelector('select[name="map"]')             || panel?.querySelector('#map-select');

  // Fallback: falls keine Select-Box existiert, nutzen wir Standard-Pfade
  const DEFAULT_MAPS = [
    './assets/maps/map-mini.json',
    './assets/maps/map-pro.json',
    './assets/maps/map-test-all.json',
    './assets/maps/map-demo.json'
  ];

  // ---------- Inspector öffnen/schließen ----------
  const btnInspector = $('#btn-inspector');
  if (btnInspector) {
    btnInspector.addEventListener('click', ()=>{
      // dein Inspector sollte global verfügbar sein:
      if (window.GameInspector?.toggle) {
        window.GameInspector.toggle(true);
      } else if (window.Inspector?.open) {
        window.Inspector.open();
      } else {
        // absoluter Fallback: einfache Overlay-Konsole
        fallbackInspector();
      }
    });
  }

  // ---------- Bau-Menü öffnen ----------
  const btnBuild = $('#btn-build');
  function showBuildButton(){
    if (!btnBuild) return;
    btnBuild.classList.add('visible');
  }
  if (btnBuild) {
    btnBuild.addEventListener('click', ()=>{
      // bevorzugte API-Reihenfolge (was immer verfügbar ist)
      if (window.GameUI?.openBuildMenu)      return void window.GameUI.openBuildMenu();
      if (window.UIBuild?.open)              return void window.UIBuild.open();
      if (window.UIBuild?.toggle)            return void window.UIBuild.toggle(true);
      log.warn('Bau-Menü API nicht gefunden – erwarte globale Variable z.B. window.UIBuild oder window.GameUI.');
    });
  }

  // ---------- Events aus game.js anhören ----------
  window.addEventListener('cb:engine-ready', (e)=>{
    log.ok(`Engine bereit (game.js meldet ${e?.detail?.v||'unbekannt'})`);
  });

  window.addEventListener('cb:game-started', ()=>{
    log.ok('Event: cb:game-started empfangen');
    // Start-Panel schließen (wenn dein HTML dafür eine Klasse/Style nutzt)
    try { panel?.classList.add('hidden'); panel?.style?.setProperty('display','none'); } catch(_) {}
    // Bau-Menü-Button aktivieren
    showBuildButton();
    // optionaler Hook für deine UI
    try{ window.GameUI?.onGameStarted?.(); }catch(_){}
  });

  // ---------- Start-Button Logik ----------
  async function onStart(){
    const mapUrl = getSelectedMap();
    log.ok(`Start gedrückt → ${mapUrl}`);

    try {
      await startGameWithRetry(mapUrl, 1200, 12); // ~12 s Gesamttimeout
    } catch (e) {
      log.err(e.message || String(e));
    }
  }

  function getSelectedMap(){
    if (selMap && selMap.value) return selMap.value;
    // Fallback auf erste Default-Map
    return DEFAULT_MAPS[0];
  }

  // robust auf GameLoader warten und starten
  async function startGameWithRetry(mapUrl, delayMs=800, maxTries=10){
    // Engine vorbereiten lassen – manche game.js initialisieren asynchron
    for (let i=0;i<maxTries;i++){
      const GL = window.GameLoader || {};
      const startFn = GL.start || GL._start;
      if (typeof startFn === 'function'){
        await startFn(mapUrl);
        return;
      }
      if (i===0) log.warn('Engine noch nicht bereit – warte auf GameLoader.start …');
      await sleep(delayMs);
    }
    throw new Error('GameLoader.start ist nicht verfügbar – game.js / Engine noch nicht initialisiert?');
  }

  const sleep = (ms)=> new Promise(r=>setTimeout(r,ms));

  // ---------- Neu-Start & Cache ----------
  function onReset(){
    log.ok('Neu-Start angefordert');
    try {
      // Speicher/Caches die dein Spiel nutzt, gezielt löschen
      localStorage.clear();
      sessionStorage.clear();
    } catch(_){}
    location.reload();
  }

  async function onCacheBoost(){
    try{
      // ServiceWorker cache löschen, falls vorhanden
      if ('caches' in window){
        const names = await caches.keys();
        await Promise.all(names.map(n=>caches.delete(n)));
      }
      localStorage.clear(); sessionStorage.clear();
      log.ok('Cache/Storage geleert – Seite ggf. neu laden');
    }catch(e){
      log.warn('Cache-Booster Problem: '+e.message);
    }
  }

  async function onCopyLog(){
    try{
      const text = window.CBLog?.toText ? window.CBLog.toText() : collectConsoleFallback();
      await navigator.clipboard.writeText(text);
      log.ok('Log in Zwischenablage');
    }catch(e){
      log.warn('Kopieren fehlgeschlagen: '+e.message);
    }
  }
  function collectConsoleFallback(){
    // Minimaler Fallback – hier nur Hinweis
    return `[${new Date().toLocaleTimeString()}] LOG-Fallback – nutze bitte den Inspector-Log.`;
    // (Wenn du mein CBLog nutzt, kommt hier nie an.)
  }

  // ---------- Event-Handler verbinden (IDs aus deinem Start-Panel) ----------
  btnStart && btnStart.addEventListener('click', onStart);
  btnReset && btnReset.addEventListener('click', onReset);
  btnCache && btnCache.addEventListener('click', onCacheBoost);
  btnCopy  && btnCopy .addEventListener('click', onCopyLog);

  // ---------- Inspector-Fallback (nur falls dein Inspector noch nicht eingebunden ist) ----------
  function fallbackInspector(){
    // Einfaches, abklickbares Overlay mit Log-Ausgabe
    const old = document.getElementById('cb-fallback-inspector');
    if (old) return; // einmal reicht
    const box = document.createElement('div');
    box.id = 'cb-fallback-inspector';
    box.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,.88); color:#cfe6d8; z-index:9500;
      padding:12px; font-family:ui-monospace, SFMono-Regular, Menlo, monospace; overflow:auto;
    `;
    box.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;position:sticky;top:0;background:rgba(20,20,20,.8);padding:8px;border-radius:10px;">
        <strong>Inspector (Fallback)</strong>
        <button id="cb-fb-copy" style="margin-left:auto">Log kopieren</button>
        <button id="cb-fb-clear">Log leeren</button>
        <button id="cb-fb-close">Schließen</button>
      </div>
      <pre id="cb-fb-log" style="margin-top:10px;white-space:pre-wrap;"></pre>
    `;
    document.body.appendChild(box);

    const pre = box.querySelector('#cb-fb-log');
    const push = (t)=>{ pre.textContent += t + '\n'; };
    push(time()+' ✅ UI bereit (index '+UI_VERSION+')');

    document.getElementById('cb-fb-close').onclick = ()=> box.remove();
    document.getElementById('cb-fb-clear').onclick = ()=> pre.textContent='';
    document.getElementById('cb-fb-copy').onclick  = async ()=>{
      await navigator.clipboard.writeText(pre.textContent||'');
      alert('Log kopiert');
    };

    // minimal CBLog durchreichen
    window.CBLog = window.CBLog || {
      ok: (m)=> push(time()+` ✅ ${m}`),
      warn:(m)=> push(time()+` ⚠️ ${m}`),
      err: (m)=> push(time()+` ❌ ${m}`),
      push:(_,m)=> push(time()+` LOG ${m}`),
      toText: ()=> pre.textContent||''
    };
  }

  function time(){
    const d=new Date();
    return `[${d.toTimeString().slice(0,8)}]`;
  }

  // ---------- Initiale Meldung ----------
  log.ok(`UI bereit (index ${UI_VERSION})`);
})();
