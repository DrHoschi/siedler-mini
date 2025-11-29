/* ============================================================================
 * Datei   : core/game.build.js
 * Version : v25.11.29-placefix
 * Zweck   : Gebäude platzieren + Baujobs erzeugen + cb:build:place anbinden
 * ========================================================================= */

(function(){
  'use strict';

  const TAG  = '[build]';
  const LOG  = (...a)=> (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  //  EIN GEBÄUDE PLATZIEREN
  // -------------------------------------------------------------------------
  function place(id, x, y){
    const reg = window.Registry || {};

    // Definition aus Registry holen (egal ob getBuilding oder plain Objekt)
    let def = null;
    if (typeof reg.getBuilding === 'function'){
      def = reg.getBuilding(id);
    } else if (reg.buildings && reg.buildings[id]){
      def = reg.buildings[id];
    }

    if (!def){
      WARN('Registry kennt Gebäude nicht → verwende Platzhalter 3x3:', id);
    }

    const w = def?.size?.w ?? def?.size?.width ?? 3;
    const h = def?.size?.h ?? def?.size?.height ?? 3;

    if (!window.Game){
      WARN('Game fehlt – kann Gebäude nicht anlegen');
      return;
    }
    if (!Array.isArray(Game.buildings)){
      Game.buildings = [];
    }

    const b = {
      id,
      type       : id,
      x : x|0,
      y : y|0,
      w,
      h,
      buildStage : 0,      // 0 = Baustelle
      buildTimer : 0,
      stock      : 0
    };

    Game.buildings.push(b);

    // HQ-Spezialfall → Position für Carrier merken
    if (id === 'b.hq' && window.GameUnits){
      GameUnits.hqPos = { x: b.x, y: b.y };
      LOG('HQ gesetzt', GameUnits.hqPos);
    }

    // Einfacher Baujob: 1x Holz vom HQ zur Baustelle
    if (window.GameUnits?.assignJob && GameUnits.hqPos){
      GameUnits.assignJob({
        type      : 'build',
        res       : 'wood',
        from      : { x: GameUnits.hqPos.x, y: GameUnits.hqPos.y },
        to        : { x: b.x, y: b.y },
        buildingId: id
      });
    }

    // Event für andere Systeme (Construction, Inspector, HUD …)
    try{
      window.dispatchEvent(new CustomEvent('cb:build:placed',{
        detail:{ id, x:b.x, y:b.y, w:b.w, h:b.h }
      }));
    }catch{}

    LOG('Gebäude platziert:', id, '→', b.x, b.y, '| Anzahl=', Game.buildings.length);
  }

  // -------------------------------------------------------------------------
  //  EVENT-BRIDGE: cb:build:place → place(...)
  // -------------------------------------------------------------------------
  function onBuildPlace(ev){
    const d = ev?.detail || {};

    // ID aus verschiedenen möglichen Feldern holen
    const id = String(d.buildingId ?? d.kind ?? d.type ?? d.id ?? '');
    if (!id){
      WARN('cb:build:place ohne gültige ID', d);
      return;
    }

    // Koordinaten (wir erlauben x/y ODER tx/ty)
    const rawX = d.x ?? d.tx;
    const rawY = d.y ?? d.ty;
    if (!Number.isFinite(rawX) || !Number.isFinite(rawY)){
      WARN('cb:build:place ohne Koordinaten', d);
      return;
    }

    place(id, rawX|0, rawY|0);
  }

  window.addEventListener('cb:build:place', onBuildPlace);

  // -------------------------------------------------------------------------
  //  EXPORT
  // -------------------------------------------------------------------------
  window.GameBuild = { place };

})();
