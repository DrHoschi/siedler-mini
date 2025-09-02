/* ============================================================================
 * Datei: assets/inspector/inspector.js
 * Version: v17.2.2
 * Zweck:
 *   - Inspector-Core „light“ (falls noch keiner existiert): Root + Tabs
 *   - Tests-Panel anhängen (Pfad-Overlay, Entity-Overlay, Ressourcen-Adder)
 *   - Reagiert robust auf cb:inspector-open/cb:game-started
 * Hinweise:
 *   - Hängt sich nur an #inspector; erzeugt minimalen Core bei Bedarf
 *   - Keine Abhängigkeit von Frameworks
 * ============================================================================ */
(function () {
  'use strict';

  var MOD = '[inspector.core]';
  function ok(){ try{ (window.CBLog?.ok||console.log).apply(console, arguments);}catch(_){console.log.apply(console, arguments);} }
  function warn(){ try{ (window.CBLog?.warn||console.warn).apply(console, arguments);}catch(_){console.warn.apply(console, arguments);} }

  var panelAttached = false;
  var observer = null;

  // ---------- Minimaler Core (falls keiner existiert) ----------
  function ensureCore(){
    var root = document.getElementById('inspector');
    if (!root){
      // Falls UI-Bridge fehlt, selber minimal bauen:
      root = document.createElement('div');
      root.id = 'inspector';
      root.style.position='fixed';
      root.style.right='12px'; root.style.bottom='80px';
      root.style.width='360px'; root.style.maxWidth='90vw';
      root.style.maxHeight='70vh'; root.style.overflow='auto';
      root.style.background='rgba(20,20,20,.94)';
      root.style.border='1px solid #333'; root.style.borderRadius='8px';
      root.style.boxShadow='0 14px 40px rgba(0,0,0,.45)';
      root.style.backdropFilter='blur(6px)';
      root.style.color='#eaeaea';
      root.style.font='14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      root.style.zIndex='100001';
      root.style.display='block';

      var head = document.createElement('div');
      head.style.display='flex'; head.style.alignItems='center'; head.style.justifyContent='space-between';
      head.style.padding='10px 12px'; head.style.borderBottom='1px solid #2d2d2d';
      var title = document.createElement('div'); title.textContent='Inspector';
      title.style.fontWeight='700';
      var close = document.createElement('button'); close.textContent='✕';
      close.style.background='transparent'; close.style.border='1px solid #3a3a3a';
      close.style.borderRadius='4px'; close.style.color='#ddd'; close.style.cursor='pointer';
      close.onclick = function(){ try{ window.GameUI?.toggleInspector(false); }catch(_){ root.style.display='none'; } };
      head.appendChild(title); head.appendChild(close);
      root.appendChild(head);

      var tabs = document.createElement('div'); tabs.id='inspector-tabs'; tabs.style.padding='8px 10px';
      root.appendChild(tabs);

      document.body.appendChild(root);
      ok(MOD+' (light) erzeugt');
    }
    return root;
  }

  // ---------- Tests-Panel (wie besprochen + Entity-Overlay) ----------
  function buildTestsPanel(){
    if (panelAttached) return;
    var root = ensureCore();
    var host = root.querySelector('#inspector-tabs') || root;

    var panel=document.createElement('div');
    panel.id='inspector-tests';
    panel.setAttribute('aria-label','Inspector Tests');
    panel.style.padding='10px';
    panel.style.borderTop='1px dashed #3a3a3a';
    panel.style.background='rgba(0,0,0,.12)';

    var title=document.createElement('div');
    title.textContent='Tests';
    title.style.fontWeight='700';
    title.style.margin='0 0 8px';
    panel.appendChild(title);

    // Pfad-Overlay
    var row1=document.createElement('div');
    row1.style.display='flex'; row1.style.alignItems='center'; row1.style.gap='8px'; row1.style.margin='6px 0 8px';
    var chk1=document.createElement('input'); chk1.type='checkbox'; chk1.id='dbg-path-overlay';
    chk1.checked=!!window.DEBUG_PATH_OVERLAY;
    var lbl1=document.createElement('label'); lbl1.htmlFor='dbg-path-overlay'; lbl1.textContent='Pfad-Overlay anzeigen';
    chk1.addEventListener('change', function(){
      var enabled=!!chk1.checked; window.DEBUG_PATH_OVERLAY=enabled;
      window.dispatchEvent(new CustomEvent('cb:toggle-path-overlay',{detail:{enabled}}));
      ok('[inspector] PF-Overlay '+(enabled?'AN':'AUS'));
      try{ window.requestAnimationFrame?.(()=>window.dispatchEvent(new Event('cb:request-repaint')));}catch(_){}
    });
    row1.appendChild(chk1); row1.appendChild(lbl1);
    panel.appendChild(row1);

    // Entity-Overlay
    var row2=document.createElement('div');
    row2.style.display='flex'; row2.style.alignItems='center'; row2.style.gap='8px'; row2.style.margin='6px 0 8px';
    var chk2=document.createElement('input'); chk2.type='checkbox'; chk2.id='dbg-entity-overlay';
    chk2.checked=!!window.DEBUG_ENTITY_OVERLAY;
    var lbl2=document.createElement('label'); lbl2.htmlFor='dbg-entity-overlay'; lbl2.textContent='Entity-Overlay anzeigen';
    chk2.addEventListener('change', function(){
      var enabled=!!chk2.checked; window.DEBUG_ENTITY_OVERLAY=enabled;
      window.dispatchEvent(new CustomEvent('cb:toggle-entity-overlay',{detail:{enabled}}));
      ok('[inspector] Entity-Overlay '+(enabled?'AN':'AUS'));
      try{ window.requestAnimationFrame?.(()=>window.dispatchEvent(new Event('cb:request-repaint')));}catch(_){}
    });
    row2.appendChild(chk2); row2.appendChild(lbl2);
    panel.appendChild(row2);

    // Ressourcen-Adder
    var grid=document.createElement('div'); grid.style.display='grid';
    grid.style.gridTemplateColumns='1fr 110px'; grid.style.gap='6px'; grid.style.margin='6px 0';
    var inpType=document.createElement('input'); inpType.type='text'; inpType.placeholder='Typ (wood, stone, …)';
    inpType.id='res-type'; inpType.autocomplete='off'; inpType.style.padding='6px 8px';
    inpType.style.background='#181818'; inpType.style.border='1px solid #333'; inpType.style.color='#eee';
    inpType.value='wood';
    var inpAmt=document.createElement('input'); inpAmt.type='number'; inpAmt.min='1'; inpAmt.step='1';
    inpAmt.placeholder='Menge'; inpAmt.id='res-amount'; inpAmt.style.padding='6px 8px';
    inpAmt.style.background='#181818'; inpAmt.style.border='1px solid #333'; inpAmt.style.color='#eee';
    inpAmt.value='10';
    grid.appendChild(inpType); grid.appendChild(inpAmt);
    panel.appendChild(grid);

    var action=document.createElement('div'); action.style.display='flex'; action.style.alignItems='center'; action.style.gap='8px';
    var btn=document.createElement('button'); btn.textContent='Ressourcen hinzufügen';
    btn.style.padding='6px 10px'; btn.style.background='#2b6cb0'; btn.style.border='1px solid #2a4365';
    btn.style.color='#fff'; btn.style.borderRadius='4px'; btn.style.cursor='pointer';
    var status=document.createElement('div'); status.id='res-status'; status.style.flex='1'; status.style.minHeight='1.2em';
    btn.addEventListener('click', function(){
      var type=String(inpType.value||'').trim(); var amount=Math.max(1, parseInt(inpAmt.value||'0',10)||0);
      if(!type){ status.textContent='Bitte Ressourcentyp angeben.'; status.style.color='#f6ad55'; warn('[inspector] add-res: fehlender Typ'); return; }
      window.dispatchEvent(new CustomEvent('cb:add-resources',{detail:{type,amount}}));
      var okDirect=false;
      try{ if(window.Game && typeof Game.addResources==='function'){ Game.addResources(type,amount); okDirect=true; } }catch(_){}
      if(okDirect){ status.textContent='+'+amount+' '+type; status.style.color='#68d391'; ok('[inspector] add-res OK: +'+amount+' '+type); }
      else { status.textContent='Event gesendet: +'+amount+' '+type+' (Game.addResources nicht gefunden)'; status.style.color='#63b3ed'; warn('[inspector] add-res: Event gesendet, direkte API nicht verfügbar'); }
    });
    action.appendChild(btn); action.appendChild(status);
    panel.appendChild(action);

    host.appendChild(panel);
    panelAttached = true;
    ok(MOD+' geöffnet (v17.2.2)');
  }

  // ---------- Observer (falls andere Tabs dynamisch sind) ----------
  function startObserver(){
    if (observer) return;
    try{
      observer = new MutationObserver(function(muts){
        // Falls der Inspector neu erzeugt/ausgetauscht wird, Panel ggf. erneut anhängen
        var hadPanel = !!document.getElementById('inspector-tests');
        var root = document.getElementById('inspector');
        if (root && !hadPanel) { panelAttached=false; buildTestsPanel(); }
      });
      observer.observe(document.body, { childList:true, subtree:true });
    }catch(_){}
  }

  // ---------- Events ----------
  window.addEventListener('cb:game-started', function(){
    startObserver();
    // Falls Inspector bereits geöffnet war, Tests-Panel sicherstellen
    if (document.getElementById('inspector')?.style.display !== 'none'){
      buildTestsPanel();
    }
  });

  window.addEventListener('cb:inspector-open', function(){
    startObserver();
    buildTestsPanel();
  });

  // Falls Seite ohne Events → nach kurzer Zeit probieren
  setTimeout(function(){
    startObserver();
    if (document.getElementById('inspector')){
      buildTestsPanel();
    }
  }, 1200);

})();
