/* ============================================================================
 * Datei: game.js
 * Projekt: Siedler-Mini
 * Version: v17.1.0
 * Zweck:
 *   - Legacy-Kompatibilität
 *   - Leitet API-Aufrufe an GameCore/Bootstrap weiter
 *   - Enthält KEINEN eigenen Loop mehr (Loop läuft über game.bootstrap.js)
 * ============================================================================
 */
(function(){
  'use strict';

  var GC  = window.GameCore || {};
  var Game= (window.Game = window.Game || {});

  // --------------------------- API-Fassade -----------------------------------
  Game.setTool        = Game.setTool        || function(m,p){ return GC.Input?.setTool(m,p); };
  Game.getTileSize    = Game.getTileSize    || function(){ return GC.Map?.getTileSize?.() || 64; };
  Game.getMapSize     = Game.getMapSize     || function(){ return GC.Map?.getMapSize?.()  || {w:0,h:0}; };
  Game.getCamera      = Game.getCamera      || function(){ return GC.Map?.getCamera?.()   || {x:0,y:0,zoom:1}; };
  Game.getObstacleAt  = Game.getObstacleAt  || function(x,y){ return GC.Entities?.getObstacleAt?.(x,y) || false; };
  Game.getRoadSet     = Game.getRoadSet     || function(){ return GC.state?.roads || new Set(); };
  Game.notifyRoadChanged = Game.notifyRoadChanged || function(tx,ty,isRoad){
    try {
      var s = GC.state?.roads; if (!s) return;
      var k=tx+','+ty; if(isRoad) s.add(k); else s.delete(k);
      if(window.PathFinder?.invalidateRoads) PathFinder.invalidateRoads();
    }catch(_){}
  };
  Game.addResources = Game.addResources || (function(){
    Game.resources = Game.resources || { wood:0, stone:0, food:0, gold:0 };
    return function(type,amount){
      var t=String(type||'').toLowerCase(), n=(amount|0)||0;
      if(!t||!n) return false;
      Game.resources[t] = (Game.resources[t]||0)+n;
      (GC.ok||console.log)('[res] +'+n+' '+t+' ('+Game.resources[t]+')');
      return true;
    };
  })();

  // --------------------------- Hinweis ---------------------------------------
  (GC.ok||console.log)('[game.js] Legacy-API aktiv (v17.1.0)');

})();
