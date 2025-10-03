/* ============================================================================
 * Datei   : core/core.production.js
 * Projekt : Neue Siedler (Epoche 1)
 * Version : v1.2.0 (2025-10-04)
 * Zweck   : Produktions-Tick liest Ressource & Zyklus aus Registry-Outputs
 * Events  : cb:res:change (bei Lageränderung am Gebäude)
 * ============================================================================
 */
(function(root,factory){ root.Production = factory(); })(this, function(){
  'use strict';

  // ---------------------------- Konstanten -----------------------------------
  const LOG = (window.CBLog?.ok || console.log).bind(console, '[production]');
  const TICK_MS = 1000; // 1 s
  let timer = null, world = null;

  // ---------------------------- Helpers --------------------------------------
  function typeOf(b){
    // tolerant: akzeptiere diverse Felder; fällt zurück auf b.id
    return b?.type || b?.kind || b?.key || b?.archetype || b?.baseId || b?.code || b?.cfgId || b?.id || '';
  }
  function ensureStock(obj){ obj.stock = obj.stock || Object.create(null); return obj.stock; }

  // Default-Zyklen, falls im Registry-Def kein "cycle" gesetzt ist
  // (rein als Fallback; du kannst alles in data/buildings.json steuern)
  const DEFAULT_CYCLE = 6;

  function readProdMeta(b){
    const id     = String(typeOf(b));
    const def    = (window.Registry?.getBuildingDef?.(id)) || null;
    const out0   = def?.outputs && def.outputs[0] ? def.outputs[0] : null;
    const resId  = out0?.id || null;
    const amount = Number.isFinite(+out0?.amount) ? (+out0.amount) : 1;
    const every  = Number.isFinite(+def?.cycle) ? Math.max(1, def.cycle|0) : DEFAULT_CYCLE;
    return (resId ? { res:resId, amount, every, cap:10 } : null);
  }

  // ---------------------------- Tick -----------------------------------------
  function tick(){
    if (!world) return;
    const list = Array.isArray(world.buildings) ? world.buildings : [];

    for (const b of list){
      const meta = readProdMeta(b); if (!meta) continue;

      b.__t = (b.__t||0) + 1;
      if (b.__t % meta.every !== 0) continue;

      const stock = ensureStock(b);
      const cur   = stock[meta.res] | 0;
      if (cur >= (meta.cap|0)) continue;

      stock[meta.res] = cur + meta.amount;
      window.dispatchEvent(new CustomEvent('cb:res:change', { detail:{ src: typeOf(b), res: meta.res, delta:+meta.amount } }));
    }
  }

  // ---------------------------- API ------------------------------------------
  function start(worldRef){
    world = worldRef || { buildings:[], units:[] };
    stop(); timer = setInterval(tick, TICK_MS);
    LOG('gestartet (Gebäude:%d)', world.buildings?.length|0);
  }
  function stop(){ if (timer) clearInterval(timer), timer=null; }

  return { start, stop };
});
