/* ============================================================================
 * Datei    : ui/ui-inspector.js
 * Projekt  : Neue Siedler
 * Version  : v25.10.16-5
 * Zweck    : Inspector-Overlay (Logs/Tests/Ressourcen/Pfade/Editor)
 *            – immer sichtbar im Viewport (Portrait & Landscape)
 *            – Toggle unten rechts, Close per X / ESC / Klick-außerhalb
 *            – kompakte, gut lesbare Darstellung
 *            – robuste Fehlerbehandlung (Fehler in Statusleiste + Log)
 * Struktur  : (IIFE) => Konstanten → Hilfsfunktionen → State → DOM-Aufbau →
 *             Event-Wiring → Render-Funktionen → Public-API (global Events)
 * Events    : emit   cb:inspector:open / cb:inspector:close
 *             listen cb:* / req:*  (Event-Scanner protokolliert)
 * Abhäng.   : CSS-Teile in ui/css/ui-inspector.css (v25.10.16-4 oder höher)
 * Hinweis   : #ui-root hat pointer-events:none; einzelne Elemente werden
 *             gezielt auf pointer-events:auto gesetzt.
 * ========================================================================== */

(function(){
  //////////////////////////////////////////////////////////////////////////////
  // [KONSTANTEN / META]
  //////////////////////////////////////////////////////////////////////////////
  const VER = "v25.10.16-5";
  const LOGP = "[inspector]";
  const log  = (m)=> (window.CBLog?.ok   || console.log)(`${LOGP} ${m}`);
  const warn = (m)=> (window.CBLog?.warn || console.warn)(`${LOGP} ${m}`);
  const err  = (m)=> (window.CBLog?.err  || console.error)(`${LOGP} ${m}`);

  //////////////////////////////////////////////////////////////////////////////
  // [HILFSFUNKTIONEN]
  //////////////////////////////////////////////////////////////////////////////
  const ts = ()=> new Date().toLocaleTimeString();

  // Safe innerHTML setter (kleines Sanitizing für < und &)
  function safeText(s){
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");
  }

  function showError(e){
    const msg = (e && (e.stack || e.message || String(e))) || "Unbekannter Fehler";
    statusEl().textContent = "Fehler: " + msg;
    logStore.push({t: ts(), lvl:"err", msg: "Inspector-Render: " + msg});
  }

  function safeRender(tab){
    try{ render(tab); } catch(e){ showError(e); }
  }

  //////////////////////////////////////////////////////////////////////////////
  // [STATE]
  //////////////////////////////////////////////////////////////////////////////
  let isOpen = false;
  const logStore   = [];   // {t, lvl, msg}
  const eventStore = [];   // {t, type}

  //////////////////////////////////////////////////////////////////////////////
  // [DOM-AUFBAU] – Toggle + Overlay-Fenster
  //////////////////////////////////////////////////////////////////////////////
  const uiRoot = document.getElementById("ui-root");

  // --- Toggle-Button (unten rechts), immer klickbar --------------------------
  const btn = document.createElement("button");
  btn.id    = "inspector-toggle";
  btn.textContent = "Inspector";
  btn.style.pointerEvents = "auto"; // #ui-root hat pointer-events:none
  uiRoot.appendChild(btn);

  // --- Overlay + Fenster (Inhalt wird via CSS zentriert) ---------------------
  const wrap = document.createElement("div");
  wrap.id = "inspector";
  // pointer-events:auto, damit Klicks gefangen werden (Close per Klick-außerhalb)
  wrap.style.pointerEvents = "auto";

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
  uiRoot.appendChild(wrap);

  // Kurz-Zugriffe
  const contentEl = ()=> document.getElementById("inspector-content");
  const statusEl  = ()=> document.getElementById("inspector-status");

  //////////////////////////////////////////////////////////////////////////////
  // [EVENT-WIRING] – Öffnen/Schließen, Tabs, Global-Shortcuts, Resize/Rotate
  //////////////////////////////////////////////////////////////////////////////

  function getActiveTab(){
    const t = wrap.querySelector(".tab.active");
    return t ? t.dataset.tab : "logs";
  }

  function openIns(){
    isOpen = true;
    // CSS erwartet display:grid (siehe ui-inspector.css) – für echtes Centering
    wrap.style.display = "grid";
    window.dispatchEvent(new CustomEvent("cb:inspector:open"));
    log("geöffnet");
    safeRender(getActiveTab());
  }

  function closeIns(){
    isOpen = false;
    wrap.style.display = "none";
    window.dispatchEvent(new CustomEvent("cb:inspector:close"));
    log("geschlossen");
  }

  // Toggle-Klick
  btn.addEventListener("click", ()=> isOpen ? closeIns() : openIns());

  // Close per X
  wrap.querySelector(".ins-close").addEventListener("click", closeIns);

  // Close per ESC
  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape" && isOpen) closeIns();
  });

  // Close per Klick-außerhalb des Fensters
  wrap.addEventListener("click", (e)=>{
    if(e.target === wrap && isOpen) closeIns();
  });

  // Tabs anklicken
  wrap.querySelectorAll(".tab").forEach(tab=>{
    tab.addEventListener("click", ()=>{
      wrap.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
      tab.classList.add("active");
      safeRender(tab.dataset.tab);
    });
  });

  // Orientierung & Resize → Inhalt sicher neu rendern (z. B. Tabellenbreite)
  window.addEventListener("orientationchange", ()=> { if(isOpen) safeRender(getActiveTab()); });
  window.addEventListener("resize",           ()=> { if(isOpen) safeRender(getActiveTab()); });

  //////////////////////////////////////////////////////////////////////////////
  // [LOGGING-BRIDGE] – CBLog wrappen, damit Einträge im Inspector landen
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
        logStore.push({t:ts(), lvl: (k==="err"?"err":k), msg:String(m)});
        prev(m);
      };
    });
  }

  //////////////////////////////////////////////////////////////////////////////
  // [EVENT-SCANNER] – protokolliert cb:* & req:* (Quelle: global dispatchEvent)
  //////////////////////////////////////////////////////////////////////////////
  const _dispatch = window.dispatchEvent.bind(window);
  window.dispatchEvent = function(ev){
    try{
      if(ev?.type && (ev.type.startsWith("cb:") || ev.type.startsWith("req:"))){
        eventStore.push({t: ts(), type: ev.type});
        // Live-Update der Logs-Ansicht, wenn offen & Tab=logs
        if(isOpen && getActiveTab()==="logs") renderLogs();
        statusEl().textContent = `Events: ${eventStore.length} — Logs gesamt: ${logStore.length}`;
      }
    } catch(e){
      showError(e);
    }
    return _dispatch(ev);
  };

  //////////////////////////////////////////////////////////////////////////////
  // [RENDER-FUNKTIONEN] – kompakter Stil wie gewünscht
  //////////////////////////////////////////////////////////////////////////////
  function render(tab){
    if(tab === "logs")      return renderLogs();
    if(tab === "tests")     return renderTests();
    if(tab === "res")       return renderRes();
    if(tab === "paths")     return renderPaths();
    if(tab === "editor")    return renderEditor();
    // Fallback
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
    contentEl().innerHTML = `<div class="ins-list">${rows || "Keine Logs."}</div>`;
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
    // Bindet später an cb:res:* (Snapshot/Change/Reset)
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
    // Daten liefert core/path-overlay.js (cb:paths:update)
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
    // Platzhalter für Map-/Level-Editor UI
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
