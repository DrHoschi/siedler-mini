/* ============================================================================
 * Inspector: Tests-Panel — v16.5.5
 * Projekt: Siedler-Mini
 * Features:
 *   - Pfad-Overlay Toggle (window.DEBUG_PATH_OVERLAY)
 *   - Ressourcen-Adder (type + amount)
 * Events:
 *   - dispatchEvent('cb:toggle-path-overlay', { detail:{ enabled } })
 *   - dispatchEvent('cb:add-resources',      { detail:{ type, amount } })
 * Verhalten:
 *   - Hängt sich NUR an den echten Inspector (#inspector), niemals Autocreate.
 *   - MutationObserver + sanftes Polling, damit das Panel andockt, auch wenn
 *     der Inspector erst beim Button-Klick gebaut wird.
 * Hinweise:
 *   - Diese Datei enthält KEINEN PathFinder-Code. PF bleibt in core/pathfinder.js.
 * ========================================================================== */
(function () {
  'use strict';

  var MOD = '[inspector.tests]';

  // kleine, leise Logger (fallen auf console zurück)
  function ok(m){ try{ (window.CBLog?.ok || console.log)(m); }catch(_){} }
  function warn(m){ try{ (window.CBLog?.warn || console.warn)(m); }catch(_){} }

  var panelAttached = false;   // wurde unser Tests-Panel schon angehängt?
  var pollTimer = 0;           // sanftes Polling (Sicherheitsnetz)
  var pollDeadline = 0;
  var observer = null;         // MutationObserver-Instanz

  // ---------------------------------------------------------------------------
  // Panel bauen und an echten Inspector (#inspector) hängen
  // ---------------------------------------------------------------------------
  function buildPanel(root){
    if (!root || panelAttached) return;

    var panel = document.createElement('div');
    panel.id = 'inspector-tests';
    panel.setAttribute('aria-label','Inspector Tests');
    panel.style.padding    = '10px';
    panel.style.borderTop  = '1px dashed #3a3a3a';
    panel.style.background = 'rgba(0,0,0,.12)';

    // Titel
    var title = document.createElement('div');
    title.textContent = 'Tests';
    title.style.fontWeight = '700';
    title.style.margin = '0 0 8px';
    panel.appendChild(title);

    // --- Toggle: Pfad-Overlay -------------------------------------------------
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
      try {
        // sanfter Repaint-Impuls für das Overlay
        window.requestAnimationFrame?.(() => window.dispatchEvent(new Event('cb:request-repaint')));
      } catch(_){}
    });

    row.appendChild(chk);
    row.appendChild(lbl);
    panel.appendChild(row);

    // --- Ressourcen-Adder (Typ + Menge) --------------------------------------
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
    btn.style.border = '1px solid #2a4365';   // ← FIX: korrekter CSS-String
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

    // Panel anhängen
    root.appendChild(panel);
    panelAttached = true;
    ok(MOD + ' angehängt (v16.5.5)');
  }

  // ---------------------------------------------------------------------------
  // Root-Finder: robust (Observer + Polling)
  // ---------------------------------------------------------------------------
  function tryAttach(){
    var root = document.querySelector('#inspector');
    if (root && !panelAttached) buildPanel(root);
  }

  function startPolling(ms, maxMs){
    if (pollTimer) clearInterval(pollTimer);
    pollDeadline = Date.now() + (maxMs || 60000); // Sicherheitsgrenze
    pollTimer = setInterval(function(){
      if (panelAttached || Date.now() > pollDeadline){
        clearInterval(pollTimer);
        pollTimer = 0;
        return;
      }
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
            if (n && n.nodeType === 1){
              if (n.id === 'inspector' || (n.querySelector && n.querySelector('#inspector'))){
                tryAttach();
              }
            }
          }
        }
      });
      observer.observe(document.body, { childList:true, subtree:true });
    }catch(_){}
  }

  // ---------------------------------------------------------------------------
  // Hooks: auf Spielstart / Inspector-Open reagieren
  // ---------------------------------------------------------------------------
  window.addEventListener('cb:game-started', function(){
    startObserver();
    startPolling(250, 60000);
    tryAttach();
  });

  // Optional: falls euer Inspector beim Öffnen ein Event feuert
  window.addEventListener('cb:inspector-open', function(){
    startObserver();
    startPolling(250, 60000);
    tryAttach();
  });

  // Fallback: auch ohne Events kurz nachladen probieren
  setTimeout(function(){
    startObserver();
    startPolling(250, 10000);
    tryAttach();
  }, 1500);

})();
