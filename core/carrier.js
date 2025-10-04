/* ============================================================================
 * Datei   : core/carrier.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v1.1.0 (2025-10-04)
 * Zweck   : Träger-Logik (Jobs, Bewegung, Lieferung ins HQ)
 * API     : Carriers.start(world), Carriers.spawn(opts), Carriers.list()
 * Events  : cb:path:trace (optional), cb:res:change (bei Lieferung)
 * Hinweis : Gebäude-Koords sind Tiles; Bewegung läuft in Pixeln (tiles * ts)
 * ============================================================================ */
(function(root,factory){ root.Carriers = factory(); })(this, function(){
  'use strict';

  const LOG = (window.CBLog?.ok || console.log).bind(console, '[carriers]');

  let world = null;
  let carriers = [];
  let assignTimer = null;
  let stepTimer   = null;

  // ---------- Helpers --------------------------------------------------------
  function typeOf(e){ return e?.type || e?.kind || e?.id || ''; }
  function isHQ(e){ const t = String(typeOf(e)).toLowerCase(); return t === 'hq' || t.endsWith('.hq') || t === 'rathaus'; }
  function ensure(obj, k){ obj[k] = obj[k] || Object.create(null); return obj[k]; }

  function __tileSize(){
    const ts = window.Game?.map?.tile;
    return (Number.isFinite(ts) && ts > 0) ? (ts|0) : 64;
  }
  /** Eingang in Welt-Pixeln (falls keiner definiert → Gebäudemitte) */
  function __entrancePx(b){
    const ts  = __tileSize();
    const def = window.Registry?.getBuildingDef?.(String(b.id||b.type||b.kind||''));
    const rel = (def?.entrances && def.entrances[0]) || null; // z.B. [1,2]
    if (rel){
      const tx = (b.x|0) + (rel[0]|0);
      const ty = (b.y|0) + (rel[1]|0);
      return { x: (tx + 0.5)*ts, y: (ty + 0.5)*ts };
    }
    // Fallback: Gebäudemitte
    return {
      x: ((b.x||0) + (b.w||1)/2) * ts,
      y: ((b.y||0) + (b.h||1)/2) * ts
    };
  }

  function centerPx(b){
    const ts = __tileSize();
    return { x: ((b.x||0)+(b.w||1)/2)*ts, y: ((b.y||0)+(b.h||1)/2)*ts };
  }

  function len(dx,dy){ return Math.sqrt(dx*dx + dy*dy); }

  function movement(u, tx, ty, dt){
    const SPEED = 80; // px/s
    const dx = tx - (u.x||0), dy = ty - (u.y||0);
    const d  = len(dx,dy);
    if (d < 1){ u.x = tx; u.y = ty; return true; }
    const step = Math.min(d, SPEED * (dt/1000));
    const k = step / (d || 1);
    u.x = (u.x||0) + dx * k;
    u.y = (u.y||0) + dy * k;
    return (k >= 1);
  }

  function findHQ(){ return (world?.buildings||[]).find(isHQ) || null; }

  function sources(){
    const list = [];
    for (const b of (world?.buildings||[])){
      if (!b || isHQ(b)) continue;
      const st = b.stock || {};
      for (const [res, qty] of Object.entries(st)){
        if (res.startsWith('res.') && (qty|0) > 0){ list.push({ b, res }); break; }
      }
    }
    return list;
  }

  function pickCarrierFor(resId){
    // sehr simple Wahl: erster freier Carrier, evtl. mit Präferenz
    return carriers.find(u => !u.job && (!u.prefers || u.prefers.includes(resId)));
  }

  // ---------- Job-Zuweisung --------------------------------------------------
  function assign(){
    const hq = findHQ(); if (!hq) return;
    const srcs = sources();
    for (const s of srcs){
      const c = pickCarrierFor(s.res); if (!c) break;

      const from = __entrancePx(s.b);   // Quelle: am Eingang abholen
      const to   = __entrancePx(hq);    // Ziel: am Eingang abliefern

      // Falls neu gespawnter Carrier noch keine Position hat → am HQ parken
      if (typeof c.x !== 'number' || typeof c.y !== 'number'){ c.x = to.x; c.y = to.y; }

      c.job = { from, fromRef:s.b, to, toRef:hq, res:s.res, phase:'gotoSource' };

      window.dispatchEvent(new CustomEvent('cb:path:trace', { detail:{ from, to, unit:c } }));
      LOG('Job %s → %s', s.res, typeOf(s.b));
    }
  }

  // ---------- Bewegung / Ablauf ---------------------------------------------
  function step(dt){
    for (const c of carriers){
      const j = c.job; if (!j) continue;

      if (j.phase === 'gotoSource'){
        if (movement(c, j.from.x, j.from.y, dt)){ j.phase = 'pickup'; }
      }
      else if (j.phase === 'pickup'){
        const st = j.fromRef.stock || {};
        if ((st[j.res]|0) > 0){
          st[j.res]--;                 // Quelle −1
          c.carry = { id:j.res, amount:1 };
          j.phase = 'gotoDest';
          // Weg zum HQ-Eingang eventuell neu setzen (falls HQ versetzt wurde)
          const to = __entrancePx(j.toRef);
          j.to = to;
          window.dispatchEvent(new CustomEvent('cb:path:trace', { detail:{ from:j.from, to:j.to, unit:c }}));
        } else {
          c.job = null; // nichts mehr da → freigeben
        }
      }
      else if (j.phase === 'gotoDest'){
        if (movement(c, j.to.x, j.to.y, dt)){ j.phase = 'deliver'; }
      }
      else if (j.phase === 'deliver'){
        const st = ensure(j.toRef,'stock');
        const amt = (c.carry?.amount|0) || 0;
        if (amt > 0){
          st[c.carry.id] = (st[c.carry.id]|0) + amt;  // HQ +1
          window.dispatchEvent(new CustomEvent('cb:res:change', {
            detail:{ dst:typeOf(j.toRef), res:c.carry.id, delta:+amt }
          }));
        }
        c.carry = null;
        c.job   = null;

        // Nach Lieferung am HQ-Eingang „parken“ (kleines Jitter, damit nicht übereinander liegen)
        const E = __entrancePx(j.toRef);
        c.x = E.x + (Math.random()*8 - 4);
        c.y = E.y + (Math.random()*6 - 3);
      }
    }
  }

  // ---------- API ------------------------------------------------------------
  function start(worldRef){
    world = worldRef || { buildings:[], units:[] };
    carriers = (world.units||[]).filter(u => (u.role === 'carrier') || String(typeOf(u)).includes('carrier'));

    if (assignTimer) clearInterval(assignTimer);
    if (stepTimer)   clearInterval(stepTimer);

    assignTimer = setInterval(assign, 800);      // alle 0.8s Jobs prüfen
    stepTimer   = setInterval(()=>step(100), 100); // 10 FPS Bewegung

    LOG('gestartet (Träger:%d)', carriers.length);
  }

  function spawn(opts){
    const u = { id:`carrier#${(Math.random()*1e6|0)}`, role:'carrier', job:null, carry:null, ...opts };
    (world.units || (world.units = [])).push(u);
    carriers.push(u);
    return u;
  }

  function list(){ return carriers; }

  return { start, spawn, list };
});
