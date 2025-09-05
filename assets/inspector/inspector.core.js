/* ============================================================================
 * Inspector Core (split)
 * Datei: assets/inspector/inspector.core.js
 * Version: v18.10.7
 * Aufgaben:
 *   - Root/Panel erzeugen (fixed, fullscreen, hoher z-index)
 *   - Tabs/Slots vorbereiten (#ins-body, #ins-tools, #ins-tabs)
 *   - Öffnen/Schließen/Toggle + Fallback-Badge entfernen
 * Public API (global): window.__INSPECTOR_API__ {open, close, toggle, isOpen, mountTools}
 * Abhängigkeiten:
 *   - CSS: assets/inspector/inspector.css
 *   - Optional: weitere Module (logs/build/paths/tests) nutzen die Slots
 * ========================================================================== */
(function () {
  "use strict";

  const MOD = "[inspector.core]";
  const VER = "v18.10.7";

  const log  = (t, ...a) => (window.CBLog?.ok   || console.log)(`${MOD} ${t}`, ...a);
  const info = (t, ...a) => (window.CBLog?.info || console.info)(`${MOD} ${t}`, ...a);
  const warn = (t, ...a) => (window.CBLog?.warn || console.warn)(`${MOD} ${t}`, ...a);

  // ---------------------------------------------------------------------------

  let $root   = null;   // fullscreen wrapper
  let $panel  = null;   // card
  let $header = null;   // title + close
  let $tabs   = null;   // tab strip (slot)
  let $tools  = null;   // small toolbar slot (e.g. logs-filter)
  let $body   = null;   // main content
  let _isOpen = false;

  function ensureDOM() {
    if ($root) return;

    // Root (immer Fullscreen, ganz oben)
    $root = document.createElement("div");
    $root.id = "ins-root";
    $root.setAttribute("role", "dialog");
    $root.setAttribute("aria-label", "Inspector");
    $root.style.display = "none"; // hidden by default

    // Panel
    $panel = document.createElement("div");
    $panel.id = "ins-panel";
    $root.appendChild($panel);

    // Header
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

    // Tools/Toolbar-Slot (für Log-Filter/Badges etc.)
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

  // Andere Module (z. B. inspector.logs.js) können hier eine Toolbar montieren.
  function mountTools(node) {
    ensureDOM();
    if (!node) return;
    // leer machen, dann einhängen
    while ($tools.firstChild) $tools.removeChild($tools.firstChild);
    $tools.appendChild(node);
  }

  // --- öffnen ------------------------------------------------------------
function open(){
  if (_isOpen) return;
  _isOpen = true;

  // Root sicherstellen/ans Body-Ende hängen
  if (!_root) _root = buildRoot();             // deine bisherige Factory
  if (_root.parentNode !== document.body) {
    document.body.appendChild(_root);
  }

  _root.classList.add('open');
  document.body.classList.add('inspector-open'); // <-- wichtig für CSS

  try { (window.CBLog?.info||console.log)('[inspector.core] geöffnet (core v18.10.8)'); } catch(_){}
}

// --- schließen ---------------------------------------------------------
function close(){
  if (!_isOpen) return;
  _isOpen = false;
  if (_root) _root.classList.remove('open');
  document.body.classList.remove('inspector-open'); // <-- zurücksetzen
}

  function toggle(force) {
    const willOpen = force == null ? !_isOpen : !!force;
    willOpen ? open() : close();
  }

  // Exporte
  window.__INSPECTOR_API__ = {
    open, close, toggle, isOpen: () => _isOpen,
    getSlots, mountTools
  };

  // Minimal-Tab (Logs) – damit sofort was klickbar ist, echte Module können ersetzen
  function mountDefaultTabs() {
    const { tabs } = getSlots();
    if (!tabs.querySelector(".ins-tab[data-tab='logs']")) {
      const t = document.createElement("button");
      t.className = "ins-tab active";
      t.dataset.tab = "logs";
      t.textContent = "Logs";
      tabs.appendChild(t);
    }
  }
  mountDefaultTabs();

  info(`bereit (${VER})`);
})();
