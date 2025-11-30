/* ============================================================================
 * Datei    : core/game.units.js
 * Projekt  : Neue Siedler – Epoche 1
 * Version  : v25.11.30-final-3 (HQ-Fallback + Placement-Merker)
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
 *   – Fallback:
 *       • cb:build:place merkt sich HQ-Platzierung (Tile-Position)
 *       • cb:construction:complete / cb:build:complete nutzt diese Position,
 *         setzt HQPos und spawnt initiale Carrier, falls noch keine da sind.
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

  /** letzte bekannte HQ-Platzierung (aus cb:build:place) */
  let _lastHQPlacement = null;

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

  /**
   * Versucht aus einem beliebigen Objekt Tile-Koordinaten (tx,ty) zu lesen.
   * – direkte Felder: tx/ty, cx/cy, x/y
   * – verschachtelte Strukturen: tile, pos, center, placement, target
   */
  function _extractTilePosFromAny(obj, depth = 0) {
    if (!obj || typeof obj !== 'object') return null;
    if (depth > 3) return null; // zur Sicherheit, keine endlosen Rekursionen

    // 1) direkte Felder
    {
      const tx = _num(obj.tx, NaN);
      const ty = _num(obj.ty, NaN);
      if (Number.isFinite(tx) && Number.isFinite(ty)) {
        return { tx, ty };
      }
    }
    {
      const cx = _num(obj.cx, NaN);
      const cy = _num(obj.cy, NaN);
      if (Number.isFinite(cx) && Number.isFinite(cy)) {
        return { tx: cx, ty: cy };
      }
    }
    {
      const x = _num(obj.x, NaN);
      const y = _num(obj.y, NaN);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        return { tx: x, ty: y };
      }
    }

    // 2) verschachtelte Kandidaten
    const nestedKeys = ['tile', 'pos', 'center', 'placement', 'target'];
    for (const k of nestedKeys) {
      if (obj[k] && typeof obj[k] === 'object') {
        const res = _extractTilePosFromAny(obj[k], depth + 1);
        if (res) return res;
      }
    }

    return null;
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
      ty = posOrTy = posOrTx.ty;
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
   *  – JobEngine ist bei dir offenbar (noch) nicht aktiv.
   *  – Deshalb hängen wir uns direkt an:
   *        cb:build:place       → Position merken
   *        cb:construction:complete / cb:build:complete
   *                            → HQ erkennen, HQPos setzen, Carrier spawnen
   */

  function _tryFallbackHQSpawn(reason, eventDetail) {
    // Wenn bereits HQPos und mindestens ein Carrier existiert → nichts tun
    if (_hqPos && _units.some(u => u.type === 'carrier')) {
      LOG('Fallback-HQ: bereits Carrier vorhanden – nichts zu tun', { reason });
      return;
    }

    const d = eventDetail || {};
    let hqBuilding = null;

    // 1) Direkt aus Event, falls da mehr als nur id drin ist
    if (d.id === 'b.hq' || d.type === 'b.hq') {
      hqBuilding = d.building || d;
    }

    // 2) Falls im Game noch Infos hängen
    const game = _gameRef || window.Game || null;
    if (!hqBuilding && game && Array.isArray(game.buildings)) {
      hqBuilding = game.buildings.find(
        b => b && (b.id === 'b.hq' || b.type === 'b.hq')
      ) || null;
    }

    // 3) Tile-Position aus Building ODER aus gemerkter HQ-Platzierung holen
    let pos =
      (hqBuilding && _extractTilePosFromAny(hqBuilding)) ||
      _lastHQPlacement;

    if (!pos) {
      WARN('Fallback-HQ: keine verwertbare HQ-Position', {
        reason,
        hqBuilding: hqBuilding ? { id: hqBuilding.id } : null,
        lastPlacement: _lastHQPlacement
      });
      return;
    }

    const tx = _num(pos.tx, NaN);
    const ty = _num(pos.ty, NaN);
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
      WARN('Fallback-HQ: ungültige HQ-Position', {
        reason,
        pos,
        hqBuilding: hqBuilding ? { id: hqBuilding.id } : null
      });
      return;
    }

    const setPos = setHQPos(tx, ty);
    if (!setPos) {
      WARN('Fallback-HQ: setHQPos fehlgeschlagen', { reason, tx, ty });
      return;
    }

    // Nur spawnen, wenn noch keine Carrier existieren (sonst doppelt)
    const hadCarrier = _units.some(u => u.type === 'carrier');
    if (!hadCarrier) {
      spawnInitialCarriers(3);
      LOG('Fallback-HQ: Träger gespawnt', { reason, hqPos: setPos });
    } else {
      LOG('Fallback-HQ: HQPos gesetzt, aber Carrier existieren schon', {
        reason,
        hqPos: setPos
      });
    }
  }

  // Event-Hooks: HQ-Platzierung merken + HQ-Fertig erkennen
  try {
    // 1) HQ-Platzierung merken
    window.addEventListener('cb:build:place', (ev) => {
      const d = ev?.detail ?? ev;
      if (!d) return;

      if (d.id === 'b.hq' || d.type === 'b.hq') {
        const pos = _extractTilePosFromAny(d);
        if (pos) {
          _lastHQPlacement = pos;
          LOG('HQ-Placement gemerkt', { pos });
        } else {
          WARN('HQ-Placement ohne erkennbare Tile-Pos', d);
        }
      }
    });

    // 2) Gebäude fertig – Fallback-HQ aktivieren
    window.addEventListener('cb:construction:complete', (ev) => {
      const d = ev?.detail ?? ev;
      if (!d) return;
      if (d.id === 'b.hq' || d.type === 'b.hq') {
        _tryFallbackHQSpawn('cb:construction:complete', d);
      }
    });

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

  LOG('Modul geladen v25.11.30-final-3 (mit HQ-Fallback + Placement-Merker)');
})();
