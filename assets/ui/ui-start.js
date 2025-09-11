/* ui-start.js — v17.8.9 (clean, no-legacy) */
(function () {
  "use strict";

  const MOD = "[ui-start]";
  const info = (window.CBLog?.info ?? console.log).bind(console, MOD);
  const ok   = (window.CBLog?.ok   ?? console.log).bind(console, MOD);
  const warn = (window.CBLog?.warn ?? console.warn).bind(console, MOD);
  const err  = (window.CBLog?.err  ?? console.error).bind(console, MOD);

  const QS  = (s, r = document) => r.querySelector(s);
  const QSA = (s, r = document) => r.querySelectorAll(s);

  // ---- Legacy-/Fallback-Kram sicher ausschalten ----------------------------
  function removeLegacyBars() {
    // typische IDs/Klassen alter Startleisten rauswerfen
    const suspects = [
      "#start-legacy-bar",     // frühere eigene Leiste
      ".start-legacy",         // generischer Fallback
      "#debug-start-bar"       // evtl. aus tools/debug-tools.js
    ];
    suspects.forEach(sel => QSA(sel).forEach(n => n.remove()));
  }

  // ---- Start-Panel sicherstellen -------------------------------------------
  function ensureStartPanel() {
    let panel = QS("#start-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "start-panel";
      panel.className = "ui-start";
      panel.innerHTML = `<div class="ui-start-bg" role="img" aria-label="Hintergrund"></div>`;
      document.body.appendChild(panel);
      warn("Start-Panel fehlte → neu angelegt.");
    }

    // Card vorhanden? Wenn nein: generieren.
    let card = QS(".ui-start-card", panel);
    if (!card) {
      card = document.createElement("div");
      card.className = "ui-start-card";
      card.setAttribute("role", "dialog");
      card.setAttribute("aria-modal", "true");
      card.innerHTML = `
        <h1>Neue Siedler</h1>
        <div class="actions">
          <button id="btnStartNew" class="btn main">Neues Spiel</button>
          <button id="btnStartResume" class="btn">Weiterspielen</button>
          <button id="btnStartReset" class="btn ghost">Reset</button>
          <button id="btnStartFullscreen" class="btn ghost">Fullscreen</button>
        </div>
      `;
      panel.appendChild(card);
      ok("Start-Card automatisch erzeugt.");
    }
    return panel;
  }

  // ---- Aktionen ------------------------------------------------------------
  function wireActions(panel) {
    const byId = id => QS("#" + id, panel);

    const btnNew   = byId("btnStartNew");
    const btnCont  = byId("btnStartResume");
    const btnReset = byId("btnStartReset");
    const btnFull  = byId("btnStartFullscreen");

    if (btnNew) btnNew.addEventListener("click", () => {
      info("Start klick (Neues Spiel)");
      // hier könntest du Savegames löschen etc.
      dispatchStart();
    });

    if (btnCont) btnCont.addEventListener("click", () => {
      info("Start klick (Weiterspielen)");
      dispatchStart();
    });

    if (btnReset) btnReset.addEventListener("click", () => {
      try {
        localStorage.clear();
        ok("Spielstand zurückgesetzt.");
      } catch(_) {}
    });

    if (btnFull) btnFull.addEventListener("click", async () => {
      try {
        if (document.fullscreenElement) { await document.exitFullscreen(); }
        else { await document.documentElement.requestFullscreen(); }
      } catch(e) { warn("Fullscreen nicht möglich:", e?.message || e); }
    });
  }

  function dispatchStart() {
    // Panel entfernen, dann Event feuern
    const panel = QS("#start-panel");
    if (panel) {
      panel.remove();
      ok("Start-Panel entfernt.");
    }
    try {
      window.dispatchEvent(new CustomEvent("cb:game-start"));
      info("cb:game-start dispatcht");
    } catch(e) {
      err("cb:game-start fehlgeschlagen:", e?.message || e);
    }
  }

  // ---- Init ---------------------------------------------------------------
  function init() {
    info("geladen (v17.8.9)");

    // 1) Alle möglichen Legacy-/Debug-Startleisten wegräumen
    removeLegacyBars();

    // 2) Panel/Card sicher stellen
    const panel = ensureStartPanel();

    // 3) Buttons verdrahten
    wireActions(panel);
  }

  // DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
