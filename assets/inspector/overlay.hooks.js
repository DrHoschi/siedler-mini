/* ============================================================================
 * Datei: assets/inspector/overlay.hooks.js
 * Zweck:
 *   - Öffnen/Schließen des Inspector-Overlays per Button oder Event
 *   - Fallback-Modal nur zeigen, wenn das echte Overlay nicht rechtzeitig da ist
 *   - Fallback automatisch schließen, sobald #inspector sichtbar ist
 *   - KEIN Auto-Open beim Laden der Seite
 *
 * Abhängigkeiten:
 *   - Das eigentliche Overlay wird von assets/inspector/inspector.core.js aufgebaut.
 *   - Diese Datei darf alleine laufen; sie enthält robustes DOM-Finden.
 * ========================================================================== */

(function () {
  "use strict";

  const MOD = "[overlay-hooks]";
  const FALLBACK_TIMEOUT_MS = 900;  // nur kurz warten
  const FIND_OVERLAY_EVERY_MS = 150;

  // --- kleine Utils ---------------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const hasInspector = () => !!$("#inspector");
  const isOpen = () => document.body.classList.contains("inspector-open");

  // --- Fallback-Modal -------------------------------------------------------
  let fbEl = null;
  function ensureFallback() {
    if (fbEl) return fbEl;
    fbEl = document.createElement("div");
    fbEl.id = "inspector-fallback";
    fbEl.style.position = "fixed";
    fbEl.style.inset = "0";
    fbEl.style.zIndex = "2147483647";
    fbEl.style.background = "rgba(0,0,0,.35)";
    fbEl.style.backdropFilter = "blur(1px)";
    fbEl.style.display = "flex";
    fbEl.style.alignItems = "center";
    fbEl.style.justifyContent = "center";

    const box = document.createElement("div");
    box.style.minWidth = "260px";
    box.style.maxWidth = "92vw";
    box.style.borderRadius = "12px";
    box.style.background = "rgba(20,25,30,.92)";
    box.style.color = "#e6eef6";
    box.style.boxShadow = "0 10px 30px rgba(0,0,0,.45)";
    box.style.border = "1px solid rgba(255,255,255,.08)";

    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.08);">
        <strong style="font-size:16px">Inspector (Fallback)</strong>
        <button id="ins-fb-close" style="padding:6px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.07);color:#e6eef6;cursor:pointer">Schließen</button>
      </div>
      <div style="padding:16px 16px 18px 16px;font-size:15px;opacity:.9">
        Inspector lädt…
      </div>`;
    fbEl.appendChild(box);

    fbEl.addEventListener("click", (ev) => {
      // nur außerhalb der Box schließen
      if (ev.target === fbEl) closeFallback();
    });
    box.querySelector("#ins-fb-close").addEventListener("click", closeFallback);

    return fbEl;
  }
  function openFallback() {
    if (!fbEl) ensureFallback();
    if (!fbEl.isConnected) document.body.appendChild(fbEl);
  }
  function closeFallback() {
    if (fbEl && fbEl.isConnected) fbEl.remove();
  }

  // --- Overlay open/close ---------------------------------------------------
  function openInspector() {
    // Body-Flag setzen (core.css sperrt dann Body-Scroll)
    document.body.classList.add("inspector-open");

    // Wenn das echte Overlay nicht sofort da ist: kurz warten und zur Not Fallback zeigen
    let elapsed = 0;
    let shown = false;

    const poll = setInterval(() => {
      elapsed += FIND_OVERLAY_EVERY_MS;

      if (hasInspector()) {
        closeFallback();
        clearInterval(poll);
        return;
      }
      if (!shown && elapsed >= FALLBACK_TIMEOUT_MS) {
        openFallback();
        shown = true;
      }
    }, FIND_OVERLAY_EVERY_MS);
  }

  function closeInspector() {
    document.body.classList.remove("inspector-open");
    closeFallback();
    // core entfernt #inspector selbst (unmount) – hier kein hartes DOM-Remove
  }

  // --- Reaktion, wenn das echte Overlay auftaucht ---------------------------
  // Egal wodurch es kommt (Button, Event, Auto-Build) -> Fallback schließen
  const mo = new MutationObserver(() => {
    if (hasInspector()) {
      closeFallback();
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // --- Event-Brücken --------------------------------------------------------
  // 1) Custom-Events, die dein Projekt bereits nutzt:
  window.addEventListener("cb:inspector-open", openInspector);
  window.addEventListener("cb:inspector-close", closeInspector);

  // 2) Buttons robust anbinden (ID, Klasse oder data-Attr)
  function wireButtons() {
    const candidates = [
      "#btn-inspector",
      ".inspector-toggle",
      "[data-inspector-toggle]",
      "#open-inspector",
      ".tool-inspector"
    ];
    const btns = candidates.flatMap(sel => $$(sel));
    btns.forEach(btn => {
      // doppelte Listener vermeiden
      if (btn.__ins_hooked) return;
      btn.__ins_hooked = true;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen()) closeInspector();
        else openInspector();
      });
    });
  }
  wireButtons();

  // Falls Buttons später dynamisch kommen:
  const moBtns = new MutationObserver(wireButtons);
  moBtns.observe(document.body, { childList: true, subtree: true });

  // --- Sicherheitsnetz: wenn core signalisiert, schließen wir Fallback ------
  // (core.api.signal('overlay:ready') oder DOM vorhanden – beides greift)
  window.addEventListener("ins:overlay-ready", closeFallback);

  // Debug
  (window.CBLog?.ok || console.log)(`${MOD} bereit`);
})();
