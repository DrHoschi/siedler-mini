/* ============================================================================
 * Inspector — v17.0.0
 * Projekt: Siedler-Mini
 *
 * A) Inspector-Core
 *    - Sauberer Root (#inspector), kein Autocreate auf Landing-Page
 *    - Tabs: Übersicht | Logs | Build | Tests
 *    - API: GameUI.openInspector()/closeInspector()/toggleInspector()
 *
 * B) Tabs-Implementierung
 *    - Übersicht: Map/Camera/Resources
 *    - Logs: CBLog Dump + Kopieren
 *    - Build: Tool-Anzeige + Reset
 *    - Tests: (dein bestehendes Tests-Panel mit Overlay-Toggle + Ressourcen)
 * ========================================================================== */
(function(){
  'use strict';

  var UI = (window.GameUI = window.GameUI || {});
  var CORE_VERSION = 'v17.0.0';

  // ---------- Styles einmalig ----------
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
      .hidden{ display:none !important; }
    `;
    var st=document.createElement('style'); st.id='inspector-style'; st.textContent=css; document.head.appendChild(st);
  }

  // ---------- Root + Grundgerüst ----------
  function ensureRoot(){
    ensureStyleOnce();
    var root = document.querySelector('#inspector');
    if (!root){ root = document.createElement('div'); root.id='inspector'; document.body.appendChild(root); }

    var pane = root.querySelector('.cb-ins-panel');
    if (!pane){
      pane = document.createElement('div'); pane.className='cb-ins-panel';

      // Kopf
      var head = document.createElement('div'); head.className='cb-ins-head';
      var title = document.createElement('div'); title.className='cb-ins-title'; title.textContent='Inspector';
      var sp = document.createElement('div'); sp.className='cb-ins-spacer';
      var btnClose = document.createElement('button'); btnClose.className='cb-ins-btn'; btnClose.textContent='Schließen';
      btnClose.addEventListener('click', function(){ UI.closeInspector(); });
      head.appendChild(title); head.appendChild(sp); head.appendChild(btnClose);
      pane.appendChild(head);

      // Tabs
      var tabs = document.createElement('div'); tabs.className='cb-ins-tabs';
      var tabNames = [
        {id:'overview', label:'Übersicht'},
        {id:'logs',     label:'Logs'},
        {id:'build',    label:'Build'},
        {id:'tests',    label:'Tests'}
      ];
      tabNames.forEach(function(t){
        var b = document.createElement('button'); b.className='cb-ins-tab'; b.dataset.tab=t.id; b.textContent=t.label;
        b.addEventListener('click', function(){ selectTab(t.id); });
        tabs.appendChild(b);
      });
      pane.appendChild(tabs);

      // Body
      var body = document.createElement('div'); body.className='cb-ins-body';
      pane.appendChild(body);

      root.appendChild(pane);
    }
    return { root:root, pane:pane, body:pane.querySelector('.cb-ins-body') };
  }

  function selectTab(id){
    var pane = document.querySelector('.cb-ins-panel');
    if (!pane) return;
    [].forEach.call(pane.querySelectorAll('.cb-ins-tab'), function(n){
      n.classList.toggle('active', n.dataset.tab===id);
    });
    renderTab(id);
  }

  function open(){
    var parts = ensureRoot();
    parts.root.style.display='block';
    parts.pane.classList.add('open');
    selectTab('overview'); // default
    try { window.dispatchEvent(new Event('cb:inspector-open')); } catch(_){}
    try { window.CBLog && CBLog.ok && CBLog.ok('[inspector.core] geöffnet ('+CORE_VERSION+')'); } catch(_){}
  }
  function close(){
    var r = document.querySelector('#inspector');
    var p = r && r.querySelector('.cb-ins-panel');
    if (r){ r.style.display='none'; }
    if (p){ p.classList.remove('open'); }
  }
  function toggle(){ var p = document.querySelector('.cb-ins-panel'); if (p && p.classList.contains('open')) close(); else open(); }

  window.addEventListener('keydown', function(e){ if ((e.key||'').toLowerCase()==='escape'){ var p=document.querySelector('.cb-ins-panel.open'); if(p) close(); } });

  UI.openInspector = open;
  UI.closeInspector = close;
  UI.toggleInspector = toggle;

  // ---------- Tab-Renderer ----------
  function h(body, html){ body.innerHTML = html; }
  function kv(k,v){ return '<div class="cb-ins-kv"><b>'+k+'</b><span>'+v+'</span></div>'; }

  function renderOverview(body){
    var mapSize = (window.Game && Game.getMapSize) ? Game.getMapSize() : {w:'?',h:'?'};
    var tile = (window.Game && Game.getTileSize) ? Game.getTileSize() : '?';
    var cam = (window.Game && Game.getCamera) ? Game.getCamera() : {x:0,y:0,zoom:1};
    var res = (window.Game && Game.resources) ? JSON.stringify(Game.resources) : '(keine API)';
    var html = ''
      + kv('Version', CORE_VERSION)
      + kv('Map', mapSize.w + ' × ' + mapSize.h + ' tiles, tile=' + tile)
      + kv('Camera', 'x='+((cam.x|0))+' y='+((cam.y|0))+' zoom='+cam.zoom)
      + kv('Resources', res)
      + '<div style="margin-top:8px"></div>'
      + '<div class="cb-ins-row"><button class="cb-ins-btn small" id="btn-center-town">Auf Rathaus zentrieren</button>'
      + '<button class="cb-ins-btn small" id="btn-log-repaint">Repaint anfordern</button></div>';
    h(body, html);

    var b1 = body.querySelector('#btn-center-town');
    if (b1){ b1.addEventListener('click', function(){
      try{
        // einfache Zentrierung: auf Kartenmitte; echte Rathaus-Suche liegt in game.js
        var s = Game.getMapSize ? Game.getMapSize() : {w:16,h:10};
        var t = Game.getTileSize ? Game.getTileSize() : 64;
        var c = Game.getCamera ? Game.getCamera() : null;
        if (c){ c.x = Math.max(0, s.w*t/2 - (innerWidth/2)); c.y = Math.max(0, s.h*t/2 - (innerHeight/2)); }
        window.dispatchEvent(new Event('cb:request-repaint'));
      }catch(_){}
    });}
    var b2 = body.querySelector('#btn-log-repaint');
    if (b2){ b2.addEventListener('click', function(){ try{ window.dispatchEvent(new Event('cb:request-repaint')); }catch(_){} });}
  }

  function renderLogs(body){
    var dump = (window.CBLog && CBLog.dump) ? CBLog.dump() : '[CBLog nicht verfügbar]';
    var html = '<textarea class="cb-ins-input" style="width:100%;height:220px;">'+dump.replace(/</g,'&lt;')+'</textarea>'
      + '<div class="cb-ins-row"><button class="cb-ins-btn small" id="btn-copy-log">📋 Kopieren</button></div>';
    h(body, html);
    var btn = body.querySelector('#btn-copy-log');
    if (btn){ btn.addEventListener('click', function(){
      try{ navigator.clipboard.writeText(dump); }catch(_){}
    });}
  }

  function renderBuild(body){
    var tool = '(unbekannt)';
    try{
      tool = (window.Game && Game._debugTool) ? JSON.stringify(Game._debugTool) : (window.Game && Game.getTool ? Game.getTool() : '(keine API)');
    }catch(_){}
    var html = kv('Aktuelles Tool', String(tool))
      + '<div class="cb-ins-row"><button id="btn-reset-tool" class="cb-ins-btn small">Tool zurücksetzen</button></div>';
    h(body, html);
    var btn = body.querySelector('#btn-reset-tool');
    if (btn){ btn.addEventListener('click', function(){ try{ Game.setTool && Game.setTool(null); }catch(_){} }); }
  }

  function ensureTestsPanel(body){
    // Falls das Tests-Panel bereits existiert (aus vorherigem Mount), übernehmen
    var existing = document.getElementById('inspector-tests');
    if (existing) { body.appendChild(existing); return; }

    // ---- Dein bestehendes Tests-Panel (Overlay-Toggle + Ressourcen) ----
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

    // Toggle
    var row = document.createElement('div');
    row.className = 'cb-ins-row';
    var chk = document.createElement('input'); chk.type='checkbox'; chk.id='dbg-path-overlay';
    chk.checked = !!window.DEBUG_PATH_OVERLAY;
    var lbl = document.createElement('label'); lbl.htmlFor='dbg-path-overlay'; lbl.textContent='Pfad-Overlay anzeigen';
    chk.addEventListener('change', function(){
      var enabled = !!chk.checked; window.DEBUG_PATH_OVERLAY = enabled;
      window.dispatchEvent(new CustomEvent('cb:toggle-path-overlay', { detail:{ enabled } }));
      try{ window.requestAnimationFrame?.(()=>window.dispatchEvent(new Event('cb:request-repaint')));}catch(_){}
    });
    row.appendChild(chk); row.appendChild(lbl);
    panel.appendChild(row);

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

    body.appendChild(panel);
  }

  function renderTests(body){ ensureTestsPanel(body); }

  function renderTab(id){
    var parts = ensureRoot(), body = parts.body;
    if (!body) return;
    if      (id==='overview') renderOverview(body);
    else if (id==='logs')     renderLogs(body);
    else if (id==='build')    renderBuild(body);
    else if (id==='tests')    renderTests(body);
    else                      renderOverview(body);
  }

})(); 
