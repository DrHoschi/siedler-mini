/* ============================================================================
 * assets/inspector/inspector.js — v18.2.0
 * Projekt: Siedler-Mini
 * Stil:    Kombi-Inspector (Core + Tabs) im dunklen Grau-Schema
 *
 * Features:
 *   • Tabs: Übersicht | Logs | Build | Pfade | Tests
 *   • Übersicht: Runtime, FPS, Canvas-Größe, Map-Name
 *   • Logs: CBLog-Ausgabe + Kopieren
 *   • Pfade: Overlay-Toggle, Heatmap-Max, letzte Pfade (Längen)
 *   • Tests: Ressourcen-Adder (Type + Amount)
 *
 * Events (lesen/senden):
 *   • window.dispatchEvent('cb:inspector-open' | 'cb:inspector-close')
 *   • window.dispatchEvent('cb:toggle-path-overlay', {detail:{enabled}})
 *   • window.dispatchEvent('cb:add-resources', {detail:{type,amount}})
 *
 * Optionale PF-API (empfohlen):
 *   PathFinder.peekStats() → {
 *     heatMax: number,
 *     lastPaths: [ { len:number, from:{x,y}, to:{x,y} } , ... ]   // max ~6
 *   }
 *
 * Hardening:
 *   • Keine Abhängigkeit auf Game/CBLog/PathFinder – alles mit Fallbacks
 *   • Z-Index sehr hoch, Buttons haben pointer-events
 * ========================================================================== */
(function(){
  'use strict';

  // -------- Logging (sanft) --------------------------------------------------
  var log = function(lvl,msg){
    try{
      if (window.CBLog) {
        if (lvl==='ok')   return CBLog.ok('[inspector.core] '+msg);
        if (lvl==='warn') return CBLog.warn('[inspector.core] '+msg);
        if (lvl==='err')  return CBLog.err('[inspector.core] '+msg);
        return CBLog.push(lvl||'info','[inspector.core] '+msg);
      }
    }catch(_){}
    // Fallback
    var c = (lvl==='err'?'error':lvl==='warn'?'warn':'log');
    (console[c]||console.log)('[inspector.core]', msg);
  };

  // -------- DOM helpers ------------------------------------------------------
  function $(sel,root){ return (root||document).querySelector(sel); }
  function el(tag,cls,txt){
    var n=document.createElement(tag);
    if (cls) n.className=cls;
    if (txt!=null) n.textContent=txt;
    return n;
  }

  // -------- Styles (inline, kleines Bundle) ----------------------------------
  var STYLE_ID='inspector-style-18x';
  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    var css = `
#inspector{position:fixed;right:16px;bottom:96px;width:min(720px,92vw);max-height:72vh;overflow:hidden;
  background:rgba(18,18,18,.96);border:1px solid rgba(255,255,255,.09);border-radius:14px;
  box-shadow:0 18px 60px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.04); color:#e8e8e8;
  z-index:2147483600; display:none; backdrop-filter:blur(8px);}
#inspector.open{display:block;}
#inspector .head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);}
#inspector .title{font-weight:800;letter-spacing:.2px;font-size:18px;color:#f3f3f3}
#inspector .spacer{flex:1}
#inspector .close{border:none;border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.10);color:#fff;cursor:pointer}
#inspector .tabs{display:flex;gap:8px;flex-wrap:wrap;padding:10px 14px 6px;border-bottom:1px solid rgba(255,255,255,.06)}
#inspector .tab{border:none;border-radius:999px;padding:6px 12px;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;font-size:13px}
#inspector .tab.active{background:rgba(120,160,255,.28);outline:1px solid rgba(120,160,255,.45)}
#inspector .body{padding:12px 14px 14px;overflow:auto;max-height:calc(72vh - 112px)}
#inspector .row{display:flex;align-items:center;gap:10px;margin:8px 0}
#inspector .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
#inspector .card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px}
#inspector .kvs{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font-size:13px}
#inspector .muted{opacity:.7}
#inspector .mono{font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace}
#inspector .btn{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:#fff;border-radius:8px;padding:6px 10px;cursor:pointer}
#inspector .btn:disabled{opacity:.5;cursor:not-allowed}
#inspector .list{margin:0;padding:0;list-style:none}
#inspector .list li{padding:6px 8px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(255,255,255,.04);margin:6px 0}
#inspector textarea.log{width:100%;height:240px;background:#0c0c0c;color:#d6d6d6;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px;resize:vertical}
.switch{display:inline-flex;align-items:center;gap:8px}
.switch input{width:18px;height:18px}
.small{font-size:12px}
    `.trim();
    var s=el('style'); s.id=STYLE_ID; s.textContent=css; document.head.appendChild(s);
  }

  // -------- State ------------------------------------------------------------
  var root=null, bodyEl=null, tabsBar=null, logArea=null;
  var fps=0, lastFrame=performance.now(), frameCount=0;
  var fpsTimer=0, statsTimer=0;
  var startTs = Date.now();
  var activeTab = 'overview';

  // FPS Meter (leicht & unabhängig)
  (function fpsLoop(){
    requestAnimationFrame(function tick(ts){
      frameCount++;
      var dt = ts - lastFrame;
      if (dt >= 250){ // smoother
        fps = Math.round(1000 * frameCount / dt);
        frameCount=0; lastFrame=ts;
      }
      requestAnimationFrame(tick);
    });
  })();

  // -------- Helpers: Datenquellen -------------------------------------------
  function getCanvas(){
    return document.getElementById('game') || document.querySelector('canvas');
  }
  function getCanvasSize(){
    var c=getCanvas(); if(!c) return {w:0,h:0};
    return { w: c.width|0, h: c.height|0 };
  }
  function getMapName(){
    try{
      var c=getCanvas(); if (!c) return '-';
      var url = c.dataset.map || '';
      if(!url) return '-';
      var i = url.lastIndexOf('/'); var s = (i>=0) ? url.slice(i+1) : url;
      return s || '-';
    }catch(_){ return '-'; }
  }
  function getPFStats(){
    try{
      if (window.PathFinder && typeof PathFinder.peekStats==='function'){
        return PathFinder.peekStats() || null;
      }
    }catch(_){}
    return null; // sauberer Fallback
  }

  // -------- Tabs Rendering ---------------------------------------------------
  function setActive(tab){
    activeTab=tab;
    Array.from(tabsBar.children).forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
    renderBody();
  }

  function renderBody(){
    bodyEl.innerHTML='';
    if (activeTab==='overview') return renderOverview();
    if (activeTab==='logs')     return renderLogs();
    if (activeTab==='build')    return renderBuild();
    if (activeTab==='paths')    return renderPaths();
    if (activeTab==='tests')    return renderTests();
  }

  // -- Übersicht --------------------------------------------------------------
  function renderOverview(){
    var wrap = el('div','grid');

    var card1 = el('div','card');
    var kv1 = el('div','kvs');
    kv1.innerHTML = `
      <div>Runtime</div><div class="mono" id="ov-run">–</div>
      <div>FPS</div><div class="mono" id="ov-fps">–</div>
      <div>Canvas</div><div class="mono" id="ov-canvas">–</div>
      <div>Map</div><div class="mono" id="ov-map">–</div>
    `;
    card1.appendChild(kv1);

    var card2 = el('div','card');
    var kv2 = el('div','kvs small muted');
    kv2.innerHTML = `
      <div>Engine</div><div class="mono">${(window.__cb&&(__cb.engineVersion||__cb.indexVersion))||'–'}</div>
      <div>Inspector</div><div class="mono">v18.2.0</div>
    `;
    card2.appendChild(kv2);

    wrap.appendChild(card1);
    wrap.appendChild(card2);
    bodyEl.appendChild(wrap);

    // Live-Update
    function up(){
      var s = ((Date.now()-startTs)/1000)|0;
      $('#ov-run',bodyEl).textContent = s+'s';
      $('#ov-fps',bodyEl).textContent = fps.toString();
      var cs=getCanvasSize(); $('#ov-canvas',bodyEl).textContent = cs.w+'×'+cs.h;
      $('#ov-map',bodyEl).textContent = getMapName();
    }
    up();
    if (fpsTimer) clearInterval(fpsTimer);
    fpsTimer = setInterval(up, 500);
  }

  // -- Logs -------------------------------------------------------------------
  function safeDumpLogs(){
    try{
      if (window.CBLog && typeof CBLog.dump==='function'){
        return CBLog.dump();
      }
      if (window.CBLog && typeof CBLog.lines==='function'){
        return (CBLog.lines()||[]).join('\n');
      }
    }catch(_){}
    return '[CBLog nicht verfügbar]';
  }
  function renderLogs(){
    var box = el('div','card');
    logArea = el('textarea','log mono'); logArea.readOnly = true;
    var row=el('div','row');
    var btnCopy=el('button','btn','Kopieren');
    btnCopy.onclick = function(){
      try{ navigator.clipboard.writeText(logArea.value); log('ok','Logs kopiert'); }catch(_){}
    };
    row.appendChild(btnCopy);

    box.appendChild(logArea);
    box.appendChild(row);
    bodyEl.appendChild(box);

    function refreshLogs(){
      logArea.value = safeDumpLogs();
    }
    refreshLogs();
    // kleine Auto-Refresh-Schleife, wenn Tab aktiv bleibt
    if (statsTimer) clearInterval(statsTimer);
    statsTimer = setInterval(function(){
      if (activeTab==='logs') refreshLogs();
    }, 1000);

    // Extern nutzbar:
    window.dispatchEvent(new CustomEvent('cb:inspector-logs-ready',{detail:{refresh:refreshLogs}}));
  }

  // -- Build (Platzhalter) ----------------------------------------------------
  function renderBuild(){
    var card=el('div','card');
    card.innerHTML = `
      <div class="muted small">Build-Tab — hier können später Bauregeln, Kosten
      oder Schnellzugriffe erscheinen.</div>
    `;
    bodyEl.appendChild(card);
  }

  // -- Pfade ------------------------------------------------------------------
  function renderPaths(){
    var stats = getPFStats();

    var head = el('div','row');
    var sw = el('label','switch');
    var chk = el('input'); chk.type='checkbox'; chk.checked=!!window.DEBUG_PATH_OVERLAY;
    var lbl = el('span',null,'Pfad-Overlay anzeigen');
    sw.appendChild(chk); sw.appendChild(lbl);
    chk.onchange = function(){
      var en = !!chk.checked; window.DEBUG_PATH_OVERLAY = en;
      window.dispatchEvent(new CustomEvent('cb:toggle-path-overlay',{detail:{enabled:en}}));
      try{ window.requestAnimationFrame?.(()=>window.dispatchEvent(new Event('cb:request-repaint')));}catch(_){}
    };
    head.appendChild(sw);

    var grid = el('div','grid');
    var card1 = el('div','card');
    var kv = el('div','kvs');
    kv.innerHTML = `
      <div>Heatmap-Max</div><div class="mono" id="pf-heat">–</div>
      <div>Letzte Pfade</div><div class="mono" id="pf-count">–</div>
    `;
    card1.appendChild(kv);

    var card2 = el('div','card');
    var ul = el('ul','list mono'); ul.id='pf-list';
    card2.appendChild(ul);

    bodyEl.appendChild(head);
    grid.appendChild(card1);
    grid.appendChild(card2);
    bodyEl.appendChild(grid);

    function update(){
      var s = getPFStats();
      var heat = s && typeof s.heatMax==='number' ? s.heatMax : 0;
      var paths = (s && Array.isArray(s.lastPaths)) ? s.lastPaths : [];
      $('#pf-heat',bodyEl).textContent = heat.toString();
      $('#pf-count',bodyEl).textContent = paths.length.toString();

      ul.innerHTML='';
      if (!paths.length){
        var li=el('li',null,'keine Pfade aufgezeichnet');
        ul.appendChild(li);
      } else {
        paths.forEach(function(p,i){
          var txt = '#'+(i+1)+'  len='+ (p.len!=null?p.len:'?') +
                    '  '+ (p.from?('('+(p.from.x|0)+','+(p.from.y|0)+')'):'') +
                    ' → ' + (p.to?('('+(p.to.x|0)+','+(p.to.y|0)+')'):'');
          ul.appendChild(el('li',null,txt));
        });
      }
    }
    update();
    if (statsTimer) clearInterval(statsTimer);
    statsTimer = setInterval(function(){ if (activeTab==='paths') update(); }, 800);
  }

  // -- Tests ------------------------------------------------------------------
  function renderTests(){
    var card = el('div','card');
    var row1 = el('div','row');
    var iType = el('input'); iType.type='text'; iType.placeholder='Typ (wood, stone, …)'; iType.value='wood';
    var iAmt  = el('input'); iAmt.type='number'; iAmt.min='1'; iAmt.value='10'; iAmt.style.width='96px';
    var btn   = el('button','btn','Ressourcen hinzufügen');
    btn.onclick = function(){
      var type = String(iType.value||'').trim();
      var amount = Math.max(1, parseInt(iAmt.value||'0',10)||0);
      if (!type) return;
      window.dispatchEvent(new CustomEvent('cb:add-resources',{detail:{type,amount}}));
      try{
        if (window.Game && typeof Game.addResources==='function'){
          Game.addResources(type,amount);
        }
      }catch(_){}
      log('ok','add-res: +'+amount+' '+type);
    };
    row1.appendChild(iType); row1.appendChild(iAmt); row1.appendChild(btn);
    card.appendChild(row1);
    bodyEl.appendChild(card);
  }

  // -------- Root bauen -------------------------------------------------------
  function build(){
    injectStyles();
    if (root) return;

    root = el('div'); root.id='inspector';
    var head = el('div','head');
    head.appendChild(el('div','title','Inspector'));
    head.appendChild(el('div','spacer'));
    var btnClose = el('button','close','Schließen');
    btnClose.onclick = toggle;
    head.appendChild(btnClose);

    tabsBar = el('div','tabs');
    [['overview','Übersicht'],['logs','Logs'],['build','Build'],['paths','Pfade'],['tests','Tests']]
      .forEach(function(t){
        var b=el('button','tab',t[1]); b.dataset.tab=t[0];
        b.onclick=function(){ setActive(t[0]); };
        tabsBar.appendChild(b);
      });

    bodyEl = el('div','body');

    root.appendChild(head);
    root.appendChild(tabsBar);
    root.appendChild(bodyEl);
    document.body.appendChild(root);

    setActive(activeTab);
    log('ok','bereit (v18.2.0)');
  }

  // -------- Toggle & Bridge --------------------------------------------------
  function open(){ build(); root.classList.add('open'); window.dispatchEvent(new Event('cb:inspector-open')); }
  function close(){ if(!root) return; root.classList.remove('open'); window.dispatchEvent(new Event('cb:inspector-close')); }
  function toggle(){ (root && root.classList.contains('open')) ? close() : open(); }

  // öffentliche Bridge für die FABs/UX
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = toggle;
  window.GameUI.openInspector   = open;
  window.GameUI.closeInspector  = close;

  // Failsafe: Tastatur (Backtick) & Autoload klein verzögert
  window.addEventListener('keydown', function(ev){
    if (ev.key==='`'){ ev.preventDefault(); toggle(); }
  }, {passive:false});

  // Erzeuge Root lazy beim ersten Bedarf
  setTimeout(build, 100);

})();
