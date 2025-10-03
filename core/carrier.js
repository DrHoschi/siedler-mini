/* ============================================================================
 * Datei   : core/carrier.js
 * Projekt : Neue Siedler (Epoche 1)
 * Version : v1.3.0 (2025-10-04)
 * Zweck   : Transport-Logik liest Ressourcen aus Stocks + Carrier-Präferenzen
 * Events  : cb:res:change (bei Anlieferung), cb:path:trace (Pfad-Overlay)
 * ============================================================================
 */
(function(root,factory){ root.Carriers = factory(); })(this, function(){
  'use strict';

  // ---------------------------- Konstanten/Logging ---------------------------
  const LOG = (window.CBLog?.ok   || console.log).bind(console, '[carriers]');
  const WRN = (window.CBLog?.warn || console.warn).bind(console, '[carriers]');

  let world=null, carriers=[], hq=null;

  // ---------------------------- Helpers --------------------------------------
  function typeOf(e){ return e?.type||e?.kind||e?.key||e?.archetype||e?.baseId||e?.code||e?.cfgId||e?.id||''; }
  function looksHQ(e){ const t=String(typeOf(e)).toLowerCase(); return t==='hq'||t==='b.hq'||t.endsWith('.hq')||t.includes('townhall')||t==='rathaus'; }
  function findHQ(){ return (world?.buildings||[]).find(looksHQ) || null; }
  function ensure(obj,k){ obj[k]=obj[k]||Object.create(null); return obj[k]; }

  // Prüft, ob Carrier diese Ressource tragen möchte (optional)
  function carrierAccepts(c, resId){
    const p = c.prefers || c.cargo || c.cargoTypes;
    if (!p || !Array.isArray(p) || p.length===0) return true; // unspezialisiert → akzeptiert alles
    return p.includes(resId);
  }

  // Ermittelt alle (Gebäude, Ressource) Paare mit Bestand > 0
  function sourcesWithStock(){
    const list = [];
    for (const b of (world?.buildings||[])){
      if (!b || looksHQ(b)) continue;
      const stock = b.stock||{};
      for (const [resId,qty] of Object.entries(stock)){
        if (!resId || typeof qty!=='number') continue;
        if (!resId.startsWith('res.')) continue;  // nur echte Ressourcen
        if (qty > 0) { list.push({ b, res:resId }); }
      }
    }
    return list;
  }

  function assignJobs(){
    if (!hq) hq = findHQ(); if (!hq) return;

    const srcs = sourcesWithStock();
    for (const s of srcs){
      const c = carriers.find(u => !u.job && carrierAccepts(u, s.res));
      if (!c) break;

      c.job = { from:s.b, to:hq, res:s.res, amount:1, phase:'pickup' };
      LOG('Job → %s: %s → HQ', s.res, typeOf(s.b));
    }
  }

  function stepCarrier(c){
    if (!c.job) return;
    const job = c.job;
    if (job.phase === 'pickup'){
      const st = job.from.stock || {};
      if ((st[job.res]|0) > 0){
        st[job.res]--; c.carry = { id:job.res, amount:1 };
        // Pfad-Overlay: symbolisch (ohne echtes Grid), kann später Map-Koords nehmen
        window.dispatchEvent(new CustomEvent('cb:path:trace', {
          detail:{ from:{x:job.from.x||0,y:job.from.y||0}, to:{x:job.to.x||0,y:job.to.y||0}, unit:c }
        }));
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
    carriers = (world.units||[]).filter(u => (u.role==='carrier') || (typeOf(u)==='u.carrier') || (typeOf(u)).includes('carrier'));
    hq = findHQ();
    LOG('bereit (Träger:%d, HQ:%s)', carriers.length, hq? 'ok':'fehlend');
    setInterval(assignJobs, 1000);
    setInterval(update, 700);
  }

  // optional: Träger spawnen (mit Spezialisierung)
  // Beispiel: Carriers.spawn({ prefers:['res.wood'] })
  function spawn(payload){
    const c = { id:`carrier#${(Math.random()*1e6|0)}`, role:'carrier', job:null, carry:null, ...payload };
    carriers.push(c);
    return c;
  }

  return { start, spawn };
});
