/* ============================================================================
 * assets/ui/ui-bridge.js — v17.4.2
 * GameUI.toggleBuild(force?), GameUI.toggleInspector(force?)
 * - Build: Fallback-Panel, Events
 * - Inspector: Fallback-Core + HARTE Sichtbarkeits-Garantie
 * - Extra: kleines Troubleshoot-Badge, falls Inspector nicht erscheint
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
      var el=document.getElementById('ui-build');
      var isOpen = document.body.classList.contains('has-build-open') ||
                   (el && el.style.display!=='none');
      setBuildOpen((typeof force==='boolean')?!!force:!isOpen);
    }catch(e){ warn('[ui] Build-Toggle Fehler:', e?.message); }
  };

  // ---------- Inspector (Fallback-Core + Garantie) ----------
  function ensureInspectorCore(){
    var el=document.getElementById('inspector'); if (el) return el;
    el=document.createElement('div'); el.id='inspector'; el.setAttribute('role','dialog');
    Object.assign(el.style,{position:'fixed',right:'12px',bottom:'80px',width:'400px',maxWidth:'90vw',maxHeight:'70vh',
      overflow:'auto',background:'rgba(20,20,20,.94)',border:'1px solid #333',borderRadius:'8px',
      boxShadow:'0 14px 40px rgba(0,0,0,.45)',backdropFilter:'blur(6px)',color:'#eaeaea',
      font:'14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',zIndex:100001,display:'none'});
    var head=document.createElement('div'); Object.assign(head.style,{display:'flex',alignItems:'center',
      justifyContent:'space-between',padding:'10px 12px',borderBottom:'1px solid #2d2d2d'});
    var title=document.createElement('div'); title.textContent='Inspector'; title.style.fontWeight='700';
    var close=document.createElement('button'); close.textContent='✕';
    Object.assign(close.style,{background:'transparent',border:'1px solid #3a3a3a',borderRadius:'4px',color:'#ddd',cursor:'pointer'});
    close.onclick=function(){ UI.toggleInspector(false); };
    head.appendChild(title); head.appendChild(close); el.appendChild(head);
    var body=document.createElement('div'); body.id='inspector-tabs'; body.style.padding='8px 10px';
    body.innerHTML='<div style="opacity:.8">Inspector lädt…</div>';
    el.appendChild(body); document.body.appendChild(el);
    return el;
  }

  // kleines Troubleshoot-Badge, falls etwas unsichtbar bleibt
  function pingBadge(msg){
    try{
      var b=document.getElementById('ui-ping-badge'); if(!b){
        b=document.createElement('div'); b.id='ui-ping-badge';
        Object.assign(b.style,{position:'fixed',right:'16px',bottom:'16px',zIndex:100005,
          padding:'6px 10px',background:'rgba(0,0,0,.7)',color:'#fff',borderRadius:'6px',font:'12px system-ui'});
        document.body.appendChild(b);
      }
      b.textContent=msg; setTimeout(()=>{ if(b&&b.parentNode) b.parentNode.removeChild(b); }, 1800);
    }catch(_){}
  }

  function setInspectorOpen(open){
    // 1) Events feuern (echter Inspector kann sich so initialisieren)
    try{
      window.dispatchEvent(new CustomEvent('cb:inspector-toggle',{detail:{open:!!open}}));
      window.dispatchEvent(new CustomEvent(open?'cb:inspector-open':'cb:inspector-close'));
    }catch(_){}

    // 2) Falls ein echtes Modul existiert → vorrangig
    if (window.Inspector?.toggle){ window.Inspector.toggle(open); }

    // 3) Fallback-Core erzwingen + sichtbar schalten
    var el = ensureInspectorCore();
    el.style.display = open ? 'block' : 'none';

    // 4) Sichtbarkeits-Garantie: kurz danach prüfen & notfalls hart nachziehen
    setTimeout(function(){
      var visible = !!(el && el.style.display!=='none' && el.offsetWidth>0 && el.offsetHeight>0);
      if (!visible && open){
        el.style.display='block';
        el.style.visibility='visible';
        el.style.opacity='1';
        el.style.zIndex='100005';
        pingBadge('Inspector geöffnet (Failsafe)');
      }
    }, 0);

    ok('[ui] Inspector:', open?'auf':'zu');
  }

  UI.toggleInspector=function(force){
    try{
      var el=document.getElementById('inspector');
      var isOpen = !!(el && el.style.display!=='none');
      setInspectorOpen((typeof force==='boolean')?!!force:!isOpen);
    }catch(e){ warn('[ui] Inspector-Toggle Fehler:', e?.message); }
  };

  ok('[ui-bridge] bereit (v17.4.2)');
})();
