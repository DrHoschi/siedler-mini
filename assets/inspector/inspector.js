/*! inspector.js — City Builder Inspector (v16.3.5)
    - FAB rechts unten öffnet/schließt Panel
    - Live/Logs; nutzt CBLog, fällt auf lokalen Buffer zurück
    - fixed Overlay (zoomt NICHT mit), Events werden NICHT zur Canvas gebubbelt
*/
(function(){
  'use strict';
  var VERSION = 'v16.3.5';

  // --- log buffer ------------------------------------------------------------
  var localBuf = [];
  function pushBuf(level, args){
    try {
      var line = '['+new Date().toLocaleTimeString()+'] '+level+' '+Array.prototype.map.call(args,function(a){
        try { return (typeof a==='object') ? JSON.stringify(a) : String(a); }
        catch(_){ return String(a); }
      }).join(' ');
      localBuf.push(line);
      if (localBuf.length>500) localBuf.shift();
    } catch(_){}
  }

  // Hook CBLog (wenn nicht vorhanden)
  if (!window.CBLog){
    var orig = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console)
    };
    window.CBLog = {
      ok: function(){ orig.log.apply(console, arguments); pushBuf('OK ', arguments); },
      warn: function(){ orig.warn.apply(console, arguments); pushBuf('WARN', arguments); },
      err: function(){ orig.error.apply(console, arguments); pushBuf('ERR', arguments); },
      copy: function(){
        var t = (localBuf.join('\n')||'');
        try{ navigator.clipboard.writeText(t); }catch(_){}
      },
      buffer: localBuf
    };
  }

  // --- DOM helpers -----------------------------------------------------------
  function $el(tag, cls, html){ var n=document.createElement(tag); if(cls) n.className=cls; if(html!=null) n.innerHTML=html; return n; }
  function stopAll(e){ if(e){ if(e.preventDefault) e.preventDefault(); if(e.stopPropagation) e.stopPropagation(); } return false; }

  // --- UI --------------------------------------------------------------------
  var UI = { root:null, panel:null, fab:null, live:null, logs:null, tabLive:null, tabLogs:null, open:false, built:false };

  function buildUI(){
    if (UI.built) return;
    UI.built = true;

    var root = $el('div','cb-inspector-root');
    root.addEventListener('click', stopAll, {passive:false});
    root.addEventListener('wheel', stopAll, {passive:false});
    root.addEventListener('touchstart', stopAll, {passive:false});
    root.addEventListener('touchmove', stopAll, {passive:false});

    var panel = $el('div','cb-inspector-panel');
    var head  = $el('div','cb-insp-head','<strong>Inspector</strong> <span class="muted">(v'+VERSION+')</span>');
    var tabs  = $el('div','cb-insp-tabs');
    var tabLive = $el('button','active','Live');
    var tabLogs = $el('button','','Logs');
    tabs.appendChild(tabLive); tabs.appendChild(tabLogs);

    var live = $el('div','cb-insp-live');    // (hier könnten Live-Werte erscheinen)
    var logs = $el('pre','cb-insp-logs');    // Textpuffer

    panel.appendChild(head);
    panel.appendChild(tabs);
    panel.appendChild(live);
    panel.appendChild(logs);

    // FAB
    var fab = $el('button','cb-fab cb-fab-insp','<span class="wrench">🛠️</span>');
    fab.title = 'Inspector';
    fab.addEventListener('click', function(e){ stopAll(e); toggle(); }, {passive:false});

    // Tabs
    tabLive.addEventListener('click', function(e){
      stopAll(e);
      tabLive.classList.add('active'); tabLogs.classList.remove('active');
      live.style.display='block'; logs.style.display='none';
    });
    tabLogs.addEventListener('click', function(e){
      stopAll(e);
      tabLogs.classList.add('active'); tabLive.classList.remove('active');
      live.style.display='none'; logs.style.display='block';
      refreshLogs();
    });

    root.appendChild(panel);
    root.appendChild(fab);
    document.body.appendChild(root);

    UI.root=root; UI.panel=panel; UI.fab=fab; UI.live=live; UI.logs=logs; UI.tabLive=tabLive; UI.tabLogs=tabLogs;

    setOpen(false);
    CBLog.ok('[inspector] Modul geladen (v'+VERSION+')');
  }

  function refreshLogs(){
    try {
      var buf = (window.CBLog && CBLog.buffer) ? CBLog.buffer : localBuf;
      UI.logs.textContent = (buf && buf.join('\n')) || '';
    } catch(_){}
  }

  function setOpen(flag){
    UI.open = !!flag;
    if (!UI.root) return;
    UI.root.classList.toggle('open', UI.open);
    document.documentElement.classList.toggle('cb-inspector-open', UI.open);
    if (UI.open) refreshLogs();
  }
  function toggle(){ setOpen(!UI.open); }

  // Public
  window.InspectorUI = window.InspectorUI || {};
  window.InspectorUI.open   = function(){ setOpen(true); };
  window.InspectorUI.close  = function(){ setOpen(false); };
  window.InspectorUI.toggle = toggle;
  window.InspectorUI.version = VERSION;

  // Lifecycle
  window.addEventListener('DOMContentLoaded', buildUI);

})();
