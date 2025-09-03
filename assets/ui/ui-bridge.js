/* ============================================================================
 * assets/ui/ui-bridge.js — v17.3.2
 * Stabile Fassade:
 *   GameUI.toggleBuild(force?)  // true/false oder toggle
 *   GameUI.toggleInspector(force?)
 * - feuert kompatible Events (cb:build-open/close, cb:inspector-open/close)
 * - rendert optional ein Fallback-Baupanel (#ui-build), wenn es keins gibt
 * ============================================================================ */
(function(){
  'use strict';
  var UI = (window.GameUI = window.GameUI || {});
  function ok(){ try{ (window.CBLog?.ok||console.log).apply(console, arguments);}catch(_){console.log.apply(console, arguments);} }
  function warn(){ try{ (window.CBLog?.warn||console.warn).apply(console, arguments);}catch(_){console.warn.apply(console, arguments);} }

  // --- Build Fallback ---
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
    // vorhandene Module respektieren
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
      var isOpen = document.body.classList.contains('has-build-open') ||
                   (document.getElementById('ui-build')?.style.display!=='none');
      var wantOpen=(typeof force==='boolean')?!!force:!isOpen; setBuildOpen(wantOpen);
    }catch(e){ warn('[ui] Build-Toggle Fehler:', e?.message); }
  };

  // --- Inspector ---
  function isInspectorOpen(){ var el=document.getElementById('inspector'); return el && el.style.display!=='none'; }
  UI.toggleInspector=function(force){
    try{
      var wantOpen=(typeof force==='boolean')?!!force:!isInspectorOpen();
      // eigene API nutzen, wenn vorhanden
      if (window.Inspector?.toggle) window.Inspector.toggle(wantOpen);
      window.dispatchEvent(new CustomEvent(wantOpen?'cb:inspector-open':'cb:inspector-close'));
      ok('[ui] Inspector:', wantOpen?'auf':'zu');
    }catch(e){ warn('[ui] Inspector-Toggle Fehler:', e?.message); }
  };

  ok('[ui-bridge] bereit (v17.3.2)');
})();
