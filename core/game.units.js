/* ============================================================================
 * Datei   : core/game.units.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.13-units-spawn-registry-v1
 *
 * Zweck   : Zentrale Einheiten-Logik (aktuell nur Träger/Carrier)
 *           – verwaltet HQ-Position & Carrier-Liste
 *           – bewegt Carrier (Idle + Job-Phasen)
 *           – versteht Jobs mit {tx,ty} ODER {x,y}
 *           – sendet:
 *               • cb:build:deliver für Job-Typ "deliver" (Baustellen)
 *               • cb:job:done     für andere Job-Typen (z.B. "carry" später)
 *
 * API     :
 *   GameUnits.setHQPos({tx,ty})
 *   GameUnits.getHQPos()
 *   GameUnits.spawnInitialCarriers(n)
 *   GameUnits.getUnits()
 *   GameUnits.needsJob()
 *   GameUnits.assignJob(job)
 *   GameUnits.tick(dt?)
 * ============================================================================ */
(function () {
  'use strict';

  const TAG  = '[units]';
  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  /** @type {Array<{id:number,type:string,x:number,y:number,task?:any,carrying?:string,_idleTarget?:{x:number,y:number}}>} */
  const _units = [];

  /** @type {{tx:number,ty:number}|null} */
  let _hqPos = null;

  /** optional Referenz aufs Game-Objekt (für spätere Erweiterungen) */
  let _game = null;

  const SPEED_TILES_PER_SEC = 2.0;

  // -------------------------------------------------------------------------
  // HELFER
  // -------------------------------------------------------------------------
  function _rand(min, max){
    return min + Math.random() * (max - min);
  }

  function _coord(src, key, fallback){
    const v = Number(src?.[key]);
    return Number.isFinite(v) ? v : fallback;
  }

  function _ensureGameBinding(game){
    if (!game) return;
    _game = game;
    if (!Array.isArray(game.buildings)){
      game.buildings = [];
    }

    // ---------------------------------------------------------------------
    // KOMPATIBILITÄT (Legacy)
    // Viele ältere Renderer/Tools erwarten eine "Game.units" Liste oder
    // "window.__units". Wir binden deshalb unsere interne _units-Liste
    // als gemeinsame Referenz.
    // ---------------------------------------------------------------------
    try{
      game.units = _units;
      window.__units = _units;
    }catch{}
  }

  // -------------------------------------------------------------------------
  // HQ & UNITS
  // -------------------------------------------------------------------------
  function setHQPos(pos) {
    if (!pos) return;
    if (!Number.isFinite(pos.tx) || !Number.isFinite(pos.ty)) return;
    _hqPos = { tx: pos.tx, ty: pos.ty };
    LOG('HQPos gesetzt', _hqPos);
  }

  function getHQPos(){
    return _hqPos ? { tx: _hqPos.tx, ty: _hqPos.ty } : null;
  }

  
  // -------------------------------------------------------------------------
  // SPAWN
  // -------------------------------------------------------------------------
  // NOTE:
  //  - Wir erweitern das System "vorsichtig": Carrier bleiben 100% kompatibel
  //    (type === 'carrier' ist weiterhin die Bedingung für Job-Zuweisung).
  //  - Weitere Units (builder/villager/worker) werden bereits als Daten-Typen
  //    angelegt, bekommen aber noch keine komplexe AI hier drin.
  //
  // Datenquelle:
  //  - Primär: Registry.getUnit('u.carrier') etc. (data/units.json)
  //  - Fallback: Defaults in diesem Modul
  // -------------------------------------------------------------------------

  /** Standard-Startpaket beim Platzieren des HQ (kann per window.START_UNITS überschrieben werden) */
  const DEFAULT_START_UNITS = Object.freeze({
    'u.carrier': 2,
    'u.builder': 1
    // optional später:
    // 'u.villager': 2
  });

  function _getUnitDef(unitId){
    // Registry-API ist je nach Patchstand unterschiedlich – wir sind tolerant.
    if (window.Registry){
      if (typeof window.Registry.getUnit === 'function'){
        return window.Registry.getUnit(unitId) || null;
      }
      // Fallback: einige Registry-Versionen haben Registry.get('units', id)
      if (typeof window.Registry.get === 'function'){
        return window.Registry.get('units', unitId) || null;
      }
      // Fallback: Map
      if (window.Registry.units && window.Registry.units[unitId]){
        return window.Registry.units[unitId];
      }
    }
    return null;
  }

  function _typeFromUnitId(unitId){
    // Carrier bleibt "carrier"
    if (unitId === 'u.carrier') return 'carrier';
    // Builder bekommt eigenen Typ (für spätere Baustellen-Logik)
    if (unitId === 'u.builder') return 'builder';
    // Rest erstmal als "worker" (später: role/job-System)
    return 'worker';
  }

  function _spawnUnitAt(unitId, tx, ty){
    const def = _getUnitDef(unitId);
    const type = _typeFromUnitId(unitId);

    const unit = {
      id      : _units.length + 1,
      unitId  : unitId,      // z.B. 'u.carrier'
      type    : type,        // z.B. 'carrier' | 'builder' | 'worker'
      name    : def?.name || unitId,

      // Position in Tile-Koordinaten (wie bisher)
      x       : tx,
      y       : ty,

      // Carrier-Task (nur Carrier nutzt das aktiv, aber Feld bleibt für Debug)
      task    : null,

      // Carry-Info (Overlay / Debug)
      carrying   : null,
      carryQty   : 0,

      // Bewegungsparameter (werden später von Renderer/Runtime genutzt)
      speed      : Number(def?.speed) || (type === 'carrier' ? 2.0 : 1.6),
      capacity   : Number(def?.capacity) || 1,
      aiProfile  : def?.aiProfile || (type === 'carrier' ? 'carrier.basic' : 'worker.generic'),

      // interne Hilfsziele
      _idleTarget: null
    };

    _units.push(unit);
    return unit;
  }

  // Legacy-API (ältere Module rufen das noch auf)
  function _spawnCarrierAt(tx, ty){
    return _spawnUnitAt('u.carrier', tx, ty);
  }

  /**
   * Spawnt eine beliebige Unit-Mischung am HQ.
   *
   * plan Beispiel:
   *   { 'u.carrier': 2, 'u.builder': 1, 'u.villager': 2 }
   *
   * Falls eine Unit-ID nicht in data/units.json existiert, wird sie trotzdem
   * als generischer Typ angelegt (damit Debug nicht „hart“ bricht).
   */
  function spawnInitialUnits(plan){
    if (!_hqPos){
      WARN('spawnInitialUnits ohne HQPos aufgerufen');
      return;
    }

    const p = plan && typeof plan === 'object' ? plan : DEFAULT_START_UNITS;

    let total = 0;
    for (const [unitId, rawCount] of Object.entries(p)){
      const count = (rawCount | 0);
      if (count <= 0) continue;

      for (let i = 0; i < count; i++){
        const jitterX = _rand(-0.3, 0.3);
        const jitterY = _rand(-0.3, 0.3);
        _spawnUnitAt(unitId, _hqPos.tx + jitterX, _hqPos.ty + jitterY);
        total++;
      }
    }

    LOG('Start-Units gespawnt', { total, plan: p, hq: _hqPos });
  }

  // Legacy: bisherige Funktion bleibt, ruft aber intern spawnInitialUnits auf.
  function spawnInitialCarriers(count){
    const n = (count | 0);
    spawnInitialUnits({ 'u.carrier': n });
  }

  function getUnits(){
    return _units;
  }

  // -------------------------------------------------------------------------
  // JOB HANDLING
  // -------------------------------------------------------------------------
  function needsJob(){
    // Mindestens ein Carrier ohne laufenden Task?
    return _units.some(u => u.type === 'carrier' && !u.task);
  }

  /**
   * Job einem freien Carrier zuweisen.
   * Job darf from/to als {tx,ty} ODER {x,y} enthalten.
   *
   * job = {
   *   id   : 'job-deliver-1',
   *   type : 'deliver' | 'carry' | ...,
   *   res  : 'wood' | 'stone' | ...,
   *   from : {x,y} | {tx,ty} (optional, sonst HQ),
   *   to   : {x,y} | {tx,ty}
   * }
   */
  function assignJob(job){
    const u = _units.find(u => u.type === 'carrier' && !u.task);
    if (!u) return false;
    if (!job) {
      WARN('assignJob: Job fehlt', job);
      return false;
    }

    // HQ-Fallback, falls from nicht gesetzt ist
    const hq = _hqPos || { tx: u.x, ty: u.y };

    // Quelle (HQ oder Gebäude) – tolerant gegenüber {x,y} / {tx,ty}
    const sx = _coord(job.from || hq, 'x',  hq.tx);
    const sy = _coord(job.from || hq, 'y',  hq.ty);

    // Ziel – tolerant gegenüber {x,y} / {tx,ty}
    const tx = _coord(job.to   || {}, 'x',  sx);
    const ty = _coord(job.to   || {}, 'y',  sy);

    const source = { x: sx, y: sy };
    const dest   = { x: tx, y: ty };

    u.task = {
      phase  : 'go_source',   // erst zur Quelle (HQ)
      job    : job,
      source : source,
      dest   : dest,
      target : source,        // aktuelles Bewegungsziel
      pickupTimer : 0
    };

    LOG('Carrier übernimmt Job', {
      carrier : u.id,
      job     : job.id,
      from    : source,
      to      : dest
    });
    return true;
  }

  // -------------------------------------------------------------------------
  // BEWEGUNG
  // -------------------------------------------------------------------------
  function _randomTargetNearHQ(){
    if (!_hqPos) return null;
    const r = 1.2;
    return {
      x: _hqPos.tx + _rand(-r, r),
      y: _hqPos.ty + _rand(-r, r)
    };
  }

  function _moveTowards(u, target, dt){
    if (!target) return false;

    const dx   = target.x - u.x;
    const dy   = target.y - u.y;
    const dist = Math.hypot(dx, dy);

    if (!(dist > 0.0001)) {
      return true; // praktisch schon da
    }

    const step = SPEED_TILES_PER_SEC * dt;
    if (step >= dist){
      u.x = target.x;
      u.y = target.y;
      return true;
    }

    const nx = u.x + dx / dist * step;
    const ny = u.y + dy / dist * step;

    if (Number.isFinite(nx)) u.x = nx;
    if (Number.isFinite(ny)) u.y = ny;

    return dist <= step;
  }

  function _tickTask(u, dt){
    const t = u.task;
    if (!t) return;

    // Phase 1: Zum HQ / Quelle laufen
    if (t.phase === 'go_source'){
      if (_moveTowards(u, t.source, dt)){
        t.phase       = 'pickup';
        t.pickupTimer = 0.3; // kleine Pause zum „Aufladen“
      }
      return;
    }

    // Phase 2: Aufnahme der Ressource
    if (t.phase === 'pickup'){
      t.pickupTimer -= dt;
      if (t.pickupTimer <= 0){
        u.carrying = String(t.job?.res || 'wood').replace(/^res\./,'');
        t.phase    = 'go_target';
      }
      return;
    }

    // Phase 3: Zum Ziel-Gebäude / Ziel laufen
    if (t.phase === 'go_target'){
      if (_moveTowards(u, t.dest, dt)){
        t.phase = 'deliver';
      }
      return;
    }

    // Phase 4: Abliefern → Event schicken + Ladung leeren
    if (t.phase === 'deliver'){
      const jobType = t.job?.type || 'deliver';
      const tileX   = t.dest.x;
      const tileY   = t.dest.y;

      if (jobType === 'deliver'){
        // Klassischer Bau-Job → Bau-Subsystem informieren
        try{
          window.dispatchEvent(new CustomEvent('cb:build:deliver', {
            detail: {
              // Welt-/Tile-Koordinate (Mitte des Zieltiles)
              x  : tileX,
              y  : tileY,
              // zusätzlich Tile-Koordinaten, weil ältere Module tx/ty erwarten
              tx : tileX,
              ty : tileY,
              res: u.carrying,
              jobId: t.job?.id
            }
          }));
        } catch(e){
          WARN('cb:build:deliver dispatch fehlgeschlagen', e);
        }
      } else {
        // Allgemeiner Job (z.B. zukünftige Tragejobs "carry")
        try{
          window.dispatchEvent(new CustomEvent('cb:job:done', {
            detail: {
              type     : jobType,
              carrierId: u.id,
              res      : u.carrying,
              jobId    : t.job?.id,
              x        : tileX,
              y        : tileY
            }
          }));
        } catch(e){
          WARN('cb:job:done dispatch fehlgeschlagen', e);
        }
      }

      u.carrying = null;
      u.task     = null; // Job erledigt → Carrier wieder idle
      return;
    }
  }

  function _tickIdle(u, dt){
    if (!_hqPos) return; // kein HQ → gar nicht bewegen

    if (!u._idleTarget || Math.random() < 0.01){
      u._idleTarget = _randomTargetNearHQ();
    }
    if (!u._idleTarget) return;

    _moveTowards(u, u._idleTarget, dt);
  }

  function tick(dt){
    if (!dt || !Number.isFinite(dt)){
      // Fallback für Aufrufe ohne dt (z.B. game.tick.js)
      dt = 1/60;
    }

    for (const u of _units){
      if (u.type !== 'carrier') continue;

      if (u.task){
        _tickTask(u, dt);
      } else {
        _tickIdle(u, dt);
      }
    }
  }

  // -------------------------------------------------------------------------
  // EVENTS
  // -------------------------------------------------------------------------

  // Game-Bindung, sobald das Spiel losläuft
  window.addEventListener('cb:game:start', ev => {
    const game = ev?.detail?.game ?? window.Game ?? null;
    if (game) _ensureGameBinding(game);
  });

  // HQ-Position merken & Start-Träger spawnen, wenn HQ platziert wird
  window.addEventListener('cb:build:place', ev => {
    const d  = ev?.detail || {};
    const id = d.buildingId || d.id || '';
    if (id !== 'b.hq') return;

    const w  = d.w ?? 3;
    const h  = d.h ?? 3;
    const tx = (d.x ?? d.tx ?? 0) + w / 2;
    const ty = (d.y ?? d.ty ?? 0) + h / 2;

    setHQPos({ tx, ty });
    spawnInitialUnits(window.START_UNITS || null);
  });

  // -------------------------------------------------------------------------
  // EXPORT
  // -------------------------------------------------------------------------
  window.GameUnits = {
    setHQPos,
    getHQPos,
    spawnInitialCarriers,
    spawnInitialUnits,
    getUnits,
    // Legacy-Alias (game.map.js / ältere Module nutzen GameUnits.list)
    list: _units,
    needsJob,
    assignJob,
    tick,
    // für spätere Worker-Typen:
    _state: {
      units : _units,
      hqPos : () => _hqPos,
      game  : () => _game
    }
  };

  LOG('Units geladen → Jobfähig (fix4, deliver + job:done)');
})();
