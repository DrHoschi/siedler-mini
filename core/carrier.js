/* ============================================================================
 * Datei   : core/carrier.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v1.2.0 (2025-10-05)
 * Zweck   : Träger-Logik (Jobs, Bewegung, Lieferung ins HQ)
 * API     : Carriers.start(world), Carriers.spawn(opts), Carriers.list()
 * Events  : 
 *   - cb:path:trace  { from:{x,y}, to:{x,y}, unit }
 *   - cb:res:change  { dst:<string>, res:"res.*", delta:<int> }
 *
 * Änderungen:
 *   - Spawn & Parken an der **Tür-Kachel** (nicht mehr Gebäudemitte)
 *   - Quellen-Zuordnung über stock["res.*"] der Produktionsgebäude
 *   - Kameraversatzfrei (Zeichnung übernimmt unit-overlay)
 *   - Robust gegen leere Welt & fehlerhafte Defs
 * ============================================================================ */
(function (root, factory) { root.Carriers = factory(); })(this, function () {
  'use strict';

  const LOG = (window.CBLog?.ok || console.log).bind(console, '[carriers]');
  const WARN= (window.CBLog?.warn|| console.warn).bind(console, '[carriers]');

  // --- Modul-Status ----------------------------------------------------------
  let world = null;
  let list  = [];         // Träger-Objekte
  let tAssign = null;     // setInterval-ID (Assignment)
  let tStep   = null;     // setInterval-ID (Movement)

  // --- Hilfen ----------------------------------------------------------------
  const tileSize = () => (Number(window.Game?.map?.tile) || 64);

  // hole Build-Def aus der Registry
  function _getDef(id) {
    try {
      return window.Registry?.getBuildingDef?.(String(id)) ||
             (window.Registry?.byId?.(id)) ||
             (window.Registry?.get?.('buildings')||[]).find(b=>String(b.id)===String(id)) ||
             null;
    } catch { return null; }
  }

  // Welt-Pixel der **ersten** Tür eines Gebäudes
  function entrancePx(b) {
    const ts  = tileSize();
    const def = _getDef(b.id || b.type || b.kind);
    const rel = (def?.entrances && def.entrances[0]) || null;
    if (rel) {
      const tx = (b.x|0) + (rel[0]|0);
      const ty = (b.y|0) + (rel[1]|0);
      return { x: (tx+0.5)*ts, y: (ty+0.5)*ts };
    }
    // Fallback: Gebäudemitte
    return { x: ((b.x||0)+(b.w||1)/2)*ts, y: ((b.y||0)+(b.h||1)/2)*ts };
  }

  const isHQ = (b) => String(b?.id||b?.type||'').toLowerCase()==='hq';
  const len  = (dx,dy)=>Math.hypot(dx,dy);

  // einfache lineare Bewegung u→(tx,ty), dt=ms
  function move(u, tx, ty, dtMs) {
    const SPEED = 0.9 * tileSize(); // ≈ 0.9 Kacheln/s
    const dt = Math.max(0, +dtMs||0) / 1000;
    const dx = tx - (u.x||0), dy = ty - (u.y||0);
    const d  = Math.hypot(dx, dy);
    if (d < 0.8) { u.x = tx; u.y = ty; return true; }
    const step = Math.min(d, SPEED * dt);
    const k = step / (d || 1);
    u.x += dx * k; u.y += dy * k;
    return false;
  }

  function ensure(obj, key) { obj[key] = obj[key] || Object.create(null); return obj[key]; }

  // --- Quellen & Jobs --------------------------------------------------------
  function findHQ() { return (world?.buildings||[]).find(isHQ) || null; }

  function sourceBuildings() {
    // Gebäude, die mind. eine res.* im Stock >0 haben
    const out = [];
    for (const b of (world?.buildings||[])) {
      if (!b || isHQ(b)) continue;
      const st = b.stock || {};
      for (const [res, qty] of Object.entries(st)) {
        if (res.startsWith('res.') && (qty|0) > 0) { out.push({ b, res }); break; }
      }
    }
    return out;
  }

  function pickIdleCarrier(resId) {
    // (optional: Filter nach Präferenz) – aktuell: erster ohne Job
    return list.find(u => !u.job && (!u.prefers || u.prefers.includes(resId)));
  }

  function assign() {
    const hq = findHQ(); if (!hq) return;
    const E  = entrancePx(hq);
    for (const s of sourceBuildings()) {
      const u = pickIdleCarrier(s.res); if (!u) break;
      // Carrier, die noch keine Position haben → am HQ parken
      if (typeof u.x!=='number' || typeof u.y!=='number') { u.x = E.x; u.y = E.y; }
      const from = entrancePx(s.b);
      const to   = E;
      u.job = {
        phase:'toSource',
        from, to, fromRef:s.b, toRef:hq,
        res:s.res
      };
      window.dispatchEvent(new CustomEvent('cb:path:trace', { detail:{ from, to, unit:u } }));
      LOG('Job vergeben: %s ← %s', s.res, String(s.b.id||s.b.type));
    }
  }

  function step(dt) {
    for (const u of list) {
      const j = u.job; if (!j) continue;

      if (j.phase === 'toSource') {
        if (move(u, j.from.x, j.from.y, dt)) j.phase = 'pickup';

      } else if (j.phase === 'pickup') {
        const st = j.fromRef.stock || {};
        if ((st[j.res]|0) > 0) {
          st[j.res]--; u.carry = { id:j.res, amount:1 }; j.phase = 'toHQ';
          window.dispatchEvent(new CustomEvent('cb:path:trace', { detail:{ from:j.from, to:j.to, unit:u } }));
        } else {
          // nichts mehr da → Job zurückgeben
          u.job = null;
        }

      } else if (j.phase === 'toHQ') {
        if (move(u, j.to.x, j.to.y, dt)) j.phase = 'deliver';

      } else if (j.phase === 'deliver') {
        if (!u.carry) { u.job = null; continue; }
        const st = ensure(j.toRef, 'stock');
        st[u.carry.id] = (st[u.carry.id]|0) + (u.carry.amount|0);
        window.dispatchEvent(new CustomEvent('cb:res:change', { detail:{
          dst:String(j.toRef.id||j.toRef.type||'hq'), res:u.carry.id, delta:+(u.carry.amount|0)
        }}));
        // am HQ-Eingang **parken**
        const P = entrancePx(j.toRef);
        u.x = P.x + (Math.random()*8 - 4);
        u.y = P.y + (Math.random()*6 - 3);
        u.carry = null;
        u.job = null;
      }
    }
  }

  // --- API -------------------------------------------------------------------
  function start(worldRef) {
    world = worldRef || { buildings:[], units:[] };
    // vorhandene Carrier aus world übernehmen
    list = (world.units||[]).filter(u => (u && (u.role==='carrier' || String(u.id||'').includes('carrier'))));
    // Timer
    if (tAssign) clearInterval(tAssign);
    if (tStep)   clearInterval(tStep);
    tAssign = setInterval(assign, 800);
    tStep   = setInterval(()=>step(100), 100);
    LOG('gestartet (Träger:%d)', list.length);
  }

  function spawn(opts) {
    const u = { id:`carrier#${(Math.random()*1e6|0)}`, role:'carrier', x:null, y:null, job:null, carry:null, color:'#ffd166', ...opts };
    list.push(u);
    (world.units||(world.units=[])).push(u);
    return u;
  }

  function listAll(){ return list; }

  return { start, spawn, list:listAll };
});
