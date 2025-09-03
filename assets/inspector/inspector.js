/* ============================================================================
 * Datei: assets/inspector/inspector.js
 * Projekt: Siedler-Mini
 * Version: v18.2.1  (enthält v17.3.0-Kompatiblitätslayer)
 *
 * Zweck
 *   - Leichtgewichtiger Inspector nach Vorgaben (dunkles Panel, graue Tabs)
 *   - Tabs: Übersicht, Logs (funktionsfähig), Build, Tests, Ressourcen, Pfade
 *   - Immer öffnungsfähig (Start-Seite und im Spiel), sehr hoher z-index
 *
 * Öffentliche API
 *   window.Inspector.open()
 *   window.Inspector.close()
 *   window.Inspector.toggle()
 *   window.Inspector.refreshLogs()
 *
 * Events (eingehend)
 *   - cb:toggle-inspector     (neu/empfohlen)
 *   - cb:inspector-open/close (Info-Events, werden gefeuert)
 *
 * v17.3.0-Kompat (Legacy)
 *   - Events: cb:inspector-show / cb:inspector-hide
 *   - Globale Aliase: showInspector(), hideInspector(), toggleInspector()
 *   - Alias-Objekt:  window.InspectorCore === window.Inspector
 * ========================================================================== */
(function(){
  'use strict';

  var MOD='[inspector.core]';
  var VER='v18.2.1';

  function ok(m){ try{ (window.CBLog?.ok||console.log)(MOD+' '+m); }catch(_){ console.log(MOD+' '+m); } }
  function info(m){ try{ (window.CBLog?.info||console.log)(MOD+' '+m); }catch(_){ console.log(MOD+' '+m); } }
  function warn(m){ try{ (window.CBLog?.warn||console.warn)(MOD+' '+m); }catch(_){ console.warn(MOD+' '+m); } }

  var root=null, tabsBar=null, body=null, logBox=null;

  // ---------- tiny helpers ---------------------------------------------------
  function h(tag, props, children){
    var el=document.createElement(tag);
    if (props){
      for (var k in props){
        if (k==='style' && props[k] && typeof props[k]==='object') Object.assign(el.style, props[k]);
        else if (k==='class') el.className = props[k];
        else el.setAttribute(k, props[k]);
      }
    }
    if (children){ for (var i=0;i<children.length;i++) el.appendChild(typeof children[i]==='string' ? document.createTextNode(children[i]) : children[i]); }
    return el;
  }
  function getLogDump(){
    try{
      if (window.CBLog?.dump) return CBLog.dump();
      if (window.CBLog?.buffer) return CBLog.buffer.join('\n');
    }catch(_){}
    return '[CBLog nicht verfügbar]';
  }

  // ---------- build view -----------------------------------------------------
  function buildOnce(){
    if (root) return root;

    root = h('div',{ id:'inspector', 'aria-label':'Inspector', style:{
      position:'fixed', right:'16px', bottom:'96px',
      width:'min(880px, 92vw)', maxHeight:'72vh',
      zIndex:2147483646, background:'rgba(18,19,18,0.96)', color:'#e9ecef',
      border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px',
      boxShadow:'0 18px 60px rgba(0,0,0,.45)', backdropFilter:'blur(8px)',
      overflow:'hidden', display:'none'
    }}, []);

    // Header (Titel + Tabs + Schließen)
    var head = h('div',{ class:'insp-head', style:{
      display:'flex', alignItems:'center', gap:'8px',
      padding:'10px 12px', borderBottom:'1px solid rgba(255,255,255,0.06)',
      background:'linear-gradient(to top, rgba(255,255,255,0.04), rgba(255,255,255,0.08))'
    }}, []);
    var title = h('div',{ class:'insp-title', style:{ fontWeight:'800', letterSpacing:'.3px' }},['Inspector']);
    var ver = h('span',{ style:{ opacity:.5, fontSize:'12px', marginLeft:'6px' }},[VER]);

    tabsBar = h('div',{ id:'insp-tabs', role:'tablist', style:{ display:'flex', flexWrap:'wrap', gap:'8px', marginLeft:'12px' }},[]);
    var tabs = [
      ['overview','Übersicht'],
      ['logs','Logs'],
      ['build','Build'],
      ['tests','Tests'],
      ['resources','Ressourcen'],
      ['paths','Pfade']
    ];
    tabs.forEach(function([id,label]){
      var b = h('button',{ 'data-tab':id, class:'insp-tab', type:'button', style:{
        border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px',
        padding:'7px 12px', background:'rgba(255,255,255,0.10)', color:'#e9ecef',
        cursor:'pointer', fontSize:'13px'
      }},[label]);
      b.addEventListener('click', function(){ switchTo(id); });
      tabsBar.appendChild(b);
    });

    var spacer = h('div',{ style:{ flex:1 }},[]);
    var btnClose = h('button',{ id:'insp-close', type:'button', title:'Schließen', style:{
      border:'1px solid rgba(255,255,255,0.12)', borderRadius:'10px',
      padding:'6px 10px', background:'rgba(255,255,255,0.10)', color:'#e9ecef', cursor:'pointer'
    }},['Schließen']);
    btnClose.addEventListener('click', close);

    head.appendChild(title); head.appendChild(ver);
    head.appendChild(tabsBar); head.appendChild(spacer); head.appendChild(btnClose);
    root.appendChild(head);

    // Body
    body = h('div',{ id:'insp-body', style:{ padding:'12px', maxHeight:'calc(72vh - 52px)', overflow:'auto' }},[]);
    root.appendChild(body);

    // --- Pane: Logs (funktional) --------------------------------------------
    var paneLogs = h('div',{ id:'insp-pane-logs', style:{ display:'none' }},[]);
    logBox = h('pre',{ id:'insp-log', style:{
      margin:0, padding:'10px', minHeight:'220px',
      background:'rgba(0,0,0,0.40)', color:'#d2f4ff',
      border:'1px solid rgba(255,255,255,0.10)', borderRadius:'8px',
      font:'12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      whiteSpace:'pre-wrap'
    }},['[CBLog nicht verfügbar]']);
    var row = h('div',{ style:{ marginTop:'8px', display:'flex', gap:'8px', alignItems:'center' }},[]);
    var btnCopy = h('button',{ type:'button', style:{
      border:'1px solid rgba(255,255,255,0.12)', borderRadius:'8px',
      padding:'8px 10px', background:'rgba(60,120,255,.15)', color:'#e9ecef', cursor:'pointer'
    }},['Kopieren']);
    btnCopy.addEventListener('click', function(){
      try{ navigator.clipboard?.writeText(logBox.textContent||''); ok('Logs kopiert'); }catch(_){ warn('Clipboard nicht verfügbar'); }
    });
    var btnRefresh = h('button',{ type:'button', style:{
      border:'1px solid rgba(255,255,255,0.12)', borderRadius:'8px',
      padding:'8px 10px', background:'rgba(255,255,255,.10)', color:'#e9ecef', cursor:'pointer'
    }},['Aktualisieren']);
    btnRefresh.addEventListener('click', refreshLogs);
    row.appendChild(btnCopy); row.appendChild(btnRefresh);
    paneLogs.appendChild(logBox); paneLogs.appendChild(row);

    // --- Platzhalter-Panes ---------------------------------------------------
    function placeholder(text){
      return h('div',{ class:'insp-empty', style:{
        padding:'12px', border:'1px dashed rgba(255,255,255,0.12)',
        borderRadius:'8px', background:'rgba(0,0,0,0.25)', color:'#c8d0d4'
      }},[text]);
    }
    var paneOverview  = h('div',{ id:'insp-pane-overview',  style:{ display:'none' }},[ placeholder('Übersicht – Platzhalter.') ]);
    var paneBuild     = h('div',{ id:'insp-pane-build',     style:{ display:'none' }},[ placeholder('Build – Platzhalter für Bau-Inspektion.') ]);
    var paneTests     = h('div',{ id:'insp-pane-tests',     style:{ display:'none' }},[ placeholder('Tests – Platzhalter.') ]);
    var paneRes       = h('div',{ id:'insp-pane-resources', style:{ display:'none' }},[ placeholder('Ressourcen – Platzhalter.') ]);
    var panePaths     = h('div',{ id:'insp-pane-paths',     style:{ display:'none' }},[ placeholder('Pfade – Platzhalter (Overlay/Heatmap).') ]);

    body.appendChild(paneOverview);
    body.appendChild(paneLogs);
    body.appendChild(paneBuild);
    body.appendChild(paneTests);
    body.appendChild(paneRes);
    body.appendChild(panePaths);

    document.body.appendChild(root);
    markActive('logs'); // Default
    ok('geladen ('+VER+')');
    return root;
  }

  function markActive(id){
    var btns = tabsBar.querySelectorAll('button.insp-tab');
    for (var i=0;i<btns.length;i++){
      var b=btns[i], is = (b.getAttribute('data-tab')===id);
      b.style.background   = is ? 'rgba(220,230,235,.25)' : 'rgba(255,255,255,.10)';
      b.style.color        = is ? '#111'                  : '#e9ecef';
      b.style.borderColor  = is ? 'rgba(220,230,235,.65)' : 'rgba(255,255,255,.08)';
    }
  }
  function switchTo(id){
    markActive(id);
    var ids=['overview','logs','build','tests','resources','paths'];
    ids.forEach(function(k){
      var pane=document.getElementById('insp-pane-'+k);
      if (pane) pane.style.display = (k===id ? 'block' : 'none');
    });
    if (id==='logs') refreshLogs();
  }

  // ---------- API ------------------------------------------------------------
  function open(){
    buildOnce();
    root.style.display='block';
    try{ window.dispatchEvent(new Event('cb:inspector-open')); }catch(_){}
    ok('geöffnet ('+VER+')');
    refreshLogs();
  }
  function close(){
    if (!root) return;
    root.style.display='none';
    try{ window.dispatchEvent(new Event('cb:inspector-close')); }catch(_){}
    ok('geschlossen');
  }
  function toggle(){ (!root || root.style.display==='none') ? open() : close(); }

  function refreshLogs(){
    if (!logBox) return;
    try{ logBox.textContent = getLogDump() || '[leer]'; }
    catch(e){ logBox.textContent='[Fehler beim Lesen der Logs]'; warn('refreshLogs: '+(e&&e.message)); }
  }

  // ---------- Wire up --------------------------------------------------------
  window.Inspector = window.Inspector || {};
  window.Inspector.open = open;
  window.Inspector.close = close;
  window.Inspector.toggle = toggle;
  window.Inspector.refreshLogs = refreshLogs;

  // Empfohlenes Toggle-Event
  window.addEventListener('cb:toggle-inspector', toggle);

  // Pre-build, damit das Öffnen sofort klappt
  setTimeout(buildOnce, 200);

  // ---------- v17.3.0: Kompatibilität --------------------------------------
  // Events: show/hide
  window.addEventListener('cb:inspector-show', open);
  window.addEventListener('cb:inspector-hide', close);

  // Globale Aliase (einige ältere UIs rufen das direkt auf)
  window.showInspector = open;
  window.hideInspector = close;
  window.toggleInspector = toggle;

  // Historischer Name (manche Skripte referenzieren das)
  window.InspectorCore = window.Inspector;

})();
