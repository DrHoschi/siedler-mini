/* ============================================================================
 * Datei: assets/inspector/inspector.js
 * Projekt: Siedler-Mini
 * Version: v17.3.1 (Kombi: Core + Logs-Tab + Tests-Tab)
 * Änderungen ggü. 17.3.0:
 *   - robuster auf cb:inspector-open (bauen + anzeigen, egal Reihenfolge)
 *   - kleine Styles, kein Überschreiben fremder Fenster
 * ============================================================================ */
(function () {
  'use strict';

  var MOD = '[inspector.core]';
  var root=null, tabs=null, open=false, built=false, logsTabEl=null;
  var cbHookInstalled = false;

  function ok(){ try{ (window.CBLog?.ok||console.log).apply(console, arguments);}catch(_){console.log.apply(console, arguments);} }
  function warn(){ try{ (window.CBLog?.warn||console.warn).apply(console, arguments);}catch(_){console.warn.apply(console, arguments);} }

  function byId(id, host){ return (host||document).getElementById(id); }
  function mk(tag, props, styles){
    var el=document.createElement(tag);
    if (props) for (var k in props){ if (k==='text') el.textContent=props[k]; else el.setAttribute(k, props[k]); }
    if (styles) for (var s in styles){ el.style[s]=styles[s]; }
    return el;
  }

  function buildCore(){
    if (built && root && tabs) return root;

    root = byId('inspector') || mk('div', { id:'inspector', role:'dialog', 'aria-label':'Inspector' }, {
      position:'fixed', right:'12px', bottom:'80px',
      width:'400px', maxWidth:'90vw', maxHeight:'70vh', overflow:'auto',
      background:'rgba(20,20,20,.94)', border:'1px solid #333', borderRadius:'8px',
      boxShadow:'0 14px 40px rgba(0,0,0,.45)', backdropFilter:'blur(6px)',
      color:'#eaeaea', font:'14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
      zIndex:'100001', display:'none'
    });
    if (!root.parentNode) document.body.appendChild(root);

    var head = mk('div', null, { display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'10px 12px', borderBottom:'1px solid #2d2d2d' });
    var title = mk('div'); title.textContent='Inspector'; title.style.fontWeight='700';
    var close = mk('button'); close.textContent='✕';
    close.style.background='transparent'; close.style.border='1px solid #3a3a3a';
    close.style.borderRadius='4px'; close.style.color='#ddd'; close.style.cursor='pointer';
    close.onclick=function(){ toggle(false); };
    head.appendChild(title); head.appendChild(close);
    root.appendChild(head);

    tabs = byId('inspector-tabs', root) || mk('div', { id:'inspector-tabs' }, { display:'block', padding:'8px 10px' });
    if (!tabs.parentNode) root.appendChild(tabs);

    built = true;
    ok(MOD+' gebaut (v17.3.1)');
    return root;
  }

  function addLogTab(){
    if (byId('inspector-logs', tabs)) return;
    logsTabEl = mk('div', { id:'inspector-logs' }, {
      padding:'6px', fontFamily:'monospace', fontSize:'12px',
      whiteSpace:'pre-wrap', maxHeight:'200px', overflowY:'auto',
      background:'rgba(0,0,0,.08)', border:'1px solid #2a2a2a', borderRadius:'4px'
    });
    logsTabEl.textContent='[Inspector Logs]\n';
    tabs.appendChild(logsTabEl);

    try {
      if (!cbHookInstalled && window.CBLog?.push){
        var origPush = window.CBLog.push.bind(window.CBLog);
        window.CBLog.push = function(type, msg){
          try {
            if (logsTabEl){
              var line='['+String(type||'log').toUpperCase()+'] '+String(msg||'');
              logsTabEl.textContent += line+'\n';
              logsTabEl.scrollTop = logsTabEl.scrollHeight;
            }
          } catch(_){}
          return origPush(type, msg);
        };
        cbHookInstalled = true;
      }
    } catch(_){}
  }

  function addTestsTab(){
    if (byId('inspector-tests', tabs)) return;

    var panel = mk('div', { id:'inspector-tests', 'aria-label':'Inspector Tests' }, {
      padding:'10px', borderTop:'1px dashed #3a3a3a', background:'rgba(0,0,0,.12)', marginTop:'8px'
    });
    var title = mk('div'); title.textContent='Tests'; title.style.fontWeight='700'; title.style.margin='0 0 8px';
    panel.appendChild(title);

    // Pfad-Overlay
    var row1 = mk('div', null, { display:'flex', alignItems:'center', gap:'8px', margin:'6px 0 8px' });
    var chk1 = mk('input', { type:'checkbox', id:'dbg-path-overlay' }); chk1.checked = !!window.DEBUG_PATH_OVERLAY;
    var lbl1 = mk('label', { for:'dbg-path-overlay' }); lbl1.textContent='Pfad-Overlay anzeigen';
    chk1.addEventListener('change', function(){
      var enabled=!!chk1.checked; window.DEBUG_PATH_OVERLAY=enabled;
      try{ window.dispatchEvent(new CustomEvent('cb:toggle-path-overlay',{detail:{enabled}})); }catch(_){}
      ok('[inspector] PF-Overlay '+(enabled?'AN':'AUS'));
      try{ window.requestAnimationFrame?.(()=>window.dispatchEvent(new Event('cb:request-repaint')));}catch(_){}
    });
    row1.appendChild(chk1); row1.appendChild(lbl1);
    panel.appendChild(row1);

    // Entity-Overlay
    var row2 = mk('div', null, { display:'flex', alignItems:'center', gap:'8px', margin:'6px 0 8px' });
    var chk2 = mk('input', { type:'checkbox', id:'dbg-entity-overlay' }); chk2.checked = !!window.DEBUG_ENTITY_OVERLAY;
    var lbl2 = mk('label', { for:'dbg-entity-overlay' }); lbl2.textContent='Entity-Overlay anzeigen';
    chk2.addEventListener('change', function(){
      var enabled=!!chk2.checked; window.DEBUG_ENTITY_OVERLAY=enabled;
      try{ window.dispatchEvent(new CustomEvent('cb:toggle-entity-overlay',{detail:{enabled}})); }catch(_){}
      ok('[inspector] Entity-Overlay '+(enabled?'AN':'AUS'));
      try{ window.requestAnimationFrame?.(()=>window.dispatchEvent(new Event('cb:request-repaint')));}catch(_){}
    });
    row2.appendChild(chk2); row2.appendChild(lbl2);
    panel.appendChild(row2);

    // Ressourcen-Adder
    var grid = mk('div', null, { display:'grid', gridTemplateColumns:'1fr 110px', gap:'6px', margin:'6px 0' });
    var inpType = mk('input', { type:'text', id:'res-type', placeholder:'Typ (wood, stone, …)', autocomplete:'off' }, {
      padding:'6px 8px', background:'#181818', border:'1px solid #333', color:'#eee'
    }); inpType.value='wood';
    var inpAmt = mk('input', { type:'number', id:'res-amount', min:'1', step:'1', placeholder:'Menge' }, {
      padding:'6px 8px', background:'#181818', border:'1px solid #333', color:'#eee'
    }); inpAmt.value='10';
    grid.appendChild(inpType); grid.appendChild(inpAmt);
    panel.appendChild(grid);

    var action = mk('div', null, { display:'flex', alignItems:'center', gap:'8px' });
    var btn = mk('button'); btn.textContent='Ressourcen hinzufügen';
    btn.style.padding='6px 10px'; btn.style.background='#2b6cb0'; btn.style.border='1px solid #2a4365';
    btn.style.color='#fff'; btn.style.borderRadius='4px'; btn.style.cursor='pointer';
    var status = mk('div', { id:'res-status' }, { flex:'1', minHeight:'1.2em' });
    btn.addEventListener('click', function(){
      var type=String(inpType.value||'').trim(); var amount=Math.max(1, parseInt(inpAmt.value||'0',10)||0);
      if(!type){ status.textContent='Bitte Ressourcentyp angeben.'; status.style.color='#f6ad55'; warn('[inspector] add-res: fehlender Typ'); return; }
      try{ window.dispatchEvent(new CustomEvent('cb:add-resources',{detail:{type,amount}})); }catch(_){}
      var okDirect=false;
      try{ if(window.Game && typeof Game.addResources==='function'){ Game.addResources(type,amount); okDirect=true; } }catch(_){}
      if(okDirect){ status.textContent='+'+amount+' '+type; status.style.color='#68d391'; ok('[inspector] add-res OK: +'+amount+' '+type); }
      else { status.textContent='Event gesendet: +'+amount+' '+type+' (Game.addResources nicht gefunden)'; status.style.color='#63b3ed'; warn('[inspector] add-res: Event gesendet, direkte API nicht verfügbar'); }
    });
    action.appendChild(btn); action.appendChild(status);
    panel.appendChild(action);

    tabs.appendChild(panel);
  }

  function toggle(show){
    buildCore();
    open = !!show;
    root.style.display = open ? 'block' : 'none';
    try { window.dispatchEvent(new CustomEvent(open ? 'cb:inspector-open' : 'cb:inspector-close')); }catch(_){}
    ok(MOD+' '+(open?'geöffnet':'geschlossen')+' (v17.3.1)');
  }

  function ensureAll(){
    buildCore(); addLogTab(); addTestsTab();
  }

  // robust auf Reihenfolge: build+open sobald Event kommt
  window.addEventListener('cb:inspector-open', function(){ ensureAll(); root.style.display='block'; });
  window.addEventListener('cb:inspector-close', function(){ if (buildCore()) root.style.display='none'; });

  // Bei Spielstart Tabs bereitstellen (ohne zu öffnen)
  window.addEventListener('cb:game-started', function(){ ensureAll(); });

  // API
  window.Inspector = { toggle: toggle };

  // Vorbereiten (gebaut, aber geschlossen)
  ensureAll(); toggle(false);
})();
