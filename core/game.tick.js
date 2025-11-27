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
    // 1) Job-Engine (Jobs generieren / prüfen)
    if (window.JobEngine?.tick){
      JobEngine.tick();
    }

    // 2) Carrier-Laufzeit (Bewegung, Pfade, Lade/Entlade-Logik)
    if (window.CarrierRuntime?.tick){
      CarrierRuntime.tick();
    }

    // 3) Einheiten-Update (Positionsinterpolation, Animationen)
    if (window.GameUnits?.tick){
      GameUnits.tick();
    }

    // 4) Produktionsgebäude (Outputs erzeugen)
    if (window.Production?.tick){
      Production.tick();
    }

    // Debug / optional
    // (window.CBLog?.info || console.log)("[tick] done");

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
