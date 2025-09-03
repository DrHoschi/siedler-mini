/* ============================================================================
 * assets/ui/ui-bridge.js — v17.4.1
 * Stabile Fassade:
 *   GameUI.toggleBuild(force?)      // true/false oder toggle
 *   GameUI.toggleInspector(force?)
 * - feuert Events (cb:build-open/close, cb:inspector-open/close)
 * - rendert Fallback-Baupanel (#ui-build), wenn kein eigenes vorhanden ist
 * - NEU: Inspector-Fallback -> baut/minimal öffnet selbst, falls Core fehlt
 * ============================================================================ */
(function(){
  'use strict';
  var UI = (window.GameUI = window.GameUI || {});
  function ok(){ try{ (window.CBLog?.ok||console.log).apply(console, arguments);}catch(_){console.log.apply(console, arguments);} }
  function warn(){ try{ (window.CBLog?.warn||console.warn).apply(console, arguments);}catch(_){console.warn.apply(console, arguments);} }

  // ---------- Build (Fallback) ----------
  function ensureBuildPanel(){
    var el=document.getElementById('ui-build'); if (el) return el;
    el=document.createElement('div'); el.id='ui-build'; el.setAttribute('role','dialog');
    Object.assign(el.style,{position:'fixed',left:'50%',bottom:'80px',transform:'translateX(-50%)',
      width:'min(520px,92vw)',maxHeight:'60vh',overflow:'auto',background:'rgba(18,18,18,.96)',
      border:'1px solid #2f2f2f',borderRadius:'10px',boxShadow:'0 18px 48px rgba(0,0,0,.45)',
      backdropFilter:'blur(6px)',color:'#eee',zIndex:100002,display:'none'});
    var head=document.createElement('div'); Object.assign(head.style,{display:'flex',alignItems:'center',
      justifyContent:'space-between',padding:'10px 12px',borderBottom:'1px solid #2b2b2b'});
    var title=document.createElement('div'); title.textContent='Bau-Menü (Fallback)'; title.style.fontWeight='700';
    var close=document.createElement('button'); close.textContent='Schließen';
    Object.assign(close.style,{background:'transparent',border:'1px solid #3a3a3a',borderRadius:'4px',color:'#ddd',cursor:'pointer'});
    close.onclick=function(){ UI.toggleBuild(false); };
    head.appendChild(title); head.appendChild(close); el.appendChild(head);
    var body=document.createElement('div'); body.style.padding='10px 12px';
    body.innerHTML='<div style="opacity:.8">Dein spezielles Bau-UI wurde nicht gefunden – dieses Panel ist ein Platzhalter.</div>';
    el.appendChild(body); document.body.appendChild(el); return el;
  }

  function setBuildOpen(open){
    document.body.classList.toggle('has-build-open', !!open);
    if (window.UIBuild?.toggle){ window.UIBuild.toggle(open); }
    else if (window.GameUIBuild?.toggle){ window.GameUIBuild.toggle(open); }
    else { ensureBuildPanel().style.display = open ? 'block' : 'none'; }
    try{
      window.dispatchEvent(new CustomEvent('cb:build-toggle',{detail:{open:!!open}}));
      window.dispatchEvent(new CustomEvent(open?'cb:build-open':'cb:build-close'));
    }catch(_){}
    ok('[ui] Build:', open?'auf':'zu');
  }

  UI.toggleBuild=function(force){
    try{
      var fallbackEl=document.getElementById('ui-build');
      var isOpen = document.body.classList.contains('has-build-open') ||
                   (fallbackEl && fallbackEl.style.display!=='none');
      var wantOpen=(typeof force==='boolean')?!!force:!isOpen; setBuildOpen(wantOpen);
    }catch(e){ warn('[ui] Build-Toggle Fehler:', e?.message); }
  };

  // ---------- Inspector (mit Fallback-Core) ----------
  function ensureInspectorCore(){
    var el=document.getElementById('inspector'); if (el) return el;
    el=document.createElement('div'); el.id='inspector'; el.setAttribute('role','dialog');
    Object.assign(el.style,{position:'fixed',right:'12px',bottom:'80px',width:'400px',maxWidth:'90vw',maxHeight:'70vh',
      overflow:'auto',background:'rgba(20,20,20,.94)',border:'1px solid #333',borderRadius:'8px',
      boxShadow:'0 14px 40px rgba(0,0,0,.45)',backdropFilter:'blur(6px)',color:'#eaeaea',
      font:'14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',zIndex:100001,display:'none'});
    var head=document.createElement('div'); Object.assign(head.style,{display:'flex',alignItems:'center',
      justifyContent:'space-between',padding:'10px 12px',borderBottom:'1px solid #2d2d2d'});
    var title=document.createElement('div'); title.textContent='Inspector (Fallback-Core)'; title.style.fontWeight='700';
    var close=document.createElement('button'); close.textContent='✕';
    Object.assign(close.style,{background:'transparent',border:'1px solid #3a3a3a',borderRadius:'4px',color:'#ddd',cursor:'pointer'});
    close.onclick=function(){ UI.toggleInspector(false); };
    head.appendChild(title); head.appendChild(close); el.appendChild(head);
    var body=document.createElement('div'); body.id='inspector-tabs'; body.style.padding='8px 10px';
    body.innerHTML='<div style="opacity:.8">Inspector-Core lädt… (oder Tests-Core baut sich gleich)</div>';
    el.appendChild(body); document.body.appendChild(el);
    return el;
  }

  function setInspectorOpen(open){
    // Wenn das echte Inspector-Modul da ist → bevorzugen
    if (window.Inspector?.toggle){ window.Inspector.toggle(open); }
    // Immer Events feuern (damit das Inspector-Modul sich aufbauen kann)
    try{
      window.dispatchEvent(new CustomEvent('cb:inspector-toggle',{detail:{open:!!open}}));
      window.dispatchEvent(new CustomEvent(open?'cb:inspector-open':'cb:inspector-close'));
    }catch(_){}
    // Falls Inspector-Core (noch) nicht da → Fallback sichtbar machen
    var el = ensureInspectorCore();
    el.style.display = open ? 'block' : 'none';
    ok('[ui] Inspector:', open?'auf':'zu');
  }

  UI.toggleInspector=function(force){
    try{
      var el=document.getElementById('inspector');
      var isOpen = !!(el && el.style.display!=='none');
      var wantOpen=(typeof force==='boolean')?!!force:!isOpen;
      setInspectorOpen(wantOpen);
    }catch(e){ warn('[ui] Inspector-Toggle Fehler:', e?.message); }
  };

  ok('[ui-bridge] bereit (v17.4.1)');
})();
