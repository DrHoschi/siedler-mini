/* ============================================================================
 * Datei   : core/core.production.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v1.1.0 (2025-10-04)
 * Zweck   : Einfacher Produktions-Tick basierend auf Registry-Definitionen
 *           (outputs[0].id, cycle). Erhöht Gebäudestock und feuert Events.
 * API     : window.Production.start(world), window.Production.stop()
 * Events  : cb:res:change  { detail:{ src:<buildingId>, res:'res.*', delta:+N } }
 * ============================================================================ */
(function(root,factory){ root.Production = factory(); })(this, function(){
  'use strict';

  const LOG = (window.CBLog?.ok || console.log).bind(console, '[production]');
  const TICK_MS = 1000; // 1 s Tick
  let world = null, timer = null;

  function typeOf(b){ return b?.type || b?.kind || b?.id || ''; }
  function ensureStock(b){ b.stock = b.stock || Object.create(null); return b.stock; }

  const DEFAULT_CYCLE = 6;   // Fallback

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

  // Beim Platzieren neuer Gebäude: einmal „Vorladen“, falls produktiv
  window.addEventListener('cb:build:place', (ev)=>{
    const d = ev?.detail; if (!d) return;
    const def = window.Registry?.getBuildingDef?.(d.id||d.type) || null;
    const out = def?.outputs?.[0] || null;
    if (!out?.id) return;
    // die echte Instanz in der world suchen (gleiches Tile-Rechteck)
    const w = world || window.Game?.world;
    const inst = (w?.buildings||[]).find(b => (b.x|0)=== (d.x|0) && (b.y|0)===(d.y|0) && String(typeOf(b))===String(d.id));
    if (!inst) return;
    const st = ensureStock(inst);
    st[out.id] = (st[out.id]|0) + (Number.isFinite(+out.amount)?(+out.amount):1);
    window.dispatchEvent(new CustomEvent('cb:res:change', { detail:{ src:typeOf(inst), res:out.id, delta:+(out.amount||1) }}));
  });

  function start(worldRef){
    world = worldRef || { buildings:[], units:[] };
    stop();
    // SOFORT einmal ticken, dann Intervall starten
    tick();
    timer = setInterval(tick, TICK_MS);
    LOG('gestartet (Gebäude:%d)', world.buildings?.length|0);
  }
  function stop(){ if (timer) clearInterval(timer), timer=null; }

  return { start, stop };
});
