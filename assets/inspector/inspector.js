/* ============================================================================
 * Datei: assets/inspector/inspector.js
 * Projekt: Siedler-Mini — Inspector
 * Version: v18.9.5
 * Changelog:
 *   - FIX: Tabs (Build/Pfade) löschen keine Logs mehr
 *   - Stabiler Log-Puffer in window.__cb._logBuf
 *   - Kopieren/Leeren/Aktualisieren Buttons erhalten
 *   - Tabs: Übersicht, Logs, Build (BUILD_CATEGORIES), Pfade, Tests (stub)
 * CODE-STYLE:
 *   - Keine Fremd-Resets; Inspector kapselt sein DOM
 *   - Events: cb:inspector:open/close, cb:build-select, cb:paths:toggle/reset
 *   - Bridge: window.GameUI.toggleInspector/openInspector/closeInspector
 * ========================================================================== */

(function () {
  const VERSION = "v18.9.5";
  const log = (...a) => (window.CBLog?.log || console.log).call(console, ...a);
  const info = (...a) => (window.CBLog?.info || console.info).call(console, ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn).call(console, ...a);

  // ---------------------------------------------------------------------------
  // 0) Puffer (nie löschen außer über "Leeren"-Button)
  // ---------------------------------------------------------------------------
  const CB = (window.__cb = window.__cb || {});
  CB._logBuf = CB._logBuf || [];           // [{ts:Date, level:'LOG'|'INFO'|'WARN'|'ERR', text:string}]
  CB._logMax = CB._logMax || 400;

  // winzige Proxy-Konsole, falls CBLog fehlt
  if (!window.CBLog) {
    window.CBLog = {
      log: (...a) => { CB._logBuf.push({ ts: new Date(), level: "LOG", text: a.map(String).join(" ") }); cap(); console.log(...a); },
      info: (...a) => { CB._logBuf.push({ ts: new Date(), level: "INFO", text: a.map(String).join(" ") }); cap(); console.info(...a); },
      warn: (...a) => { CB._logBuf.push({ ts: new Date(), level: "WARN", text: a.map(String).join(" ") }); cap(); console.warn(...a); },
      error: (...a) => { CB._logBuf.push({ ts: new Date(), level: "ERR", text: a.map(String).join(" ") }); cap(); console.error(...a); },
      getBuffer: () => CB._logBuf.slice(),
      clear: () => { CB._logBuf.length = 0; }
    };
    info("[CBLog] Polyfill aktiv (Inspector-Fallback)");
  }

  function cap() {
    const over = CB._logBuf.length - CB._logMax;
    if (over > 0) CB._logBuf.splice(0, over);
  }

  // ---------------------------------------------------------------------------
  // 1) Grundgerüst/DOM
  // ---------------------------------------------------------------------------
  let root, panel, bodyEl, footerEl, preLog;

  function ensureDOM() {
    if (root) return;
    root = document.createElement("div");
    root.id = "inspector";
    root.style.cssText =
      "position:fixed;inset:auto 12px 96px 12px;z-index:2147483646;" +
      "max-width:980px;margin:0 auto;left:50%;transform:translateX(-50%);";
    panel = document.createElement("div");
    panel.style.cssText =
      "background:rgba(18,18,18,.96);border:1px solid rgba(255,255,255,.08);" +
      "border-radius:12px;box-shadow:0 30px 80px rgba(0,0,0,.55);" +
      "backdrop-filter:blur(8px);color:#e8e8e8;overflow:hidden";

    // Header
    const head = document.createElement("div");
    head.style.cssText = "display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.06)";
    const hTitle = document.createElement("div");
    hTitle.textContent = `Inspector  ${VERSION}`;
    hTitle.style.cssText = "font-weight:700;opacity:.92";
    const spacer = document.createElement("div"); spacer.style.flex = "1";
    const btnClose = document.createElement("button");
    btnClose.textContent = "Schließen";
    btnClose.style.cssText = "border:none;border-radius:10px;padding:8px 12px;background:rgba(255,255,255,.12);color:#fff;cursor:pointer";
    btnClose.addEventListener("click", close);

    head.appendChild(hTitle);
    head.appendChild(spacer);
    head.appendChild(btnClose);

    // Tabs
    const tabsWrap = document.createElement("div");
    tabsWrap.style.cssText = "display:flex;gap:8px;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.06)";
    const tabs = [
      { id: "overview", label: "Übersicht", render: renderOverview },
      { id: "logs",     label: "Logs",      render: renderLogs },
      { id: "build",    label: "Build",     render: renderBuild },
      { id: "paths",    label: "Pfade",     render: renderPaths },
      { id: "tests",    label: "Tests",     render: renderTests },
    ];
    const tabBtns = new Map();
    function setActive(id) {
      tabs.forEach(t => {
        tabBtns.get(t.id).classList.toggle("active", t.id === id);
      });
    }
    tabs.forEach(t => {
      const b = document.createElement("button");
      b.textContent = t.label;
      b.style.cssText = "border:none;border-radius:999px;padding:8px 12px;background:rgba(255,255,255,.10);color:#ddd;cursor:pointer";
      b.addEventListener("click", () => {
        setActive(t.id);
        t.render();
      });
      tabBtns.set(t.id, b);
      tabsWrap.appendChild(b);
    });

    // Body + Footer
    bodyEl = document.createElement("div");
    bodyEl.style.cssText = "padding:12px;max-height:60vh;overflow:auto";
    footerEl = document.createElement("div");
    footerEl.style.cssText = "display:flex;gap:10px;padding:12px;border-top:1px solid rgba(255,255,255,.06)";

    // Footer-Buttons (werden nur im Log-Tab angezeigt)
    const btnCopy = mkBtn("Kopieren", () => {
      try {
        const txt = formatBuffer(CB._logBuf);
        navigator.clipboard.writeText(txt);
        info("[inspector.core] Logs kopiert");
      } catch (e) { warn("Clipboard fehlgeschlagen:", e?.message); }
    });
    const btnClear = mkBtn("Leeren", () => {
      window.CBLog?.clear?.();
      if (preLog) preLog.textContent = "[Log geleert]";
      info("[inspector.core] Log geleert");
    });
    const btnRefresh = mkBtn("Aktualisieren", () => {
      renderLogs();
    });
    footerEl.appendChild(btnCopy);
    footerEl.appendChild(btnClear);
    footerEl.appendChild(btnRefresh);

    panel.appendChild(head);
    panel.appendChild(tabsWrap);
    panel.appendChild(bodyEl);
    panel.appendChild(footerEl);
    root.appendChild(panel);
    document.body.appendChild(root);

    // Startansicht: Logs
    setActive("logs");
    renderLogs();
  }

  function mkBtn(label, onClick) {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = "border:none;border-radius:10px;padding:8px 12px;background:rgba(255,255,255,.12);color:#fff;cursor:pointer";
    b.addEventListener("click", onClick);
    return b;
  }

  function formatBuffer(arr) {
    const pad = (n) => String(n).padStart(2, "0");
    return (arr || []).map(it => {
      const d = it.ts instanceof Date ? it.ts : new Date(it.ts);
      const hh = pad(d.getHours()), mm = pad(d.getMinutes()), ss = pad(d.getSeconds());
      const level = (it.level || "LOG").toUpperCase().padEnd(4, " ");
      return `[${hh}:${mm}:${ss}] ${level} ${it.text}`;
    }).join("\n");
  }

  // ---------------------------------------------------------------------------
  // 2) Renders
  // ---------------------------------------------------------------------------

  // Übersicht (minimal)
  function renderOverview() {
    bodyEl.innerHTML = "";
    footerEl.style.display = "none";
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:grid;gap:8px";
    wrap.innerHTML = `
      <div style="opacity:.85">Version: <b>${VERSION}</b></div>
      <div style="opacity:.85">Canvas: <span id="ov-canvas">–</span></div>
      <div style="opacity:.85">Map: <span id="ov-map">–</span></div>
    `;
    bodyEl.appendChild(wrap);
    // kleine Live-Daten (sofern vorhanden)
    try {
      const cvs = document.getElementById("game");
      if (cvs) wrap.querySelector("#ov-canvas").textContent = `${cvs.width || cvs.clientWidth}×${cvs.height || cvs.clientHeight}`;
      const mapName = (document.getElementById("game")?.dataset?.map || "–").split("/").pop();
      wrap.querySelector("#ov-map").textContent = mapName;
    } catch {}
  }

  // Logs
  function renderLogs() {
    bodyEl.innerHTML = "";
    footerEl.style.display = "flex";

    preLog = document.createElement("pre");
    preLog.style.cssText =
      "margin:0;padding:12px;background:rgba(10,10,10,.85);border:1px solid rgba(255,255,255,.08);border-radius:10px;" +
      "font-family:ui-monospace, Menlo, Consolas, monospace;font-size:14px;line-height:1.35;color:#e6e6e6;white-space:pre-wrap";

    const buf = window.CBLog?.getBuffer ? window.CBLog.getBuffer() : CB._logBuf.slice();
    preLog.textContent = buf.length ? formatBuffer(buf) : "[Keine Log-Einträge vorhanden]";
    bodyEl.appendChild(preLog);
  }

  // Build (DEIN Code – ohne Log-Reset!)
  function renderBuild() {
    bodyEl.innerHTML = "";
    footerEl.style.display = "none";

    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:10px";

    const cats = (window.BUILD_CATEGORIES && Array.isArray(window.BUILD_CATEGORIES) ? window.BUILD_CATEGORIES : [
      { id:"general", title:"Allg.", items:[
        { id:"hq",    label:"Hauptquartier" },
        { id:"depot", label:"Depot" },
        { id:"house", label:"Haus" },
      ]},
      { id:"production_food", title:"Produktion", items:[
        { id:"farm",    label:"Farm" },
        { id:"fischer", label:"Fischer" },
      ]},
    ]);

    const mkH = (txt)=>{ const h=document.createElement("div"); h.textContent=txt; h.style.cssText="opacity:.8;font-weight:700;margin-top:4px"; return h; };
    const mkBtnLite = (label, disabled=false)=>{
      const b=document.createElement("button");
      b.textContent = label;
      b.disabled = !!disabled;
      b.style.cssText = "border:none;border-radius:999px;padding:6px 10px;margin:4px 6px 0 0;cursor:pointer;" +
        (disabled ? "background:rgba(255,255,255,.06);color:#777;cursor:not-allowed;"
                  : "background:rgba(255,255,255,.10);color:#ddd;");
      return b;
    };

    cats.forEach(cat=>{
      wrap.appendChild(mkH(cat.title || cat.id));
      const row = document.createElement("div");
      row.style.cssText = "display:flex;flex-wrap:wrap";
      (cat.items||[]).forEach(it=>{
        const btn = mkBtnLite(it.label || it.id, !!it.todo);
        if (!it.todo){
          btn.addEventListener("click", ()=>{
            const detail = { type: it.id };
            try { window.dispatchEvent(new CustomEvent("cb:build-select", { detail })); } catch {}
            try { (window.CBLog?.log||console.log)("[ui] Build-Select", it.id); } catch {}
          });
        }
        row.appendChild(btn);
      });
      wrap.appendChild(row);
    });

    bodyEl.appendChild(wrap);
  }

  // Pfade
  function renderPaths() {
    bodyEl.innerHTML = "";
    footerEl.style.display = "none";

    const box = document.createElement("div");
    box.style.cssText = "display:flex;gap:8px;flex-wrap:wrap";

    const mk = (label, fn)=>{
      const b=document.createElement("button");
      b.textContent = label;
      b.style.cssText = "border:none;border-radius:10px;padding:8px 12px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer";
      b.addEventListener("click", fn);
      return b;
    };

    const status = document.createElement("div");
    status.style.cssText = "opacity:.8;margin-top:6px";
    const refreshStatus = ()=>{
      const on = !!(window.__cb && window.__cb.pathsEnabled);
      status.textContent = `Pfade-Overlay: ${on ? "AN" : "AUS"}`;
    };
    refreshStatus();

    box.appendChild(mk("Overlay umschalten", ()=>{
      try { window.dispatchEvent(new CustomEvent("cb:paths:toggle")); } catch {}
      setTimeout(refreshStatus, 50);
    }));
    box.appendChild(mk("Heatmap zurücksetzen", ()=>{
      try { window.dispatchEvent(new CustomEvent("cb:paths:reset")); } catch {}
    }));

    bodyEl.appendChild(box);
    bodyEl.appendChild(status);
  }

  // Tests (Platzhalter)
  function renderTests() {
    bodyEl.innerHTML = "";
    footerEl.style.display = "none";
    const d = document.createElement("div");
    d.textContent = "Tests folgen …";
    d.style.opacity = ".8";
    bodyEl.appendChild(d);
  }

  // ---------------------------------------------------------------------------
  // 3) Öffnen/Schließen + Bridge
  // ---------------------------------------------------------------------------
  function open() {
    ensureDOM();
    root.style.display = "block";
    window.dispatchEvent(new CustomEvent("cb:inspector:open"));
    info("[inspector.core] geöffnet", `(${VERSION})`);
  }

  function close() {
    if (!root) return;
    root.style.display = "none";
    window.dispatchEvent(new CustomEvent("cb:inspector:close"));
  }

  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = function (force) {
    ensureDOM();
    const wantOpen = (typeof force === "boolean") ? force : (root.style.display === "none" || !root.style.display);
    wantOpen ? open() : close();
  };
  window.GameUI.openInspector  = open;
  window.GameUI.closeInspector = close;

  // Beim Laden verfügbar machen (ohne auto-open, um UX ruhig zu halten)
  info("[inspector.core] bereit", `(${VERSION})`);
})();
