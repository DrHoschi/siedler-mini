/* ============================================================================
 * Datei: assets/inspector/inspector.js
 * Projekt: Siedler-Mini
 * Version: v18.3.0
 *
 * Zweck (UI laut Vorgabe „grau“)
 *   - Kompaktes, dunkles Panel mit grauen Tabs & sauberem Fokus/Shadow
 *   - Tabs: Übersicht · Logs · Build · Tests · Ressourcen · Pfade
 *   - Immer verfügbar (Startseite + Spiel), extrem hoher z-index
 *
 * Eingehende Events:
 *   - 'cb:toggle-inspector'        → Inspector ein/aus
 *   - 'cb:inspector-open/close'    → werden zusätzlich gefeuert (Info)
 *
 * Pfad-/Res.-Integration:
 *   - Toggle Overlay: window.DEBUG_PATH_OVERLAY = true/false
 *   - Heatmap reset: dispatchEvent('cb:path-heat-reset')
 *   - Ressourcen:    Game.addResources(type, n) || dispatch('cb:add-resources')
 *
 * Legacy-Kompat (v17.3.x):
 *   - Events:  'cb:inspector-show' / 'cb:inspector-hide'
 *   - Globals: showInspector(), hideInspector(), toggleInspector()
 *   - Alias:   window.InspectorCore === window.Inspector
 * ========================================================================== */
(function(){
  'use strict';

  var MOD='[inspector.core]';
  var VER='v18.3.0';

  // ----------------------------- logging -------------------------------------
  function ok(m){ try{ (window.CBLog?.ok||console.log)(MOD+' '+m); }catch(_){ console.log(MOD+' '+m); } }
  function info(m){ try{ (window.CBLog?.info||console.log)(MOD+' '+m); }catch(_){ console.log(MOD+' '+m); } }
  function warn(m){ try{ (window.CBLog?.warn||console.warn)(MOD+' '+m); }catch(_){ console.warn(MOD+' '+m); } }

  // ------------------------------ state --------------------------------------
  var root=null, tabsBar=null, body=null, logBox=null;
  var currentTab='logs';

  // ------------------------------ utils --------------------------------------
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
  function line(label, value){
    var row=h('div',{class:'insp-row',style:{display:'grid',gridTemplateColumns:'160px 1fr',gap:'8px',padding:'6px 0',borderBottom:'1px dashed rgba(255,255,255,.08)'}},[
      h('div',{style:{opacity:.65}},[label]),
      h('div',null,[value])
    ]);
    return row;
  }
  function getLogDump(){
    try{
      if (window.CBLog?.dump) return CBLog.dump();
      if (window.CBLog?.buffer) return CBLog.buffer.join('\n');
    }catch(_){}
    return '[CBLog nicht verfügbar]';
  }
  function emit(name, detail){
    try{ window.dispatchEvent(new CustomEvent(name,{detail:detail||{}})); }catch(_){}
  }

  // ------------------------------ style (inline, exakt grau) ------------------
  function injectStyle(){
    if (document.getElementById('insp-style')) return;
    var css = `
      #inspector{font:13px/1.3 system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,sans-serif;}
      #inspector .insp-title{font-size:18px;letter-spacing:.25px;color:#eef1ef}
      #inspector .insp-tab{transition:background .12s ease,border-color .12s ease,transform .06s ease}
      #inspector .insp-tab:focus{outline:2px solid rgba(140,200,255,.55); outline-offset:2px}
      #inspector .insp-tab[data-active="1"]{
        background:rgba(220,226,224,.28)!important;
        color:#111!important;
        border-color:rgba(220,226,224,.65)!important;
      }
      #inspector .insp-btn{
        border:1px solid rgba(255,255,255,.12);
        border-radius:10px; padding:8px 12px; color:#e9ecef;
        background:rgba(255,255,255,.10); cursor:pointer;
      }
      #inspector .insp-btn:focus{outline:2px solid rgba(140,200,255,.55); outline-offset:2px}
      #inspector .insp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}
      #inspector .insp-card{
        border:1px solid rgba(255,255,255,.10);
        border-radius:10px; background:rgba(0,0,0,.28);
        padding:10px; color:#dbe1df;
      }
      #inspector .insp-switch{display:flex;align-items:center;gap:10px}
      #inspector .insp-note{font-size:12px;opacity:.7}
      #insp-log{
        scrollbar-width:thin; scrollbar-color:rgba(160,170,168,.6) transparent;
      }
      #insp-log::-webkit-scrollbar{height:8px;width:8px}
      #insp-log::-webkit-scrollbar-thumb{background:rgba(160,170,168,.6);border-radius:8px}
    `.trim();
    var s=document.createElement('style'); s.id='insp-style'; s.textContent=css; document.head.appendChild(s);
  }

  // ------------------------------ builder ------------------------------------
  function buildOnce(){
    if (root) return root;
    injectStyle();

    root = h('div',{ id:'inspector', role:'dialog', 'aria-label':'Inspector', style:{
      position:'fixed', right:'16px', bottom:'96px',
      width:'min(920px, 92vw)', maxHeight:'74vh',
      zIndex:2147483646, background:'rgba(18,19,18,0.97)', color:'#e9ecef',
      border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px',
      boxShadow:'0 24px 72px rgba(0,0,0,.55)', backdropFilter:'blur(8px)',
      overflow:'hidden', display:'none'
    }}, []);

    // Header
    var head=h('div',{style:{
      display:'flex', alignItems:'center', gap:'10px',
      padding:'12px', borderBottom:'1px solid rgba(255,255,255,.07)',
      background:'linear-gradient(to top, rgba(255,255,255,.04), rgba(255,255,255,.08))'
    }},[]);
    var title=h('div',{class:'insp-title'},['Inspector']);
    var ver=h('span',{style:{opacity:.55,fontSize:'12px',marginLeft:'6px'}},[VER]);

    tabsBar = h('div',{id:'insp-tabs',role:'tablist',style:{display:'flex',flexWrap:'wrap',gap:'8px',marginLeft:'12px'}},[]);
    [
      ['overview','Übersicht'],
      ['logs','Logs'],
      ['build','Build'],
      ['tests','Tests'],
      ['resources','Ressourcen'],
      ['paths','Pfade']
    ].forEach(function(def){
      var id=def[0], label=def[1];
      var b=h('button',{'data-tab':id,class:'insp-tab',type:'button',style:{
        border:'1px solid rgba(255,255,255,.10)',borderRadius:'10px',
        padding:'7px 12px',background:'rgba(26,29,27,.9)',color:'#e9ecef',cursor:'pointer'
      }},[label]);
      b.addEventListener('click', function(){ switchTo(id); });
      tabsBar.appendChild(b);
    });

    var spacer=h('div',{style:{flex:1}},[]);
    var btnClose=h('button',{class:'insp-btn',id:'insp-close',type:'button'},['Schließen']);
    btnClose.addEventListener('click', close);

    head.appendChild(title); head.appendChild(ver);
    head.appendChild(tabsBar); head.appendChild(spacer); head.appendChild(btnClose);
    root.appendChild(head);

    // Body
    body=h('div',{id:'insp-body',style:{padding:'12px',maxHeight:'calc(74vh - 58px)',overflow:'auto'}},[]);
    root.appendChild(body);

    // ---------- PANES --------------------------------------------------------
    // Übersicht
    var pOverview=h('div',{id:'insp-pane-overview',style:{display:'none'}},[
      h('div',{class:'insp-grid'},[
        cardKV('Engine', window.__cb?.engineVersion || '–'),
        cardKV('Index',  window.__cb?.indexVersion  || '–'),
        cardKV('Map',    (document.getElementById('game')?.dataset?.map)||'–'),
        cardKV('Overlay', (window.DEBUG_PATH_OVERLAY?'Pfad-Overlay: AN':'Pfad-Overlay: AUS')),
      ]),
      h('div',{style:{marginTop:'10px'}},[
        h('div',{class:'insp-note'},['Hinweis: Inhalte werden nach und nach befüllt.'])
      ])
    ]);

    // Logs
    var pLogs=h('div',{id:'insp-pane-logs',style:{display:'none'}},[]);
    logBox=h('pre',{id:'insp-log',style:{
      margin:0,padding:'10px',minHeight:'240px',
      background:'rgba(0,0,0,.35)',color:'#d2f4ff',
      border:'1px solid rgba(255,255,255,.10)',borderRadius:'8px',
      whiteSpace:'pre-wrap'
    }},['[CBLog nicht verfügbar]']);
    var logsRow=h('div',{style:{marginTop:'8px',display:'flex',gap:'8px',alignItems:'center'}},[]);
    var btnCopy=h('button',{class:'insp-btn',type:'button'},['Kopieren']);
    btnCopy.addEventListener('click',function(){
      try{ navigator.clipboard?.writeText(logBox.textContent||''); ok('Logs kopiert'); }
      catch(_){ warn('Clipboard nicht verfügbar'); }
    });
    var btnRefresh=h('button',{class:'insp-btn',type:'button'},['Aktualisieren']);
    btnRefresh.addEventListener('click',refreshLogs);
    logsRow.appendChild(btnCopy); logsRow.appendChild(btnRefresh);
    pLogs.appendChild(logBox); pLogs.appendChild(logsRow);

    // Build (Platzhalter, strukturiert)
    var pBuild=h('div',{id:'insp-pane-build',style:{display:'none'}},[
      h('div',{class:'insp-card'},[
        h('div',{style:{fontWeight:'700',marginBottom:'6px'}},['Bau-Werkzeuge']),
        h('div',{class:'insp-note'},['Anzeige geplanter Build-Tools / Queues (Platzhalter).'])
      ])
    ]);

    // Tests (hier: Pfad-Overlay & Ressourcen zusammen erreichbar)
    var pTests=h('div',{id:'insp-pane-tests',style:{display:'none'}},[
      sectionTitle('Debug-Schalter'),
      switchOverlay(),
      h('div',{style:{height:'8px'}}),
      sectionTitle('Ressourcen hinzufügen'),
      resAdder()
    ]);

    // Ressourcen (separates Tab – Übersicht + Adder)
    var pRes=h('div',{id:'insp-pane-resources',style:{display:'none'}},[
      h('div',{class:'insp-grid'},[
        h('div',{class:'insp-card'},[
          h('div',{style:{fontWeight:'700',marginBottom:'6px'}},['Lager / Bestand']),
          h('div',{id:'insp-res-list',class:'insp-note'},['(noch keine API – Anzeige folgt)'])
        ]),
        h('div',{class:'insp-card'},[
          h('div',{style:{fontWeight:'700',marginBottom:'6px'}},['Hinzufügen']),
          resAdder()
        ])
      ])
    ]);

    // Pfade (Overlay + Heatmap Reset)
    var pPaths=h('div',{id:'insp-pane-paths',style:{display:'none'}},[
      sectionTitle('Pfad-Overlay'),
      switchOverlay(),
      h('div',{style:{marginTop:'8px'}},[
        h('button',{class:'insp-btn',type:'button'},['Heatmap zurücksetzen'])
      ])
    ]);
    // Heatmap-Reset click:
    pPaths.querySelector('button.insp-btn').addEventListener('click', function(){
      emit('cb:path-heat-reset');
      ok('Heatmap-Reset angefordert');
    });

    body.appendChild(pOverview);
    body.appendChild(pLogs);
    body.appendChild(pBuild);
    body.appendChild(pTests);
    body.appendChild(pRes);
    body.appendChild(pPaths);

    document.body.appendChild(root);
    markActive(currentTab); showOnly(currentTab);
    ok('geladen ('+VER+')');

    // kleine Initial-Sync
    refreshLogs();
    setOverlaySwitchesChecked();
    return root;
  }

  function sectionTitle(t){
    return h('div',{style:{fontWeight:'800',letterSpacing:'.2px',margin:'2px 0 8px',opacity:.95}},[t]);
  }
  function cardKV(k,v){
    var card=h('div',{class:'insp-card'},[
      h('div',{style:{fontWeight:'700',marginBottom:'6px'}},[k]),
      h('div',null,[String(v)])
    ]);
    return card;
  }

  // ----- Pfad-Overlay Switch (wird mehrfach verwendet) -----------------------
  function switchOverlay(){
    var wrap=h('div',{class:'insp-card'},[
      h('div',{class:'insp-switch'},[
        (function(){
          var chk=h('input',{type:'checkbox',id:uid('chk-overlay')},[]);
          chk.checked=!!window.DEBUG_PATH_OVERLAY;
          chk.addEventListener('change', function(){
            var enabled=!!chk.checked;
            window.DEBUG_PATH_OVERLAY=enabled;
            emit('cb:toggle-path-overlay',{enabled});
            try{ window.requestAnimationFrame?.(()=>emit('cb:request-repaint')); }catch(_){}
            ok('Pfad-Overlay: '+(enabled?'AN':'AUS'));
          });
          return chk;
        })(),
        h('label',{'for':lastUid(),style:{cursor:'pointer'}},['Pfad-Overlay anzeigen'])
      ]),
      h('div',{class:'insp-note',style:{marginTop:'6px'}},['Zeigt Heatmap & letzte Pfade (A*).'])
    ]);
    return wrap;
  }
  function setOverlaySwitchesChecked(){
    var list=root?.querySelectorAll('input[type=checkbox][id*="chk-overlay"]');
    if (!list) return;
    list.forEach(function(chk){ chk.checked=!!window.DEBUG_PATH_OVERLAY; });
  }

  // ----- Ressourcen-Adder ----------------------------------------------------
  function resAdder(){
    var wrap=h('div',{class:'insp-card'},[]);
    var row=h('div',{style:{display:'grid',gridTemplateColumns:'1fr 110px 120px',gap:'8px',alignItems:'center'}},[]);
    var inpType=h('input',{type:'text',placeholder:'Typ (z.B. wood)',id:uid('res-type'),style:{
      padding:'8px 10px',border:'1px solid rgba(255,255,255,.12)',borderRadius:'10px',
      background:'rgba(0,0,0,.25)',color:'#e9ecef'
    }},[]);
    var inpAmt=h('input',{type:'number',min:'1',step:'1',value:'10',id:uid('res-amt'),style:{
      padding:'8px 10px',border:'1px solid rgba(255,255,255,.12)',borderRadius:'10px',
      background:'rgba(0,0,0,.25)',color:'#e9ecef'
    }},[]);
    var btn=h('button',{class:'insp-btn',type:'button'},['Hinzufügen']);
    var status=h('div',{class:'insp-note',style:{marginTop:'8px'}},['—']);
    btn.addEventListener('click',function(){
      var type=String(inpType.value||'').trim();
      var amount = Math.max(1, parseInt(inpAmt.value||'0',10)||0);
      if (!type){ status.textContent='Bitte Ressourcentyp angeben.'; return; }
      var okDirect=false;
      try{
        if (window.Game && typeof Game.addResources==='function'){ Game.addResources(type,amount); okDirect=true; }
      }catch(_){}
      if (!okDirect){
        emit('cb:add-resources',{type,amount});
      }
      status.textContent = `+${amount} ${type}`+(okDirect?' (direct)':' (event)');
      ok(`Ressourcen +${amount} ${type}`+(okDirect?' direct':' event'));
    });
    row.appendChild(inpType); row.appendChild(inpAmt); row.appendChild(btn);
    wrap.appendChild(row); wrap.appendChild(status);
    return wrap;
  }

  // ------------------------------ tab logic ----------------------------------
  function markActive(id){
    currentTab=id;
    var btns=tabsBar.querySelectorAll('button.insp-tab');
    for (var i=0;i<btns.length;i++){
      var b=btns[i], is=(b.getAttribute('data-tab')===id);
      b.setAttribute('data-active', is?'1':'0');
    }
  }
  function showOnly(id){
    var ids=['overview','logs','build','tests','resources','paths'];
    ids.forEach(function(k){
      var pane=document.getElementById('insp-pane-'+k);
      if (pane) pane.style.display = (k===id ? 'block' : 'none');
    });
  }
  function switchTo(id){
    markActive(id);
    showOnly(id);
    if (id==='logs') refreshLogs();
  }

  // ------------------------------ API ----------------------------------------
  function open(){
    buildOnce();
    root.style.display='block';
    try{ window.dispatchEvent(new Event('cb:inspector-open')); }catch(_){}
    refreshLogs();
    setOverlaySwitchesChecked();
    ok('geöffnet ('+VER+')');
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

  // ----------------------------- wire-up -------------------------------------
  window.Inspector = window.Inspector || {};
  window.Inspector.open = open;
  window.Inspector.close = close;
  window.Inspector.toggle = toggle;
  window.Inspector.refreshLogs = refreshLogs;

  window.addEventListener('cb:toggle-inspector', toggle);

  // Pre-build (damit Toggle sofort klappt, auch auf Startseite)
  setTimeout(buildOnce, 200);

  // ----- Legacy (v17.3.x) ----------------------------------------------------
  window.addEventListener('cb:inspector-show', open);
  window.addEventListener('cb:inspector-hide', close);
  window.showInspector = open;
  window.hideInspector = close;
  window.toggleInspector = toggle;
  window.InspectorCore = window.Inspector;

  // ------------------------------ small helpers ------------------------------
  var __uidSeq = 0, __lastUid = '';
  function uid(prefix){ __lastUid = (prefix||'id')+'-'+(++__uidSeq); return __lastUid; }
  function lastUid(){ return __lastUid; }

})();
