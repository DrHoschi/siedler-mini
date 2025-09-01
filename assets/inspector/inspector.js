/* assets/inspector/inspector.js — v16.4.5
   Floating Inspector mit Tabs: Live • Logs • Tests
   - Logs: fängt console.log/warn/error + CBLog.* ab und zeigt sie im Panel
   - Tests: Carrier-Buttons (Autotest-Flag, einmaliger Spawn)
   - UI ist fixed (kein Map-Zoom), extrem hoher z-index + pointer-events: auto
*/
(function(){
  'use strict';

  var VERSION = 'v16.4.5';

  // ---------- util: logger facade ----------
  var _rawConsole = { log:console.log, warn:console.warn, error:console.error };
  var buffer = [];             // {t, level, msg}
  var maxBuffer = 2000;
  var listeners = [];          // fn(entry)
  var muted = false;

  function ts(){
    var d = new Date();
    function p2(n){ return (n<10?'0':'')+n; }
    return '['+p2(d.getHours())+':'+p2(d.getMinutes())+':'+p2(d.getSeconds())+']';
  }
  function push(level, args){
    var entry = { t:ts(), level:level, msg:Array.prototype.slice.call(args).map(safeStr).join(' ') };
    buffer.push(entry);
    if (buffer.length>maxBuffer) buffer.shift();
    for (var i=0;i<listeners.length;i++) try{ listeners[i](entry); }catch(_){}
  }
  function safeStr(v){
    if (v===null) return 'null';
    if (v===undefined) return 'undefined';
    if (typeof v==='object'){
      try { return JSON.stringify(v); } catch(_){ return '[Object]'; }
    }
    return String(v);
  }

  // wrap console.* and CBLog.*
  if (!console.__cbWrapped){
    console.__cbWrapped = true;
    console.log  = function(){ _rawConsole.log.apply(console, arguments);  if(!muted) push('LOG',  arguments); };
    console.warn = function(){ _rawConsole.warn.apply(console, arguments); if(!muted) push('WARN', arguments); };
    console.error= function(){ _rawConsole.error.apply(console, arguments);if(!muted) push('ERR',  arguments); };
  }
  if (!window.CBLog){
    window.CBLog = {
      ok:   function(){ console.log.apply(console, arguments); },
      warn: function(){ console.warn.apply(console, arguments); },
      err:  function(){ console.error.apply(console, arguments); }
    };
  } else if (!window.CBLog.__cbWrapped){
    window.CBLog.__cbWrapped = true;
    var _ok=CBLog.ok, _w=CBLog.warn, _e=CBLog.err;
    CBLog.ok   = function(){ try{ _ok.apply(CBLog, arguments); }catch(_){ console.log.apply(console, arguments); }   if(!muted) push('OK',   arguments); };
    CBLog.warn = function(){ try{ _w.apply(CBLog, arguments); }catch(_){ console.warn.apply(console, arguments);}    if(!muted) push('WARN', arguments); };
    CBLog.err  = function(){ try{ _e.apply(CBLog, arguments); }catch(_){ console.error.apply(console, arguments);}   if(!muted) push('ERR',  arguments); };
  }

  // ---------- UI ----------
  var UI = (window.GameUI = window.GameUI || {});
  UI._ins = UI._ins || {};

  var $root, $panel, $tabs, $live, $logs, $tests, $btnOpen, $btnClose, $logList, $logStats;
  var state = { open:false, tab:'logs', autoscroll:true };

  function el(tag, cls, html){ var e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }

  function ensureRoot(){
    if ($root) return;

    injectCSS();

    // open button (unten rechts, sehr hoher z-index)
    $btnOpen = el('button','cb-ins-open','<span>🛠</span>');
    $btnOpen.title = 'Inspector öffnen';
    $btnOpen.addEventListener('click', open);
    document.body.appendChild($btnOpen);

    // panel
    $panel = el('div','cb-ins-panel');
    document.body.appendChild($panel);

    // header
    var $head = el('div','cb-ins-head', '<strong>Inspector</strong> <em class="v">('+VERSION+')</em>');
    $panel.appendChild($head);

    // close
    $btnClose = el('button','cb-ins-close','×');
    $btnClose.title = 'Schließen';
    $btnClose.addEventListener('click', close);
    $head.appendChild($btnClose);

    // tabs
    $tabs = el('div','cb-ins-tabs');
    $tabs.appendChild(tabBtn('live','Live'));
    $tabs.appendChild(tabBtn('logs','Logs'));
    $tabs.appendChild(tabBtn('tests','Tests'));
    $panel.appendChild($tabs);

    // bodies
    $live  = el('div','cb-ins-body');  $panel.appendChild($live);
    $logs  = el('div','cb-ins-body');  $panel.appendChild($logs);
    $tests = el('div','cb-ins-body');  $panel.appendChild($tests);

    buildLive($live);
    buildLogs($logs);
    buildTests($tests);

    switchTab(state.tab || 'logs');
    close(); // start geschlossen
  }

  function tabBtn(id, label){
    var b = el('button','cb-tab', label);
    b.dataset.tab = id;
    b.addEventListener('click', function(){ switchTab(id); });
    return b;
  }
  function switchTab(id){
    state.tab = id;
    var btns = $tabs.querySelectorAll('.cb-tab');
    for (var i=0;i<btns.length;i++){
      var b=btns[i];
      if (b.dataset.tab===id) b.classList.add('active'); else b.classList.remove('active');
    }
    $live.style.display  = (id==='live' )?'block':'none';
    $logs.style.display  = (id==='logs' )?'block':'none';
    $tests.style.display = (id==='tests')?'block':'none';
  }

  // ---------- Live ----------
  function buildLive(c){
    c.innerHTML = '';
    var g = el('div','kv');
    c.appendChild(g);
    function row(k,v){ var r=el('div','row'); r.appendChild(el('span','k',k)); r.appendChild(el('span','v',v)); g.appendChild(r); }

    function refresh(){
      var w='?',h='?',z='?', cx='?',cy='?';
      try{
        var cam = (window.Game && Game.getCamera && Game.getCamera()) || {};
        z = (cam.zoom!=null? cam.zoom.toFixed(2):'?'); cx = cam.x|0; cy = cam.y|0;
        var m = (window.Game && Game.currentMap) || {};
        w = m.width|0; h = m.height|0;
      }catch(_){}
      g.innerHTML='';
      row('Map', w+' × '+h);
      row('Kamera', 'x:'+cx+' y:'+cy+' z:'+z);
      row('Tile', (window.Game && Game.getTileSize && Game.getTileSize())||'?');
      row('Roads', (window.Game && Game.getRoadSet && Game.getRoadSet().size)||0);
    }

    setInterval(refresh, 500);
    refresh();
  }

  // ---------- Logs ----------
  function buildLogs(c){
    c.innerHTML = '';
    var bar = el('div','log-bar');
    var btnClr = el('button','', 'Leeren');
    var btnCopy = el('button','', 'In Zwischenablage');
    var chkAuto = el('label','chk','<input type="checkbox" checked> Auto-Scroll');
    $logStats = el('span','stats','');

    btnClr.addEventListener('click', function(){ buffer.length=0; renderList(true); });
    btnCopy.addEventListener('click', function(){
      var text = buffer.map(function(e){ return e.t+' '+e.level+' '+e.msg; }).join('\n');
      try{ navigator.clipboard.writeText(text); }catch(_){}
    });
    chkAuto.querySelector('input').addEventListener('change', function(){ state.autoscroll = this.checked; });

    bar.appendChild(btnClr); bar.appendChild(btnCopy); bar.appendChild(chkAuto); bar.appendChild($logStats);
    c.appendChild(bar);

    $logList = el('div','log-list');
    c.appendChild($logList);

    renderList(true);
    listeners.push(function(entry){ appendEntry(entry); });
  }

  function renderList(clear){
    if (!$logList) return;
    if (clear) $logList.innerHTML='';
    for (var i=0;i<buffer.length;i++) appendEntry(buffer[i], true);
    updateStats();
    if (state.autoscroll) $logList.scrollTop = $logList.scrollHeight;
  }
  function appendEntry(e, silent){
    var div = el('div', 'line '+e.level.toLowerCase(), '<span class="t">'+e.t+'</span> <span class="lvl">['+e.level+']</span> <span class="msg"></span>');
    div.querySelector('.msg').textContent = e.msg;
    $logList.appendChild(div);
    if (!silent && state.autoscroll) $logList.scrollTop = $logList.scrollHeight;
    updateStats();
  }
  function updateStats(){
    if (!$logStats) return;
    var n=buffer.length;
    var w=0, e=0;
    for (var i=0;i<n;i++){ if (buffer[i].level==='WARN') w++; else if (buffer[i].level==='ERR') e++; }
    $logStats.textContent = n+' Einträge · '+w+' Warn · '+e+' Fehler';
  }

  // ---------- Tests ----------
  function buildTests(c){
    c.innerHTML='';
    var wrap = el('div','tests');

    var b1 = el('button','tbtn','Carrier Autotest (1x)');
    b1.title = 'Setzt DEV_CARRIER_AUTOTEST=true und triggert einen Demo-Lauf nach Start';
    b1.addEventListener('click', function(){
      window.DEV_CARRIER_AUTOTEST = true;
      setTimeout(function(){ trySpawnCarrierDemo(true); }, 200);
      console.log('[tests] DEV_CARRIER_AUTOTEST = true gesetzt');
    });

    var b2 = el('button','tbtn','Carrier: Rathaus → Demo-Ziel');
    b2.title = 'Startet sofort 1 Carrier vom Kartenzentrum zu einem Nachbarziel';
    b2.addEventListener('click', function(){ trySpawnCarrierDemo(false); });

    wrap.appendChild(b1);
    wrap.appendChild(b2);

    c.appendChild(wrap);
  }

  function trySpawnCarrierDemo(isAuto){
    try{
      var CR = window.Carriers, GM = window.Game;
      if (!CR || !CR.spawn){ console.warn('[tests] Carriers.spawn fehlt'); return; }
      var m = GM && GM.currentMap ? GM.currentMap : {width:16, height:10};
      var cx = (m.width/2)|0, cy = (m.height/2)|0;
      var tx = Math.min(m.width-1,  cx + 3);
      var ty = Math.min(m.height-1, cy + 2);
      var c = CR.spawn({ from:{x:cx, y:cy}, to:{x:tx, y:ty} });
      if (c) console.log('[tests] Carrier gestartet von', cx,cy, 'nach', tx,ty, (isAuto?'(auto)':''));
      else   console.warn('[tests] Carrier-Start fehlgeschlagen (kein Pfad?)');
    } catch(e){
      console.error('[tests] Fehler beim Start:', e && e.message);
    }
  }

  // ---------- open/close API ----------
  function open(){ state.open=true;  $panel.classList.add('open');  $btnOpen.classList.add('hide'); }
  function close(){ state.open=false; $panel.classList.remove('open'); $btnOpen.classList.remove('hide'); }
  function toggle(){ state.open ? close() : open(); }

  var UIpub = (window.GameUI = window.GameUI || {});
  UIpub.openInspector   = open;
  UIpub.closeInspector  = close;
  UIpub.toggleInspector = toggle;

  // ---------- Events ----------
  window.addEventListener('cb:engine-ready', function(){ console.log('[inspector] cb:engine-ready'); });
  window.addEventListener('cb:game-started', function(){ console.log('[inspector] cb:game-started'); });

  // ---------- init ----------
  function init(){
    ensureRoot();
    console.log('[inspector] Modul geladen (v'+VERSION+')');
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();

  // ---------- styles ----------
  function injectCSS(){
    if (document.getElementById('cb-ins-css')) return;
    var css = [
      '.cb-ins-open{position:fixed;right:16px;bottom:16px;z-index:200000;pointer-events:auto;user-select:none;width:48px;height:48px;border-radius:50%;border:none;background:rgba(30,30,30,.92);color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.35);backdrop-filter:blur(6px);} ',
      '.cb-ins-open.hide{display:none;}',
      '.cb-ins-panel{position:fixed;inset:4% 4%;z-index:200001;background:rgba(10,14,12,.96);border:1px solid rgba(255,255,255,.08);border-radius:16px;backdrop-filter:blur(10px);box-shadow:0 20px 60px rgba(0,0,0,.6);display:none;color:#fff;pointer-events:auto;}',
      '.cb-ins-panel.open{display:block;}',
      '.cb-ins-head{display:flex;align-items:center;gap:12px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08);font-size:14px;}',
      '.cb-ins-head .v{opacity:.65;}',
      '.cb-ins-close{margin-left:auto;width:36px;height:36px;border:none;border-radius:8px;background:rgba(255,255,255,.12);color:#fff;font-size:18px;cursor:pointer;}',
      '.cb-ins-tabs{display:flex;gap:8px;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.06);} ',
      '.cb-ins-tabs .cb-tab{border:none;border-radius:999px;padding:6px 12px;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;}',
      '.cb-ins-tabs .cb-tab.active{background:rgba(76,175,80,.35);} ',
      '.cb-ins-body{position:absolute;left:0;right:0;top:108px;bottom:16px;padding:12px 14px;overflow:auto;}',
      /* Live */
      '.kv{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;max-width:520px;}',
      '.kv .row .k{opacity:.75;margin-right:6px;}',
      '.kv .row .v{font-weight:600;}',
      /* Logs */
      '.log-bar{display:flex;gap:8px;align-items:center;margin-bottom:8px;}',
      '.log-bar .chk{display:flex;align-items:center;gap:6px;opacity:.9;}',
      '.log-bar .stats{margin-left:auto;opacity:.75;}',
      '.log-list{font:12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08); border-radius:8px; padding:8px; height:calc(100% - 48px); overflow:auto;}',
      '.line{white-space:pre-wrap; word-break:break-word; padding:2px 0;}',
      '.line .t{opacity:.6; margin-right:6px;}',
      '.line .lvl{opacity:.8; margin-right:6px;}',
      '.line.ok{color:#cfe9c9;} .line.log{color:#e8e8e8;} .line.warn{color:#ffd27f;} .line.err{color:#ff8a8a;}',
      /* Tests */
      '.tests{display:flex;gap:10px;flex-wrap:wrap;}',
      '.tbtn{border:none;border-radius:10px;padding:10px 12px;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;}'
    ].join('');
    var st=document.createElement('style'); st.id='cb-ins-css'; st.textContent=css; document.head.appendChild(st);
  }

})();
