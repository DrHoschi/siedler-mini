/* ============================================================================
 * Datei   : core/game.units.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.14-units-workers-spawnloop1
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

  const SPEED_TILES_PER_SEC = 0.8;


// -------------------------------------------------------------------------
// TRAMPELPFAD: Segment-Events (cb:unit:move) als "Trail"
//   Ziel: Linie statt Zickzack → regelmäßig während der Bewegung emitten
//   - nur für Carrier (wichtig: Träger sollen Wege trampeln)
//   - Idle/Spawn-Micro-Moves werden gefiltert
// -------------------------------------------------------------------------
const TRAIL_EMIT_STEP_TILES = 0.25;   // alle ~0.25 Tiles ein Segment
const TRAIL_SPAWN_GRACE_MS  = 2500;   // nach Spawn kurz nichts stempeln

function _trailInit(u){
  if (u._trailInit) return;
  u._trailInit = true;
  u._trailLastX = u.x;
  u._trailLastY = u.y;
  u._trailSpawnMs = performance.now();
}

function _trailShouldEmit(u){
  // Nur Carrier sollen "Wege" trampeln (Worker optional später)
  if (!u || u.type !== 'carrier') return false;
  // Ohne Task = Idle (kein Trampelpfad)
  if (!u.task) return false;
  // Wenn noch im Spawn-Grace: ignorieren
  const now = performance.now();
  if (now - (u._trailSpawnMs || 0) < TRAIL_SPAWN_GRACE_MS) return false;
  return true;
}

function _trailMaybeEmit(u){
  if (!_trailShouldEmit(u)) return;
  _trailInit(u);

  const dx = (u.x - u._trailLastX);
  const dy = (u.y - u._trailLastY);
  const dist = Math.hypot(dx, dy);
  if (dist < TRAIL_EMIT_STEP_TILES) return;

  const from = { x: u._trailLastX, y: u._trailLastY };
  const to   = { x: u.x,          y: u.y };

  u._trailLastX = u.x;
  u._trailLastY = u.y;

  try{
    window.dispatchEvent(new CustomEvent('cb:unit:move', {
      detail: {
        id   : u.id,
        type : u.type,
        role : u.role || 'carrier',
        from,
        to
      }
    }));
  }catch(e){ /* silent */ }
}

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

  function _spawnCarrierAt(tx, ty) {
    const unit = {
      id   : _units.length + 1,
      type : 'carrier',
      x    : tx,
      y    : ty,
      task : null,
      carrying   : null,
      _idleTarget: null,

      // Path-Navigation Cache (A*/Smoothing)
      // Wird von _moveTo() befüllt, wenn AdFinder aktiv ist.
      _nav: null
    };
    _units.push(unit);
    return unit;
  }

  
  // -------------------------------------------------------------------------
  // GENERIC SPAWN (Worker/Villager etc.)
  // -------------------------------------------------------------------------

  /**
   * Normalisiert Unit-IDs:
   *  - akzeptiert 'u.carrier' oder 'carrier'
   *  - akzeptiert auch 'u_builder' / 'u.builder' Varianten
   */
  function _normUnitId(unitId){
    if (!unitId) return '';
    let s = String(unitId).trim();
    // unify separators
    s = s.replace(/\s+/g,'');
    s = s.replace(/^unit[._]/i,'u.');
    s = s.replace(/^u[._-]/i,'u.');
    s = s.replace(/_/g,'.');
    // if plain role like 'carrier' → map to 'u.carrier'
    if (!s.includes('.')) s = 'u.' + s;
    return s.toLowerCase();
  }

  function _isCarrierId(unitId){
    const id = _normUnitId(unitId);
    return id === 'u.carrier' || id === 'u.porter' || id === 'u.träger' || id === 'u.traeger';
  }

  function _spawnUnitAt(unitId, tx, ty) {
    // Carrier bleibt kompatibel zum bestehenden Job-System
    if (_isCarrierId(unitId)) {
      const u = _spawnCarrierAt(tx, ty);
      u.kind = 'u.carrier'; // zusätzlich: Registry-ID
      return u;
    }

    // Worker/Villager/Jobs später – aktuell nur als "Punkt" sichtbar
    const kind = _normUnitId(unitId) || 'u.unknown';
    const unit = {
      id   : _units.length + 1,
      type : 'worker',
      kind : kind,          // <-- wichtig: Registry-ID ('u.lumberjack', ...)
      x    : tx,
      y    : ty,
      task : null,
      carrying   : null,
      _idleTarget: null,

      // Path-Navigation Cache (A*/Smoothing)
      // Wird von _moveTo() befüllt, wenn AdFinder aktiv ist.
      _nav: null
    };
    _units.push(unit);
    return unit;
  }

function spawnInitialCarriers(count){
    if (!_hqPos){
      WARN('spawnInitialCarriers ohne HQPos aufgerufen');
      return;
    }
    count = count | 0;
    if (count <= 0) return;

    for (let i = 0; i < count; i++){
      const jitterX = _rand(-0.3, 0.3);
      const jitterY = _rand(-0.3, 0.3);
      _spawnUnitAt('u.carrier', _hqPos.tx + jitterX, _hqPos.ty + jitterY);
    }

    LOG('Start-Carrier gespawnt', { count, hq: _hqPos });
    _emitChanged('spawnInitialCarriers');
  }

  function getUnits(){
    return _units;
  }

  /* -----------------------------------------------------------------------
   * spawn(unitId, count, opts)
   *  - unitId: Registry-ID (z.B. 'u.carrier', 'u.builder', ...)
   *  - count : Anzahl (default 1)
   *  - opts  : { at:'hq' | {tx,ty} | {x,y} }
   *
   * Events:
   *  - Listener: req:units:spawn  detail:{ unitId|id, count?, at? }
   *  - Listener: req:units:clear  detail:{}
   *  - Listener: req:units:snapshot detail:{}
   *  - Emitter : cb:units:changed  detail:{ reason, counts, total }
   *  - Emitter : cb:units:snapshot detail:{ units:[...], counts, hq }
   * -------------------------------------------------------------------- */

  function _pickSpawnBase(at){
    // 1) explizit übergeben?
    if (at && typeof at === 'object') {
      const tx = _coord(at, 'tx', _coord(at,'x', NaN));
      const ty = _coord(at, 'ty', _coord(at,'y', NaN));
      if (Number.isFinite(tx) && Number.isFinite(ty)) return { tx, ty };
    }
    // 2) HQ
    if (_hqPos) return { tx: _hqPos.tx, ty: _hqPos.ty };
    // 3) fallback
    return { tx: 0, ty: 0 };
  }

  function _counts(){
    const out = Object.create(null);
    for (const u of _units){
      const k = (u.kind || (u.type === 'carrier' ? 'u.carrier' : u.type) || 'unknown');
      out[k] = (out[k] || 0) + 1;
    }
    return out;
  }

  function _emitChanged(reason){
    const detail = { reason: reason || 'changed', counts: _counts(), total: _units.length };
    try { window.dispatchEvent(new CustomEvent('cb:units:changed', { detail })); } catch {}
    try { document.dispatchEvent(new CustomEvent('cb:units:changed', { detail })); } catch {}
  }

  function spawn(unitId, count, opts){
    count = (count == null ? 1 : (count|0));
    if (count <= 0) return [];

    const at = opts?.at ?? opts ?? null;
    const base = _pickSpawnBase(at);

    const arr = [];
    for (let i=0; i<count; i++){
      const jitterX = _rand(-0.25, 0.25);
      const jitterY = _rand(-0.25, 0.25);
      arr.push(_spawnUnitAt(unitId, base.tx + jitterX, base.ty + jitterY));
    }
    _emitChanged('spawn:'+String(unitId||''));
    return arr;
  }

  function clear(){
    if (!_units.length) return;
    _units.length = 0;
    _emitChanged('clear');
  }

  function snapshot(){
    const detail = { units: _units.slice(), counts: _counts(), hq: getHQPos() };
    try { window.dispatchEvent(new CustomEvent('cb:units:snapshot', { detail })); } catch {}
    try { document.dispatchEvent(new CustomEvent('cb:units:snapshot', { detail })); } catch {}
    return detail;
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

    

// ---------------------------------------------------------
// WICHTIG: Idle-Ziel löschen, sobald ein Job startet.
// Sonst bleibt u._idleTarget gesetzt und Trail/Overlay werden als "idle"
// interpretiert → keine cb:unit:move Segmente → keine Trampelpfade sichtbar.
// ---------------------------------------------------------
u._idleTarget = null;

// Trail-Anker für neue Route sauber setzen (verhindert "Mega-Segment")
u._trailInit  = false;
u._trailLastX = u.x;
u._trailLastY = u.y;

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


  // -------------------------------------------------------------------------
  // STEP-EVENTS (für Trampelpfade / Debug)
  //   - feuert NUR wenn eine Unit ein neues Tile betritt (nicht pro Frame)
  //   - Detail enthält tile tx/ty + Unit-Infos
  // -------------------------------------------------------------------------
  function _maybeEmitUnitStep(u){
    if (!u) return;
    const tx = Math.floor(u.x);
    const ty = Math.floor(u.y);
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return;

    const prevTx = u._lastStepTx;
    const prevTy = u._lastStepTy;
    if (prevTx === tx && prevTy === ty) return;
    u._lastStepTx = tx;
    u._lastStepTy = ty;
    const dtx = (Number.isFinite(prevTx) ? (tx - prevTx) : 0);
    const dty = (Number.isFinite(prevTy) ? (ty - prevTy) : 0);

    try{
      window.dispatchEvent(new CustomEvent('cb:unit:step', {
        detail: {
          id   : u.id,
          kind : u.kind,
          type : u.type,
          tx, ty,
          prevTx, prevTy,
          dtx, dty,
          x    : u.x,
          y    : u.y
        }
      }));
    }catch(e){ /* silent */ }
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
      _maybeEmitUnitStep(u);
      _trailMaybeEmit(u);
      return true;
    }

    const nx = u.x + dx / dist * step;
    const ny = u.y + dy / dist * step;

    if (Number.isFinite(nx)) u.x = nx;
    if (Number.isFinite(ny)) u.y = ny;

    _maybeEmitUnitStep(u);
    _trailMaybeEmit(u);

    return dist <= step;
  }

  // ==========================================================================
  // PATHFINDING / NAVIGATION
  // --------------------------------------------------------------------------
  // Ziel:
  //  - Kein "gerader Strich" mehr durch Bäume/Gebäude.
  //  - Keine "Zick-Zack"-Stempel: wir bewegen tile-by-tile entlang eines Pfads.
  //
  // Technisch:
  //  - Nutzt window.AdFinder.findPath() (A* + optional smoothing)
  //  - Nutzt Default-Obstacles (GameMap/MapResources/Game.buildings)
  //  - Start/Ziel-Footprints werden als "allowRects" übergeben,
  //    damit Units aus Gebäuden herauskommen und in Ziel-Baustellen hineinlaufen.
  //
  // Debug:
  //  - AdFinder feuert cb:path:test:done (metrics), bleibt im Inspector nutzbar.
  // ==========================================================================

  const NAV_RECALC_COOLDOWN = 0.35; // Sekunden: nicht jede Tick neu suchen

  function _tileOfXY(x,y){
    return { x: Math.floor(x), y: Math.floor(y) };
  }

  function _buildAllowRects(startTile, goalTile){
    const rects = [];
    const buildings = (window.Game?.getBuildings?.() || window.Game?.buildings || []);
    for (const b of buildings){
      if (!b) continue;
      const bx = b.x|0, by = b.y|0, bw = Math.max(1, b.w|0), bh = Math.max(1, b.h|0);
      const inStart = startTile && startTile.x >= bx && startTile.x < bx + bw && startTile.y >= by && startTile.y < by + bh;
      const inGoal  = goalTile  && goalTile.x  >= bx && goalTile.x  < bx + bw && goalTile.y  >= by && goalTile.y  < by + bh;
      if (inStart || inGoal) rects.push({ x:bx, y:by, w:bw, h:bh });
    }
    return rects.length ? rects : null;
  }

  function _navKey(startTile, goalTile){
    return `${startTile.x},${startTile.y}->${goalTile.x},${goalTile.y}`;
  }

  function _moveTo(u, target, dt){
    // target: {x,y} in Tile-Koords (float ok)
    if (!u || !target) return false;

    // Wenn AdFinder nicht geladen ist, bleibt das alte Verhalten (gerade Linie).
    const PF = window.AdFinder;
    if (!PF || typeof PF.findPath !== 'function'){
      return _moveTowards(u, target, dt);
    }

    const startTile = _tileOfXY(u.x, u.y);
    const goalTile  = _tileOfXY(target.x, target.y);
    const key = _navKey(startTile, goalTile);

    // Init Cache
    if (!u._nav){
      u._nav = {
        key: '',
        path: null,
        idx: 0,
        tSinceCalc: 999,
        lastGoalX: NaN,
        lastGoalY: NaN
      };
    }

    // Timer hochzählen (dt in Sekunden)
    u._nav.tSinceCalc += dt;

    // Recalc?
    const goalChanged = (u._nav.lastGoalX !== goalTile.x || u._nav.lastGoalY !== goalTile.y);
    const needCalc = (u._nav.key !== key) || !u._nav.path || goalChanged;

    if (needCalc && u._nav.tSinceCalc >= NAV_RECALC_COOLDOWN){
      const allowRects = _buildAllowRects(startTile, goalTile);

      const path = PF.findPath(
        { x: startTile.x, y: startTile.y },
        { x: goalTile.x,  y: goalTile.y  },
        {
          allowDiagonal: true,
          smooth       : true,
          allowRects   : allowRects || undefined
        }
      );

      u._nav.key = key;
      u._nav.path = Array.isArray(path) ? path : null;
      u._nav.idx  = 0;
      u._nav.tSinceCalc = 0;
      u._nav.lastGoalX = goalTile.x;
      u._nav.lastGoalY = goalTile.y;
    }

    // Wenn kein Pfad gefunden: fallback (damit Unit nicht "tot" wirkt)
    if (!u._nav.path || !u._nav.path.length){
      return _moveTowards(u, target, dt);
    }

    // idx so anpassen, dass wir nicht "auf dem Starttile hängen"
    const curTile = startTile;
    while (u._nav.idx < u._nav.path.length){
      const n = u._nav.path[u._nav.idx];
      if (!n) { u._nav.idx++; continue; }
      if ((n.x|0) === curTile.x && (n.y|0) === curTile.y){
        u._nav.idx++;
        continue;
      }
      break;
    }

    // Waypoint:
    // - solange Pfad noch Nodes hat: center des nächsten Tiles
    // - sonst: exaktes Ziel (float), damit Deliver-Punkt stimmt
    let waypoint = null;

    if (u._nav.idx < u._nav.path.length){
      const n = u._nav.path[u._nav.idx];
      waypoint = { x: (n.x|0) + 0.5, y: (n.y|0) + 0.5 };
    } else {
      waypoint = { x: target.x, y: target.y };
    }

    const reached = _moveTowards(u, waypoint, dt);
    if (reached){
      if (u._nav.idx < u._nav.path.length){
        u._nav.idx++;
        return false; // noch nicht final am echten Ziel
      } else {
        // fertig
        return true;
      }
    }

    return false;
  }


  function _tickTask(u, dt){
    const t = u.task;
    if (!t) return;

    // Phase 1: Zum HQ / Quelle laufen
    if (t.phase === 'go_source'){
      if (_moveTo(u, t.source, dt)){
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
      if (_moveTo(u, t.dest, dt)){
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

  // -------------------------------------------------------------------------
  // WORKER (einfacher Loop: Home -> WorkArea-Punkt -> kurze Work-Pause -> Home)
  // -------------------------------------------------------------------------
  const WORKER_BY_BUILDING = {
    'b.lumberjack': 'u.woodcutter',
    'b.woodcutter': 'u.woodcutter',
    'b.quarry'    : 'u.stonecutter',
    'b.stonecutter': 'u.stonecutter',
    'b.fisher'    : 'u.fisherman',
    'b.fisherman' : 'u.fisherman'
    // später: weitere Gebäude/Jobs
  };

  function _getBuildingIdFromDetail(d){
    return String(d?.id || d?.buildingId || d?.kind || '').trim();
  }

  function _getWorkerUnitIdForBuilding(buildingId){
    return WORKER_BY_BUILDING[buildingId] || null;
  }

  function _pickWorkPoint(area){
    // area: {cx,cy,radiusTiles,...}
    const cx = area?.cx ?? area?.x ?? 0;
    const cy = area?.cy ?? area?.y ?? 0;
    const r  = Math.max(0.25, area?.radiusTiles ?? area?.r ?? 4);

    const ang = Math.random() * Math.PI * 2;
    const rr  = Math.random() * r;

    return {
      x: cx + Math.cos(ang) * rr,
      y: cy + Math.sin(ang) * rr
    };
  }

  function _ensureWorkerAI(u){
    if (u._ai) return u._ai;
    u._ai = {
      mode      : 'toWork',  // 'toWork' | 'work' | 'toHome'
      timer     : 0,
      target    : null
    };
    return u._ai;
  }

  function _tickWorker(u, dt){
    // Falls das WorkArea-Modul nicht existiert, bleiben Worker einfach idle.
    const WA = window.GameWorkArea;
    if (!WA){
      return;
    }

    const ai = _ensureWorkerAI(u);

    // UID: idealerweise aus WorkArea.makeUid(detail) beim Spawn gesetzt
    const uid = u.homeUid || u.homeBuildingUid || u.homeUidKey || null;

    // WorkArea holen (wenn sie noch nicht existiert, versuchen wir sie anzulegen,
    // sofern wir minimale Gebäudedaten am Unit haben).
    let area = uid ? (WA.getAreaFor?.(uid) || null) : null;
    if (!area && u.homeDetail){
      area = WA.getOrCreateAreaFor?.(u.homeDetail) || null;
      u.homeUid = u.homeUid || (WA.makeUid?.(u.homeDetail) || uid);
    }

    // Keine WorkArea → nichts tun
    if (!area){
      u.task = null;
      return;
    }

    // Home (Gebäude-Mitte) merken (Fallback: area center)
    const home = {
      x: (Number.isFinite(u.homeX) ? u.homeX : (area.cx ?? 0)),
      y: (Number.isFinite(u.homeY) ? u.homeY : (area.cy ?? 0))
    };

    // State Machine
    if (ai.mode === 'toWork'){
      if (!ai.target){
        ai.target = _pickWorkPoint(area);
      }

      u.task = { type:'walk', target:{ x: ai.target.x, y: ai.target.y } };
      const arrived = _moveTowards(u, ai.target, dt);
      if (arrived){
        u.task = null;
        ai.mode  = 'work';
        ai.timer = 0.75 + Math.random() * 1.0; // kleine Work-Pause
        ai.target = null;
      }
      return;
    }

    if (ai.mode === 'work'){
      u.task = null;
      ai.timer -= dt;
      if (ai.timer <= 0){
        ai.mode = 'toHome';
      }
      return;
    }

    // toHome
    u.task = { type:'walk', target:{ x: home.x, y: home.y } };
    const arrivedHome = _moveTowards(u, home, dt);
    if (arrivedHome){
      u.task = null;
      ai.mode = 'toWork';
      ai.target = null;
      ai.timer = 0;
    }
  }


  function tick(dt){
    if (!dt || !Number.isFinite(dt)){
      // Fallback für Aufrufe ohne dt (z.B. game.tick.js)
      dt = 1/60;
    }

    for (const u of _units){
      if (u.type === 'carrier'){
        if (u.task){
          _tickTask(u, dt);
        } else {
          _tickIdle(u, dt);
        }
        continue;
      }

      // Worker-Loop (Holzfäller/Fischer/Steinmetz etc.)
      if (u.type === 'worker'){
        _tickWorker(u, dt);
      }
    }
  }

  // -------------------------------------------------------------------------
  

  // -------------------------------------------------------------------------
  // AUTO-INIT: Falls HQ schon existiert (z.B. vor Laden dieses Moduls platziert)
  //           → HQPos setzen + Start-Carriers spawnen, damit Bau/Delivery läuft.
  //
  // Problem, das wir hier lösen:
  // - Wenn das HQ bereits "im Save/Setup" existiert, aber kein cb:build:place
  //   Event mehr feuert, bleibt _hqPos null → spawnInitialCarriers wird nie
  //   aufgerufen → es gibt keine Träger → niemand baut/liefert.
  // -------------------------------------------------------------------------
  let _autoInitDone = false;
  let _fallbackInitDone = false;

  function _getBuildingsArraySafe(){
    // möglichst kompatibel zu verschiedenen Projektständen
    const g = window.Game || {};
    const b = g.buildings;

    // 1) manche Stände: Game.buildings ist ein ARRAY
    if (Array.isArray(b)) return b;

    // 2) häufig: Game.buildings ist ein Manager mit getAll()/list
    if (b && typeof b.getAll === 'function') {
      const arr = b.getAll();
      if (Array.isArray(arr)) return arr;
    }
    if (b && Array.isArray(b.list)) return b.list;

    // 3) alte Stände: global Buildings.list
    if (Array.isArray(window.Buildings?.list)) return window.Buildings.list;

    return [];
  }

  function _countCarriers(){
    return _units.filter(u => u && u.type === 'carrier').length;
  }

  function _tryInitFromExistingHQ(reason){
    if (_autoInitDone) return;
    const arr = _getBuildingsArraySafe();
    if (!arr.length) return;

    const hq = arr.find(b => (b?.id || b?.buildingId) === 'b.hq');
    if (!hq) return;

    const w = Number(hq.w ?? 3);
    const h = Number(hq.h ?? 3);
    const tx = Number(hq.x ?? hq.tx ?? 0) + (Number.isFinite(w) ? w/2 : 1.5);
    const ty = Number(hq.y ?? hq.ty ?? 0) + (Number.isFinite(h) ? h/2 : 1.5);

    setHQPos({ tx, ty });

    // nur wenn es wirklich noch keine Carriers gibt
    if (_countCarriers() === 0){
      spawnInitialCarriers(3);
      LOG('AUTO-INIT: Start-Carriers gespawnt (HQ gefunden)', { reason, hq: { tx, ty } });
    }

    _autoInitDone = true;
    _emitChanged('auto-init:hq');
  }

  // Fallback: Wenn der Nutzer ohne HQ schon irgendwas platziert (oder Setup hat kein HQ),
  // dann lassen wir das Spiel nicht "tot" sein: wir initialisieren HQPos grob am ersten
  // platzierten Gebäude und spawnen 3 Carriers.
  function _fallbackInitNearBuilding(b, reason){
    if (_fallbackInitDone) return;
    if (!b) return;
    if (_countCarriers() > 0) return; // wenn schon da → nix machen
    if (_hqPos) return;               // wenn HQPos schon gesetzt → nix machen

    const w = Number(b.w ?? 1);
    const h = Number(b.h ?? 1);
    const tx = Number(b.x ?? b.tx ?? 0) + (Number.isFinite(w) ? w/2 : 0.5);
    const ty = Number(b.y ?? b.ty ?? 0) + (Number.isFinite(h) ? h/2 : 0.5);

    setHQPos({ tx, ty });
    spawnInitialCarriers(3);
    _fallbackInitDone = true;

    WARN('FALLBACK-INIT: Kein HQ gefunden – Carriers am ersten Gebäude gespawnt', { reason, at: { tx, ty }, building: (b.id || b.buildingId) });
    _emitChanged('auto-init:fallback');
  }

  // mehrmals versuchen, weil Reihenfolge beim Laden (Safari/iOS) variieren kann
  setTimeout(()=>_tryInitFromExistingHQ('timeout:250ms'), 250);
  setTimeout(()=>_tryInitFromExistingHQ('timeout:1000ms'), 1000);
  setTimeout(()=>_tryInitFromExistingHQ('timeout:2500ms'), 2500);

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

    // 1) Falls HQ bereits existiert (Save/Setup), initialisieren wir es hier.
    _tryInitFromExistingHQ('cb:build:place');

    // 2) Fallback: Wenn noch gar kein HQ vorhanden ist, aber Gebäude platziert werden,
    //    spawnen wir Träger am ersten Gebäude, damit der Prototyp nicht "tot" wirkt.
    if (id !== 'b.hq') {
      _fallbackInitNearBuilding(d.building, 'cb:build:place:first-non-hq');
      return;
    }


    const w  = d.w ?? 3;
    const h  = d.h ?? 3;
    const tx = (d.x ?? d.tx ?? 0) + w / 2;
    const ty = (d.y ?? d.ty ?? 0) + h / 2;

    setHQPos({ tx, ty });
    spawnInitialCarriers(3);
    _emitChanged('hq:placed');
  });

  // Gebäude-Finish → Worker automatisch spawnen (Holzfäller / Fischer / Steinmetz)
  // Hinweis: Das ist bewusst simpel gehalten (1 Worker pro Gebäude),
  // damit wir schnell sichtbar testen können. Später kommt Job-Zuweisung.
  window.addEventListener('cb:build:complete', (ev)=>{
    const d = ev?.detail || {};
    const buildingId = _getBuildingIdFromDetail(d);
    const workerUnitId = _getWorkerUnitIdForBuilding(buildingId);
    if (!workerUnitId) return;

    // WorkArea anlegen (falls noch nicht passiert)
    try{ window.GameWorkArea?.getOrCreateAreaFor?.(d); }catch(_e){}

    const uid = window.GameWorkArea?.makeUid?.(d) || d.uid || `${buildingId}@${(d.x|0)},${(d.y|0)}`;

    // Doppelt vermeiden (Reload / mehrfaches Event)
    const normWorker = _normUnitId(workerUnitId);
    if (_units.some(u => u.type==='worker' && u.homeUid===uid && u.kind===normWorker)){
      return;
    }

    const w = d.w ?? 1;
    const h = d.h ?? 1;
    const cx = (d.x ?? 0) + w/2;
    const cy = (d.y ?? 0) + h/2;

    const spawned = spawn(workerUnitId, 1, { at:{ tx: cx, ty: cy } });
    const u = spawned && spawned[0];
    if (!u) return;

    u.homeUid    = uid;
    u.homeX      = cx;
    u.homeY      = cy;
    u.homeDetail = { id: buildingId, uid, x: d.x, y: d.y, w: d.w, h: d.h };

    // AI initialisieren (damit er sofort losläuft)
    u._ai = null;
    _ensureWorkerAI(u);

    LOG('Worker gespawnt', { buildingId, worker: u.kind, homeUid: uid, x: u.x, y: u.y });
    _emitChanged('worker:spawn:'+buildingId);
  });



  // -------------------------------------------------------------------------
  // Inspector / Debug Events (optional, aber super praktisch)
  // -------------------------------------------------------------------------
  window.addEventListener('req:units:spawn', (ev)=>{
    const d = ev?.detail || {};
    const unitId = d.unitId || d.id || d.kind || '';
    const count  = (d.count == null ? 1 : (d.count|0));
    const at     = d.at || d.pos || d.hq || null; // 'hq' oder {tx,ty}
    spawn(unitId, count, { at });
  });

  window.addEventListener('req:units:clear', ()=>{
    clear();
  });

  window.addEventListener('req:units:snapshot', ()=>{
    snapshot();
  });


  // -------------------------------------------------------------------------
  // EXPORT
  // -------------------------------------------------------------------------
  window.GameUnits = {
    setHQPos,
    getHQPos,
    spawnInitialCarriers,
    getUnits,
    spawn,
    clear,
    snapshot,

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


--------------------------------------------------------------------------------
