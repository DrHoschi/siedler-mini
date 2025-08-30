<!-- Datei: assets/ui/ui-bridge.js  (v16.1.20) -->
<script>
(function(){
  // ---------- LOG Helper (optional) ----------
  const LOG = (lvl,msg)=>{
    try{
      if(window.CBLog){
        const m = `[bridge] ${msg}`;
        if(lvl==='err') window.CBLog.err(m);
        else if(lvl==='warn') window.CBLog.warn(m);
        else window.CBLog.ok?.(m) || window.CBLog.push?.('log',m);
      }else{
        console[lvl==='err'?'error':lvl==='warn'?'warn':'log']('[bridge]', msg);
      }
    }catch(_){}
  };

  // ---------- Inspector-Hook ----------
  // Erwartet von deinem Inspector-Button: window.GameInspector.toggle()
  (function exposeInspector(){
    function tryToggle(){
      const insp = window.GameInspector?.api
                || window.Inspector
                || window.CBInspector
                || null;

      if (insp?.toggle) { insp.toggle(); return true; }
      if (insp?.open && insp?.close){
        // kleine Heuristik: Klassen-Präsenz prüfen
        const isOpen = !!document.querySelector('.inspector, .cb-inspector, [data-inspector-open]');
        isOpen ? insp.close() : insp.open();
        return true;
      }

      // Fallback: Event feuern – neuere Inspector-Versionen können darauf hören
      window.dispatchEvent(new CustomEvent('cb:inspector-toggle'));
      return true;
    }

    window.GameInspector = window.GameInspector || {};
    window.GameInspector.toggle = tryToggle;   // <— WICHTIG für deinen Button
  })();

  // ---------- Build-UI Bridge ----------
  // Erwartet: window.GameUI.openBuildMenu/closeBuildMenu/setTool/onGameStarted
  (function exposeBuildUI(){
    const dock = document.getElementById('build-dock');

    function open(){
      if (!dock) return LOG('warn','build-dock fehlt');
      if (window.UIBuild?.open) {
        window.UIBuild.open(dock);
        dock.classList.add('open');
      } else {
        dock?.classList.add('open'); // Minimal-Fallback
      }
    }
    function close(){
      if (!dock) return;
      if (window.UIBuild?.close) {
        window.UIBuild.close(dock);
      }
      dock.classList.remove('open');
    }
    function setTool(name){
      if (window.UIBuild?.setTool) window.UIBuild.setTool(name);
      else LOG('warn','UIBuild.setTool nicht gefunden');
    }
    function onGameStarted(){
      // Bau-Button sichtbar schalten, wenn Spiel läuft
      document.getElementById('btn-build')?.classList.add('visible');
    }

    window.GameUI = window.GameUI || {};
    Object.assign(window.GameUI, { openBuildMenu: open, closeBuildMenu: close, setTool, onGameStarted });
  })();

  // ---------- Button-Wiring (nur Click-Handler; Layout bleibt unberührt) ----------
  (function wireButtons(){
    const btnInsp  = document.getElementById('btn-inspector');
    const btnBuild = document.getElementById('btn-build');
    const dock     = document.getElementById('build-dock');

    btnInsp?.addEventListener('click', ()=> window.GameInspector?.toggle?.());

    btnBuild?.addEventListener('click', ()=>{
      if (!dock) return;
      const opened = dock.classList.contains('open');
      opened ? window.GameUI?.closeBuildMenu?.() : window.GameUI?.openBuildMenu?.();
    });

    // Wenn Engine meldet, dass Spiel läuft → Bau-Button aktivieren
    window.addEventListener('cb:game-started', ()=> {
      window.GameUI?.onGameStarted?.();
    });
  })();

  LOG('ok', 'Bridge bereit (ui-bridge.js v16.1.20)');
})();
</script>
