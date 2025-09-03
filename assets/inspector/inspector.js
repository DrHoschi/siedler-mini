/* ============================================================================
 * assets/inspector/inspector.js — v18.3.3
 * Projekt: Siedler-Mini
 * Zweck:
 *   - Immer verfügbares, leichtgewichtiges Inspector-Overlay
 *   - Tabs (Übersicht, Logs, Build, Pfade, Tests)
 *   - Stabile Log-Anzeige:
 *       • bevorzugt: CBLog.getBuffer() / CBLog.buf / CBLog._buf
 *       • Fallback: interner Console-Proxy + Mini-Stream
 *   - Öffnen/Schließen via GameUI.toggleInspector(), GameUI.openInspector()
 *     (plus harter Fallback, falls Bridge fehlt)
 *
 * CODE-STYLE:
 *   - Keine Frameworks, nur Vanilla JS
 *   - Defensive Guards, keine globalen Leaks
 *   - Sanfte Logs via (window.CBLog?.info|warn|err) oder console
 * ========================================================================== */
(function () {
  'use strict';

  var MOD = '[inspector.core]';
  var VERSION = 'v18.3.3';

  // ---------------------------------------------------------------------------
  // Sanfte Logger
  // ---------------------------------------------------------------------------
  function logInfo(msg){ try{ (window.CBLog?.ok||window.CBLog?.info||console.log)(MOD+' '+msg); }catch(_){ console.log(MOD+' '+msg); } }
  function logWarn(msg){ try{ (window.CBLog?.warn||console.warn)(MOD+' '+msg); }catch(_){ console.warn(MOD+' '+msg); } }

  // ---------------------------------------------------------------------------
  // Interner Log-Puffer + Console-Proxy (nur Fallback)
  //   -> Ziel: Es steht IMMER etwas im Logs-Tab, auch ohne CBLog.
  // ---------------------------------------------------------------------------
  var _proxyInstalled = false;
  var _localBuf = [];       // {ts, level, text}
  var _maxLocal = 2000;

  function pushLocal(level, args){
    try{
      var txt = Array.from(args).map(function(a){
        try{
          if (typeof a === 'string') return a;
          return JSON.stringify(a);
        }catch(_){ return String(a); }
      }).join(' ');
      _localBuf.push({ ts: Date.now(), level: level, text: txt });
      if (_localBuf.length > _maxLocal) _localBuf.splice(0, _localBuf.length - _maxLocal);
    }catch(_){}
  }

  function installConsoleProxy(){
    if (_proxyInstalled) return;
    _proxyInstalled = true;
    ['log','info','warn','error'].forEach(function(k){
      var orig = console[k] || console.log;
      console[k] = function(){
        try{ orig.apply(console, arguments); }catch(_){}
        pushLocal(k, arguments);
      };
    });
    logInfo('Console-Proxy aktiv (Fallback-Stream).');
  }

  // Falls gar kein CBLog existiert, aktivieren wir Proxy sofort
  if (!window.CBLog) installConsoleProxy();

  // ---------------------------------------------------------------------------
  // Quellen-Resolver für Logs
  // ---------------------------------------------------------------------------
  function getActiveBuffer(){
    try{
      // 1) Bevorzugt: offizielles CBLog API
      if (window.CBLog){
        if (typeof CBLog.getBuffer === 'function'){
          return { kind:'cblog', data: CBLog.getBuffer() };
        }
        // interne Varianten, die wir tolerant abfragen
        if (Array.isArray(CBLog.buf))  return { kind:'cblog', data: CBLog.buf };
        if (Array.isArray(CBLog._buf)) return { kind:'cblog', data: CBLog._buf };
      }
    }catch(_){}
    // 2) Fallback: unser lokaler Proxy
    return { kind:'proxy', data: _localBuf };
  }

  // Kleines Helferlein zum Formatieren
  function fmtTs(ts){
    var d = new Date(ts);
    var hh = String(d.getHours()).padStart(2,'0');
    var mm = String(d.getMinutes()).padStart(2,'0');
    var ss = String(d.getSeconds()).padStart(2,'0');
    return hh+':'+mm+':'+ss;
  }

  // ---------------------------------------------------------------------------
  // DOM – Erzeugung des Inspector-Overlays
  // ---------------------------------------------------------------------------
  var root, tabsBar, body, btnClose, logBox, copyBtn, statusLbl;
  var tab = 'logs';
  var refreshTimer = 0;

  function el(tag, cls, txt){
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt!=null) n.textContent = txt;
    return n;
  }

  function buildUI(){
    // Root existiert ggf. schon (Toggeln)
    root = document.getElementById('inspector');
    if (root){ root.parentNode.removeChild(root); }

    root = el('div', 'inspector');
    root.id = 'inspector';
    // Inline-Styles für maximale Unabhängigkeit (CSS-Datei optional)
    root.style.position = 'fixed';
    root.style.left = '50%';
    root.style.top = '50%';
    root.style.transform = 'translate(-50%,-50%)';
    root.style.width = 'min(920px, 94vw)';
    root.style.maxHeight = '78vh';
    root.style.background = 'linear-gradient(180deg, rgba(24,24,24,.96), rgba(18,18,18,.96))';
    root.style.border = '1px solid rgba(255,255,255,.09)';
    root.style.borderRadius = '14px';
    root.style.boxShadow = '0 34px 80px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.03)';
    root.style.color = '#e9eef0';
    root.style.zIndex = '2147483646';
    root.style.padding = '12px';
    root.style.backdropFilter = 'blur(8px)';
    root.style.display = 'none';

    // Header
    var head = el('div', 'insp-head');
    head.style.display = 'flex';
    head.style.alignItems = 'center';
    head.style.gap = '10px';
    head.style.padding = '4px 4px 10px';

    var hTitle = el('div', 'insp-title', 'Inspector');
    hTitle.style.fontWeight = '700';
    hTitle.style.letterSpacing = '.2px';
    head.appendChild(hTitle);

    var ver = el('div', 'insp-ver', VERSION);
    ver.style.opacity = '.55';
    ver.style.fontSize = '12px';
    head.appendChild(ver);

    var sp = el('div','insp-spacer'); sp.style.flex='1';
    head.appendChild(sp);

    btnClose = el('button','insp-close','Schließen');
    btnClose.style.border='1px solid rgba(255,255,255,.12)';
    btnClose.style.background='rgba(255,255,255,.08)';
    btnClose.style.color='#fff';
    btnClose.style.borderRadius='10px';
    btnClose.style.padding='6px 10px';
    btnClose.style.cursor='pointer';
    btnClose.onclick = close;
    head.appendChild(btnClose);

    root.appendChild(head);

    // Tabs
    tabsBar = el('div','insp-tabs');
    tabsBar.style.display='flex';
    tabsBar.style.flexWrap='wrap';
    tabsBar.style.gap='8px';
    tabsBar.style.padding='0 4px 8px';

    [
      {id:'overview', label:'Übersicht'},
      {id:'logs',     label:'Logs'},
      {id:'build',    label:'Build'},
      {id:'paths',    label:'Pfade'},
      {id:'tests',    label:'Tests'}
    ].forEach(function(t){
      var b = el('button','insp-tab', t.label);
      b.dataset.tab = t.id;
      styleTab(b, t.id===tab);
      b.onclick = function(){ setTab(t.id); };
      tabsBar.appendChild(b);
    });

    root.appendChild(tabsBar);

    // Body
    body = el('div','insp-body');
    body.style.background='rgba(0,0,0,.22)';
    body.style.border='1px solid rgba(255,255,255,.06)';
    body.style.borderRadius='10px';
    body.style.padding='10px';
    body.style.minHeight='260px';
    body.style.maxHeight='52vh';
    body.style.overflow='auto';
    root.appendChild(body);

    // Status/Actions unten
    var foot = el('div','insp-foot');
    foot.style.display='flex';
    foot.style.alignItems='center';
    foot.style.gap='8px';
    foot.style.marginTop='10px';

    statusLbl = el('div','insp-status','');
    statusLbl.style.fontSize='12px';
    statusLbl.style.opacity='.7';
    foot.appendChild(statusLbl);

    var fsp = el('div'); fsp.style.flex='1'; foot.appendChild(fsp);

    copyBtn = el('button','insp-copy','Kopieren');
    copyBtn.style.border='1px solid rgba(255,255,255,.12)';
    copyBtn.style.background='rgba(255,255,255,.10)';
    copyBtn.style.color='#fff';
    copyBtn.style.borderRadius='10px';
    copyBtn.style.padding='6px 10px';
    copyBtn.style.cursor='pointer';
    copyBtn.onclick = copyLogs;
    foot.appendChild(copyBtn);

    root.appendChild(foot);

    document.body.appendChild(root);
  }

  function styleTab(btn, active){
    btn.style.border='1px solid rgba(255,255,255,.12)';
    btn.style.borderRadius='999px';
    btn.style.padding='6px 12px';
    btn.style.background = active ? 'rgba(120,160,255,.25)' : 'rgba(255,255,255,.08)';
    btn.style.color='#e9eef0';
    btn.style.cursor='pointer';
    btn.style.fontSize='13px';
    btn.style.boxShadow = active? 'inset 0 0 0 1px rgba(120,160,255,.35)' : 'none';
  }

  function setTab(id){
    tab = id;
    // Tabs neu einfärben
    Array.from(tabsBar.querySelectorAll('.insp-tab')).forEach(function(b){
      styleTab(b, b.dataset.tab===tab);
    });
    // Inhalt neu bauen
    renderBody();
  }

  // ---------------------------------------------------------------------------
  // Tabs – Inhalte rendern
  // ---------------------------------------------------------------------------
  function renderBody(){
    // Timer ggf. stoppen
    if (refreshTimer){ clearInterval(refreshTimer); refreshTimer=0; }

    while (body.firstChild) body.removeChild(body.firstChild);

    if (tab==='logs'){
      var pre = el('pre','insp-logpre','[Log wird geladen…]');
      pre.style.margin='0'; pre.style.whiteSpace='pre-wrap';
      pre.style.font='12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace';
      pre.style.color='#cdd3d6';
      pre.style.minHeight='220px';
      body.appendChild(pre);
      logBox = pre;

      // Sofortinitialisierung + Auto-Refresh
      refreshLogs();
      refreshTimer = setInterval(refreshLogs, 750);
      statusLbl.textContent = 'Quelle: automatisch';
      copyBtn.style.display = '';
    }
    else if (tab==='overview'){
      copyBtn.style.display = 'none';
      var wrap = el('div');
      wrap.innerHTML =
        '<div style="display:grid;grid-template-columns:120px 1fr;gap:6px 12px;font-size:13px;opacity:.9">'+
          '<div>Version:</div><div>'+VERSION+'</div>'+
          '<div>Canvas:</div><div id="ov-canvas">–</div>'+
          '<div>Map:</div><div id="ov-map">–</div>'+
          '<div>FPS:</div><div id="ov-fps">–</div>'+
        '</div>';
      body.appendChild(wrap);
      // kleine Live-Anzeige
      var fpsLbl = wrap.querySelector('#ov-fps');
      var last = performance.now(), acc=0, frames=0;
      refreshTimer = setInterval(function(){
        var now = performance.now();
        var dt = now - last; last = now; acc+=dt; frames++;
        if (acc>=500){
          var fps = Math.round(frames*1000/acc);
          fpsLbl.textContent = String(fps);
          acc=0; frames=0;
        }
      }, 100);
      // Canvas/Map aus Engine holen (tolerant)
      try{
        var c = document.getElementById('game');
        if (c) body.querySelector('#ov-canvas').textContent = (c.width||c.clientWidth)+'×'+(c.height||c.clientHeight);
      }catch(_){}
      try{
        var mapName = (window.Game && Game.getMapName && Game.getMapName()) || document.getElementById('game')?.dataset?.map || '–';
        body.querySelector('#ov-map').textContent = mapName.split('/').pop();
      }catch(_){}
      statusLbl.textContent = '';
    }
    else {
      // Platzhalter für Build / Pfade / Tests – bereit für spätere Inhalte
      copyBtn.style.display = 'none';
      var ph = el('div', '', 'Noch keine Inhalte – kommt gleich in den nächsten Schritten.');
      ph.style.opacity = '.7';
      ph.style.fontSize = '13px';
      body.appendChild(ph);
      statusLbl.textContent = '';
    }
  }

  // ---------------------------------------------------------------------------
  // Logs – Abruf + Rendering
  // ---------------------------------------------------------------------------
  function refreshLogs(){
    try{
      var src = getActiveBuffer();
      var arr = src.data || [];
      // CBLog-Records können unterschiedlich strukturiert sein; tolerant mappen.
      // Erwartete Varianten:
      //  • {ts, lvl|level, msg|text}
      //  • [ts, level, text]
      //  • {time, type, message}
      var out = [];
      for (var i=0;i<arr.length;i++){
        var r = arr[i], ts, level, text;

        if (Array.isArray(r)){
          ts = r[0]; level = r[1]; text = r[2];
        } else if (r && typeof r === 'object'){
          ts = r.ts || r.time || r.t || Date.now();
          level = r.level || r.lvl || r.type || r.k || 'log';
          text = r.msg || r.text || r.message || r.m || '';
        } else {
          ts = Date.now(); level = 'log'; text = String(r);
        }
        out.push('['+fmtTs(ts)+'] '+String(level).toUpperCase().padEnd(4,' ')+' '+text);
      }

      if (!out.length){
        logBox.textContent = '[Keine Log-Einträge vorhanden]';
      } else {
        logBox.textContent = out.join('\n');
        // am Ende bleiben (nur wenn schon am Ende)
        if (body.scrollTop + body.clientHeight >= body.scrollHeight - 24){
          body.scrollTop = body.scrollHeight;
        }
      }
      statusLbl.textContent = 'Quelle: '+src.kind+' · Einträge: '+out.length;
    }catch(e){
      logBox.textContent = '[Fehler beim Laden der Logs] '+(e && e.message || e);
      statusLbl.textContent = 'Quelle: Fehler';
    }
  }

  function copyLogs(){
    try{
      var txt = logBox?.textContent || '';
      navigator.clipboard?.writeText(txt).then(function(){
        statusLbl.textContent = 'Log kopiert ('+txt.split('\n').length+' Zeilen).';
      }).catch(function(){
        statusLbl.textContent = 'Clipboard nicht verfügbar.';
      });
    }catch(_){
      statusLbl.textContent = 'Clipboard nicht verfügbar.';
    }
  }

  // ---------------------------------------------------------------------------
  // Öffnen/Schließen
  // ---------------------------------------------------------------------------
  function open(){
    try{
      if (!root) buildUI();
      root.style.display = 'block';
      setTab(tab); // Render
      logInfo('geöffnet ('+VERSION+')');
    }catch(e){ logWarn('öffnet nicht: '+(e&&e.message)); }
  }
  function close(){
    try{
      if (refreshTimer){ clearInterval(refreshTimer); refreshTimer=0; }
      if (root) root.style.display = 'none';
      logInfo('geschlossen');
    }catch(e){ /* schlucken */ }
  }
  function toggle(force){
    var want = force==null ? null : !!force;
    if (!root) buildUI();
    var visible = root && root.style.display!=='none';
    if (want===true || (!visible && want==null)) open();
    else if (want===false || (visible && want==null)) close();
  }

  // Öffentliche Bridge für die FABs/UX
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = toggle;
  window.GameUI.openInspector   = open;
  window.GameUI.closeInspector  = close;

  // ---------------------------------------------------------------------------
  // Auto-Init / Auto-Open (optional über Query)
  // ---------------------------------------------------------------------------
  try{
    // Sobald Seite/Spiel lädt, sofort bereit melden
    logInfo('bereit ('+VERSION+')');
    // optional automatisches Öffnen, wenn query ?inspector=1
    if (location.search.indexOf('inspector=1')!==-1){
      setTimeout(open, 150);
    }
  }catch(_){}

  // Kleines Badge, falls jemand wissen will, ob Inspector geladen wurde
  try{
    var badge = document.createElement('div');
    badge.textContent = 'Inspector lädt…';
    badge.style.position='fixed';
    badge.style.right='12px';
    badge.style.bottom='86px';
    badge.style.padding='6px 8px';
    badge.style.fontSize='11px';
    badge.style.color='#cfd6da';
    badge.style.background='rgba(20,20,20,.75)';
    badge.style.border='1px solid rgba(255,255,255,.08)';
    badge.style.borderRadius='8px';
    badge.style.zIndex='2147483646';
    badge.style.pointerEvents='none';
    document.body.appendChild(badge);
    setTimeout(function(){ badge.remove(); }, 1200);
  }catch(_){}

})();
