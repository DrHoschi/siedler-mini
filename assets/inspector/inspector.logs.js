/* ============================================================================
   assets/inspector/inspector.logs.js — v18.10.6
   Aufgabe:
   - "Logs"-Tab des Inspectors rendern
   - Einträge stabil beziehen:
       1) CBLog.getBuffer() + Event 'cb:log'
       2) Fallback: eigener console-Proxy (via window.__CBLOG_PIPE__)
   - Keine Abhängigkeit zur Reihenfolge außer: inspector.core.js definiert __INSPECTOR_API__
   CODE-STYLE:
   - Defensive (try/catch), kein Throw, immer weiter anzeigen
   ============================================================================ */

(function () {
  "use strict";

  const MOD = "[inspector.logs]";
  const ok   = (...a)=> (window.CBLog?.ok||console.log)(MOD, ...a);
  const warn = (...a)=> (window.CBLog?.warn||console.warn)(MOD, ...a);

  // Warten bis Core den Inspector-Body bereitstellt
  function onInspectorReady(fn){
    if (window.__INSPECTOR_API__ && typeof window.__INSPECTOR_API__.mountTab === "function"){
      fn();
      return;
    }
    let tries = 0;
    const t = setInterval(()=>{
      if (++tries > 200) { clearInterval(t); warn("Core nicht gefunden."); return; }
      if (window.__INSPECTOR_API__?.mountTab){ clearInterval(t); fn(); }
    }, 50);
  }

  onInspectorReady(function initLogsTab(){
    // UI-Renderer registrieren
    window.__INSPECTOR_API__.mountTab("logs", renderLogsUI, { title: "Logs" });
    ok("Logs-Tab registriert (v18.10.6).");
  });

  // ------------------------------- Datenquelle --------------------------------

  function nowStamp(){
    const d = new Date();
    const pad = (n)=> String(n).padStart(2,"0");
    return `[${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}]`;
  }

  // Liefert stets ein Array von Textzeilen
  function getBuffer(){
    // 1) CBLog-Puffer
    try{
      if (window.CBLog?.getBuffer){
        const arr = window.CBLog.getBuffer() || [];
        if (Array.isArray(arr) && arr.length) return arr.map(String);
      }
    }catch(_){}

    // 2) Fallback-Pipe
    try{
      const buf = window.__CBLOG_PIPE__?.buf;
      if (Array.isArray(buf) && buf.length) return buf.map(String);
    }catch(_){}

    return [];
  }

  // --------------------------------- UI --------------------------------------

  function renderLogsUI(ctx){
    const { bodyEl, footerEl } = ctx; // kommt aus inspector.core.js

    bodyEl.innerHTML = "";

    const status = document.createElement("div");
    status.className = "ins-status";
    status.textContent = "Logs werden initialisiert …";
    bodyEl.appendChild(status);

    const pre = document.createElement("pre");
    pre.className = "ins-pre";
    pre.textContent = "Noch keine Logs …";
    bodyEl.appendChild(pre);

    // Footer-Buttons
    footerEl.innerHTML = "";
    const btnCopy  = mkBtn("Kopieren", ()=> copyToClipboard(pre.textContent));
    const btnClear = mkBtn("Leeren",   ()=> clearLogs(pre, status));
    const btnRefresh = mkBtn("Aktualisieren", ()=> render());
    footerEl.append(btnCopy, btnClear, btnRefresh);

    // Live-Update via Events
    const onEvt = ()=> render();
    window.addEventListener("cb:log", onEvt);
    window.addEventListener("cb:log-flush", onEvt);

    // Beim Tab-Verlassen Listener entfernen (Core ruft optional onDispose)
    ctx.onDispose = ()=> {
      window.removeEventListener("cb:log", onEvt);
      window.removeEventListener("cb:log-flush", onEvt);
    };

    // Erstrender + sanftes Polling (falls Events nicht kommen)
    render();
    const poll = setInterval(render, 1000);
    ctx.onDisposePoll = ()=> clearInterval(poll);

    function render(){
      try{
        const lines = getBuffer();
        if (!lines.length){
          status.textContent = "Keine Log-Einträge vorhanden";
          pre.textContent = "—";
          return;
        }
        status.textContent = "";
        pre.textContent = lines.join("\n");
      }catch(err){
        warn("Render-Fehler:", err);
      }
    }
  }

  function mkBtn(label, onClick){
    const b = document.createElement("button");
    b.className = "ins-btn";
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  function copyToClipboard(text){
    try{
      navigator.clipboard?.writeText(text)
        .then(()=> ok("Logs kopiert."))
        .catch(()=> fallbackCopy(text));
    }catch(_){ fallbackCopy(text); }
    function fallbackCopy(t){
      const ta = document.createElement("textarea");
      ta.value = t; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy"); ta.remove();
      ok("Logs kopiert (fallback).");
    }
  }

  function clearLogs(pre, status){
    // CBLog bevorzugen
    let cleared = false;
    try{
      if (window.CBLog?.clear){ window.CBLog.clear(); cleared = true; }
    }catch(_){}
    try{
      if (window.__CBLOG_PIPE__?.buf){ window.__CBLOG_PIPE__.buf.length = 0; cleared = true; }
    }catch(_){}
    pre.textContent = "—";
    status.textContent = cleared ? "Log-Puffer geleert" : "Kein Puffer gefunden";
    window.dispatchEvent(new CustomEvent("cb:log-flush"));
  }

})();
