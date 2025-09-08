/* ============================================================================
 * Inspector Core – v18.14.4
 *  - Overlay, Tabs, Slots, Responsive (Portrait/ Landscape)
 *  - Keine Auto-Open-Logik; Öffnen/Schließen nur via Events + Button
 *  - Signals:
 *      window.dispatchEvent(new CustomEvent('cb:inspector-open'))
 *      window.dispatchEvent(new CustomEvent('cb:inspector-close'))
 *  - Layout-Event für Submodule:
 *      window.dispatchEvent(new CustomEvent('ins:layout', {detail:{mode:'portrait'|'landscape'}}))
 * ========================================================================== */
(function () {
  'use strict';

  const VER = 'v18.14.4';
  const MOD = '[inspector.core]';

  // --------------------------------------------------------------------------
  // public API shell
  // --------------------------------------------------------------------------
  const __SLOTS__ = Object.create(null);
  const api = {
    mount(tabId, renderFn){                 // Submodule registrieren
      if (typeof renderFn === 'function') {
        const un = renderFn();
        (api.__mounted || (api.__mounted = {}))[tabId] = un || null;
      }
    },
    getSlot(name){ return __SLOTS__[name] || null; },
    signal(name, payload){ try{
      window.dispatchEvent(new CustomEvent(name, {detail: payload||{}}));
    }catch(_){/*noop*/} }
  };

  // global export (früh)
  window.__INSPECTOR_CORE__ = window.__INSPECTOR_CORE__ || {};
  window.__INSPECTOR_CORE__.api = api;
  window.__INSPECTOR_CORE__.version = VER;

  // --------------------------------------------------------------------------
  // minimal DOM helpers
  // --------------------------------------------------------------------------
  const $ = sel => document.querySelector(sel);
  const el = (tag, cls) => { const n = document.createElement(tag); if(cls) n.className = cls; return n; };

  // --------------------------------------------------------------------------
  // Overlay erstellen (einmal)
  // --------------------------------------------------------------------------
  let overlay, body, side, main, paneLogs, paneTests, panePaths, paneRes, tabsRow, foot;
  let activeTab = 'logs';
  let layoutMode = null; // 'portrait'/'landscape'

  function buildOverlay(){
    // Container
    overlay = el('div'); overlay.id = 'inspector'; overlay.setAttribute('aria-modal','true');
    const wrap = el('div','ins-wrap'); overlay.appendChild(wrap);

    // Panel
    const panel = el('div','ins-panel'); wrap.appendChild(panel);

    // Header
    const head = el('div','ins-head');
    const title = el('div','ins-title');
    title.innerHTML = `<strong>Inspector</strong> <span class="ins-ver">${VER}</span>`;
    tabsRow = el('div','ins-tabs'); // wird im Portrait oben angezeigt
    const btnClose = el('button','ins-close'); btnClose.type = 'button';
    btnClose.addEventListener('click', closeOverlay);
    head.append(title, tabsRow, btnClose);
    panel.appendChild(head);

    // Body -> 2-Spalten-Layout in Landscape
    body = el('div','ins-body ins-layout');
    // linke Sidebar (Landscape)
    side = el('div','ins-side');
    // Hauptbereich
    main = el('div','ins-main');
    body.append(side, main);
    panel.appendChild(body);

    // Tabs (echte Buttons, arbeiten für Portrait und Landscape)
    const mkTab = (id, label) => {
      const b = el('button','ins-tab'); b.dataset.tab = id; b.textContent = label;
      b.addEventListener('click',()=>activateTab(id));
      return b;
    };
    const TABS = [
      ['logs','Logs'], ['tests','Tests'], ['resources','Ressourcen'], ['paths','Pfade']
    ];
    TABS.forEach(([id, label])=>{
      const b1 = mkTab(id,label);
      const b2 = b1.cloneNode(true); // Duplikat für Sidebar (Landscape)
      // Portrait: Tabs oben
      tabsRow.appendChild(b1);
      // Landscape: Tabs links
      side.appendChild(b2);
    });

    // Slots (Portrait: Filter im Hauptbereich, Landscape: in der Sidebar)
    const sideControlsWrap = el('div','ins-side-controls');
    side.appendChild(sideControlsWrap);

    const mainControlsWrap = el('div','ins-main-controls');
    main.appendChild(mainControlsWrap);

    // Panes (je Tab)
    paneLogs = el('div','ins-pane ins-pane-logs active');
    paneTests = el('div','ins-pane ins-pane-tests');
    panePaths = el('div','ins-pane ins-pane-paths');
    paneRes  = el('div','ins-pane ins-pane-res');

    // Log-Pane enthält 2 Slots
    const slotLogsControls = el('div','slot-logs-controls'); slotLogsControls.id = 'ins-logs-controls';
    const slotLogsView     = el('div','slot-logs-view');     slotLogsView.id   = 'ins-logs-view';
    paneLogs.append(slotLogsControls, slotLogsView);

    // andere Panes enthalten je einen Slot
    const slotTests = el('div','slot-tests-view'); slotTests.id = 'ins-tests-view';
    const slotPaths = el('div','slot-paths-view'); slotPaths.id = 'ins-paths-view';
    const slotRes   = el('div','slot-resources-view'); slotRes.id = 'ins-resources-view';
    paneTests.appendChild(slotTests);
    panePaths.appendChild(slotPaths);
    paneRes.appendChild(slotRes);

    main.append(paneLogs, paneTests, panePaths, paneRes);

    // Footer
    foot = el('div','ins-foot');
    foot.innerHTML = `<span class="muted">© Inspector — Siedler-Mini</span>`;
    panel.appendChild(foot);

    // Slots registrieren
    __SLOTS__['logs-controls'] = slotLogsControls;
    __SLOTS__['logs-view']     = slotLogsView;
    __SLOTS__['tests-view']    = slotTests;
    __SLOTS__['paths-view']    = slotPaths;
    __SLOTS__['resources-view']= slotRes;

    document.body.appendChild(overlay);

    // Body-Scroll sperren während offen
    window.addEventListener('cb:inspector-open', openOverlay);
    window.addEventListener('cb:inspector-close', closeOverlay);

    // Layout initial + on rotate/resize
    const applyLayout = () => {
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      const newMode = isLandscape ? 'landscape' : 'portrait';
      if (newMode !== layoutMode) {
        layoutMode = newMode;
        overlay.setAttribute('data-layout', layoutMode);
        // Logs-Controls ggf. in Sidebar „umparken“
        moveLogControls(layoutMode);
        window.dispatchEvent(new CustomEvent('ins:layout',{detail:{mode:layoutMode}}));
      }
    };
    applyLayout();
    window.addEventListener('resize', applyLayout);
    window.addEventListener('orientationchange', applyLayout);

    console.log(MOD,'bereit',VER);
    window.dispatchEvent(new CustomEvent('inspector:ready',{detail:{version:VER}}));
  }

  function moveLogControls(mode){
    // Zeige Logs-Filter in Landscape links (Sidebar), sonst oben im Pane
    const lc = __SLOTS__['logs-controls'];
    if (!lc) return;
    if (mode === 'landscape') {
      if (!side.contains(lc)) side.querySelector('.ins-side-controls').appendChild(lc);
    } else {
      if (!paneLogs.contains(lc)) paneLogs.insertBefore(lc, paneLogs.firstChild);
    }
  }

  function ensureBuilt(){
    if (!overlay) buildOverlay();
  }

  // --------------------------------------------------------------------------
  // Open/Close + Tab
  // --------------------------------------------------------------------------
  function openOverlay(){
    ensureBuilt();
    overlay.style.display = 'flex';
    document.body.classList.add('inspector-open');
    // Tab aktivieren (beide Tab-Reihen synchronisieren)
    activateTab(activeTab || 'logs', true);
    window.dispatchEvent(new CustomEvent('inspector:open',{detail:{version:VER}}));
  }
  function closeOverlay(){
    if (!overlay) return;
    overlay.style.display = 'none';
    document.body.classList.remove('inspector-open');
    window.dispatchEvent(new CustomEvent('inspector:close',{detail:{version:VER}}));
  }

  function activateTab(id, skipFocus){
    activeTab = id;
    // Buttons synchronisieren (oben + links)
    overlay.querySelectorAll('.ins-tab').forEach(b=>{
      b.classList.toggle('active', b.dataset.tab === id);
    });
    // Panes umschalten
    paneLogs.classList.toggle('active', id==='logs');
    paneTests.classList.toggle('active', id==='tests');
    panePaths.classList.toggle('active', id==='paths');
    paneRes .classList.toggle('active', id==='resources');
    if (!skipFocus) {
      // optional Fokus auf ersten interaktiven Bereich
      const target = overlay.querySelector('.ins-pane.active') || overlay;
      target.focus?.();
    }
  }

  // --------------------------------------------------------------------------
  // init once
  // --------------------------------------------------------------------------
  if (!document.getElementById('inspector')) {
    // verzögert aufbauen, damit CSS geladen ist
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', buildOverlay, {once:true});
    } else {
      buildOverlay();
    }
  }

})();
