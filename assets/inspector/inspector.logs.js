/* ============================================================================
 * assets/inspector/inspector.logs.js — v18.10.4
 * Logs-Tab mit internem Cache (robust gegen Tab-Wechsel)
 * ========================================================================== */
(function(){
  "use strict";

  const Core = window.__InspectorCore__;
  if (!Core) return;

  const LOGS = {
    cache: [],   // persistenter Cache
    view: null,  // <pre>
    scroller: null // body el
  };

  function readBufferOnce(){
    // mehrere Quellen zulassen
    if (window.CBLog?.getBuffer) return window.CBLog.getBuffer();
    if (Array.isArray(window.CBLog?._buf)) return window.CBLog._buf;
    if (Array.isArray(window.__CBLOG_BUFFER__)) return window.__CBLOG_BUFFER__;
    return [];
  }

  function normalize(e){
    if (typeof e === "string") return e;
    const ts   = e.time || e.t || "";
    const lvl  = (e.level||e.lvl||"LOG").toUpperCase();
    const sym  = lvl.startsWith("ERR") ? "❌" : lvl.startsWith("WARN") ? "⚠" : lvl.startsWith("INFO") ? "ℹ" : "✅";
    const scope= e.scope ? `[${e.scope}] ` : "";
    const msg  = e.msg || e.message || "";
    return `[${ts}] ${sym} ${scope}${msg}`;
  }

  function fillFromCurrentBuffer(){
    const buf = readBufferOnce();
    if (buf && buf.length){
      LOGS.cache = buf.map(normalize); // volle Synchronisation
    }
  }

  function render(body, footer){
    LOGS.scroller = body;
    if (!LOGS.cache.length) fillFromCurrentBuffer();

    const pre = document.createElement("pre");
    pre.textContent = LOGS.cache.length ? LOGS.cache.join("\n") : "[Keine Log-Einträge vorhanden]";
    body.appendChild(pre);
    LOGS.view = pre;

    // Aktionen
    const btnCopy = mk("Kopieren", ()=>{
      try { navigator.clipboard?.writeText(LOGS.view.textContent||""); } catch {}
    });
    const btnExport = mk("Export .txt", ()=>{
      const blob = new Blob([LOGS.view.textContent||""], {type:"text/plain;charset=utf-8"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `logs_${Date.now()}.txt`; a.click();
      setTimeout(()=>URL.revokeObjectURL(url), 5000);
    });
    const btnClear = mk("Leeren", ()=>{
      try { window.CBLog?.clear?.(); } catch {}
      LOGS.cache.length = 0;
      refresh();
    });
    const btnRefresh = mk("Aktualisieren", ()=>{
      fillFromCurrentBuffer();
      refresh(true);
    });
    footer.append(btnCopy, btnExport, btnClear, btnRefresh);

    // Live-Append abhören – ergänzt nur den Cache, löscht nie.
    const onAppend = (ev)=>{
      const e = ev?.detail || ev; // Polyfill-kompatibel
      // Manche Implementationen schicken den gesamten Buffer — dann neu lesen:
      if (Array.isArray(e)) { fillFromCurrentBuffer(); refresh(true); return; }
      // Einzel-Eintrag
      if (e) LOGS.cache.push(normalize(e));
      refresh(true);
    };
    window.addEventListener("cblog:append", onAppend);
    window.addEventListener("CBLog:append", onAppend);
    window.addEventListener("cb:log", onAppend);
  }

  function refresh(scrollToEnd){
    if (!LOGS.view) return;
    const atEnd = isAtEnd(LOGS.scroller);
    LOGS.view.textContent = LOGS.cache.length ? LOGS.cache.join("\n") : "[Keine Log-Einträge vorhanden]";
    if (scrollToEnd || atEnd){
      LOGS.scroller.scrollTop = LOGS.scroller.scrollHeight;
    }
  }

  function isAtEnd(scroller){
    const EPS = 8;
    return (scroller.scrollTop + scroller.clientHeight) >= (scroller.scrollHeight - EPS);
  }

  function mk(label, onClick){
    const b = document.createElement("button");
    b.type="button"; b.className="ins-btn"; b.textContent=label;
    b.addEventListener("click", onClick);
    return b;
  }

  Core.registerTab("overview", "Übersicht", (b,f)=>{
    // kleine Runtime-Übersicht
    const cvs = document.getElementById("game");
    const dim = cvs ? `${cvs.width||cvs.clientWidth}×${cvs.height||cvs.clientHeight}` : "–";
    b.innerHTML = `
      <div style="opacity:.85;margin-bottom:8px"><b>Runtime</b></div>
      <div style="display:grid;grid-template-columns:max-content 1fr;gap:6px 14px;opacity:.92">
        <div>Canvas:</div><div>${dim}</div>
        <div>Map:</div><div>${cvs?.dataset?.map || "–"}</div>
        <div>FPS:</div><div>${window.__cb?.fps ?? "–"}</div>
      </div>`;
  });
  Core.registerTab("logs", "Logs", render);
})();
