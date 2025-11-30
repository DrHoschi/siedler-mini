/* ============================================================================
 * Datei    : core/game.units.js
 * Projekt  : Neue Siedler – Epoche 1
 * Version  : v25.11.30-final-2 (HQ-Fallback + flexibles setHQPos)
 * Zweck    : Zentrale Verwaltung aller Einheiten (aktuell nur Träger/Carrier)
 *            – speichert Einheitenliste
 *            – kennt HQ-Position in TILES
 *            – stellt API für JobEngine + CarrierRuntime bereit
 *
 * Öffentliche API (global):
 *   window.GameUnits = {
 *     attachToGame(game),
 *     setHQPos(posOrTx, ty?),   // flexibel: {tx,ty} ODER (tx, ty)
 *     getHQPos(),
 *     spawnInitialCarriers(count),
 *     getUnits(),
 *     needsJob(),
 *     assignJob(job),           // von JobEngine/CarrierRuntime verwendet
 *     tick(dt)                  // von CarrierRuntime aufgerufen
 *   }
 *
 * Außerdem:
 *   – Game.__units und window.__units werden mit dem gleichen Array verknüpft
 *   – optional: Game.getUnits() → Array zurück
 *   – Fallback: Wenn keine JobEngine aktiv ist, werden beim ersten HQ
 *     automatisch Träger gespawnt (Listener auf cb:construction:complete /
 *     cb:build:complete).
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[units]';
  const LOG  = (...a)=> (window.CBLog?.info ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  /** interne Zustände *********************************************************/

  /** @type {Array<{id:number, type:string, x:number, y:number, task?:object}>} */
  const _units = [];
  let _nextId  = 1;

  /** HQ-Position in TILE-Koordinaten (tx,ty = Mittelpunkt) */
  let _hqPos = null;

  /** Referenz auf Game (wenn vorhanden) */
  let _gameRef = null;

  /** Hilfsfunktionen **********************************************************/

  function _ensureGameBinding(game) {
    if (!game || _gameRef === game) return;
    _gameRef = game;

    try {
      // Units-Array an Game und als Fallback an window hängen
      game.__units = _units;
      if (typeof game.getUnits !== 'function') {
        game.getUnits = () => _units;
      }
      if (!Array.isArray(window.__units)) {
        window.__units = _units;
      }
      LOG('Units.init abgeschlossen – Units an Game gebunden');
    } catch (err) {
      WARN('Fehler beim Binden an Game', err);
    }
  }

  /** Kleinere Helper für Nummern-Konvertierung (für Fallback) */
  function _num(value, fallback) {
    const v = (value !== undefined && value !== null) ? value : fallback;
    const n = (typeof v === 'string') ? parseFloat(v) : v;
    return Number.isFinite(n) ? n : NaN;
  }

  /** neuen Carrier an einer Tile-Position anlegen (TILE-Koordinaten) */
  function _spawnCarrierAt(tx, ty) {
    const u = {
      id   : _nextId++,
      type : 'carrier',
      x    : tx,   // Tile-Koordinaten (werden vom Overlay in Pixel umgerechnet)
      y    : ty,
      task : null
    };
    _units.push(u);
    LOG('Carrier gespawnt', { id: u.id, x: u.x, y: u.y });
    return u;
  }

  /** Öffentliche API **********************************************************/

  /**
   * HQ-Position setzen (in TILE-Koordinaten).
   *
   * Flexibel:
   *   – setHQPos({ tx, ty })
   *   – setHQPos(tx, ty)
   *
   * Wird i. d. R. von JobEngine.handleBuildComplete(b.hq) aufgerufen
   * oder vom Fallback-Listener in diesem Modul.
   */
  function setHQPos(posOrTx, maybeTy) {
    let tx, ty;

    if (typeof posOrTx === 'object' && posOrTx !== null) {
      // Aufruf: setHQPos({tx,ty})
      tx = posOrTx.tx;
      ty = posOrTx.ty;
    } else if (typeof posOrTx === 'number' && typeof maybeTy === 'number') {
      // Aufruf: setHQPos(tx, ty)
      tx = posOrTx;
      ty = maybeTy;
    } else {
      WARN('setHQPos: ungültige Parameter übergeben', posOrTx, maybeTy);
      return null;
    }

    if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
      WARN('setHQPos: ungültige Position (tx/ty nicht numerisch)', { tx, ty });
      return null;
    }

    _hqPos = { tx, ty };
    LOG('HQPos gesetzt', _hqPos);
    return _hqPos;
  }

  /** HQ-Position abfragen (kann null sein, wenn HQ noch nicht fertig) */
  function getHQPos() {
    return _hqPos;
  }

  /**
   * Initial mehrere Träger rund um das HQ spawnen.
   * count = gewünschte Anzahl (Standard: 3)
   */
  function spawnInitialCarriers(count = 3) {
    if (!_hqPos) {
      WARN('spawnInitialCarriers: noch kein HQPos gesetzt');
      return;
    }

    const baseX = _hqPos.tx;
    const baseY = _hqPos.ty;

    // kleine Offsets, damit sie nicht genau übereinander stehen
    const OFFSETS = [
      { dx: -0.4, dy:  0.0 },
      { dx:  0.4, dy:  0.0 },
      { dx:  0.0, dy:  0.4 },
      { dx: -0.4, dy: -0.4 },
      { dx:  0.4, dy: -0.4 },
    ];

    for (let i = 0; i < count; i++) {
      const o = OFFSETS[i % OFFSETS.length];
      _spawnCarrierAt(baseX + o.dx, baseY + o.dy);
    }

    LOG('Initiale Carrier gespawnt', { count, hqPos: _hqPos });
  }

  /** liefert das interne Units-Array zurück */
  function getUnits() {
    return _units;
  }

  /** Gibt true zurück, wenn mindestens ein Carrier keinen Job hat */
  function needsJob() {
    return _units.some(u => u.type === 'carrier' && !u.task);
  }

  /**
   * Ein Job wird einem freien Carrier zugewiesen.
   * Erwartet ein Job-Objekt (von JobEngine.pop()).
   */
  function assignJob(job) {
    if (!job) return false;
    const carrier = _units.find(u => u.type === 'carrier' && !u.task);
    if (!carrier) return false;

    carrier.task = {
      id    : job.id ?? ('job-' + Date.now()),
      type  : job.type ?? 'generic',
      from  : job.from ?? null,
      to    : job.to ?? null,
      res   : job.res ?? null,
      phase : 'toSource'  // einfache Zweiphasen-Logik: zur Quelle → zum Ziel
    };

    LOG('Job zugewiesen', { unitId: carrier.id, job: carrier.task });
    return true;
  }

  /**
   * Einfache Bewegungs-Logik:
   *  – Positionen werden in TILE-Koordinaten interpretiert.
   *  – pro Tick wird ein kleines Stück in Richtung Ziel gelaufen.
   *  – reicht fürs erste, damit "etwas passiert" und Overlay die Bewegung zeigt.
   */
  function _moveUnitTowards(u, target, dt) {
    if (!target) return;
    const SPEED_TILES_PER_SEC = 1.5; // Carrier-Geschwindigkeit (Tiles/Sek)
    const step = SPEED_TILES_PER_SEC * (dt / 1000);

    const dx = target.x - u.x;
    const dy = target.y - u.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.01) {
      // Ziel erreicht
      u.x = target.x;
      u.y = target.y;
      return true;
    }

    const nx = dx / dist;
    const ny = dy / dist;
    u.x += nx * step;
    u.y += ny * step;
    return false;
  }

  /** Tick-Loop: wird von CarrierRuntime aufgerufen (siehe carrier.runtime.js) */
  function tick(dt) {
    for (const u of _units) {
      if (u.type !== 'carrier' || !u.task) continue;

      const ts = u.task;
      let target = null;

      if (ts.phase === 'toSource' && ts.from) {
        target = { x: ts.from.tx, y: ts.from.ty };
      } else if (ts.phase === 'toTarget' && ts.to) {
        target = { x: ts.to.tx, y: ts.to.ty };
      }

      if (!target) continue;

      const arrived = _moveUnitTowards(u, target, dt);
      if (arrived) {
        if (ts.phase === 'toSource') {
          // Ressource aufnehmen (nur Marker, Logik kann später verfeinert werden)
          if (ts.res) {
            u.carrying = { res: ts.res };
          }
          ts.phase = 'toTarget';
        } else if (ts.phase === 'toTarget') {
          // Job fertig
          LOG('Job abgeschlossen', { unitId: u.id, jobId: ts.id });
          u.task = null;
          u.carrying = null;
        }
      }
    }
  }

  /**
   * Wird bei cb:game:start oder explizit aus game.js aufgerufen,
   * um Units an das Game-Objekt zu binden.
   */
  function attachToGame(game) {
    _ensureGameBinding(game);
  }

  /** Fallback-Logik für HQ-fertig → Träger spawnen ***************************
   *
   * Hintergrund:
   *  – Normalerweise übernimmt JobEngine.handleBuildComplete(b.hq) diese
   *    Aufgabe (HQPos setzen + spawnInitialCarriers).
   *  – In deinem aktuellen Log taucht job.engine aber gar nicht auf.
   *  – Damit du trotzdem Träger siehst, hängen wir uns hier direkt an die
   *    Bau-Events und machen EINMAL einen Fallback:
   *      → wenn b.hq fertig ODER wir ein HQ im Game finden
   *      → und noch KEINE Carrier existieren
   *      → dann HQPos bestimmen + 3 Carrier spawnen.
   */

  function _tryFallbackHQSpawn(reason, eventDetail) {
    // Wenn bereits HQPos und mindestens ein Carrier existiert → nichts tun
    if (_hqPos && _units.some(u => u.type === 'carrier')) {
      LOG('Fallback-HQ: bereits Carrier vorhanden – nichts zu tun', { reason });
      return;
    }

    // 1) Versuchen, Building direkt aus Event zu nehmen
    let hqBuilding = null;
    const d = eventDetail || {};

    if (d.id === 'b.hq' || d.type === 'b.hq') {
      hqBuilding = d.building || d;
    }

    // 2) Wenn das nicht klappt → in Game.buildings suchen
    const game = _gameRef || window.Game || null;
    if (!hqBuilding && game && Array.isArray(game.buildings)) {
      hqBuilding = game.buildings.find(
        b => b && (b.id === 'b.hq' || b.type === 'b.hq')
      ) || null;
    }

    if (!hqBuilding) {
      WARN('Fallback-HQ: kein HQ-Building gefunden', { reason, d });
      return;
    }

    // Position bestimmen: bevorzugt cx/cy, sonst tx/ty, sonst x/y
    const tx = _num(hqBuilding.cx, _num(hqBuilding.tx, hqBuilding.x));
    const ty = _num(hqBuilding.cy, _num(hqBuilding.ty, hqBuilding.y));
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
      WARN('Fallback-HQ: ungültige HQ-Position', { reason, hqBuilding });
      return;
    }

    const pos = setHQPos(tx, ty);
    if (!pos) {
      WARN('Fallback-HQ: setHQPos fehlgeschlagen', { reason });
      return;
    }

    // Nur spawnen, wenn noch keine Carrier existieren (sonst doppelt)
    const hadCarrier = _units.some(u => u.type === 'carrier');
    if (!hadCarrier) {
      spawnInitialCarriers(3);
      LOG('Fallback-HQ: Träger gespawnt', { reason, hqPos: pos });
    } else {
      LOG('Fallback-HQ: HQPos gesetzt, aber Carrier existieren schon', {
        reason, hqPos: pos
      });
    }
  }

  // Event-Hooks für Bau-Fertig-Meldungen
  try {
    // Wird typischerweise von construction.runtime.js emittiert
    window.addEventListener('cb:construction:complete', (ev) => {
      const d = ev?.detail ?? ev;
      if (!d) return;
      if (d.id === 'b.hq' || d.type === 'b.hq') {
        _tryFallbackHQSpawn('cb:construction:complete', d);
      }
    });

    // Optionaler zweiter Hook, falls irgendwo cb:build:complete verwendet wird
    window.addEventListener('cb:build:complete', (ev) => {
      const d = ev?.detail ?? ev;
      if (!d) return;
      if (d.id === 'b.hq' || d.type === 'b.hq') {
        _tryFallbackHQSpawn('cb:build:complete', d);
      }
    });
  } catch (err) {
    WARN('HQ-Fallback-Listener konnten nicht registriert werden', err);
  }

  /** Event-Hook für cb:game:start (DOM-CustomEvent) **************************/

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

  /** Export nach global ********************************************************/

  window.GameUnits = {
    attachToGame,
    setHQPos,
    getHQPos,
    spawnInitialCarriers,
    getUnits,
    needsJob,
    assignJob,
    tick
  };

  LOG('Modul geladen v25.11.30-final-2 (mit HQ-Fallback)');
})();
