/*! Inspector v16.2.7 — Siedler 2020 (ES5, no deps) */
(function () {
  'use strict';

  var VERSION = 'v16.2.7';
  var d = document;

  // ------- small helpers
  function $(sel, root){ return (root||d).querySelector(sel); }
  function $all(sel, root){ return [].slice.call((root||d).querySelectorAll(sel)); }
  function on(el, ev, fn, opt){ el && el.addEventListener && el.addEventListener(ev, fn, opt||false); }
  function fmt(v){ try{return JSON.stringify(v, null, 2);}catch(_){return String(v);} }
  function nowStr(){ var t=new Date(); function p(n){return (n<10?'0':'')+n;} return [p(t.getHours()),p(t.getMinutes()),p(t.getSeconds())].join(':'); }
  function download(name, text){
    var a=d.createElement('a'); a.href='data:text/plain;charset=utf-8,'+encodeURIComponent(text); a.download=name; d.body.appendChild(a); a.click(); setTimeout(function(){d.body.removeChild(a);},0);
  }

  // ------- Log buffer (CBLog wrapper)
  var CBLog = (function(){
    var history = [];
    function push(kind, args){
      var line = '['+ nowStr() +'] ' + kind.toUpperCase() + ' ' + [].slice.call(args).map(function(a){
        if (typeof a==='string') return a;
        try { return JSON.stringify(a); } catch(_){ return String(a); }
      }).join(' ');
      history.push(line);
      if (history.length > 2000) history.shift();
      // stream to UI if open
      var box = $('#cb-inspector .log-box');
      if (box && box.__activeTab==='logs') {
        var wasBottom = (box.scrollTop + box.clientHeight + 10 >= box.scrollHeight);
        appendToLogs(line);
        if (wasBottom) box.scrollTop = box.scrollHeight;
      }
    }
    function appendToLogs(line){
      var pre = $('#cb-inspector .logs-pre');
      if (pre) { pre.textContent += (pre.textContent ? '\n' : '') + line; }
    }
    var api = {
      ok: function(){ push('LOG', arguments); (console.log||function(){}).apply(console, arguments); },
      warn: function(){ push('WARN', arguments); (console.warn||console.log||function(){}).apply(console, arguments); },
      err: function(){ push('ERR', arguments); (console.error||console.log||function(){}).apply(console, arguments); },
      dump: function(){ return history.join('\n'); },
      clear: function(){ history.length=0; var pre=$('#cb-inspector .logs-pre'); if(pre) pre.textContent=''; }
    };
    // expose globally once
    if (!window.CBLog) window.CBLog = api;
    return window.CBLog;
  })();

  // ------- UI skeleton
  var css = ''+
  '#cb-inspector-toggle{position:fixed;right:14px;bottom:14px;z-index:99999;'+
    'width:54px;height:54px;border-radius:50%;border:1px solid rgba(255,255,255,.15);'+
    'background:linear-gradient(180deg, rgba(255,255,255,.08), rgba(0,0,0,.18));'+
    'backdrop-filter:saturate(1.1) blur(4px);box-shadow:0 10px 34px rgba(0,0,0,.35);'+
    'color:#e6f3ea;font-weight:700;cursor:pointer}'+
  '#cb-inspector-toggle span{display:block;line-height:54px;text-align:center}'+

  '#cb-inspector{position:fixed;left:16px;right:16px;bottom:86px;z-index:99998;'+
    'max-width:920px;margin:0 auto;border-radius:18px;'+
    'background:rgba(7,18,14,.92);border:1px solid rgba(255,255,255,.08);'+
    'box-shadow:0 28px 80px rgba(0,0,0,.55);color:#e6f3ea;display:none;}'+
  '#cb-inspector.open{display:block}'+
  '#cb-inspector .hdr{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:14px 16px 6px}'+
  '#cb-inspector .title{font:600 16px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}'+
  '#cb-inspector .sub{opacity:.7;font:12px ui-monospace,Menlo,Consolas,monospace}'+
  '#cb-inspector .tabs{display:flex;gap:8px;padding:0 16px 10px}'+
  '#cb-inspector .tabs button{padding:8px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);'+
    'background:rgba(255,255,255,.06);color:#e6f3ea;cursor:pointer;font-weight:600}'+
  '#cb-inspector .tabs button.active{background:rgba(255,255,255,.14)}'+
  '#cb-inspector .body{padding:0 16px 16px}'+
  '#cb-inspector .card{border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);padding:12px;margin:0 0 12px}'+
  '#cb-inspector .live-pre, #cb-inspector .logs-pre{white-space:pre-wrap;font:12px ui-monospace,Menlo,Consolas,monospace;margin:0}'+
  '#cb-inspector .log-box{height:240px;overflow:auto}'+
  '#cb-inspector .btns{display:flex;gap:8px;justify-content:flex-start;margin:8px 0 0}'+
  '#cb-inspector .btns button{padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.12);'+
    'background:rgba(255,255,255,.06);color:#e6f3ea;cursor:pointer;font-weight:600}';

  var html = ''+
  '<div class="hdr">'+
    '<div><div class="title">Inspector <span class="sub">('+ VERSION +')</span></div>'+
    '<div class="sub" id="cb-inspector-meta">…</div></div>'+
    '<div class="sub" id="cb-inspector-version"></div>'+
  '</div>'+
  '<div class="tabs">'+
    '<button data-tab="live" class="tab-live active">Live</button>'+
    '<button data-tab="logs" class="tab-logs">Logs</button>'+
  '</div>'+
  '<div class="body">'+
    '<div class="tab-content tab-live">'+
      '<div class="card"><pre class="live-pre">{}</pre></div>'+
    '</div>'+
    '<div class="tab-content tab-logs" style="display:none">'+
      '<div class="card log-box"><pre class="logs-pre"></pre></div>'+
      '<div class="btns">'+
        '<button data-act="copy">Kopieren</button>'+
        '<button data-act="export">Export (.txt)</button>'+
        '<button data-act="clear">Leeren</button>'+
      '</div>'+
    '</div>'+
  '</div>';

  function ensureUI(){
    // style
    if (!$('#cb-inspector-style')) {
      var s = d.createElement('style'); s.id='cb-inspector-style'; s.textContent = css; d.head.appendChild(s);
    }
    // toggle button (ersetzt alten Platzhalter)
    var old = d.getElementById('btn-inspector') || d.getElementById('inspectorToggle');
    var btn = d.getElementById('cb-inspector-toggle');
    if (!btn) {
      btn = d.createElement('button');
      btn.id = 'cb-inspector-toggle';
      btn.innerHTML = '<span>🛠️</span>';
      d.body.appendChild(btn);
    }
    if (old && old!==btn && old.parentNode) { old.parentNode.removeChild(old); }

    // panel
    var panel = d.getElementById('cb-inspector');
    if (!panel){
      panel = d.createElement('section');
      panel.id = 'cb-inspector';
      panel.innerHTML = html;
      d.body.appendChild(panel);
    }
    // mark as ready for external checks
    window.CBInspectorReady = true;
    panel.setAttribute('data-inspector-ready','1');

    // button toggle
    on(btn, 'click', function(){ panel.classList.toggle('open'); if (panel.classList.contains('open')) refreshLive(); });

    // tabs
    var tabLive = $('#cb-inspector .tab-live'), tabLogs = $('#cb-inspector .tab-logs');
    var boxLive = $('#cb-inspector .tab-content.tab-live');
    var boxLogs = $('#cb-inspector .tab-content.tab-logs');
    function switchTab(tab){
      $('#cb-inspector .log-box').__activeTab = tab;
      if(tab==='live'){ tabLive.classList.add('active'); tabLogs.classList.remove('active'); boxLive.style.display=''; boxLogs.style.display='none'; refreshLive(); }
      else { tabLogs.classList.add('active'); tabLive.classList.remove('active'); boxLogs.style.display=''; boxLive.style.display='none'; }
    }
    on(tabLive,'click',function(){ switchTab('live'); });
    on(tabLogs,'click',function(){ switchTab('logs'); });

    // log buttons
    on($('#cb-inspector [data-act="copy"]'),'click', function(){
      try{ var t = CBLog.dump(); navigator.clipboard && navigator.clipboard.writeText(t); }catch(_){}
    });
    on($('#cb-inspector [data-act="export"]'),'click', function(){
      download('siedler-mini-log.txt', CBLog.dump());
    });
    on($('#cb-inspector [data-act="clear"]'),'click', function(){
      CBLog.clear();
    });

    $('#cb-inspector-version').textContent = 'index ' + (window.__cb && window.__cb.indexVersion ? window.__cb.indexVersion : 'unbekannt');
    refreshLive();
  }

  function refreshLive(){
    var live = $('#cb-inspector .live-pre');
    var meta = $('#cb-inspector-meta');
    try{
      var canvas = d.getElementById('game');
      var pxW = canvas ? canvas.width : 0, pxH = canvas ? canvas.height : 0;
      var cssW = canvas ? canvas.style.width||'' : '', cssH = canvas ? canvas.style.height||'' : '';
      var map = (window.Game && window.Game.getCurrentMap) ? window.Game.getCurrentMap() : null;
      var mapInfo = map ? { w: map.width, h: map.height, tile: map.tile } : null;

      var payload = {
        version: (window.GameLoader && GameLoader.version) || (window.Game && Game.version) || 'unbekannt',
        index: (window.__cb && window.__cb.indexVersion) || 'unbekannt',
        game: (window.Game && Game.version) || (window.GameLoader && GameLoader.version) || 'unbekannt',
        canvas: { pxW: pxW, pxH: pxH, cssW: cssW, cssH: cssH },
        dpr: Math.round((window.devicePixelRatio||1)*10)/10,
        fps: (window.__cb && __cb.fps) || null,
        map: (map && map.url) || (window.__cb && __cb.map) || null,
        mapSize: mapInfo,
        tile: mapInfo ? mapInfo.tile : null,
        perfNow: Math.round(performance && performance.now ? performance.now() : 0)
      };
      if (!mapInfo && !(window.__cb && __cb.map)) { payload.note = 'Keine Runtime–Daten. Spiel noch nicht gestartet?'; }
      live.textContent = fmt(payload);
      meta.textContent = (payload.index + ' · dpr: ' + payload.dpr);
    }catch(e){
      live.textContent = fmt({ error: e.message });
    }
  }

  // listen for engine/game events to refresh
  on(window, 'cb:engine-ready', refreshLive);
  on(window, 'cb:game-started', refreshLive);
  on(window, 'resize', function(){ setTimeout(refreshLive, 50); });

  // auto-init
  if (d.readyState === 'loading') { on(d, 'DOMContentLoaded', ensureUI); }
  else { ensureUI(); }

  // initial log
  CBLog.ok('[inspector] Modul geladen ('+VERSION+')');
})();
