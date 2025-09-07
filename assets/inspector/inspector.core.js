/* ============================================================================
 * Inspector Core – v18.12.1 (stabil)
 * - Vollbild-Overlay (initial geschlossen)
 * - Tabs: logs / build / paths / tests
 * - Slots: #ins-logs-controls, #ins-logs-view
 * - Öffnen/Schließen via window.Inspector.open()/close() oder Events
 *     -> window.dispatchEvent(new Event('cb:inspector-open'))
 *     -> window.dispatchEvent(new Event('cb:inspector-close'))
 * ========================================================================== */
(function () {
  'use strict';

  var MOD = '[inspector.core]';
  var VER = 'v18.12.1';

  // ------------------------------------------------------------
  // Ein einziges Overlay erzeugen (falls noch nicht vorhanden)
  // ------------------------------------------------------------
  var root = document.getElementById('inspector');
  if (root) { try { root.remove(); } catch(_){} } // harte Säuberung
  root = document.createElement('div');
  root.id = 'inspector';
  root.setAttribute('aria-hidden', 'true'); // initial zu
  document.body.appendChild(root);

  // Wrapper + Panel
  root.innerHTML =
    '<div class="ins-wrap">'+
      '<div class="ins-panel" role="dialog" aria-modal="true" aria-label="Inspector">'+
        '<div class="ins-head">'+
          '<div class="ins-title">'+
            '<span class="ins-name">Inspector</span>'+
            '<span class="ins-ver" id="ins-ver">'+VER+'</span>'+
          '</div>'+
          '<div class="ins-tabs" role="tablist">'+
            '<button class="ins-tab active" data-tab="logs"  role="tab" aria-selected="true">Logs</button>'+
            '<button class="ins-tab"        data-tab="build" role="tab" aria-selected="false">Build</button>'+
            '<button class="ins-tab"        data-tab="paths" role="tab" aria-selected="false">Pfade</button>'+
            '<button class="ins-tab"        data-tab="tests" role="tab" aria-selected="false">Tests</button>'+
          '</div>'+
          '<button class="ins-close" title="Schließen" aria-label="Schließen"></button>'+
        '</div>'+
        '<div class="ins-body">'+
          '<div class="ins-pane ins-pane-logs active" id="tab-logs" role="tabpanel">'+
            '<div id="ins-logs-controls" class="slot-logs-controls"></div>'+
            '<div id="ins-logs-view" class="slot-logs-view"></div>'+
          '</div>'+
          '<div class="ins-pane" id="tab-build" role="tabpanel">'+
            '<div class="ins-empty">Build-Info (Platzhalter)</div>'+
          '</div>'+
          '<div class="ins-pane" id="tab-paths" role="tabpanel">'+
            '<div class="ins-empty">Pfade (Platzhalter)</div>'+
          '</div>'+
          '<div class="ins-pane" id="tab-tests" role="tabpanel">'+
            '<div class="ins-empty">Tests (Platzhalter)</div>'+
          '</div>'+
        '</div>'+
        '<div class="ins-foot"><span class="muted">Inspector bereit</span></div>'+
      '</div>'+
    '</div>';

  // ------------------------------------------------------------
  // Core-API für Submodule (Logs, …)
  // ------------------------------------------------------------
  var __SLOTS__ = Object.create(null);

  window.__INSPECTOR_CORE__ = window.__INSPECTOR_CORE__ || {};
  window.__INSPECTOR_CORE__.api = {
    mount: function(tabId, renderFn){
      // In dieser Version: sofort rendern (Tabs sind leichtgewichtig)
      if (typeof renderFn === 'function'){ renderFn(); }
      return function unmount(){};
    },
    getSlot: function(name){ return __SLOTS__[name] || null; },
    signal: function(name, payload){
      try { document.dispatchEvent(new CustomEvent('ins:'+name, {detail:payload||{}})); } catch(_){}
    }
  };

  // Slots registrieren
  __SLOTS__['logs-controls'] = root.querySelector('#ins-logs-controls');
  __SLOTS__['logs-view']     = root.querySelector('#ins-logs-view');

  // ------------------------------------------------------------
  // Open/Close
  // ------------------------------------------------------------
  var isOpen = false;

  function open(){
    if (isOpen) return;
    isOpen = true;
    root.removeAttribute('aria-hidden');
    document.body.classList.add('inspector-open');
    window.dispatchEvent(new Event('cb:inspector-open'));
    logOk('geöffnet', VER);
  }
  function close(){
    if (!isOpen) return;
    isOpen = false;
    root.setAttribute('aria-hidden','true');
    document.body.classList.remove('inspector-open');
    window.dispatchEvent(new Event('cb:inspector-close'));
    logOk('geschlossen');
  }
  function toggle(){ isOpen ? close() : open(); }

  // Close-Button
  root.querySelector('.ins-close').addEventListener('click', close);

  // ESC
  window.addEventListener('keydown', function(ev){
    if (!isOpen) return;
    if (ev.key === 'Escape'){ ev.preventDefault(); close(); }
  }, {passive:false});

  // Exporte
  window.Inspector = { open:open, close:close, toggle:toggle, version:VER };

  // ------------------------------------------------------------
  // Tabs
  // ------------------------------------------------------------
  var tabs = Array.prototype.slice.call(root.querySelectorAll('.ins-tab'));
  function setActive(tab){
    tabs.forEach(function(b){
      var on = (b.dataset.tab === tab);
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
      var pane = root.querySelector('#tab-'+b.dataset.tab);
      if (pane) pane.classList.toggle('active', on);
    });
    // Logs beim ersten Sichtbarwerden anstoßen
    if (tab === 'logs'){ try { window.dispatchEvent(new Event('cb:inspector-logs-show')); } catch(_){ } }
  }
  tabs.forEach(function(b){
    b.addEventListener('click', function(){ setActive(b.dataset.tab); });
  });

  // ------------------------------------------------------------
  // Logging (sanft über CBLog/console)
  // ------------------------------------------------------------
  function logOk(){ try{ (window.CBLog?.ok || console.log).apply(console, [MOD].concat([].slice.call(arguments))); }catch(_){ console.log.apply(console, [MOD].concat(arguments)); } }

  logOk('bereit', VER);

  // **WICHTIG**: NICHT auto-open!  (nur für Entwicklung per Console)
  // window.Inspector.open();

})();
