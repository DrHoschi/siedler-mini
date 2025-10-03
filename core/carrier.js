/* ============================================================================
 * Datei   : core/carrier.js
 * Projekt : Neue Siedler (Epoche 1)
 * Version : v1.4.0 (2025-10-04)
 * Zweck   : Transport mit Bewegung + Anzeige-Hooks (Pfad/Overlay)
 * Events  : cb:res:change, cb:path:trace
 * Exports : Carriers.start(world), Carriers.spawn(opts), Carriers.list()
 * ============================================================================ */
(function(root,factory){ root.Carriers = factory(); })(this, function(){
  'use strict';

  // ------------------------------ Konstanten ---------------------------------
  const LOG = (window.CBLog?.ok || console.log).bind(console, '[carriers]');
  const SPEED_PX_S = 80;     // simple linear speed
  const UPDATE_MS  = 100;    // ~10 FPS

  let world = null;
  const carriers = [];       // Liste unserer Träger

  // ------------------------------ Helfer -------------------------------------
  function typeOf(e){ return e?.type||e?.kind||e?.key||e?.archetype||e?.baseId||e?.code||e?.cfgId||e?.id||''; }
  function looksHQ(e){ const t=String(typeOf(e)).toLowerCase(); return t==='hq'||t==='b.hq'||t.endsWith('.hq')||t.includes('townhall')||t==='rathaus'; }
  function ensure(obj,k){ obj[k]=obj[k]||Object.create(null); return obj[k]; }
  function len(x,y){ return Math.sqrt(x*x+y*y); }

  function ensurePos(obj, ix){
    if (typeof obj.x==='number' && typeof obj.y==='number') return;
    // Fallback-Layout (nur wenn Position fehlt): simple Grid-Verteilung
    const col = (ix % 3), row = (ix / 3 | 0);
    obj.x = 200 + col*180;
    obj.y = 200 + row*160;
  }

  function findHQ(){ return (world?.buildings||[]).find(looksHQ) || null; }

  function sourcesWithStock(){
    const list = [];
    const B = world?.buildings || [];
    for (let i=0;i<B.length;i++){
      const b = B[i];
      if (!b || looksHQ(b)) continue;
      const S = b.stock||{};
      for (const [resId,q] of Object.entries(S)){
        if (!resId.startsWith('res.')) continue;
        if ((q|0) > 0) { ensurePos(b,i); list.push({ b, res:resId }); break; }
      }
    }
    return list;
  }

  function unitMove(u, tx, ty, dt){
    const dx = tx - (u.x||0), dy = ty - (u.y||0);
    const d = len(dx,dy);
    if (d < 1) { u.x=tx; u.y=ty; return true; }
    const step = SPEED_PX_S * (dt/1000);
    const k = Math.min(1, step / d);
    u.x = (u.x||0) + dx*k;
    u.y = (u.y||0) + dy*k;
    return k >= 1;
  }

  function pickCarrierFor(resId){
    // unspezialisierte → alles; spezialisierte haben prefers:[]
    return carriers.find(u => !u.job && (!u.prefers || u.prefers.includes(resId)));
  }

  function assignJobs(){
    const HQ = findHQ(); if (!HQ) return;
    ensurePos(HQ, 0);

    const srcs = sourcesWithStock();
    for (const s of srcs){
      const c = pickCarrierFor(s.res); if (!c) break;
      // Startposition fehlend? beim HQ parken
      if (typeof c.x!=='number') { c.x=HQ.x; c.y=HQ.y; }
      c.job = { from:s.b, to:HQ, res:s.res, amount:1, phase:'gotoSource', t:0 };
      LOG('Job %s → %s', s.res, typeOf(s.b));
      // einmaliger Pfad-Hook (symbolisch)
      window.dispatchEvent(new CustomEvent('cb:path:trace', { detail:{ from:{x:c.x,y:c.y}, to:{x:s.b.x,y:s.b.y}, unit:c }}));
    }
  }

  function step(ms){
    for (const c of carriers){
      const j = c.job; if (!j) continue;

      if (j.phase === 'gotoSource'){
        if (unitMove(c, j.from.x, j.from.y, ms)){
          j.phase='pickup'; j.t=0;
        }
      }
      else if (j.phase === 'pickup'){
        const st = j.from.stock || {};
        if ((st[j.res]|0) > 0){
          st[j.res]--; c.carry={ id:j.res, amount:1 };
          j.phase='gotoDest'; j.t=0;
          window.dispatchEvent(new CustomEvent('cb:path:trace', { detail:{ from:{x:j.from.x,y:j.from.y}, to:{x:j.to.x,y:j.to.y}, unit:c }}));
        } else {
          c.job = null; // Quelle leer → abbrechen
        }
      }
      else if (j.phase === 'gotoDest'){
        if (unitMove(c, j.to.x, j.to.y, ms)){
          j.phase='deliver';
        }
      }
      else if (j.phase === 'deliver'){
        const st = ensure(j.to,'stock');
        st[c.carry.id] = (st[c.carry.id]|0) + (c.carry.amount|0);
        window.dispatchEvent(new CustomEvent('cb:res:change', { detail:{ dst:typeOf(j.to), res:c.carry.id, delta:+(c.carry.amount|0) } }));
        c.carry=null; c.job=null;
      }
    }
  }

  // ------------------------------ API ----------------------------------------
  function start(worldRef){
    world = worldRef || { buildings:[], units:[] };
    // Ein vorhandenes Units-Array nutzen; andernfalls 2 Dummy-Träger erzeugen
    const U = Array.isArray(world.units) ? world.units : (world.units = []);
    for (const u of U){ if (u.role==='carrier' || String(typeOf(u)).includes('carrier')) carriers.push(u); }
    if (carriers.length===0){
      carriers.push({ id:'u.carrier#1', role:'carrier' });
      carriers.push({ id:'u.carrier#2', role:'carrier' });
    }
    // Periodik
    setInterval(assignJobs, 800);
    setInterval(()=>step(UPDATE_MS), UPDATE_MS);
    LOG('gestartet (Träger:%d)', carriers.length);
  }

  function spawn(opts){ const c = { id:`carrier#${(Math.random()*1e6|0)}`, role:'carrier', ...opts }; carriers.push(c); return c; }
  function list(){ return carriers; }

  return { start, spawn, list };
});
