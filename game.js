/* ============================================================================
 * game.js (UI-Facade) – v16.1.6
 * Zweck:
 *  - Start-/NeuStart-/Cache-Buttons verdrahten
 *  - GameLoader.start abfangen -> Logs, Events auslösen:
 *       window.dispatchEvent(new CustomEvent('cb:game-started'));
 *       window.GameUI?.onGameStarted?.();
 *  - Bau-Menü-Button erst nach Spielstart anzeigen
 *  - Inspector-Button immer sichtbar (öffnet Schicht/Panel in inspector.js)
 * WICHTIG: Wir ersetzen NICHT deine bestehende Engine. Wir „umwickeln“ nur.
 * ==========================================================================*/

(() => {
  const UI_VERSION = "v16.1.6";

  // Kleines Log-Hilfswerkzeug, das sowohl Konsole als auch Inspector bedient
  function logOK(msg){ console.log(`✅ (ok) ${msg}`); window?.Inspector?.logOk?.(msg); }
  function logWarn(msg){ console.warn(`⚠️ (warn) ${msg}`); window?.Inspector?.logWarn?.(msg); }
  function logErr(msg){ console.error(`❌ (err) ${msg}`); window?.Inspector?.logErr?.(msg); }

  // Elemente
  const $start = document.getElementById("startPanel");
  const $map   = document.getElementById("mapSelect");
  const $btnStart = document.getElementById("btnStart");
  const $btnRestart = document.getElementById("btnRestart");
  const $btnCache = document.getElementById("btnCache");
  const $btnLogCopy = document.getElementById("btnLogCopy");
  const $btnInspector = document.getElementById("btnInspector");
  const $btnBuild = document.getElementById("btnBuild");

  // Public UI-API für andere Teile (z.B. ui-build.js)
  window.GameUI = window.GameUI || {};
  // Wird nach Spielstart automatisch aufgerufen (siehe Hook unten)
  window.GameUI.onGameStarted = function(){
    try {
      // Start-Panel ausblenden, Bau-Menü-Button aktivieren
      $start?.classList.add("hidden");
      if ($btnBuild) $btnBuild.style.display = "grid";
      logOK(`Game gestartet (GameUI.onGameStarted) – UI ${UI_VERSION}`);
    } catch(e){
      logWarn("onGameStarted: " + (e?.message||e));
    }
  };

  // Inspector-Toggle (UI)
  $btnInspector?.addEventListener("click", () => {
    try{
      window?.Inspector?.toggle?.(); // echte UI liegt in assets/inspector/inspector.js
    }catch(e){
      logWarn("Inspector ist (noch) nicht eingebunden – window.Inspector.toggle() fehlt.");
    }
  });

  // Bau-Menü öffnen (nur Button – Menü steckt in assets/ui/ui-build.js)
  $btnBuild?.addEventListener("click", () => {
    try{
      window?.GameUI?.openBuildMenu?.();
    }catch(e){
      logWarn("Bau-Menü ist (noch) nicht eingebunden – window.GameUI.openBuildMenu() fehlt.");
    }
  });

  // Start / Neu-Start / Cache / Log
  $btnStart?.addEventListener("click", async () => {
    const mapPath = $map?.value || "./assets/maps/map-mini.json";
    logOK(`Start gedrückt → ${mapPath}`);
    try {
      if (window.GameLoader?.start) {
        await window.GameLoader.start(mapPath);
        // Der eigentliche Event-Hook erfolgt in der Start-Wrapper-Funktion (s.u.).
      } else {
        logErr("GameLoader.start ist nicht verfügbar – game.js / Engine noch nicht initialisiert?");
      }
    } catch (e) {
      logErr("Start fehlgeschlagen: " + (e?.message||e));
    }
  });

  $btnRestart?.addEventListener("click", () => {
    try {
      // Wenn deine Engine einen eigenen Reset hat, hier aufrufen:
      window?.GameLoader?.reset?.();
      logOK("Neu-Start angefordert");
      // Startpanel wieder sichtbar machen
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
      // Local/session + SW zu leeren reicht (einfachste Implementation)
      localStorage.clear(); sessionStorage.clear();
      logOK("Cache/Storage geleert – Seite ggf. neu laden");
      // (Optional) Service Worker Abmeldung
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister().catch(()=>{});
      }
    } catch(e){
      logWarn("Cache leeren: " + (e?.message||e));
    }
  });

  $btnLogCopy?.addEventListener("click", () => {
    try{
      window?.Inspector?.copyLog?.();
      logOK("Log in Zwischenablage");
    }catch(e){
      logWarn("Log kopieren: Inspector ist (noch) nicht verfügbar.");
    }
  });

  // --- WICHTIG: GameLoader.start hooken -------------------------------------
  // Wir warten bis die Engine ihre GameLoader.start-Funktion bereitstellt und
  // ersetzen sie durch einen Wrapper, der Events & Logs feuert.
  (function hookGameStart(){
    const timer = setInterval(() => {
      if (window.GameLoader?.start && !window.GameLoader.__uiPatched) {
        const originalStart = window.GameLoader.start;
        window.GameLoader.start = async function(mapPath){
          const startedAt = performance.now();
          const p = originalStart.call(this, mapPath);
          // Falls originalStart ein Promise zurückgibt, darauf warten
          try {
            const res = p?.then ? await p : p;
            const ms = Math.round(performance.now() - startedAt);
            logOK(`Game gestartet (${ms} ms)`);
            // >>> Hier die beiden gewünschten Hooks <<<
            window.dispatchEvent(new CustomEvent('cb:game-started'));
            window.GameUI?.onGameStarted?.();
            return res;
          } catch (e) {
            logErr("Start fehlgeschlagen: " + (e?.message||e));
            throw e;
          }
        };
        window.GameLoader.__uiPatched = true;
        logOK("GameLoader.start Hook aktiv");
        clearInterval(timer);
      }
    }, 60);
    // Fallback: nach 5s aufgeben (verhindert Endlos-Intervalle)
    setTimeout(() => clearInterval(timer), 5000);
  })();

  // UI initialisiert
  logOK(`UI bereit (index ${UI_VERSION})`);
})();
