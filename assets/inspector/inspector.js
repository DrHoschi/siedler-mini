/* ============================================================================
 * inspector.js — Kombi-Core + Tabs (robust, Live-Logs)
 * Version: v17.4.8
 * Projekt: Neue Siedler
 *
 * Garantien
 *  - Funktioniert auf Startseite und im Spiel (selbsttragend)
 *  - Eigene Toggle-API: GameUI.toggleInspector(force?)
 *  - Backdrop blockiert nur im offenen Zustand; sonst nie
 *  - Höchster z-index; FAB-Buttons bleiben klickbar (Härtung)
 *  - Logs-Tab: Live-Updates via 'cb:log-updated' + CBLog.dump()
 *  - Tests-Tab: Pfad-Overlay-Toggle + Ressourcen-Adder
 *
 * Events (dispatch)
 *  - cb:inspector-open / cb:inspector-close / cb:inspector-toggle {open}
 *  - cb:toggle-path-overlay {enabled}
 *  - cb:add-resources {type, amount}
 * ========================================================================== */
(function(){
  'use strict';

  var VER = 'v17.4.8';
  var MOD = '[inspector.core]';

  // --- Logging ---------------------------------------------------------------
  function ok(m){ try{ (window.CBLog?.ok||console.log)(m); }catch(_){ console.log(m); } }
  function warn(m){ try{ (window.CBLog?.warn||console.warn)(m); }catch(_){ console.warn(m); } }
  function err(m){ try{ (window.CBLog?.err||console.error)(m); }catch(_){ console.error(m); } }

  // --- Helpers ---------------------------------------------------------------
  function byId(id){ return document.getElementById(id); }
  function on(el,ev,fn,opt){ if(el) try{ el.addEventListener(ev,fn,opt||false);}catch(_){ } }
  function cls(el, o){ Object.assign(el.style,o); }
  function hardenFABs(){
    try{
      var css='z-index:2147483647 !important; pointer-events:auto !important;';
      var b1=byId('btn-build'), b2=byId('btn-inspector');
      if (b1) b1.style.cssText=(b1.getAttribute('style')||'')+';'+css;
      if (b2) b2.style.cssText=(b2.getAttribute('style')||'')+';'+css;
    }catch(_){}
  }

  // --- State -----------------------------------------------------------------
  var root=null, panel=null, content=null, tabs=null;
  var escBound=false;
  var logBox=null;

  // --- UI-Bau ----------------------------------------------------------------
  function ensureRoot(){
    if (root) return root;

    // Backdrop
    root = document.createElement('div');
    root.id = 'inspector-backdrop';
    cls(root, {
      position:'fixed', inset:'0', zIndex:'2147483600',
      display:'none', opacity:'0', background:'rgba(0,0,0,0.2)',
      transition:'opacity .18s ease',
      pointerEvents:'none' // geschlossen: niemals blockieren
    });

    // Panel
    panel = document.createElement('div');
    panel.id = 'inspector';
    cls(panel, {
      position:'absolute', right:'12px', bottom:'96px',
      width:'min(520px, 94vw)', maxHeight:'66vh', overflow:'auto',
      background:'rgba(20,20,20,.96)', color:'#eaeaea',
      border:'1px solid #2f2f2f', borderRadius:'12px',
      boxShadow:'0 18px 48px rgba(0,0,0,.45)', backdropFilter:'blur(6px)',
      pointerEvents:'auto'
    });

    // Header
    var head=document.createElement('div');
    cls(head,{display:'flex',alignItems:'center',justifyContent:'space-between',
      padding:'12px 14px',borderBottom:'1px solid #2b2b2b',position:'sticky',top:'0',background:'inherit',zIndex:'1'});
    var title=document.createElement('div'); title.textContent='Inspector'; title.style.fontWeight='800';
    var ver=document.createElement('div'); ver.textContent=VER; ver.style.cssText='opacity:.55;font-size:12px;margin-left:auto;margin-right:8px;';
    var close=document.createElement('button'); close.textContent='Schließen';
    cls(close,{background:'transparent',border:'1px solid #3a3a3a',color:'#ddd',borderRadius:'6px',cursor:'pointer',padding:'6px 10px'});
    on(close,'click',function(){ toggle(false); });
    head.appendChild(title); head.appendChild(ver); head.appendChild(close);

    // Tabs
    tabs=document.createElement('div');
    cls(tabs,{display:'flex',gap:'8px',padding:'10px 12px',borderBottom:'1px solid #232323',position:'sticky',top:'48px',background:'inherit',zIndex:'1'});
    function mkTab(id,label){
      var b=document.createElement('button');
      b.textContent=label;
      b.dataset.tab=id;
      cls(b,{padding:'8px 12px',borderRadius:'10px',border:'1px solid #2f2f2f',
        background:'#0f172a',color:'#c7d2fe',cursor:'pointer',fontWeight:'700'});
      on(b,'click',function(){ showTab(id); });
      return b;
    }
    tabs.appendChild(mkTab('info','Übersicht'));
    tabs.appendChild(mkTab('logs','Logs'));
    tabs.appendChild(mkTab('build','Build'));
    tabs.appendChild(mkTab('tests','Tests'));

    // Content
    content=document.createElement('div');
    content.id='inspector-content';
    content.style.cssText='padding:12px; min-height:220px;';

    // Sections
    var secInfo=document.createElement('div'); secInfo.id='tab-info';
    secInfo.innerHTML =
      '<div style="opacity:.8;margin-bottom:8px">Projekt: <b>Neue Siedler</b></div>'+
      '<div>Inspector '+VER+' geladen.</div>';

    var secLogs=document.createElement('div'); secLogs.id='tab-logs';
    logBox=document.createElement('pre');
    logBox.id='inspector-logbox';
    logBox.style.cssText='margin:0;padding:10px;background:#0b0b0b;border:1px solid #2b2b2b;border-radius:8px;min-height:180px;white-space:pre-wrap;';
    secLogs.appendChild(document.createTextNode(''));
    secLogs.appendChild(logBox);
    var copyBtn=document.createElement('button');
    copyBtn.textContent='📋 Kopieren';
    cls(copyBtn,{marginTop:'8px',padding:'8px 10px',borderRadius:'8px',border:'1px solid #2f2f2f',background:'#1f2937',color:'#e2e8f0',cursor:'pointer'});
    on(copyBtn,'click',function(){
      try{ navigator.clipboard.writeText(logBox.textContent||''); ok(MOD+' Logs kopiert'); }catch(e){ warn(MOD+' Copy fehlgeschlagen: '+(e&&e.message)); }
    });
    secLogs.appendChild(copyBtn);

    var secBuild=document.createElement('div'); secBuild.id='tab-build';
    var openBuild=document.createElement('button'); openBuild.textContent='🧱 Bau-Menü öffnen';
    cls(openBuild,{padding:'10px 12px',borderRadius:'10px',border:'1px solid #2f2f2f',background:'#1f2937',color:'#e2e8f0',cursor:'pointer'});
    on(openBuild,'click',function(){ try{ window.GameUI?.toggleBuild(true); }catch(_){ warn(MOD+' toggleBuild nicht verfügbar'); }});
    secBuild.appendChild(openBuild);

    var secTests=document.createElement('div'); secTests.id='tab-tests';
    // Toggle Pfad-Overlay
    var row=document.createElement('div'); cls(row,{display:'flex',alignItems:'center',gap:'8px',margin:'2px 0 10px'});
    var chk=document.createElement('input'); chk.type='checkbox'; chk.id='dbg-path-overlay'; chk.checked=!!window.DEBUG_PATH_OVERLAY;
    var lbl=document.createElement('label'); lbl.htmlFor='dbg-path-overlay'; lbl.textContent='Pfad-Overlay anzeigen';
    on(chk,'change',function(){
      var enabled=!!chk.checked;
      window.DEBUG_PATH_OVERLAY=enabled;
      try{ window.dispatchEvent(new CustomEvent('cb:toggle-path-overlay',{detail:{enabled}})); }catch(_){}
      ok(MOD+' Path-Overlay '+(enabled?'AN':'AUS'));
      try{ window.requestAnimationFrame?.(()=>window.dispatchEvent(new Event('cb:request-repaint')));}catch(_){}
    });
    row.appendChild(chk); row.appendChild(lbl);
    secTests.appendChild(row);

    // Ressourcen-Adder
    var grid=document.createElement('div'); cls(grid,{display:'grid',gridTemplateColumns:'1fr 110px auto',gap:'6px',maxWidth:'420px'});
    var inpType=document.createElement('input'); inpType.type='text'; inpType.placeholder='wood / stone …'; inpType.value='wood';
    var inpAmt=document.createElement('input'); inpAmt.type='number'; inpAmt.min='1'; inpAmt.step='1'; inpAmt.value='10';
    var btnAdd=document.createElement('button'); btnAdd.textContent='Ressourcen hinzufügen';
    cls(btnAdd,{padding:'8px 10px',borderRadius:'8px',border:'1px solid #2f2f2f',background:'#1f2937',color:'#e2e8f0',cursor:'pointer'});
    on(btnAdd,'click',function(){
      var type=(inpType.value||'').trim(); var amount=Math.max(1, parseInt(inpAmt.value||'0',10)||0);
      if(!type){ warn(MOD+' add-res: kein Typ'); return; }
      try{ window.dispatchEvent(new CustomEvent('cb:add-resources',{detail:{type,amount}})); }catch(_){}
      try{
        if (window.Game?.addResources){ Game.addResources(type,amount); ok(MOD+' +'+amount+' '+type); }
        else { warn(MOD+' add-res Event gesendet (Game.addResources nicht gefunden)'); }
      }catch(e){ warn(MOD+' add-res Fehler: '+(e&&e.message)); }
    });
    grid.appendChild(inpType); grid.appendChild(inpAmt); grid.appendChild(btnAdd);
    secTests.appendChild(grid);

    // Content zusammenführen
    content.appendChild(secInfo);
    content.appendChild(secLogs);
    content.appendChild(secBuild);
    content.appendChild(secTests);

    panel.appendChild(head);
    panel.appendChild(tabs);
    panel.appendChild(content);
    root.appendChild(panel);
    document.body.appendChild(root);

    // Backdrop-Klick schließt, wenn neben Panel
    on(root,'mousedown', function(ev){ if(!panel.contains(ev.target)) toggle(false); });

    // ESC
    if (!escBound){
      escBound=true;
      on(window,'keydown', function(ev){ if(ev.key==='Escape') toggle(false); });
    }

    // Live-Logs
    function refreshLogs(){
      try{
        if (window.CBLog && typeof CBLog.dump==='function') {
          logBox.textContent = CBLog.dump();
        } else {
          logBox.textContent = '[CBLog nicht verfügbar]';
        }
      }catch(_){
        logBox.textContent = '[Log-Lese-Fehler]';
      }
    }
    window.addEventListener('cb:log-updated', refreshLogs);
    refreshLogs(); // initial

    hardenFABs();
    return root;
  }

  function showTab(id){
    ['info','logs','build','tests'].forEach(function(k){
      var sec = byId('tab-'+k); if (!sec) return;
      sec.style.display = (k===id ? 'block':'none');
    });
    // Tabs optisch markieren
    Array.prototype.forEach.call(tabs.querySelectorAll('button'), function(btn){
      var on = (btn.dataset.tab===id);
      btn.style.background = on ? '#1d4ed8' : '#0f172a';
      btn.style.color = on ? '#fff' : '#c7d2fe';
      btn.style.borderColor = on ? '#1d4ed8' : '#2f2f2f';
    });
  }

  // --- Öffnen/Schließen ------------------------------------------------------
  function setOpen(open){
    ensureRoot();
    if (open){
      root.style.display='block';
      root.style.pointerEvents='auto';
      root.style.opacity='1';
      showTab('logs'); // default
      try{
        window.dispatchEvent(new CustomEvent('cb:inspector-toggle',{detail:{open:true}}));
        window.dispatchEvent(new CustomEvent('cb:inspector-open'));
      }catch(_){}
      ok(MOD+' geöffnet ('+VER+')');
    } else {
      root.style.opacity='0';
      root.style.pointerEvents='none';
      setTimeout(function(){
        root.style.display='none';
        try{
          window.dispatchEvent(new CustomEvent('cb:inspector-toggle',{detail:{open:false}}));
          window.dispatchEvent(new CustomEvent('cb:inspector-close'));
        }catch(_){}
        ok(MOD+' geschlossen');
      }, 180);
    }
  }
  function isOpen(){ return !!(root && root.style.display!=='none' && root.style.opacity!=='0'); }
  function toggle(force){
    try{ ensureRoot(); }catch(e){ err(MOD+' ensureRoot: '+(e && e.message)); }
    var want = (typeof force==='boolean') ? !!force : !isOpen();
    setOpen(want);
  }

  // --- Public API ------------------------------------------------------------
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleInspector = function(force){
    try{ toggle(force); }catch(e){ warn(MOD+' toggleInspector Fehler: '+(e && e.message)); }
  };

  // --- Auto-Init (Startseite + Spiel) ---------------------------------------
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ ensureRoot(); setOpen(false); }, {once:true});
  } else {
    ensureRoot(); setOpen(false);
  }

  ok(MOD+' geladen ('+VER+')');
})();
