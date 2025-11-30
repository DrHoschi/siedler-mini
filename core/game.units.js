/* ============================================================================
 * Datei   : core/game.units.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.30-carrier-jobs-fix2
 *
 * Zweck   : Träger mit Job-System
 *           – verwaltet HQ-Position & Carrier-Liste
 *           – bewegt Carrier (Idle + Job-Phasen)
 *           – versteht Jobs mit {tx,ty} ODER {x,y}
 *           – sendet cb:build:deliver bei Ankunft an der Baustelle
 * ========================================================================== */
(function () {
  'use strict';

  const TAG  = '[units]';
  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  /** @type {Array<{id:number,type:string,x:number,y:number,target?:object,task?:object,carrying?:string|null}>} */
  const _units = [];
  /** @type {{tx:number,ty:number}|null} */
  let _hqPos = null;
  /** @type {any} */
  let _game = null;

  let _initialSpawnDone = false;

  // -------------------------------------------------------------------------
  // HILFSFUNKTIONEN
  // -------------------------------------------------------------------------
  function _ensureGameBinding(game) {
    if (!game || _game === game) return;
    _game = game;
    try {
      _game.units = _units;
    } catch (err) {
      WARN('Game-Bindung fehlgeschlagen', err);
    }
    LOG('Units.init abgeschlossen – Units an Game gebunden');
  }

  function _rand(min, max) {
    return min + Math.random() * (max - min);
  }

  // Zahl aus job.from / job.to holen – unterstützt {tx,ty} UND {x,y}
  function _coord(obj, key, fallback) {
    if (!obj || typeof obj !== 'object') return fallback;
    const a = obj[key];
    if (Number.isFinite(a)) return a;
    // Mapping tx->x bzw. x->tx, je nachdem was angefragt wird
    if (key === 'tx' || key === 'x') {
      const v = Number.isFinite(obj.tx) ? obj.tx : obj.x;
      return Number.isFinite(v) ? v : fallback;
    }
    if (key === 'ty' || key === 'y') {
      const v = Number.isFinite(obj.ty) ? obj.ty : obj.y;
      return Number.isFinite(v) ? v : fallback;
    }
    return fallback;
  }

  // -------------------------------------------------------------------------
  // HQ + SPAWN
  // -------------------------------------------------------------------------
  function setHQPos(pos) {
    if (!pos) return;
    _hqPos = { tx: pos.tx, ty: pos.ty };
    LOG('HQPos gesetzt', _hqPos);
  }

  function _spawnCarrierAt(tx, ty) {
    const unit = {
      id: _units.length + 1,
      type: 'carrier',
      x: tx,
      y: ty,
      target: null,
      speed: 0.25,       // Tiles / Sekunde
      carrying: null,
      task: null
    };
    _units.push(unit);
    LOG('Carrier gespawnt', unit);
  }

  function spawnInitialCarriers(count = 3) {
    if (!_hqPos) return WARN('spawnInitialCarriers: HQPos fehlt');
    if (_initialSpawnDone) return;
    _initialSpawnDone = true;

    const baseX = _hqPos.tx;
    const baseY = _hqPos.ty;

    const OFFS = [
      { dx:-0.6, dy: 0   },
      { dx: 0.6, dy: 0   },
      { dx: 0,   dy: 0.6 },
      { dx:-0.6, dy:-0.4 },
      { dx: 0.6, dy:-0.4 }
    ];

    for (let i = 0; i < count; i++) {
      const o = OFFS[i % OFFS.length];
      _spawnCarrierAt(baseX + o.dx, baseY + o.dy);
    }
  }

  function getHQPos()  { return _hqPos; }
  function getUnits()  { return _units; }

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

    // Quelle (HQ) – tolerant gegenüber {x,y} / {tx,ty}
    const sx = _coord(job.from || hq, 'x',  hq.tx);
    const sy = _coord(job.from || hq, 'y',  hq.ty);

    // Ziel (Gebäude)
    const tx = _coord(job.to || {}, 'x', sx);
    const ty = _coord(job.to || {}, 'y', sy);

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
    return { x: _hqPos.tx + _rand(-r, r), y: _hqPos.ty + _rand(-r, r) };
  }

  function _moveTowards(u, target, dt){
    if (!target) return false;

    const dx = target.x - u.x;
    const dy = target.y - u.y;
    const dist = Math.hypot(dx, dy);

    if (!(dist > 0.0001)) {
      // Ziel erreicht oder numerischer Murks → hart auf Ziel setzen
      u.x = target.x;
      u.y = target.y;
      return true;
    }

    const step = u.speed * dt;
    const nx   = u.x + dx / dist * step;
    const ny   = u.y + dy / dist * step;

    // Numerik absichern: NaN vermeiden
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
        t.phase = 'pickup';
        t.pickupTimer = 0.3; // kurze Pause zum „Aufladen“
      }
      return;
    }

    // Phase 2: Aufnahme der Ressource
    if (t.phase === 'pickup'){
      t.pickupTimer -= dt;
      if (t.pickupTimer <= 0){
        u.carrying = t.job.res || 'res.wood';
        t.phase  = 'go_target';
      }
      return;
    }

    // Phase 3: Zum Ziel-Gebäude laufen
    if (t.phase === 'go_target'){
      if (_moveTowards(u, t.dest, dt)){
        t.phase = 'deliver';
      }
      return;
    }

    // Phase 4: Abliefern → Event schicken + Ladung leeren
    if (t.phase === 'deliver'){
      try{
        window.dispatchEvent(new CustomEvent('cb:build:deliver', {
          detail: {
            x    : t.dest.x,
            y    : t.dest.y,
            res  : u.carrying,
            jobId: t.job?.id
          }
        }));
      } catch(e){
        WARN('cb:build:deliver dispatch fehlgeschlagen', e);
      }

      u.carrying = null;
      u.task = null; // Job erledigt → Carrier wieder idle
      return;
    }
  }

  function _tickIdle(u, dt){
    if (!_hqPos) return; // kein HQ → nicht herumwandern

    if (!u.target){
      u.target = _randomTargetNearHQ();
    }
    if (_moveTowards(u, u.target, dt)){
      u.target = _randomTargetNearHQ();
    }
  }

  function tick(dt){
    if (!dt || !Number.isFinite(dt)) dt = 1/60;

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
    spawnInitialCarriers(3);
  });

  // -------------------------------------------------------------------------
  // EXPORT
  // -------------------------------------------------------------------------
  window.GameUnits = {
    setHQPos,
    getHQPos,
    spawnInitialCarriers,
    getUnits,
    needsJob,
    assignJob,
    tick
  };

  LOG('Units geladen → Jobfähig (fix2, mit cb:build:deliver)');
})();
