/* ============================================================================
 * Inspector Core (split)
 * Datei: assets/inspector/inspector.core.js
 * Version: v18.10.8
 *
 * Aufgaben:
 *   - Root/Panel erzeugen (fixed, fullscreen, hoher z-index)
 *   - Tabs/Slots vorbereiten (#ins-body, #ins-tools, #ins-tabs)
 *   - Öffnen/Schließen/Toggle + Fallback-Badge entfernen
 *
 * Öffentliche API (global): window.__INSPECTOR_API__ { open, close, toggle, isOpen,
 *                           getSlots, mountTools }
 *
 * Abhängigkeiten:
 *   - CSS: assets/inspector/inspector.css (stellt Safe-Area & Layout sicher)
 *   - Weitere Module (logs/build/paths/tests) befüllen die Slots.
 * ========================================================================== */
(function () {
  "use strict";

  const MOD = "[inspector.core]";
  const VER = "v18.10.8";

  const log  = (t, ...a) => (window.CBLog?.ok   || console.log)(`${MOD} ${t}`, ...a);
  const info = (t, ...a) => (window.CBLog?.info || console.info)(`${MOD} ${t}`, ...a);
  const warn = (t, ...a) => (window.CBLog?.warn || console.warn)(`${MOD} ${t}`, ...a);

  // DOM-Referenzen
  /** @type {HTMLDivElement|null} */ let $root   = null;   // fullscreen wrapper (#ins-root)
  /** @type {HTMLDivElement|null} */ let $panel  = null;   // card             (#ins-panel)
  /** @type {HTMLDivElement|null} */ let $header = null;   // header           (#ins-head)
  /** @type {HTMLDivElement|null} */ let $tabs   = null;   // tabs-slot        (#ins-tabs)
  /** @type {HTMLDivElement|null} */ let $tools  = null;   // toolbar-slot     (#ins-tools)
  /** @type {HTMLDivElement|null} */ let $body   = null;   // content-slot     (#ins-body)
  let _isOpen = false;

  // Erzeugt bei Bedarf die Grund-Struktur
  function ensureDOM() {
    if ($root) return;

    // Root (immer Fullscreen, ganz oben; CSS erledigt das Feintuning)
    $root = document.createElement("div");
    $root.id = "ins-root";
    $root.setAttribute("role", "dialog");
    $root.setAttribute("aria-label", "Inspector");
    $root.style.display = "none"; // hidden by default

    // Panel
    $panel = document.createElement("div");
    $panel.id = "ins-panel";
    $root.appendChild($panel);

    // Header (Titel + Close)
    $header = document.createElement("div");
    $header.id = "ins-head";

    const $title = document.createElement("div");
    $title.className = "ins-title";
    $title.textContent = "Inspector";
    $header.appendChild($title);

    const $sp = document.createElement("div");
    $sp.className = "ins-spacer";
    $header.appendChild($sp);

    const $btnClose = document.createElement("button");
    $btnClose.className = "ins-close";
    $btnClose.type = "button";
    $btnClose.setAttribute("aria-label", "Schließen");
    $btnClose.textContent = "Schließen";
    $btnClose.addEventListener("click", close);
    $header.appendChild($btnClose);

    $panel.appendChild($header);

    // Tab-Leiste
    $tabs = document.createElement("div");
    $tabs.id = "ins-tabs";
    $panel.appendChild($tabs);

    // Toolbar-Slot (z. B. Log-Filter/Badges)
    $tools = document.createElement("div");
    $tools.id = "ins-tools";
    $panel.appendChild($tools);

    // Body
    $body = document.createElement("div");
    $body.id = "ins-body";
    $panel.appendChild($body);

    // Footer (kleine Build-Zeile)
    const $foot = document.createElement("div");
    $foot.id = "ins-foot";
    $foot.textContent = `core ${VER}`;
    $panel.appendChild($foot);

    document.body.appendChild($root);
  }

  // Öffentliche Slots für andere Module
  function getSlots() {
    ensureDOM();
    return { root: $root, panel: $panel, head: $header, tabs: $tabs, tools: $tools, body: $body };
  }

  // Toolbar-/Controls-Knoten einsetzen (z. B. aus inspector.logs.js)
  function mountTools(node) {
    ensureDOM();
    if (!node) return;
    while ($tools.firstChild) $tools.removeChild($tools.firstChild);
    $tools.appendChild(node);
  }

  // --- öffnen ---------------------------------------------------------------
  function open() {
    if (_isOpen) return;
    ensureDOM();

    // an Body-Ende hängen (falls Skriptreihenfolge verspätet war)
    if ($root.parentNode !== document.body) {
      document.body.appendChild($root);
    }

    // Fallback-Badge entfernen, falls ui-bridge eines gelegt hat
    try { document.getElementById("inspector-probe")?.remove(); } catch {}

    $root.style.display = "block";
    $root.classList.add("open");
    document.body.classList.add("inspector-open"); // wichtig für Safe-Area/Scroll-Lock
    _isOpen = true;

    info(`geöffnet (${VER})`);
  }

  // --- schließen ------------------------------------------------------------
  function close() {
    if (!_isOpen) return;
    ensureDOM();

    $root.classList.remove("open");
    $root.style.display = "none";
    document.body.classList.remove("inspector-open");
    _isOpen = false;
  }

  function toggle(force) {
    const willOpen = force == null ? !_isOpen : !!force;
    willOpen ? open() : close();
  }

  // API exportieren
  window.__INSPECTOR_API__ = Object.freeze({
    open, close, toggle, isOpen: () => _isOpen, getSlots, mountTools
  });

  // Minimaler Default-Tab (damit etwas klickbar ist, bis echte Module montieren)
  (function mountDefaultTab() {
    ensureDOM();
    if (!$tabs.querySelector(".ins-tab[data-tab='logs']")) {
      const t = document.createElement("button");
      t.className = "ins-tab active";
      t.dataset.tab = "logs";
      t.textContent = "Logs";
      $tabs.appendChild(t);
    }
  })();

  log(`bereit (${VER})`);
})();
