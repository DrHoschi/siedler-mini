/* ============================================================================
 * Datei   : core/carrier.js
 * Projekt : Neue Siedler – Transport / Träger-Layer
 * Version : v25.11.27-stub
 * Zweck   : Minimal-Laufzeit für CarrierRuntime, damit units-Tick nicht crasht.
 *
 * WICHTIG:
 *  - Dieser Stand behebt nur den Fehler "Can't find variable: CarrierRuntime".
 *  - Die eigentliche Trägerbewegung / Pfade bauen wir im nächsten Schritt wieder ein.
 * ========================================================================== */

(function(){
  'use strict';

  // --------------------------------------------------------------------------
  // 1) Logging-Helfer (nutzt CBLog, fällt sonst auf console zurück)
  // --------------------------------------------------------------------------
  const MOD = 'carrier';

  const logger = (window.CBLog || {
    ok:   (...a)=>console.log(...a),
    info: (...a)=>console.info(...a),
    warn: (...a)=>console.warn(...a),
    error:(...a)=>console.error(...a),
  });

  const OK   = (...args)=> logger.ok   (`✅ [${MOD}]`, ...args);
  const INFO = (...args)=> logger.info (`ℹ️ [${MOD}]`, ...args);
  const WARN = (...args)=> logger.warn (`⚠️ [${MOD}]`, ...args);
  const ERR  = (...args)=> logger.error(`❌ [${MOD}]`, ...args);

  // --------------------------------------------------------------------------
  // 2) Konstante / Meta
  //    (Speed etc. sind hier schon vorbereitet, falls wir gleich mehr einbauen)
  // --------------------------------------------------------------------------
  const CARRIER_BASE_SPEED_TILES_PER_SEC = 0.75; // langsamer als Arbeiter
  const TILE_SIZE                        = 64;   // nur als Referenz

  // --------------------------------------------------------------------------
  // 3) Hilfsfunktionen (Vorbereitung für "echte" AI – aktuell nur Platzhalter)
  // --------------------------------------------------------------------------

  /**
   * Defensiver Zugriff auf Game-State.
   * So können wir später z. B. HQ-Position, Gebäude usw. auslesen.
   */
  function getGameState(){
    return window.Game?.__dbg?.state || null;
  }

  // --------------------------------------------------------------------------
  // 4) CarrierRuntime – MINIMALE API, damit GameUnits nicht mehr crasht
  // --------------------------------------------------------------------------
  /**
   * Wir implementieren nur genau das, was das units-Modul aktuell braucht:
   *   - Ein globales Objekt `window.CarrierRuntime`
   *   - Eine Funktion `tick(unit, dt, ctx)` – hier NO-OP.
   *
   * Das units-Modul ruft `CarrierRuntime.tick(...)` in einem try/catch auf.
   * Bisher: ReferenceError → dein Log-Spam.
   * Jetzt:  tick() existiert, macht aber (noch) nichts → kein Fehler mehr.
   */
  const CarrierRuntime = {

    /**
     * Haupt-Tick für eine Träger-Einheit.
     *
     * @param {Object} unit - Einheit aus dem units-Modul (Träger)
     * @param {number} dt   - Delta-Time in Sekunden
     * @param {Object} ctx  - Zusätzlicher Kontext (Map, Jobs, etc.)
     */
    tick(unit, dt, ctx){
      // *** STUB ***
      // Hier später:
      //  - Job-Phase abarbeiten (zum Lager, zur Baustelle, zurück zum HQ …)
      //  - Position aktualisieren
      //  - ggf. Pfad-Overlay aktualisieren
      //
      // Aktuell absichtlich NO-OP, damit nichts crasht.
      return;
    },

    /**
     * Optionaler Hook, falls das units-Modul ihn aufruft.
     * (z. B. zum Registrieren einer neuen Träger-Einheit)
     */
    onUnitCreated(unit){
      // aktuell nichts zu tun – nur vorhanden, falls jemand es aufruft
      return;
    },

    /**
     * Optionaler Hook bei Job-Änderungen – vorbereitend für spätere AI.
     */
    onJobAssigned(unit, job){
      // aktuell nichts zu tun – nur Stub
      return;
    }
  };

  // --------------------------------------------------------------------------
  // 5) Export auf window – WICHTIG für units-Modul
  // --------------------------------------------------------------------------
  window.CarrierRuntime = CarrierRuntime;

  OK('Modul geladen (v25.11.27-stub, CarrierRuntime vorhanden, tick() NO-OP)');

})();
