// assets/ui/ui-bridge.js
// v16.1.19 – Stabile, globale Hooks für Inspector und Bau-Menü
// ------------------------------------------------------------
// Liefert: window.GameInspector.toggle(), window.GameUI.{openBuildMenu,closeBuildMenu,onGameStarted,setTool}

(function(){
  const LOG = (t,m)=> (window.CBLog?.[t]||console.log)(m);

  // ===== Inspector-Hook ======================================================
  // Nutzt bevorzugt die echte Inspector-API; ansonsten Fallback-Modal.
  function openInspector(){
    if (window.CBInspector?.open) { window.CBInspector.open(); return; }
    alert("Inspector (Fallback) – kein Game-Inspector.toggle() gefunden.");
  }
  function closeInspector(){
    if (window.CBInspector?.close) { window.CBInspector.close(); return; }
  }
  window.GameInspector = window.GameInspector || {
    toggle(){
      // wenn offen -> schließen, sonst öffnen (CBInspector verwaltet Zustand selbst)
      openInspector();
    },
    open: openInspector,
    close: closeInspector
  };

  // ===== Build-UI Hook =======================================================
  const $buildBtn = ()=> document.getElementById('btn-build');
  const $dock     = ()=> document.getElementById('build-dock');

  // Wird von main.js aufgerufen, wenn das Spiel gestartet hat.
  function onGameStarted(){
    const b = $buildBtn();
    if (!b) return;
    b.classList.add('visible');
  }

  function openBuildMenu(){
    const dock = $dock();
    if (!dock){ LOG('warn', 'Build-Dock fehlt (#build-dock).'); return; }

    // Falls deine ui-build.js eine eigene API bereitstellt, nutze sie:
    if (window.UIBuild?.open) {
      window.UIBuild.open(dock);
      LOG('ok', '[ok] Bau-Menü geöffnet (ui-build.js)');
      return;
    }

    // Minimaler Fallback (nur Dock sichtbar machen)
    dock.classList.add('open');
    LOG('warn', 'Bau-Menü API nicht gefunden — erwartete globale Variable z.B. window.UIBuild');
  }

  function closeBuildMenu(){
    const dock = $dock();
    if (!dock) return;
    if (window.UIBuild?.close) {
      window.UIBuild.close(dock);
      return;
    }
    dock.classList.remove('open');
  }

  function setTool(name){
    if (window.UIBuild?.setTool) {
      window.UIBuild.setTool(name);
    }
    // Optional: hier könntest du dein Tool auch an die Engine weiterreichen.
  }

  // Globale API (wird im Log referenziert)
  window.GameUI = window.GameUI || {
    onGameStarted,
    openBuildMenu,
    closeBuildMenu,
    setTool
  };

  // ===== Buttons verdrahten (einmalig) =======================================
  // Wir hängen click-Handler hier dran, damit nichts doppelt feuert.
  function wireButtonsOnce(){
    const buildBtn = $buildBtn();
    if (buildBtn && !buildBtn.__wired){
      buildBtn.__wired = true;
      buildBtn.addEventListener('click', ()=> window.GameUI.openBuildMenu(), { passive:true });
    }
    const inspBtn = document.getElementById('btn-inspector');
    if (inspBtn && !inspBtn.__wired){
      inspBtn.__wired = true;
      inspBtn.addEventListener('click', ()=> window.GameInspector.toggle(), { passive:true });
    }
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', wireButtonsOnce, { once:true });
  } else {
    wireButtonsOnce();
  }

  LOG('ok', 'UI-Bridge bereit (ui-bridge.js v16.1.19)');
})();
