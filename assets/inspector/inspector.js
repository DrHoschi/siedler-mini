/* ============================================================================
 * Inspector — v17.2.0
 * Projekt: Siedler-Mini
 *
 * A) CBLog-Polyfill + Console-Hook (macht Logs sichtbar, falls CBLog fehlt)
 * B) Inspector-Core (Root + Tabs; kein Autocreate auf Landing-Page)
 * C) Tabs:
 *    - Übersicht: Map/Camera/Resources + Live-Refresh
 *    - Logs: CBLog-Dump mit Filter + Auto-Scroll
 *    - Build: Tool-Anzeige + Reset
 *    - Tests: Overlay-Toggle + Ressourcen-Adder + Heatmap-Reset
 * D) Persistenz (Tab & Overlay) via localStorage
 * ========================================================================== */

/* ===== A) CBLog-Polyfill ================================================== */
(function(){
  'use strict';
  if (window.CBLog && typeof window.CBLog.dump === 'function') return;

  var _buf = [];            // {lvl, time, msg}
  var _limit = 1000;
  function _push(lvl, msg){
    try{
      var t = new Date().toISOString().substring(11,19);
      _buf.push({ lvl:lvl, time:t, msg: String(msg) });
      if (_buf.length > _limit) _buf.shift();
    }catch(_){}
  }
  var _orig = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  };
  // Hook in Konsole (nicht invasiv)
  console.log  = function(){ try{ _push('OK', Array.from(arguments).join(' ')); }catch(_){} _orig.log.apply(console, arguments); };
  console.warn = function(){ try{ _push('WARN', Array.from(arguments).join(' ')); }catch(_){} _orig.warn.apply(console, arguments); };
  console.error= function(){ try{ _push('ERR', Array.from(arguments).join(' ')); }catch(_){} _orig.error.apply(console, arguments); };

  window.CBLog = {
    ok:  function(m){ _push('OK',   m); _orig.log(m); },
    warn:function(m){ _push('WARN', m); _orig.warn(m); },
    err: function(m){ _push('ERR',  m); _orig.error(m); },
    log: function(m){ _push('LOG',  m); _orig.log(m); },
    push:function(l,m){ _push(l||'LOG', m); _orig.log(m); },
    dump:function(filter){
      var rows = _buf;
      if (filter && filter.length){
        var set = new Set(filter.map(function(s){ return s.toUpperCase(); }));
        rows = rows.filter(function(r){ return set.has(r.lvl.toUpperCase()); });
      }
      return rows.map(function(r){ return '['+r.time+'] '+r.lvl+' '+r.msg; }).join('\n');
    }
  };
  try{ CBLog.ok('[CBLog] Polyfill aktiv'); }catch(_){}
})();

/* ===== B) Inspector-Core =================================================== */
(function(){
  'use strict';

  var UI = (window.GameUI = window.GameUI || {});
  var CORE_VERSION = 'v17.2.0';

  var LS_KEY = 'inspector.pref';
  var pref = loadPref();

  function loadPref(){
    try{
      return JSON.parse(localStorage.getItem(LS_KEY)||'{}') || {};
    }catch(_){ return {}; }
  }
  function savePref(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(pref)); }catch(_){ } }

  function ensureStyleOnce(){
    if (document.getElementById('inspector-style')) return;
    var css = `
      #inspector{ position:fixed; right:12px; bottom:12px; z-index:99999; max-height:70vh; overflow:auto; min-width:300px; display:none; }
      .cb-ins-panel{ background:rgba(20,20,20,.94); border:1px solid #333; border-radius:10px; color:#eee; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; box-shadow:0 20px 60px rgba(0,0,0,.4); }
      .cb-ins-head{ display:flex; align-items:center; gap:8px; padding:10px 10px 8px; border-bottom:1px solid #2a2a2a; }
      .cb-ins-title{ font-weight:800; letter-spacing:.2px; }
      .cb-ins-spacer{ flex:1; }
      .cb-ins-btn{ background:#2b6cb0; border:1px solid #2a4365; color:#fff; border-radius:6px; cursor:pointer; padding:6px 10px; }
      .cb-ins-tabs{ display:flex; gap:6px; padding:8px 10px; border-bottom:1px solid #2a2a2a; flex-wrap:wrap; }
      .cb-ins-tab{ background:#1c1c1c; border:1px solid #2a2a2a; border-radius:6px; padding:6px 10px; cursor:pointer; }
      .cb-ins-tab.active{ background:#2b6cb0; border-color:#2a4365; color:#fff; }
      .cb-ins-body{ padding:10px; }
      .cb-ins-row{ display:flex; align-items:center; gap:8px; margin:6px 0 8px; }
      .cb-ins-grid2{ display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      .cb-ins-kv{ display:flex; justify-content:space-between; gap:10px; border-bottom:1px dashed #333; padding:4px 0; font-size:13px; }
      .cb-ins-kv b{ opacity:.8; }
      .cb-ins-input{ padding:6px 8px; background:#181818; border:1px solid #333; color:#eee; border-radius:4px; }
      .cb-ins-btn.small{ padding:5px 8px; font-size:13px; }
      .cb-ins-chip{ padding:4px 8px; border:1px solid #2a2a2a; border-radius:999px; cursor:pointer; background:#1c1c1c; }
      .cb-ins-chip.active{ background:#2b6cb0; border-color:#2a4365; color:#fff; }
      .hidden{ display:none !important; }
      textarea.cb-log{ width:100%; height:220px; background:#0e0e0e; color:#e6e6e6; border:1px solid #2a2a2a; border-radius:6px; padding:8px; }
    `;
    var st=document.createElement('style'); st.id='inspector-style'; st.textContent=css; document.head.appendChild(st);
  }

  function ensureRoot(){
    ensureStyleOnce();
    var root = document.querySelector('#inspector');
    if (!root){ root = document.createElement('div'); root.id='inspector'; document.body.appendChild(root); }

    var pane = root.querySelector('.cb-ins-panel');
    if (!pane){
      pane = document.createElement('div'); pane.className='cb-ins-panel';

      var head = document.createElement('div'); head.className='cb-ins-head';
      var title = document.createElement('div'); title.className='cb-ins-title'; title.textContent='Inspector';
      var sp = document.createElement('div'); sp.className='cb-ins-spacer';
      var btnClose = document.createElement('button'); btnClose.className='cb-ins-btn'; btnClose.textContent='Schließen';
      btnClose.addEventListener('click', function(){ UI.closeInspector(); });
      head.appendChild(title); head.appendChild(sp); head.appendChild(btnClose);
      pane.appendChild(head);

      var tabs = document.createElement('div'); tabs.className='cb-ins-tabs';
      var tabNames = [
        {id:'overview', label:'Übersicht'},
        {id:'logs',     label:'Logs'},
        {id:'build',    label:'Build'},
        {id:'tests',    label:'Tests'}
      ];
      tabNames.forEach(function(t){
        var b = document.createElement('button'); b.className='cb-ins-tab'; b.dataset.tab=t.id; b.textContent=t.label;
        b.addEventListener('click', function(){ selectTab(t.id, true); });
        tabs.appendChild(b);
      });
      pane.appendChild(tabs);

      var body = document.createElement('div'); body.className='cb-ins-body';
      pane.appendChild(body);

      root.appendChild(pane);
    }
    return { root:root, pane:pane, body:pane.querySelector('.cb-ins-body') };
  }

  function h(body, html){ body.innerHTML = html; }
  function kv(k,v){ return '<div class="cb-ins-kv"><b>'+k+'</b><span>'+v+'</span></div>'; }

  var liveTimer = 0;
  function startLive(fn){
    stopLive();
    liveTimer = setInterval(function(){ try{ fn(); }catch(_){} }, 500);
  }
  function stopLive(){ if (liveTimer){ clearInterval(liveTimer); liveTimer=0; } }

  function renderOverview(body){
    var mapSize = (window.Game && Game.getMapSize) ? Game.getMapSize() : {w:'?',h:'?'};
    var tile = (window.Game && Game.getTileSize) ? Game.getTileSize() : '?';
    var cam = (window.Game && Game.getCamera) ? Game.getCamera() : {x:0,y:0,zoom:1};
    var res = (window.Game && Game.resources) ? JSON.stringify(Game.resources) : '(keine API)';

    var html = ''
      + kv('Version', CORE_VERSION)
      + '<div id="ov-map">' + kv('Map', mapSize.w + ' × ' + mapSize.h + ' tiles, tile=' + tile) + '</div>'
      + '<div id="ov-cam">' + kv('Camera', 'x='+((cam.x|0))+' y='+((cam.y|0))+' zoom='+cam.zoom) + '</div>'
      + '<div id="ov-res">' + kv('Resources', res) + '</div>'
      + '<div style="margin-top:8px"></div>'
      + '<div class="cb-ins-row"><button class="cb-ins-btn small" id="btn-center-town">Auf Rathaus zentrieren</button>'
      + '<button class="cb-ins-btn small" id="btn-log-repaint">Repaint anfordern</button></div>';
    h(body, html);

    var update = function(){
      try{
        var s = Game.getMapSize ? Game.getMapSize() : {w:'?',h:'?'};
        var t = Game.getTileSize ? Game.getTileSize() : '?';
        var c = Game.getCamera ? Game.getCamera() : {x:0,y:0,zoom:1};
        var r = Game.resources ? JSON.stringify(Game.resources) : '(keine API)';
        body.querySelector('#ov-map').innerHTML = kv('Map', s.w+' × '+s.h+' tiles, tile='+t);
        body.querySelector('#ov-cam').innerHTML = kv('Camera', 'x='+(c.x|0)+' y='+(c.y|0)+' zoom='+c.zoom);
        body.querySelector('#ov-res').innerHTML = kv('Resources', r);
      }catch(_){}
    };
    startLive(update);

    var b1 = body.querySelector('#btn-center-town');
    if (b1){ b1.addEventListener('click', function(){
      try{
        var s = Game.getMapSize ? Game.getMapSize() : {w:16,h:10};
        var t = Game.getTileSize ? Game.getTileSize() : 64;
        var c = Game.getCamera ? Game.getCamera() : null;
        if (c){ c.x = Math.max(0, s.w/2 - (innerWidth / t)/2); c.y = Math.max(0, s.h/2 - (innerHeight / t)/2); }
        window.dispatchEvent(new Event('cb:request-repaint'));
      }catch(_){}
    });}
    var b2 = body.querySelector('#btn-log-repaint');
    if (b2){ b2.addEventListener('click', function(){ try{ window.dispatchEvent(new Event('cb:request-repaint')); }catch(_){} });}
  }

  // Logs UI state
  var logState = { ok:true, warn:true, err:true, autoscroll:true };
  function renderLogs(body){
    stopLive();
    var chips = `
      <span class="cb-ins-chip ${logState.ok?'active':''}"   data-k="ok">OK</span>
      <span class="cb-ins-chip ${logState.warn?'active':''}" data-k="warn">WARN</span>
      <span class="cb-ins-chip ${logState.err?'active':''}"  data-k="err">ERR</span>
      <span class="cb-ins-chip ${logState.autoscroll?'active':''}" data-k="auto">Auto-Scroll</span>
    `;
    var html = '<div class="cb-ins-row">'+chips+'</div>'
      + '<textarea class="cb-log" id="cb-log-ta">[lade Logs…]</textarea>'
      + '<div class="cb-ins-row"><button class="cb-ins-btn small" id="btn-copy-log">📋 Kopieren</button></div>';
    h(body, html);

    function apply(){
      var filter = [];
      if (logState.ok)   filter.push('OK','LOG');
      if (logState.warn) filter.push('WARN');
      if (logState.err)  filter.push('ERR');
      var txt = (window.CBLog && CBLog.dump) ? CBLog.dump(filter) : '[CBLog nicht verfügbar]';
      var ta = body.querySelector('#cb-log-ta');
      ta.value = txt || '[leer]';
      if (logState.autoscroll){ ta.scrollTop = ta.scrollHeight; }
    }
    apply();

    body.querySelectorAll('.cb-ins-chip').forEach(function(c){
      c.addEventListener('click', function(){
        var k = this.dataset.k;
        if (k==='auto') logState.autoscroll = !logState.autoscroll;
        else if (k==='ok')   logState.ok   = !logState.ok;
        else if (k==='warn') logState.warn = !logState.warn;
        else if (k==='err')  logState.err  = !logState.err;
        body.querySelectorAll('.cb-ins-chip').forEach(function(n){
          var kk = n.dataset.k;
          var on = (kk==='auto'?logState.autoscroll:kk==='ok'?logState.ok:kk==='warn'?logState.warn:kk==='err'?logState.err:false);
          n.classList.toggle('active', on);
        });
        apply();
      });
    });

    var btn = body.querySelector('#btn-copy-log');
    if (btn){ btn.addEventListener('click', function(){
      var ta = body.querySelector('#cb-log-ta');
      try{ navigator.clipboard.writeText(ta.value||''); }catch(_){}
    });}

    // Live-Append (leichtgewichtig) – hört auf console-Hook via setInterval
    var live = setInterval(apply, 600);
    body.__live = live;
  }

  function renderBuild(body){
    stopLive();
    var tool = '(unbekannt)';
    try{
      tool = (window.Game && Game._debugTool) ? JSON.stringify(Game._debugTool) :
             (window.Game && Game.getTool ? Game.getTool() : '(keine API)');
    }catch(_){}
    var html = kv('Aktuelles Tool', String(tool))
      + '<div class="cb-ins-row"><button id="btn-reset-tool" class="cb-ins-btn small">Tool zurücksetzen</button></div>';
    h(body, html);
    var btn = body.querySelector('#btn-reset-tool');
    if (btn){ btn.addEventListener('click', function(){ try{ Game.setTool && Game.setTool(null); }catch(_){} }); }
  }

  // ------ Tests-Panel (Overlay + Ressourcen + Heatmap-Reset) -----------------
  function renderTests(body){
    stopLive();

    var panel = document.createElement('div');
    panel.id = 'inspector-tests';
    panel.setAttribute('aria-label','Inspector Tests');
    panel.style.padding='10px';
    panel.style.borderTop='1px dashed #3a3a3a';
    panel.style.background='rgba(0,0,0,.12)';

    var title = document.createElement('div');
    title.textContent='Tests';
    title.style.fontWeight='700';
    title.style.margin='0 0 8px';
    panel.appendChild(title);

    // Overlay Toggle
    var row = document.createElement('div'); row.className='cb-ins-row';
    var chk = document.createElement('input'); chk.type='checkbox'; chk.id='dbg-path-overlay';
    chk.checked = !!pref.overlay; window.DEBUG_PATH_OVERLAY = !!pref.overlay;
    var lbl = document.createElement('label'); lbl.htmlFor='dbg-path-overlay'; lbl.textContent='Pfad-Overlay anzeigen';
    chk.addEventListener('change', function(){
      var enabled = !!chk.checked;
      window.DEBUG_PATH_OVERLAY = enabled;
      pref.overlay = enabled; savePref();
      window.dispatchEvent(new CustomEvent('cb:toggle-path-overlay', { detail:{ enabled } }));
      try{ window.requestAnimationFrame?.(()=>window.dispatchEvent(new Event('cb:request-repaint')));}catch(_){}
      try{ CBLog.ok('[inspector.tests] overlay='+(enabled?'AN':'AUS')); }catch(_){}
    });
    row.appendChild(chk); row.appendChild(lbl); panel.appendChild(row);

    // Heatmap Reset
    var r2 = document.createElement('div'); r2.className='cb-ins-row';
    var btnResetHM = document.createElement('button'); btnResetHM.className='cb-ins-btn small'; btnResetHM.textContent='Heatmap zurücksetzen';
    var hmStatus = document.createElement('div'); hmStatus.style.flex='1'; hmStatus.style.minHeight='1.2em';
    btnResetHM.addEventListener('click', function(){
      var okDirect=false, msg='Heatmap zurückgesetzt.';
      try{
        if (window.PathFinder && typeof PathFinder.resetHeat === 'function'){ PathFinder.resetHeat(); okDirect=true; }
      }catch(_){}
      if (!okDirect){
        try{ window.dispatchEvent(new Event('cb:pf-heat-reset')); msg='Event cb:pf-heat-reset gesendet.'; }catch(_){}
      }
      hmStatus.textContent = msg;
      hmStatus.style.color = okDirect ? '#68d391' : '#63b3ed';
    });
    r2.appendChild(btnResetHM); r2.appendChild(hmStatus); panel.appendChild(r2);

    // Ressourcen
    var grid = document.createElement('div'); grid.className='cb-ins-grid2';
    var inpType = document.createElement('input'); inpType.className='cb-ins-input'; inpType.placeholder='Typ (wood, stone, …)'; inpType.value='wood';
    var inpAmt  = document.createElement('input'); inpAmt.className='cb-ins-input';  inpAmt.type='number'; inpAmt.min='1'; inpAmt.step='1'; inpAmt.value='10';
    grid.appendChild(inpType); grid.appendChild(inpAmt); panel.appendChild(grid);

    var action = document.createElement('div'); action.className='cb-ins-row';
    var btn = document.createElement('button'); btn.className='cb-ins-btn'; btn.textContent='Ressourcen hinzufügen';
    var status = document.createElement('div'); status.style.flex='1'; status.style.minHeight='1.2em';
    btn.addEventListener('click', function(){
      var type=String(inpType.value||'').trim(); var amount=Math.max(1, parseInt(inpAmt.value||'0',10)||0);
      if(!type){ status.textContent='Bitte Ressourcentyp angeben.'; status.style.color='#f6ad55'; return; }
      window.dispatchEvent(new CustomEvent('cb:add-resources', { detail:{ type, amount } }));
      var okDirect=false; try{ if(window.Game && typeof Game.addResources==='function'){ Game.addResources(type,amount); okDirect=true; } }catch(_){}
      if(okDirect){ status.textContent='+'+amount+' '+type; status.style.color='#68d391'; } else { status.textContent='Event gesendet (+'+amount+' '+type+')'; status.style.color='#63b3ed'; }
    });
    action.appendChild(btn); action.appendChild(status); panel.appendChild(action);

    body.innerHTML = ''; body.appendChild(panel);
  }

  // ------ Tab-Handling + Persistenz -----------------------------------------
  function selectTab(id, persist){
    var pane = document.querySelector('.cb-ins-panel'); if (!pane) return;
    [].forEach.call(pane.querySelectorAll('.cb-ins-tab'), function(n){ n.classList.toggle('active', n.dataset.tab===id); });
    var parts = ensureRoot(), body = parts.body;
    // Stoppt evtl. laufende Intervalle in Logs/Overview
    stopLive();
    if (body && body.__live){ clearInterval(body.__live); body.__live = 0; }

    if      (id==='overview') renderOverview(body);
    else if (id==='logs')     renderLogs(body);
    else if (id==='build')    renderBuild(body);
    else if (id==='tests')    renderTests(body);
    else                      renderOverview(body);

    if (persist){ pref.tab = id; savePref(); }
  }

  function open(){
    var parts = ensureRoot();
    parts.root.style.display='block';
    parts.pane.classList.add('open');
    selectTab(pref.tab || 'overview', false);
    try { window.dispatchEvent(new Event('cb:inspector-open')); } catch(_){}
    try { CBLog.ok('[inspector.core] geöffnet ('+CORE_VERSION+')'); }catch(_){}
  }
  function close(){
    var r = document.querySelector('#inspector');
    var p = r && r.querySelector('.cb-ins-panel');
    if (r){ r.style.display='none'; }
    if (p){ p.classList.remove('open'); }
    stopLive();
  }
  function toggle(){ var p = document.querySelector('.cb-ins-panel'); if (p && p.classList.contains('open')) close(); else open(); }
  window.addEventListener('keydown', function(e){ if ((e.key||'').toLowerCase()==='escape'){ var p=document.querySelector('.cb-ins-panel.open'); if(p) close(); } });

  UI.openInspector = open;
  UI.closeInspector = close;
  UI.toggleInspector = toggle;

  // Öffne-Anker (Button ruft GameUI.toggleInspector())
  window.addEventListener('cb:game-started', function(){ /* no-op */ });

})();
