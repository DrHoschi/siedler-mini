/* ============================================================================
 * game.js (UI-Facade) – v16.1.14
 *
 * Zweck:
 * - Start/NeuStart/Cache-Buttons verdrahten (Startpanel unverändert)
 * - Robust auf GameLoader.start warten (kein 5s-Timeout mehr)
 * - Bei Erfolg Events feuern:
 *     window.dispatchEvent(new CustomEvent('cb:game-started'));
 *     window.GameUI?.onGameStarted?.();
 * - Bau-Menü-Button erst nach Spielstart anzeigen; Inspector-Button immer
 * - Alle Logs in Konsole + Inspector (falls geladen)
 *
 * WICHTIG: Wir ersetzen NICHT deine Engine. Wir „umwickeln“ nur.
 * ==========================================================================*/
(() => {
  const UI_VERSION = "v16.1.14";

  // --- Log Helper: Konsole + Inspector ------------------------------------
  function logOK(msg){  console.log(`✅ (ok) ${msg}`);  window?.Inspector?.logOk?.(msg); }
  function logWarn(msg){console.warn(`⚠️ (warn) ${msg}`); window?.Inspector?.logWarn?.(msg); }
  function logErr(msg){ console.error(`❌ (err) ${msg}`); window?.Inspector?.logErr?.(msg); }

  // --- DOM ---------------------------------------------------------------
  const $start       = document.getElementById("startPanel");
  const $map         = document.getElementById("mapSelect");
  const $btnStart    = document.getElementById("btnStart");
  const $btnRestart  = document.getElementById("btnRestart");
  const $btnCache    = document.getElementById("btnCache");
  const $btnLogCopy  = document.getElementById("btnLogCopy");
  const $btnInspector= document.getElementById("btnInspector");
  const $btnBuild    = document.getElementById("btnBuild");

  // --- Öffentliche UI-API (für Bau-UI etc.) ------------------------------
  window.GameUI = window.GameUI || {};

  // Wird nach Spielstart automatisch aufgerufen (Hook unten)
  window.GameUI.onGameStarted = function(){
    try {
      $start?.classList.add("hidden");          // Startpanel weg
      if ($btnBuild) $btnBuild.style.display = "grid"; // Bau-Button an
      logOK(`Game gestartet (GameUI.onGameStarted) – UI ${UI_VERSION}`);
    } catch(e){ logWarn("onGameStarted: " + (e?.message||e)); }
  };

  // Inspector-Toggle (UI)
  $btnInspector?.addEventListener("click", () => {
    try { window?.Inspector?.toggle?.(); }
    catch(e){ logWarn("Inspector ist (noch) nicht eingebunden – window.Inspector.toggle() fehlt."); }
  });

  // Bau-Menü öffnen
  $btnBuild?.addEventListener("click", () => {
    try { window?.GameUI?.openBuildMenu?.(); }
    catch(e){ logWarn("Bau-Menü ist (noch) nicht eingebunden – window.GameUI.openBuildMenu() fehlt."); }
  });

  // --- Start / Neu / Cache / Log ----------------------------------------
  $btnStart?.addEventListener("click", async () => {
    const mapPath = $map?.value || "./assets/maps/map-mini.json";
    logOK(`Start gedrückt → ${mapPath}`);

    try {
      // Falls Hook noch nicht aktiv ist, weisen wir darauf hin
      if (!window.GameLoader?.start) {
        logWarn("Engine noch nicht bereit – warte auf GameLoader.start …");
      }
      await waitForGameLoaderStart();           // hier blockierend warten
      await window.GameLoader.start(mapPath);   // ruft unseren Wrapper (Hook)
      // Der Wrapper feuert Events & Logs. (siehe unten)
    } catch (e) {
      logErr("Start fehlgeschlagen: " + (e?.message || e));
    }
  });

  $btnRestart?.addEventListener("click", () => {
    try {
      window?.GameLoader?.reset?.();
      logOK("Neu-Start angefordert");
      $start?.classList.remove("hidden");
      $btnBuild && ($btnBuild.style.display = "none");
    } catch(e){
      logWarn("Neu-Start: Engine-Reset nicht verfügbar.");
      $start?.classList.remove("hidden");
      $btnBuild && ($btnBuild.style.display = "none");
    }
  });

  $btnCache?.addEventListener("click", async () => {
    try {
      localStorage.clear(); sessionStorage.clear();
      logOK("Cache/Storage geleert – Seite ggf. neu laden");
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister().catch(()=>{});
      }
    } catch(e){ logWarn("Cache leeren: " + (e?.message||e)); }
  });

  $btnLogCopy?.addEventListener("click", () => {
    try { window?.Inspector?.copyLog?.(); logOK("Log in Zwischenablage"); }
    catch(e){ logWarn("Log kopieren: Inspector ist (noch) nicht verfügbar."); }
  });

  // --- ROBUSTER HOOK AUF GameLoader.start --------------------------------
  // Idee: Wir ersetzen GameLoader.start durch einen Wrapper, sobald er existiert.
  // Warte-Strategie: endlose Polling-Schleife + optionaler MutationObserver.
  let hookApplied = false;

  function applyHookIfPossible(){
    const gl = window.GameLoader;
    if (!gl || !gl.start || hookApplied) return false;

    const originalStart = gl.start;
    gl.start = async function(mapPath){
      const t0 = performance.now();
      const p = originalStart.call(this, mapPath);

      try {
        const result = p?.then ? await p : p;
        const ms = Math.round(performance.now() - t0);

        logOK(`Game gestartet (${ms} ms)`);
        // ---- gewünschte Hooks:
        window.dispatchEvent(new CustomEvent('cb:game-started'));
        window.GameUI?.onGameStarted?.();
        return result;
      } catch (e) {
        logErr("Start fehlgeschlagen: " + (e?.message||e));
        throw e;
      }
    };

    gl.__uiPatched = true;
    hookApplied = true;
    logOK("GameLoader.start Hook aktiv");
    return true;
  }

  async function waitForGameLoaderStart(){
    // 1) Versuch: ggf. sofort hooken
    if (applyHookIfPossible()) return;

    // 2) MutationObserver auf window.GameLoader via Polling
    // (Es gibt keinen direkten Observer für window; darum Poll)
    const start = performance.now();
    while (!hookApplied) {
      if (applyHookIfPossible()) break;
      await new Promise(r => setTimeout(r, 60));
      // Sicherheits-Log alle ~2 Sekunden
      if ((performance.now() - start) > 2000 && Math.round((performance.now()-start)%2000) < 80) {
        window?.Inspector?.logWarn?.("Engine noch nicht bereit – warte auf GameLoader.start …");
      }
    }
  }

  // Erstinitialisierung: versuchen, sofort zu hooken (falls Engine schon da)
  applyHookIfPossible();

  // UI initialisiert
  logOK(`UI bereit (index ${UI_VERSION})`);
})();
