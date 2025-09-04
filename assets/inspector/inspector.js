<!-- assets/inspector/inspector.js — v18.7.0
     CODE_STYLE:
       - Selbstheilend (keine harten Abhängigkeiten)
       - Saubere Events + Daten-Refresh
       - Tabs: Übersicht, Logs, Build, Pfade, Tests
       - Logs: stabil via LogStream.start() + Polyfill-Buffer
-->
<script>
(function(){
  const VERS = "v18.7.0";
  const log  = (t,...a)=> (window.CBLog?.info||console.log)(`[inspector.core] ${t}`,...a);

  // ---------- Mini-Utils ----------
  const $  = (s, r=document)=> r.querySelector(s);
  const $$ = (s, r=document)=> Array.from(r.querySelectorAll(s));
  const fmt = {
    int: (n)=> (n==null? "–" : (n|0).toLocaleString()),
    f1:  (n)=> (n==null? "–" : Number(n).toFixed(1)),
    ms:  (n)=> (n==null? "–" : `${(n|0)} ms`),
    s:   (n)=> (n==null? "–" : `${(n|0)} s`),
    pct: (n)=> (n==null? "–" : `${Number(n).toFixed(0)} %`),
    dim: (w,h)=> (w&&h? `${w}×${h}` : "–"),
  };

  // ---------- Host-Refs (defensiv) ----------
  const Host = {
    canvas: document.getElementById("game") || $("canvas"),
    core:   window.CoreRender || window.Renderer || {},
    map:    window.CoreMap || {},
    ents:   window.Entities || window.CoreEntities || {},
    input:  window.CoreInput || {},
    cam:    window.Camera || (window.CoreRender && window.CoreRender.camera) || {},
    paths:  window.PathIndex || {},
    hooks:  window.OverlayHooks || {},
  };

  // ---------- State ----------
  let panel, tabsBar, bodyEl, footerEl, logBox;
  let activeTab = "logs";
  let fpsTicker = { last: performance.now(), frames: 0, fps: 0 };
  let overviewTimer = null, pathTimer = null;

  // ---------- UI Scaffold ----------
  function ensurePanel(){
    if ($("#inspector")) return $("#inspector");
    const el = document.createElement("div");
    el.id = "inspector";
    el.setAttribute("role","dialog");
    el.style.cssText = `
      position:fixed; left:50%; top:14vh; transform:translateX(-50%);
      width:min(920px, 92vw); max-height:72vh; overflow:hidden;
      background:linear-gradient(180deg, rgba(18,18,18,.98), rgba(16,16,16,.96));
      border:1px solid rgba(255,255,255,.08); border-radius:12px;
      box-shadow:0 24px 80px rgba(0,0,0,.55); z-index:2147483646; color:#eaeaea;
      backdrop-filter: blur(8px);
      display:none;
    `;
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06)">
        <div style="font-weight:700;letter-spacing:.25px">Inspector</div>
        <div style="opacity:.65;font-size:12px">${VERS}</div>
        <div style="flex:1"></div>
        <button id="insp-close" style="border:none;border-radius:10px;padding:6px 10px;background:rgba(255,255,255,.12);color:#fff;cursor:pointer">Schließen</button>
      </div>

      <div id="insp-tabs" style="display:flex;gap:8px;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.06)">
        ${["Übersicht","Logs","Build","Pfade","Tests"].map(makeTabBtn).join("")}
      </div>

      <div id="insp-body" style="padding:10px;overflow:auto;max-height:48vh;">
        <pre id="insp-logbox" style="display:none;background:#0e0f10;border:1px solid rgba(255,255,255,.06);border-radius:8px;color:#cfe4da;padding:10px;white-space:pre-wrap;word-break:break-word;min-height:220px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.2)"></pre>
        <div id="insp-overview" style="display:none"></div>
        <div id="insp-build" style="display:none;opacity:.8">[Build-Panel – Inhalte folgen]</div>
        <div id="insp-paths" style="display:none"></div>
        <div id="insp-tests" style="display:none;opacity:.8">[Tests – Inhalte folgen]</div>
      </div>

      <div id="insp-foot" style="display:flex;gap:10px;padding:10px;border-top:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02)">
        <button id="insp-clear"  class="insp-btn">Leeren</button>
        <button id="insp-copy"   class="insp-btn">Kopieren</button>
        <button id="insp-refresh" class="insp-btn" style="margin-left:auto">Aktualisieren</button>
      </div>
    `;
    document.body.appendChild(el);

    // button style
    $$(".insp-btn", el).forEach(b=>{
      b.style.border="none";
      b.style.borderRadius="10px";
      b.style.padding="8px 12px";
      b.style.background="rgba(255,255,255,.10)";
      b.style.color="#fff";
      b.style.cursor="pointer";
    });

    // tab click
    $$(".insp-tab", el).forEach(b=>{
      b.addEventListener("click", ()=>{
        setActiveTab(b.dataset.tab);
      }, {passive:true});
    });

    $("#insp-close", el).addEventListener("click", close, {passive:true});
    $("#insp-clear", el).addEventListener("click", clearLogs, {passive:true});
    $("#insp-copy", el).addEventListener("click", copyLogs, {passive:true});
    $("#insp-refresh", el).addEventListener("click", refreshActive, {passive:true});

    panel   = el;
    tabsBar = $("#insp-tabs", el);
    bodyEl  = $("#insp-body", el);
    footerEl= $("#insp-foot", el);
    logBox  = $("#insp-logbox", el);

    log("bereit", VERS);
    return el;
  }
  function makeTabBtn(label){
    const id = label.toLowerCase();
    return `<button class="insp-tab" data-tab="${id}"
              style="border:none;border-radius:999px;padding:6px 12px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer">${label}</button>`;
  }
  function markActive(tab){
    $$(".insp-tab", panel).forEach(b=>{
      const on = b.dataset.tab===tab;
      b.style.background = on? "rgba(102,182,121,.25)" : "rgba(255,255,255,.10)";
    });
  }

  // ---------- Open/Close ----------
  function open(){
    ensurePanel();
    panel.style.display="block";
    setActiveTab(activeTab||"logs");
    // immer Log-Stream aktivieren (zeigt sofort vorhandenen Buffer)
    startLogStream();
    (window.CBLog?.info||console.log)(`[inspector.core] geöffnet (${VERS})`);
  }
  function close(){
    if (!panel) return;
    panel.style.display="none";
    stopLiveTimers();
    (window.CBLog?.info||console.log)(`[inspector.core] geschlossen`);
  }

  // ---------- Tabs ----------
  function setActiveTab(tab){
    activeTab = tab;
    markActive(tab);
    // hide all
    $("#insp-overview").style.display = "none";
    $("#insp-logbox").style.display   = "none";
    $("#insp-build").style.display    = "none";
    $("#insp-paths").style.display    = "none";
    $("#insp-tests").style.display    = "none";

    stopLiveTimers();

    switch(tab){
      case "übersicht":
        $("#insp-overview").style.display="block";
        renderOverview();
        overviewTimer = setInterval(renderOverview, 500);
        footerEl.style.display = "none";
        break;
      case "logs":
        $("#insp-logbox").style.display="block";
        refreshLogs();
        footerEl.style.display = "flex";
        break;
      case "build":
        $("#insp-build").style.display="block";
        footerEl.style.display = "none";
        break;
      case "pfade":
        $("#insp-paths").style.display="block";
        renderPaths();
        pathTimer = setInterval(renderPaths, 1000);
        footerEl.style.display = "none";
        break;
      case "tests":
        $("#insp-tests").style.display="block";
        footerEl.style.display = "none";
        break;
    }
  }
  function stopLiveTimers(){
    if (overviewTimer){ clearInterval(overviewTimer); overviewTimer=null; }
    if (pathTimer){ clearInterval(pathTimer); pathTimer=null; }
  }

  // ---------- Logs ----------
  function startLogStream(){
    try {
      // globaler Stream bevorzugt
      if (window.LogStream && typeof window.LogStream.start === "function"){
        window.LogStream.start();
      }
    } catch(e){
      console.warn("[inspector] LogStream.start Fehler:", e);
    }
  }
  function getLogBuffer(){
    // Priorität: LogStream.getBuffer → CBLog.getBuffer → Polyfill __buf
    try {
      if (window.LogStream?.getBuffer) return window.LogStream.getBuffer();
      if (window.CBLog?.getBuffer)     return window.CBLog.getBuffer();
      if (window.CBLog?.__buf)         return window.CBLog.__buf;
    } catch(_){}
    return [];
  }
  function refreshLogs(){
    const lines = getLogBuffer();
    if (!lines || lines.length===0){
      logBox.textContent = "[Keine Log-Einträge vorhanden]";
      return;
    }
    logBox.textContent = lines.join("\n");
    logBox.scrollTop = logBox.scrollHeight;
  }
  function clearLogs(){
    try {
      window.LogStream?.clear?.();
      window.CBLog?.clear?.();
      if (window.CBLog) window.CBLog.__buf = [];
    } catch(_){}
    refreshLogs();
  }
  async function copyLogs(){
    try {
      const txt = logBox.textContent || "";
      await navigator.clipboard.writeText(txt);
      (window.CBLog?.info||console.log)("[inspector.core] Logs kopiert");
    } catch(e){
      alert("Kopieren fehlgeschlagen: "+e.message);
    }
  }
  function refreshActive(){
    if (activeTab==="logs") refreshLogs();
    if (activeTab==="übersicht") renderOverview(true);
    if (activeTab==="pfade") renderPaths(true);
  }

  // ---------- Übersicht (live) ----------
  function sampleFPS(){
    const now = performance.now();
    fpsTicker.frames++;
    if (now - fpsTicker.last >= 500){
      fpsTicker.fps = fpsTicker.frames * 1000 / (now - fpsTicker.last);
      fpsTicker.frames = 0;
      fpsTicker.last = now;
    }
    return fpsTicker.fps;
  }
  function renderOverview(force){
    const el = $("#insp-overview");
    const cvs = Host.canvas;
    const cam = Host.core?.camera || Host.cam || {};
    const run = window.GameBoot?.uptime ? window.GameBoot.uptime() : (performance.now()/1000);

    const data = {
      fps: sampleFPS(),
      canvas: cvs ? {w: cvs.width|0, h: cvs.height|0} : {w: null, h: null},
      map: window.__cb?.currentMap || Host.map?.current?.name || (cvs?.dataset?.map) || "unbekannt",
      zoom: cam?.zoom ?? Host.core?.zoom ?? null,
      camX: cam?.x ?? null,
      camY: cam?.y ?? null,
      ents: (Host.ents?.count && Host.ents.count()) || Host.ents?.list?.length || null,
      uptime: run
    };

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
        ${card("FPS", fmt.f1(data.fps))}
        ${card("Canvas", fmt.dim(data.canvas.w, data.canvas.h))}
        ${card("Map", data.map)}
        ${card("Zoom", data.zoom==null?"–":fmt.f1(data.zoom))}
        ${card("Kamera", (data.camX==null||data.camY==null)?"–":`${data.camX|0}, ${data.camY|0}`)}
        ${card("Entities", fmt.int(data.ents))}
        ${card("Uptime", fmt.s(data.uptime))}
      </div>
    `;
    function card(title, val){
      return `<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px">
        <div style="opacity:.75;font-size:12px">${title}</div>
        <div style="font-size:16px;font-weight:700;margin-top:4px">${val}</div>
      </div>`;
    }
  }

  // ---------- Pfade (live) ----------
  function renderPaths(){
    const box = $("#insp-paths");
    const stats = Host.paths?.getStats?.() || Host.hooks?.getPathStats?.() || {};
    const recent = Host.paths?.getRecent?.(10) || Host.hooks?.getRecentPaths?.(10) || [];

    const head = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:10px">
        ${kpi("Heatmap-Max", fmt.int(stats.heatMax))}
        ${kpi("Nodes gesamt", fmt.int(stats.nodeCount))}
        ${kpi("Letzter Rebuild", stats.lastRebuild ? new Date(stats.lastRebuild).toLocaleTimeString() : "–")}
      </div>
    `;

    const list = (recent.length? recent.map(row=>{
      const a = row?.from ? `${row.from.x|0},${row.from.y|0}` : "–";
      const b = row?.to   ? `${row.to.x|0},${row.to.y|0}`     : "–";
      const L = row?.length ?? row?.steps?.length ?? null;
      return `<div style="display:grid;grid-template-columns:100px 22px 1fr 80px;gap:8px;padding:8px;border-bottom:1px dashed rgba(255,255,255,.06)">
        <div>${a}</div><div>→</div><div>${b}</div><div style="text-align:right">${fmt.int(L)}</div>
      </div>`;
    }).join("") : `<div style="opacity:.7">Keine Pfade registriert.</div>`);

    box.innerHTML = head + `
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;overflow:hidden">
        <div style="padding:8px 10px;opacity:.8;border-bottom:1px solid rgba(255,255,255,.06)">Letzte Pfade</div>
        <div>${list}</div>
      </div>
    `;

    function kpi(title, val){
      return `<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px">
        <div style="opacity:.75;font-size:12px">${title}</div>
        <div style="font-size:16px;font-weight:700;margin-top:4px">${val}</div>
      </div>`;
    }
  }

  // ---------- Public Bridge ----------
  ensurePanel();
  function toggle(force){
    const wantOpen = force==null ? panel.style.display==="none" : !!force;
    if (wantOpen) open(); else close();
  }
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = toggle;
  window.GameUI.openInspector   = open;
  window.GameUI.closeInspector  = close;

  // Auto-open bei ?inspector=1
  try {
    if (location.search.indexOf("inspector=1")!==-1){
      setTimeout(open, 80);
    }
  } catch(_){}

  log("geladen", VERS);
})();
</script>
