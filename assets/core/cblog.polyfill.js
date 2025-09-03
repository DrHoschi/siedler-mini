/* ============================================================================
 * cblog.polyfill.js — Minimal-Logger/Bridge für Inspector
 * Version: v1.0.0
 * API: CBLog.ok/warn/err/push(tag,msg), CBLog.dump()
 *  - Pusht auch console.* in den Ring (ohne Endlosschleifen)
 *  - Sendet Event 'cb:log-updated' bei neuen Einträgen
 * ========================================================================== */
(function () {
  'use strict';
  if (window.CBLog && typeof window.CBLog.dump === 'function') return; // echter Logger vorhanden

  var MOD = '[CBLog]';
  var buf = [];
  var MAX = 1000;
  var startedAt = new Date();

  function stamp(level, tag, msg) {
    var t = new Date();
    var hh = String(t.getHours()).padStart(2,'0');
    var mm = String(t.getMinutes()).padStart(2,'0');
    var ss = String(t.getSeconds()).padStart(2,'0');
    return `[${hh}:${mm}:${ss}] ${level} ${tag ? (tag+' ') : ''}${msg}`;
  }
  function push(level, tag, msg){
    try{
      var line = stamp(level, tag||'', String(msg??''));
      buf.push(line);
      if (buf.length > MAX) buf.splice(0, buf.length - MAX);
      try { window.dispatchEvent(new CustomEvent('cb:log-updated')); } catch(_) {}
    }catch(_){}
  }

  window.CBLog = {
    ok:   (m)=>push('OK', '', m),
    warn: (m)=>push('WARN', '', m),
    err:  (m)=>push('ERR', '', m),
    push: (tag, m)=>push('LOG', tag||'', m||''),
    dump: function(){ 
      var hdr = `CBLog Polyfill aktiv seit ${startedAt.toLocaleString()}\n`;
      return hdr + (buf.join('\n') || '(leer)');
    }
  };

  // Console-Brücke (loops vermeiden)
  var orig = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  };
  console.log = function(){ try{ push('OK', '[console]', Array.from(arguments).join(' ')); }catch(_){} orig.log.apply(console, arguments); };
  console.warn = function(){ try{ push('WARN', '[console]', Array.from(arguments).join(' ')); }catch(_){} orig.warn.apply(console, arguments); };
  console.error = function(){ try{ push('ERR', '[console]', Array.from(arguments).join(' ')); }catch(_){} orig.error.apply(console, arguments); };

  try { console.log(MOD+' Polyfill aktiv'); } catch(_) {}
})();
