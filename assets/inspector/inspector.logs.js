/* ============================================================================
 * Datei: assets/inspector/inspector.logs.js
 * Projekt: Siedler-Mini
 * Version: v18.11.0
 *
 * Zweck
 *   - Logs-Tab mit Level-Badges, Suche, Kopieren/Export
 *   - Bevorzugt INSIDE des Inspector-Panels rendern
 *   - Fallback: kleines Floating-Dock unten rechts (nur wenn Panel fehlt)
 *
 * Abhängigkeiten
 *   - Optional CBLog (nutzt getBuffer() | _buf)
 *   - Inspector-Core (wenn vorhanden): <div id="inspector"> mit .ins-body
 *
 * Events / Hooks
 *   - Reagiert auf:  cb:inspector-open, cb:inspector-close
 *   - Reagiert auf:  inspector:show:logs  (custom – z.B. wenn Tabs schalten)
 *
 * Garantie
 *   - Wenn Panel vorhanden -> Inside-Render
 *   - Wenn nicht -> Fallback-Floating-Dock
 * ========================================================================== */
(function () {
  "use strict";

  const MOD = "[inspector.logs]";
  const VER = "v18.11.0";

  const log = (t, ...a) => (window.CBLog?.ok || console.log)(`${MOD} ${t}`, ...a);
  const warn = (t, ...a) => (window.CBLog?.warn || console.warn)(`${MOD} ${t}`, ...a);

  // --- STATE ---------------------------------------------------------------
  const state = {
    levels: { ERR: true, WARN: true, OK: true, INFO: true },
    query: "",
    mountedMode: null,          // 'panel' | 'float'
    els: { root: null, pre: null, search: null, levelBtns: {} },
    autoRefreshTimer: null,
  };

  // --------- CBLog Zugriff (robust) ---------------------------------------
  function getLogBuffer() {
    try {
      if (window.CBLog?.getBuffer) return window.CBLog.getBuffer();
      if (Array.isArray(window.CBLog?._buf)) return window.CBLog._buf;
    } catch (_) {}
    return [];
  }

  // --------- Render Utilities ---------------------------------------------
  function makeBtn(txt, title, toggled, onClick, dataset = {}) {
    const b = document.createElement("button");
    b.className = "ins-badge" + (toggled ? " active" : "");
    b.type = "button";
    b.textContent = txt;
    if (title) b.title = title;
    Object.assign(b.dataset, dataset);
    b.addEventListener("click", onClick);
    return b;
  }

  function makeControls(container) {
    // Leiste
    const bar = document.createElement("div");
    bar.className = "ins-logbar";

    // Level-Badges
    const lvWrap = document.createElement("div");
    lvWrap.className = "ins-logbar-left";
    const mkLevel = (key, label) =>
      makeBtn(label, `Level ${label} ein/aus`, state.levels[key], () => {
        state.levels[key] = !state.levels[key];
        state.els.levelBtns[key].classList.toggle("active", state.levels[key]);
        renderLogText();
      });
    state.els.levelBtns.ERR = lvWrap.appendChild(mkLevel("ERR", "ERR"));
    state.els.levelBtns.WARN = lvWrap.appendChild(mkLevel("WARN", "WARN"));
    state.els.levelBtns.OK = lvWrap.appendChild(mkLevel("OK", "OK"));
    state.els.levelBtns.INFO = lvWrap.appendChild(mkLevel("INFO", "INFO"));

    // Suche
    const mid = document.createElement("div");
    mid.className = "ins-logbar-mid";
    const search = document.createElement("input");
    search.type = "search";
    search.className = "ins-search";
    search.placeholder = "Suche…";
    search.addEventListener("input", () => {
      state.query = (search.value || "").trim();
      renderLogText();
    });
    state.els.search = search;
    mid.appendChild(search);

    // Kopieren / Export
    const right = document.createElement("div");
    right.className = "ins-logbar-right";

    right.appendChild(
      makeBtn("Kopieren", "In Zwischenablage", false, async () => {
        try {
          await navigator.clipboard.writeText(state.els.pre?.textContent || "");
          (window.CBLog?.ok || console.log)(`${MOD} kopiert.`);
        } catch (e) {
          warn("Clipboard: " + (e && e.message));
        }
      })
    );
    right.appendChild(
      makeBtn("Export", "Als .log speichern", false, () => {
        const blob = new Blob([state.els.pre?.textContent || ""], {
          type: "text/plain;charset=utf-8",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `siedler-log-${Date.now()}.log`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 500);
      })
    );

    bar.appendChild(lvWrap);
    bar.appendChild(mid);
    bar.appendChild(right);
    container.appendChild(bar);
  }

  function makePre(container) {
    const pre = document.createElement("pre");
    pre.className = "ins-logpre";
    pre.textContent = "Logs werden initialisiert …";
    container.appendChild(pre);
    state.els.pre = pre;
  }

  // --------- Rendering der Logzeilen --------------------------------------
  function lineMatchesFilters(line) {
    // Level Heuristik: [xx:xx:xx] (ERR|WARN|OK|INFO) [...]
    const L = line.toUpperCase();
    const hasErr = L.includes(" ERR ") || L.includes("ERROR") || L.includes("ERR]");
    const hasWarn = L.includes(" WARN ") || L.includes("WARN]");
    const hasOk = L.includes(" OK ") || L.includes(" OK]");
    const hasInfo = L.includes(" INFO ") || L.includes("INFO]");

    if (hasErr && !state.levels.ERR) return false;
    if (hasWarn && !state.levels.WARN) return false;
    if (hasOk && !state.levels.OK) return false;
    if (hasInfo && !state.levels.INFO) return false;

    if (state.query) {
      return L.includes(state.query.toUpperCase());
    }
    return true;
  }

  function renderLogText() {
    if (!state.els.pre) return;
    const buf = getLogBuffer();
    if (!buf || !buf.length) {
      state.els.pre.textContent = "Noch keine Logs …";
      return;
    }

    const out = [];
    for (let i = 0; i < buf.length; i++) {
      const s = String(buf[i] ?? "");
      if (!s) continue;
      if (lineMatchesFilters(s)) out.push(s);
    }
    state.els.pre.textContent = out.join("\n");
    // Auto-Scroll ans Ende
    state.els.pre.scrollTop = state.els.pre.scrollHeight;
  }

  // --------- Mounting: Panel bevorzugt, sonst Floating ---------------------
  function findPanelBody() {
    const root = document.getElementById("inspector");
    if (!root) return null;
    // generischer Body-Container:
    return root.querySelector(".ins-body") || root.querySelector("[data-inspector-body]") || null;
  }

  function unmount() {
    if (state.autoRefreshTimer) {
      clearInterval(state.autoRefreshTimer);
      state.autoRefreshTimer = null;
    }
    if (state.els.root && state.els.root.parentNode) {
      state.els.root.parentNode.removeChild(state.els.root);
    }
    state.els = { root: null, pre: null, search: null, levelBtns: {} };
    state.mountedMode = null;

    // Legacy Floating-Dock ggf. entfernen
    const legacy = document.getElementById("ins-logdock");
    if (legacy && legacy.parentNode) legacy.parentNode.removeChild(legacy);
  }

  function mountInsidePanel(bodyEl) {
    unmount();
    const wrap = document.createElement("div");
    wrap.className = "ins-logwrap";
    makeControls(wrap);
    makePre(wrap);
    bodyEl.innerHTML = "";            // Tab-Inhalt exklusiv
    bodyEl.appendChild(wrap);
    state.els.root = wrap;
    state.mountedMode = "panel";

    // Auto-Refresh wenn offen
    state.autoRefreshTimer = setInterval(renderLogText, 800);
    renderLogText();
    log(`Logs im Panel eingebettet (${VER}).`);
  }

  function mountFloating() {
    unmount();
    const dock = document.createElement("div");
    dock.id = "ins-logdock"; // -> CSS hat Positionierung nur für Fallback!
    dock.className = "ins-logwrap ins-fallback";
    makeControls(dock);
    makePre(dock);
    document.body.appendChild(dock);
    state.els.root = dock;
    state.mountedMode = "float";

    state.autoRefreshTimer = setInterval(renderLogText, 800);
    renderLogText();
    log(`Logs als Floating-Dock eingeblendet (${VER}).`);
  }

  // --------- Router: in Panel oder Fallback --------------------------------
  function showLogs() {
    const body = findPanelBody();
    if (body) mountInsidePanel(body);
    else mountFloating();
  }

  // --------- Event-Wire -----------------------------------------------------
  window.addEventListener("cb:inspector-open", showLogs);
  window.addEventListener("inspector:show:logs", showLogs);

  // Falls der Inspector bereits offen ist (Reload etc.)
  setTimeout(() => {
    const body = findPanelBody();
    if (body && document.getElementById("inspector")?.style?.display !== "none") {
      mountInsidePanel(body);
    }
  }, 200);

  log(`bereit (${VER})`);
})();
