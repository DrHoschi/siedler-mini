/* ==============================================================
   UI-BUILD – Start-Screen + Fixed Buttons + Log
   Version: v16.1.4
   Verantwortlich für:
   - Start-Overlay (Map-Auswahl, Start/Reset/Cache/Log)
   - globales Log (✅⚠️❌) + Zwischenablage
   - Bau-Menü Toggle (Hook)
   - kleine Hilfen (Cache-Booster)
   ============================================================== */
(function(global){
  const UI = {};
  const state = {
    version: "v?.?.?",
    log: [],
    started: false,
    onStart: null,
    onReset: null,
    onClear: null,
    onCopyLog: null
  };

  // --------- Logging ----------
  function pushLog(line){
    const t = new Date().toTimeString().slice(0,8);
    const s = `[${t}] ${line}`;
    state.log.push(s);
    // Falls Inspector offen ist, live updaten
    const box = document.getElementById('log-box');
    if (box) box.textContent = state.log.join("\n");
    // zusätzlich Konsole
    console.log(s);
  }

  // public:
  UI.log = pushLog;
  UI.getLog = () => state.log.join("\n");
  UI.copyLog = async function(){
    try {
      await navigator.clipboard.writeText(UI.getLog());
      pushLog(`✅ (ok) Log in Zwischenablage`);
    } catch {
      pushLog(`⚠️ (warn) Konnte Log nicht kopieren (Clipboard)`);
    }
  };

  // --------- Cache-Booster ----------
  UI.clearCache = async function(){
    try {
      // Service Worker entfernen
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      // Caches löschen
      if (window.caches) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }
      // Storage (local/session)
      localStorage.clear();
      sessionStorage.clear();
      pushLog(`✅ (ok) Cache/Storage geleert – Seite ggf. neu laden`);
    } catch(e){
      pushLog(`⚠️ (warn) Cache-Booster Problem: ${e?.message || e}`);
    }
  };

  // --------- Start-Overlay ----------
  UI.hideStart = function(){
    const ov = document.getElementById('start-overlay');
    if (ov) ov.style.display = 'none';
    state.started = true;
  };

  function bindStartScreen(opts){
    const ver = document.getElementById('ui-version');
    if (ver) ver.textContent = `UI ${state.version}`;

    const btnStart = document.getElementById('btn-start');
    const btnReset = document.getElementById('btn-reset');
    const btnClear = document.getElementById('btn-clear');
    const btnCopy  = document.getElementById('btn-copylog');
    const mapSel   = document.getElementById('map-select');

    btnStart?.addEventListener('click', () => {
      const mp = mapSel?.value || './assets/maps/map-mini.json';
      opts.onStart?.(mp);
    });
    btnReset?.addEventListener('click', () => opts.onReset?.());
    btnClear?.addEventListener('click', () => opts.onClear?.());
    btnCopy ?.addEventListener('click', () => opts.onCopyLog?.());

    pushLog(`✅ (ok) UI ready (index ${state.version})`);
  }

  // --------- Bau-Menü Toggle (Hook) ----------
  UI.toggleBuildMenu = function(){
    if (!state.started){
      pushLog(`⚠️ (warn) Bau-Menü erst nach Spielstart verfügbar`);
      return;
    }
    if (global.GameUI?.toggleBuildMenu) {
      global.GameUI.toggleBuildMenu();
    } else {
      pushLog(`⚠️ (warn) Build-UI-Hook (GameUI.toggleBuildMenu) fehlt.`);
    }
  };

  // --------- Init ----------
  UI.init = function(opts){
    state.version = opts?.version || state.version;
    state.onStart   = opts?.onStart;
    state.onReset   = opts?.onReset;
    state.onClear   = opts?.onClear;
    state.onCopyLog = opts?.onCopyLog;

    bindStartScreen({
      onStart: state.onStart,
      onReset: state.onReset,
      onClear: state.onClear,
      onCopyLog: state.onCopyLog
    });
  };

  // global machen
  global.UI = UI;
})(window);
