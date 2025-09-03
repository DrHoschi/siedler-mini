/* ============================================================================
 * Datei: assets/inspector/inspector.js
 * Projekt: Siedler-Mini
 * Version: v18.1.0
 *
 * Ziel:
 *  - Inspector öffnet *immer* (ohne externe Abhängigkeiten)
 *  - Vollbild-Overlay, Panel unten rechts
 *  - Tabs: Logs (funktional), Tests / Ressourcen / Pfade (Platzhalter)
 *  - Eigene Styles eingebettet (kein externes CSS nötig)
 *
 * Events (dispatch):
 *  - cb:inspector-open / cb:inspector-close
 *  - cb:log-refresh
 *
 * Abhängigkeiten (optional, falls vorhanden):
 *  - window.CBLog  (History & Logging)
 *  - window.Game   (für spätere Tabs; hier noch nicht benötigt)
 * ========================================================================== */
(function(){
  'use strict';
  var MOD='[inspector.core]';
  var VER='v18.1.0';

  // ---------- sanfte Logger --------------------------------------------------
  function L_ok(m){ try{ (window.CBLog?.ok||console.log)(MOD+' '+m);}catch(_){console.log(MOD+' '+m);} }
  function L_warn(m){ try{ (window.CBLog?.warn||console.warn)(MOD+' '+m);}catch(_){console.warn(MOD+' '+m);} }
  function L_err(m){ try{ (window.CBLog?.err||console.error)(MOD+' '+m);}catch(_){console.error(MOD+' '+m);} }

  // ---------- lokale Log-History (Fallback) ---------------------------------
  var LocalLog=(function(){
    var list=[];
    function push(level,msg){
      var t=new Date();
      list.push({ts:t.toISOString(), level:String(level||'info'), msg:String(msg||'')});
      if(list.length>2000) list.shift();
      try{ window.dispatchEvent(new Event('cb:log-refresh')); }catch(_){}
    }
    return {
      list:list,
      push:push,
      ok:(m)=>push('ok',m),
      warn:(m)=>push('warn',m),
      err:(m)=>push('err',m),
      info:(m)=>push('info',m)
    };
  })();

  // tappe CBLog.push, wenn vorhanden (ohne es zu zerstören)
  try{
    if (window.CBLog && typeof window.CBLog.push==='function'){
      var __origPush = window.CBLog.push.bind(window.CBLog);
      window.CBLog.push = function(level, msg){
        try{ LocalLog.push(level, msg);}catch(_){}
        return __origPush(level, msg);
      };
    }
  }catch(_){}

  // ---------- DOM & State ----------------------------------------------------
  var ov=null, panel=null, tabsBar=null, body=null, isOpen=false, active='logs';

  // ---------- Styles (eingebettet) ------------------------------------------
  var CSS = `
#cb-inspector-ov{
  position:fixed; inset:0; z-index:2147483646;
  background:rgba(0,0,0,.35); backdrop-filter:blur(2px);
  display:none; opacity:0; transition:opacity .15s;
}
#cb-inspector-ov.open{ display:block; }
#cb-inspector-ov.show{ opacity:1; }

#cb-inspector{
  position:fixed; right:12px; bottom:96px;
  width:min(520px,96vw); max-height:72vh; overflow:auto;
  background:#171b20; color:#e6e6e6;
  border:1px solid #2b3138; border-radius:10px;
  box-shadow:0 18px 48px rgba(0,0,0,.5);
  font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
}
#cb-inspector header{
  position:sticky; top:0; z-index:1;
  background:#12161a; border-bottom:1px solid #2a3139;
  padding:10px 10px 8px;
}
#cb-inspector .title{
  display:flex; align-items:center; gap:8px; margin-bottom:8px;
  font-weight:800; color:#f3f4f6;
}
#cb-inspector .ver{ margin-left:auto; font-size:12px; opacity:.6; }
#cb-inspector .close{
  border:1px solid #39414b; background:#0f172a; color:#e2e8f0;
  border-radius:8px; padding:6px 10px; cursor:pointer;
}

#cb-inspector .tabs{ display:flex; gap:6px; flex-wrap:wrap; }
#cb-inspector .tabs button{
  border:1px solid #2d3748; border-radius:999px; padding:6px 10px; cursor:pointer;
  background:#0f172a; color:#cbd5e1; font-weight:700;
}
#cb-inspector .tabs button.active{
  background:#cbd5e1; color:#0b1220; border-color:#cbd5e1;
}

#cb-inspector .content{ padding:12px; }
.cb-row{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.cb-col{ display:flex; flex-direction:column; gap:8px; }
.cb-group{ border:1px solid #2a3139; border-radius:8px; padding:10px; background:#0f1317; }
.cb-note{ font-size:12px; opacity:.7; }

.cb-btn{
  border:1px solid #3a4454; border-radius:8px; padding:6px 10px; cursor:pointer;
  background:#1f2937; color:#e5e7eb;
}
.cb-btn.primary{ background:#1d4ed8; border-color:#1d4ed8; color:#fff; }
.cb-btn.warn{ background:#9a3412; border-color:#9a3412; color:#fff; }

.cb-switch{ display:flex; align-items:center; gap:6px; }
.cb-switch input[type="checkbox"]{ width:18px; height:18px; }

.cb-loglist{ max-height:44vh; overflow:auto; border:1px solid #2a3139; border-radius:8px; }
.cb-logitem{ display:flex; gap:8px; padding:6px 8px; border-bottom:1px solid #1b2026; align-items:flex-start; }
.cb-logitem:last-child{ border-bottom:none; }
.cb-badge{ display:inline-block; min-width:1.8em; text-align:center; border-radius:999px; font-size:11px; padding:2px 6px; }
.cb-badge.ok{ background:#14532d; color:#d1fae5; }
.cb-badge.warn{ background:#7c2d12; color:#fde68a; }
.cb-badge.err{ background:#7f1d1d; color:#fecaca; }
.cb-badge.info{ background:#0c4a6e; color:#bae6fd; }
.cb-ts{ font-family:ui-monospace,Menlo,monospace; opacity:.65; }
.cb-msg{ white-space:pre-wrap; }
`;

  function injectStyle(){
    if (document.getElementById('cb-inspector-style')) return;
    var st=document.createElement('style');
    st.id='cb-inspector-style';
    st.textContent=CSS;
    document.head.appendChild(st);
  }

  // ---------- Aufbau ---------------------------------------------------------
  function build(){
    if (ov) return;
    injectStyle();

    ov=document.createElement('div');
    ov.id='cb-inspector-ov';
    ov.addEventListener('click', function(ev){
      if (ev.target===ov) toggle(false);
    });

    panel=document.createElement('div');
    panel.id='cb-inspector';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label','Inspector');

    var head=document.createElement('header');

    var title=document.createElement('div');
    title.className='title';
    title.innerHTML='<span>Inspector</span><span class="ver">'+VER+'</span>';

    var btnClose=document.createElement('button');
    btnClose.className='close';
    btnClose.textContent='Schließen';
    btnClose.addEventListener('click', ()=>toggle(false));

    tabsBar=document.createElement('div');
    tabsBar.className='tabs';

    [
      {id:'logs',label:'Logs'},
      {id:'tests',label:'Tests'},
      {id:'ressourcen',label:'Ressourcen'},
      {id:'pfade',label:'Pfade'}
    ].forEach(function(t){
      var b=document.createElement('button');
      b.textContent=t.label; b.dataset.tab=t.id;
      if (t.id===active) b.classList.add('active');
      b.addEventListener('click', function(){
        active=t.id; refreshTabs(); render();
      });
      tabsBar.appendChild(b);
    });

    head.appendChild(title);
    head.appendChild(btnClose);
    head.appendChild(tabsBar);

    body=document.createElement('div');
    body.className='content';

    panel.appendChild(head);
    panel.appendChild(body);
    ov.appendChild(panel);
    document.body.appendChild(ov);

    L_ok('geladen ('+VER+')');
  }

  function refreshTabs(){
    var bs=tabsBar.querySelectorAll('button');
    for (var i=0;i<bs.length;i++){
      bs[i].classList.toggle('active', bs[i].dataset.tab===active);
    }
  }

  // ---------- LOGS (funktionsfähig) -----------------------------------------
  function getHistory(){
    try{
      if (window.CBLog && Array.isArray(window.CBLog._history)) return window.CBLog._history;
    }catch(_){}
    return LocalLog.list;
  }

  function badgeFor(level){
    var lv=String(level||'info').toLowerCase();
    if (lv==='ok'||lv==='success') return '<span class="cb-badge ok">OK</span>';
    if (lv==='warn') return '<span class="cb-badge warn">WARN</span>';
    if (lv==='err'||lv==='error') return '<span class="cb-badge err">ERR</span>';
    return '<span class="cb-badge info">INFO</span>';
  }

  function renderLogs(){
    var wrap=document.createElement('div'); wrap.className='cb-col';

    var controls=document.createElement('div'); controls.className='cb-row cb-group';
    var chkErr = mkCheck('Fehler', true);
    var chkWarn= mkCheck('Warnungen', true);
    var chkOk  = mkCheck('Erfolg', true);
    var chkInfo= mkCheck('Info', true);
    controls.appendChild(chkErr.el); controls.appendChild(chkWarn.el); controls.appendChild(chkOk.el); controls.appendChild(chkInfo.el);

    var actions=document.createElement('div'); actions.className='cb-row';
    var btnCopy = mkBtn('Kopieren','cb-btn');
    var btnExport = mkBtn('Exportieren','cb-btn');
    var btnRefresh = mkBtn('Aktualisieren','cb-btn');
    var stat=document.createElement('div'); stat.className='cb-note'; stat.style.marginLeft='auto';
    actions.appendChild(btnCopy); actions.appendChild(btnExport); actions.appendChild(btnRefresh); actions.appendChild(stat);

    var list=document.createElement('div'); list.className='cb-loglist';

    function apply(){
      var hist=getHistory()||[];
      list.innerHTML='';
      var count=0;
      hist.forEach(function(h){
        var lv=String(h.level||'info').toLowerCase();
        var allow = (lv==='err'||lv==='error') ? chkErr.input.checked
                   : (lv==='warn') ? chkWarn.input.checked
                   : (lv==='ok'||lv==='success') ? chkOk.input.checked
                   : chkInfo.input.checked;
        if (!allow) return;
        count++;
        var row=document.createElement('div'); row.className='cb-logitem';
        var ts=document.createElement('span'); ts.className='cb-ts';
        var time = h.ts ? new Date(h.ts) : new Date();
        ts.textContent = time.toLocaleTimeString();
        var badge=document.createElement('span'); badge.innerHTML = badgeFor(lv);
        var msg=document.createElement('div'); msg.className='cb-msg'; msg.textContent=String(h.msg||'');
        row.appendChild(badge); row.appendChild(ts); row.appendChild(msg);
        list.appendChild(row);
      });
      stat.textContent='Einträge: '+count;
    }

    [chkErr.input,chkWarn.input,chkOk.input,chkInfo.input].forEach(inp=>inp.addEventListener('change', apply));
    btnRefresh.addEventListener('click', apply);

    btnCopy.addEventListener('click', function(){
      try{
        var hist=getHistory()||[];
        var txt=hist.map(h=>`[${(h.ts?new Date(h.ts).toLocaleTimeString():'--:--:--')}] ${h.level||'info'} ${h.msg||''}`).join('\n');
        navigator.clipboard.writeText(txt).then(()=>L_ok('Logs kopiert')).catch(()=>L_warn('Clipboard verweigert'));
      }catch(e){ L_warn('Kopieren fehlgeschlagen: '+(e&&e.message)); }
    });

    btnExport.addEventListener('click', function(){
      try{
        var hist=getHistory()||[];
        var blob=new Blob([JSON.stringify(hist,null,2)], {type:'application/json'});
        var url=URL.createObjectURL(blob);
        var a=document.createElement('a'); a.href=url; a.download='logs.json'; a.click();
        setTimeout(()=>URL.revokeObjectURL(url), 1500);
        L_ok('Logs exportiert');
      }catch(e){ L_warn('Export fehlgeschlagen: '+(e&&e.message)); }
    });

    // auto-refresh wenn neue Logeinträge reinkommen
    window.addEventListener('cb:log-refresh', function onref(){
      if (active==='logs') apply();
    });

    apply();

    wrap.appendChild(controls);
    wrap.appendChild(actions);
    wrap.appendChild(list);
    return wrap;
  }

  // ---------- Platzhalter-Tabs ----------------------------------------------
  function renderTests(){
    var box=document.createElement('div'); box.className='cb-group';
    box.innerHTML='<div class="cb-note">Tests-Tab wird gerade umgebaut. Events & Runner folgen.</div>';
    return box;
  }

  function renderResources(){
    var box=document.createElement('div'); box.className='cb-group';
    box.innerHTML='<div class="cb-note">Ressourcen-Tab (Lesen/Setzen/Buttons) folgt gemäß Vorgabe.</div>';
    return box;
  }

  function renderPaths(){
    var box=document.createElement('div'); box.className='cb-group';
    box.innerHTML='<div class="cb-note">Pfade-Tab (Overlay-Toggles, Heatmap etc.) folgt. Debug-Flags & Events werden angebunden.</div>';
    return box;
  }

  // ---------- Render-Switch --------------------------------------------------
  function render(){
    body.innerHTML='';
    var node=null;
    if (active==='logs') node=renderLogs();
    else if (active==='tests') node=renderTests();
    else if (active==='ressourcen') node=renderResources();
    else if (active==='pfade') node=renderPaths();
    body.appendChild(node||document.createTextNode('Kein Inhalt'));
  }

  // ---------- Open/Close -----------------------------------------------------
  function setOpen(want){
    build();
    if (want){
      ov.classList.add('open');
      requestAnimationFrame(()=>ov.classList.add('show'));
      render();
      try{ window.dispatchEvent(new Event('cb:inspector-open')); }catch(_){}
      isOpen=true; L_ok('geöffnet ('+VER+')');
    } else {
      ov.classList.remove('show');
      setTimeout(()=>ov.classList.remove('open'), 140);
      try{ window.dispatchEvent(new Event('cb:inspector-close')); }catch(_){}
      isOpen=false; L_ok('geschlossen');
    }
  }
  function toggle(force){
    var want=(typeof force==='boolean')? force : !isOpen;
    setOpen(want);
  }

  // ---------- API & Hotkey ---------------------------------------------------
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = toggle;
  window.addEventListener('keydown', function(ev){
    if (ev.key==='Escape' && isOpen) toggle(false);
  });

  // ---------- Init -----------------------------------------------------------
  build();
  L_ok('bereit ('+VER+')');
})();
