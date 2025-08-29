/* ui-bridge.js – v16.1.16
 * Brücke zwischen deinem Bau-Menü (assets/ui/ui-build.js) und globalen Hooks,
 * damit index.html/Inspector NICHTS über interne Strukturen wissen muss.
 */
(function(){
  const V = "v16.1.16";
  window.__cb = window.__cb || { logs: [] };
  const log = (type, msg)=>{
    window.__cb.logs.push({ t:Date.now(), type, msg });
    window.dispatchEvent(new CustomEvent('cb:log', { detail:{ type, msg }}));
  };

  // Erwartete öffentliche API deines Bau-UI (falls anders, hier anpassen)
  // Wir kapseln alles in window.GameUI.*
  const GameUI = window.GameUI || (window.GameUI = {});
  GameUI.version = V;

  // Falls dein ui-build.js eigene globale Funktionen anbietet, hier andocken.
  // Andernfalls Dummy-Warnungen, damit der Log dir sagt, was fehlt.
  GameUI.openBuildMenu = GameUI.openBuildMenu || function(){
    if (window.UIBuild?.open) { window.UIBuild.open(); }
    else log('warn','Bau-Menü ist (noch) nicht eingebunden – window.GameUI.openBuildMenu() fehlt.');
  };
  GameUI.closeBuildMenu = GameUI.closeBuildMenu || function(){
    if (window.UIBuild?.close) { window.UIBuild.close(); }
  };
  GameUI.setTool = GameUI.setTool || function(toolId){
    if (window.UIBuild?.setTool) window.UIBuild.setTool(toolId);
  };

  // Wenn die Engine gemeldet hat, dass das Spiel läuft, lass optional den Build-Button blinken etc.
  window.addEventListener('cb:game-started', ()=>{
    log('log', `[ok] Bau-Menü-Bridge aktiv (ui-bridge.js ${V})`);
  });
})();
