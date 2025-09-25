/* ============================================================================
 * Datei: core/boot.js — GameBoot
 * Version: v18.8.0 (2025-09-25)
 * Zweck: Orchestriert den Start – UI→Assets/Registry→Game.start(map)
 * Leitplanken: Keine doppelten Start-Events; Logging via globalem CBLog
 * Struktur:
 *   (0) Logger-Guard
 *   (1) Imports (über <script>)
 *   (2) Konstanten
 *   (3) Helper
 *   (4) Startsequenz
 *   (5) Event-Wiring (cb:start:*)
 *   (6) Exports
 * ========================================================================== */

/* (0) Logger-Guard ----------------------------------------------------------- */
if (!window.CBLog || typeof window.CBLog.ok !== "function") {
  // Minimalfallback – sollte dank index nicht benötigt werden:
  window.CBLog = {
    ok:   (m)=>console.log("[OK] "   + m),
    info: (m)=>console.log("[INFO] " + m),
    warn: (m)=>console.warn("[WARN] "+ m),
    error:(m)=>console.error("[ERR] "+ m),
  };
  CBLog.info("[boot] Hinweis: globaler CBLog nicht gefunden – Fallback aktiv");
}

/* (1) Imports (global via <script>) ------------------------------------------
   Erwartet: core/asset.js, core/registry.js, core/game.js bereits geladen.   */

/* (2) Konstanten ------------------------------------------------------------- */
const BOOT_MOD  = "[boot]";
const BOOT_VER  = "v18.8.0";

/* (3) Helper ----------------------------------------------------------------- */
/** Liest die Map-URL direkt aus dem Canvas-Dataset. */
function getCanvasMapUrl() {
  const el = document.querySelector("#game");
  return el?.dataset?.map || "data/maps/map-mini.json"; // Fallback
}

/** Hilfs-Wrapper für optionale Initialisierer mit klarer Log-Ausgabe. */
async function safeInit(label, fn) {
  if (typeof fn !== "function") {
    CBLog.warn(`${BOOT_MOD} ${label} nicht verfügbar – übersprungen`);
    return false;
  }
  CBLog.info(`${BOOT_MOD} ${label}…`);
  await fn();
  CBLog.ok(`${BOOT_MOD} ${label} abgeschlossen`);
  return true;
}

/* (4) Startsequenz ----------------------------------------------------------- */
async function startSequence(trigger = "cb:start:new") {
  try {
    CBLog.info(`${BOOT_MOD} Startsequenz init (via ${trigger})`);

    // 4.1 Assets & Registry vorbereiten
    const assetsOk   = await safeInit("Assets.init", Assets?.init);
    const registryOk = await safeInit("Registry.initFromData", Registry?.initFromData);

    // (optional) Boot-eigene Marker-Events (kollisionsfrei zu Modul-Events)
    if (assetsOk)   window.dispatchEvent(new CustomEvent("cb:boot:assets-ready"));
    if (registryOk) window.dispatchEvent(new CustomEvent("cb:boot:registry-ready"));

    // 4.2 Game starten (Map aus Canvas)
    const mapUrl = getCanvasMapUrl();
    CBLog.info(`${BOOT_MOD} starte Game.start → ${mapUrl}`);
    await Game?.start?.(mapUrl);  // Game sendet cb:map:* und NACH Erfolg cb:game-start

    CBLog.ok(`${BOOT_MOD} Startsequenz abgeschlossen`);
  } catch (err) {
    CBLog.error(`${BOOT_MOD} Fehler in Startsequenz: ${err?.message || err}`);
    window.dispatchEvent(new CustomEvent("cb:boot-error", { detail: { err } }));
  }
}

/* (5) Event-Wiring (cb:start:*) --------------------------------------------- */
// UI bereit → ab hier auf Start-Buttons hören
window.addEventListener("cb:ui-ready", () => {
  CBLog.ok(`${BOOT_MOD} UI bereit – warte auf Start-Events (cb:start:*)`);
});

// Neues Spiel
window.addEventListener("cb:start:new",       () => startSequence("cb:start:new"));

// Weiterspielen
window.addEventListener("cb:start:continue",  () => startSequence("cb:start:continue"));

// Reset (Hinweis – Reload macht index)
window.addEventListener("cb:start:reset",     () => CBLog.warn(`${BOOT_MOD} Reset angefordert`));

// Fullscreen (nur Info)
window.addEventListener("cb:start:fullscreen",() => CBLog.info(`${BOOT_MOD} Fullscreen angefordert`));

/* (6) Exports ---------------------------------------------------------------- */
// keine – Boot ist eventgetrieben
CBLog.ok(`${BOOT_MOD} Modul geladen (${BOOT_VER})`);
