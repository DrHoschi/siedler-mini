/* ============================================================================
 * Datei   : core/game.units.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.14-units-worker-spawn-workarea-v1
 *
 * Zweck   : Zentrale Einheiten-Logik
 *           – verwaltet HQ-Position & Unit-Liste
 *           – bewegt Carrier (Idle + Job-Phasen)
 *           – spawnt Worker passend zu Gebäuden (Lumberjack/Quarry/Fisher)
 *           – Worker "arbeiten" sichtbar: laufen im WorkArea-Kreis hin & her
 *
 * Wichtig :
 *   - Carrier-Job-System bleibt 1:1 kompatibel.
 *   - Worker-Loop ist bewusst "lightweight" (noch kein echtes Job-System),
 *     aber liefert die sichtbare Basis, damit wir später D) sauber ausbauen:
 *       Job anfordern → hinlaufen → arbeiten → output → carrier-job
 *
 * API     :
 *   GameUnits.setHQPos({tx,ty})
 *   GameUnits.getHQPos()
 *   GameUnits.spawnInitialCarriers(n)
 *   GameUnits.getUnits()
 *   GameUnits.spawn(unitId, count, opts)
 *   GameUnits.clear()
 *   GameUnits.snapshot()
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
  /** @type {Array<any>} */
  const _units = [];

  /** @type {{tx:number,ty:number}|null} */
  let _hqPos = null;

  /** optional Referenz aufs Game-Objekt (für spätere Erweiterungen) */
  let _game = null;

  /** Für Auto-Spawn: buildingUid -> unit.id */
  const _workersByBuildingUid = new Map();

  /** letzte bekannte Building-Details (uid) -> detail */
  const _buildingsByUid = new Map();

  // Bewegungsgeschwindigkeit (Tiles/s). Carrier nutzt denselben Wert.
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

  /** WorkArea-UID-Logik wie in core/game.workarea.js (für robuste Zuordnung) */
  function _makeBuildingUid(detail){
    if (!detail) return null;
    if (typeof detail === 'string') return detail;
    if (detail.uid) return String(detail.uid);

    const id = detail.id || detail.buildingId || detail.kind || 'building';
    const x  = detail.x | 0;
    const y  = detail.y | 0;
    return `${id}@${x},${y}`;
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
      kind : 'u.carrier',      // Registry-ID
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

  function _spawnUnitAt(unitId, tx, ty, meta){
    // Carrier bleibt kompatibel zum bestehenden Job-System
    if (_isCarrierId(unitId)) {
      const u = _spawnCarrierAt(tx, ty);
      if (meta && typeof meta === 'object') Object.assign(u, meta);
      return u;
    }

    // Worker/Villager/Jobs später – aktuell als Sprite über Unit-Overlay sichtbar
    const kind = _normUnitId(unitId) || 'u.unknown';
    const unit = {
      id   : _units.length + 1,
      type : 'worker',
      kind : kind,          // <-- wichtig: Registry-ID ('u.lumberjack', ...)
      x    : tx,
      y    : ty,
      task : null,
      carrying   : null,

      // Worker-Movement-State
      _idleTarget : null,
      _wstate     : null,

      // Zuordnung
      assignedBuildingUid : meta?.assignedBuildingUid || null,
      assignedBuildingId  : meta?.assignedBuildingId  || null,
      home                : meta?.home || null
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
      arr.push(_spawnUnitAt(unitId, base.tx + jitterX, base.ty + jitterY, opts?.meta));
    }
    _emitChanged('spawn:'+String(unitId||''));
    return arr;
  }

  function clear(){
    if (!_units.length) return;
    _units.length = 0;
    _workersByBuildingUid.clear();
    _buildingsByUid.clear();
    _emitChanged('clear');
  }

  function snapshot(){
    const detail = { units: _units.slice(), counts: _counts(), hq: getHQPos() };
    try { window.dispatchEvent(new CustomEvent('cb:units:snapshot', { detail })); } catch {}
    try { document.dispatchEvent(new CustomEvent('cb:units:snapshot', { detail })); } catch {}
    return detail;
  }

  // -------------------------------------------------------------------------
  // AUTO-SPAWN: Worker passend zum Gebäude
  // -------------------------------------------------------------------------

  /**
   * Building → Worker Mapping (Epoche 1)
   * (Alias/Unit-IDs sind in data/units.json abgedeckt)
   */
  const BUILDING_TO_WORKER = Object.freeze({
    'b.lumberjack': 'u.lumberjack',
    'b.quarry'    : 'u.stonecutter',
    'b.fisher'    : 'u.fisher'
  });

  function _getEntranceTile(buildingDetail){
    const id = buildingDetail?.id || buildingDetail?.buildingId || '';
    const x  = buildingDetail?.x ?? buildingDetail?.tx ?? 0;
    const y  = buildingDetail?.y ?? buildingDetail?.ty ?? 0;
    const w  = (buildingDetail?.w|0) || 3;
    const h  = (buildingDetail?.h|0) || 3;

    // Registry-Entrances bevorzugen (dx/dy sind relativ zur Gebäude-TopLeft-Tile)
    try{
      const def = window.Registry?.getBuilding?.(id);
      const e0  = def?.entrances?.[0];
      const dx  = Number(e0?.dx);
      const dy  = Number(e0?.dy);
      if (Number.isFinite(dx) && Number.isFinite(dy)){
        return { tx: (x|0) + dx, ty: (y|0) + dy };
      }
    }catch(_){}

    // Fallback: mittig unten
    return { tx: (x|0) + w/2, ty: (y|0) + h };
  }

  function _spawnWorkerForBuilding(buildingDetail){
    const id  = buildingDetail?.id || buildingDetail?.buildingId || '';
    const uid = _makeBuildingUid(buildingDetail);
    if (!uid || !id) return null;

    // Nur, wenn wir das Gebäude kennen & es ein Worker-Gebäude ist
    const workerKind = BUILDING_TO_WORKER[id];
    if (!workerKind) return null;

    // Schon vorhanden?
    if (_workersByBuildingUid.has(uid)){
      return null;
    }

    // WorkArea (default) sicherstellen – damit Worker direkt "arbeiten" kann
    const area = window.GameWorkArea?.ensureDefaultForBuilding?.({
      id, buildingId:id, uid,
      x: buildingDetail.x|0, y: buildingDetail.y|0,
      w: (buildingDetail.w|0) || 3, h: (buildingDetail.h|0) || 3
    });

    const door = _getEntranceTile(buildingDetail);
    const meta = {
      assignedBuildingUid : uid,
      assignedBuildingId  : id,
      home                : { tx: door.tx, ty: door.ty },
      workAreaUid         : area?.uid || uid
    };

    const u = _spawnUnitAt(workerKind, door.tx + _rand(-0.15,0.15), door.ty + _rand(-0.15,0.15), meta);
    _workersByBuildingUid.set(uid, u.id);

    LOG('Worker gespawnt', { building:id, uid, worker: workerKind, at: door });
    _emitChanged('worker:spawn:'+id);
    return u;
  }

  /** Wohnhäuser: spawns[] aus buildings.json (z.B. 2 Villager) */
  function _spawnBuildingSpawns(buildingDetail){
    const id = buildingDetail?.id || buildingDetail?.buildingId || '';
    if (!id) return;

    const def = window.Registry?.getBuilding?.(id);
    const sp = Array.isArray(def?.spawns) ? def.spawns : null;
    if (!sp || !sp.length) return;

    const uid = _makeBuildingUid(buildingDetail);
    const door = _getEntranceTile(buildingDetail);

    for (const s of sp){
      const unit = s?.unit;
      const qty  = (s?.qty|0) || 1;
      if (!unit || qty <= 0) continue;

      spawn(unit, qty, { at: door, meta: { assignedBuildingUid: uid, assignedBuildingId: id, home: {tx:door.tx, ty:door.ty} } });
    }

    LOG('Building-spawns erzeugt', { building:id, spawns: sp });
  }

  // -------------------------------------------------------------------------
  // JOB HANDLING (Carrier)
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

    // Quelle – tolerant gegenüber {x,y} / {tx,ty}
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
  // BEWEGUNG (Carrier + Worker)
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

  // --------------------------- Carrier Task Loop ----------------------------

  function _tickTask(u, dt){
    const t = u.task;
    if (!t) return;

    // Phase 1: Zur Quelle laufen
    if (t.phase === 'go_source'){
      if (_moveTowards(u, t.source, dt)){
        t.phase       = 'pickup';
        t.pickupTimer = 0.3; // kleine Pause zum „Aufladen“
      }
      return;
    }

    // Phase 2: Aufnahme
    if (t.phase === 'pickup'){
      t.pickupTimer -= dt;
      if (t.pickupTimer <= 0){
        u.carrying = String(t.job?.res || 'wood').replace(/^res\./,'');
        t.phase    = 'go_target';
      }
      return;
    }

    // Phase 3: Zum Ziel laufen
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
        try{
          window.dispatchEvent(new CustomEvent('cb:build:deliver', {
            detail: { x: tileX, y: tileY, tx: tileX, ty: tileY, res: u.carrying, jobId: t.job?.id }
          }));
        } catch(e){
          WARN('cb:build:deliver dispatch fehlgeschlagen', e);
        }
      } else {
        try{
          window.dispatchEvent(new CustomEvent('cb:job:done', {
            detail: { type: jobType, carrierId: u.id, res: u.carrying, jobId: t.job?.id, x: tileX, y: tileY }
          }));
        } catch(e){
          WARN('cb:job:done dispatch fehlgeschlagen', e);
        }
      }

      u.carrying = null;
      u.task     = null;
      return;
    }
  }

  function _tickIdleCarrier(u, dt){
    if (!_hqPos) return;

    if (!u._idleTarget || Math.random() < 0.01){
      u._idleTarget = _randomTargetNearHQ();
    }
    if (!u._idleTarget) return;

    _moveTowards(u, u._idleTarget, dt);
  }

  // --------------------------- Worker "WorkArea" Loop -----------------------

  function _pickRandomInWorkArea(uid){
    const area = window.GameWorkArea?.getAreaFor?.(uid) || window.GameWorkArea?.areasByUid?.get?.(uid) || null;
    if (!area) return null;

    const cx = Number(area.cx);
    const cy = Number(area.cy);
    const r  = Number(area.radiusTiles);
    if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(r) || r <= 0) return null;

    // gleichmäßige Verteilung: sqrt(rand) * r
    const a = Math.random() * Math.PI * 2;
    const m = Math.sqrt(Math.random()) * r;
    return { x: cx + Math.cos(a)*m, y: cy + Math.sin(a)*m };
  }

  function _tickWorker(u, dt){
    // Worker ohne assignment: einfach minimal "atmen" (klein wandern um current pos)
    const uid = u.assignedBuildingUid || u.workAreaUid || null;
    const home = u.home || { tx: u.x, ty: u.y };

    if (!u._wstate){
      u._wstate = { phase:'go_work', timer:0, target:null };
    }

    const st = u._wstate;

    if (st.phase === 'go_work'){
      if (!st.target){
        st.target = _pickRandomInWorkArea(uid) || { x: home.tx + _rand(-0.8,0.8), y: home.ty + _rand(-0.8,0.8) };
      }
      if (_moveTowards(u, st.target, dt)){
        st.phase = 'work';
        st.timer = 0.6 + Math.random() * 0.9; // kurze Arbeitszeit
        st.target = null;
      }
      return;
    }

    if (st.phase === 'work'){
      st.timer -= dt;
      if (st.timer <= 0){
        st.phase = 'go_home';
      }
      return;
    }

    if (st.phase === 'go_home'){
      const target = { x: home.tx, y: home.ty };
      if (_moveTowards(u, target, dt)){
        st.phase = 'rest';
        st.timer = 0.5 + Math.random() * 0.8;
      }
      return;
    }

    if (st.phase === 'rest'){
      st.timer -= dt;
      if (st.timer <= 0){
        st.phase = 'go_work';
      }
    }
  }

  // -------------------------------------------------------------------------
  // TICK
  // -------------------------------------------------------------------------
  function tick(dt){
    if (!dt || !Number.isFinite(dt)){
      dt = 1/60;
    }

    for (const u of _units){
      if (u.type === 'carrier'){
        if (u.task) _tickTask(u, dt);
        else _tickIdleCarrier(u, dt);
        continue;
      }
      if (u.type === 'worker'){
        _tickWorker(u, dt);
        continue;
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

  /**
   * Gebäude-Fertig/Placed Event:
   * - wir merken uns Detail → späterer WorkArea-Set kann Worker nachziehen
   * - wir spawnen default sofort, damit du Worker direkt am Gebäude siehst
   */
  window.addEventListener('cb:build:complete', (ev)=>{
    const d = ev?.detail || {};
    const id = d.id || d.buildingId || d.kind || '';
    if (!id) return;

    const uid = _makeBuildingUid(d);
    if (uid) _buildingsByUid.set(uid, d);

    // Haus-Spawns (Villager etc.)
    _spawnBuildingSpawns(d);

    // Worker buildings
    _spawnWorkerForBuilding(d);
  });

  /**
   * Sobald WorkArea gesetzt wird, stellen wir sicher, dass der Worker existiert
   * und die UID korrekt verknüpft bleibt.
   */
  window.addEventListener('cb:workarea:set', (ev)=>{
    const d = ev?.detail || {};
    const uid = _makeBuildingUid(d);
    if (!uid) return;

    // Detail aktualisieren/merken (z.B. wenn x/y nicht komplett war)
    _buildingsByUid.set(uid, { ...(_buildingsByUid.get(uid) || {}), ...d });

    // Worker sicherstellen
    _spawnWorkerForBuilding(_buildingsByUid.get(uid) || d);
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

    // Carrier API
    needsJob,
    assignJob,

    // Tick
    tick,

    // Debug
    _state: {
      units : _units,
      hqPos : () => _hqPos,
      game  : () => _game,
      workersByBuildingUid : _workersByBuildingUid,
      buildingsByUid : _buildingsByUid
    }
  };

  LOG('Units geladen → Carrier + Worker-Spawns/WorkArea-Loop aktiv');
})();
