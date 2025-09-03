/* ============================================================================
 * Datei: assets/inspector/inspector.js
 * Projekt: Siedler-Mini
 * Version: v18.2.0
 *
 * Garantie:
 *  - Stellt IMMER window.GameUI.toggleInspector bereit.
 *  - Baut eigenes Overlay + Styles; blockiert keine FAB-Buttons.
 *  - Hat internen Fallback (Mini-Panel), falls irgendwas crasht.
 *
 * Tabs:
 *  - Logs (funktional)
 *  - Tests (Platzhalter)
 *  - Ressourcen (Platzhalter)
 *  - Pfade (JETZT FUNKTIONAL: Toggles, Redraw, Random-Tests, Kennzahlen)
 *
 * Events (dispatch):
 *  - cb:inspector-open / cb:inspector-close
 *  - cb:log-refresh
 *  - cb:toggle-path-overlay      {detail:{enabled}}
 *  - cb:toggle-heatmap           {detail:{enabled}}
 *  - cb:toggle-collision         {detail:{enabled}}
 *  - cb:toggle-trample           {detail:{enabled}}
 *  - cb:toggle-doors             {detail:{enabled}}
 *  - cb:path-test                {detail:{mode, count}}
 *  - cb:request-repaint
 * ========================================================================== */
(function(){
  'use strict';

  var MOD='[inspector.core]';
  var VER='v18.2.0';

  // ---------- sanfte Logger --------------------------------------------------
  function L_ok(m){ try{ (window.CBLog?.ok||console.log)(MOD+' '+m);}catch(_){console.log(MOD+' '+m);} }
  function L_warn(m){ try{ (window.CBLog?.warn||console.warn)(MOD+' '+m);}catch(_){console.warn(MOD+' '+m);} }
  function L_err(m){ try{ (window.CBLog?.err||console.error)(MOD+' '+m);}catch(_){console.error(MOD+' '+m);} }

  // ---------- minimaler Fallback-Panel --------------------------------------
  function fallbackToggle(force){
    var id='inspector-fallback';
    var el=document.getElementById(id);
    var want=(typeof force==='boolean')? force : !el || el.style.display==='none';

    if (!el){
      el=document.createElement('div');
      el.id=id;
      el.style.cssText='position:fixed;right:12px;bottom:96px;width:420px;max-width:92vw;max-height:70vh;overflow:auto;background:rgba(20,20,20,.94);border:1px solid #333;border-radius:8px;z-index:2147483646;color:#eee;padding:10px;display:block';
      el.innerHTML='<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;font-weight:800;">Inspector (Fallback) <span style="margin-left:auto;opacity:.6;font-size:12px;">'+VER+'</span><button id="inspector-fallback-close" style="border:1px solid #444;background:#0f172a;color:#e2e8f0;border-radius:6px;padding:4px 8px;cursor:pointer;">Schließen</button></div><div id="inspector-fallback-body" style="font-size:13px;opacity:.9;">Laderichtige Inspector-UI konnte nicht initialisiert werden. Logs werden unten angezeigt.</div><div id="inspector-fallback-logs" style="margin-top:8px;border-top:1px solid #2a2a2a;padding-top:8px;max-height:50vh;overflow:auto;font-family:ui-monospace,Menlo,monospace;font-size:12px;"></div>';
      document.body.appendChild(el);
      var x=document.getElementById('inspector-fallback-close');
      x.onclick=function(){ el.style.display='none'; };
      try{
        var box=document.getElementById('inspector-fallback-logs');
        box.textContent=(window.CBLog? '[Log aktiviert]':'[Lokales Log]')+' — '+new Date().toLocaleTimeString();
      }catch(_){}
    }
    el.style.display = want ? 'block' : 'none';
  }

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

  // CBLog-Hook (nicht-invasiv)
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
  var pfUi = { // Referenzen für Pfad-Tab-Anzeigen
    fps:null, active:null, avglen:null, blocked:null
  };

  // ---------- Styles ---------------------------------------------------------
  var CSS = `
#cb-inspector-ov{ position:fixed; inset:0; z-index:2147483646; background:rgba(0,0,0,.35); backdrop-filter:blur(2px); display:none; opacity:0; transition:opacity .15s; }
#cb-inspector-ov.open{ display:block; } #cb-inspector-ov.show{ opacity:1; }
#cb-inspector{ position:fixed; right:12px; bottom:96px; width:min(520px,96vw); max-height:72vh; overflow:auto; background:#171b20; color:#e6e6e6; border:1px solid #2b3138; border-radius:10px; box-shadow:0 18px 48px rgba(0,0,0,.5); font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
#cb-inspector header{ position:sticky; top:0; z-index:1; background:#12161a; border-bottom:1px solid #2a3139; padding:10px 10px 8px; }
#cb-inspector .title{ display:flex; align-items:center; gap:8px; margin-bottom:8px; font-weight:800; color:#f3f4f6; }
#cb-inspector .ver{ margin-left:auto; font-size:12px; opacity:.6; }
#cb-inspector .close{ border:1px solid #39414b; background:#0f172a; color:#e2e8f0; border-radius:8px; padding:6px 10px; cursor:pointer; }
#cb-inspector .tabs{ display:flex; gap:6px; flex-wrap:wrap; }
#cb-inspector .tabs button{ border:1px solid #2d3748; border-radius:999px; padding:6px 10px; cursor:pointer; background:#0f172a; color:#cbd5e1; font-weight:700; }
#cb-inspector .tabs button.active{ background:#cbd5e1; color:#0b1220; border-color:#cbd5e1; }
#cb-inspector .content{ padding:12px; }
.cb-row{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.cb-col{ display:flex; flex-direction:column; gap:8px; }
.cb-grid{ display:grid; gap:8px; }
.cb-grid-2{ grid-template-columns: 1fr 1fr; }
.cb-grid-3{ grid-template-columns: repeat(3, 1fr); }
.cb-group{ border:1px solid #2a3139; border-radius:8px; padding:10px; background:#0f1317; }
.cb-note{ font-size:12px; opacity:.7; }
.cb-btn{ border:1px solid #3a4454; border-radius:8px; padding:6px 10px; cursor:pointer; background:#1f2937; color:#e5e7eb; }
.cb-btn.primary{ background:#1d4ed8; border-color:#1d4ed8; color:#fff; }
.cb-btn.warn{ background:#9a3412; border-color:#9a3412; color:#fff; }
.cb-switch{ display:flex; align-items:center; gap:6px; }
.cb-switch input[type="checkbox"]{ width:18px; height:18px; }
.cb-table{ width:100%; border-collapse:collapse; font-size:13px; }
.cb-table th, .cb-table td{ border-bottom:1px solid #2a2f35; padding:6px 8px; }
.cb-table th{ text-align:left; opacity:.8; }
.cb-loglist{ max-height:44vh; overflow:auto; border:1px solid #2a3139; border-radius:8px; }
.cb-logitem{ display:flex; gap:8px; padding:6px 8px; border-bottom:1px solid #1b2026; align-items:flex-start; }
.cb-logitem:last-child{ border-bottom:none; }
.cb-badge{ display:inline-block; min-width:1.8em; text-align:center; border-radius:999px; font-size:11px; padding:2px 6px; }
.cb-badge.ok{ background:#14532d; color:#d1fae5; } .cb-badge.warn{ background:#7c2d12; color:#fde68a; }
.cb-badge.err{ background:#7f1d1d; color:#fecaca; } .cb-badge.info{ background:#0c4a6e; color:#bae6fd; }
.cb-ts{ font-family:ui-monospace,Menlo,monospace; opacity:.65; } .cb-msg{ white-space:pre-wrap; }
`;

  function injectStyle(){
    if (document.getElementById('cb-inspector-style')) return;
    var st=document.createElement('style');
    st.id='cb-inspector-style';
    st.textContent=CSS;
    document.head.appendChild(st);
  }

  // ---------- Aufbau (gehärtet) ---------------------------------------------
  function build(){
    injectStyle();
    if (document.getElementById('cb-inspector-ov')) return true;

    ov=document.createElement('div');
    ov.id='cb-inspector-ov';
    ov.addEventListener('click', function(ev){ if (ev.target===ov) toggle(false); });

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
      b.addEventListener('click', function(){ active=t.id; refreshTabs(); render(); });
      tabsBar.appendChild(b);
    });

    var content=document.createElement('div'); content.className='content';
    body=content;

    head.appendChild(title); head.appendChild(btnClose); head.appendChild(tabsBar);
    panel.appendChild(head); panel.appendChild(content);
    ov.appendChild(panel);
    document.body.appendChild(ov);

    L_ok('geladen ('+VER+')');
    return true;
  }

  function refreshTabs(){
    var bs=tabsBar.querySelectorAll('button');
    for (var i=0;i<bs.length;i++){ bs[i].classList.toggle('active', bs[i].dataset.tab===active); }
  }

  // ---------- LOGS (funktional) ---------------------------------------------
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
    var actions=document.createElement('div'); actions.className='cb-row cb-group';
    var btnCopy = mkBtn('Kopieren','cb-btn');
    var btnExport = mkBtn('Exportieren','cb-btn');
    var btnRefresh = mkBtn('Aktualisieren','cb-btn');
    var stat=document.createElement('div'); stat.className='cb-note'; stat.style.marginLeft='auto';
    actions.appendChild(btnCopy); actions.appendChild(btnExport); actions.appendChild(btnRefresh); actions.appendChild(stat);
    var list=document.createElement('div'); list.className='cb-loglist';

    function apply(){
      var hist=getHistory()||[]; list.innerHTML=''; var count=0;
      hist.forEach(function(h){
        count++;
        var row=document.createElement('div'); row.className='cb-logitem';
        var ts=document.createElement('span'); ts.className='cb-ts';
        var time = h.ts ? new Date(h.ts) : new Date(); ts.textContent = time.toLocaleTimeString();
        var badge=document.createElement('span'); badge.innerHTML = badgeFor(h.level);
        var msg=document.createElement('div'); msg.className='cb-msg'; msg.textContent=String(h.msg||'');
        row.appendChild(badge); row.appendChild(ts); row.appendChild(msg);
        list.appendChild(row);
      });
      stat.textContent='Einträge: '+count;
    }
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
        var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download='logs.json'; a.click();
        setTimeout(()=>URL.revokeObjectURL(url), 1500); L_ok('Logs exportiert');
      }catch(e){ L_warn('Export fehlgeschlagen: '+(e&&e.message)); }
    });
    window.addEventListener('cb:log-refresh', function(){ if (active==='logs') apply(); });
    apply();
    wrap.appendChild(actions); wrap.appendChild(list);
    return wrap;
  }

  // ---------- TESTS (Placeholder) -------------------------------------------
  function renderTests(){
    var box=document.createElement('div'); box.className='cb-group';
    box.innerHTML='<div class="cb-note">Tests-Tab wird aufgebaut …</div>';
    return box;
  }

  // ---------- RESSOURCEN (Placeholder) --------------------------------------
  function renderResources(){
    var box=document.createElement('div'); box.className='cb-group';
    box.innerHTML='<div class="cb-note">Ressourcen-Tab (Lesen/Setzen) folgt …</div>';
    return box;
  }

  // ---------- PFADE (JETZT FUNKTIONAL) --------------------------------------
  function mkCheck(label, checked){
    var el=document.createElement('label'); el.className='cb-switch';
    var inp=document.createElement('input'); inp.type='checkbox'; inp.checked=!!checked;
    var span=document.createElement('span'); span.textContent=label;
    el.appendChild(inp); el.appendChild(span);
    return { el:el, input:inp };
  }
  function setFlag(name, on){
    try{ window[name]=!!on; }catch(_){}
    try{ if (window.Game && typeof Game.setDebugFlag==='function') Game.setDebugFlag(name, !!on); }catch(_){}
  }
  function send(evt, detail){
    try{ window.dispatchEvent(new CustomEvent(evt, {detail:detail||{}})); }catch(_){}
  }

  function renderPaths(){
    var wrap=document.createElement('div'); wrap.className='cb-col';

    // Toggles (Flags + Events)
    var gTog=document.createElement('div'); gTog.className='cb-grid cb-grid-2 cb-group';
    var sOverlay = mkCheck('Pfad-Overlay', !!window.DEBUG_PATH_OVERLAY);
    var sHeat    = mkCheck('Heatmap',      !!window.DEBUG_HEATMAP);
    var sColl    = mkCheck('Kollision',    !!window.DEBUG_COLLISION);
    var sTramp   = mkCheck('Trampelpfade', !!window.DEBUG_TRAMPEL);
    var sDoor    = mkCheck('Türkacheln',   !!window.DEBUG_DOORS);

    [sOverlay,sHeat,sColl,sTramp,sDoor].forEach(function(s){ gTog.appendChild(s.el); });

    sOverlay.input.addEventListener('change', function(){
      var on=!!sOverlay.input.checked; setFlag('DEBUG_PATH_OVERLAY', on); send('cb:toggle-path-overlay', {enabled:on}); send('cb:request-repaint');
      L_ok('Pfad-Overlay '+(on?'AN':'AUS'));
    });
    sHeat.input.addEventListener('change', function(){
      var on=!!sHeat.input.checked; setFlag('DEBUG_HEATMAP', on); send('cb:toggle-heatmap', {enabled:on}); send('cb:request-repaint');
      L_ok('Heatmap '+(on?'AN':'AUS'));
    });
    sColl.input.addEventListener('change', function(){
      var on=!!sColl.input.checked; setFlag('DEBUG_COLLISION', on); send('cb:toggle-collision', {enabled:on}); send('cb:request-repaint');
      L_ok('Kollision '+(on?'AN':'AUS'));
    });
    sTramp.input.addEventListener('change', function(){
      var on=!!sTramp.input.checked; setFlag('DEBUG_TRAMPEL', on); send('cb:toggle-trample', {enabled:on}); send('cb:request-repaint');
      L_ok('Trampelpfade '+(on?'AN':'AUS'));
    });
    sDoor.input.addEventListener('change', function(){
      var on=!!sDoor.input.checked; setFlag('DEBUG_DOORS', on); send('cb:toggle-doors', {enabled:on}); send('cb:request-repaint');
      L_ok('Türkacheln '+(on?'AN':'AUS'));
    });

    // Aktionen: Redraw + Pfadtests
    var gRun=document.createElement('div'); gRun.className='cb-group';
    var r1=document.createElement('div'); r1.className='cb-row';
    var btnRepaint = mkBtn('Redraw', 'cb-btn');
    var inpCount=document.createElement('input'); inpCount.type='number'; inpCount.min='1'; inpCount.value='5';
    inpCount.style.cssText='width:80px;padding:6px 8px;border:1px solid #3a3a3a;border-radius:6px;background:#0f172a;color:#e5e7eb;';
    var btnRand = mkBtn('Zufällige Pfade', 'cb-btn primary');
    var btnSingle = mkBtn('Single-Test', 'cb-btn');

    r1.appendChild(btnRepaint); r1.appendChild(inpCount); r1.appendChild(btnRand); r1.appendChild(btnSingle);
    gRun.appendChild(r1);

    btnRepaint.addEventListener('click', function(){
      send('cb:request-repaint');
      L_ok('Redraw angefordert');
    });
    btnRand.addEventListener('click', function(){
      var n=Math.max(1, parseInt(inpCount.value||'1',10)||1);
      send('cb:path-test', {mode:'random', count:n});
      L_ok('Path-Test random x'+n);
    });
    btnSingle.addEventListener('click', function(){
      send('cb:path-test', {mode:'single'});
      L_ok('Path-Test single');
    });

    // Kennzahlen (werden von Engine/Overlay via Events aktualisiert, falls vorhanden)
    var gInfo=document.createElement('div'); gInfo.className='cb-group';
    var table=document.createElement('table'); table.className='cb-table';
    table.innerHTML = '<tr><th>FPS (PF)</th><td id="pf-fps">–</td></tr>\
<tr><th>Aktive Pfade</th><td id="pf-active">–</td></tr>\
<tr><th>Ø Pfadlänge</th><td id="pf-avglen">–</td></tr>\
<tr><th>Blockierte Pfade</th><td id="pf-blocked">–</td></tr>';
    gInfo.appendChild(table);

    pfUi.fps     = table.querySelector('#pf-fps');
    pfUi.active  = table.querySelector('#pf-active');
    pfUi.avglen  = table.querySelector('#pf-avglen');
    pfUi.blocked = table.querySelector('#pf-blocked');

    wrap.appendChild(gTog);
    wrap.appendChild(gRun);
    wrap.appendChild(gInfo);
    return wrap;
  }

  // Live-Update-Hooks (freiwillig; Engine kann diese Events feuern)
  window.addEventListener('cb:pf-stats', function(ev){
    try{
      var d=ev.detail||{};
      if (pfUi.fps)     pfUi.fps.textContent = (d.fps!=null ? String(d.fps) : '–');
      if (pfUi.active)  pfUi.active.textContent = (d.active!=null ? String(d.active) : '–');
      if (pfUi.avglen)  pfUi.avglen.textContent = (d.avglen!=null ? String(d.avglen) : '–');
      if (pfUi.blocked) pfUi.blocked.textContent = (d.blocked!=null ? String(d.blocked) : '–');
    }catch(_){}
  });

  // ---------- Render-Switch --------------------------------------------------
  function mkBtn(label, cls){ var b=document.createElement('button'); b.className=cls||'cb-btn'; b.textContent=label; return b; }

  function render(){
    try{
      body.innerHTML='';
      var node=null;
      if (active==='logs') node=renderLogs();
      else if (active==='tests') node=renderTests();
      else if (active==='ressourcen') node=renderResources();
      else if (active==='pfade') node=renderPaths();
      body.appendChild(node||document.createTextNode('Kein Inhalt'));
    }catch(e){
      L_err('Render-Fehler: '+(e&&e.message));
      fallbackToggle(true);
    }
  }

  // ---------- Open/Close -----------------------------------------------------
  function setOpen(want){
    try{
      var ok = build();
      if (!ok){ fallbackToggle(want); return; }

      if (want){
        ov.classList.add('open'); requestAnimationFrame(()=>ov.classList.add('show'));
        render();
        try{ window.dispatchEvent(new Event('cb:inspector-open')); }catch(_){}
        isOpen=true; L_ok('geöffnet ('+VER+')');
      } else {
        ov.classList.remove('show'); setTimeout(()=>ov.classList.remove('open'), 140);
        try{ window.dispatchEvent(new Event('cb:inspector-close')); }catch(_){}
        isOpen=false; L_ok('geschlossen');
      }
    }catch(e){
      L_err('Open/Close-Fehler: '+(e&&e.message));
      fallbackToggle(want);
    }
  }
  function toggle(force){
    var want=(typeof force==='boolean')? force : !isOpen;
    setOpen(want);
  }

  // ---------- Hotkey & API ---------------------------------------------------
  try{
    window.addEventListener('keydown', function(ev){ if (ev.key==='Escape' && isOpen) toggle(false); });
  }catch(_){}
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = toggle;           // <- WICHTIG
  window.__InspectorFallbackToggle = fallbackToggle; // optionaler direkter Fallback

  // ---------- Init -----------------------------------------------------------
  function safeInit(){ try{ build(); L_ok('bereit ('+VER+')'); } catch(e){ L_err('Init-Fehler: '+(e&&e.message)); fallbackToggle(true); } }
  if (document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', safeInit, {once:true}); }
  else { safeInit(); }

})();
