// assets/ui/ui-bridge.js — v16.1.16
// Stellt die globalen Hooks bereit, die dein Inspector & die Buttons erwarten.
// Mapped auf dein bestehendes assets/ui/ui-build.js (falls vorhanden).

(function(){
  const V = 'v16.1.16';
  const LOG = (lvl, msg)=> {
    try{
      if (window.CBLog) {
        if (lvl==='ok')      CBLog.ok(msg);
        else if (lvl==='warn') CBLog.warn(msg);
        else if (lvl==='err')  CBLog.err(msg);
        else CBLog.push(lvl||'log', msg);
      } else {
        console[lvl==='err'?'error':lvl==='warn'?'warn':'log'](msg);
      }
    }catch(_){}
  };

  // Versuche das vorhandene UI-Modul zu finden (je nach deiner Datei)
  function resolveBuildAPI(){
    // Kandidaten, falls dein ui-build.js anders nennt:
    const api = window.UIBuild || window.BuildUI || window.GameBuildUI || null;
    return api;
  }

  // Globale Fassade
  const GU = window.GameUI = window.GameUI || {};
  GU.version = V;

  GU.openBuildMenu = function(){
    const api = resolveBuildAPI();
    if (api?.open) { api.open(); LOG('ok', 'Bau-Menü geöffnet (ui-build.js)'); }
    else LOG('warn', 'Bau-Menü API nicht gefunden – erwartete globale Variable z.B. window.UIBuild');
  };

  GU.closeBuildMenu = function(){
    const api = resolveBuildAPI();
    if (api?.close) { api.close(); LOG('ok', 'Bau-Menü geschlossen'); }
  };

  GU.setTool = function(toolId){
    const api = resolveBuildAPI();
    if (api?.setTool) { api.setTool(toolId); LOG('ok', `Tool gesetzt: ${toolId}`); }
  };

  // Hook nach Spielstart: Bau-Button sichtbar machen
  GU.onGameStarted = function(){
    const btn = document.getElementById('btn-build');
    if (btn) btn.classList.add('visible');
    LOG('ok', 'onGameStarted: Bau-Button aktiviert');
  };

  // Sicherheitshalber auch auf Event hören
  window.addEventListener('cb:game-started', ()=> GU.onGameStarted());

  LOG('ok', `Bau-Bridge bereit (ui-bridge.js ${V})`);
})();
