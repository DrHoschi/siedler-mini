/* ============================================================================
 * Datei: assets/core/cblog.polyfill.js
 * Projekt: Siedler-Mini
 * Version: v1.2.3
 *
 * Zweck:
 *  - Sanfter Log-Polyfill (CBLog), falls keine eigene Log-Infrastruktur existiert
 *  - Puffer (Ringpuffer optional), Events (append), Stream-Hook für console.*
 *
 * Öffentliche API (global: window.CBLog):
 *  - ok/info/warn/err(msg, ...args)     // loggt + puffert
 *  - log(...)                            // Alias auf info
 *  - getBuffer() -> Array<any>          // Kopie des Puffers (Objekte!)
 *  - clear()
 *  - on(event, fn) / off(event, fn)     // Event-Emitter (append)
 *  - LogStream.start() / .stop()        // hijackt console.* (reversibel)
 *
 * Events:
 *  - 'append' : (entryObj) => void
 *    entryObj: { ts:number, t:string, lvl:'info|ok|warn|err', src:string, msg:string }
 * ========================================================================== */
(function(){
  'use strict';

  if (window.CBLog && typeof window.CBLog.getBuffer === 'function') {
    // Bereits vorhanden → nur markieren.
    try { (window.CBLog.info||console.log)('[CBLog] Polyfill übersprungen (bereits vorhanden)'); } catch(_){}
    return;
  }

  var MOD = '[CBLog]';
  var VER = 'v1.2.3';

  var _buf = [];          // Roh-Objekte (NICHT nur Strings)
  var _max = 5000;        // optionales Limit (0 = unendlich)
  var _ev  = Object.create(null);

  function pad(n){ return (n<10?'0':'')+n; }
  function tsStr(ts){
    var d = new Date(ts);
    return pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
  }
  function emit(ev, payload){
    var list = _ev[ev]; if (!list) return;
    for (var i=0;i<list.length;i++){
      try{ list[i](payload); }catch(_){}
    }
  }
  function on(ev, fn){
    if(!_ev[ev]) _ev[ev] = [];
    if (_ev[ev].indexOf(fn)===-1) _ev[ev].push(fn);
  }
  function off(ev, fn){
    var list = _ev[ev]; if(!list) return;
    var i = list.indexOf(fn); if (i!==-1) list.splice(i,1);
  }
  function pushEntry(lvl, src, msg){
    var ts = Date.now();
    var entry = { ts: ts, t: tsStr(ts), lvl: String(lvl||'info'), src: String(src||'console'), msg: String(msg||'') };
    _buf.push(entry);
    if (_max>0 && _buf.length>_max) _buf.shift();
    emit('append', entry);
  }

  var api = {
    version: VER,
    ok:   function(){ var m = [].slice.call(arguments).join(' '); try{ console.log(m);}catch(_){}
                     pushEntry('ok','console',m); },
    info: function(){ var m = [].slice.call(arguments).join(' '); try{ console.info(m);}catch(_){}
                     pushEntry('info','console',m); },
    warn: function(){ var m = [].slice.call(arguments).join(' '); try{ console.warn(m);}catch(_){}
                     pushEntry('warn','console',m); },
    err:  function(){ var m = [].slice.call(arguments).join(' '); try{ console.error(m);}catch(_){}
                     pushEntry('err','console',m); },
    log:  function(){ return api.info.apply(null, arguments); },

    getBuffer: function(){ return _buf.slice(); },
    clear: function(){ _buf.length = 0; },

    on: on,
    off: off,

    LogStream: (function(){
      var wired = false;
      var orig = {};
      function start(){
        if (wired) return;
        wired = true;
        ['log','info','warn','error'].forEach(function(k){
          orig[k] = console[k];
          console[k] = function(){
            var txt = Array.prototype.map.call(arguments, function(a){ try{return String(a);}catch(_){return '[obj]';} }).join(' ');
            try{
              if (k==='error') pushEntry('err','console',txt);
              else if (k==='warn') pushEntry('warn','console',txt);
              else if (k==='log') pushEntry('ok','console',txt);
              else pushEntry('info','console',txt);
            }catch(_){}
            return orig[k].apply(this, arguments);
          };
        });
      }
      function stop(){
        if (!wired) return;
        wired = false;
        ['log','info','warn','error'].forEach(function(k){
          if (orig[k]) { console[k] = orig[k]; }
        });
      }
      return { start:start, stop:stop, isActive:function(){return wired;} };
    })()
  };

  window.CBLog = api;

  try { api.info(MOD, 'Polyfill aktiv'); } catch(_){}
})();
