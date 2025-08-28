/* ui-start.js (v16.1.5)
   ------------------------------------------------------------
   - Start-Overlay: Map wählen, Start/Neu starten/Cache/Log
   - FABs: Inspector (immer), Build (nach Spielstart)
   - Inspector-Panel: Vollbild, bündelt Log & Tools
   - Robuste Logs für: Start-Klick, GameLoader verfügbar/nicht
   ------------------------------------------------------------ */

(function () {
  const $ = (sel) => document.querySelector(sel);

  // ------- Hilfs-Log, geht ins Inspector-Log + Konsole -------
  function log(type, msg){
    const stamp = new Date().toTimeString().slice(0,8);
    const line = `[${stamp}] ${type} ${msg}`;
    console[type === 'err' ? 'error' : (type === 'warn' ? 'warn' : 'log')](line);
    const box = $('#inspector-log');
    if (box){
      const div = document.createElement('div');
      div.textContent = line;
      box.appendChild(div);
      box.scrollTop = box.scrollHeight;
    }
  }
  const ok   = (m)=>log('log', `✅ (ok) ${m}`);
  const warn = (m)=>log('warn',`⚠️ (warn) ${m}`);
  const err  = (m)=>log('err', `❌ (err) ${m}`);

  // ------- Buttons & Panels -------
  const startOverlay = $('#start-overlay');
  const btnStart     = $('#btn-start');
  const btnRestart   = $('#btn-restart');
  const btnStartCache= $('#btn-start-cache');
  const btnStartLog  = $('#btn-start-logcopy');
  const selMap       = $('#map-select');

  const fabInspector = $('#fab-inspector');
  const fabBuild     = $('#fab-build');

  const inspPanel    = $('#inspector-panel');
  const inspClose    = $('#btn-inspector-close');
  const btnMini      = $('#btn-start-mini');
  const btnPro       = $('#btn-start-pro');
  const btnCache     = $('#btn-cache');
  const btnLogCopy   = $('#btn-log-copy');
  const btnLogClear  = $('#btn-log-clear');

  // ------- Clipboard Helfer -------
  async function copyLog(){
    const text = $('#inspector-log')?.innerText || '';
    try { await navigator.clipboard.writeText(text); ok('Log in Zwischenablage'); }
    catch { err('Kopieren fehlgeschlagen'); }
  }

  // ------- Cache leeren (Cache API + local/session) -------
  async function clearCaches(){
    try{
      if ('caches' in window){
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }
      localStorage.clear(); sessionStorage.clear();
      ok('Cache/Storage geleert – Seite ggf. neu laden');
    }catch(e){ err('Cache leeren fehlgeschlagen'); }
  }

  // ------- Spiel starten -------
  async function startGameWith(mapPath){
    // robust gegen Timing: existiert GameLoader?
    const GL = window.GameLoader;
    if (!GL || typeof GL.start !== 'function'){
      err('GameLoader.start ist nicht verfügbar – game.js noch nicht initialisiert?');
      return;
    }
    ok(`Start gedrückt → ${mapPath}`);
    try{
      await GL.start(mapPath);
      ok(`GameLoader.start ${mapPath}`);
      // Nach erfolgreichem Start: Start-Overlay ausblenden, Build-FAB einblenden
      startOverlay.style.display = 'none';
      fabBuild.style.display = 'flex';
      ok('Game started');
    }catch(e){
      err(`Start fehlgeschlagen: ${e?.message || 'Unbekannter Fehler'}`);
    }
  }

  // ------- Wire Start-Overlay -------
  btnStart?.addEventListener('click', () => {
    const mapPath = selMap.value;
    startGameWith(mapPath);
  });
  btnRestart?.addEventListener('click', () => {
    // Start-Fenster zurückholen, Build-FAB verstecken
    startOverlay.style.display = 'block';
    fabBuild.style.display = 'none';
    ok('Neu starten (UI) – bitte Karte wählen & Start drücken');
  });
  btnStartCache?.addEventListener('click', clearCaches);
  btnStartLog?.addEventListener('click', copyLog);

  // ------- FAB: Inspector -------
  fabInspector?.addEventListener('click', () => {
    inspPanel.style.display = 'block';
    ok('Inspector geöffnet');
  });
  inspClose?.addEventListener('click', () => {
    inspPanel.style.display = 'none';
    ok('Inspector geschlossen');
  });

  // ------- FAB: Build (öffnet dein Bau-Menü Modul) -------
  fabBuild?.addEventListener('click', () => {
    const ui = window.UIBuild || window.UI || {};
    if (typeof ui.open === 'function'){
      ui.open();
      ok('Bau-Menü geöffnet');
    } else {
      warn('Bau-Menü Modul (UIBuild.open) nicht verfügbar');
    }
  });

  // ------- Inspector Toolbar Aktionen -------
  btnMini?.addEventListener('click', () => startGameWith('./assets/maps/map-mini.json'));
  btnPro?.addEventListener('click',  () => startGameWith('./assets/maps/map-pro.json'));
  btnCache?.addEventListener('click', clearCaches);
  btnLogCopy?.addEventListener('click', copyLog);
  btnLogClear?.addEventListener('click', () => { const box = $('#inspector-log'); if (box){ box.textContent=''; ok('Log geleert'); } });

  // ------- UI init Log -------
  ok('UI ready (ui-start.js v16.1.5)');

  // Optional: wenn das Spiel selbst ein “started”-Event feuert, hier drauf reagieren:
  // window.addEventListener('game:started', ()=>{ startOverlay.style.display='none'; fabBuild.style.display='flex'; });

})();
