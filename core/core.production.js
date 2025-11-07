/* ============================================================================
 * Datei   : core/production.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.10.25-final
 *
 * Zweck   : Simpler Produktions-Ticker (Epoche 1)
 *           – erzeugt periodisch Ressourcen in Gebäude-Lagern
 *           – emittiert cb:res:change
 *           – erzeugt (optional) Abhol-Jobs für Carrier (Game.enqueueJob oder Event)
 *
 * Abhängigkeiten (optional):
 *   – Entities.state.list (Gebäude), Registry (Outputs/Rate), Game.enqueueJob, Game.hqPos
 *
 * API:
 *   Production.start(worldRef?)   // worldRef={buildings:[...]} optional, sonst Entities
 *   Production.stop()
 *   Production.setRate(kind, ms)  // override pro Gebäudetyp
 *   Production.isRunning() : bool
 *
 * Events (emit):
 *   – cb:res:change {res, delta:+1, src:{id,kind}, bpos:{x,y}}
 *   – cb:job:new    {from:{x,y}, to:{x,y}, res}   // falls kein Game.enqueueJob vorhanden
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[production]';
  const LOG  = (...a)=> (window.CBLog?.ok    ?? console.log )(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn  ?? console.warn)(TAG, ...a);

  const VERSION = 'v25.10.25-final';

  // ---- Fallback-Map (wenn keine Registry vorhanden) -------------------------
  // kind → { res:'res.*', rate:ms }
  const FALLBACK = {
    lumberjack : { res:'res.wood',  rate:2000 },
    quarry     : { res:'res.stone', rate:3000 },
    fisher     : { res:'res.fish',  rate:2500 }
  };

  // overrides per Typ (kann via setRate() geändert werden)
  const RATE_OVERRIDE = Object.create(null);

  // ---- Helpers --------------------------------------------------------------
  const EVT = (n,d)=> window.dispatchEvent(new CustomEvent(n,{ detail:d }));

  const TileSize = ()=> (window.Game?.tileSize || window.Entities?.state?.tile || 64);

  function regGet(type, id){
    try { return window.Registry?.get?.(type, id) ?? null; }
    catch { return null; }
  }

  function producerSpec(kind){
    const k = String(kind||'').toLowerCase();
    // 1) Registry: building "b.kind" → outputs[{res, everyMs}], sonst fields {output, rate_ms}
    const b = regGet('building','b.'+k) || regGet('building', k);
    if (b) {
      // prefer explicit outputs[]
      if (Array.isArray(b.outputs) && b.outputs.length){
        const out = b.outputs[0];
        return { res: out.res || out.id || FALLBACK[k]?.res, rate: Number(out.everyMs||out.rate_ms||FALLBACK[k]?.rate||2000) };
      }
      // legacy single fields
      if (b.output || b.res){
        return { res: b.output || b.res, rate: Number(b.rate_ms||FALLBACK[k]?.rate||2000) };
      }
    }
    // 2) Fallback
    const fb = FALLBACK[k];
    return fb ? { res: fb.res, rate: Number(RATE_OVERRIDE[k]||fb.rate||2000) } : null;
  }

  function hqWorldPos(){
    // bevorzugt: Game.hqPos (Tile-Koords)
    try {
      if (window.Game?.hqPos && typeof window.Game.hqPos.x==='number') {
        const t = TileSize();
        return { x: window.Game.hqPos.x * t, y: window.Game.hqPos.y * t };
      }
    }catch{}
    // Fallback: Entities erstes rathaus/hq
    try {
      const list = window.Entities?.state?.list || [];
      const t = TileSize();
      const hq = list.find(e => e.kind==='rathaus' || e.kind==='hq');
      if (hq) return { x: hq.x + hq.w/2, y: hq.y + hq.h/2 };
    }catch{}
    return { x:0, y:0 };
  }

  function buildingCenterPx(b){
    return { x: (b.x||0) + (b.w||TileSize())/2, y: (b.y||0) + (b.h||TileSize())/2 };
  }

  // ---- Laufzeit-Status ------------------------------------------------------
  let world = null;      // { buildings:[ {id,kind,x,y,w,h,stock?} ... ] }
  let timer = 0;         // setInterval id
  let running = false;

  // Per-Gebäude Produktionsmarker: id -> nextAt timestamp
  const nextAt = new Map();

  function currentBuildings(){
    if (world && Array.isArray(world.buildings)) return world.buildings;
    const list = window.Entities?.state?.list;
    return Array.isArray(list) ? list : [];
  }

  function ensureStock(b){
    if (!b.stock) b.stock = Object.create(null);
    return b.stock;
  }

  function enqueuePickupJob(fromBld, resId){
    const from = buildingCenterPx(fromBld);     // Weltpixel
    const to   = hqWorldPos();                   // Weltpixel
    const t    = TileSize();
    // Carrier erwartet Tiles → umrechnen
    const job = {
      from: { x: Math.floor(from.x / t), y: Math.floor(from.y / t) },
      to:   { x: Math.floor(to.x   / t), y: Math.floor(to.y   / t) },
      res:  resId
    };
    // Preferred: Engine-Queue
    if (typeof window.Game?.enqueueJob === 'function'){
      try { window.Game.enqueueJob(job); return true; } catch(e){ WARN('enqueueJob Fehler:', e?.message||e); }
    }
    // Fallback: Event – eine zentrale JobQueue kann darauf hören
    try { EVT('cb:job:new', job); return true; } catch {}
    return false;
  }

  function tick(){
    const now = Date.now();
    const buildings = currentBuildings();
    if (!buildings.length) return;

    for (const b of buildings){
      const spec = producerSpec(b.kind);
      if (!spec || !spec.res || !Number.isFinite(spec.rate)) continue;

      const due = nextAt.get(b.id) ?? 0;
      if (now < due) continue;

      // produzieren
      const stock = ensureStock(b);
      stock[spec.res] = (stock[spec.res]|0) + 1;

      // HUD benachrichtigen
      EVT('cb:res:change', {
        res: spec.res,
        delta: +1,
        src: { id: b.id, kind: b.kind },
        bpos: { x: b.x, y: b.y }
      });

      // Abhol-Job erzeugen (soft)
      enqueuePickupJob(b, spec.res);

      // nächsten Termin planen
      const rate = Number(RATE_OVERRIDE[b.kind] || spec.rate || 2000);
      nextAt.set(b.id, now + Math.max(200, rate));
    }
  }

  function bindEntityChanges(){
    // Wenn Entities sich ändern, nächste Produktion neu verteilen
    window.addEventListener('cb:entities:changed', ()=>{
      // Reset der nextAt für neue Gebäude, alte bleiben
      const ids = new Set(currentBuildings().map(b=>b.id));
      for (const id of Array.from(nextAt.keys())){
        if (!ids.has(id)) nextAt.delete(id);
      }
    });
  }

  // ---- Public API -----------------------------------------------------------
  const Production = {
    start(worldRef){
      world = worldRef || null;
      if (timer) clearInterval(timer);
      timer = setInterval(tick, 250); // schneller Ticker, der selbst auf due prüft
      running = true;
      bindEntityChanges();
      LOG('gestartet (v%s)', VERSION);
    },
    stop(){
      if (timer){ clearInterval(timer); timer = 0; }
      running = false;
      LOG('gestoppt');
    },
    isRunning(){ return running; },
    setRate(kind, ms){
      if (!kind) return;
      RATE_OVERRIDE[String(kind).toLowerCase()] = Math.max(100, Number(ms)||1000);
      LOG('Rate override:', kind, RATE_OVERRIDE[String(kind).toLowerCase()]+'ms');
    }
  };

  // ---- Auto-Start (optional, wenn gewünscht) --------------------------------
  // Starte nach Spielstart automatisch, wenn nicht manuell gestartet
  window.addEventListener('cb:game:start', ()=>{
    if (!Production.isRunning()) Production.start();
  });

  // ---- Export ---------------------------------------------------------------
  window.Production = Production;
})();
