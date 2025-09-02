/* ============================================================================
 * Inspector — v16.6.0
 * Projekt: Siedler-Mini
 *
 * Teil A: Inspector-Core
 *   - Erstellt/verwaltet den Inspector-Root (#inspector) NUR auf Nachfrage
 *   - API: GameUI.openInspector(), GameUI.closeInspector(), GameUI.toggleInspector()
 *   - Keine Autocreate/Auto-Open auf Landing-Page
 *
 * Teil B: Tests-Panel (vv16.5.5)
 *   - Overlay-Toggle & Ressourcen-Adder
 *   - Dockt robust an #inspector an (MutationObserver + sanftes Polling)
 * ========================================================================== */
(function(){
  'use strict';

  var UI = (window.GameUI = window.GameUI || {});
  var CORE_VERSION = 'v16.6.0';

  // ---------- Style nur einmal injizieren ----------
  function ensureStyleOnce(){
    if (document.getElementById('inspector-style')) return;
    var css = `
      #inspector{
        position:fixed; right:12px; bottom:12px; z-index:99999;
        max-height:60vh; overflow:auto;
        min-width:260px;
        display:none;
      }
      .cb-ins-panel{
        background:rgba(20,20,20,.92);
        border:1px solid #333; border-radius:8px;
        color:#eee; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
        padding:10px;
      }
      .cb-ins-panel.open{ display:block; }
      .cb-ins-head{ display:flex; align-items:center; gap:8px; margin:0 0 8px; }
      .cb-ins-title{ font-weight:700; }
      .cb-ins-spacer{ flex:1; }
      .cb-ins-btn{ background:#2b6cb0; border:1px solid #2a4365; color:#fff; border-radius:4px; cursor:pointer; padding:4px 8px; }
    `;
    var st=document.createElement('style'); st.id='inspector-style'; st.textContent=css; document.head.appendChild(st);
  }

  // ---------- Root sichern (ohne Autocreate bis zum Öffnen) ----------
  function ensureRoot(){
    ensureStyleOnce();
    var root =
      document.querySelector('#inspector') ||
      document.querySelector('#inspector-root') ||
      document.querySelector('.inspector-root') ||
      document.querySelector('[data-role="inspector"]');

    if (!root){
      // Erst JETZT (auf Nachfrage) minimalen Root anlegen
      root = document.createElement('div');
      root.id = 'inspector';
      document.body.appendChild(root);
    }
    // Pane-Container
    var pane = root.querySelector('.cb-ins-panel');
    if (!pane){
      pane = document.createElement('div');
      pane.className = 'cb-ins-panel';
      // Kopf (Titel + Close)
      var head = document.createElement('div'); head.className='cb-ins-head';
      var title = document.createElement('div'); title.className='cb-ins-title'; title.textContent='Inspector';
      var sp = document.createElement('div'); sp.className='cb-ins-spacer';
      var btn = document.createElement('button'); btn.className='cb-ins-btn'; btn.textContent='Schließen';
      btn.addEventListener('click', function(){ UI.closeInspector(); });
      head.appendChild(title); head.appendChild(sp); head.appendChild(btn);
      pane.appendChild(head);

      root.appendChild(pane);
    }
    return { root:root, pane:pane };
  }

  function open(){
    var parts = ensureRoot();
    parts.root.style.display = 'block';
    parts.pane.classList.add('open');
    try { window.dispatchEvent(new Event('cb:inspector-open')); } catch(_){}
    try { window.CBLog && CBLog.ok && CBLog.ok('[inspector.core] geöffnet ('+CORE_VERSION+')'); } catch(_){}
  }
  function close(){
    var r = document.querySelector('#inspector, #inspector-root, .inspector-root, [data-role="inspector"]');
    var p = r && r.querySelector('.cb-ins-panel');
    if (r){ r.style.display='none'; }
    if (p){ p.classList.remove('open'); }
  }
  function toggle(){
    var r = document.querySelector('#inspector, #inspector-root, .inspector-root, [data-role="inspector"]');
    var p = r && r.querySelector('.cb-ins-panel');
    if (p && p.classList.contains('open')) close(); else open();
  }

  // ESC schließt (nur wenn offen)
  window.addEventListener('keydown', function(e){
    if ((e.key||'').toLowerCase()==='escape'){
      var p = document.querySelector('.cb-ins-panel.open');
      if (p) close();
    }
  });

  // Exporte
  UI.openInspector = open;
  UI.closeInspector = close;
  UI.toggleInspector = toggle;

})();

/* ============================================================================
 * Inspector: Tests-Panel — vv16.5.5
 *   - Overlay-Toggle & Ressourcen-Adder
 *   - Dockt robust an #inspector an (Observer + Poll)
 * ========================================================================== */
(function () {
  'use strict';

  var MOD = '[inspector.tests]';

  function ok(m){ try{ (window.CBLog?.ok || console.log)(m); }catch(_){} }
  function warn(m){ try{ (window.CBLog?.warn || console.warn)(m); }catch(_){} }

  var panelAttached = false;
  var pollTimer = 0;
  var pollDeadline = 0;
  var observer = null;

  // Panel bauen und an echten Inspector hängen
  function buildPanel(root){
    if (!root || panelAttached) return;

    var panel = document.createElement('div');
    panel.id = 'inspector-tests';
    panel.setAttribute('aria-label','Inspector Tests');
    panel.style.padding    = '10px';
    panel.style.borderTop  = '1px dashed #3a3a3a';
    panel.style.background = 'rgba(0,0,0,.12)';

    var title = document.createElement('div');
    title.textContent = 'Tests';
    title.style.fontWeight = '700';
    title.style.margin = '0 0 8px';
    panel.appendChild(title);

    // Toggle: Pfad-Overlay
    var row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '8px';
    row.style.margin = '6px 0 8px';

    var chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.id   = 'dbg-path-overlay';
    chk.checked = !!window.DEBUG_PATH_OVERLAY;

    var lbl = document.createElement('label');
    lbl.htmlFor = 'dbg-path-overlay';
    lbl.textContent = 'Pfad-Overlay anzeigen';

    chk.addEventListener('change', function(){
      var enabled = !!chk.checked;
      window.DEBUG_PATH_OVERLAY = enabled;
      window.dispatchEvent(new CustomEvent('cb:toggle-path-overlay', { detail:{ enabled } }));
      ok(MOD + ' Pfad-Overlay: ' + (enabled ? 'AN' : 'AUS'));
      try { window.requestAnimationFrame?.(()=>window.dispatchEvent(new Event('cb:request-repaint'))); } catch(_){}
    });

    row.appendChild(chk);
    row.appendChild(lbl);
    panel.appendChild(row);

    // Ressourcen-Adder
    var grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = '1fr 110px';
    grid.style.gap = '6px';
    grid.style.margin = '6px 0';

    var inpType = document.createElement('input');
    inpType.type = 'text';
    inpType.placeholder = 'Typ (wood, stone, …)';
    inpType.id = 'res-type';
    inpType.autocomplete = 'off';
    inpType.style.padding = '6px 8px';
    inpType.style.background = '#181818';
    inpType.style.border = '1px solid #333';
    inpType.style.color = '#eee';
    inpType.value = 'wood';

    var inpAmt = document.createElement('input');
    inpAmt.type = 'number';
    inpAmt.min = '1';
    inpAmt.step = '1';
    inpAmt.placeholder = 'Menge';
    inpAmt.id = 'res-amount';
    inpAmt.style.padding = '6px 8px';
    inpAmt.style.background = '#181818';
    inpAmt.style.border = '1px solid #333';
    inpAmt.style.color = '#eee';
    inpAmt.value = '10';

    grid.appendChild(inpType);
    grid.appendChild(inpAmt);
    panel.appendChild(grid);

    var action = document.createElement('div');
    action.style.display = 'flex';
    action.style.alignItems = 'center';
    action.style.gap = '8px';

    var btn = document.createElement('button');
    btn.textContent = 'Ressourcen hinzufügen';
    btn.style.padding = '6px 10px';
    btn.style.background = '#2b6cb0';
    btn.style.border = '1px solid #2a4365';
    btn.style.color = '#fff';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';

    var status = document.createElement('div');
    status.id = 'res-status';
    status.style.flex = '1';
    status.style.minHeight = '1.2em';

    btn.addEventListener('click', function(){
      var type = String(inpType.value||'').trim();
      var amount = Math.max(1, parseInt(inpAmt.value||'0',10) || 0);
      if (!type){
        status.textContent = 'Bitte Ressourcentyp angeben.';
        status.style.color = '#f6ad55';
        warn(MOD + ' add-res: fehlender Typ');
        return;
      }

      // 1) Event für lose gekoppelte Listener
      window.dispatchEvent(new CustomEvent('cb:add-resources', { detail:{ type, amount } }));

      // 2) Optional direkt in Game-State, falls API vorhanden
      var okDirect = false;
      try {
        if (window.Game && typeof Game.addResources === 'function'){
          Game.addResources(type, amount);
          okDirect = true;
        }
      } catch(_){}

      if (okDirect){
        status.textContent = '+' + amount + ' ' + type;
        status.style.color = '#68d391';
        ok(MOD + ' add-res OK: +' + amount + ' ' + type);
      } else {
        status.textContent = 'Event gesendet: +' + amount + ' ' + type + ' (Game.addResources nicht gefunden)';
        status.style.color = '#63b3ed';
        warn(MOD + ' add-res: Event gesendet, direkte API nicht verfügbar');
      }
    });

    action.appendChild(btn);
    action.appendChild(status);
    panel.appendChild(action);

    var rootPane = (root.querySelector && root.querySelector('.cb-ins-panel')) ? root.querySelector('.cb-ins-panel') : root;
    rootPane.appendChild(panel);
    panelAttached = true;
    ok(MOD + ' angehängt (vv16.5.5)');
  }

  function pickRoot(){
    return document.querySelector('#inspector') ||
           document.querySelector('#inspector-root') ||
           document.querySelector('.inspector-root') ||
           document.querySelector('[data-role="inspector"]');
  }

  function tryAttach(){
    var root = pickRoot();
    if (root && !panelAttached) buildPanel(root);
  }

  function startPolling(ms, maxMs){
    if (pollTimer) clearInterval(pollTimer);
    pollDeadline = Date.now() + (maxMs || 60000);
    pollTimer = setInterval(function(){
      if (panelAttached || Date.now()>pollDeadline){ clearInterval(pollTimer); pollTimer=0; return; }
      tryAttach();
    }, ms || 250);
  }

  function startObserver(){
    if (observer) return;
    try{
      observer = new MutationObserver(function(muts){
        for (var i=0;i<muts.length;i++){
          var list = muts[i].addedNodes;
          for (var j=0;j<list.length;j++){
            var n = list[j];
            if (n && n.nodeType===1){
              if (n.id==='inspector' || (n.querySelector && n.querySelector('#inspector'))){
                tryAttach();
              }
            }
          }
        }
      });
      observer.observe(document.body, { childList:true, subtree:true });
    }catch(_){}
  }

  // Hooks
  window.addEventListener('cb:game-started', function(){
    startObserver(); startPolling(250, 60000); tryAttach();
  });
  window.addEventListener('cb:inspector-open', function(){
    startObserver(); startPolling(250, 60000); tryAttach();
  });
  setTimeout(function(){ startObserver(); startPolling(250, 10000); tryAttach(); }, 1500);

})();
