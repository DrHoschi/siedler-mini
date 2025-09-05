<script>
/* ============================================================================
 * assets/inspector/inspector.logs.js — v18.10.8
 * Tab: Logs
 * Datenquellen:
 *   1) CBLog.getBuffer() + Events 'cb:log' / 'cb:log-flush'
 *   2) Fallback: window.__CBLOG_PIPE__.buf (console-Proxy aus Polyfill)
 * Verhalten:
 *   - Live-Update (Event + sanftes Polling)
 *   - Buttons: Kopieren, Leeren, Aktualisieren
 * ========================================================================== */
(function(){
  "use strict";
  const MOD  = "[inspector.logs]";
  const info = (...a)=> (window.CBLog?.info||console.log)(MOD, ...a);
  const warn = (...a)=> (window.CBLog?.warn||console.warn)(MOD, ...a);

  // Warten, bis Core seine API gesetzt hat
  function onReady(fn){
    if (window.__INSPECTOR_API__?.mountTab) return fn();
    let i=0; const t=setInterval(()=>{ if (++i>200){ clearInterval(t); warn("Core nicht gefunden."); return; }
      if (window.__INSPECTOR_API__?.mountTab){ clearInterval(t); fn(); }
    },50);
  }

  onReady(function registerLogs(){
    window.__INSPECTOR_API__.mountTab("logs", renderLogs, { title:"Logs" });
    info("Logs-Tab registriert (v18.10.8)");
  });

  function readBuffer(){
    try{
      if (window.CBLog?.getBuffer){
        const arr = window.CBLog.getBuffer() || [];
        if (arr.length) return arr.map(String);
      }
    }catch(_){}
    try{
      const arr = window.__CBLOG_PIPE__?.buf;
      if (Array.isArray(arr) && arr.length) return arr.map(String);
    }catch(_){}
    return [];
  }

  function renderLogs(ctx){
    const { bodyEl, footerEl } = ctx;

    // UI
    bodyEl.innerHTML = "";
    const status = document.createElement("div");
    status.style.cssText = "opacity:.8;margin:2px 0 8px";
    status.textContent = "Logs werden initialisiert …";
    const scroller = document.createElement("div");
    scroller.style.cssText = "max-height:calc(80vh - 160px);overflow:auto;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(255,255,255,.04);padding:8px";
    const pre = document.createElement("pre");
    pre.style.cssText = "margin:0;white-space:pre-wrap;word-break:break-word;font:12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;color:#e7eaf0";
    pre.textContent = "—";
    scroller.appendChild(pre);
    bodyEl.append(status, scroller);

    // Footer
    footerEl.innerHTML = "";
    footerEl.append(
      mkBtn("Kopieren", ()=> copy(pre.textContent)),
      mkBtn("Leeren",   ()=> clearLogs(pre, status)),
      mkBtn("Aktualisieren", ()=> renderOnce()),
    );

    // Live-Events
    const onLog = ()=> renderOnce();
    window.addEventListener("cb:log", onLog);
    window.addEventListener("cb:log-flush", onLog);

    // sanftes Polling (falls Events nicht ankommen)
    const poll = setInterval(renderOnce, 1000);

    // Disposer registrieren (Tabwechsel)
    ctx.onDispose?.(function(){
      try{
        window.removeEventListener("cb:log", onLog);
        window.removeEventListener("cb:log-flush", onLog);
        clearInterval(poll);
      }catch(_){}
    });

    // Initial
    renderOnce();

    function renderOnce(){
      try{
        const lines = readBuffer();
        if (!lines.length){
          status.textContent = "Keine Log-Einträge vorhanden.";
          pre.textContent = "—";
          return;
        }
        status.textContent = "";
        pre.textContent = lines.join("\n");
        // Auto-Scroll an das Ende
        scroller.scrollTop = scroller.scrollHeight;
      }catch(e){
        warn("Render-Fehler:", e?.message);
      }
    }
  }

  function mkBtn(label, onClick){
    const b=document.createElement("button");
    b.textContent = label;
    b.style.cssText = "border:none;border-radius:10px;padding:8px 12px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer";
    b.addEventListener("click", onClick);
    return b;
  }

  function copy(text){
    try{
      navigator.clipboard?.writeText(text).then(()=> (window.CBLog?.ok||console.log)("Logs kopiert."));
    }catch(_){
      try{
        const ta=document.createElement("textarea"); ta.value=text; document.body.appendChild(ta);
        ta.select(); document.execCommand("copy"); ta.remove();
        (window.CBLog?.ok||console.log)("Logs kopiert (Fallback).");
      }catch(_){}
    }
  }

  function clearLogs(pre, status){
    let cleared=false;
    try{ if (window.CBLog?.clear){ window.CBLog.clear(); cleared=true; } }catch(_){}
    try{ if (window.__CBLOG_PIPE__?.buf){ window.__CBLOG_PIPE__.buf.length=0; cleared=true; } }catch(_){}
    pre.textContent="—";
    status.textContent = cleared ? "Log-Puffer geleert." : "Kein Puffer gefunden.";
    window.dispatchEvent(new CustomEvent("cb:log-flush"));
  }

})();
</script>
