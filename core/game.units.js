/* ============================================================================
 * Datei   : core/game.units.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.10-units-core-v1
 *
 * Zweck   : Träger mit Job-System
 *           – verwaltet HQ-Position & Carrier-Liste
 *           – bewegt Carrier (Idle + Job-Phasen)
 *           – versteht Jobs mit {tx,ty} ODER {x,y}
 *           – sendet cb:build:deliver bei Ankunft an der Baustelle
 *
 * Wichtige Schnittstellen:
 *   • nutzt globales window.JobEngine (push()/pop())
 *   • bindet sich an window.Game (Game.units = _units)
 *   • wird von game.js über GameUnits.tick(dt) aufgerufen
 *   • Overlay (unit-overlay.js) liest über Game.getUnits()
 * ========================================================================== */
(function () {
  'use strict';

  const TAG  = '[units]';
  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  /**
   * Interner Einheiten-Array.
   * Jede Unit (Träger) sieht ungefähr so aus:
   *  {
   *    id       : number,
   *    type     : 'carrier',
   *    x, y     : number (Tile-Koordinaten, float),
   *    speed    : number (Tiles/Sekunde),
   *    target   : {x,y}?        // Idle-Ziel in HQ-Nähe
   *    carrying : string|null,  // 'wood' | 'stone' | ...
   *    task     : { ... }|null  // aktueller Job (go_source, pickup, go_target, deliver)
   *  }
   */
  const _units = [];

  /** HQ-Position in Tile-Koordinaten (Mitte) */
  let _hqPos = null; // {tx,ty}

  /** Referenz auf Game (wird bei cb:game:start gesetzt) */
  let _game = null;

  /** Nur einmal Carrier beim ersten HQ-Placement spawnen */
  let _initialSpawnDone = false;

  // ---------------------------------------------------------------------------
  // HILFSFUNKTIONEN
  // ---------------------------------------------------------------------------

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

  /**
   * Zahl aus job.from / job.to holen – unterstützt {tx,ty} UND {x,y}
   * fallback wird genutzt, wenn nichts Gültiges gefunden wird.
   */
  function _coord(obj, key, fallback) {
    if (!obj || typeof obj !== 'object') return fallback;
    const a = obj[key];
    if (Number.isFinite(a)) return a;

    // Mapping tx<->x bzw. ty<->y, je nachdem was angefragt wird
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

  // ---------------------------------------------------------------------------
  // HQ + SPAWN
  // ---------------------------------------------------------------------------

  /**
   * HQ-Position setzen (Tiles, Mitte des HQ).
   * Wird von cb:build:place für b.hq aufgerufen.
   */
  function setHQPos(pos) {
    if (!pos) return;
    _hqPos = { tx: pos.tx, ty: pos.ty };
    LOG('HQPos gesetzt', _hqPos);
  }

  function _spawnCarrierAt(tx, ty) {
    const unit = {
      id      : _units.length + 1,
      type    : 'carrier',
      x       : tx,
      y       : ty,
      target  : null,
      speed   : 0.25,      // Tiles / Sekunde
      carrying: null,
      task    : null
    };
    _units.push(unit);
    LOG('Carrier gespawnt', unit);
  }

  /**
   * Anfangs-Träger beim HQ spawnen.
   */
  function spawnInitialCarriers(count) {
    if (!Number.isFinite(count) || count <= 0) count = 3;
    if (!_hqPos) {
      WARN('spawnInitialCarriers ohne HQPos aufgerufen');
      return;
    }
    if (_initialSpawnDone) return;
    _initialSpawnDone = true;

    for (let i = 0; i < count; i++) {
      const dx = _rand(-0.5, 0.5);
      const dy = _rand(-0.2, 0.2);
      _spawnCarrierAt(_hqPos.tx + dx, _hqPos.ty + dy);
    }
    LOG('Initiale Carrier gespawnt:', count);
  }

  // ---------------------------------------------------------------------------
  // JOB-ANBINDUNG
  // ---------------------------------------------------------------------------

  /**
   * Sucht sich bei Bedarf einen Job aus der JobEngine und bindet ihn
   * an den übergebenen Carrier u.
   */
  function _assignJobIfNeeded(u) {
    if (!window.JobEngine || typeof window.JobEngine.pop !== 'function') {
      return false;
    }

    const job = window.JobEngine.pop();
    if (!job) return false;

    // Quelle (HQ)
    let sx = _hqPos ? _hqPos.tx : u.x;
    let sy = _hqPos ? _hqPos.ty : u.y;

    // Ziel (Gebäude) – job.to kann {x,y} oder {tx,ty} haben
    const tx = _coord(job.to || {}, 'x', sx);
    const ty = _coord(job.to || {}, 'y', sy);

    const source = { x: sx, y: sy };
    const dest   = { x: tx, y: ty };

    u.task = {
      phase       : 'go_source',   // 1) zur Quelle (HQ)
      job         : job,
      source      : source,
      dest        : dest,
      target      : source,        // aktuelles Bewegungsziel
      pickupTimer : 0              // kleiner Timer beim Aufladen
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

  function _randomTargetNearHQ() {
    if (!_hqPos) return null;
    const r = 1.2;
    return {
      x: _hqPos.tx + _rand(-r, r),
      y: _hqPos.ty + _rand(-r, r)
    };
  }

  function _moveTowards(u, target, dt) {
    if (!target) return false;

    const dx   = target.x - u.x;
    const dy   = target.y - u.y;
    const dist = Math.hypot(dx, dy);

    if (!(dist > 0.0001)) {
      // Ziel erreicht oder numerischer Murks → hart setzen
      u.x = target.x;
      u.y = target.y;
      return true;
    }

    const step = u.speed * dt;
    const nx   = u.x + (dx / dist) * step;
    const ny   = u.y + (dy / dist) * step;

    if (Number.isFinite(nx)) u.x = nx;
    if (Number.isFinite(ny)) u.y = ny;

    return dist <= step;
  }

  function _tickTask(u, dt) {
    const t = u.task;
    if (!t) return;

    // Phase 1: Zum HQ / Quelle laufen
    if (t.phase === 'go_source') {
      if (_moveTowards(u, t.source, dt)) {
        t.phase       = 'pickup';
        t.pickupTimer = 0.3;   // kurze Pause zum „Aufladen“
      }
      return;
    }

    // Phase 2: Aufnahme der Ressource
    if (t.phase === 'pickup') {
      t.pickupTimer -= dt;
      if (t.pickupTimer <= 0) {
        // res-Key aus dem Job übernehmen, z.B. 'wood' | 'stone'
        u.carrying = t.job.res || 'wood';
        t.phase    = 'go_target';
      }
      return;
    }

    // Phase 3: Zum Ziel-Gebäude laufen
    if (t.phase === 'go_target') {
      if (_moveTowards(u, t.dest, dt)) {
        t.phase = 'deliver';
      }
      return;
    }

    // Phase 4: Abliefern → Event schicken + Ladung leeren
    if (t.phase === 'deliver') {
      try {
        const x = t.dest.x;
        const y = t.dest.y;

        // ---------------------------------------------------------------
        // WICHTIGER FIX:
        //  → Wir senden jetzt x/y UND tx/ty,
        //    damit GameConstruction, das evtl. noch tx/ty erwartet,
        //    gültige Koordinaten findet und nicht mehr meckert:
        //    "cb:build:deliver ohne gültige Koordinaten".
        // ---------------------------------------------------------------
        window.dispatchEvent(new CustomEvent('cb:build:deliver', {
          detail: {
            // float-Mitte der Baustelle
            x    : x,
            y    : y,
            // kompatible Tile-Koordinaten (ganzzahlig)
            tx   : x,
            ty   : y,
            // geladene Ressource
            res  : u.carrying,
            // für Debug/Tracking
            job  : t.job || null,
            jobId: t.job?.id,
            carrierId: u.id
          }
        }));
      } catch (e) {
        WARN('cb:build:deliver dispatch fehlgeschlagen', e);
      }

      // Job/Carry zurücksetzen
      u.carrying = null;
      u.task     = null; // Job erledigt → Carrier wieder idle
      return;
    }
  }

  function _tickIdle(u, dt) {
    if (!_hqPos) return; // kein HQ → nicht herumwandern

    if (!u.target) {
      u.target = _randomTargetNearHQ();
    }
    if (_moveTowards(u, u.target, dt)) {
      u.target = _randomTargetNearHQ();
    }
  }

  function tick(dt) {
    if (!dt || !Number.isFinite(dt)) dt = 1 / 60;

    for (const u of _units) {
      if (u.type !== 'carrier') continue;

      // Wenn kein Task → versuchen, Job aus Engine zu ziehen
      if (!u.task) {
        _assignJobIfNeeded(u);
      }

      if (u.task) {
        _tickTask(u, dt);
      } else {
        _tickIdle(u, dt);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  function init(game) {
    _ensureGameBinding(game);
    LOG('GameUnits.init aufgerufen');
  }

  function getUnits() {
    return _units;
  }

  // Globale API
  window.GameUnits = {
    init,
    tick,
    getUnits,
    setHQPos,
    spawnInitialCarriers
  };

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

})();
