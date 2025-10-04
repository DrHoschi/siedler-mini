/* ============================================================================
 * Datei   : core/core.production.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v1.1.0 (2025-10-05)
 * Zweck   : Simpler Produktions-Ticker für Epoche-1 (Holz/Stein/Fisch)
 * API     : Production.start(world)
 * Events  : cb:res:change bei jedem erzeugten Item (delta:+1)
 *
 * Hinweise:
 *  - Dieser Ticker ist bewusst simpel (keine Arbeiter/Inputs)
 *  - Er füttert nur den "stock" der Gebäude → Carrier lesen daraus
 *  - IDs:
 *      lumberjack → res.wood
 *      quarry     → res.stone
 *      fisher     → res.fish
 * ============================================================================ */
(function(root,factory){ root.Production = factory(); })(this, function(){
  'use strict';
  const LOG = (window.CBLog?.ok || console.log).bind(console, '[production]');
  const WARN= (window.CBLog?.warn|| console.warn).bind(console, '[production]');

  let world = null;
  let tProd = null;

  const MAP = Object.freeze({
    lumberjack: 'res.wood',
    quarry    : 'res.stone',
    fisher    : 'res.fish'
  });

  function resIdFor(b){
    const k = String(b?.id||b?.type||'').toLowerCase();
    return MAP[k] || null;
  }

  function tick(){
    for (const b of (world?.buildings||[])) {
      const resId = resIdFor(b); if (!resId) continue;
      b.stock = b.stock || Object.create(null);
      b.stock[resId] = (b.stock[resId]|0) + 1;
      // Info fürs HUD (optional)
      window.dispatchEvent(new CustomEvent('cb:res:change', { detail:{
        dst:String(b.id||b.type), res:resId, delta:+1
      }}));
    }
  }

  function start(worldRef){
    world = worldRef || { buildings:[], units:[] };
    if (tProd) clearInterval(tProd);
    tProd = setInterval(tick, 2000); // alle 2s etwas erzeugen
    LOG('gestartet (Gebäude:%d)', (world.buildings||[]).length);
  }

  return { start };
});
