/* ============================================================================
 * Datei    : core/cblog.polyfill.js
 * Projekt  : Neue Siedler
 * Version  : v25.10.25-final
 *
 * Zweck    : Sanfter Log-Polyfill (CBLog) mit Ringpuffer + Events + optionalem
 *            Console-Hijack. Standards: ok/info/warn/error (err als Alias).
 *
 * Struktur : Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 *
 * API (global window.CBLog):
 *   ok(...), info(...), warn(...), error(...), err(...alias), log(...→info)
 *   getBuffer(): Entry[]                 // flache Kopie
 *   clear(): void
 *   setMaxBuffer(n:number): void         // 0 = unendlich
 *   on(ev, fn), off(ev, fn)              // 'append' Event
 *   LogStream.start()/stop()/isActive()  // hijackt console.* reversibel
 *
 * Event 'append': { ts:number, t:"HH:MM:SS", lvl:'ok|info|warn|error', src:string, msg:string }
 * Hinweise:
 *   – Wenn bereits ein CBLog existiert, wird NICHT überschrieben; fehlende Methoden
 *     (z. B. error) werden sanft ergänzt (Augment-Modus).
 *   – LogStream.start() wird NICHT automatisch aktiviert.
 * ============================================================================ */
(function(){
  'use strict';

  const MOD = '[CBLog]';
  const VER = 'v25.10.25-final';

  // Wenn ein vorhandenes CBLog existiert, augmentieren wir nur fehlende Teile.
  if (window.CBLog && typeof window.CBLog === 'object') {
    const L = window.CBLog;
    if (!L.error && L.err)        L.error = (...a)=>L.err(...a);
    if (!L.err  && L.error)       L.err   = (...a)=>L.error(...a);
    if (!L.ok)    L.ok    = (...a)=>console.log(...a);
    if (!L.info)  L.info  = (...a)=>console.info(...a);
    if (!L.warn)  L.warn  = (...a)=>console.warn(...a);
    if (!L.log)   L.log   = (...a)=>L.info(...a);
    if (!L.getBuffer) L.getBuffer = ()=>[];
    if (!L.clear)     L.clear     = ()=>{};
    if (!L.on || !L.off){
      const _ev = Object.create(null);
      L.on  = (ev,fn)=>{ (_ev[ev] ||= []).includes(fn)||_ev[ev].push(fn); };
      L.off = (ev,fn)=>{ const a=_ev[ev]; if(!a) return; const i=a.indexOf(fn); if(i!==-1)a.splice(i,1); };
      L._emit = (ev,p)=>{ const a=_ev[ev]; if(!a) return; for (const f of a) try{f(p);}catch{} };
    }
    if (!L.LogStream){
      let wired=false; const orig={};
      L.LogStream = {
        start(){
          if (wired) return; wired=true;
          ['log','info','warn','error'].forEach(k=>{
            orig[k]=console[k];
            console[k]=function(){ try{ L[k==='log'?'ok':k](...arguments); }catch{} return orig[k].apply(this,arguments); };
          });
        },
        stop(){
          if (!wired) return; wired=false;
          ['log','info','warn','error'].forEach(k=>{ if (orig[k]) console[k]=orig[k]; });
        },
        isActive(){ return wired; }
      };
    }
    try{ (L.info||console.log)(MOD,'Augment aktiv', VER); }catch{}
    return;
  }

  // Neuer Polyfill
  let _buf = [];                 // Ringpuffer
  let _max = 5000;               // 0 = unendlich
  const _ev = Object.create(null);

  function pad(n){ return (n<10?'0':'')+n; }
  function tsStr(ts){
    const d = new Date(ts);
    return pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
  }
  function emit(ev, payload){
    const list = _ev[ev]; if (!list) return;
    for (let i=0;i<list.length;i++){ try{ list[i](payload); }catch{} }
  }
  function on(ev, fn){
    (_ev[ev] ||= []);
    if (!_ev[ev].includes(fn)) _ev[ev].push(fn);
  }
  function off(ev, fn){
    const a = _ev[ev]; if(!a) return;
    const i = a.indexOf(fn); if (i!==-1) a.splice(i,1);
  }
  function pushEntry(level, src, msg){
    const ts = Date.now();
    const entry = { ts, t:tsStr(ts), lvl:String(level||'info'), src:String(src||'console'), msg:String(msg??'') };
    _buf.push(entry);
    if (_max>0 && _buf.length>_max) _buf.shift();
    emit('append', entry);
  }

  const api = {
    version: VER,
    ok:    function(){ const m=[...arguments].join(' '); try{ console.log(m);}catch{}  pushEntry('ok',   'console', m); },
    info:  function(){ const m=[...arguments].join(' '); try{ console.info(m);}catch{} pushEntry('info', 'console', m); },
    warn:  function(){ const m=[...arguments].join(' '); try{ console.warn(m);}catch{} pushEntry('warn', 'console', m); },
    error: function(){ const m=[...arguments].join(' '); try{ console.error(m);}catch{}pushEntry('error','console', m); },
    err:   function(){ return api.error.apply(null, arguments); }, // Alias
    log:   function(){ return api.info.apply(null, arguments); },

    getBuffer: function(){ return _buf.slice(); },
    clear:     function(){ _buf.length = 0; },
    setMaxBuffer: function(n){ _max = Math.max(0, n|0); },

    on, off,

    LogStream: (function(){
      let wired=false; const orig={};
      function start(){
        if (wired) return;
        wired = true;
        ['log','info','warn','error'].forEach(k=>{
          orig[k] = console[k];
          console[k] = function(){
            try{
              if (k==='error') api.error(...arguments);
              else if (k==='warn') api.warn(...arguments);
              else if (k==='log') api.ok(...arguments);
              else api.info(...arguments);
            }catch{}
            return orig[k].apply(this, arguments);
          };
        });
      }
      function stop(){
        if (!wired) return;
        wired = false;
        ['log','info','warn','error'].forEach(k=>{ if (orig[k]) console[k]=orig[k]; });
      }
      return { start, stop, isActive:()=>wired };
    })()
  };

  window.CBLog = api;
  try{ api.info(MOD, 'Polyfill aktiv', VER); }catch{}
})();
