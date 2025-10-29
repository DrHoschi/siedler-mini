/* ============================================================================
 * Datei   : tools/test-insp-events.js
 * Projekt : Neue Siedler – Inspector Testevents
 * Version : v25.10.31
 * Autor   : Mann / ChatGPT-5
 * Zweck   : Kleine, unabhängige Testhilfe für den neuen Inspector:
 *           - feuert cb:registry:ready, cb:build:ready/update
 *           - sendet cb:res:change (Demo-Werte) periodisch
 *           - optional: öffnet/schließt Inspector zum Sichttest
 *
 * Struktur: IMPORTS → KONSTANTEN → HILFSFUNKTIONEN → KLASSE → HAUPTLOGIK → EXPORTS
 * Hinweise:
 *  - Datei ist komplett optional und kann jederzeit entfernt werden.
 *  - Keine Abhängigkeiten (Inspector-Core/UI sind nur "nice to have").
 *  - Bitte mit <script defer> nach dem Inspector-Core/-Content einbinden.
 * ========================================================================== */


/* ============================================================================
 * [IMPORTS]
 * (keine externen Imports; plain JS)
 * ========================================================================== */


/* ============================================================================
 * [KONSTANTEN] – Schalter & Intervalle
 * ========================================================================== */
const TIE = {
  VERSION: "v25.10.31",

  // Auto-Start beim Seitenladen?
  AUTO_START: true,

  // Inspector zum Start kurz öffnen? (nur Sichtprobe)
  AUTO_PEEK_INSPECTOR: true,

  // Ressourcen-Update-Intervall (ms). 0 = aus
  RES_TICK_MS: 1500,

  // Build-Status-Update jedes N-te Ressourcen-Tick (0 = aus)
  BUILD_UPDATE_EVERY: 4,

  // Demo-Startwerte (werden bei STOP zurückgesetzt)
  RES_DEMO_BASE: { Holz: 3, Stein: 2, Fisch: 1 }
};


/* ============================================================================
 * [HILFSFUNKTIONEN]
 * ========================================================================== */
function tieLog(msg) {
  try { console.log(`[test-insp ${new Date().toLocaleTimeString()}] ${msg}`); } catch {}
}

function dispatch(name, detail) {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
    // Minimal-Fallback (ohne Detail)
    window.dispatchEvent(new Event(name));
  }
}


/* ============================================================================
 * [KLASSE] – Öffentliche Mini-API zum Starten/Stoppen
 * ========================================================================== */
class TestInspEvents {

  static _timer = null;
  static _tickCount = 0;
  static _res = { ...TIE.RES_DEMO_BASE };

  /** Startet die Demo-Events (idempotent). */
  static start() {
    if (this._timer) {
      tieLog("läuft bereits (start ignoriert).");
      return;
    }

    // 1) Basis-„ready“-Signale
    dispatch("cb:registry:ready");
    dispatch("cb:build:ready");
    tieLog("Basis-Signale gesendet (registry/build ready).");

    // 2) Optional: Inspector kurz zeigen (nur Sichttest)
    if (TIE.AUTO_PEEK_INSPECTOR && window.UIInspector?.open) {
      window.UIInspector.open();
      setTimeout(() => window.UIInspector?.close?.(), 600);
    }

    // 3) Periodische Ressourcen-Updates
    if (TIE.RES_TICK_MS > 0) {
      this._timer = setInterval(() => {
        this._tickCount++;

        // Demo-Ressourcen ein wenig „leben“ lassen
        this._res.Holz += 1;
        if (this._tickCount % 2 === 0) this._res.Stein += 1;
        if (this._tickCount % 3 === 0) this._res.Fisch += 1;

        dispatch("cb:res:change", { list: { ...this._res } });

        // alle N Ticks ein Build-Update
        if (TIE.BUILD_UPDATE_EVERY > 0 && this._tickCount % TIE.BUILD_UPDATE_EVERY === 0) {
          dispatch("cb:build:update", { tick: this._tickCount, res: { ...this._res } });
        }
      }, TIE.RES_TICK_MS);
      tieLog(`RES-Loop gestartet (alle ${TIE.RES_TICK_MS} ms).`);
    }
  }

  /** Stoppt alle Demo-Events und setzt die Ressourcen zurück. */
  static stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._tickCount = 0;
    this._res = { ...TIE.RES_DEMO_BASE };

    // Ein „Reset“-Schnappschuss für sauberen Zustand
    dispatch("cb:res:change", { list: { ...this._res } });

    tieLog("gestoppt & zurückgesetzt.");
  }

  /** Einmaliger Schnappschuss (z. B. manuell aus der Konsole aufrufen). */
  static snapshot() {
    dispatch("cb:res:change", { list: { ...this._res } });
    tieLog("snapshot gesendet.");
  }
}


/* ============================================================================
 * [HAUPTLOGIK] – Auto-Start (optional)
 * ========================================================================== */
(function bootstrapTIE() {
  const ready = () => {
    tieLog(`TestInspEvents bereit (${TIE.VERSION}). AUTO_START=${TIE.AUTO_START ? "on" : "off"}.`);
    if (TIE.AUTO_START) TestInspEvents.start();
  };

  if (document.readyState === "complete" || document.readyState === "interactive") {
    ready();
  } else {
    document.addEventListener("DOMContentLoaded", ready, { once: true });
  }
})();


/* ============================================================================
 * [EXPORTS] – globale Mini-API (manuell steuerbar aus der Konsole)
 * ========================================================================== */
window.TestInspEvents = TestInspEvents;

/* ===================== EOF tools/test-insp-events.js ====================== */
