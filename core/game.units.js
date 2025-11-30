/* ============================================================================
 * Datei    : core/game.units.js
 * Projekt  : Neue Siedler – Epoche 1
 * Version  : v25.11.30-final-UnitsHQ
 * Zweck    : Verwaltet alle Einheiten (vorerst nur Träger) + HQ-Position
 * Struktur : 
 *   - Interner State (Liste, HQPos, ID-Zähler)
 *   - Helper: addUnit(), spawnCarriersForHQ()
 *   - API: GameUnits.{init,getAll,addUnit,setHQPos,spawnCarriersForHQ,clear,hqPos}
 *   - Hook: Game.getUnits() → für unit.overlay.js
 *   - Hook: registriert sich auf cb:game:start (Game.on)
 * ============================================================================
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Kurz-Helper für Logging (nutzt deine globale LOG/WARN wenn vorhanden)
  // ---------------------------------------------------------------------------
  const global = window;
  const LOG  = global.LOG  ? global.LOG.bind(global,  '[units]') : console.log.bind(console, '[units]');
  const WARN = global.WARN ? global.WARN.bind(global, '[units]') : console.warn.bind(console, '[units]');

  // ---------------------------------------------------------------------------
  // Interner State
  // ---------------------------------------------------------------------------
  const state = {
    list:   [],      // alle Einheiten (Träger etc.)
    hqPos:  null,    // { tx, ty } Kachel-Position (Mitte des HQ)
    nextId: 1        // fortlaufende ID
  };

  // ---------------------------------------------------------------------------
  // interne Hilfsfunktionen
  // ---------------------------------------------------------------------------

  /**
   * Liefert eine flache Referenz auf die aktuelle Einheitenliste.
   * Wird vom unit.overlay.js genutzt (Game.getUnits → Units.getAll)
   */
  function getAll() {
    return state.list;
  }

  /**
   * Fügt eine neue Einheit hinzu (aktuell nur Träger).
   * unit: { type, x, y, tx, ty, speed, carrying, task }
   */
  function addUnit(unit) {
    const u = Object.assign(
      {
        id:       state.nextId++,
        type:     'carrier',
        x:        0,
        y:        0,
        tx:       0,
        ty:       0,
        speed:    2.0,
        carrying: null,
        task:     null
      },
      unit || {}
    );

    state.list.push(u);
    LOG('Unit hinzugefügt', u);
    return u;
  }

  /**
   * Merkt sich die HQ-Kachelposition.
   * Erwartet Kachel-Koordinaten (tx, ty – z. B. HQ-Mitte).
   */
  function setHQPos(tx, ty) {
    if (typeof tx !== 'number' || typeof ty !== 'number' || isNaN(tx) || isNaN(ty)) {
      WARN('setHQPos: ungültige Position', tx, ty);
      return;
    }
    state.hqPos = { tx, ty };
    LOG('HQPos gesetzt', state.hqPos);
  }

  /**
   * Spawnt eine bestimmte Anzahl Träger unmittelbar um das HQ herum.
   * Nur optische Platzierung – Job-/Pfad-Logik macht später CarrierRuntime.
   */
  function spawnCarriersForHQ(count) {
    if (!state.hqPos) {
      WARN('spawnCarriersForHQ: keine HQPos gesetzt – breche ab');
      return;
    }

    const n = (count | 0) > 0 ? (count | 0) : 0;
    if (!n) {
      LOG('spawnCarriersForHQ: count = 0 → nichts zu tun');
      return;
    }

    const base = state.hqPos;

    // Kleine Offsets rund um die HQ-Mitte, damit man 3 Träger sieht
    const slots = [
      { dx: -0.6, dy:  0.0 },
      { dx:  0.6, dy:  0.0 },
      { dx:  0.0, dy:  0.6 },
      { dx:  0.0, dy: -0.6 }
    ];

    for (let i = 0; i < n; i++) {
      const slot = slots[i % slots.length];
      addUnit({
        type: 'carrier',
        x:    base.tx + slot.dx,
        y:    base.ty + slot.dy,
        tx:   base.tx + slot.dx,
        ty:   base.ty + slot.dy,
        task: null,
        carrying: null
      });
    }

    LOG('spawnCarriersForHQ: Carrier gespawnt', { count: n, hqPos: state.hqPos });
  }

  /**
   * State zurücksetzen (z. B. beim Neustart eines Spiels).
   */
  function clear() {
    state.list.length = 0;
    state.hqPos       = null;
    state.nextId      = 1;
    LOG('State geleert');
  }

  /**
   * Init-Funktion (wird bei cb:game:start aufgerufen).
   * – State leeren
   * – Game.getUnits-Hook setzen (für unit.overlay)
   */
  function init(game) {
    clear();

    const g = game || global.Game;
    if (g) {
      try {
        if (typeof g.getUnits !== 'function') {
          g.getUnits = getAll;
          LOG('Game.getUnits Hook registriert');
        }
      } catch (e) {
        WARN('Fehler beim Registrieren von Game.getUnits:', e);
      }
    }

    LOG('Units.init abgeschlossen – Units an Game gebunden');
  }

  // ---------------------------------------------------------------------------
  // Öffentliche API
  // ---------------------------------------------------------------------------
  const Units = {
    init,
    getAll,
    addUnit,
    setHQPos,
    spawnCarriersForHQ,
    clear,
    get hqPos() {
      return state.hqPos;
    }
  };

  // Global verfügbar machen
  global.GameUnits = Units;

  // ---------------------------------------------------------------------------
  // Game-Event-Hooks
  // ---------------------------------------------------------------------------
  // Bei Spielstart initialisieren
  if (global.Game && typeof global.Game.on === 'function') {
    global.Game.on('cb:game:start', function () {
      init(global.Game);
    });
    LOG('Listener auf cb:game:start registriert');
  } else {
    WARN('Game.on nicht verfügbar – Units.init muss ggf. manuell aufgerufen werden');
  }
})();
