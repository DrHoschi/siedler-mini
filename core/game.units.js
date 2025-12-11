/* ============================================================================
 * Datei   : core/game.units.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.11-carrier-jobs-fix3
 *
 * Zweck   : Träger mit Job-System
 *           – verwaltet HQ-Position & Carrier-Liste
 *           – bewegt Carrier (Idle + Job-Phasen)
 *           – versteht Jobs mit {tx,ty} ODER {x,y}
 *           – sendet:
 *               • cb:build:deliver für Job-Typ "deliver" (Baustellen)
 *               • cb:job:done     für alle anderen Job-Typen (z.B. "carry")
 * ========================================================================== */
(function () {
  'use strict';

  const TAG  = '[units]';
  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  /** @type {{id:number,type:string,x:number,y:number,task?:any,carrying?:string,_idleTarget?:{x:number,y:number}}[]} */
  const _units = [];
  let _hqPos   = null;      // { tx, ty } in Tile-Koordinaten
  let _nextId  = 1;

  const SPEED_TILES_PER_SEC = 2.0;

  // ---------------------------------------------------------------------------
  // HELFER
  // ---------------------------------------------------------------------------
  function _rand(min, max){
    return min + Math.random() * (max - min);
  }

  function _coord(src, key, fallback){
    const v = Number(src?.[key]);
    return Number.isFinite(v) ? v : fallback;
  }

  function _ensureGameBinding(game){
    if (!game) return;
    if (!Array.isArray(game.buildings)){
      game.buildings = [];
    }
  }

  // ---------------------------------------------------------------------------
  // HQ & UNITS
  // ---------------------------------------------------------------------------
  function setHQPos(tx, ty){
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return;
    _hqPos = { tx, ty };
    LOG('HQ-Position gesetzt', _hqPos);
  }

  function getHQPos(){
    return _hqPos ? { tx: _hqPos.tx, ty: _hqPos.ty } : null;
  }

  function spawnCarrier(count){
    count = count | 0;
    if (count <= 0) return;

    if (!_hqPos){
      WARN('spawnCarrier ohne HQ-Position – abgebrochen');
      return;
    }

    for (let i = 0; i < count; i++){
      const u = {
        id   : _nextId++,
        type : 'carrier',
        x    : _hqPos.tx + _rand(-0.2, 0.2),
        y    : _hqPos.ty + _rand(-0.2, 0.2),
        task : null,
        carrying: null,
        _idleTarget: null
      };
      _units.push(u);
    }

    LOG('Carrier gespawnt', { count, hq: _hqPos });
  }

  function getUnits(){
    return _units;
  }

  // ---------------------------------------------------------------------------
  // JOB HANDLING
  // ---------------------------------------------------------------------------
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

    // Quelle (HQ oder Gebäude) – tolerant gegenüber {x,y} / {tx,ty}
    const sx = _coord(job.from || hq, 'x',  hq.tx);
    const sy = _coord(job.from || hq, 'y',  hq.ty);

    // Ziel – tolerant gegenüber {x,y} / {tx,ty}
    const tx = _coord(job.to   || hq, 'x',  hq.tx);
    const ty = _coord(job.to   || hq, 'y',  hq.ty);

    const source = { x: sx, y: sy };
    const dest   = { x: tx, y: ty };

    u.task = {
      job,
      phase       : 'go_source',
      source,
      dest,
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

  // ---------------------------------------------------------------------------
  // BEWEGUNG
  // ---------------------------------------------------------------------------
  function _randomTargetNearHQ(){
    if (!_hqPos) return null;
    const r = 1.2;
    return { x: _hqPos.tx + _rand(-r, r), y: _hqPos.ty + _rand(-r, r) };
  }

  function _moveTowards(u, target, dt){
    if (!target) return false;

    const dx   = target.x - u.x;
    const dy   = target.y - u.y;
    const dist = Math.hypot(dx, dy);

    if (!(dist > 0.0001)) {
      return true;
    }

    const step = SPEED_TILES_PER_SEC * dt;
    if (step >= dist){
      u.x = target.x;
      u.y = target.y;
      return true;
    }

    const nx = u.x + dx / dist * step;
    const ny = u.y + dy / dist * step;

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
        t.phase       = 'pickup';
        t.pickupTimer = 0.3; // kurze Pause zum „Aufladen“
      }
      return;
    }

    // Phase 2: Aufnahme der Ressource
    if (t.phase === 'pickup'){
      t.pickupTimer -= dt;
      if (t.pickupTimer <= 0){
        u.carrying = t.job?.res || 'res.wood';
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

      if (jobType === 'deliver'){
        // Klassischer Bau-Job → Bau-Subsystem informieren
        try{
          const x = t.dest.x;
          const y = t.dest.y;

          // WICHTIG: kompatibel zu construction-Modul
          window.dispatchEvent(new CustomEvent('cb:build:deliver', {
            detail: {
              // float-Koordinate (Mitte des Zieltiles)
              x,
              y,
              // zusätzlich Tile-Koordinaten (älterer Code erwartet tx/ty)
              tx : x,
              ty : y,
              res: u.carrying,
              jobId: t.job?.id
            }
          }));
        } catch(e){
          WARN('cb:build:deliver dispatch fehlgeschlagen', e);
        }
      } else {
        // Allgemeiner Job (z.B. Trage-/Produktionsjob)
        try{
          window.dispatchEvent(new CustomEvent('cb:job:done', {
            detail: {
              type     : jobType,
              carrierId: u.id,
              res      : u.carrying,
              jobId    : t.job?.id
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
    if (!_hqPos) return; // kein HQ → nicht herumwandern

    if (!u._idleTarget || Math.random() < 0.01){
      u._idleTarget = _randomTargetNearHQ();
    }
    if (!u._idleTarget) return;

    _moveTowards(u, u._idleTarget, dt);
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

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------

  // Game-Bindung, sobald das Spiel losläuft
  window.addEventListener('cb:game:start', ev => {
    const game = ev?.detail?.game ?? window.Game ?? null;
    if (game) _ensureGameBinding(game);
  });

  // HQ-Position merken & Start-Träger spawnen, wenn HQ platziert wird
  window.addEventListener('cb:build:place', ev => {
    const d = ev?.detail || {};
    if (!d) return;

    if (d.id === 'b.hq'){
      const tx = Number(d.cx ?? d.x ?? 0);
      const ty = Number(d.cy ?? d.y ?? 0);
      setHQPos(tx, ty);

      // Starter-Carrier
      spawnCarrier(3);
    }
  });

  // ---------------------------------------------------------------------------
  // EXPORT
  // ---------------------------------------------------------------------------
  window.GameUnits = window.GameUnits || {};
  window.GameUnits.tick         = tick;
  window.GameUnits.needsJob     = needsJob;
  window.GameUnits.assignJob    = assignJob;
  window.GameUnits.getUnits     = getUnits;
  window.GameUnits.getHQPos     = getHQPos;
  window.GameUnits.spawnCarrier = spawnCarrier;
  window.GameUnits._state       = {
    units : _units,
    hqPos : () => _hqPos
  };

  LOG('Modul geladen (Carrier + Jobs, fix3)');
})();
