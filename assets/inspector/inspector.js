// inspector.js — v16.3.6
// Kleiner Inspector: Live/Logs, fix am unteren Rand, öffnet nur per Button.
// Keine Auto-Öffnung im Startscreen.

(function(){
  'use strict';
  var VERSION = 'v16.3.6';

  // Logging
  function ok(){  (window.CBLog && CBLog.ok  ? CBLog.ok  : console.log).apply(console, arguments); }
  function warn(){(window.CBLog && CBLog.warn? CBLog.warn : console.warn).apply(console, arguments); }

  var api = (window.Inspector = window.Inspector || {});
  var state = { root:null, body:null, live:null, logs:null, open:false, _wire:false };
  api._ready = false;

  function ce(tag, cls, html){ var n=document.createElement(tag); if(cls) n.className=cls; if(html!=null) n.innerHTML=html; return n; }

  function ensurePanel(){
    if (state.root) return state.root;

    var root = ce('div','insp-root');
    root.style.position = 'fixed';
    root.style.left = '0';
    root.style.right = '0';
    root.style.bottom = '0';
    root.style.zIndex = '2147483639';
    root.style.display = 'none';

    var chrome = ce('div','insp-chrome');
    var title  = ce('div','insp-title','Inspector <small>(' + VERSION + ')</small>');
    var tabs   = ce('div','insp-tabs');
    var btnLive= ce('button','insp-tab active','Live');
    var btnLogs= ce('button','insp-tab','Logs');
    tabs.appendChild(btnLive); tabs.appendChild(btnLogs);

    var body   = ce('div','insp-body');
    var live   = ce('div','insp-live');
    var logs   = ce('textarea','insp-logs'); logs.readOnly = true;

    body.appendChild(live); body.appendChild(logs);
    chrome.appendChild(title); chrome.appendChild(tabs);
    root.appendChild(chrome); root.appendChild(body);
    document.body.appendChild(root);

    // Tabs
    function show(which){
      btnLive.classList.toggle('active', which==='live');
      btnLogs.classList.toggle('active', which==='logs');
      live.style.display = (which==='live'?'':'none');
      logs.style.display = (which==='logs'?'':'none');
    }
    btnLive.onclick = function(){ show('live'); };
    btnLogs.onclick = function(){ show('logs'); };

    // store
    state.root=root; state.body=body; state.live=live; state.logs=logs;
    show('live');

    return root;
  }

  function wireConsole(){
    if (state._wire) return;
    state._wire = true;

    var _log  = console.log.bind(console);
    var _warn = console.warn.bind(console);
    var _err  = console.error.bind(console);

    function append(kind, args){
      if (!state.logs) return;
      var line = '['+kind+'] ' + Array.prototype.map.call(args, function(a){
        try { return (typeof a === 'object') ? JSON.stringify(a) : String(a); }
        catch(_){ return String(a); }
      }).join(' ') + '\n';
      state.logs.value += line;
      state.logs.scrollTop = state.logs.scrollHeight;
    }

    console.log = function(){ append('LOG', arguments); _log.apply(console, arguments); };
    console.warn= function(){ append('WARN',arguments); _warn.apply(console, arguments); };
    console.error=function(){ append('ERR', arguments); _err.apply(console, arguments); };
  }

  // ---------- Public API ----------
  api.init = function(opts){
    ensurePanel();
    wireConsole();
    api._ready = true;
    var autoOpen = opts && opts.autoOpen;
    if (autoOpen) api.open(); else api.close(); // kein Start-Overlay
    ok('[inspector] Modul geladen ('+VERSION+')');
  };

  api.open = function(){ ensurePanel(); state.root.style.display=''; state.open=true; return true; };
  api.close= function(){ if(!state.root) return false; state.root.style.display='none'; state.open=false; return false; };
  api.toggle=function(){ return state.open ? api.close() : api.open(); };

})();
