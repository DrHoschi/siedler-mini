/* ============================================================================
 * Datei   : inspector/ui-inspector-v1.js
 * Version : v25.11.01-final
 * Zweck   : Inspector-CORE – Overlay öffnen/schließen + Grundgerüst aufbauen
 * Stil    : KONSTANTEN → HILFSFUNKTIONEN → KLASSE → INIT/EXPORT
 * Hinweis : Exportiert window.Inspector mit API: init/open/close/toggle/isOpen
 * ========================================================================== */
(() => {
  /* ---------------------------------- KONSTANTEN -------------------------- */
  const CFG = {
    HOST_SEL     : "#inspector",                 // fester Host (DIV im DOM)
    BODY_FLAG    : "is-inspector",               // Sichtbarkeits-Flag am <body>
    BODY_FLAG_LE : "inspector-open",             // Legacy-Kompatibilität
    EVT_OPEN     : "cb:insp:open",
    EVT_CLOSE    : "cb:insp:close",
    VERSION      : "v25.11.01-final"
  };

  /* -------------------------------- HILFSFUNKTIONEN ----------------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls) => Object.assign(document.createElement(tag), { className: cls || "" });

  /** Host ermitteln/erzeugen */
  function getHost() {
    let h = $(CFG.HOST_SEL);
    if (!h) {
      h = el("div", "inspector-host");
      h.id = "inspector";
      document.body.appendChild(h);
    }
    return h;
  }

  /** Grundgerüst (Header/Tabs/Content) aufbauen, falls noch leer */
/** Grundgerüst (Header/Tabs/Content) aufbauen – NICHT destruktiv */
function ensureShell(host) {
  // 1) Wenn Content-/Tabs-Skripte die Shell bereits gebaut haben → übernehmen
  const existingShell = host.querySelector('.insp-shell');
  if (existingShell) {
    host.dataset.shellReady = "1";
    return host; // nichts anfassen!
  }

  // 2) Falls noch nichts existiert → minimale Shell erzeugen
  const shell   = el("div", "insp-shell");
  const header  = el("div", "insp-header");
  const tabs    = el("div", "insp-tabs");     tabs.setAttribute("role","tablist");
  const content = el("div", "insp-content");  content.setAttribute("role","region");

  header.appendChild(tabs);
  shell.appendChild(header);
  shell.appendChild(content);
  host.appendChild(shell);
  host.dataset.shellReady = "1";

  // Close-Button (nur hinzufügen, wenn keiner existiert)
  if (!header.querySelector('[data-action="insp-close"]')) {
    const btnX = el("button"); btnX.type = "button"; btnX.textContent = "×";
    btnX.setAttribute("data-action","insp-close");
    btnX.setAttribute("aria-label","Inspector schließen");
    btnX.style.cssText = "position:absolute;right:12px;top:10px;font-size:24px;background:none;border:0;color:#ddd;cursor:pointer;";
    btnX.addEventListener("click", () => Inspector.close());
    header.style.position = "relative";
    header.appendChild(btnX);
  }
  return host;
}

  /** Sichtbarkeit setzen (Klassen pflegen + aria) */
  function setActive(on) {
    document.body.classList.toggle(CFG.BODY_FLAG, on);
    document.body.classList.toggle(CFG.BODY_FLAG_LE, on);
    const h = getHost();
    h.setAttribute("aria-hidden", on ? "false" : "true");
  }

  /* ------------------------------------ KLASSE ---------------------------- */
  class InspectorCore {
    constructor() { this.initialized = false; }

    init(opts = {}) {
      // Host & Shell
      const host = ensureShell(getHost());
      // Tabs/Content werden von deinen Tab-Dateien befüllt (content-v1 + tabs/*)
      // Optional: Mount erlauben (für spätere Varianten)
      this.mount = opts.mount || host;

      // Startzustand
      setActive(false);
      this.initialized = true;
      (window.CBLog?.info || console.info)(`[insp] Core bereit (${CFG.VERSION}).`);
      window.dispatchEvent(new CustomEvent("cb:insp:core:ready", { detail: { version: CFG.VERSION }}));
      return this;
    }

    open()  { setActive(true);  window.dispatchEvent(new CustomEvent(CFG.EVT_OPEN));  }
    close() { setActive(false); window.dispatchEvent(new CustomEvent(CFG.EVT_CLOSE)); }
    toggle(force) { (typeof force === "boolean" ? force : !this.isOpen()) ? this.open() : this.close(); }
    isOpen() { return document.body.classList.contains(CFG.BODY_FLAG); }
  }

  /* ---------------------------------- INIT/EXPORT ------------------------- */
  const core = new InspectorCore();

  // Global API
  window.Inspector = {
    get initialized(){ return core.initialized; },
    init   : (...a) => core.init(...a),
    open   : (...a) => core.open(...a),
    close  : (...a) => core.close(...a),
    toggle : (...a) => core.toggle(...a),
    isOpen : (...a) => core.isOpen(...a)
  };

  // ESC schließt
  window.addEventListener("keydown", (e)=> e.key === "Escape" && core.isOpen() && core.close());

  // Auto-Init wenn DOM da ist
  document.addEventListener("DOMContentLoaded", () => { if (!core.initialized) core.init(); });
})();
