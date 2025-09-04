/* =========================================================================
   assets/core/cblog.polyfill.js — v1.2.2
   Zweck: Stabile Console→CBLog-Bridge mit Puffer + Events.
   - Idempotent (kann mehrfach geladen werden)
   - Startet sofort, bevor andere Module laufen
   - Liefert API: CBLog.getBuffer(), .on(fn), .off(fn), .dump(), .info/warn/error
   ========================================================================= */
(function () {
  const W = typeof window !== 'undefined' ? window : globalThis;
  const NS = '__CBLOG__v122';
  if (W[NS]) { /* schon aktiv */ return; }
  W[NS] = true;

  // Zustand
  const buf = [];
  const listeners = new Set();
  const MAX = 2000;

  // Timestamp helper
  const ts = () => {
    const d = new Date();
    const pad = (n)=> (n<10?'0'+n:n);
    return `[${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}]`;
  };

  // Originale Console merken (einmal)
  const orig = W.__cblog_orig__ || {
    log:   console.log.bind(console),
    info:  console.info?.bind(console)  || console.log.bind(console),
    warn:  console.warn?.bind(console)  || console.log.bind(console),
    error: console.error?.bind(console) || console.log.bind(console),
  };
  W.__cblog_orig__ = orig;

  // Eintrag erstellen
  function push(kind, args) {
    try {
      const msg = Array.from(args).map(x=>{
        if (typeof x === 'string') return x;
        try { return JSON.stringify(x); } catch { return String(x); }
      }).join(' ');
      const line = `${ts()} ${kind.toUpperCase()} ${msg}`;
      buf.push(line);
      if (buf.length > MAX) buf.splice(0, buf.length - MAX);
      listeners.forEach(fn => { try { fn(line); } catch {} });
    } catch {}
  }

  // Proxy-Console (idempotent)
  function armConsoleProxy() {
    if (console.__cblog_patched__) return;
    console.__cblog_patched__ = true;

    ['log','info','warn','error'].forEach(kind=>{
      const base = orig[kind] || orig.log;
      const patch = function () {
        try { push(kind, arguments); } catch {}
        try { base.apply(console, arguments); } catch {}
      };
      // non-destructive: nur überschreiben, wenn nicht bereits ausgerüstet
      const already = console[kind]?.__is_cblog__;
      if (!already) {
        patch.__is_cblog__ = true;
        console[kind] = patch;
      }
    });
  }
  armConsoleProxy();

  // Öffentliche API
  const CBLog = W.CBLog || {};
  CBLog.getBuffer = () => buf.slice(0);
  CBLog.on   = (fn)=>{ if (typeof fn==='function') listeners.add(fn); };
  CBLog.off  = (fn)=>{ listeners.delete(fn); };
  CBLog.dump = ()=> buf.join('\n');

  // Komfort
  CBLog.log   = (...a)=> console.log(...a);
  CBLog.info  = (...a)=> console.info(...a);
  CBLog.warn  = (...a)=> console.warn(...a);
  CBLog.error = (...a)=> console.error(...a);

  // Selbsttest / Banner (einmalig)
  try { CBLog.info('[CBLog] Polyfill aktiv'); } catch {}

  W.CBLog = CBLog;
})();
