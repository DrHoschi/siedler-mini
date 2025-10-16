/* ============================================================================
 * Datei   : ui/ui-inspector.js
 * Projekt : Neue Siedler
 * Version : v25.10.16-2
 * Zweck   : Inspector – Overlay mit Tabs, Close-[X], ESC & Klick-außerhalb
 * ============================================================================
 */
(function(){
  const Log = (m)=> (window.CBLog?.ok || console.log)(`[inspector] ${m}`);
  const root = document.getElementById("ui-root");

  // --- Toggle-Button (unten rechts) -----------------------------------------
  const btn = document.createElement("button");
  btn.id = "inspector-toggle";
  btn.textContent = "Inspector";
  root.appendChild(btn);

  // --- Overlay + Fenster -----------------------------------------------------
  const wrap = document.createElement("div"); wrap.id = "inspector";
  wrap.innerHTML = `
    <div class="window wood-frame">
      <div class="tabs">
        <div class="tab active" data-tab="logs">Logs</div>
        <div class="tab" data-tab="tests">Tests</div>
        <div class="tab" data-tab="res">Ressourcen</div>
        <div class="tab" data-tab="paths">Pfade</div>
        <div class="tab" data-tab="editor">Editor</div>
        <div class="spacer" style="flex:1"></div>
        <button class="ins-close" title="Schließen" aria-label="Schließen">×</button>
      </div>
      <div class="content" id="inspector-content"></div>
      <div class="statusbar" id="inspector-status">Bereit</div>
    </div>
  `;
  root.appendChild(wrap);

  // Close-Button style minimal ergänzen:
  const style = document.createElement("style");
  style.textContent = `
    #inspector .tabs{ align-items:center; }
    #inspector .ins-close{
      margin: 0 8px; padding: 4px 10px; border:none; border-radius:6px;
      background:#444; color:#fff; cursor:pointer; font-size:18px; line-height:1;
    }
    #inspector .ins-close:hover{ background:#666; }
  `;
  document.head.appendChild(style);

  const content = () => document.getElementById("inspector-content");
  const status  = () => document.getElementById("inspector-status");

  // --- State ----------------------------------------------------------------
  let isOpen = false;
  let logStore = [];     // {t, lvl, msg}
  let eventStore = [];   // {t, type}

  // --- Tabs -----------------------------------------------------------------
  wrap.querySelectorAll(".tab").forEach(tab=>{
    tab.addEventListener("click", ()=>{
      wrap.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
      tab.classList.add("active");
      render(tab.dataset.tab);
    });
  });

  // --- Toggle ---------------------------------------------------------------
  function openIns(){ isOpen=true;  wrap.style.display="block"; window.dispatchEvent(new CustomEvent("cb:inspector:open"));  Log("geöffnet"); render(getActiveTab()); }
  function closeIns(){ isOpen=false; wrap.style.display="none";  window.dispatchEvent(new CustomEvent("cb:inspector:close")); Log("geschlossen"); }
  btn.addEventListener("click", ()=> isOpen ? closeIns() : openIns());

  // Close per X
  wrap.querySelector(".ins-close").addEventListener("click", closeIns);

  // Close per ESC
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape" && isOpen) closeIns(); });

  // Close per Klick außerhalb
  wrap.addEventListener("click", (e)=>{ if(e.target===wrap && isOpen) closeIns(); });

  function getActiveTab(){
    const t = wrap.querySelector(".tab.active"); return t ? t.dataset.tab : "logs";
  }

  // --- Rendering ------------------------------------------------------------
  function render(tab){
    if(tab==="logs") renderLogs();
    else if(tab==="tests") renderTests();
    else if(tab==="res") renderRes();
    else if(tab==="paths") renderPaths();
    else if(tab==="editor") renderEditor();
  }

  function renderLogs(){
    const rows = logStore.slice(-400).map(r=>{
      const badge = r.lvl==="err" ? "badge-err" : r.lvl==="warn" ? "badge-warn" : r.lvl==="ok" ? "badge-ok" : "badge-info";
      return `<div class="row"><span class="ins-badge ${badge}">${r.lvl.toUpperCase()}</span><span>${r.t}</span><span>${r.msg.replaceAll('<','&lt;')}</span></div>`;
    }).join("");
    content().innerHTML = `<div class="ins-list">${rows || "Keine Logs."}</div>`;
    status().textContent = `Logs gesamt: ${logStore.length}`;
  }

  function renderTests(){
    content().innerHTML = `
      <div class="ins-list">
        <div class="row"><span class="ins-badge badge-info">ℹ</span><span>Tests folgen – Hook bereit.</span></div>
        <div class="row"><button id="btn-run-tests">Alle Tests starten</button></div>
      </div>`;
    status().textContent = `Tests: Placeholder`;
    document.getElementById("btn-run-tests")?.addEventListener("click", ()=>{
      Log("Tests gestartet (Stub)");
      logStore.push({t:ts(), lvl:"ok", msg:"Tests gestartet (Stub)"}); renderLogs();
    });
  }

  function renderRes(){
    content().innerHTML = `<div class="ins-list"><div class="row"><span class="ins-badge badge-info">ℹ</span><span>Ressourcen-Ansicht bindet sich an cb:res:* an.</span></div></div>`;
    status().textContent = `Ressourcen: Live-Events ${eventStore.filter(e=>e.type.startsWith("cb:res")).length}`;
  }

  function renderPaths(){
    content().innerHTML = `<div class="ins-list"><div class="row"><span class="ins-badge badge-info">ℹ</span><span>Pfade/Overlay-Hooks werden von core/path-overlay.js geliefert.</span></div></div>`;
    status().textContent = `Pfade: Events ${eventStore.filter(e=>e.type.startsWith("cb:path")).length}`;
  }

  function renderEditor(){
    content().innerHTML = `<div class="ins-list"><div class="row"><span class="ins-badge badge-info">ℹ</span><span>Editor-Tab reserviert (Map/Level-Editor UI später hier).</span></div></div>`;
    status().textContent = `Editor: vorbereitet`;
  }

  // --- Log/Events – zentrale Hooks -----------------------------------------
  function ts(){ return new Date().toLocaleTimeString(); }

  if(!window.CBLog){
    window.CBLog = {
      ok: (m)=> { logStore.push({t:ts(), lvl:"ok",   msg:String(m)}); console.log(m); },
      info:(m)=> { logStore.push({t:ts(), lvl:"info", msg:String(m)}); console.info(m); },
      warn:(m)=> { logStore.push({t:ts(), lvl:"warn", msg:String(m)}); console.warn(m); },
      err: (m)=> { logStore.push({t:ts(), lvl:"err",  msg:String(m)}); console.error(m); },
    };
  } else {
    ["ok","info","warn","err"].forEach(k=>{
      const prev = window.CBLog[k].bind(window.CBLog);
      window.CBLog[k] = (m)=>{ logStore.push({t:ts(), lvl:k==="err"?"err":k, msg:String(m)}); prev(m); };
    });
  }

  const _dispatchEvent = window.dispatchEvent.bind(window);
  window.dispatchEvent = function(ev){
    if(ev?.type?.startsWith("cb:") || ev?.type?.startsWith("req:")){
      eventStore.push({t:ts(), type: ev.type});
      if(isOpen && getActiveTab()==="logs") renderLogs();
      status().textContent = `Events: ${eventStore.length}`;
    }
    return _dispatchEvent(ev);
  };

  Log("initialisiert – Toggle rechts unten. Close per X / ESC / Klick außerhalb.");
})();
