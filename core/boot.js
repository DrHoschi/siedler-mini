/* ============================================================================
 * Datei: core/boot.js — GameBoot
 * Version: v19.0.0 (2025-09-27)
 * Zweck: Bootstrap – orchestriert Start-Flow vom Startpanel bis cb:game-start
 * Leitplanken: cb:start:* → Assets → Registry → Game.init() → Game.start() → cb:game-start
 * ============================================================================ */
(function(){
  // (0) Logger-Guard
  if (!window.CBLog || typeof window.CBLog.ok !== "function") {
    window.CBLog = { ok:console.log, info:console.log, warn:console.warn, error:console.error };
    CBLog.info("[boot] Hinweis: globaler CBLog nicht gefunden – Fallback aktiv");
  }

  // (1) Konstanten
  const MOD = "[boot]";

  // (2) Helpers
  function getCanvasMapUrl(){
    const el = document.querySelector('#game');
    return el?.dataset?.map || "data/maps/map-mini.json";
  }
  function has(fn){ return typeof fn === "function"; }

  // (3) Kern-Sequenz
  async function startSequence(origin){
    CBLog.info(`${MOD} Startsequenz init (via ${origin})`);

    // 3.1 Assets
    try {
      CBLog.info(`${MOD} [assets] Initialisierung…`);
      await Assets?.init?.();
    } catch(e){
      CBLog.error(`${MOD} Assets init fehlgeschlagen: ${e?.message||e}`);
      return;
    }

    // 3.2 Registry
    try {
      CBLog.info(`${MOD} [registry] laden…`);
      await Registry?.initFromData?.({ spriteExists: Assets?.spriteExists });
    } catch(e){
      CBLog.error(`${MOD} Registry init fehlgeschlagen: ${e?.message||e}`);
      return;
    }

    // 3.3 Game.init()
    if (has(Game?.init)) {
      try { Game.init(); }
      catch(e){ CBLog.error(`${MOD} [game] init Fehler: ${e?.message||e}`); return; }
    } else {
      CBLog.error(`${MOD} [game] init fehlt (keine Funktion)`); 
      return;
    }

    // 3.4 Game.start(map)
    const mapUrl = getCanvasMapUrl();
    if (has(Game?.start)) {
      CBLog.info(`${MOD} [game] starte Map: ${mapUrl}`);
      try { await Game.start(mapUrl); }
      catch(e){ CBLog.error(`${MOD} [game] start Fehler: ${e?.message||e}`); return; }
    } else {
      CBLog.error(`${MOD} [game] start fehlt (keine Funktion)`); 
      return;
    }

    // 3.5 Erfolgssignal
    window.dispatchEvent(new CustomEvent("cb:game-start", { detail:{ mapUrl }}));
    CBLog.ok(`${MOD} Spielstart abgeschlossen`);
  }

  // (4) Events binden
  window.addEventListener("cb:ui-ready", ()=> {
    CBLog.ok(`${MOD} UI bereit – warte auf Start-Events (cb:start:*)`);
  });
  window.addEventListener("cb:start:new",      ()=> startSequence("cb:start:new"));
  window.addEventListener("cb:start:continue", ()=> startSequence("cb:start:continue"));

  // (5) Safety: niemals automatisch starten
})();
