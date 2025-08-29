// assets/ui/ui-bridge.js — v16.1.17
// ---------------------------------------------------------
// Brücke zwischen Spiel-Events und Bau-Menü.
// Stellt window.GameUI.* bereit, damit Inspector-Logs ruhig werden:
//   - openBuildMenu(), closeBuildMenu(), toggleBuildMenu()
//   - setTool(id)
// Handhabt den Build-FAB (#btn-build): sichtbar NACH Spielstart.
// ---------------------------------------------------------
(function(){
  const V='v16.1.17';
  const log = (lvl,msg)=>{
    try{
      if(window.CBLog){
        (window.CBLog[lvl]||window.CBLog.push)(lvl,msg);
      }else{
        console[lvl==='err'?'error':lvl==='warn'?'warn':'log'](msg);
      }
    }catch(_){}
  };

  const btnBuild = document.getElementById('btn-build');

  // Public Hooks, die von Inspector/Logs erwartet werden
  const GameUI = window.GameUI = window.GameUI || {};
  GameUI.openBuildMenu  = ()=> window.UIBuild?.open()  ?? log('warn','Bau-Menü API nicht gefunden – erwarte globale Variable z.B. window.UIBuild');
  GameUI.closeBuildMenu = ()=> window.UIBuild?.close() ?? log('warn','Bau-Menü API nicht gefunden – erwarte globale Variable z.B. window.UIBuild');
  GameUI.toggleBuildMenu= ()=> window.UIBuild?.toggle()?? log('warn','Bau-Menü API nicht gefunden – erwarte globale Variable z.B. window.UIBuild');
  GameUI.setTool        = (id)=> window.UIBuild?.setTool(id) ?? log('warn','Bau-Menü API nicht gefunden – erwarte globale Variable z.B. window.UIBuild');

  // FAB klick: toggeln
  if(btnBuild){
    btnBuild.addEventListener('click', ()=>{
      GameUI.toggleBuildMenu();
    });
  }

  // Nach Spielstart: Build-Button einblenden
  window.addEventListener('cb:game-started', ()=>{
    if(btnBuild){ btnBuild.classList.add('visible'); }
    log('ok','onGameStarted: Bau-Button aktiviert');
    // Optional: Standard-Tool setzen
    try{ GameUI.setTool('road'); }catch(_){}
  });

  log('ok', `UI-Bridge bereit (ui-bridge.js ${V})`);
})();
