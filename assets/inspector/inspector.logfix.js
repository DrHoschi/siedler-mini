/* ============================================================================
   assets/inspector/inspector.logfix.js — v1.2.0
   Zweck:
   - Wenn CBLog (noch) nicht verfügbar ist, bauen wir eine sehr kleine
     Proxy-Pipeline auf console.* auf und stellen:
       - window.__CBLOG_PIPE__.buf  (Array<String>)
       - Events 'cb:log' / 'cb:log-flush'
   - Sobald CBLog später auftaucht, stören wir es nicht.
   ============================================================================ */

(function(){
  "use strict";
  if (window.__CBLOG_PIPE__) return; // schon aktiv

  const BUF_MAX = 2000;
  const pipe = { buf: [] };
  window.__CBLOG_PIPE__ = pipe;

  const orig = {
    log: console.log, info: console.info, warn: console.warn, error: console.error
  };

  function push(kind, args){
    try{
      const time = new Date();
      const stamp = `[${String(time.getHours()).padStart(2,"0")}:${String(time.getMinutes()).padStart(2,"0")}:${String(time.getSeconds()).padStart(2,"0")}]`;
      const line = `${stamp} ${String(kind).toUpperCase()}  ${args.map(safe).join(" ")}`;
      pipe.buf.push(line);
      if (pipe.buf.length > BUF_MAX) pipe.buf.splice(0, pipe.buf.length - BUF_MAX);
      window.dispatchEvent(new CustomEvent("cb:log", { detail: { line } }));
    }catch(_){}
  }

  function safe(v){
    try{
      if (typeof v === "string") return v;
      if (v && typeof v.stack === "string") return v.stack;
      return JSON.stringify(v);
    }catch(_){
      try{ return String(v); } catch(__){ return "[unserializable]"; }
    }
  }

  console.log  = function(...a){ push("log", a);  return orig.log.apply(console,  a); };
  console.info = function(...a){ push("info", a); return orig.info.apply(console, a); };
  console.warn = function(...a){ push("warn", a); return orig.warn.apply(console, a); };
  console.error= function(...a){ push("error",a); return orig.error.apply(console,a); };

  // Manuelles Flush (wird von UI benutzt)
  window.addEventListener("cb:log-flush", ()=>{
    pipe.buf.length = 0;
  });

  // Kleines Lebenszeichen
  orig.info.call(console, "[CBLog] Polyfill aktiv (Inspector-Fallback)");
})();
