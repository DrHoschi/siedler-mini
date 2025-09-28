/* ============================================================================
 * Datei: core.production.js
 * Projekt: Siedler-Mini
 * Version: v17.0.0
 * Zweck:
 *   - Produktions-Tick (Gebäude produzieren Rohstoffe)
 *   - Überschuss versenden → Carrier spawnen
 *   - Zielwahl: nächste Drop-Struktur (Depot/HQ/Townhall) über Tür-Kachel
 *   - Carrier-Glue: trySpawnCarrier()
 * ============================================================================
 */
(function(ns){
  'use strict';
  if (!ns || !ns.state) { console.error('[production] GameCore.env fehlt'); return; }

  var S = ns.state;
  var U = ns.util;
  var E = ns.Entities;

  // --------------------------- Tür-basierte Zielwahl -------------------------
  function findNearestDropDoor(sx,sy){
    var best=null, bestD=1e9;
    for (var i=0;i<S.entities.length;i++){
      var e=S.entities[i];
      if (e.key!=='depot' && e.key!=='hq' && e.key!=='townhall') continue;
      var door=E.pickEntryDoor(e);
      if (!door) continue;
      if (E.getObstacleAt(door.x,door.y)) continue;
      var d=Math.abs(door.x-sx)+Math.abs(door.y-sy);
      if (d<bestD){ bestD=d; best={x:door.x,y:door.y}; }
    }
    return best;
  }

  // --------------------------- Carrier-Glue ----------------------------------
  function trySpawnCarrier(from,to){
    try{
      if (window.PathFinder && PathFinder.setRoadMask) PathFinder.setRoadMask(S.roads);
      if (window.PathFinder && PathFinder.setObstacleProvider) PathFinder.setObstacleProvider(E.getObstacleAt);
      if (window.Carriers && Carriers.spawn){
        return Carriers.spawn({ from:from, to:to });
      }
    }catch(_){}
    return null;
  }

  // --------------------------- Produktions-Tick ------------------------------
  function tick(dt){
    for (var i=0;i<S.entities.length;i++){
      var e=S.entities[i];
      if (!e.prod) continue;

      // Produktion
      e.tickAcc=(e.tickAcc||0)+dt*e.prod.rate;
      if (e.tickAcc>=1){
        var add=Math.floor(e.tickAcc); e.tickAcc-=add;
        var t=e.prod.type, cur=(e.stock[t]|0), cap=e.prod.cap|0;
        if (cur<cap){ e.stock[t]=Math.min(cap,cur+add); }
      }

      // Überschuss versenden
      var type=e.prod.type, keep=e.prod.keep|0, have=(e.stock[type]|0);
      if (have>keep){
        var src=E.pickExitDoor(e)||{x:e.tx+(e.wTiles>>1), y:e.ty+(e.hTiles>>1)};
        var dst=findNearestDropDoor(src.x,src.y);
        if (dst){
          e._sendAcc=(e._sendAcc||0)+dt;
          if (e._sendAcc>1.0){
            e._sendAcc=0;
            var c=trySpawnCarrier(src,dst);
            if (c){
              e.stock[type]=Math.max(keep, e.stock[type]-1);
              ns.ok('[auto] Carrier gestartet von',src.x,src.y,'→',dst.x,dst.y);
            }
          }
        }
      }
    }
  }

  // --------------------------- Export ----------------------------------------
  ns.Production = { tick:tick, findNearestDropDoor:findNearestDropDoor };

  ns.ok('[production] Modul geladen (v17.0.0)');

})(window.GameCore = window.GameCore || {});
