/* ============================================================================
 * Datei: assets/inspector/inspector.js
 * Projekt: Siedler-Mini
 * Version: v18.3.0
 *
 * Ziele / Style
 *  - Immer über FABs (z-max), nicht blockierend
 *  - Design laut Vorgaben: dunkles Panel, klare Akzentfarbe, runde Tabs,
 *    Cards mit dünnen Borders, kompakte Typo, dezente Scrollbars
 *
 * Tabs:
 *  - Logs (funktional)
 *  - Tests (Platzhalter)
 *  - Ressourcen (Platzhalter)
 *  - Pfade (Toggles + Redraw + Random-Tests + Kennzahlen)
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
  var VER='v18.3.0';

  // ---------------- logger ---------------------------------------------------
  function L_ok(m){ try{ (window.CBLog?.ok||console.log)(MOD+' '+m);}catch(_){console.log(MOD+' '+m);} }
  function L_warn(m){ try{ (window.CBLog?.warn||console.warn)(MOD+' '+m);}catch(_){console.warn(MOD+' '+m);} }
  function L_err(m){ try{ (window.CBLog?.err||console.error)(MOD+' '+m);}catch(_){console.error(MOD+' '+m);} }

  // ---------------- fallback panel ------------------------------------------
  function fallbackToggle(force){
    var id='inspector-fallback';
    var el=document.getElementById(id);
    var want=(typeof force==='boolean')? force : !el || el.style.display==='none';
    if (!el){
      el=document.createElement('div');
      el.id=id;
      el.style.cssText='position:fixed;right:12px;bottom:96px;width:420px;max-width:92vw;max-height:70vh;overflow:auto;background:#0f1418;border:1px solid #2a323a;border-radius:10px;color:#e6edf3;padding:10px;display:block;z-index:2147483646;';
      el.innerHTML='<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;font-weight:800;">Inspector (Fallback) <span style="margin-left:auto;opacity:.6;font-size:12px;">'+VER+'</span><button id="inspector-fallback-close" style="border:1px solid #344150;background:#0f172a;color:#e2e8f0;border-radius:8px;padding:6px 10px;cursor:pointer;">Schließen</button></div><div class="cb-note">Kern-UI konnte nicht initialisiert werden.</div>';
      document.body.appendChild(el);
      el.querySelector('#inspector-fallback-close').onclick=function(){ el.style.display='none'; };
    }
    el.style.display = want ? 'block' : 'none';
  }

  // ---------------- lokale Log-History --------------------------------------
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
  try{
    if (window.CBLog && typeof window.CBLog.push==='function'){
      var __orig = window.CBLog.push.bind(window.CBLog);
      window.CBLog.push = function(level, msg){ try{ LocalLog.push(level,msg); }catch(_){ } return __orig(level,msg); };
    }
  }catch(_){}

  // ---------------- dom/state ------------------------------------------------
  var ov=null, panel=null, tabsBar=null, body=null, isOpen=false, active='logs';
  var pfUi={fps:null,active:null,avglen:null,blocked:null};

  // ---------------- styles (Design-Vorgaben) --------------------------------
  var CSS = `
:root{
  --ins-bg:#0c1116;           /* Page dunkler Hintergrund (sichtbar unter Overlay) */
  --ins-panel:#10151b;        /* Panel-Hintergrund */
  --ins-header:#0b1016;       /* Header-Hintergrund */
  --ins-border:#2a323a;       /* Kanten */
  --ins-muted:#85909c;        /* sekundärer Text */
  --ins-text:#e6edf3;         /* Primärtext */
  --ins-accent:#5bb0ff;       /* Akzent (Tabs/Buttons aktiv) */
  --ins-accent-2:#1e90ff;     /* Akzent kräftig */
  --ins-ok:#1d8649; --ins-warn:#9a5b1d; --ins-err:#a94442; --ins-info:#1f4b7a;
}
#cb-inspector-ov{
  position:fixed; inset:0; z-index:2147483646; background:rgba(2,6,10,.35); backdrop-filter:blur(2px);
  display:none; opacity:0; transition:opacity .15s;
}
#cb-inspector-ov.open{ display:block; } #cb-inspector-ov.show{ opacity:1; }
#cb-inspector{
  position:fixed; right:12px; bottom:96px; width:min(560px,96vw); max-height:74vh; overflow:auto;
  background:var(--ins-panel); color:var(--ins-text); border:1px solid var(--ins-border); border-radius:12px;
  box-shadow:0 18px 48px rgba(0,0,0,.55); font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}
#cb-inspector header{
  position:sticky; top:0; z-index:2; padding:10px 12px 8px; border-bottom:1px solid var(--ins-border);
  background:linear-gradient(0deg, var(--ins-panel), var(--ins-header));
}
#cb-inspector .title{ display:flex; align-items:center; gap:10px; margin-bottom:8px; font-weight:800; letter-spacing:.2px; }
#cb-inspector .title .ver{ margin-left:auto; font-size:12px; color:var(--ins-muted); }
#cb-inspector .close{
  border:1px solid var(--ins-border); background:#0f172a; color:#e2e8f0; border-radius:10px;
  padding:6px 12px; cursor:pointer;
}
#cb-inspector .tabs{ display:flex; gap:6px; flex-wrap:wrap; }
#cb-inspector .tabs button{
  border:1px solid var(--ins-border); border-radius:999px; padding:6px 12px; cursor:pointer;
  background:#0f172a; color:#cbd5e1; font-weight:700; letter-spacing:.2px;
}
#cb-inspector .tabs button.active{ background:var(--ins-accent); color:#08121b; border-color:var(--ins-accent); }
#cb-inspector .content{ padding:12px; }

.cb-note{ font-size:12px; color:var(--ins-muted); }
.cb-row{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.cb-col{ display:flex; flex-direction:column; gap:10px; }
.cb-grid{ display:grid; gap:10px; }
.cb-grid-2{ grid-template-columns:1fr 1fr; }
.cb-grid-3{ grid-template-columns:repeat(3, 1fr); }
.cb-group{
  border:1px solid var(--ins-border); border-radius:12px; padding:10px; background:#0f1419;
}
.cb-btn{
  border:1px solid var(--ins-border); border-radius:10px; padding:6px 12px; cursor:pointer; background:#162131; color:#e5e7eb;
}
.cb-btn.primary{ background:var(--ins-accent-2); border-color:var(--ins-accent-2); color:#fff; }
.cb-btn.warn{ background:#8a4b2a; border-color:#8a4b2a; color:#fff; }

.cb-switch{ display:flex; align-items:center; gap:8px; }
.cb-switch input[type="checkbox"]{ width:18px; height:18px; }
.cb-switch .hint{ font-size:12px; color:var(--ins-muted); margin-left:6px; }

.cb-table{ width:100%; border-collapse:collapse; font-size:13px; }
.cb-table th, .cb-table td{ border-bottom:1px solid var(--ins-border); padding:6px 8px; }
.cb-table th{ text-align:left; color:var(--ins-muted); font-weight:600; }

.cb-loglist{
  max-height:46vh; overflow:auto; border:1px solid var(--ins-border); border-radius:10px; background:#0e1317;
}
.cb-logitem{ display:flex; gap:8px; padding:7px 10px; border-bottom:1px solid #11161b; align-items:flex-start; }
.cb-logitem:last-child{ border-bottom:none; }
.cb-badge{ display:inline-block; min-width:2em; text-align:center; border-radius:999px; font-size:11px; padding:2px 8px; }
.cb-badge.ok{ background:#0f3320; color:#b2f2c8; } .cb-badge.warn{ background:#3b2410; color:#ffde9a; }
.cb-badge.err{ background:#3a1616; color:#ffc2c2; } .cb-badge.info{ background:#0b2a44; color:#bfe4ff; }
.cb-ts{ font-family:ui-monospace,Menlo,monospace; color:#9aa6b2; }
.cb-msg{ white-space:pre-wrap; }

@media (max-width:480px){
  #cb-inspector{ right:8px; bottom:88px; width:min(96vw, 560px); }
  .cb-grid-2{ grid-template-columns:1fr; }
  .cb-grid-3{ grid-template-columns:1fr 1fr; }
}

/* Scrollbar dezent */
#cb-inspector ::-webkit-scrollbar{ width:10px; height:10px; }
#cb-inspector ::-webkit-scrollbar-thumb{ background:#28313a; border-radius:6px; }
#cb-inspector ::-webkit-scrollbar-track{ background:#0d1216; }
`;

  function injectStyle(){
    if (document.getElementById('cb-inspector-style')) return;
    var st=document.createElement('style'); st.id='cb-inspector-style'; st.textContent=CSS;
    document.head.appendChild(st);
  }

  // ---------------- build ui -------------------------------------------------
  var ov, panel, tabsBar, body;
  function build(){
    injectStyle();
    if (document.getElementById('cb-inspector-ov')) return true;

    ov=document.createElement('div'); ov.id='cb-inspector-ov';
    ov.addEventListener('click', function(ev){ if (ev.target===ov) toggle(false); });

    panel=document.createElement('div'); panel.id='cb-inspector';
    panel.setAttribute('role','dialog'); panel.setAttribute('aria-label','Inspector');

    var head=document.createElement('header');
    head.innerHTML='';
    var title=document.createElement('div'); title.className='title';
    title.innerHTML='<span>Inspector</span><span class="ver">'+VER+'</span>';
    var btnClose=document.createElement('button'); btnClose.className='close'; btnClose.textContent='Schließen';
    btnClose.addEventListener('click', ()=>toggle(false));
    head.appendChild(title); head.appendChild(btnClose);

    tabsBar=document.createElement('div'); tabsBar.className='tabs';
    [
      {id:'logs',label:'Logs'},
      {id:'tests',label:'Tests'},
      {id:'ress',label:'Ressourcen'},
      {id:'pfade',label:'Pfade'}
    ].forEach(function(t){
      var b=document.createElement('button'); b.textContent=t.label; b.dataset.tab=t.id;
      if (t.id===active) b.classList.add('active');
      b.addEventListener('click', function(){ active=t.id; refreshTabs(); render(); });
      tabsBar.appendChild(b);
    });
    head.appendChild(tabsBar);

    body=document.createElement('div'); body.className='content';
    panel.appendChild(head); panel.appendChild(body); ov.appendChild(panel);
    document.body.appendChild(ov);

    L_ok('geladen ('+VER+')');
    return true;
  }

  function refreshTabs(){
    var bs=tabsBar.querySelectorAll('button');
    for (var i=0;i<bs.length;i++){ bs[i].classList.toggle('active', bs[i].dataset.tab===active); }
  }

  // ---------------- logs -----------------------------------------------------
  function getHistory(){
    try{ if (window.CBLog && Array.isArray(window.CBLog._history)) return window.CBLog._history; }catch(_){}
    return LocalLog.list;
  }
  function badge(level){
    var lv=String(level||'info').toLowerCase();
    if (lv==='ok'||lv==='success') return '<span class="cb-badge ok">OK</span>';
    if (lv==='warn') return '<span class="cb-badge warn">WARN</span>';
    if (lv==='err'||lv==='error') return '<span class="cb-badge err">ERR</span>';
    return '<span class="cb-badge info">INFO</span>';
  }
  function renderLogs(){
    var wrap=document.createElement('div'); wrap.className='cb-col';

    var actions=document.createElement('div'); actions.className='cb-row cb-group';
    var btnCopy = mkBtn('Kopieren','cb-btn'); var btnExport=mkBtn('Exportieren','cb-btn'); var btnRefresh=mkBtn('Aktualisieren','cb-btn');
    var stat=document.createElement('div'); stat.className='cb-note'; stat.style.marginLeft='auto';
    actions.appendChild(btnCopy); actions.appendChild(btnExport); actions.appendChild(btnRefresh); actions.appendChild(stat);

    var list=document.createElement('div'); list.className='cb-loglist';

    function apply(){
      var hist=getHistory()||[]; list.innerHTML=''; var count=0;
      hist.forEach(function(h){
        count++;
        var row=document.createElement('div'); row.className='cb-logitem';
        var ts=document.createElement('span'); ts.className='cb-ts';
        ts.textContent = (h.ts? new Date(h.ts).toLocaleTimeString() : '--:--:--');
        var badgeHtml=document.createElement('span'); badgeHtml.innerHTML = badge(h.level);
        var msg=document.createElement('div'); msg.className='cb-msg'; msg.textContent=String(h.msg||'');
        row.appendChild(badgeHtml); row.appendChild(ts); row.appendChild(msg); list.appendChild(row);
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
        setTimeout(()=>URL.revokeObjectURL(url), 1200); L_ok('Logs exportiert');
      }catch(e){ L_warn('Export fehlgeschlagen: '+(e&&e.message)); }
    });
    window.addEventListener('cb:log-refresh', function(){ if (active==='logs') apply(); });
    apply();
    wrap.appendChild(actions); wrap.appendChild(list);
    return wrap;
  }

  // ---------------- tests (placeholder) -------------------------------------
  function renderTests(){
    var box=document.createElement('div'); box.className='cb-group';
    box.innerHTML='<div class="cb-note">Tests-Tab – Inhalte folgen nach Bedarf.</div>';
    return box;
  }

  // ---------------- ressourcen (placeholder) --------------------------------
  function renderRess(){
    var box=document.createElement('div'); box.className='cb-group';
    box.innerHTML='<div class="cb-note">Ressourcen-Tab – Inhalte folgen (Lesen/Setzen, Events, etc.).</div>';
    return box;
  }

  // ---------------- pfade (funktional) --------------------------------------
  function mkCheck(label, checked, hint){
    var el=document.createElement('label'); el.className='cb-switch';
    var inp=document.createElement('input'); inp.type='checkbox'; inp.checked=!!checked;
    var span=document.createElement('span'); span.textContent=label;
    el.appendChild(inp); el.appendChild(span);
    if (hint){ var h=document.createElement('span'); h.className='hint'; h.textContent=hint; el.appendChild(h); }
    return { el:el, input:inp };
  }
  function setFlag(name, on){
    try{ window[name]=!!on; }catch(_){}
    try{ if (window.Game && typeof Game.setDebugFlag==='function') Game.setDebugFlag(name, !!on); }catch(_){}
  }
  function send(evt, detail){ try{ window.dispatchEvent(new CustomEvent(evt, {detail:detail||{}})); }catch(_){ } }

  function renderPaths(){
    var wrap=document.createElement('div'); wrap.className='cb-col';

    var togg=document.createElement('div'); togg.className='cb-grid cb-grid-2 cb-group';
    var sOverlay=mkCheck('Pfad-Overlay', !!window.DEBUG_PATH_OVERLAY, 'Heatmap & Pfadlinien');
    var sHeat   =mkCheck('Heatmap',      !!window.DEBUG_HEATMAP);
    var sColl   =mkCheck('Kollision',    !!window.DEBUG_COLLISION);
    var sTramp  =mkCheck('Trampelpfade', !!window.DEBUG
