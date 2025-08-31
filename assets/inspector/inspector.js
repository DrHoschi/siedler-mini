// assets/inspector/inspector.js — v16.3.3
(function(){
  'use strict';

  var VERSION = 'v16.3.3';
  var root, btn, liveBox, logBox, tabLive, tabLogs;
  var buffer = [];

  // ------- CBLog shim so alles konsistent landet ---------------------------
  window.CBLog = window.CBLog || (function(){
    var list = [];
    function push(prefix, args){ try{ list.push(time() + ' ' + prefix + ' ' + Array.prototype.slice.call(args).join(' ')); flush(); }catch(_){ } }
    function time(){ var d=new Date(); return '['+d.toTimeString().slice(0,8)+']'; }
    return {
      log: function(){ console.log.apply(console, arguments); push('LOG', arguments); },
      ok : function(){ console.log.apply(console, arguments); push('OK ', arguments); },
      warn:function(){ console.warn.apply(console, arguments); push('WARN', arguments); },
      err: function(){ console.error.apply(console, arguments); push('ERR', arguments); },
      dump: function(){ return list.join('\n'); }
    };
  })();

  // hook console.* zusätzlich in den Inspector-Puffer
  ['log','warn','error'].forEach(function(k){
    var orig = console[k];
    console[k] = function(){
      try {
        buffer.push({lvl:k, msg:Array.prototype.slice.call(arguments).join(' ')});
        flush();
      } catch(_){}
      orig.apply(console, arguments);
    };
  });

  function injectStyle(){
    if (document.getElementById('inspector-style')) return;
    var css = `
      .insp-toggle{
        position:fixed; right:14px; bottom:18px; z-index:9;
        width:56px;height:56px;border-radius:50%;
        background:rgba(26,34,29,.85); color:#cde6ff; border:1px solid rgba(255,255,255,.08);
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 8px 24px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05);
        backdrop-filter: blur(10px);
        cursor:pointer; user-select:none; font-size:26px;
      }
      .insp{
        position:fixed; left:12px; right:12px; bottom:92px; z-index:10;
        background:rgba(17,25,21,.92); color:#e8efe8; border-radius:16px; padding:14px;
        border:1px solid rgba(255,255,255,.06); box-shadow:0 18px 60px rgba(0,0,0,.4);
        backdrop-filter: blur(10px); transform:translateY(110%); transition:transform .25s ease;
      }
      .insp.open{ transform:translateY(0); }
      .insp-h{ display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
      .insp-tabs{ display:flex; gap:8px; }
      .insp-tab{ padding:6px 10px; border-radius:10px; border:1px solid rgba(255,255,255,.1); cursor:pointer; }
      .insp-tab.active{ background:#2c3b32; }
      .insp-box{ height:180px; overflow:auto; background:rgba(0,0,0,.25); border-radius:10px; padding:10px; font:12px/1.4 monospace; }
      .insp-btns{ display:flex; gap:10px; margin-top:10px; }
      .insp-btn{ padding:8px 12px; border-radius:10px; border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.05); cursor:pointer; }
    `;
    var st=document.createElement('style'); st.id='inspector-style'; st.textContent=css; document.head.appendChild(st);
  }

  function flush(){
    if (!logBox) return;
    // Inhalte setzen
    try {
      if (buffer.length){
        var frag = document.createDocumentFragment();
        buffer.splice(0).forEach(function(r){
          var div = document.createElement('div');
          div.textContent = r.lvl.toUpperCase()+': '+r.msg;
          frag.appendChild(div);
        });
        logBox.appendChild(frag);
        logBox.scrollTop = logBox.scrollHeight;
      }
    } catch(_){}
  }

  function build(){
    injectStyle();

    // Toggle btn
    btn = document.createElement('div');
    btn.className = 'insp-toggle';
    btn.title = 'Inspector';
    btn.textContent = '🛠';
    document.body.appendChild(btn);

    // Panel
    root = document.createElement('div');
    root.className = 'insp';
    root.innerHTML = `
      <div class="insp-h">
        <div>Inspector <small>(v${VERSION})</small></div>
        <div class="insp-tabs">
          <div class="insp-tab active" data-k="live">Live</div>
          <div class="insp-tab" data-k="logs">Logs</div>
        </div>
      </div>
      <div class="insp-box insp-live"></div>
      <div class="insp-box insp-logs" style="display:none"></div>
      <div class="insp-btns">
        <button class="insp-btn insp-copy">Kopieren</button>
        <button class="insp-btn insp-clear">Leeren</button>
      </div>
    `;
    document.body.appendChild(root);

    liveBox = root.querySelector('.insp-live');
    logBox  = root.querySelector('.insp-logs');
    tabLive = root.querySelector('.insp-tab[data-k="live"]');
    tabLogs = root.querySelector('.insp-tab[data-k="logs"]');

    tabLive.addEventListener('click', function(){
      tabLive.classList.add('active'); tabLogs.classList.remove('active');
      liveBox.style.display='block'; logBox.style.display='none';
    });
    tabLogs.addEventListener('click', function(){
      tabLogs.classList.add('active'); tabLive.classList.remove('active');
      liveBox.style.display='none'; logBox.style.display='block'; flush();
    });

    root.querySelector('.insp-copy').addEventListener('click', function(){
      var txt = (window.CBLog && CBLog.dump ? CBLog.dump() : '');
      try { navigator.clipboard.writeText(txt); CBLog.ok('[inspector] Log kopiert'); } catch(_){}
    });
    root.querySelector('.insp-clear').addEventListener('click', function(){
      logBox.innerHTML=''; CBLog.ok('[inspector] Log geleert');
    });

    btn.addEventListener('click', function(){ root.classList.toggle('open'); });

    updateLive();
    setInterval(updateLive, 1000);

    CBLog.ok('[inspector] Modul geladen ('+VERSION+')');
  }

  function updateLive(){
    if (!liveBox) return;
    var data = {
      index: (window.INDEX_VERSION || 'n/a'),
      uiStart: 'ok',
      uiBuild: 'ok',
      dpr: window.devicePixelRatio || 1,
      GameLoader: !!window.GameLoader,
      Game: !!window.Game,
      GameUI: !!window.GameUI
    };
    liveBox.textContent = JSON.stringify(data, null, 2);
  }

  // Public toggle/open helpers (optional external use)
  window.InspectorUI = {
    open:  function(){ root && root.classList.add('open'); },
    close: function(){ root && root.classList.remove('open'); },
    toggle:function(){ root && root.classList.toggle('open'); }
  };

  if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', build); }
  else { build(); }
})();
