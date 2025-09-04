<script>
/*
  ==========================================================
  assets/core/cblog.polyfill.js — v1.2.1
  Zweck:
    • Stabiler Client-Logpuffer (CBLog) mit Zeitstempel & Level
    • Einmaliger, idempotenter Console-Proxy (kein Doppel-Hook)
    • Events:  window.dispatchEvent(new CustomEvent('cblog:append',{detail:item}))
  Protokoll-Item:
    { ts: Date, level: "INFO|LOG|WARN|ERROR", tag: string, text: string }
  ==========================================================
*/
(function(){
  if (window.__CBLOG_READY__) return;           // idempotent
  window.__CBLOG_READY__ = true;

  const fmt = (v)=>{
    try{
      if (v === undefined) return "undefined";
      if (v === null) return "null";
      if (typeof v === "string") return v;
      if (v instanceof Error) return (v.stack || (v.name+": "+v.message));
      return JSON.stringify(v, (_k, val)=>{
        if (typeof val === "bigint") return String(val);
        return val;
      }, 0);
    }catch(_){ return String(v); }
  };

  const buffer = [];               // Ringpuffer (optional begrenzen)
  const MAX_BUF = 5000;

  const push = (level, tag, args)=>{
    const text = (Array.isArray(args)? args : [args]).map(fmt).join(" ");
    const item = { ts:new Date(), level, tag: tag||"", text };
    buffer.push(item);
    if (buffer.length > MAX_BUF) buffer.splice(0, buffer.length - MAX_BUF);
    try{
      window.dispatchEvent(new CustomEvent('cblog:append', { detail: item }));
    }catch(_){}
    return item;
  };

  // öffentliches API
  const CBLog = window.CBLog = window.CBLog || {};
  CBLog.push       = push;
  CBLog.getBuffer  = ()=> buffer.slice();              // Kopie
  CBLog.clear      = ()=> { buffer.length = 0; };
  CBLog.version    = "v1.2.1";

  // einmaliger Console-Proxy (falls nicht schon gesetzt)
  if (!window.__CBLOG_CONSOLE_WRAPPED__){
    window.__CBLOG_CONSOLE_WRAPPED__ = true;
    const org = {
      log   : console.log.bind(console),
      info  : console.info?.bind(console)  || console.log.bind(console),
      warn  : console.warn?.bind(console)  || console.log.bind(console),
      error : console.error?.bind(console) || console.log.bind(console),
    };
    console.log   = (...a)=>{ push("LOG","console",a);   org.log(...a); };
    console.info  = (...a)=>{ push("INFO","console",a);  org.info(...a); };
    console.warn  = (...a)=>{ push("WARN","console",a);  org.warn(...a); };
    console.error = (...a)=>{ push("ERROR","console",a); org.error(...a); };
  }

  // Komfort-Shortcuts
  CBLog.info  = (tag,...a)=>push("INFO", tag, a);
  CBLog.log   = (tag,...a)=>push("LOG",  tag, a);
  CBLog.warn  = (tag,...a)=>push("WARN", tag, a);
  CBLog.error = (tag,...a)=>push("ERROR",tag, a);

  CBLog.info("CBLog", "Polyfill aktiv");
})();
</script>
