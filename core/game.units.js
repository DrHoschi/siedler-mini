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
      _idleTarget: null
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
      _idleTarget: null
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

    if (u._lastStepTx === tx && u._lastStepTy === ty) return;
    u._lastStepTx = tx;
    u._lastStepTy = ty;

    try{
      window.dispatchEvent(new CustomEvent('cb:unit:step', {
        detail: {
          id   : u.id,
          kind : u.kind,
          type : u.type,
          tx, ty,
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
      return true;
    }

    const nx = u.x + dx / dist * step;
    const ny = u.y + dy / dist * step;

    if (Number.isFinite(nx)) u.x = nx;
    if (Number.isFinite(ny)) u.y = ny;

    _maybeEmitUnitStep(u);

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
