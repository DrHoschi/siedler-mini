/* ============================================================================
 * Datei   : core/carrier.js
 * Projekt : Neue Siedler (Epoche 1)
 * Version : v1.2.0 (2025-10-04)
 * Zweck   : Einfache Transport-Logik: Überschüsse aus Prod.-Gebäuden → HQ
 * Events  : cb:res:change (bei Anlieferung), cb:path:trace (Pfad-Overlay)
 * ============================================================================
 */
(function(root,factory){ root.Carriers = factory(); })(this, function(){
  'use strict';

  // ---------------------------- Konstanten/Logging ---------------------------
  const LOG  = (window.CBLog?.ok   || console.log).bind(console, '[carriers]');
  const WRN  = (window.CBLog?.warn || console.warn).bind(console, '[carriers]');

  let world=null, carriers=[], hq=null;

  // ---------------------------- Helpers --------------------------------------
  function typeOf(e){ return e?.type||e?.kind||e?.key||e?.archetype||e?.baseId||e?.code||e?.cfgId||e?.id||''; }
  function looksHQ(e){ const t=String(typeOf(e)).toLowerCase(); return t==='b.hq'||t==='hq'||t.endsWith('.hq')||t.includes('townhall'); }
  function findHQ(){ return (world?.buildings||[]).find(looksHQ) || null; }
  function ensure(obj,k){ obj[k]=obj[k]||Object.create(null); return obj[k]; }

  // Welche Ressourcen werden transportiert?
  const RES_LIST = ['res.wood','res.fish','res.stone'];

  function sourcesWithStock(){
    const list = [];
    for (const b of (world?.buildings||[])){
      if (!b || looksHQ(b)) continue;
      const stock = b.stock||{};
      for (const r of RES_LIST){
        if ((stock[r]|0) > 0) { list.push({ b, r }); break; }
      }
    }
    return list;
  }

  function assignJobs(){
    if (!hq) hq = findHQ(); if (!hq) return;
    const srcs = sourcesWithStock();
    for (const s of srcs){
      const c = carriers.find(u => !u.job);
      if (!c) break;
      c.job = { from:s.b, to:hq, res:s.r, amount:1, phase:'pickup' };
      LOG('Job → %s: %s → HQ', s.r, typeOf(s.b));
    }
  }

  function stepCarrier(c){
    if (!c.job) return;
    const job = c.job;
    if (job.phase === 'pickup'){
      const st = job.from.stock || {};
      if ((st[job.res]|0) > 0){
        st[job.res]--; c.carry = { id:job.res, amount:1 };
        // Hook: Pfad-Overlay (hier mangels Kartenkoordinaten nur symbolisch)
        window.dispatchEvent(new CustomEvent('cb:path:trace', { detail:{ from:{x:job.from.x||0,y:job.from.y||0}, to:{x:job.to.x||0,y:job.to.y||0}, unit:c }}));
        job.phase='deliver';
      } else {
        c.job = null;
      }
    } else if (job.phase === 'deliver'){
      const st = ensure(job.to,'stock');
      st[c.carry.id] = (st[c.carry.id]|0) + (c.carry.amount|0);
      window.dispatchEvent(new CustomEvent('cb:res:change', { detail:{ dst: typeOf(job.to), res:c.carry.id, delta:+(c.carry.amount|0) } }));
      c.carry=null; c.job=null;
    }
  }

  function update(){ carriers.forEach(stepCarrier); }

  // ---------------------------- API ------------------------------------------
  function start(worldRef){
    world = worldRef || { buildings:[], units:[] };
    carriers = (world.units||[]).filter(u => (u.role==='carrier') || (typeOf(u)==='u.carrier'));
    hq = findHQ();
    LOG('bereit (Träger:%d, HQ:%s)', carriers.length, hq? 'ok':'fehlend');
    setInterval(assignJobs, 1000);
    setInterval(update, 700);
  }

  // optionaler Spawner (falls andere Module Carrier starten möchten)
  function spawn(payload){
    const c = { id:`carrier#${(Math.random()*1e6|0)}`, role:'carrier', job:null, carry:null, ...payload };
    carriers.push(c);
    return c;
  }

  return { start, spawn };
});
