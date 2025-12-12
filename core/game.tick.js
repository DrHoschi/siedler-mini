/* ============================================================================
 * Datei   : core/game.tick.js
 * Projekt : Neue Siedler
 * Version : v25.11.25
 * Zweck   : Globaler Spiel-Tick – steuert Carrier, Jobs, Produktion, Einheiten
 * Struktur: IMPORTS → Konstanten → Funktionen → Hauptlogik → Export
 * ============================================================================
 */

// ============================
// KONSTANTEN
// ============================
const TICK_MS = 200;     // 5 Ticks pro Sekunde → smooth + performant
let __tickHandle = null;

// ============================
// FUNKTION: SINGLE TICK
// ============================
function runTick(){
  try {
    // dt wie früher im RAF: Sekunden
    const dt = TICK_MS / 1000;

    // 1) Job-Engine (Jobs generieren / prüfen)
    if (window.JobEngine?.tick){
      JobEngine.tick(dt); // dt ist optional – wenn JobEngine es ignoriert, egal
    }

    // 2) Carrier-Laufzeit (Jobs zuweisen + step events)
    if (window.CarrierRuntime?.tick){
      CarrierRuntime.tick(dt);
    }

    // 3) Einheiten-Update (Positionsinterpolation, Job-Abarbeitung)
    if (window.GameUnits?.tick){
      GameUnits.tick(dt);
    }

    // 4) BAUSTELLEN / Bauphasen (Baustelle 0 → 1 → 2 → fertig)
    //    DAS war jetzt "platt", weil es nach dem Entfernen aus game.js nirgendwo mehr tickte.
    if (window.GameConstruction?.tick){
      GameConstruction.tick(dt);
    }

    // 5) Produktion (Module erzeugen Outputs)
    //    Production.tick erwartet bei dir typischerweise ms oder ist tolerant – wir geben ms.
    if (window.Production?.tick){
      Production.tick(TICK_MS);
    }

  } catch(err){
    console.error("[tick] Fehler im Tick:", err);
  }
}

// ============================
// FUNKTION: TICK STARTEN
// ============================
function startTickLoop(){
  if (__tickHandle) return;     // Doppelt vermeiden

  __tickHandle = setInterval(runTick, TICK_MS);

  (window.CBLog?.ok || console.log)(
    "⏱️ [tick] Loop gestartet ("+TICK_MS+"ms)"
  );
}

// ============================
// EVENT-HOOK: cb:game:start
// ============================
window.addEventListener("cb:game:start", ()=>{
  startTickLoop();
});

// ============================
// EXPORT
// ============================
window.GameTick = {
  start: startTickLoop,
  step: runTick
};
