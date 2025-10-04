/* ============================================================================
 * Datei   : core/core.production.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v1.0.0 (2025-10-04)
 * Zweck   : Einfacher Produktions-Tick basierend auf Registry-Definitionen
 *           (outputs[0].id, cycle). Erhöht Gebäudestock und feuert Events.
 * API     : window.Production.start(world), window.Production.stop()
 * Events  : cb:res:change  { detail:{ src:<buildingId>, res:'res.*', delta:+N } }
 * ============================================================================
 */
(function(root,factory){ root.Production = factory(); })(this, function(){
  'use strict';

  const LOG = (window.CBLog?.ok || console.log).bind(console, '[production]');
  const TICK_MS = 1000; // 1 s Tick
  let world = null, timer = null;

  function typeOf(b){ return b?.type || b?.kind || b?.id || ''; }
  function ensureStock(b){ b.stock = b.stock || Object.create(null); return b.stock; }

  const DEFAULT_CYCLE = 6;   // Fallback, falls im Def kein cycle angegeben

  function metaFor(b){
    const id = String(typeOf(b));
    const def = window.Registry?.getBuildingDef?.(id);
    const out0 = def?.outputs?.[0] || null;
    const resId = out0?.id || null;
    const amount = Number.isFinite(+out0?.amount) ? (+out0.amount) : 1;
    const every  = Number.isFinite(+def?.cycle) ? Math.max(1, def.cycle|0) : DEFAULT_CYCLE;
    return resId ? { res:resId, amount, every } : null;
  }

  function tick(){
    if (!world) return;
    for (const b of (world.buildings||[])){
      const m = metaFor(b); if (!m) continue;
      b.__t = (b.__t||0) + 1;
      if (b.__t % m.every !== 0) continue;

      const st = ensureStock(b);
      st[m.res] = (st[m.res]|0) + m.amount;

      window.dispatchEvent(new CustomEvent('cb:res:change', {
        detail:{ src:typeOf(b), res:m.res, delta:+m.amount }
      }));
    }
  }

  function start(worldRef){
    world = worldRef || { buildings:[], units:[] };
    stop(); timer = setInterval(tick, TICK_MS);
    LOG('gestartet (Gebäude:%d)', world.buildings?.length|0);
  }
  function stop(){ if (timer) clearInterval(timer), timer=null; }

  return { start, stop };
});
