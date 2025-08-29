// assets/ui/ui-bridge.js
// v16.1.0 – Bridge zwischen global erwarteten Hooks (window.GameUI.*) und deiner Bau-Menü-Implementierung (ui-build.js)

(function(){
  const BRIDGE_VER = "v16.1.0";

  // --- minimaler Safe-Logger, leitet an Inspector weiter, falls vorhanden
  function logOk(msg){ try { window.Inspector?.log?.ok?.(msg); } catch(_){} console.log("✅", msg); }
  function logWarn(msg){ try { window.Inspector?.log?.warn?.(msg); } catch(_){} console.warn("⚠️", msg); }
  function logErr(msg){ try { window.Inspector?.log?.err?.(msg); } catch(_){} console.error("❌", msg); }

  // --- DOM-Griffe
  const btnBuild = document.getElementById("btn-build");
  const btnInspector = document.getElementById("btn-inspector");

  // --- Bridge-API nach außen
  const GameUI = window.GameUI = window.GameUI || {};

  // Diese drei Zeilen sind die eigentliche Brücke zu deiner Bau-Menü-Implementierung:
  const UIB = window.UIBuild || {}; // aus assets/ui/ui-build.js
  GameUI.openBuildMenu  = () => { UIB.open?.();  };
  GameUI.closeBuildMenu = () => { UIB.close?.(); };
  GameUI.setTool        = (id) => { UIB.setTool?.(id); };

  // --- Buttons verdrahten
  if (btnBuild) {
    btnBuild.addEventListener("click", () => {
      // Toggler: wenn UI auf, dann schließen – sonst öffnen
      if (UIB.isOpen?.()) {
        GameUI.closeBuildMenu();
        logOk("[ui-bridge] Bau-Menü geschlossen");
      } else {
        GameUI.openBuildMenu();
        logOk("[ui-bridge] Bau-Menü geöffnet");
      }
    });
  } else {
    logWarn("[ui-bridge] #btn-build fehlt im DOM – Bau-Button wird nicht angezeigt.");
  }

  if (btnInspector && !btnInspector.__cbBound) {
    btnInspector.__cbBound = true;
    btnInspector.addEventListener("click", () => {
      // Inspector bereitstellen (globaler Hook, bei dir vorhanden)
      if (window.GameInspector?.toggle) {
        window.GameInspector.toggle(true);
      } else {
        // Fallback: eigenes Event – dein Inspector lauscht bereits auf „cb:toggle-inspector“
        window.dispatchEvent(new CustomEvent("cb:toggle-inspector"));
      }
    });
  }

  // --- Sichtbarkeit des Bau-Buttons steuern:
  // erscheint erst, wenn das Spiel wirklich gestartet ist
  function showBuildButton(show) {
    if (!btnBuild) return;
    if (show) btnBuild.classList.add("visible");
    else btnBuild.classList.remove("visible");
  }
  showBuildButton(false);

  // 1) Sobald game.js / Engine geladen → optional
  window.addEventListener("cb:engine-ready", () => {
    logOk(`[ui-bridge ${BRIDGE_VER}] Engine gemeldet: ready`);
  });

  // 2) Sobald das Spiel gestartet ist → Button sichtbar + optionales Auto-Öffnen via Query
  window.addEventListener("cb:game-started", () => {
    showBuildButton(true);

    // Optionales Auto-Open: ?build=1
    try {
      const q = new URLSearchParams(location.search);
      if (q.get("build") === "1") {
        GameUI.openBuildMenu();
      }
    } catch (_) {}

    logOk(`[ui-bridge ${BRIDGE_VER}] Spielstart empfangen – Bau-Button aktiv.`);
  });

  // 3) Bei Neu-Start wieder verstecken
  window.addEventListener("cb:reset", () => {
    showBuildButton(false);
    GameUI.closeBuildMenu();
    logOk("[ui-bridge] Reset – Bau-Button wieder ausgeblendet.");
  });

  // Sanity-Check ins Log:
  if (typeof UIB.open !== "function") {
    logWarn("[ui-bridge] UIBuild.open() nicht gefunden – bitte API-Namen ggf. anpassen.");
  } else {
    logOk(`[ui-bridge ${BRIDGE_VER}] bereit – Hooks sind gebunden.`);
  }
})();
