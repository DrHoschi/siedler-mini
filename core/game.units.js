/* ============================================================================
 * Datei   : core/game.units.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.30-carrier-jobs
 *
 * Zweck   : Träger mit echtem Job-System
 * ============================================================================ */
(function () {
  'use strict';

  const TAG  = '[units]';
  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  const _units = [];
  let _hqPos = null;
  let _game = null;

  let _initialSpawnDone = false;

  function _ensureGameBinding(game) {
    if (!game || _game === game) return;
    _game = game;
    try { _game.units = _units; }
    catch (err) { WARN('Game-Bindung fehlgeschlagen', err); }
    LOG('Units.init abgeschlossen – Units an Game gebunden');
  }

  function _rand(min, max) {
    return min + Math.random() * (max - min);
  }

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
      speed: 1.5,
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
      {dx:-0.6,dy:0}, {dx:0.6,dy:0}, {dx:0,dy:0.6},
      {dx:-0.6,dy:-0.4}, {dx:0.6,dy:-0.4}
    ];

    for (let i=0; i<count; i++){
      const o = OFFS[i % OFFS.length];
      _spawnCarrierAt(baseX + o.dx, baseY + o.dy);
    }
  }

  function getHQPos(){ return _hqPos; }
  function getUnits(){ return _units; }

  // ---------------------------------------------------------
  // JOB HANDLING
  // ---------------------------------------------------------

  function needsJob(){
    return _units.some(u => u.type==='carrier' && !u.task);
  }

  function assignJob(job){
    const u = _units.find(u => u.type==='carrier' && !u.task);
    if (!u) return false;

    u.task = {
      phase: 'go_source', // zum HQ
      job: job,
      target: { x: job.from.tx, y: job.from.ty }
    };

    LOG('Carrier übernimmt Job', { carrier:u.id, job:job.id });
    return true;
  }

  // ---------------------------------------------------------
  // BEWEGUNG
  // ---------------------------------------------------------

  function _randomTargetNearHQ(){
    if (!_hqPos) return null;
    const r=1.2;
    return { x: _hqPos.tx + _rand(-r,r), y: _hqPos.ty + _rand(-r,r) };
  }

  function _moveTowards(u, target, dt){
    const dx = target.x - u.x;
    const dy = target.y - u.y;
    const dist = Math.hypot(dx,dy);
    if (dist < 0.01){
      u.x = target.x;
      u.y = target.y;
      return true;
    }
    const step = u.speed * dt;
    u.x += dx / dist * step;
    u.y += dy / dist * step;
    return dist < step;
  }

  function _tickTask(u, dt){
    const t = u.task;
    if (!t) return;

    // Phase 1: Zum HQ laufen
    if (t.phase === 'go_source'){
      if (_moveTowards(u, t.target, dt)){
        t.phase = 'pickup';
        t.pickupTimer = 0.3; // kurze Pause
      }
      return;
    }

    // Phase 2: Pickup Holz
    if (t.phase === 'pickup'){
      t.pickupTimer -= dt;
      if (t.pickupTimer <= 0){
        u.carrying = t.job.res || 'res.wood';
        t.phase = 'go_target';
        t.target = { x: t.job.to.tx, y: t.job.to.ty };
      }
      return;
    }

    // Phase 3: Zum Gebäude laufen
    if (t.phase === 'go_target'){
      if (_moveTowards(u, t.target, dt)){
        t.phase = 'deliver';
      }
      return;
    }

    // Phase 4: Abliefern
    if (t.phase === 'deliver'){
      u.carrying = null;
      u.task = null; // Job erledigt
      return;
    }
  }

  function _tickIdle(u, dt){
    if (!u.target) u.target = _randomTargetNearHQ();
    if (_moveTowards(u, u.target, dt)){
      u.target = _randomTargetNearHQ();
    }
  }

  function tick(dt){
    if (!dt) dt = 1/60;

    for (const u of _units){
      if (u.type !== 'carrier') continue;

      if (u.task){
        _tickTask(u, dt);
      } else {
        _tickIdle(u, dt);
      }
    }
  }

  // ---------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------

  window.addEventListener('cb:game:start', ev=>{
    const game = ev?.detail?.game ?? window.Game ?? null;
    if (game) _ensureGameBinding(game);
  });

  window.addEventListener('cb:build:place', ev=>{
    const d = ev?.detail || {};
    const id = d.buildingId || d.id || '';
    if (id !== 'b.hq') return;

    const w = d.w ?? 3;
    const h = d.h ?? 3;
    const tx = (d.x ?? d.tx ?? 0) + w/2;
    const ty = (d.y ?? d.ty ?? 0) + h/2;

    setHQPos({tx,ty});
    spawnInitialCarriers(3);
  });

  window.GameUnits = {
    setHQPos,
    getHQPos,
    spawnInitialCarriers,
    getUnits,
    needsJob,
    assignJob,
    tick
  };

  LOG('Units geladen → Jobfähig');
})();
