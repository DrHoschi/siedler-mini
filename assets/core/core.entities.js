/* ============================================================================
 * core.entities.js — Entity-Verwaltung (leichtgewichtig)
 * Version: v17.5.0
 * Projekt: Neue Siedler
 *
 * Aufgaben
 *  - Zentrale, minimale Entity-Liste (id, type, x, y)
 *  - Platzierung über cb:place-building (von core.input/ui-build)
 *  - Kollision rudimentär: einfache Tile-Belegung (1x1-Bauten)
 *  - Repaint anstoßen (cb:request-repaint)
 *
 * Events (listen)
 *  - cb:place-building {type,x,y}
 *
 * API (global)
 *  - window.CoreEntities.list()              → Array der Entities
 *  - window.CoreEntities.findAt(x,y)         → Entity | null
 *  - window.CoreEntities.create(type,x,y)    → Entity | null
 *  - window.CoreEntities.removeAt(x,y)       → boolean
 *
 * Notizen
 *  - Rendering übernimmt core.render.js; hier nur Datenhaltung + Events.
 *  - Für größere Gebäude später Footprints/Tür-Offsets ergänzen.
 * ========================================================================== */
(function(){
  'use strict';

  var VER = 'v17.5.0';
  var MOD = '[entities]';

  // ---- Logging --------------------------------------------------------------
  function ok(m){ try{ (window.CBLog?.ok||console.log)(m);}catch(_){ console.log(m);} }
  function warn(m){ try{ (window.CBLog?.warn||console.warn)(m);}catch(_){ console.warn(m);} }
  function err(m){ try{ (window.CBLog?.err||console.error)(m);}catch(_){ console.error(m);} }

  // ---- Core-State -----------------------------------------------------------
  var _nextId = 1;
  var _list = [];              // {id,type,x,y}
  var _grid = new Map();       // key "x,y" → id

  function key(x,y){ return x+','+y; }

  // ---- API ------------------------------------------------------------------
  var CoreEntities = (window.CoreEntities = window.CoreEntities || {});

  CoreEntities.list = function(){ return _list.slice(0); };

  CoreEntities.findAt = function(x,y){
    var id = _grid.get(key(x|0,y|0));
    if (!id) return null;
    for (var i=0;i<_list.length;i++){
      if (_list[i].id === id) return _list[i];
    }
    return null;
  };

  CoreEntities.create = function(type, x, y){
    try{
      x|=0; y|=0;
      if (!type){ warn(MOD+' create: kein Typ'); return null; }
      var k = key(x,y);
      if (_grid.has(k)){
        warn(MOD+' create: Feld belegt @'+k);
        return null;
      }
      var e = { id:_nextId++, type:String(type), x:x, y:y };
      _list.push(e);
      _grid.set(k, e.id);
      ok('[ok] Gebäude platziert: '+e.type+' at '+x+' '+y);
      // Repaint anstoßen
      try{ window.dispatchEvent(new Event('cb:request-repaint')); }catch(_){}
      return e;
    }catch(e){
      err(MOD+' create Fehler: '+(e&&e.message));
      return null;
    }
  };

  CoreEntities.removeAt = function(x,y){
    x|=0; y|=0;
    var k = key(x,y);
    var id = _grid.get(k);
    if (!id) return false;
    _grid.delete(k);
    for (var i=0;i<_list.length;i++){
      if (_list[i].id === id){
        _list.splice(i,1);
        ok(MOD+' remove id='+id+' @'+k);
        try{ window.dispatchEvent(new Event('cb:request-repaint')); }catch(_){}
        return true;
      }
    }
    return false;
  };

  // ---- Event-Brücken --------------------------------------------------------
  window.addEventListener('cb:place-building', function(ev){
    try{
      var d = ev?.detail||{};
      var type = d.type||'';
      var x = d.x|0, y = d.y|0;

      // einfache Kollision: 1x1-Platz belegt?
      if (CoreEntities.findAt(x,y)){
        warn(MOD+' Platz belegt @'+x+','+y);
        return;
      }
      var e = CoreEntities.create(type,x,y);
      if (!e) return;

      // Optional: hier Footprint/Tür-Handling / Produktion etc. anhängen.

    }catch(e){
      err(MOD+' cb:place-building Fehler: '+(e&&e.message));
    }
  });

  ok(MOD+' Modul geladen ('+VER+')');
})();
