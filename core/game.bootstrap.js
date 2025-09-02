/* ============================================================================
 * game.bootstrap.js — v17.0.0
 * Projekt: Siedler-Mini
 * Zweck:
 *   - Schlanke Fassade für window.Game, die – wenn vorhanden – GameCore nutzt
 *     (Entities/Obstacles/Roads), aber bestehendes game.js NICHT zerstört.
 *   - Kompatibel zu deinem bisherigen UI (Bau-Menü etc.).
 *
 * Verwendung:
 *   • Diese Datei NACH core.env.js + core.entities.js laden.
 *   • Bestehendes monolithisches game.js kann bleiben. Diese Fassade greift nur,
 *     wenn man die Funktionen direkt über window.Game aufruft.
 * ========================================================================== */
(function(){
  'use strict';

  var GC = window.GameCore;
  var Game = (window.Game = window.Game || {});
  var GL = (window.GameLoader = window.GameLoader || {});

  // --------------------------- Helpers ---------------------------------------
  function resolveKeySafe(k){
    try { return GC?.Entities?.resolveKey ? GC.Entities.resolveKey(k) : k; } catch(_){ return k; }
  }

  // --------------------------- Öffentliche API -------------------------------
  // getTileSize / getMapSize / getCamera: wenn Map-Infos im GameCore liegen
  Game.getTileSize = Game.getTileSize || function(){ try{ return GC?.state?.map?.tile || 64; }catch(_){ return 64; } };
  Game.getMapSize  = Game.getMapSize  || function(){ try{ var m=GC?.state?.map; return m?{w:m.width|0,h:m.height|0}:{w:0,h:0}; }catch(_){ return {w:0,h:0}; } };
  Game.getCamera   = Game.getCamera   || function(){ try{ return GC?.state?.cam || {x:0,y:0,zoom:1}; }catch(_){ return {x:0,y:0,zoom:1}; } };

  // Roads (Set)
  Game.getRoadSet = Game.getRoadSet || function(){ try{ return GC?.state?.roads || new Set(); }catch(_){ return new Set(); } };
  Game.notifyRoadChanged = Game.notifyRoadChanged || function(tx,ty,isRoad){
    try {
      var s = GC?.state?.roads; if (!s) return;
      var k = tx+','+ty; if (isRoad) s.add(k); else s.delete(k);
      if (window.PathFinder?.invalidateRoads) PathFinder.invalidateRoads();
    } catch(_){}
  };

  // Obstacles
  Game.getObstacleAt = Game.getObstacleAt || function(tx,ty){
    try { return !!GC?.Entities?.getObstacleAt?.(tx,ty); } catch(_){ return false; }
  };

  // Tool-API (akzeptiert String ODER {key:"…"})
  Game.setTool = Game.setTool || function(mode, payload){
    try{
      if (mode === 'build'){
        var key = (typeof payload==='string') ? payload : (payload && payload.key) || null;
        key = key ? resolveKeySafe(key) : null;
        window.__GC_TOOL__ = { mode:'build', key:key };
        (GC?.ok||console.log)('[build] Tool gesetzt:', key || '(none)');
      } else {
        window.__GC_TOOL__ = { mode: mode || null, key: null };
        if (mode===null) (GC?.ok||console.log)('[ok] Tool zurückgesetzt');
      }
    }catch(_){}
  };

  // Ressourcen (Fallback)
  Game.addResources = Game.addResources || (function(){
    Game.resources = Game.resources || { wood:0, stone:0, food:0, gold:0 };
    return function(type, amount){
      var t=String(type||'').toLowerCase(), n=(amount|0)||0;
      if (!t || !n) return false;
      Game.resources[t] = (Game.resources[t]||0) + n;
      try { (GC?.ok||console.log)('[res] +'+n+' '+t+' (store='+Game.resources[t]+')'); } catch(_){}
      return true;
    };
  })();

  // Hinweis im Log
  try { (GC?.ok||console.log)('[bootstrap] Game-Fassade aktiv (v17.0.0)'); } catch(_){}

  // An dieser Stelle greifen wir NICHT in dein Game-Start/Loop ein.
  // Dein bestehendes game.js bleibt „Chef“. Später, wenn core.map/render/input/production
  // existieren, können wir hier einen echten Start zusammenbauen.

})();
