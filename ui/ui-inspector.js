/* ============================================================================
 * Datei    : ui/ui-inspector.js
 * Projekt  : Neue Siedler
 * Version  : v25.10.16-7
 * Zweck    : Inspector-Overlay (Logs/Tests/Ressourcen/Pfade/Editor)
 *            – Toggle-Button robust (immer sichtbar), unabhängig von #ui-root
 *            – Overlay-Fenster viewport-sicher (Portrait & Landscape)
 *            – Close per X / ESC / Klick-außerhalb
 *            – kompakte Darstellung + robuste Fehlerbehandlung
 * Struktur  : (IIFE) Konstanten → Helpers → State → DOM-Aufbau → Events →
 *             Render-Funktionen → Init-Log
 * Events    : emit   cb:inspector:open / cb:inspector:close
 *             listen cb:* / req:*  (Event-Scanner protokolliert)
 * ========================================================================== */

(function(){
  //////////////////////////////////////////////////////////////////////////////
  // [KONSTANTEN / META]
  //////////////////////////////////////////////////////////////////////////////
  const VER  = "v25.10.16-7";
  const TAG  = "[inspector]";
  const ts   = ()=> new Date().toLocaleTimeString();
  const log  = (m)=> (window.CBLog?.ok   || console.log)(`${TAG} ${m}`);
  const warn = (m)=> (window.CBLog?.warn || console.warn)(`${TAG} ${m}`);
  const err  = (m)=> (window.CBLog?.err  || console.error)(`${TAG} ${m}`);

  //////////////////////////////////////////////////////////////////////////////
  // [STATE]
  //////////////////////////////////////////////////////////////////////////////
  let isOpen = false;
  const logStore   = [];   // {t, lvl, msg}
  const eventStore = [];   // {t, type}

  //////////////////////////////////////////////////////////////////////////////
  // [HELPERS]
  //////////////////////////////////////////////////////////////////////////////
  const safeText = (s)=> String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");

  function statusEl(){ return document.getElementById("inspector-status"); }
  function contentEl(){ return document.getElementById("inspector-content"); }

  function showError(e){
    const msg = (e && (e.stack || e.message || String(e))) || "Unbekannter Fehler";
    statusEl() && (statusEl().textContent = "Fehler: " + msg);
    logStore.push({t: ts(), lvl:"err", msg: "Inspector-Render: " + msg});
  }
  function safeRender(tab){ try{ render(tab); } catch(e){ showError(e); } }

  //////////////////////////////////////////////////////////////////////////////
  // [DOM – TOGGLE-BUTTON] (robust: hängt direkt am <body>, mit Inline-Styles)
  //////////////////////////////////////////////////////////////////////////////
  const btn = document.createElement("button");
  btn.id = "inspector-toggle";
  btn.textContent = "Inspector";
  Object.assign(btn.style, {
    position: "fixed",
    right: "calc(12px + env(safe-area-inset-right, 0px))",
    bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
    zIndex: "2147483647",     // über allem
    pointerEvents: "auto",
    padding: "10px 14px",
    border: "none",
    borderRadius: "8px",
    background: "#333",
    color: "#fff",
    fontWeight: "700",
    boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
    cursor: "pointer",
    display: "block",
  });
  document.body.appendChild(btn);

  // Sichtbarkeits-Wächter (iOS Safari, Adressleisten-Shift, Safe-Area)
  function ensureToggleVisible(){
    try{
      const r  = btn.getBoundingClientRect();
      const vw = Math.max(document.documentElement.clientWidth,  window.innerWidth  || 0);
      const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
      let nudged = false;
      if (r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh) {
        btn.style.right  = "12px";
        btn.style.bottom = "12px";
        nudged = true;
      }
      const cs = window.getComputedStyle(btn);
      if (cs.display === "none") { btn.style.setProperty("display","block","important"); nudged = true; }
      if (cs.zIndex !== "2147483647") { btn.style.zIndex = "2147483647"; nudged = true; }
      if (nudged) (window.CBLog?.info || console.info)(`${TAG} Toggle neu positioniert (ensureToggleVisible)`);
    }catch(_){}
  }
  ["load","resize","orientationchange","visibilitychange"].forEach(ev=>{
    window.addEventListener(ev, ensureToggleVisible, { passive: true });
  });
  setTimeout(ensureToggleVisible, 0);

  //////////////////////////////////////////////////////////////////////////////
  // [DOM – OVERLAY + FENSTER] (am <body>, nicht in #ui-root)
  //////////////////////////////////////////////////////////////////////////////
  const wrap = document.createElement("div");
  wrap.id = "inspector";
  wrap.style.pointerEvents = "auto";
  wrap.style.display = "none";   // nie auto-open

  wrap.innerHTML = `
    <div class="window wood-frame">
      <div class="tabs">
        <div class="tab active" data-tab="logs">Logs</div>
        <div class="tab" data-tab="tests">Tests</div>
        <div class="tab" data-tab="res">Ressourcen</div>
        <div class="tab" data-tab="paths">Pfade</div>
        <div class="tab" data-tab="editor">Editor</div>
        <button class="ins-close" title="Schließen" aria-label="Schließen">×</button>
      </div>
      <div class="content" id="inspector-content"></div>
      <div class="statusbar" id="inspector-status">Bereit</div>
    </div>
  `;
  document.body.appendChild(wrap);

  //////////////////////////////////////////////////////////////////////////////
  // [ÖFFNEN / SCHLIESSEN / TABS / SHORTCUTS]
  //////////////////////////////////////////////////////////////////////////////
  function getActiveTab(){
    const t = wrap.querySelector(".tab.active");
    return t ? t.dataset.tab : "logs";
  }

  function openIns(){
    if(isOpen) return;
    isOpen = true;
    wrap.style.display = "block";            // CSS grid: place-items:center
    contentEl().scrollTop = 0;
    window.dispatchEvent(new CustomEvent("cb:inspector:open"));
    log("geöffnet");
    safeRender(getActiveTab());
  }

  function closeIns(){
    if(!isOpen) return;
    isOpen = false;
    wrap.style.display = "none";
    window.dispatchEvent(new CustomEvent("cb:inspector:close"));
    log("geschlossen");
  }

  btn.addEventListener("click", ()=> (isOpen ? closeIns() : openIns()));
  wrap.querySelector(".ins-close").addEventListener("click", closeIns);
  document.addEventListener("keydown", (e)=>{ if(e.key === "Escape" && isOpen) closeIns(); });
  wrap.addEventListener("click", (e)=>{ if(e.target === wrap && isOpen) closeIns(); });

  wrap.querySelectorAll(".tab").forEach(tab=>{
    tab.addEventListener("click", ()=>{
      wrap.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
      tab.classList.add("active");
      safeRender(tab.dataset.tab);
    });
  });

  ["resize","orientationchange","visibilitychange"].forEach(ev=>{
    window.addEventListener(ev, ()=>{ if(isOpen) safeRender(getActiveTab()); }, { passive: true });
  });

  //////////////////////////////////////////////////////////////////////////////
  // [CBLOG-BRIDGE] – Einträge ins Inspector-Log spiegeln
  //////////////////////////////////////////////////////////////////////////////
  if(!window.CBLog){
    window.CBLog = {
      ok  : (m)=> { logStore.push({t:ts(), lvl:"ok"  , msg:String(m)}); console.log(m); },
      info: (m)=> { logStore.push({t:ts(), lvl:"info", msg:String(m)}); console.info(m); },
      warn: (m)=> { logStore.push({t:ts(), lvl:"warn", msg:String(m)}); console.warn(m); },
      err : (m)=> { logStore.push({t:ts(), lvl:"err" , msg:String(m)}); console.error(m); },
    };
  } else {
    ["ok","info","warn","err"].forEach(k=>{
      const prev = window.CBLog[k].bind(window.CBLog);
      window.CBLog[k] = (m)=>{
        logStore.push({t:ts(), lvl:(k==="err"?"err":k), msg:String(m)});
        prev(m);
      };
    });
  }

  //////////////////////////////////////////////////////////////////////////////
  // [EVENT-SCANNER] – cb:* / req:* protokollieren
  //////////////////////////////////////////////////////////////////////////////
  const _dispatch = window.dispatchEvent.bind(window);
  window.dispatchEvent = function(ev){
    try{
      if(ev?.type && (ev.type.startsWith("cb:") || ev.type.startsWith("req:"))){
        eventStore.push({t: ts(), type: ev.type});
        if(isOpen && getActiveTab()==="logs") renderLogs();
        statusEl() && (statusEl().textContent = `Events: ${eventStore.length} — Logs gesamt: ${logStore.length}`);
      }
    } catch(e){ showError(e); }
    return _dispatch(ev);
  };

  //////////////////////////////////////////////////////////////////////////////
  // [RENDER-FUNKTIONEN]
  //////////////////////////////////////////////////////////////////////////////
  function render(tab){
    if(tab === "logs")   return renderLogs();
    if(tab === "tests")  return renderTests();
    if(tab === "res")    return renderRes();
    if(tab === "paths")  return renderPaths();
    if(tab === "editor") return renderEditor();
    contentEl().textContent = "Unbekannter Tab: " + tab;
    statusEl().textContent  = "Tab-Status: " + tab;
  }

  function renderLogs(){
    const rows = logStore.slice(-400).map(r=>{
      const badge =
        r.lvl==="err"  ? "badge-err"  :
        r.lvl==="warn" ? "badge-warn" :
        r.lvl==="ok"   ? "badge-ok"   : "badge-info";
      return `<div class="row">
        <span class="ins-badge ${badge}">${safeText(r.lvl.toUpperCase())}</span>
        <span>${safeText(r.t)}</span>
        <span>${safeText(r.msg)}</span>
      </div>`;
    }).join("");
    contentEl().innerHTML = `<div class="ins-list">${rows || "Bereit"}</div>`;
    statusEl().textContent = `Logs gesamt: ${logStore.length}`;
  }

  function renderTests(){
    contentEl().innerHTML = `
      <div class="ins-list">
        <div class="row"><span class="ins-badge badge-info">ℹ</span>
          <span>Tests folgen – Hook bereit.</span>
        </div>
        <div class="row">
          <button id="btn-run-tests">Alle Tests starten</button>
        </div>
      </div>`;
    statusEl().textContent = `Tests: Placeholder`;
    document.getElementById("btn-run-tests")?.addEventListener("click", ()=>{
      log("Tests gestartet (Stub)");
      logStore.push({t:ts(), lvl:"ok", msg:"Tests gestartet (Stub)"});
      renderLogs();
    });
  }

  function renderRes(){
    contentEl().innerHTML = `
      <div class="ins-list">
        <div class="row"><span class="ins-badge badge-info">ℹ</span>
          <span>Ressourcen-Ansicht bindet sich an cb:res:* an.</span>
        </div>
      </div>`;
    const cnt = eventStore.filter(e=> e.type.startsWith("cb:res")).length;
    statusEl().textContent = `Ressourcen: Live-Events ${cnt}`;
  }

  function renderPaths(){
    contentEl().innerHTML = `
      <div class="ins-list">
        <div class="row"><span class="ins-badge badge-info">ℹ</span>
          <span>Pfade/Overlay-Hooks werden von core/path-overlay.js geliefert.</span>
        </div>
      </div>`;
    const cnt = eventStore.filter(e=> e.type.startsWith("cb:path")).length;
    statusEl().textContent = `Pfade: Events ${cnt}`;
  }

  function renderEditor(){
    contentEl().innerHTML = `
      <div class="ins-list">
        <div class="row"><span class="ins-badge badge-info">ℹ</span>
          <span>Editor-Tab reserviert (Map/Level-Editor UI später hier).</span>
        </div>
      </div>`;
    statusEl().textContent = `Editor: vorbereitet`;
  }

  //////////////////////////////////////////////////////////////////////////////
  // [INIT-LOG]
  //////////////////////////////////////////////////////////////////////////////
  log(`initialisiert – Toggle rechts unten. Close per X / ESC / Klick außerhalb. (${VER})`);
})();
