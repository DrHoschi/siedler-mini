/* ============================================================================
 * Inspector – Kombi-Core (UI + Tabs)
 * Version: v18.5.0
 * CODE_STYLE:
 *   - Defensive (try/catch), niemals werfen
 *   - Saubere Logs über CBLog (Polyfill kompatibel)
 *   - Öffentliche API: window.GameUI.{openInspector,closeInspector,toggleInspector}
 *   - Tabs: Übersicht, Logs, Build, Pfade, Tests
 *   - Fallbacks: funktionieren auch auf Startseite (ohne laufendes Spiel)
 * ========================================================================== */

(function(){
  "use strict";

  // ---- Kurzhelfer ----------------------------------------------------------
  const L = (level, tag, ...a) => {
    try {
      const log = (window.CBLog && CBLog[level]) ? CBLog[level] : console.log;
      log(`[inspector.core] ${tag}`, ...a);
    } catch(_){}
  };
  const ok   = (...a)=>L("ok",   ...a);
  const info = (...a)=>L("info", ...a);
  const warn = (...a)=>L("warn", ...a);

  const VERSION = "v18.5.0";

  // ---- Root & Minimal-Styles (Failsafe) ------------------------------------
  let root, tabsEl, bodyEl, logBox, overviewBox, buildBox, pathsBox, testsBox, copyBtn, closeBtn, verBadge;

  function ensureRoot(){
    if (root && root.isConnected) return root;

    root = document.getElementById("inspector");
    if (!root){
      root = document.createElement("div");
      root.id = "inspector";
      root.setAttribute("role","dialog");
      // Failsafe-Styles: stören dein CSS nicht, sichern aber Sichtbarkeit
      root.style.cssText = [
        "position:fixed","left:50%","top:14%","transform:translateX(-50%)",
        "width:min(960px, 92vw)","max-height:72vh","overflow:hidden",
        "background:rgba(18,18,19,.96)","border:1px solid rgba(255,255,255,.08)",
        "border-radius:12px","box-shadow:0 30px 80px rgba(0,0,0,.55)",
        "backdrop-filter:blur(8px)","color:#eee","z-index:2147483646",
        "display:none"
      ].join(";");

      document.body.appendChild(root);
    }
    root.innerHTML = `
      <div id="insp-head" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08)">
        <div style="font-weight:800;letter-spacing:.2px">Inspector</div>
        <small id="insp-ver" style="opacity:.6">${VERSION}</small>
        <div style="flex:1"></div>
        <button id="insp-close" style="border:none;border-radius:10px;padding:6px 10px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer">Schließen</button>
      </div>
      <div id="insp-tabs" style="display:flex;flex-wrap:wrap;gap:8px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06)">
        ${["Übersicht","Logs","Build","Pfade","Tests"].map((t,i)=>(
          `<button data-tab="${t.toLowerCase()}" class="insp-tab${i===1?" active":""}" style="border:none;border-radius:999px;padding:6px 12px;background:${i===1?"rgba(76,175,80,.25)":"rgba(255,255,255,.12)"};color:#fff;cursor:pointer;font-size:13px">${t}</button>`
        )).join("")}
      </div>
      <div id="insp-body" style="padding:12px 14px;overflow:auto;max-height:calc(72vh - 112px)">
        <div id="pane-uebersicht" style="display:none"></div>
        <div id="pane-logs"></div>
        <div id="pane-build" style="display:none"></div>
        <div id="pane-pfade" style="display:none"></div>
        <div id="pane-tests" style="display:none"></div>
      </div>
      <div id="insp-foot" style="padding:10px 14px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:10px;align-items:center">
        <button id="insp-copy" style="border:none;border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer">Kopieren</button>
        <span id="insp-footmsg" style="opacity:.6;font-size:12px"></span>
      </div>
    `;

    tabsEl      = root.querySelector("#insp-tabs");
    bodyEl      = root.querySelector("#insp-body");
    overviewBox = root.querySelector("#pane-uebersicht");
    logBox      = root.querySelector("#pane-logs");
    buildBox    = root.querySelector("#pane-build");
    pathsBox    = root.querySelector("#pane-pfade");
    testsBox    = root.querySelector("#pane-tests");
    copyBtn     = root.querySelector("#insp-copy");
    closeBtn    = root.querySelector("#insp-close");
    verBadge    = root.querySelector("#insp-ver");

    // Grundlayout Inhalt
    logBox.innerHTML = buildLogPane();
    buildBox.innerHTML = buildBuildPane();
    pathsBox.innerHTML = buildPathsPane();
    testsBox.innerHTML = buildTestsPane();
    overviewBox.innerHTML = buildOverviewPane();

    bindUI();
    return root;
  }

  // ---- TABS: Layout --------------------------------------------------------
  function buildOverviewPane(){
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
        <div class="card"><div class="k">FPS</div><div class="v" id="ov-fps">–</div></div>
        <div class="card"><div class="k">Canvas</div><div class="v" id="ov-canvas">–</div></div>
        <div class="card"><div class="k">Map</div><div class="v" id="ov-map">–</div></div>
        <div class="card"><div class="k">Engine</div><div class="v" id="ov-engine">–</div></div>
      </div>
      <style>
        #inspector .card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);
          border-radius:10px;padding:10px}
        #inspector .k{opacity:.7;font-size:12px;margin-bottom:4px}
        #inspector .v{font-weight:700;letter-spacing:.2px}
      </style>
    `;
  }

  function buildLogPane(){
    return `
      <div style="display:flex;flex-direction:column;gap:10px">
        <pre id="insp-log" style="margin:0;padding:12px;border-radius:8px;background:#111;min-height:200px;color:#cfd3d6;overflow:auto;white-space:pre-wrap">[Log wird geladen…]</pre>
      </div>
    `;
  }

  function buildBuildPane(){
    return `
      <div class="card">
        <div class="k">Aktuelles Build-Tool</div>
        <div class="v" id="build-current">–</div>
      </div>
    `;
  }

  function buildPathsPane(){
    return `
      <div class="card">
        <div class="k">Heatmap-Max</div>
        <div class="v" id="pf-heatmax">–</div>
      </div>
      <div class="card" style="margin-top:10px">
        <div class="k">Letzte Pfade</div>
        <ul id="pf-last" style="margin:6px 0 0;padding-left:18px;max-height:220px;overflow:auto"></ul>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px;align-items:center">
        <label style="display:flex;gap:6px;align-items:center;opacity:.9">
          <input type="checkbox" id="pf-toggle" />
          Pfad-Overlay anzeigen
        </label>
      </div>
    `;
  }

  function buildTestsPane(){
    return `
      <div class="card">
        <div class="k">Tests</div>
        <div style="display:flex;gap:8px;margin-top:6px">
          <button id="tests-run" style="border:none;border-radius:8px;padding:8px 10px;background:rgba(120,200,255,.18);color:#fff;cursor:pointer">Alle Tests ausführen</button>
        </div>
        <pre id="tests-out" style="margin:10px 0 0;padding:10px;border-radius:8px;background:#111;color:#cfd3d6;min-height:120px;white-space:pre-wrap">Bereit.</pre>
      </div>
    `;
  }

  // ---- State ----------------------------------------------------------------
  let isOpen = false;
  let fpsLoopId = 0;
  let fpsAvg = 0;
  let lastBuildTool = "–";
  const lastPaths = [];

  // ---- FPS ------------------------------------------------------------------
  function startFPS(){
    stopFPS();
    let last = performance.now(), acc=0, frames=0;
    function loop(t){
      const dt = t - last; last = t;
      acc += dt; frames++;
      if (acc >= 500){
        const fps = (1000*frames/acc);
        fpsAvg = Math.round(fps);
        const el = root?.querySelector("#ov-fps");
        if (el) el.textContent = `${fpsAvg}`;
        acc = 0; frames = 0;
      }
      fpsLoopId = requestAnimationFrame(loop);
    }
    fpsLoopId = requestAnimationFrame(loop);
  }
  function stopFPS(){
    if (fpsLoopId) cancelAnimationFrame(fpsLoopId);
    fpsLoopId = 0;
  }

  // ---- Logs -----------------------------------------------------------------
  function refreshLogs(){
    try{
      const pre = root?.querySelector("#insp-log");
      if (!pre) return;

      // Versuche zuerst gepufferten Log-Stream
      if (window.CBLog?.getBuffer){
        const buf = CBLog.getBuffer(); // Array<string>
        pre.textContent = buf && buf.length ? buf.join("\n") : "[Keine Log-Einträge vorhanden]";
        return;
      }

      // Fallback: interne Sammelstelle (Polyfill schreibt oft auf window.__cbLogBuf)
      const poly = (window.__cbLogBuf || window.__cb?.logBuffer);
      if (Array.isArray(poly) && poly.length){
        pre.textContent = poly.join("\n");
      } else {
        pre.textContent = "[Keine Log-Einträge vorhanden]";
      }
    } catch(e){
      warn("logs.refresh.fail", e?.message||e);
    }
  }

  // Live mitlauschen (wenn Polyfill Events feuert)
  function bindLogStream(){
    try{
      if (window.CBLog?.on){
        CBLog.on("append", refreshLogs);
      }
      addEventListener("cb:log-append", refreshLogs);
    }catch(_){}
  }

  // ---- Übersicht füllen -----------------------------------------------------
  function fillOverview(){
    try{
      const cvs = document.getElementById("game");
      const mapName = (cvs?.dataset?.map || "").split("/").pop() || "–";
      const size = cvs ? `${cvs.width || cvs.clientWidth || 0}×${cvs.height || cvs.clientHeight || 0}` : "–";
      const engine = [
        (window.__cb && (window.__cb.engineVersion||window.__cb.indexVersion)) || "",
        (window.Renderer && Renderer.VERSION) || ""
      ].filter(Boolean).join(" / ") || "–";

      const $ = s=>root?.querySelector(s);
      $("#ov-map").textContent = mapName;
      $("#ov-canvas").textContent = size;
      $("#ov-engine").textContent = engine;
    }catch(e){
      warn("overview.fill.fail", e?.message||e);
    }
  }

  // ---- Build-Tab: aktuelles Tool -------------------------------------------
  function setBuildToolName(name){
    lastBuildTool = name || "–";
    const el = root?.querySelector("#build-current");
    if (el) el.textContent = lastBuildTool;
  }
  function bindBuildEvents(){
    addEventListener("cb:build-select", (ev)=>{
      try{
        const type = ev?.detail?.type || ev?.detail || "–";
        ok("build.select", type);
        setBuildToolName(type);
      }catch(_){}
    }, { passive:true });
  }

  // ---- Pfade-Tab ------------------------------------------------------------
  function tryGetPathStats(){
    try{
      if (window.PathOverlay?.getStats) return PathOverlay.getStats();
      if (window.OverlayHooks?.getStats) return OverlayHooks.getStats();
    }catch(_){}
    return null;
  }
  function setPathOverlayEnabled(on){
    try{
      if (window.PathOverlay?.setEnabled) return PathOverlay.setEnabled(!!on);
      if (window.OverlayHooks?.set) return OverlayHooks.set("paths", !!on);
    }catch(_){}
  }
  function pushLastPath(entry){
    lastPaths.unshift(entry);
    if (lastPaths.length > 20) lastPaths.pop();
    const ul = root?.querySelector("#pf-last");
    if (!ul) return;
    ul.innerHTML = lastPaths.map(p=>`<li>${p}</li>`).join("");
  }
  function updatePathPane(){
    const stats = tryGetPathStats();
    const heatEl = root?.querySelector("#pf-heatmax");
    if (!heatEl) return;
    if (stats && typeof stats.heatMax !== "undefined"){
      heatEl.textContent = String(stats.heatMax);
    } else {
      heatEl.textContent = "Keine Daten";
    }
  }
  // Falls dein Overlay Events feuert (hier defensiv generisch):
  function bindPathEvents(){
    addEventListener("pf:path-computed", (ev)=>{
      const d = ev?.detail || {};
      const from = d.from ? `${d.from.x},${d.from.y}` : "?";
      const to   = d.to   ? `${d.to.x},${d.to.y}`   : "?";
      const len  = (d.length != null) ? d.length : (d.path?.length ?? "?");
      pushLastPath(`Pfad ${from} → ${to} (L=${len})`);
      updatePathPane();
    }, { passive:true });
  }

  // ---- Tests ----------------------------------------------------------------
  function runTests(){
    const out = root?.querySelector("#tests-out");
    if (!out) return;
    try{
      if (window.InspectorTests?.runAll){
        out.textContent = "Läuft…";
        Promise.resolve(window.InspectorTests.runAll()).then(res=>{
          out.textContent = (typeof res === "string") ? res : JSON.stringify(res,null,2);
        }).catch(e=>{
          out.textContent = "Fehler: " + (e?.message||e);
        });
      } else {
        out.textContent = "Keine Tests gefunden (assets/inspector/inspector.tests.js).";
      }
    }catch(e){
      out.textContent = "Fehler: " + (e?.message||e);
    }
  }

  // ---- UI-Binding -----------------------------------------------------------
  function bindUI(){
    // Tab-Switch
    tabsEl.addEventListener("click", (ev)=>{
      const btn = ev.target.closest("button[data-tab]");
      if (!btn) return;
      tabsEl.querySelectorAll("button").forEach(b=>{
        b.classList.toggle("active", b===btn);
        b.style.background = b===btn ? "rgba(76,175,80,.25)" : "rgba(255,255,255,.12)";
      });
      const tab = btn.dataset.tab;
      bodyEl.querySelectorAll("[id^='pane-']").forEach(p=>p.style.display="none");
      const pane = bodyEl.querySelector(`#pane-${tab}`);
      if (pane) pane.style.display = "";

      // Tab-spezifische Refreshes
      if (tab==="logs") refreshLogs();
      if (tab==="uebersicht") fillOverview();
      if (tab==="pfade") updatePathPane();
    }, { passive:true });

    // Copy
    copyBtn.addEventListener("click", ()=>{
      try{
        const txt = root.querySelector("#insp-log")?.textContent || "";
        navigator.clipboard?.writeText(txt);
        const msg = root.querySelector("#insp-footmsg");
        if (msg){ msg.textContent = "Logs kopiert"; setTimeout(()=>msg.textContent="", 1200); }
      }catch(_){}
    });

    // Close
    closeBtn.addEventListener("click", ()=> close());

    // Pfad-Overlay Toggle
    root.querySelector("#pf-toggle")?.addEventListener("change", (ev)=>{
      setPathOverlayEnabled(ev.target.checked);
    });

    // Tests
    root.querySelector("#tests-run")?.addEventListener("click", runTests);
  }

  // ---- Öffnen/Schließen -----------------------------------------------------
  function open(){
    ensureRoot();
    root.style.display = "block";
    isOpen = true;
    verBadge.textContent = VERSION;

    // Startzustand: auf Logs
    tabsEl.querySelector("button[data-tab='logs']")?.click();

    // Live-Features
    startFPS();
    bindLogStream();
    refreshLogs();
    fillOverview();
    updatePathPane();

    (CBLog?.ok || console.log)(`[inspector.core] geöffnet (${VERSION})`);
  }
  function close(){
    if (!root) return;
    root.style.display = "none";
    isOpen = false;
    stopFPS();
    (CBLog?.ok || console.log)(`[inspector.core] geschlossen`);
  }
  function toggle(force){
    if (typeof force === "boolean"){
      force ? open() : close();
      return;
    }
    isOpen ? close() : open();
  }

  // ---- Public API für FAB/Bridge -------------------------------------------
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = toggle;
  window.GameUI.openInspector   = open;
  window.GameUI.closeInspector  = close;

  // ---- Initial: bereit & Fallback öffnen per ?inspector=1 -------------------
  try{
    (CBLog?.ok || console.log)(`[inspector.core] bereit (${VERSION})`);

    // Build-Events & Pfad-Events
    bindBuildEvents();
    bindPathEvents();

    // Direkt öffnen, wenn gewünscht
    if (location.search.indexOf("inspector=1") !== -1){
      setTimeout(open, 80);
    }
  } catch(_){}

  // ---- Öffentliche Helfer für andere Module --------------------------------
  // Wird vom Build-UI benutzt, falls GameUI nicht greift:
  window.__inspSetBuildTool = setBuildToolName;

})();
