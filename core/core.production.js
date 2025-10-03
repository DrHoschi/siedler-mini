/* ============================================================================
 * Datei   : core/core.production.js
 * Projekt : Neue Siedler (Epoche 1)
 * Version : v1.1.0 (2025-10-04)
 * Zweck   : Einfacher Produktions-Tick für Holzfäller, Fischer, Steinbruch
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
  // Versucht, aus einer Instanz den Archetyp zu lesen (tolerant ggü. Feldnamen)
  function typeOf(b){
    return b?.type || b?.kind || b?.key || b?.archetype || b?.baseId || b?.code || b?.cfgId || b?.id || '';
  }
  function is(b, id){ const t=String(typeOf(b)); return t===id || t.endsWith(id) || t.includes(id); }
  function ensureStock(obj){ obj.stock = obj.stock || Object.create(null); return obj.stock; }

  // Produktions-Parameter je Gebäudetyp (MVP-Zeiten/Cap)
  const PROD = {
    'b.lumberjack': { res:'res.wood',  every:5, cap:10, keep:0 },  // alle 5s ein Holz
    'b.fisher'    : { res:'res.fish',  every:6, cap:10, keep:0 },  // alle 6s ein Fisch
    'b.stonecutter':{ res:'res.stone', every:7, cap:10, keep:0 }   // alle 7s ein Stein
  };

  function getProdMeta(b){
    // aus Registry überschreiben, falls dort cycle/outputs definiert sind
    const id = Object.keys(PROD).find(k => is(b, k)) || null;
    const base = id ? { ...PROD[id] } : null;
    const def  = (id && window.Registry?.getBuildingDef?.(id)) || null;
    if (def?.cycle && base) base.every = Math.max(1, def.cycle|0);
    // (optional: def.outputs → res-Typ ableiten)
    return base;
  }

  // ---------------------------- Tick -----------------------------------------
  function tick(){
    if (!world) return;
    const list = Array.isArray(world.buildings) ? world.buildings : [];

    for (const b of list){
      const meta = getProdMeta(b); if (!meta) continue;

      b.__t = (b.__t||0) + 1;
      if (b.__t % meta.every !== 0) continue;

      const stock = ensureStock(b);
      const cur   = stock[meta.res] | 0;
      if (cur >= (meta.cap|0)) continue;

      stock[meta.res] = cur + 1;
      window.dispatchEvent(new CustomEvent('cb:res:change', { detail:{ src: b.id || typeOf(b), res: meta.res, delta:+1 } }));
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
