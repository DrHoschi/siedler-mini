/* ============================================================================
 * Datei: assets/inspector/inspector.js
 * Projekt: Siedler-Mini
 * Version: v18.2.0
 *
 * Zweck
 *   Minimal-Inspector nach Vorgaben:
 *     - Fester Stil (dunkles Panel, graue Tabs)
 *     - Tabs: Übersicht, Logs (funktionsfähig), Build, Tests, Ressourcen, Pfade
 *     - Öffnen/Schließen garantiert (auch auf Startseite)
 *     - Sehr hohe z-index, blockiert nie FABs
 *
 * Events (eingehend)
 *   - cb:toggle-inspector           → auf/zu
 *   - cb:inspector-open / -close    → optionale Fremdlistener
 *
 * Öffentliche API
 *   window.Inspector.open()
 *   window.Inspector.close()
 *   window.Inspector.toggle()
 *   window.Inspector.refreshLogs()  → Logs neu einlesen
 * ========================================================================== */
(function(){
  'use strict';

  var MOD='[inspector.core]';
  var VER='v18.2.0';
  function log_ok(m){ try{ (window.CBLog?.ok||console.log)(MOD+' '+m); }catch(_){ console.log(MOD+' '+m); } }
  function log_info(m){ try{ (window.CBLog?.info||console.log)(MOD+' '+m); }catch(_){ console.log(MOD+' '+m); } }
  function log_warn(m){ try{ (window.CBLog?.warn||console.warn)(MOD+' '+m); }catch(_){ console.warn(MOD+' '+m); } }

  var root=null, tabs=null, body=null, logBox=null, active='logs';

  // ---------- Utilities ------------------------------------------------------
  function h(tag, props, children){
    var el=document.createElement(tag);
    if (props){
      for (var k in props){
        if (k==='style' && typeof props[k]==='object'){
          Object.assign(el.style, props[k]);
        } else if (k==='class') {
          el.className = props[k];
        } else {
          el.setAttribute(k, props[k]);
        }
      }
    }
    if (children){
      for (var i=0;i<children.length;i++){
        var c=children[i];
        el.appendChild( (typeof c==='string') ? document.createTextNode(c) : c );
      }
    }
    return el;
  }

  function getLogDump(){
    try{
      // bevorzugt: Polyfill/CBLog stellt dump() bereit
      if (window.CBLog && typeof CBLog.dump==='function'){
        return CBLog.dump(); // string
      }
      // Fallback: versucht CBLog.buffer (array von strings)
      if (window.CBLog && Array.isArray(CBLog.buffer)){
        return CBLog.buffer.join('\n');
      }
    }catch(_){}
    return '[CBLog nicht verfügbar]';
  }

  // ---------- View build -----------------------------------------------------
  function build(){
    if (root) return root;

    // Root
    root = h('div',{ id:'inspector', 'aria-label':'Inspector', style:{
      position:'fixed', right:'16px', bottom:'96px',
      width:'min(880px, 92vw)', maxHeight:'72vh', zIndex: 2147483646,
      background:'rgba(18,19,18,0.96)', color:'#e9ecef',
      border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px',
      boxShadow:'0 18px 60px rgba(0,0,0,.45)', backdropFilter:'blur(8px)',
      overflow:'hidden', display:'none'
    }}, []);

    // Header
    var head = h('div', { class:'insp-head', style:{
      display:'flex', alignItems:'center', gap:'8px',
      padding:'10px 12px', borderBottom:'1px solid rgba(255,255,255,0.06)',
      background:'linear-gradient(to top, rgba(255,255,255,0.04), rgba(255,255,255,0.08))'
    }}, []);

    var title = h('div', { class:'insp-title', style:{
      fontWeight:'800', letterSpacing:'.3px', marginRight:'8px'
    }}, ['Inspector']);
    var ver = h('span', { class:'insp-ver', style:{ opacity:.5, fontSize:'12px', marginLeft:'6px' }}, [VER]);

    tabs = h('div', { id:'insp-tabs', role:'tablist', style:{
      display:'flex', flexWrap:'wrap', gap:'8px', marginLeft:'12px'
    }}, []);

    // Tab Factory (graue Kapseln)
    var TAB_DEF = [
      ['overview','Übersicht'],
      ['logs','Logs'],
      ['build','Build'],
      ['tests','Tests'],
      ['resources','Ressourcen'],
      ['paths','Pfade']
    ];
    TAB_DEF.forEach(function(def){
      var id=def[0], label=def[1];
      var b = h('button', { 'data-tab':id, class:'insp-tab', type:'button', style:{
        border:'1px solid rgba(255,255,255,0.08)',
        borderRadius:'10px', padding:'7px 12px',
        background:'rgba(255,255,255,0.10)', color:'#e9ecef',
        cursor:'pointer', fontSize:'13px'
      }}, [label]);
      b.addEventListener('click', function(){ switchTo(id); });
      tabs.appendChild(b);
    });

    var spacer = h('div', { style:{ flex:1 } }, []);
    var btnClose = h('button', { id:'insp-close', type:'button', title:'Schließen', style:{
      border:'1px solid rgba(255,255,255,0.12)',
      borderRadius:'10px', padding:'6px 10px',
      background:'rgba(255,255,255,0.10)', color:'#e9ecef', cursor:'pointer'
    }}, ['Schließen']);
    btnClose.addEventListener('click', close);

    head.appendChild(title); head.appendChild(ver);
    head.appendChild(tabs); head.appendChild(spacer); head.appendChild(btnClose);
    root.appendChild(head);

    // Body
    body = h('div', { id:'insp-body', style:{
      padding:'12px', maxHeight:'calc(72vh - 52px)', overflow:'auto'
    }}, []);
    root.appendChild(body);

    // Inhalte
    var wrapLogs = h('div', { id:'insp-pane-logs', style:{ display:'none' }}, []);
    var pre = h('pre', { id:'insp-log', style:{
      margin:0, padding:'10px', minHeight:'220px',
      background:'rgba(0,0,0,0.40)', color:'#d2f4ff',
      border:'1px solid rgba(255,255,255,0.10)', borderRadius:'8px',
      font:'12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      whiteSpace:'pre-wrap'
    }}, ['[CBLog nicht verfügbar]']);
    logBox = pre;
    var row = h('div', { style:{ marginTop:'8px', display:'flex', gap:'8px', alignItems:'center' }}, []);
    var btnCopy = h('button', { type:'button', style:{
      border:'1px solid rgba(255,255,255,0.12)',
      borderRadius:'8px', padding:'8px 10px',
      background:'rgba(60,120,255,.15)', color:'#e9ecef', cursor:'pointer'
    }}, ['Kopieren']);
    btnCopy.addEventListener('click', function(){
      try{
        navigator.clipboard?.writeText(logBox.textContent || '');
        log_ok('Logs kopiert');
      }catch(_){ log_warn('Clipboard nicht verfügbar'); }
    });
    var btnRefresh = h('button', { type:'button', style:{
      border:'1px solid rgba(255,255,255,0.12)',
      borderRadius:'8px', padding:'8px 10px',
      background:'rgba(255,255,255,.10)', color:'#e9ecef', cursor:'pointer'
    }}, ['Aktualisieren']);
    btnRefresh.addEventListener('click', refreshLogs);

    row.appendChild(btnCopy); row.appendChild(btnRefresh);
    wrapLogs.appendChild(pre); wrapLogs.appendChild(row);

    var empty = function(text){
      return h('div', { class:'insp-empty', style:{
        padding:'12px', border:'1px dashed rgba(255,255,255,0.12)',
        borderRadius:'8px', background:'rgba(0,0,0,0.25)', color:'#c8d0d4'
      }}, [text]);
    };

    var wrapOverview  = h('div',{ id:'insp-pane-overview',  style:{ display:'none' }}, [ empty('Übersicht – Platzhalter.')] );
    var wrapBuild     = h('div',{ id:'insp-pane-build',     style:{ display:'none' }}, [ empty('Build – Platzhalter für Bau-Inspektion.')] );
    var wrapTests     = h('div',{ id:'insp-pane-tests',     style:{ display:'none' }}, [ empty('Tests – Platzhalter.')] );
    var wrapRes       = h('div',{ id:'insp-pane-resources', style:{ display:'none' }}, [ empty('Ressourcen – Platzhalter.')] );
    var wrapPaths     = h('div',{ id:'insp-pane-paths',     style:{ display:'none' }}, [ empty('Pfade – Platzhalter (Overlay/Heatmap).')] );

    body.appendChild(wrapOverview);
    body.appendChild(wrapLogs);
    body.appendChild(wrapBuild);
    body.appendChild(wrapTests);
    body.appendChild(wrapRes);
    body.appendChild(wrapPaths);

    document.body.appendChild(root);
    markActiveTab('logs'); // Default
    log_ok('geladen ('+VER+')');
    return root;
  }

  function markActiveTab(id){
    var btns = tabs.querySelectorAll('button.insp-tab');
    for (var i=0;i<btns.length;i++){
      var b=btns[i];
      var is = (b.getAttribute('data-tab')===id);
      b.style.background = is ? 'rgba(220,230,235,.25)' : 'rgba(255,255,255,.10)';
      b.style.color      = is ? '#111' : '#e9ecef';
      b.style.borderColor= is ? 'rgba(220,230,235,.65)' : 'rgba(255,255,255,.08)';
    }
  }

  function switchTo(id){
    active = id;
    markActiveTab(id);
    var ids = ['overview','logs','build','tests','resources','paths'];
    ids.forEach(function(k){
      var pane = document.getElementById('insp-pane-'+k);
      if (pane) pane.style.display = (k===id ? 'block' : 'none');
    });
    if (id==='logs') refreshLogs();
  }

  // ---------- API ------------------------------------------------------------
  function open(){
    build();
    root.style.display='block';
    try{ window.dispatchEvent(new Event('cb:inspector-open')); }catch(_){}
    log_ok('geöffnet ('+VER+')');
    refreshLogs();
  }
  function close(){
    if (!root) return;
    root.style.display='none';
    try{ window.dispatchEvent(new Event('cb:inspector-close')); }catch(_){}
    log_ok('geschlossen');
  }
  function toggle(){ if (!root || root.style.display==='none') open(); else close(); }

  function refreshLogs(){
    if (!logBox) return;
    try{
      var txt = getLogDump();
      logBox.textContent = txt || '[leer]';
    }catch(e){
      logBox.textContent = '[Fehler beim Lesen der Logs]';
      log_warn('refreshLogs: '+(e&&e.message));
    }
  }

  // ---------- Wiring ---------------------------------------------------------
  window.Inspector = window.Inspector || {};
  window.Inspector.open = open;
  window.Inspector.close = close;
  window.Inspector.toggle = toggle;
  window.Inspector.refreshLogs = refreshLogs;

  // FAB / UI-Bridge erwartet häufig cb:toggle-inspector
  try{
    window.addEventListener('cb:toggle-inspector', toggle);
  }catch(_){}

  // Sicherheitsbump: auf Spielstart den Inspector einmal „vorbauen“
  setTimeout(build, 200);

})();
