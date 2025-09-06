/* ============================================================================
 * Datei: assets/inspector/inspector.core.js
 * Projekt: Siedler-Mini
 * Version: v18.12.0
 *
 * Zweck
 *  - Erstellt das Inspector-Overlay (DOM + Slots) – OHNE Auto-Open.
 *  - Tabs: Logs / Build / Pfade / Tests
 *  - Slot-API für Teilmodule (z.B. inspector.logs.js):
 *      core.api.mount(tabId, renderFn)        // renderFn -> optional unmount() zurück
 *      core.api.getSlot(name)                 // liefert DOM-Slot
 *      core.api.signal(name, payload?)        // Simple Event-Bus
 *
 * Garantien / Style
 *  - Kein body-Append in Submodulen; alles in Slots.
 *  - Events: cb:inspector-open / cb:inspector-close
 *  - Body erhält Klasse 'inspector-open' (scroll lock).
 *  - Topmost z-index ist in CSS definiert.
 * ========================================================================== */
(function () {
  "use strict";

  var MOD = "[inspector.core]";
  var VER = "v18.12.0";

  // ---- Logging Helpers ------------------------------------------------------
  var ok   = (...a) => (window.CBLog?.ok   || console.log)(MOD, ...a);
  var warn = (...a) => (window.CBLog?.warn || console.warn)(MOD, ...a);

  // ---- State ----------------------------------------------------------------
  var elRoot = null;          // #inspector
  var currentTab = "logs";
  var mounted = {};           // tabId -> { unmount?:fn }
  var slots = {};             // name -> HTMLElement
  var signals = {};           // listeners[name] = Set<fn>

  // ---- DOM: Grundgerüst -----------------------------------------------------
  function ensureDOM() {
    if (elRoot && document.body.contains(elRoot)) return;

    // Root
    elRoot = document.getElementById("inspector");
    if (!elRoot) {
      elRoot = document.createElement("div");
      elRoot.id = "inspector";
      elRoot.style.display = "none"; // bleibt zu bis open()
      document.body.appendChild(elRoot);
    }

    // Wrap
    var wrap = document.createElement("div");
    wrap.className = "ins-wrap";

    // Panel
    var panel = document.createElement("div");
    panel.className = "ins-panel";

    // HEAD
    var head = document.createElement("div");
    head.className = "ins-head";

    var title = document.createElement("div");
    title.className = "ins-title";
    title.innerHTML = '<span>Inspector</span> <span class="ins-ver"></span>';

    var ver = title.querySelector(".ins-ver");
    ver.textContent = VER;

    var tabs = document.createElement("div");
    tabs.className = "ins-tabs";
    tabs.innerHTML = [
      '<button class="ins-tab" data-tab="logs">Logs</button>',
      '<button class="ins-tab" data-tab="build">Build</button>',
      '<button class="ins-tab" data-tab="paths">Pfade</button>',
      '<button class="ins-tab" data-tab="tests">Tests</button>'
    ].join("");

    var btnClose = document.createElement("button");
    btnClose.className = "ins-close";
    btnClose.type = "button";
    btnClose.title = "schließen";
    btnClose.addEventListener("click", close);

    head.appendChild(title);
    head.appendChild(tabs);
    head.appendChild(btnClose);

    // BODY – geteilt in Sidebar (Controls) + Main (Views)
    var body = document.createElement("div");
    body.className = "ins-body";

    var side = document.createElement("aside");
    side.className = "ins-side"; // wird in Landscape als Sidebar genutzt

    var main = document.createElement("main");
    main.className = "ins-main";

    // --- Slots anlegen -------------------------------------------------------
    // Controls-Slots (links/oben)
    var scLogs  = mkSlot("logs-controls");
    var scBuild = mkSlot("build-controls");
    var scPaths = mkSlot("paths-controls");
    var scTests = mkSlot("tests-controls");

    side.append(scLogs, scBuild, scPaths, scTests);

    // Views-Slots (rechts/unten)
    var pvLogs  = mkSlot("logs-view");
    var pvBuild = mkSlot("build-view");
    var pvPaths = mkSlot("paths-view");
    var pvTests = mkSlot("tests-view");

    // Pane-Container – jede Pane füllt die Fläche, nur aktive sichtbar
    var paneLogs  = mkPane("logs",  pvLogs);
    var paneBuild = mkPane("build", pvBuild);
    var panePaths = mkPane("paths", pvPaths);
    var paneTests = mkPane("tests", pvTests);

    main.append(paneLogs, paneBuild, panePaths, paneTests);

    body.append(side, main);

    // FOOT
    var foot = document.createElement("div");
    foot.className = "ins-foot";
    var muted = document.createElement("div");
    muted.className = "muted";
    muted.textContent = "Tip: In Landscape stehen Tabs & Filter links als Sidebar.";
    foot.appendChild(muted);

    // Zusammensetzen
    panel.appendChild(head);
    panel.appendChild(body);
    panel.appendChild(foot);
    wrap.appendChild(panel);
    elRoot.appendChild(wrap);

    // Tab-Wiring
    tabs.addEventListener("click", function (ev) {
      var b = ev.target.closest(".ins-tab");
      if (!b) return;
      setTab(b.dataset.tab || "logs");
    });

    // Startzustand
    setTab(currentTab);
  }

  function mkSlot(name) {
    var slot = document.createElement("section");
    slot.className = "slot-" + name;
    slot.dataset.slot = name;
    slots[name] = slot;
    return slot;
  }

  function mkPane(tabId, viewEl) {
    var pane = document.createElement("div");
    pane.className = "ins-pane";
    pane.dataset.tab = tabId;
    pane.appendChild(viewEl);
    return pane;
  }

  // ---- Tabs schalten --------------------------------------------------------
  function setTab(tabId) {
    currentTab = tabId;

    // Tabs
    elRoot.querySelectorAll(".ins-tab").forEach(function (b) {
      b.classList.toggle("active", (b.dataset.tab === tabId));
    });

    // Panes
    elRoot.querySelectorAll(".ins-pane").forEach(function (p) {
      p.classList.toggle("active", (p.dataset.tab === tabId));
    });

    // Controls sichtbar/nicht
    ["logs", "build", "paths", "tests"].forEach(function (id) {
      var sc = slots[id + "-controls"];
      if (sc) sc.style.display = (id === tabId ? "block" : "none");
    });

    // Signal für Submodule
    api.signal("tab:change", { tab: tabId });
  }

  // ---- API für Submodule ----------------------------------------------------
  var api = {
    mount: function (tabId, renderFn) {
      // renderFn erhält keine Argumente; nutzt getSlot() selbst.
      if (mounted[tabId]?.unmount) {
        try { mounted[tabId].unmount(); } catch (_) {}
      }
      var unmount = null;
      try {
        unmount = renderFn() || null;
      } catch (e) {
        warn("mount error for", tabId, e?.message);
      }
      mounted[tabId] = { unmount };
    },
    getSlot: function (name) {
      return slots[name] || null;
    },
    signal: function (name, payload) {
      var set = signals[name]; if (!set) return;
      set.forEach(function (fn) {
        try { fn(payload); } catch (_) {}
      });
    },
    on: function (name, fn) {
      signals[name] = signals[name] || new Set();
      signals[name].add(fn);
      return function off(){ signals[name].delete(fn); };
    },
    version: VER
  };

  // ---- Open / Close ---------------------------------------------------------
  function open() {
    ensureDOM();
    if (elRoot.style.display !== "flex") {
      elRoot.style.display = "flex";
      document.body.classList.add("inspector-open");
      // Default-Tab (Logs)
      setTab(currentTab || "logs");
      try { window.dispatchEvent(new Event("cb:inspector-open")); } catch (_) {}
      ok("geöffnet (v%s)", VER);
    }
  }

  function close() {
    if (!elRoot) return;
    if (elRoot.style.display !== "none") {
      elRoot.style.display = "none";
      document.body.classList.remove("inspector-open");
      try { window.dispatchEvent(new Event("cb:inspector-close")); } catch (_) {}
      ok("geschlossen");
    }
  }

  function toggle(force) {
    var willOpen = (force == null ? (elRoot?.style.display !== "flex") : !!force);
    willOpen ? open() : close();
  }

  // ---- Export / Bridge ------------------------------------------------------
  window.__INSPECTOR_CORE__ = { api: api, open: open, close: close, toggle: toggle, version: VER };

  // Brücke für deine FAB-Buttons
  window.__INSPECTOR_API__ = window.__INSPECTOR_API__ || {};
  window.__INSPECTOR_API__.open   = open;
  window.__INSPECTOR_API__.close  = close;
  window.__INSPECTOR_API__.toggle = toggle;

  // KEIN Auto-Open.
  ok("bereit v%s", VER);
})();
