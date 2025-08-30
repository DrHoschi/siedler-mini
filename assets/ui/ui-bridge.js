// assets/ui/ui-bridge.js  — v16.1.19
// Bridge zwischen Start/Engine/Inspector und deiner Bau-UI (UIBuild).
// - zeigt den Build-Button erst nach cb:game-started
// - öffnet/schließt das Build-Dock über UIBuild.open/close
// - bietet window.GameUI.{openBuildMenu,closeBuildMenu,setTool,onGameStarted}
// - Inspector-Button ruft GameInspector.toggle() (mit Fallback-Alert)
// -----------------------------------------------------------------------------

(function(){
  const V = 'v16.1.19';
  const LOG = (lvl,msg)=>{
    const fn = window.CBLog?.[lvl] || console[lvl==='err'?'error':lvl==='warn'?'warn':'log'];
    try{ fn.call(console, msg); }catch(_){ /* no-op */ }
  };

  // Nur einmal initialisieren
  if (window.__cb_uiBridgeReady) return;
  window.__cb_uiBridgeReady = true;

  // Elemente
  const btnInspector = document.getElementById('btn-inspector');
  const btnBuild     = document.getElementById('btn-build');
  const buildDock    = document.getElementById('build-dock');

  // --- Inspector-Button verdrahten ------------------------------------------
  if (btnInspector){
    btnInspector.addEventListener('click', ()=>{
      try{
        // Bevorzugt deine Inspector-API
        if (window.GameInspector?.toggle){
          window.GameInspector.toggle(true);
          LOG('ok', 'Inspector geöffnet (GameInspector.toggle).');
        } else {
          // Fallback: kleine Info, damit Nutzer weiß, warum kein großes UI aufpoppt
          alert('Inspector (Fallback) – kein GameInspector.toggle() gefunden.');
          LOG('warn','Inspector Fallback aktiv – window.GameInspector.toggle() fehlt.');
        }
      }catch(e){
        LOG('err','Inspector öffnen fehlgeschlagen: '+e.message);
      }
    });
  }

  // --- Build-Button anfangs verborgen ----------------------------------------
  function showBuildButton(){
    if (!btnBuild) return;
    btnBuild.classList.add('visible');
  }
  function hideBuildButton(){
    if (!btnBuild) return;
    btnBuild.classList.remove('visible');
  }

  // --- Bau-Menü via UIBuild API ----------------------------------------------
  function openBuildMenu(){
    if (!buildDock){ LOG('warn','Build-Dock Element (#build-dock) fehlt.'); return; }
    try{
      // Deine vorhandene API:
      if (window.UIBuild?.open){
        window.UIBuild.open(buildDock);
      }
      // Sichtbar markieren (falls UIBuild nichts am display macht)
      buildDock.classList.add('open');
      LOG('ok','Bau-Menü geöffnet (ui-bridge.js).');
    }catch(e){
      LOG('err','Bau-Menü öffnen fehlgeschlagen: '+e.message);
    }
  }
  function closeBuildMenu(){
    if (!buildDock) return;
    try{
      if (window.UIBuild?.close){
        window.UIBuild.close(buildDock);
      }
      buildDock.classList.remove('open');
      LOG('ok','Bau-Menü geschlossen (ui-bridge.js).');
    }catch(e){
      LOG('err','Bau-Menü schließen fehlgeschlagen: '+e.message);
    }
  }
  function setTool(name){
    try{
      if (window.UIBuild?.setTool){
        window.UIBuild.setTool(name);
        LOG('ok',`Tool gesetzt: ${name}`);
      } else {
        LOG('warn','UIBuild.setTool(name) nicht vorhanden.');
      }
    }catch(e){
      LOG('err','Tool setzen fehlgeschlagen: '+e.message);
    }
  }

  // Build-Button klick öffnet/ schließt das Dock
  if (btnBuild){
    btnBuild.addEventListener('click', ()=>{
      const isOpen = buildDock?.classList.contains('open');
      if (isOpen) closeBuildMenu(); else openBuildMenu();
    });
  }

  // --- GameUI: globale Hooks für andere Module -------------------------------
  window.GameUI = Object.assign(window.GameUI||{}, {
    openBuildMenu, closeBuildMenu, setTool,
    onGameStarted(){
      showBuildButton();
      LOG('ok','onGameStarted: Bau-Button aktiviert.');
    },
    __version: V
  });

  // --- Events auswerten -------------------------------------------------------
  // a) Wenn die UI (index.html) bereit ist, nur loggen:
  window.addEventListener('cb:ui-ready', (e)=>{
    LOG('ok', `UI-Bridge geladen ${V} – index meldet ${e.detail?.v||'unbekannt'}`);
  });

  // b) Wenn das Spiel startet → Bau-Button zeigen
  window.addEventListener('cb:game-started', ()=>{
    showBuildButton();
    LOG('ok','Event: cb:game-started empfangen → Bau-Button sichtbar.');
  });

  // c) Optional: Inspector-Nachladehilfe (falls dein Inspector Lazy lädt)
  // Nichts tun – nur Platzhalter, damit später leicht erweiterbar.

})();
