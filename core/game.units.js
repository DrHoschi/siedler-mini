/* ============================================================================
 * Datei   : core/game.units.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v26.01.01-worker-entry-trigger-hotfix
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

    // Hook für Cinematic-Camera / andere Systeme:
    // Sobald das HQ bekannt ist, können Module (ohne Game.js anfassen) reagieren.
    try{
      window.dispatchEvent(new CustomEvent('cb:hq:pos', { detail: { tx: _hqPos.tx, ty: _hqPos.ty } }));
    } catch(e){ /* silent */ }
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

    // Ziel – tolerant gegenüber verschiedenen Job-Formaten:
    //  - Modern: job.to = {x,y} (Tile-Float, idealerweise Tile-Mitte)
    //  - Legacy: job.tx/job.ty oder job.to.tx/job.to.ty (Tile-Int)
    //  - Safety: falls nur buildingUid bekannt ist → Ziel = building.entranceTx/Ty
    let tx = Number(job?.to?.x);
    let ty = Number(job?.to?.y);

    // Legacy: Tile-Ints
    if (!Number.isFinite(tx) || !Number.isFinite(ty)){
      const ltx = Number.isFinite(Number(job?.tx)) ? (job.tx|0) : (Number.isFinite(Number(job?.to?.tx)) ? (job.to.tx|0) : NaN);
      const lty = Number.isFinite(Number(job?.ty)) ? (job.ty|0) : (Number.isFinite(Number(job?.to?.ty)) ? (job.to.ty|0) : NaN);
      if (Number.isFinite(ltx) && Number.isFinite(lty)){
        tx = ltx + 0.5;
        ty = lty + 0.5;
      }
    }

    // buildingUid-Fallback: Türtile als Ziel
    if (!Number.isFinite(tx) || !Number.isFinite(ty)){
      const b = (window.Game?.getBuildingByUid?.(job?.buildingUid))
             || ((window.Game?.getBuildings?.() || window.Game?.buildings || []).find(bb => bb && bb.uid === job?.buildingUid))
             || null;

      if (b){
        const ex = Number.isFinite(Number(b.entranceTx)) ? (b.entranceTx|0) : NaN;
        const ey = Number.isFinite(Number(b.entranceTy)) ? (b.entranceTy|0) : NaN;

        if (Number.isFinite(ex) && Number.isFinite(ey)){
          tx = ex + 0.5;
          ty = ey + 0.5;
        } else if (Array.isArray(b.entrances) && b.entrances.length){
          const dx = (b.entrances[0]?.dx|0) || 0;
          const dy = (b.entrances[0]?.dy|0) || 0;
          tx = (b.x|0) + dx + 0.5;
          ty = (b.y|0) + dy + 0.5;
        }
      }
    }

    // Letzter Fallback: bleib bei Quelle
    if (!Number.isFinite(tx)) tx = sx;
    if (!Number.isFinite(ty)) ty = sy;


    const source = { x: sx, y: sy };
    const dest   = { x: tx, y: ty };

    u.task = {
      phase  : 'go_source',   // erst zur Quelle (HQ)
      job    : job,
      source : source,
      dest   : dest,
      target : source,        // aktuelles Bewegungsziel
      pickupTimer : 0,

      // ---------------------------------------------------------------
      // Step-2 (Delivery an Entrance): Zuordnung zur Baustelle sichern.
      // WICHTIG: JobEngine hat in älteren Versionen Zusatzfelder
      // "weg-normalisiert". Auch wenn das inzwischen gefixt ist,
      // behalten wir die Infos zusätzlich direkt am Task.
      // ---------------------------------------------------------------
      buildingUid : job?.buildingUid || null,
      buildingId  : job?.buildingId  || null,

      // Merke auch Ziel-Tile als INTEGER (für Construction-Lookups)
      // Falls job.tx/ty fehlt, leiten wir es aus dest.x/dest.y ab.
      destTx : Number.isFinite(job?.tx) ? (job.tx|0) : Math.floor(dest.x),
      destTy : Number.isFinite(job?.ty) ? (job.ty|0) : Math.floor(dest.y)
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
      return true;
    }

    const nx = u.x + dx / dist * step;
    const ny = u.y + dy / dist * step;

    if (Number.isFinite(nx)) u.x = nx;
    if (Number.isFinite(ny)) u.y = ny;

    _maybeEmitUnitStep(u);

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

    // -----------------------------------------------------------------------
    // Fallback-Ziele (Tür/Goal blockiert, Off-Map etc.)
    // Idee:
    //  - Wenn der direkte Pfad zum Goal nicht geht, versuchen wir automatisch
    //    ein paar Nachbar-Tiles um das Ziel herum (kleiner Ring).
    //  - Das macht "Delivery an Tür" deutlich robuster, ohne überall Spezial-
    //    Code zu verteilen.
    function _tryFallbackGoalPath(startTile, goalTile, allowRects){
      const maxR = 3; // bewusst klein halten (Performance)
      const cand = [];

      // Ringe um das Ziel (r = 1..maxR)
      for (let r = 1; r <= maxR; r++){
        for (let dx = -r; dx <= r; dx++){
          for (let dy = -r; dy <= r; dy++){
            // nur Rand des Quadrats (Ring), nicht Fläche
            if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;

            const gx = (goalTile.x|0) + dx;
            const gy = (goalTile.y|0) + dy;

            // Skip: identisch
            if (gx === (goalTile.x|0) && gy === (goalTile.y|0)) continue;

            const dist = Math.abs(dx) + Math.abs(dy);
            cand.push({ x: gx, y: gy, dist });
          }
        }
      }

      // näher zuerst
      cand.sort((a,b)=> a.dist - b.dist);

      for (const c of cand){
        const p = PF.findPath(
          { x: startTile.x, y: startTile.y },
          { x: c.x,         y: c.y         },
          {
            allowDiagonal: true,
            smooth       : true,
            allowRects   : allowRects || undefined
          }
        );
        if (Array.isArray(p) && p.length){
          return { goal: { x: c.x, y: c.y }, path: p };
        }
      }

      return null;
    }


    // Recalc?
    const goalChanged = (u._nav.lastGoalX !== goalTile.x || u._nav.lastGoalY !== goalTile.y);
    const needCalc = (u._nav.key !== key) || !u._nav.path || goalChanged;

    if (needCalc && u._nav.tSinceCalc >= NAV_RECALC_COOLDOWN){
      const allowRects = _buildAllowRects(startTile, goalTile);

      let goalForNav = goalTile;
      let path = PF.findPath(
        { x: startTile.x, y: startTile.y },
        { x: goalTile.x,  y: goalTile.y  },
        {
          allowDiagonal: true,
          smooth       : true,
          allowRects   : allowRects || undefined
        }
      );

      // Wenn direkter Pfad nicht geht → Nachbar-Ziele probieren
      if (!(Array.isArray(path) && path.length)){
        const fb = _tryFallbackGoalPath(startTile, goalTile, allowRects);
        if (fb){
          goalForNav = fb.goal;
          path = fb.path;
        }
      }

      const key2 = _navKey(startTile, goalForNav);

      u._nav.key = key2;
      u._nav.path = Array.isArray(path) ? path : null;
      u._nav.idx  = 0;
      u._nav.tSinceCalc = 0;
      u._nav.lastGoalX = goalForNav.x;
      u._nav.lastGoalY = goalForNav.y;
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

      // Integer-Tile für Construction (Entrance/Footprint-Match!)
      const txi = Number.isFinite(t.destTx) ? (t.destTx|0) : Math.floor(tileX);
      const tyi = Number.isFinite(t.destTy) ? (t.destTy|0) : Math.floor(tileY);

      if (jobType === 'deliver'){
        // Klassischer Bau-Job → Bau-Subsystem informieren
        try{
          window.dispatchEvent(new CustomEvent('cb:build:deliver', {
            detail: {
              // Welt-/Tile-Koordinate (Mitte des Zieltiles)
              x  : tileX,
              y  : tileY,
              // zusätzlich Tile-Koordinaten, weil ältere Module tx/ty erwarten
              tx : txi,
              ty : tyi,
              res: u.carrying,
              // Zuordnung zur Baustelle (wichtig, wenn wir zur Türkachel liefern)
              buildingUid: t.buildingUid || t.job?.buildingUid || null,
              buildingId : t.buildingId  || t.job?.buildingId  || null,
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
// ENTRANCE-HELPERS (aus Gebäudeobjekt ODER Registry, weil wir die Entrances
//                   zentral in buildings.json gepflegt haben)
// -------------------------------------------------------------------------

function _getRegistryBuildingDef(buildingId){
  try{
    const R = window.Registry;
    if (!R) return null;
    if (typeof R.getBuilding === 'function') return R.getBuilding(buildingId);
    if (typeof R.get === 'function') return R.get('buildings', buildingId);
  }catch(e){}
  return null;
}

/**
 * Liefert die absolute Entrance-Tile (x/y) für ein Gebäude.
 * - bevorzugt b.entranceTx/entranceTy (falls schon gesetzt)
 * - sonst b.entrances[0] (dx/dy relativ)
 * - sonst Registry.def.entrances[0]
 * Fallback: südliche Mitte außerhalb des Footprints
 */
function _getEntranceTileForBuilding(b){
  if (!b) return null;

  // 1) direkt gespeichert?
  if (Number.isFinite(Number(b.entranceTx)) && Number.isFinite(Number(b.entranceTy))){
    return { x: (b.entranceTx|0), y: (b.entranceTy|0) };
  }

  // 2) am Objekt: entrances (dx/dy relativ)
  if (Array.isArray(b.entrances) && b.entrances.length){
    const e0 = b.entrances[0];
    const dx = (e0?.dx|0) || 0;
    const dy = (e0?.dy|0) || 0;
    return { x: (b.x|0) + dx, y: (b.y|0) + dy };
  }

  // 3) aus Registry
  const def = _getRegistryBuildingDef(b.id || b.type || '');
  if (def && Array.isArray(def.entrances) && def.entrances.length){
    const e0 = def.entrances[0];
    const dx = (e0?.dx|0) || 0;
    const dy = (e0?.dy|0) || 0;
    return { x: (b.x|0) + dx, y: (b.y|0) + dy };
  }

  // 4) Fallback: südliche Mitte (außerhalb)
  const bw = Math.max(1, (b.w|0) || 1);
  const bh = Math.max(1, (b.h|0) || 1);
  return { x: (b.x|0) + Math.floor(bw/2), y: (b.y|0) + bh };
}

function _findHQBuilding(){
  const list = (window.Game?.buildings || []);
  return list.find(b => b && (b.id==='b.hq' || b.type==='b.hq')) || null;
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
      mode      : 'toEntrance',  // 'toWork' | 'work' | 'toHome'
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
    

// -------------------------------------------------------------------
// Startsequenz nach Fertigbau:
//  1) Worker startet am HQ (Spawn) und läuft ZUERST zur Tür seines Gebäudes
//  2) Beim Betreten der Tür "geht er rein" (kurz unsichtbar)
//  3) Ab dem Moment gilt das Gebäude als "bewohnt" (Occupy-Trigger)
// -------------------------------------------------------------------
if (ai.mode === 'toEntrance'){
  const bldUid = u.homeBuildingUid || u.homeUid || null;
  const bld = (bldUid && Array.isArray(window.Game?.buildings))
    ? window.Game.buildings.find(bb => bb && (bb.uid === bldUid))
    : null;

  // Türtile bestimmen (Registry-Fallback inklusive)
  const ent = bld ? _getEntranceTileForBuilding(bld) : null;
  const target = ent ? { x: ent.x + 0.5, y: ent.y + 0.5 } : home;

  u.task = { type:'walk', target:{ x: target.x, y: target.y } };
  const arrived = _moveTo(u, target, dt);
  if (arrived){
    u.task = null;

    // Nur beim ERSTEN Eintritt: Occupy triggern + "rein gehen" (hide)
    if (!u._enteredHome){
      u._enteredHome = true;

      // Occupy: robust gegenüber unterschiedlichen Signaturen
      try{
        const BM = window.Buildings?.markOccupied;
        if (typeof BM === 'function'){
          // Variante A: markOccupied(uid)
          try{ BM(bldUid || bld || uid); }catch(_e){}
          // Variante B: markOccupied(building, unitId)
          try{ BM(bld || { uid:bldUid, id:(u.homeDetail?.id||'') }, u.kind); }catch(_e){}
        }
      }catch(e){}

      // Worker "geht rein" (5s)
      u.hiddenUntil = performance.now() + 5000;
      u.hidden = true;
    }

    ai.mode  = 'inside';
    ai.timer = 5.0;
  }
  return;
}

if (ai.mode === 'inside'){
  // solange inside: unsichtbar
  const now = performance.now();
  if (u.hiddenUntil && now < u.hiddenUntil){
    u.hidden = true;
  }

  ai.timer -= dt;
  if (ai.timer <= 0){
    // wieder raus
    u.hidden = false;
    ai.mode = 'toWork';
    ai.target = null;
  }
  return;
}

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
        // Builder haben eine eigene, sehr einfache Baustellen-Logik.
        // (Sie sollen NICHT automatisch in WorkAreas "arbeiten".)
        if (u.kind === 'u.builder'){
          _tickBuilder(u, dt);
        } else {
          _tickWorker(u, dt);
        }
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

    // ---------------------------------------------------------------------
    // WICHTIG (v26.01.06): HQ-Spawnpunkt soll NICHT die Mitte sein,
    // sondern – wenn vorhanden – der Marker "entry" (oder alt: "door").
    //
    // - entrances[] sind Tile-Offets (Pathfinding/Erreichbarkeit)
    // - markers.entry ist pixelgenau relativ zum Pivot (SpriteTest)
    //
    // Wir merken diese Position als HQPos, damit ALLE Units (Carrier,
    // Worker, Builder) konsistent am HQ-Eingang starten.
    // ---------------------------------------------------------------------

    const tileSize = (window.Game?.map?.tileSize) || 64;

    function getHQDef(){
      try{
        const reg = window.Registry;
        if (reg && typeof reg.getBuilding === 'function') return reg.getBuilding('b.hq');
        if (reg && typeof reg.get === 'function') return reg.get('buildings', 'b.hq');
      }catch(_e){}
      return null;
    }

    function calcSpawnAtFromMarkerOrEntrance(detail){
      const w = Number(detail.w ?? 3);
      const h = Number(detail.h ?? 3);
      const bx = Number(detail.x ?? detail.tx ?? 0);
      const by = Number(detail.y ?? detail.ty ?? 0);

      const def = getHQDef();
      const m = def?.markers?.entry || def?.markers?.door || null;

      // Annahme (bewährt bei unseren Building-Sprites): Pivot liegt am
      // "Boden" unten mittig über dem Footprint.
      const pivotTx = bx + w / 2;
      const pivotTy = by + h;

      if (m && Number.isFinite(m.x) && Number.isFinite(m.y)) {
        return { tx: pivotTx + (m.x / tileSize), ty: pivotTy + (m.y / tileSize) };
      }

      // Fallback: entrances[0] (Tile)
      const ent0 = (def && Array.isArray(def.entrances) && def.entrances[0]) ? def.entrances[0] : null;
      if (ent0 && Number.isFinite(ent0.dx) && Number.isFinite(ent0.dy)) {
        return { tx: bx + ent0.dx + 0.5, ty: by + ent0.dy + 0.5 };
      }

      // Letzter Fallback: Mitte (alt)
      return { tx: bx + w / 2, ty: by + h / 2 };
    }

    const spawnAt = calcSpawnAtFromMarkerOrEntrance(d);
    setHQPos(spawnAt);
    spawnInitialCarriers(3);
    _emitChanged('hq:placed');
  });

  // -------------------------------------------------------------------------
  // CONSTRUCTION: Build-Phase startet (erst wenn ALLE Ressourcen geliefert)
  //  - Builder sollen aus dem HQ kommen
  //  - zur Baustelle laufen
  //  - "arbeiten" (erstmal nur dort stehen/idle)
  //  - wenn fertig: zurück zum HQ
  // -------------------------------------------------------------------------

  function _makeBuildUid(d){
    return d?.uid || d?.buildingUid || (String(d?.id||'') + '@' + ((d?.x|0) + ',' + (d?.y|0)));
  }

  function _getHQSpawnPos(){
    // HQPos ist bereits markerbasiert (siehe cb:build:place). Falls noch
    // nicht gesetzt: fallback auf Mitte 0,0.
    return _hqPos ? { tx:_hqPos.tx, ty:_hqPos.ty } : { tx:0, ty:0 };
  }

  function _assignBuilderToConstruction(u, d){
    const uid = _makeBuildUid(d);
    const cx  = (Number(d.x)|0) + (Number(d.w ?? 1) / 2);
    const cy  = (Number(d.y)|0) + (Number(d.h ?? 1) / 2);

    u._builderJob = {
      uid,
      id: d.id || d.buildingId || '',
      site: { x: cx, y: cy },
      phase: 'toSite'
    };

    // Home = HQ (damit Rückweg klar ist)
    const hq = _getHQSpawnPos();
    u.homeX = hq.tx;
    u.homeY = hq.ty;
  }

  function _tickBuilder(u, dt){
    const job = u._builderJob;
    if (!job){
      // Kein Job: Builder soll "klar" am HQ bleiben (kein Random-Run mehr).
      // -> damit sieht man sofort: Builder kommen aus dem HQ und warten dort.
      if (_hqPos){
        const hq = _getHQSpawnPos();
        const tgt = { x: hq.tx, y: hq.ty };
        // Wenn er zu weit weg ist: zurück zum HQ-Entry.
        const dx = (tgt.x - u.x);
        const dy = (tgt.y - u.y);
        const dist2 = dx*dx + dy*dy;
        if (dist2 > 0.15*0.15){
          u.task = { type:'walk', target:{ x: tgt.x, y: tgt.y } };
          _moveTowards(u, tgt, dt);
        } else {
          u.task = null;
        }
      }
      return;
    }

    if (job.phase === 'toSite'){
      u.task = { type:'walk', target:{ x: job.site.x, y: job.site.y } };
      const arrived = _moveTowards(u, job.site, dt);
      if (arrived){
        u.task = null;
        job.phase = 'working';
        job.timer = 0;
      }
      return;
    }

    if (job.phase === 'working'){
      // Builder arbeitet sichtbar an der Baustelle:
      //  - hält Position nahe der Baustelle (job.site)
      //  - spielt "work" als Anim-State (Renderer/UnitAnim nutzt task.type)
      //  - optionaler Rhythmus: work/idle, damit es lebendiger wirkt
      const site = job.site || { x:u.x, y:u.y };
      // leichte Korrektur: zurück an die Arbeitsposition, falls er weggedriftet ist
      _moveTowards(u, site, dt);

      job.timer = (job.timer || 0) + dt;

      // Rhythmus: 2.0s work, 0.6s idle (repeat)
      const cycle = 2.6;
      const t = job.timer % cycle;
      if (t < 2.0){
        u.task = { type:'work', target:{ x: site.x, y: site.y } };
      } else {
        u.task = null;
      }
      return;
    }

    if (job.phase === 'toHQ'){
      const hq = _getHQSpawnPos();
      const tgt = { x: hq.tx, y: hq.ty };
      u.task = { type:'walk', target:{ x: tgt.x, y: tgt.y } };
      const arrived = _moveTowards(u, tgt, dt);
      if (arrived){
        u.task = null;
        u._builderJob = null;
      }
      return;
    }
  }

  // Builder bei Baustart anfordern
  window.addEventListener('cb:build:construct:start', (ev)=>{
    const d = ev?.detail || {};
    const uid = _makeBuildUid(d);

    // Schon Builder für diese Baustelle unterwegs?
    if (_units.some(u => u.kind==='u.builder' && u._builderJob && u._builderJob.uid === uid)){
      return;
    }

    // Falls noch kein Builder existiert, erzeugen wir 1–2 am HQ.
    const existingFree = _units.filter(u => u.kind==='u.builder' && !u._builderJob);
    const need = Math.max(0, 2 - existingFree.length);
    if (need > 0){
      try { spawn('u.builder', need, { at: _getHQSpawnPos() }); } catch(e) {}
    }

    // Zuweisen (max 2 Builder)
    const pool = _units.filter(u => u.kind==='u.builder' && !u._builderJob);
    for (let i=0; i<Math.min(2, pool.length); i++){
      _assignBuilderToConstruction(pool[i], d);
    }

    _emitChanged('builder:construct:start');
  });

  // Wenn Gebäude fertig: Builder zurück zum HQ schicken
  window.addEventListener('cb:build:complete', (ev)=>{
    const d = ev?.detail || {};
    const uid = _makeBuildUid(d);
    for (const u of _units){
      if (u.kind==='u.builder' && u._builderJob && u._builderJob.uid === uid){
        u._builderJob.phase = 'toHQ';
      }
    }
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

    // Worker spawnt am HQ-Eingang (Marker-basiert), nicht im Gebäude selbst,
    // damit wir den "läuft vom HQ zum Gebäude"-Flow sehen.
    //
    // HQPos wurde beim HQ-Placement bereits aus markers.entry (door fallback)
    // berechnet. Falls HQ noch nicht existiert: Fallback Gebäude-Mitte.
    let sx = 0, sy = 0;
    if (_hqPos){
      sx = _hqPos.tx;
      sy = _hqPos.ty;
    } else {
      const w = d.w ?? 1;
      const h = d.h ?? 1;
      sx = (d.x ?? 0) + w/2;
      sy = (d.y ?? 0) + h/2;
    }

    const spawned = spawn(workerUnitId, 1, { at:{ tx: sx, ty: sy } });
    const u = spawned && spawned[0];
    if (!u) return;

    u.homeUid        = uid;
    u.homeBuildingUid = (d.uid || d.buildingUid || uid);
    // Home = Gebäude-Mitte (Tile-Float), damit toHome/toWork stabil bleibt
    u.homeX      = (Number(d.x)|0) + (Number(d.w ?? 1) / 2);
    u.homeY      = (Number(d.y)|0) + (Number(d.h ?? 1) / 2);
    u.homeDetail = { id: buildingId, uid: (d.uid || d.buildingUid || uid), x: d.x, y: d.y, w: d.w, h: d.h };

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
