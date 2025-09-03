/* ============================================================================
 * ui-build.js — Bau-UI (gehärtet, non-blocking)
 * Version: v17.4.7
 * Projekt: Neue Siedler
 *
 * Ziele
 *  - Stabiles Öffnen/Schließen: GameUI.toggleBuild(force?)
 *  - Backdrop blockiert NUR im offenen Zustand (pointer-events)
 *  - FAB-Buttons bleiben bedienbar (hoher z-index)
 *  - Fallback-Inhalt bis Spezial-Panel wieder da ist
 *  - Saubere Events und Logs
 *
 * Events (dispatch)
 *  - cb:build-toggle {open}
 *  - cb:build-open
 *  - cb:build-close
 *  - cb:build-select {type}
 * ========================================================================== */
(function () {
  'use strict';

  var VER = 'v17.4.7';
  var MOD = '[ui-build]';

  // ---- Logging --------------------------------------------------------------
  function ok(){ try{ (window.CBLog?.ok||console.log).apply(console, arguments); }catch(_){ console.log.apply(console, arguments);} }
  function warn(){ try{ (window.CBLog?.warn||console.warn).apply(console, arguments); }catch(_){ console.warn.apply(console, arguments);} }
  function err(){ try{ (window.CBLog?.err||console.error).apply(console, arguments); }catch(_){ console.error.apply(console, arguments);} }

  // ---- Helpers --------------------------------------------------------------
  function byId(id){ return document.getElementById(id); }
  function on(el, ev, fn, opt){ if (el) try{ el.addEventListener(ev, fn, opt||false);}catch(_){} }
  function off(el, ev, fn, opt){ if (el) try{ el.removeEventListener(ev, fn, opt||false);}catch(_){} }

  // ---- State ----------------------------------------------------------------
  var root=null, panel=null, content=null, closeBtn=null;
  var escBound=false;

  // ---- FAB-Schutz -----------------------------------------------------------
  function hardenFABs(){
    try{
      var css='z-index:2147483647 !important; pointer-events:auto !important;';
      var b1=byId('btn-build'), b2=byId('btn-inspector');
      if (b1) b1.style.cssText=(b1.getAttribute('style')||'')+';'+css;
      if (b2) b2.style.cssText=(b2.getAttribute('style')||'')+';'+css;
    }catch(_){}
  }

  // ---- Aufbau ---------------------------------------------------------------
  function ensureRoot(){
    if (root) return root;

    // Backdrop
    root=document.createElement('div');
    root.id='ui-build';
    root.setAttribute('role','dialog');
    Object.assign(root.style,{
      position:'fixed', inset:'0', zIndex:'2147483600',
      display:'none', opacity:'0',
      background:'rgba(0,0,0,0.25)',
      transition:'opacity .18s ease',
      pointerEvents:'none' // geschlossen: niemals blockieren
    });

    // Panel
    panel=document.createElement('div');
    panel.id='ui-build-card';
    Object.assign(panel.style,{
      position:'absolute', left:'50%', bottom:'88px', transform:'translateX(-50%)',
      width:'min(640px,92vw)', maxHeight:'64vh', overflow:'auto',
      background:'rgba(20,20,20,.95)', border:'1px solid #2f2f2f', borderRadius:'12px',
      boxShadow:'0 18px 48px rgba(0,0,0,.45)', backdropFilter:'blur(6px)',
      color:'#eaeaea', font:'14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
      pointerEvents:'auto'
    });

    // Header
    var head=document.createElement('div');
    Object.assign(head.style,{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'10px 12px', borderBottom:'1px solid #2a2a2a', position:'sticky', top:'0',
      background:'inherit', zIndex:'1'
    });
    var title=document.createElement('div'); title.textContent='Bau-Menü'; title.style.fontWeight='800';
    var ver=document.createElement('div'); ver.textContent=VER; ver.style.cssText='opacity:.55;font-size:12px;margin-left:auto;margin-right:8px;';
    closeBtn=document.createElement('button'); closeBtn.textContent='✕';
    Object.assign(closeBtn.style,{background:'transparent',border:'1px solid #3a3a3a',color:'#ddd',borderRadius:'6px',cursor:'pointer',padding:'6px 10px'});
    on(closeBtn,'click',function(){ toggle(false); });
    head.appendChild(title); head.appendChild(ver); head.appendChild(closeBtn);

    // Content (Fallback)
    content=document.createElement('div'); content.id='ui-build-content'; content.style.cssText='padding:10px 12px;';
    var fallback=document.createElement('div');
    fallback.id='ui-build-fallback';
    fallback.innerHTML='' +
      '<div style="opacity:.85;margin:0 0 8px">Fallback aktiviert – spezielles Bau-UI nicht gefunden.</div>' +
      '<div style="display:grid;grid-template-columns:repeat(4, minmax(0,1fr));gap:8px;">' +
        '<button data-b="house" class="ui-bbtn">🏠 Haus</button>' +
        '<button data-b="farm" class="ui-bbtn">🌾 Farm</button>' +
        '<button data-b="depot" class="ui-bbtn">📦 Depot</button>' +
        '<button data-b="hq" class="ui-bbtn">🏛️ Rathaus</button>' +
        '<button data-b="smith" class="ui-bbtn">⚒️ Schmiede</button>' +
        '<button data-b="lumberjack" class="ui-bbtn">🪵 Holzfäller</button>' +
      '</div>' +
      '<style>.ui-bbtn{padding:10px;border-radius:8px;background:#1f2937;border:1px solid #374151;color:#e2e8f0;cursor:pointer;} .ui-bbtn:hover{filter:brightness(1.05);}</style>';
    content.appendChild(fallback);

    // Delegation für Buttons
    on(content,'click',function(ev){
      var b = ev.target && ev.target.closest('.ui-bbtn'); if (!b) return;
      var type = b.getAttribute('data-b') || '';
      try{ window.dispatchEvent(new CustomEvent('cb:build-select',{detail:{type}})); }catch(_){}
      try{
        if (window.Game?.setBuildTool){ Game.setBuildTool(type); ok(MOD+' Tool gesetzt: '+type); }
        else { ok(MOD+' Build-Select: '+type+' (Game.setBuildTool nicht gefunden)'); }
      }catch(e){ warn(MOD+' Fehler Tool-Set: '+(e&&e.message)); }
    });

    panel.appendChild(head);
    panel.appendChild(content);
    root.appendChild(panel);
    document.body.appendChild(root);

    // Backdrop-Klick schließt, wenn neben Panel
    on(root,'mousedown',function(ev){ if (!panel.contains(ev.target)) toggle(false); });

    // ESC
    if (!escBound){
      escBound=true;
      on(window,'keydown',function(ev){ if (ev.key==='Escape') toggle(false); });
    }

    hardenFABs();
    ok(MOD+' gebaut ('+VER+')');
    return root;
  }

  // ---- Öffnen/Schließen -----------------------------------------------------
  function setOpen(open){
    ensureRoot();
    if (open){
      root.style.display='block';
      root.style.pointerEvents='auto';  // jetzt darf der Backdrop blocken
      root.style.opacity='1';
      document.body.classList.add('has-build-open');
      try{
        window.dispatchEvent(new CustomEvent('cb:build-toggle',{detail:{open:true}}));
        window.dispatchEvent(new CustomEvent('cb:build-open'));
      }catch(_){}
      ok(MOD+' geöffnet ('+VER+')');
    } else {
      root.style.opacity='0';
      root.style.pointerEvents='none';
      document.body.classList.remove('has-build-open');
      setTimeout(function(){
        root.style.display='none';
        try{
          window.dispatchEvent(new CustomEvent('cb:build-toggle',{detail:{open:false}}));
          window.dispatchEvent(new CustomEvent('cb:build-close'));
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

  // ---- Mount/Unmount Custom-Panel ------------------------------------------
  function mount(node){
    ensureRoot();
    try{
      content.innerHTML='';
      if (node && node.nodeType===1) content.appendChild(node);
      ok(MOD+' mount() OK');
    }catch(e){ err(MOD+' mount() Fehler: '+(e && e.message)); }
  }
  function unmount(){
    ensureRoot();
    try{
      content.innerHTML='';
      var fb=document.createElement('div');
      fb.id='ui-build-fallback';
      fb.textContent='Fallback aktiviert – spezielles Bau-UI nicht gefunden.';
      content.appendChild(fb);
      ok(MOD+' unmount() OK');
    }catch(e){ err(MOD+' unmount() Fehler: '+(e && e.message)); }
  }

  // ---- Public API -----------------------------------------------------------
  window.GameUIBuild = window.GameUIBuild || {};
  window.GameUIBuild.toggle = toggle;
  window.GameUIBuild.mount  = mount;
  window.GameUIBuild.unmount= unmount;

  window.GameUI = window.GameUI || {};
  window.GameUI.toggleBuild = function(force){ try{ toggle(force); }catch(e){ warn(MOD+' toggleBuild Fehler: '+(e && e.message)); } };

  // ---- Auto-Init ------------------------------------------------------------
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ensureRoot, {once:true});
  } else {
    ensureRoot();
  }

  ok(MOD+' geladen ('+VER+')');
})();
