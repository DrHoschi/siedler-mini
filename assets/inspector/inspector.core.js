/* ============================================================================
 * Inspector Core (split)
 * Datei: assets/inspector/inspector.core.js
 * Version: v18.10.9
 *
 * Aufgaben:
 *  - Root/Panel erzeugen (fixed, fullscreen, hoher z-index)
 *  - Tabs/Tools/Body-Slots bereitstellen (#ins-tabs, #ins-tools, #ins-body)
 *  - Öffnen/Schließen/Toggle; Fallback-Badge entfernen; Events dispatchen
 *
 * Öffentliche API (global): window.__INSPECTOR_API__ = { open, close, toggle, isOpen,
 *                          getSlots, mountTools, setActiveTab }
 *
 * Abhängigkeiten:
 *  - CSS: assets/inspector/inspector.css (stellt Safe-Area & Layout sicher)
 *  - Weitere Module (logs/build/paths/tests) befüllen die Slots.
 * ========================================================================== */
(function () {
  "use strict";

  const MOD = "[inspector.core]";
  const VER = "v18.10.9";

  const ok   = (t, ...a) => (window.CBLog?.ok   || console.log)(`${MOD} ${t}`, ...a);
  const info = (t, ...a) => (window.CBLog?.info || console.info)(`${MOD} ${t}`, ...a);
  const warn = (t, ...a) => (window.CBLog?.warn || console.warn)(`${MOD} ${t}`, ...a);

  /** @type {HTMLDivElement|null} */ let $root   = null;
  /** @type {HTMLDivElement|null} */ let $panel  = null;
  /** @type {HTMLDivElement|null} */ let $head   = null;
  /** @type {HTMLDivElement|null} */ let $tabs   = null;
  /** @type {HTMLDivElement|null} */ let $tools  = null;
  /** @type {HTMLDivElement|null} */ let $body   = null;
  let _isOpen = false;

  function ensureDOM() {
    if ($root) return;

    // Root
    $root = document.createElement("div");
    $root.id = "ins-root";
    $root.setAttribute("role", "dialog");
    $root.setAttribute("aria-label", "Inspector");
    $root.style.display = "none"; // wird via .open sichtbar gemacht

    // Panel
    $panel = document.createElement("div");
    $panel.id = "ins-panel";
    $root.appendChild($panel);

    // Header
    $head = document.createElement("div");
    $head.id = "ins-head";

    const $title = document.createElement("div");
    $title.className = "ins-title";
    $title.textContent = "Inspector";
    $head.appendChild($title);

    const $spacer = document.createElement("div");
    $spacer.className = "ins-spacer";
    $head.appendChild($spacer);

    const $btnClose = document.createElement("button");
    $btnClose.className = "ins-close";
    $btnClose.type = "button";
    $btnClose.setAttribute("aria-label", "Schließen");
    $btnClose.textContent = "Schließen";
    $btnClose.addEventListener("click", close);
    $head.appendChild($btnClose);

    $panel.appendChild($head);

    // Tabs
    $tabs = document.createElement("div");
    $tabs.id = "ins-tabs";
    $panel.appendChild($tabs);

    // Tools/Controls
    $tools = document.createElement("div");
    $tools.id = "ins-tools";
    $panel.appendChild($tools);

    // Body
    $body = document.createElement("div");
    $body.id = "ins-body";
    $panel.appendChild($body);

    // Footer
    const $foot = document.createElement("div");
    $foot.id = "ins-foot";
    $foot.textContent = `core ${VER}`;
    $panel.appendChild($foot);

    document.body.appendChild($root);
  }

  function getSlots() {
    ensureDOM();
    return { root:$root, panel:$panel, head:$head, tabs:$tabs, tools:$tools, body:$body };
  }

  function mountTools(node) {
    ensureDOM();
    while ($tools.firstChild) $tools.removeChild($tools.firstChild);
    if (node) $tools.appendChild(node);
  }

  function setActiveTab(tabId) {
    ensureDOM();
    const btns = $tabs.querySelectorAll(".ins-tab");
    btns.forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
  }

  function open() {
    ensureDOM();
    if (_isOpen) return;

    // sicherstellen, dass wir direkt unter <body> hängen
    if ($root.parentNode !== document.body) document.body.appendChild($root);
    // etwaige Fallback-Badges entfernen
    try { document.getElementById("inspector-probe")?.remove(); } catch {}

    $root.classList.add("open");
    $root.style.display = "block";
    document.body.classList.add("inspector-open");
    _isOpen = true;

    // Events für Bridge/Analytics
    try { window.dispatchEvent(new Event("cb:inspector-open")); } catch {}
    info(`geöffnet (${VER})`);
  }

  function close() {
    if (!_isOpen) return;
    ensureDOM();
    $root.classList.remove("open");
    $root.style.display = "none";
    document.body.classList.remove("inspector-open");
    _isOpen = false;
    try { window.dispatchEvent(new Event("cb:inspector-close")); } catch {}
  }

  function toggle(force) {
    const willOpen = force == null ? !_isOpen : !!force;
    willOpen ? open() : close();
  }

  // Default-Tab „Logs“ vormontieren (bis Module laden)
  (function mountDefaultTab() {
    ensureDOM();
    if (!$tabs.querySelector("[data-tab='logs']")) {
      const t = document.createElement("button");
      t.className = "ins-tab active";
      t.dataset.tab = "logs";
      t.textContent = "Logs";
      $tabs.appendChild(t);
    }
  })();

  // Export
  window.__INSPECTOR_API__ = Object.freeze({
    open, close, toggle, isOpen: () => _isOpen, getSlots, mountTools, setActiveTab
  });

  ok(`bereit (${VER})`);
})();
