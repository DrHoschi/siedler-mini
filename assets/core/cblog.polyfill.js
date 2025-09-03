/* ============================================================================
 * Datei: assets/core/cblog.polyfill.js
 * Projekt: Siedler-Mini
 * Version: v1.1.0
 * Zweck:
 *   - Einheitliche Log-Sammelstelle (CBLog) bereitstellen
 *   - Optional: console.* an CBLog spiegeln (bindConsole=true)
 *   - Inspector-Refresh via 'cb:log-refresh'
 * ========================================================================== */
(function(){
  'use strict';
  var MOD='[CBLog]';

  if (!window.CBLog){
    window.CBLog = {};
  }
  var L = window.CBLog;

  // History (öffentlich lesbar für Inspector)
  L._history = Array.isArray(L._history) ? L._history : [];

  function push(level, msg){
    var entry = {
      ts: new Date().toISOString(),
      level: (''+level).toLowerCase(),
      msg: (msg==null ? '' : (typeof msg==='string' ? msg : (msg.message || JSON.stringify(msg))))
    };
    L._history.push(entry);
    if (L._history.length > 3000) L._history.shift();
    try{ window.dispatchEvent(new Event('cb:log-refresh')); }catch(_){}
    return entry;
  }

  // Public API
  L.push = push;
  L.ok   = function(m){ return push('ok',   m); };
  L.info = function(m){ return push('info', m); };
  L.warn = function(m){ return push('warn', m); };
  L.err  = function(m){ return push('err',  m); };

  // Optional: console binding (einmalig aktivierbar)
  if (L.bindConsole === true && !L._consoleBound){
    try{
      var c = window.console || {};
      ['log','info','warn','error'].forEach(function(k){
        var orig = c[k] ? c[k].bind(c) : function(){};
        c[k] = function(){
          var args = Array.prototype.slice.call(arguments);
          // in CBLog kippen
          if (k==='error')      push('err', args.join(' '));
          else if (k==='warn')  push('warn', args.join(' '));
          else if (k==='info')  push('info', args.join(' '));
          else                  push('info', args.join(' '));
          // original weiterhin ausgeben
          try{ orig.apply(null, args); }catch(_){}
        };
      });
      L._consoleBound = true;
    }catch(_){}
  }

  // Boot-Marker
  L.ok('Polyfill aktiv v1.1.0');
})();
