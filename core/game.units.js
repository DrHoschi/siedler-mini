/* ============================================================================
 * Datei   : core/game.units.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.30-simple-carriers
 *
 * Zweck   : Einfache Träger-Verwaltung
 *           - merkt sich HQ-Position (in Tile-Koordinaten)
 *           - spawnt beim HQ-Finish ein paar Träger
 *           - lässt sie in der Nähe vom HQ herumlaufen
 *           - stellt Daten für unit-overlay.js bereit
 *
 * WICHTIG:
 *   - Unabhängig von JobEngine / Production.
 *   - Nutzt Events:
 *       cb:game:start   → an Game binden
 *       cb:build:place  → HQ erkennen (b.hq) und Träger spawnen
 * ========================================================================== */
(function () {
  'use strict';

  const TAG  = '[units]';
  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // --- interner Zustand -----------------------------------------------------

  /** Liste aller Einheiten (nur Träger) */
  const _units = [];

  /** HQ-Position in Tile-Koordinaten { tx, ty } */
  let _hqPos = null;

  /** Referenz auf das Game-Objekt (Canvas, tileSize, Kamera etc.) */
  let _game = null;

  /** Flag, ob wir schon initiale Träger gespawnt haben */
  let _initialSpawnDone = false;

  // --- Hilfsfunktionen ------------------------------------------------------

  /** Sichere Game-Bindung – nur einmal ausführen */
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

  /** Hilfsfunktion: zufällige Zahl in [min,max] */
  function _rand(min, max) {
    return min + Math.random() * (max - min);
  }

  // --- HQ / Spawn-Logik -----------------------------------------------------

  /**
   * HQ-Position setzen (Tile-Koordinaten).
   */
  function setHQPos(pos) {
    if (!pos || typeof pos.tx !== 'number' || typeof pos.ty !== 'number') {
      WARN('setHQPos: ungültige Position', pos);
      return;
    }
    _hqPos = { tx: pos.tx, ty: pos.ty };
    LOG('HQPos gesetzt', _hqPos);
  }

  /**
   * Ein Träger-Objekt an einer Tile-Position erzeugen.
   * Wir speichern x/y als "Tile-Position mit Offset", damit Bewegung weich ist.
   */
  function _spawnCarrierAt(tx, ty) {
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
      WARN('spawnCarrier: ungültige Koordinaten', tx, ty);
      return;
    }
    const unit = {
      id  : _units.length + 1,
      type: 'carrier',
      // Position (Tile-Koordinaten, dürfen Kommawerte haben)
      x   : tx,
      y   : ty,
      // kleines Zufalls-Offset-Ziel um das HQ herum
      target: null,
      speed : 1.5,   // Tiles pro Sekunde
      carrying: null,
      task    : null
    };
    _units.push(unit);
    LOG('Carrier gespawnt', unit);
  }

  /**
   * Initial mehrere Träger um das HQ spawnen (z. B. 3 Stück).
   */
  function spawnInitialCarriers(count = 3) {
    if (!_hqPos) {
      WARN('spawnInitialCarriers: HQPos noch nicht gesetzt');
      return;
    }
    if (_initialSpawnDone) {
      LOG('spawnInitialCarriers: schon erledigt, überspringe');
      return;
    }
    _initialSpawnDone = true;

    const baseX = _hqPos.tx;
    const baseY = _hqPos.ty;

    // kleine Offsets um das HQ herum (damit sie nicht übereinander liegen)
    const OFFSETS = [
      { dx: -0.6, dy:  0.0 },
      { dx:  0.6, dy:  0.0 },
      { dx:  0.0, dy:  0.6 },
      { dx: -0.6, dy: -0.4 },
      { dx:  0.6, dy: -0.4 }
    ];

    for (let i = 0; i < count; i++) {
      const o = OFFSETS[i % OFFSETS.length];
      _spawnCarrierAt(baseX + o.dx, baseY + o.dy);
    }

    LOG('Initiale Carrier gespawnt', { count, hqPos: _hqPos });
  }

  /** Öffentliche Abfrage der HQ-Position */
  function getHQPos() {
    return _hqPos;
  }

  /** Öffentliche Abfrage der Units-Liste */
  function getUnits() {
    return _units;
  }

  // --- Mini-Job-Interface (für später / CarrierRuntime) ---------------------

  /**
   * Gibt true zurück, wenn mindestens ein Carrier gerade keinen Job hat.
   * (Im Moment immer false, bis wir richtige Jobs haben.)
   */
  function needsJob() {
    return false;
  }

  /**
   * Job einem Carrier zuweisen (Stub, damit CarrierRuntime nicht crasht).
   */
  function assignJob(job) {
    // Später sauber implementieren – aktuell nur Stub.
    LOG('assignJob (Stub, wird derzeit ignoriert)', job);
    return false;
  }

  // --- Bewegung / Tick ------------------------------------------------------

  /**
   * intern: gibt ein zufälliges Ziel in der Nähe des HQ zurück.
   */
  function _randomTargetNearHQ() {
    if (!_hqPos) return null;
    const r = 1.2; // Radius in Tiles
    return {
      x: _hqPos.tx + _rand(-r, r),
      y: _hqPos.ty + _rand(-r, r)
    };
  }

  /**
   * Eine Unit in Richtung ihres Ziels bewegen.
   */
  function _moveUnit(u, dt) {
    if (!u) return;
    if (!u.target) {
      u.target = _randomTargetNearHQ();
      if (!u.target) return;
    }

    const dx = u.target.x - u.x;
    const dy = u.target.y - u.y;
    const dist = Math.hypot(dx, dy);
    if (!Number.isFinite(dist) || dist <= 0) {
      u.target = _randomTargetNearHQ();
      return;
    }

    const step = u.speed * dt; // Tiles pro Sekunde
    if (dist < step) {
      // Ziel erreicht → neues zufälliges Ziel wählen
      u.x = u.target.x;
      u.y = u.target.y;
      u.target = _randomTargetNearHQ();
      return;
    }

    const nx = dx / dist;
    const ny = dy / dist;
    u.x += nx * step;
    u.y += ny * step;
  }

  /**
   * Tick-Funktion, wird von game.js / carrier.runtime.js pro Frame aufgerufen.
   * dt = Sekunden seit letztem Frame.
   */
  function tick(dt) {
    if (!Number.isFinite(dt) || dt <= 0) dt = 1 / 60;

    for (const u of _units) {
      if (u.type !== 'carrier') continue;
      _moveUnit(u, dt);
    }
  }

  // --- Event-Hooks ----------------------------------------------------------

  // Beim Spielstart an Game binden (damit Game.units = _units gesetzt wird)
  try {
    window.addEventListener('cb:game:start', (ev) => {
      const game = ev?.detail?.game ?? window.Game ?? null;
      if (game) {
        _ensureGameBinding(game);
      }
    });
  } catch (err) {
    WARN('cb:game:start-Listener konnte nicht registriert werden', err);
  }

  // HQ-Spawn: wir hören direkt auf cb:build:place → b.hq
  try {
    window.addEventListener('cb:build:place', (ev) => {
      const d = ev?.detail || {};
      const id = d.buildingId || d.id || '';
      if (id !== 'b.hq') return;

      // Tiles aus dem Event holen (siehe core/core.input-v1.js → placeAt)
      const w = Number.isFinite(d.w) ? d.w : 3;
      const h = Number.isFinite(d.h) ? d.h : 3;
      const tx = (d.x ?? d.tx ?? 0) + w / 2;
      const ty = (d.y ?? d.ty ?? 0) + h / 2;

      LOG('HQ-Placement erkannt (cb:build:place)', { tx, ty, w, h });

      setHQPos({ tx, ty });
      spawnInitialCarriers(3);
    });
  } catch (err) {
    WARN('cb:build:place-Listener konnte nicht registriert werden', err);
  }

  // --- Export nach global ---------------------------------------------------
  window.GameUnits = {
    // API für andere Module
    setHQPos,
    getHQPos,
    spawnInitialCarriers,
    getUnits,
    needsJob,
    assignJob,
    tick
  };

  LOG('Modul geladen v25.11.30-simple-carriers');
})();
