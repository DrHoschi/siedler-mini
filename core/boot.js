/* ============================================================================
 * core/boot.js — GameBoot
 * Version: v17.9.0 (2025-09-23)
 * Struktur: Imports → Konstanten → Helpers → Klassen → Hauptlogik → Exports
 * ============================================================================ */

// == Imports (global via <script>, keine ES-Module) ===========================
// erwartet: core/asset.js, core/registry.js, core/game.js sind bereits geladen

// == Konstanten ===============================================================
const MOD = "[boot]";

// == Helpers ==================================================================
function getCanvasMapUrl(){
  const el = document.querySelector('#game');
  return el?.dataset?.map || "data/maps/map-mini.json"; // Fallback auf Standard
}

// == Hauptlogik ===============================================================
window.addEventListener('cb:ui-ready', async ()=>{
  CBLog?.info?.(`${MOD} UI bereit → lade Assets/Registry`);
  try{
    // 1) Assets & Registry initialisieren (vereinfachte Pipeline)
    await Assets?.init?.();                  // lädt Sprites/Atlanten (noop wenn nicht nötig)
    await Registry?.initFromData?.();        // lädt data/buildings.json etc.

    // 2) Game initialisieren + Map starten
    Game?.init?.();
    const mapUrl = getCanvasMapUrl();        // <canvas data-map="...">
    CBLog?.info?.(`${MOD} starte Map: ${mapUrl}`);
    await Game?.start?.(mapUrl);

    // 3) Erfolgssignal → UI kann umschalten
    window.dispatchEvent(new CustomEvent('cb:game-start', {detail:{mapUrl}}));
  }catch(err){
    console.error(MOD, "Fehler beim Start:", err);
    window.dispatchEvent(new CustomEvent('cb:boot-error', {detail:{err}}));
  }
});

// Safety: falls jemand direkt "Neues Spiel" klickt, löst ui-start.js cb:ui-ready aus.
// Keine Dummy-IDs wie "map_ch1" mehr – wir nutzen konsequent die Canvas-URL.
