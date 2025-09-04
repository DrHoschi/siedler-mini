/* ============================================================================
 * Datei: assets/inspector/inspector.js
 * Projekt: Siedler-Mini — Inspector (Fullscreen)
 * Version: v18.10.3
 *
 * Ziele:
 *  - Vollbild-Overlay (mobile/desktop), Header & Tabs sticky, Footer fix
 *  - Stabile Logs (persistenter Puffer in window.__cb._logBuf)
 *  - Tabs: Übersicht · Logs (mit Filter & Suche) · Build (BUILD_CATEGORIES) · Pfade · Tests
 *  - Keine Log-Löschung beim Tabwechsel
 *  - Öffnen/Schließen via window.GameUI.toggleInspector/openInspector/closeInspector
 *  - Events: cb:inspector:open/close, cb:build-select, cb:paths:toggle/reset
 * ========================================================================== */

(function () {
  const VERSION = "v18.10.3";

  // -- Logging helpers --------------------------------------------------------
  const CB = (window.__cb = window.__cb || {});
  CB._logBuf = CB._logBuf || [];   // [{ ts, level, text }]
  CB._logMax = CB._logMax || 800;

  function push(level, arr) {
    CB._logBuf.push({ ts: new Date(), level, text: arr.map(String).join(" ") });
    const over = CB._logBuf.length - CB._logMax;
    if (over > 0) CB._logBuf.splice(0, over);
  }

  // Fallback-Konsole (falls kein CBLog vorhanden)
  if (!window.CBLog) {
    window.CBLog = {
      log  : (...a) => { push("LOG" , a); console.log (...a); },
      info : (...a) => { push("INFO", a); console.info(...a); },
      warn : (...a) => { push("WARN", a); console.warn(...a); },
      error: (...a) => { push("ERR" , a); console.error(...a); },
      getBuffer: () => CB._logBuf.slice(),
      clear: () => { CB._logBuf.length = 0; }
    };
    (window.CBLog.info || console.info)("[CBLog] Polyfill aktiv (Inspector-Fallback)");
  }

  const log  = (...a) => (window.CBLog.log  || console.log ).apply(console, a);
  const info = (...a) => (window.CBLog.info || console.info).apply(console, a);
  const warn = (...a) => (window.CBLog.warn || console.warn).apply(console, a);

  // -- DOM-Grundgerüst --------------------------------------------------------
  let root, headEl, tabsEl, bodyEl, footerEl, preLog;
  let filterState = { LOG:true, INFO:true, WARN:true, ERR:true, q:"" };

  function ensureDOM() {
    if (root) return;

    // Root + Panel
    root = document.createElement("div");
    root.id = "inspector";
    root.setAttribute("role","dialog");
    root.setAttribute("aria-label","Inspector");
    root.style.display = "none";

    const panel = document.createElement("div");
    panel.style.cssText = "position:absolute;inset:0;display:flex;flex-direction:column";
    root.append(panel);

    // Header
    headEl = document.createElement("div");
    headEl.id = "ins-head";
    const title = document.createElement("div");
    title.id = "ins-title";
    title.textContent = `Inspector v${VERSION}`;
    const closeBtn = document.createElement("button");
    closeBtn.id = "ins-close";
    closeBtn.textContent = "Schließen";
    closeBtn.addEventListener("click", close);
    headEl.append(title, closeBtn);

    // Tabs
    tabsEl = document.createElement("div");
    tabsEl.id = "ins-tabs";

    // Body + Footer
    bodyEl = document.createElement("div");
    bodyEl.id = "ins-body";

    footerEl = document.createElement("div");
    footerEl.id = "ins-foot";

    panel.append(headEl, tabsEl, bodyEl, footerEl);
    document.body.appendChild(root);

    initTabs();
    activateTab("logs");

    // ESC = schließen
    window.addEventListener("keydown", (e)=>{
      if (e.key === "Escape" && root.style.display !== "none") close();
    });
  }

  // -- Utilities --------------------------------------------------------------
  const pad2 = (n)=>String(n).padStart(2,"0");
  function currentBuffer(){ return window.CBLog?.getBuffer ? window.CBLog.getBuffer() : CB._logBuf.slice(); }

  function pill(label, id){
    const b = document.createElement("button");
    b.className = "ins-tab";
    b.textContent = label;
    b.dataset.tab = id;
    b.addEventListener("click", ()=>activateTab(id));
    return b;
  }

  // Pretty-Mapping für bekannte Meldungen
  function labelForBuild(id) {
    try {
      const cats = (window.BUILD_CATEGORIES && Array.isArray(window.BUILD_CATEGORIES)) ? window.BUILD_CATEGORIES : [];
      for (const c of cats) for (const it of (c.items||[])) if (it.id === id) return it.label || id;
    } catch {}
    return id;
  }
  function prettify(text) {
    let m = text.match(/\[ui\]\s+Build-Select\s+(\w[\w-]*)/i);
    if (m) return `[Build] Auswahl: ${labelForBuild(m[1])} (${m[1]})`;
    m = text.match(/\[ui-start\].*Start\s*[→=>]\s*(.+)$/i);
    if (m) return `[Start] Map geladen: ${m[1]}`;
    if (/bootstrap\].*bereits gestartet/i.test(text)) return "[Bootstrap] Bereits aktiv (kein erneuter Start)";
    return text;
  }
  function fmt(arr, pretty){
    return (arr||[]).map(it=>{
      const d = it.ts instanceof Date ? it.ts : new Date(it.ts);
      const ts = `[${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}]`;
      return `${ts} ${String(it.level||"LOG").toUpperCase().padEnd(4," ")} ${pretty?prettify(it.text):it.text}`;
    }).join("\n");
  }

  // -- Tabs -------------------------------------------------------------------
  const TABS = [
    { id:"overview", label:"Übersicht", render: renderOverview },
    { id:"logs"    , label:"Logs"     , render: renderLogs     },
    { id:"build"   , label:"Build"    , render: renderBuild    },
    { id:"paths"   , label:"Pfade"    , render: renderPaths    },
    { id:"tests"   , label:"Tests"    , render: renderTests    },
  ];
  const tabBtn = new Map();

  function initTabs(){
    tabsEl.innerHTML = "";
    TABS.forEach(t=>{
      const b = pill(t.label, t.id);
      tabBtn.set(t.id, b);
      tabsEl.appendChild(b);
    });
  }

  function activateTab(id){
    TABS.forEach(t=>{
      const active = (t.id === id);
      const btn = tabBtn.get(t.id);
      if (btn) btn.classList.toggle("active", active);
    });
    const tab = TABS.find(t=>t.id===id) || TABS[0];
    tab.render();
  }

  // -- Render: Übersicht ------------------------------------------------------
  function renderOverview(){
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

    try {
      const cvs = document.getElementById("game");
      if (cvs) wrap.querySelector("#ov-canvas").textContent =
        `${cvs.width||cvs.clientWidth}×${cvs.height||cvs.clientHeight}`;
      const mapName = (document.getElementById("game")?.dataset?.map || "–").split("/").pop();
      wrap.querySelector("#ov-map").textContent = mapName;
    } catch {}
  }

  // -- Render: Logs (Filter + Suche) -----------------------------------------
  function renderLogs(){
    bodyEl.innerHTML = "";
    footerEl.style.display = "flex";

    // Toolbar
    const tools = document.createElement("div");
    tools.className = "ins-logtools";

    const mkPill = (label, key, cls="")=>{
      const p = document.createElement("button");
      p.className = `ins-pill ${cls}`;
      p.textContent = label;
      p.dataset.key = key;
      p.classList.toggle("active", !!filterState[key]);
      p.addEventListener("click", ()=>{
        filterState[key] = !filterState[key];
        p.classList.toggle("active", !!filterState[key]);
        update();
      });
      return p;
    };

    const pLog  = mkPill("LOG",  "LOG",  "badge-log");
    const pInfo = mkPill("INFO", "INFO", "badge-info");
    const pWarn = mkPill("WARN", "WARN", "badge-warn");
    const pErr  = mkPill("ERR",  "ERR",  "badge-err");

    const q = document.createElement("input");
    q.className = "ins-search";
    q.type = "search";
    q.placeholder = "Suche (Regex oder Text)…";
    q.value = filterState.q || "";
    q.addEventListener("input", ()=>{
      filterState.q = q.value;
      update();
    });

    tools.append(pLog,pInfo,pWarn,pErr,q);
    bodyEl.appendChild(tools);

    // Logbox
    preLog = document.createElement("pre");
    preLog.className = "ins-logbox";
    bodyEl.appendChild(preLog);

    // Footer-Buttons
    footerEl.innerHTML = "";
    const btnCopy = mkBtn("Kopieren", ()=>{
      try {
        navigator.clipboard.writeText(preLog.textContent || "");
        info("[inspector.core] Logs kopiert");
      } catch(e){ warn("Clipboard fehlgeschlagen:", e?.message); }
    });
    const btnClear = mkBtn("Leeren", ()=>{
      window.CBLog?.clear?.();
      update();
      info("[inspector.core] Log geleert");
    });
    const btnRefresh = mkBtn("Aktualisieren", update);
    footerEl.append(btnCopy, btnClear, btnRefresh);

    function mkBtn(label, cb){
      const b = document.createElement("button");
      b.className = "ins-btn";
      b.textContent = label;
      b.addEventListener("click", cb);
      return b;
    }

    function update(){
      // Filter: Level
      let buf = currentBuffer().filter(it => !!filterState[String(it.level||"LOG").toUpperCase()]);
      // Filter: Suche
      if ((filterState.q||"").trim()){
        const q = filterState.q.trim();
        let re = null;
        try { re = new RegExp(q, "i"); } catch { re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"), "i"); }
        buf = buf.filter(it => re.test(it.text));
      }
      preLog.textContent = buf.length ? fmt(buf, true) : "[Keine Log-Einträge vorhanden]";
    }

    update();
  }

  // -- Render: Build ----------------------------------------------------------
  function renderBuild(){
    bodyEl.innerHTML = "";
    footerEl.style.display = "none";

    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:10px";

    const cats = (window.BUILD_CATEGORIES && Array.isArray(window.BUILD_CATEGORIES)
      ? window.BUILD_CATEGORIES
      : [
          { id:"general", title:"Allg.", items:[
            { id:"hq",    label:"Hauptquartier" },
            { id:"depot", label:"Depot" },
            { id:"house", label:"Haus" }
          ]},
          { id:"production_food", title:"Produktion", items:[
            { id:"farm",    label:"Farm" },
            { id:"fischer", label:"Fischer" }
          ]}
        ]);

    const mkH = (txt)=>{ const h=document.createElement("div"); h.textContent=txt; h.style.cssText="opacity:.85;font-weight:700;margin-top:4px"; return h; };
    const mkBtn = (label, disabled=false)=>{
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
        const btn = mkBtn(it.label || it.id, !!it.todo);
        if (!it.todo){
          btn.addEventListener("click", ()=>{
            const detail = { type: it.id };
            try { window.dispatchEvent(new CustomEvent("cb:build-select", { detail })); } catch {}
            try { (window.CBLog?.log||console.log)(`[ui] Build-Select ${it.id}`); } catch {}
          });
        }
        row.appendChild(btn);
      });
      wrap.appendChild(row);
    });

    bodyEl.appendChild(wrap);
  }

  // -- Render: Pfade ----------------------------------------------------------
  function renderPaths(){
    bodyEl.innerHTML = "";
    footerEl.style.display = "none";

    const box = document.createElement("div");
    box.style.cssText = "display:flex;gap:8px;flex-wrap:wrap";

    const mk = (label, fn)=>{
      const b=document.createElement("button");
      b.className = "ins-btn";
      b.textContent = label;
      b.addEventListener("click", fn);
      return b;
    };

    const status = document.createElement("div");
    status.style.cssText = "opacity:.85;margin-top:6px";
    const refreshStatus = ()=>{
      const on = !!(window.__cb && window.__cb.pathsEnabled);
      status.textContent = `Pfade-Overlay: ${on ? "AN" : "AUS"}`;
    };
    refreshStatus();

    box.append(
      mk("Overlay umschalten", ()=>{
        try { window.dispatchEvent(new CustomEvent("cb:paths:toggle")); } catch {}
        setTimeout(refreshStatus, 40);
      }),
      mk("Heatmap zurücksetzen", ()=>{
        try { window.dispatchEvent(new CustomEvent("cb:paths:reset")); } catch {}
      })
    );

    bodyEl.append(box, status);
  }

  // -- Render: Tests (Stub) ---------------------------------------------------
  function renderTests(){
    bodyEl.innerHTML = "";
    footerEl.style.display = "none";
    const d = document.createElement("div");
    d.textContent = "Tests folgen …";
    d.style.opacity = ".85";
    bodyEl.appendChild(d);
  }

  // -- Öffnen/Schließen + Bridge ---------------------------------------------
  function open() {
    ensureDOM();
    root.classList.add("open");
    window.dispatchEvent(new CustomEvent("cb:inspector:open"));
    info("[inspector.core] geöffnet", `v${VERSION}`);
  }

  function close() {
    if (!root) return;
    root.classList.remove("open");
    window.dispatchEvent(new CustomEvent("cb:inspector:close"));
  }

  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = function (force) {
    ensureDOM();
    const isOpen = root.classList.contains("open");
    const wantOpen = (typeof force === "boolean") ? force : !isOpen;
    wantOpen ? open() : close();
  };
  window.GameUI.openInspector  = open;
  window.GameUI.closeInspector = close;

  // Bereitmeldung (kein Auto-Open)
  info("[inspector.core] bereit", `vv${VERSION}`);
})();
