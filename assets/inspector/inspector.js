<script>
/* assets/inspector/inspector.js — v16.3.1
   Live/Logs: sammelt CBLog + console als Fallback */

(function(){
  'use strict';
  var VERSION = 'v16.3.1';

  // ===== Log-Puffer / Bus =====
  var bus = { listeners:[] };
  function emit(entry){ for (var i=0;i<bus.listeners.length;i++) try{ bus.listeners[i](entry);}catch(_){ } }

  // CBLog-Abgriff (falls vorhanden)
  var store = [];
  function push(kind, msg){
    var line = '['+new Date().toLocaleTimeString()+'] '+kind+' '+msg;
    store.push(line);
    // flag auch global lesbar
    window.__INSPECTOR_LOGS__ = store;
    emit(line);
  }

  // Fallback: console patchen, aber schonend
  try{
    var _log = console.log, _warn = console.warn, _err = console.error;
    console.log = function(){ _log.apply(console, arguments); push('LOG', Array.prototype.join.call(arguments,' ')); };
    console.warn = function(){ _warn.apply(console, arguments); push('WARN', Array.prototype.join.call(arguments,' ')); };
    console.error = function(){ _err.apply(console, arguments); push('ERR', Array.prototype.join.call(arguments,' ')); };
  }catch(_){}

  // Falls ein vorhandenes CBLog existiert → anhängen
  if (window.CBLog && typeof CBLog.on==='function'){
    try{
      CBLog.on(function(line){ push('LOG', String(line)); });
    }catch(_){}
  } else {
    // Minimal-CBLog bereitstellen, damit andere Module sauber loggen können
    window.CBLog = window.CBLog || {
      ok:   function(){ push('LOG', Array.prototype.join.call(arguments,' ')); },
      warn: function(){ push('WARN',Array.prototype.join.call(arguments,' ')); },
      err:  function(){ push('ERR', Array.prototype.join.call(arguments,' ')); },
      on:   function(fn){ bus.listeners.push(fn); },
      entries: store
    };
  }

  // ===== UI =====
  var panel, tabLive, tabLogs, bodyLive, bodyLogs, shown=false;

  function open(){
    if (shown) return;
    shown = true;
    panel.style.display = 'block';
    renderLive(); renderLogs();
  }
  function close(){ shown=false; panel.style.display='none'; }
  function toggle(){ shown?close():open(); }

  function mk(tag, cls, html){ var n=document.createElement(tag); if(cls) n.className=cls; if(html!=null) n.innerHTML=html; return n; }

  function renderLive(){
    var v = {
      version: VERSION,
      dpr: Math.round((window.devicePixelRatio||1)*10)/10,
      index: (window.__INDEX_VERSION__||'unbekannt'),
      GameLoader: !!window.GameLoader,
      Game: !!window.Game,
      GameUI: !!window.GameUI
    };
    bodyLive.textContent = JSON.stringify(v, null, 2);
  }
  function renderLogs(){
    var list = window.CBLog && CBLog.entries ? CBLog.entries : (window.__INSPECTOR_LOGS__ || []);
    bodyLogs.textContent = (list && list.length) ? list.join('\n') : '(keine Logs)';
  }

  function build(){
    panel = mk('div','insp-panel');
    panel.style.display='none';

    var head = mk('div','insp-head','Inspector <small>(v'+VERSION+')</small>');
    panel.appendChild(head);

    // Tabs
    var tabs = mk('div','insp-tabs','');
    tabLive = mk('button','insp-tab active','Live');
    tabLogs = mk('button','insp-tab','Logs');
    tabs.appendChild(tabLive); tabs.appendChild(tabLogs);
    panel.appendChild(tabs);

    bodyLive = mk('pre','insp-body',''); panel.appendChild(bodyLive);
    bodyLogs = mk('pre','insp-body',''); bodyLogs.style.display='none'; panel.appendChild(bodyLogs);

    tabLive.addEventListener('click', function(){
      tabLive.classList.add('active'); tabLogs.classList.remove('active');
      bodyLive.style.display='block'; bodyLogs.style.display='none'; renderLive();
    });
    tabLogs.addEventListener('click', function(){
      tabLogs.classList.add('active'); tabLive.classList.remove('active');
      bodyLogs.style.display='block'; bodyLive.style.display='none'; renderLogs();
    });

    // Action-Buttons
    var bar = mk('div','insp-actions','');
    var bCopy = mk('button','insp-btn','Kopieren');
    var bExport = mk('button','insp-btn','Export (.txt)');
    var bClear = mk('button','insp-btn','Leeren');
    bar.appendChild(bCopy); bar.appendChild(bExport); bar.appendChild(bClear);
    panel.appendChild(bar);

    bCopy.addEventListener('click', function(){
      var txt = (bodyLogs.style.display!=='none'?bodyLogs:bodyLive).textContent || '';
      navigator.clipboard && navigator.clipboard.writeText(txt).then(function(){ CBLog.ok('[inspector] Log in Zwischenablage.'); });
    });
    bExport.addEventListener('click', function(){
      var txt = (bodyLogs.style.display!=='none'?bodyLogs:bodyLive).textContent || '';
      var blob = new Blob([txt], {type:'text/plain'});
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'logs.txt'; a.click();
    });
    bClear.addEventListener('click', function(){
      store.length = 0; window.__INSPECTOR_LOGS__ = store; renderLogs();
    });

    document.body.appendChild(panel);

    // Floating Toggle (Schraubenschlüssel rechts unten – wie gehabt)
    var flo = mk('button','insp-fab','🛠️');
    flo.title = 'Inspector';
    flo.addEventListener('click', toggle);
    document.body.appendChild(flo);

    // live updates
    window.addEventListener('cb:ui-ready', renderLive, {passive:true});
    window.addEventListener('cb:game-started', renderLive, {passive:true});
    bus.listeners.push(function(){ if (shown && tabLogs.classList.contains('active')) renderLogs(); });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', build);
  } else { build(); }
})();
</script>
