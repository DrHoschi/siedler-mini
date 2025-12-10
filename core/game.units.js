/* ============================================================================
 * Datei   : core/game.units.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.10-units-core-v1 (Carrier + Worker um Gebäude)
 *
 * Zweck   : Träger-/Unit-System
 *           – verwaltet HQ-Position & Carrier-Liste
 *           – bewegt Carrier (Idle + Job-Phasen)
 *           – versteht Jobs mit {tx,ty} ODER {x,y}
 *           – sendet cb:build:deliver bei Ankunft an der Baustelle
 *           – NEU: spawnWorkerForBuilding(...) für Holzfäller / Steinbruch / Fischer
 *
 * WICHTIG:
 *   - GameUnits.tick(dt) wird von carrier.runtime.js aufgerufen
 *   - JobEngine.pop() liefert Jobs, GameUnits.assignJob(job) verteilt sie
 *   - unit-overlay.js liest GameUnits.getUnits() und zeichnet Bubbles
 * ========================================================================== */
(function () {
  'use strict';

  const TAG  = '[units]';
  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  /**
   * Unit-Shape:
   *  {
   *    id        : number,
   *    type      : 'carrier',
   *    x, y      : float (Tile-Koordinaten),
   *    target    : {x,y} | null,
   *    speed     : Tiles / Sekunde,
   *    carrying  : string|null,
   *    task      : { phase, job, source, dest, target, pickupTimer } | null,
   *    role      : 'carrier' | 'lumberjack' | 'stonemason' | 'fisher' | ...,
   *    homeTx    : number|null,  // Zentrum des „Heimat“-Gebäudes
   *    homeTy    : number|null,
   *    workRadius: number,       // Radius fürs Idle-Herumlaufen
   *    state     : 'idle' | 'job'
   *  }
   */
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
      _game.units = _units; // damit Game.units & unit-overlay.js funktionieren
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

  /**
   * interner Helper zum Erzeugen eines Carriers/Workers
   * opts: { role?, homeTx?, homeTy?, workRadius? }
   */
  function _spawnCarrierAt(tx, ty, opts) {
    opts = opts || {};
    const unit = {
      id   : _units.length + 1,
      type : 'carrier',
      x    : tx,
      y    : ty,
      target    : null,
      speed     : 0.25,      // Tiles / Sekunde
      carrying  : null,
      task      : null,
      role      : opts.role || 'carrier',
      homeTx    : Number.isFinite(opts.homeTx) ? opts.homeTx : null,
      homeTy    : Number.isFinite(opts.homeTy) ? opts.homeTy : null,
      workRadius: Number.isFinite(opts.workRadius) ? opts.workRadius : 1.2,
      state     : 'idle'
    };
    _units.push(unit);
    LOG('Carrier/Worker gespawnt', unit);
    return unit;
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
      _spawnCarrierAt(baseX + o.dx, baseY + o.dy, {
        role      : 'carrier',
        homeTx    : _hqPos.tx,
        homeTy    : _hqPos.ty,
        workRadius: 1.2
      });
    }
  }

  function getHQPos()  { return _hqPos; }
  function getUnits()  { return _units; }

  // -------------------------------------------------------------------------
  // NEU: Worker pro Produktionsgebäude
  // -------------------------------------------------------------------------

  /**
   * Erzeugt einen "Arbeits-Unit" für ein Gebäude (Holzfäller, Steinbruch, Fischer).
   * detail erwartet das cb:build:complete-Detail:
   *   { id/buildingId, x,y,w,h, ... }
   */
  function spawnWorkerForBuilding(detail, roleHint) {
    const d  = detail || {};
    const id = (d.buildingId || d.id || '').toString();
    if (!id) return;

    const bw = Number.isFinite(d.w) ? d.w : 1;
    const bh = Number.isFinite(d.h) ? d.h : 1;

    const cx = (d.x ?? d.tx ?? 0) + bw / 2;
    const cy = (d.y ?? d.ty ?? 0) + bh / 2;

    let role = roleHint || 'worker';
    const idNorm = id.toLowerCase();

    if (!roleHint) {
      if (idNorm.includes('lumber') || idNorm === 'b.lumberjack') {
        role = 'lumberjack';
      } else if (idNorm.includes('quarry') || idNorm.includes('stone')) {
        role = 'stonemason';
      } else if (idNorm.includes('fish')) {
        role = 'fisher';
      }
    }

    const workRadius = 1.6;

    // Leichter Offest beim Spawn, damit er nicht exakt in der Mitte steht
    const ang  = Math.random() * Math.PI * 2;
    const dist = _rand(0.1, 0.4);
    const sx   = cx + Math.cos(ang) * dist;
    const sy   = cy + Math.sin(ang) * dist;

    const u = _spawnCarrierAt(sx, sy, {
      role,
      homeTx    : cx,
      homeTy    : cy,
      workRadius
    });

    LOG('Worker für Gebäude gespawnt', { buildingId: id, role, unitId: u.id });
    return u;
  }

  // -------------------------------------------------------------------------
  // JOB HANDLING (Baustellen-Deliver)
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
    u.state = 'job';

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

  // Zielpunkt für Idle-Bewegung:
  //  - wenn homeTx/homeTy gesetzt → um Gebäude herum
  //  - sonst um HQ herum
  function _randomTargetForUnit(u){
    let baseX, baseY, r;
    if (Number.isFinite(u.homeTx) && Number.isFinite(u.homeTy)) {
      baseX = u.homeTx;
      baseY = u.homeTy;
      r     = Number.isFinite(u.workRadius) ? u.workRadius : 1.5;
    } else if (_hqPos) {
      baseX = _hqPos.tx;
      baseY = _hqPos.ty;
      r     = 1.2;
    } else {
      return null;
    }
    return {
      x: baseX + _rand(-r, r),
      y: baseY + _rand(-r, r)
    };
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

    const maxStep = u.speed * dt;
    if (dist <= maxStep) {
      u.x = target.x;
      u.y = target.y;
      return true;
    }

    const nx = dx / dist;
    const ny = dy / dist;

    u.x += nx * maxStep;
    u.y += ny * maxStep;

    return false;
  }

  function _tickIdle(u, dt){
    // Wenn weder HQ noch homePos existiert, passiert einfach nichts
    const hasHome = Number.isFinite(u.homeTx) && Number.isFinite(u.homeTy);
    if (!hasHome && !_hqPos) return;

    if (!u.target){
      u.target = _randomTargetForUnit(u);
    }
    if (_moveTowards(u, u.target, dt)){
      u.target = _randomTargetForUnit(u);
    }
    u.state = 'idle';
  }

  // Job-Phasen (Tragen von HQ zur Baustelle)
  function _tickTask(u, dt){
    const task = u.task;
    if (!task) return;

    const phase = task.phase;

    if (phase === 'go_source'){
      if (!task.target) task.target = task.source;
      if (_moveTowards(u, task.target, dt)){
        // Quelle erreicht → Pickup-Delay
        task.phase = 'pickup';
        task.pickupTimer = 0.25; // Sekunden
      }
    }
    else if (phase === 'pickup'){
      task.pickupTimer -= dt;
      if (task.pickupTimer <= 0){
        u.carrying = task.job.res || 'wood';
        task.phase = 'go_dest';
        task.target = task.dest;
      }
    }
    else if (phase === 'go_dest'){
      if (!task.target) task.target = task.dest;
      if (_moveTowards(u, task.target, dt)){
        // Baustelle erreicht → Ressource „abliefern“
        const job = task.job || {};
        const evt = new CustomEvent('cb:build:deliver', {
          detail: {
            job,
            carrierId : u.id,
            res       : job.res,
            tx        : task.dest.x,
            ty        : task.dest.y
          }
        });
        window.dispatchEvent(evt);

        // Reset
        u.carrying = null;
        u.task = null;
        u.state = 'idle';
      }
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

  // NEU: Nach Fertigstellung von Produktionsgebäuden Worker erzeugen
  window.addEventListener('cb:build:complete', ev => {
    const d  = ev?.detail || {};
    const id = (d.buildingId || d.id || '').toString().toLowerCase();
    if (!id) return;

    if (id === 'b.lumberjack' || id.includes('lumberjack')) {
      spawnWorkerForBuilding(d, 'lumberjack');
    } else if (id === 'b.quarry' || id.includes('quarry') || id.includes('stone')) {
      spawnWorkerForBuilding(d, 'stonemason');
    } else if (id.startsWith('b.fish') || id.includes('fish')) {
      spawnWorkerForBuilding(d, 'fisher');
    }
  });

  // -------------------------------------------------------------------------
  // EXPORT
  // -------------------------------------------------------------------------
  window.GameUnits = {
    // HQ / Carrier
    setHQPos,
    getHQPos,
    spawnInitialCarriers,

    // Worker-API
    spawnWorkerForBuilding,

    // Debug / Zugriff
    getUnits,
    needsJob,
    assignJob,
    tick,

    // für Debug im Inspector
    _units
  };

  LOG('Units geladen → Jobfähig + Worker um Gebäude (v25.12.10-units-core-v1)');
})();
