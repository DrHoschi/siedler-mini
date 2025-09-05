/* ============================================================================
 * assets/inspector/inspector.core.js — v18.10.7
 * Projekt: Siedler-Mini
 *
 * Zweck:
 * - Zentraler Inspector-Core (UI-Shell, Tabs, Mounting, Open/Close)
 * - Robuste Initialisierung (Race-Proof): wartet auf DOM + räumt Fallbacks weg
 * - API für ui-bridge (window.__INSPECTOR_API__)
 * - Slots für Teilmodule (Logs/Build/Paths/Tests)
 *
 * CODE-STYLE:
 * - Keine externen Abhängigkeiten
 * - Sanfte Logs via CBLog (fällt auf console.* zurück)
 * - Defensive DOM-Zugriffe (nie hart voraussetzen)
 *
 * HTML-Struktur (wird erzeugt):
 * <div id="inspector" class="ins-root" aria-label="Inspector" hidden>
 *   <div class="ins-backdrop" data-ins-close></div>
 *   <section class="ins-panel" role="dialog" aria-modal="true">
 *     <header class="ins-header">…Tabs/Controls…</header>
 *     <main class="ins-body">
 *       <div id="ins-slot-logs"   class="ins-slot" data-slot="logs"></div>
 *       <div id="ins-slot-build"  class="ins-slot" data-slot="build" hidden></div>
 *       <div id="ins-slot-paths"  class="ins-slot" data-slot="paths" hidden></div>
 *       <div id="ins-slot-tests"  class="ins-slot" data-slot="tests" hidden></div>
 *     </main>
 *     <footer class="ins-footer">
 *       <button class="ins-close" data-ins-close title="Inspector schließen">Schließen</button>
 *       <div class="ins-version">Inspector <span id="ins-ver">v18.10.7</span></div>
 *     </footer>
 *   </section>
 * </div>
 *
 * Öffentliche API (für GameUI / ui-bridge):
 *   window.__INSPECTOR_API__ = { open(), close(), toggle(force), select(tabId) }
 *
 * Events (sendet):
 *   cb:inspector-open / cb:inspector-close / cb:inspector-tab
 * ========================================================================== */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Logging helpers
  // ---------------------------------------------------------------------------
  var MOD = '[inspector.core]';
  var VER = 'v18.10.7';
  var log  = function(m){ try{ (window.CBLog?.info||console.log)(MOD+' '+m); }catch(_){ console.log(MOD+' '+m); } };
  var warn = function(m){ try{ (window.CBLog?.warn||console.warn)(MOD+' '+m); }catch(_){ console.warn(MOD+' '+m); } };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  var root   = null;     // #inspector
  var panel  = null;     // .ins-panel
  var tabsEl = null;     // <nav> Tabs
  var openState = false;
  var currentTab = 'logs';  // default Tab
  var built = false;

  // Mapping TabId -> SlotNodeId
  var TAB_TO_SLOT = {
    logs:  'ins-slot-logs',
    build: 'ins-slot-build',
    paths: 'ins-slot-paths',
    tests: 'ins-slot-tests'
  };

  // ---------------------------------------------------------------------------
  // DOM builders
  // ---------------------------------------------------------------------------
  function buildOnce(){
    if (built) return;

    // Existiert bereits? (z.B. nach Hot-Reload)
    root = document.getElementById('inspector');
    if (!root){
      root = document.createElement('div');
      root.id = 'inspector';
      root.className = 'ins-root';
      root.setAttribute('aria-label','Inspector');
      root.hidden = true;
      document.body.appendChild(root);
    }

    // Backdrop (zum Schließen beim Klick)
    var backdrop = root.querySelector('.ins-backdrop');
    if (!backdrop){
      backdrop = document.createElement('div');
      backdrop.className = 'ins-backdrop';
      backdrop.setAttribute('data-ins-close','');
      root.appendChild(backdrop);
    }

    // Panel
    panel = root.querySelector('.ins-panel');
    if (!panel){
      panel = document.createElement('section');
      panel.className = 'ins-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      root.appendChild(panel);
    }

    // Header (Tabs + Controls)
    var header = panel.querySelector('.ins-header');
    if (!header){
      header = document.createElement('header');
      header.className = 'ins-header';

      // Tabs
      tabsEl = document.createElement('nav');
      tabsEl.className = 'ins-tabs';
      tabsEl.setAttribute('role','tablist');

      var tabs = [
        {id:'logs',  label:'Logs'},
        {id:'build', label:'Build'},
        {id:'paths', label:'Pfade'},
        {id:'tests', label:'Tests'}
      ];
      tabs.forEach(function(t){
        var b = document.createElement('button');
        b.className = 'ins-tab';
        b.setAttribute('role','tab');
        b.dataset.tab = t.id;
        b.textContent = t.label;
        b.addEventListener('click', function(){ selectTab(t.id); });
        tabsEl.appendChild(b);
      });

      // Header Controls (rechts)
      var controls = document.createElement('div');
      controls.className = 'ins-controls';
      // (Platzhalter – spätere Bedienelemente für globalen Inspector)
      // z.B.: <span class="ins-badge">FPS 60</span>

      header.appendChild(tabsEl);
      header.appendChild(controls);
      panel.appendChild(header);
    } else {
      tabsEl = header.querySelector('.ins-tabs');
    }

    // Body
    var body = panel.querySelector('.ins-body');
    if (!body){
      body = document.createElement('main');
      body.className = 'ins-body';

      // Slots
      var slotLogs  = document.createElement('div'); slotLogs.id  = 'ins-slot-logs';  slotLogs.className  = 'ins-slot'; slotLogs.dataset.slot='logs';
      var slotBuild = document.createElement('div'); slotBuild.id = 'ins-slot-build'; slotBuild.className = 'ins-slot'; slotBuild.dataset.slot='build'; slotBuild.hidden = true;
      var slotPaths = document.createElement('div'); slotPaths.id = 'ins-slot-paths'; slotPaths.className = 'ins-slot'; slotPaths.dataset.slot='paths'; slotPaths.hidden = true;
      var slotTests = document.createElement('div'); slotTests.id = 'ins-slot-tests'; slotTests.className = 'ins-slot'; slotTests.dataset.slot='tests'; slotTests.hidden = true;

      body.appendChild(slotLogs);
      body.appendChild(slotBuild);
      body.appendChild(slotPaths);
      body.appendChild(slotTests);

      panel.appendChild(body);
    }

    // Footer
    var footer = panel.querySelector('.ins-footer');
    if (!footer){
      footer = document.createElement('footer');
      footer.className = 'ins-footer';

      var btnClose = document.createElement('button');
      btnClose.className = 'ins-close';
      btnClose.textContent = 'Schließen';
      btnClose.setAttribute('data-ins-close','');
      btnClose.title = 'Inspector schließen';

      var ver = document.createElement('div');
      ver.className = 'ins-version';
      ver.innerHTML = 'Inspector <span id="ins-ver"></span>';

      footer.appendChild(btnClose);
      footer.appendChild(ver);
      panel.appendChild(footer);
    }
    var verSpan = panel.querySelector('#ins-ver');
    if (verSpan) verSpan.textContent = VER;

    // Close-Handler
    root.addEventListener('click', function(ev){
      var t = ev.target;
      if (t && t.hasAttribute && t.hasAttribute('data-ins-close')){
        close();
      }
    });

    // Fallback-Kästchen (aus ui-bridge) wegräumen, falls vorhanden
    try {
      var fb = document.getElementById('inspector-fallback');
      if (fb) fb.remove();
      var probe = document.getElementById('inspector-probe');
      if (probe) probe.remove();
    } catch(_){}

    built = true;
    log('bereit ('+VER+')');
    // initial aktiver Tab
    selectTab(currentTab);
  }

  // ---------------------------------------------------------------------------
  // Tab switching
  // ---------------------------------------------------------------------------
  function selectTab(tabId){
    if (!built) buildOnce();
    currentTab = TAB_TO_SLOT[tabId] ? tabId : 'logs';

    // Tabs markieren
    if (tabsEl){
      var btns = tabsEl.querySelectorAll('.ins-tab');
      btns.forEach(function(b){
        var act = (b.dataset.tab === currentTab);
        b.classList.toggle('active', act);
        b.setAttribute('aria-selected', act ? 'true' : 'false');
        b.tabIndex = act ? 0 : -1;
      });
    }

    // Slots schalten
    Object.keys(TAB_TO_SLOT).forEach(function(k){
      var id = TAB_TO_SLOT[k];
      var node = document.getElementById(id);
      if (node) node.hidden = (k !== currentTab);
    });

    try { window.dispatchEvent(new CustomEvent('cb:inspector-tab', { detail:{ tab: currentTab } })); } catch(_){}
  }

  // ---------------------------------------------------------------------------
  // Open / Close
  // ---------------------------------------------------------------------------
  function open(){
    if (!built) buildOnce();
    if (openState) return;
    root.hidden = false;
    root.classList.add('open');
    openState = true;
    try { window.dispatchEvent(new Event('cb:inspector-open')); } catch(_){}
    // Fokus auf Panel (ESC kann später per Keydown in tests/paths behandelt werden)
    try { panel?.focus?.(); }catch(_){}
  }
  function close(){
    if (!built) buildOnce();
    if (!openState) return;
    root.classList.remove('open');
    root.hidden = true;
    openState = false;
    try { window.dispatchEvent(new Event('cb:inspector-close')); } catch(_){}
  }
  function toggle(force){
    if (!built) buildOnce();
    var willOpen = (force == null) ? !openState : !!force;
    willOpen ? open() : close();
  }

  // ---------------------------------------------------------------------------
  // Public API (für ui-bridge)
  // ---------------------------------------------------------------------------
  window.__INSPECTOR_API__ = {
    version: VER,
    open: open,
    close: close,
    toggle: toggle,
    select: selectTab
  };

  // ---------------------------------------------------------------------------
  // Boot: DOMReady → Build + kleine visuelle Herzschlag-Klasse
  // ---------------------------------------------------------------------------
  function ready(fn){
    if (document.readyState === 'complete' || document.readyState === 'interactive'){
      setTimeout(fn, 0);
    } else {
      document.addEventListener('DOMContentLoaded', fn, { once:true });
    }
  }
  ready(function(){
    buildOnce();

    // Herzschlag (CSS-Animation optional)
    try {
      root.classList.add('mounted');
      setTimeout(function(){ root.classList.remove('mounted'); }, 600);
    } catch(_){}
  });

})();
