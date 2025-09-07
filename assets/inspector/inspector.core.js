/* ============================================================================
 * Inspector Core – v18.13.1
 *  - Overlay + Tabs
 *  - Fallback-Overlay: robust, 1x, korrekt schließbar
 *  - Landscape: Sidebar links (Tabs) + Side-Extra-Slot für Logs-Filter
 *  - Events: cb:inspector-open / cb:inspector-close
 * ========================================================================== */
(function(){
  "use strict";

  const MOD = "[inspector.core]";
  const VER = "v18.13.1";

  // ---------- State ----------------------------------------------------------
  const S = {
    open: false,
    active: "logs",
    el: {
      root: null, wrap: null, panel: null,
      head: null, title: null, ver: null,
      tabsTop: null, // ursprüngliche Tabbar (im Header)
      body: null, foot: null,
      // Panes:
      paneLogs: null, panePaths: null, paneTests: null, paneRes: null,
      // Landscape-Sidebar:
      sidebar: null, sideTablist: null, sideExtra: null,
      // Slots für Submodule:
      logsControls: null, logsView: null,
      // Fallback:
      fallback: null
    }
  };

  // ---------- Utilities ------------------------------------------------------
  const $ = (sel,root=document) => root.querySelector(sel);
  const el = (tag,cls) => { const n=document.createElement(tag); if(cls) n.className=cls; return n; };
  const on = (t,ev,fn,opt)=> t.addEventListener(ev,fn,opt||false);
  const emit = (name,detail)=> window.dispatchEvent(new CustomEvent(name,{detail}));

  const isLandscape = () => window.matchMedia("(orientation: landscape)").matches;

  // ---------- DOM Build ------------------------------------------------------
  function buildDOM(){
    // Root
    const root = el("div"); root.id = "inspector"; root.setAttribute("role","dialog"); root.setAttribute("aria-modal","true");
    const wrap = el("div","ins-wrap");
    const panel = el("div","ins-panel");
    root.appendChild(wrap); wrap.appendChild(panel);

    // Header
    const head = el("div","ins-head");
    const title = el("div","ins-title"); title.textContent = "Inspector";
    const ver = el("span","ins-ver"); ver.textContent = VER.replace(/^v/,"");
    title.appendChild(ver);

    const tabsTop = el("div","ins-tabs"); // Portrait-Tabbar (wird in Landscape versteckt)
    tabsTop.innerHTML = `
      <button class="ins-tab" data-tab="logs">Logs</button>
      <button class="ins-tab" data-tab="tests">Tests</button>
      <button class="ins-tab" data-tab="resources">Ressourcen</button>
      <button class="ins-tab" data-tab="paths">Pfade</button>
    `;

    const btnClose = el("button","ins-close"); btnClose.title = "Schließen";
    btnClose.addEventListener("click", close);

    head.appendChild(title);
    head.appendChild(tabsTop);
    head.appendChild(btnClose);

    // Body + Sidebar-Struktur
    const body = el("div","ins-body");

    // Sidebar (nur sichtbar im Landscape)
    const sidebar = el("aside","ins-sidebar");
    const sideTablist = el("div","ins-tabs side");         // hier hängen wir tabsTop hinein (um)
    const sideExtra   = el("div","ins-side-extra");        // hierhin wandern im Logs-Tab die Filter
    sidebar.appendChild(sideTablist);
    sidebar.appendChild(sideExtra);

    // Panes (Content rechts)
    const paneLogs = el("div","ins-pane ins-pane-logs active");
    const panePaths= el("div","ins-pane ins-pane-paths");
    const paneTests= el("div","ins-pane ins-pane-tests");
    const paneRes  = el("div","ins-pane ins-pane-resources");

    // Slots (Logs)
    paneLogs.innerHTML = `
      <div id="ins-logs-controls" class="slot-logs-controls"></div>
      <div id="ins-logs-view" class="slot-logs-view"></div>
    `;

    // Platzhalter für andere Tabs (Inhalte liefert jeweiliges Modul)
    panePaths.innerHTML = `<div id="ins-paths-root" class="slot-paths-root"></div>`;
    paneTests.innerHTML = `<div id="ins-tests-root" class="slot-tests-root"></div>`;
    paneRes.innerHTML   = `<div id="ins-res-root" class="slot-res-root"></div>`;

    // Fuß
    const foot = el("div","ins-foot");
    foot.innerHTML = `<span class="muted">© Inspector — Siedler-Mini</span>`;

    // Zusammenbau
    panel.appendChild(head);
    panel.appendChild(body);
    panel.appendChild(foot);

    // Body befüllen: Sidebar + Content-Stack
    body.appendChild(sidebar);
    body.appendChild(paneLogs);
    body.appendChild(paneTests);
    body.appendChild(paneRes);
    body.appendChild(panePaths);

    // Fallback (lazy erstellt)
    const fb = el("div","ins-fallback hidden");
    fb.innerHTML = `
      <div class="ins-fb-card">
        <div class="ins-fb-head">
          <strong>Inspector (Fallback)</strong>
          <button class="ins-fb-close" type="button">Schließen</button>
        </div>
        <div class="ins-fb-body">Inspector lädt…</div>
      </div>`;
    document.body.appendChild(fb);

    // Store refs
    Object.assign(S.el,{root,wrap,panel,head,title,ver,tabsTop,body,foot,
      sidebar, sideTablist, sideExtra,
      paneLogs,panePaths,paneTests,paneRes,
      logsControls: $("#ins-logs-controls",paneLogs),
      logsView    : $("#ins-logs-view",paneLogs),
      fallback: fb
    });

    // Events
    // Tab-Klick
    head.addEventListener("click", (ev)=>{
      const b = ev.target.closest(".ins-tab"); if(!b) return;
      activate(b.dataset.tab);
    });

    // Fallback schließen (nur das Fallback!)
    $(".ins-fb-close", fb).addEventListener("click", ()=> {
      fb.classList.add("hidden");
    });

    // Orientation/Layout Umschalten
    on(window,"resize",layout);
    on(window,"orientationchange",layout);

    // In DOM hängen (aber erst sichtbar, wenn open())
    document.body.appendChild(root);
  }

  // ---------- Layout ---------------------------------------------------------
  function layout(){
    const L = isLandscape();
    // Tabs in Sidebar umhängen (1:1 Node verschieben; keine Duplikate)
    if (L) {
      if (!S.el.sideTablist.contains(S.el.tabsTop)) {
        S.el.sideTablist.appendChild(S.el.tabsTop);
      }
      // Im Logs-Tab Filter links anzeigen
      if (S.active === "logs" && !S.el.sideExtra.contains(S.el.logsControls)) {
        S.el.sideExtra.appendChild(S.el.logsControls);
      }
    } else {
      // Tabs zurück in Header
      if (!S.el.head.contains(S.el.tabsTop)) {
        S.el.head.insertBefore(S.el.tabsTop, S.el.head.querySelector(".ins-close"));
      }
      // Filter zurück in das Pane
      if (!S.el.paneLogs.contains(S.el.logsControls)) {
        const before = S.el.logsView;
        S.el.paneLogs.insertBefore(S.el.logsControls, before);
      }
    }
    // Header-Tab-Active neu markieren (weil verschoben)
    markActiveTab();
  }

  function markActiveTab(){
    const all = S.el.root.querySelectorAll(".ins-tab");
    all.forEach(b => b.classList.toggle("active", b.dataset.tab === S.active));
  }

  function activate(tab){
    S.active = tab;
    // Panes schalten
    S.el.paneLogs.classList.toggle("active", tab==="logs");
    S.el.paneTests.classList.toggle("active", tab==="tests");
    S.el.paneRes.classList.toggle("active", tab==="resources");
    S.el.panePaths.classList.toggle("active", tab==="paths");
    markActiveTab();
    layout(); // sorgt u.a. dafür, dass Logs-Filter bei Landscape links landet
    // Signal an Submodule
    window.dispatchEvent(new CustomEvent("ins:tab-change",{detail:{tab}}));
  }

  // ---------- Open / Close ---------------------------------------------------
  function open(){
    if (S.open) return;
    S.open = true;
    document.body.classList.add("inspector-open");
    S.el.root.style.display = "flex";
    layout();
    activate(S.active || "logs");
    emit("cb:inspector-open");
  }

  function close(){
    if (!S.open) return;
    S.open = false;
    document.body.classList.remove("inspector-open");
    S.el.root.style.display = "none";
    emit("cb:inspector-close");
  }

  // ---------- Public API für Submodule --------------------------------------
  const CORE_API = {
    ver: VER,
    getSlot(name){
      if (name==="logs-controls") return S.el.logsControls;
      if (name==="logs-view")     return S.el.logsView;
      if (name==="paths-root")    return $("#ins-paths-root");
      if (name==="tests-root")    return $("#ins-tests-root");
      if (name==="res-root")      return $("#ins-res-root");
      return null;
    },
    mount(tabId, renderFn){
      // sofort rendern; optional Unmount ignorieren (kleine App)
      try { renderFn(); } catch(e){ console.warn(MOD,"mount error",e); }
    },
    open, close,
    // helper für außen (UI-Bridge)
    toggle(){ S.open ? close() : open(); }
  };

  // ---------- Bootstrap ------------------------------------------------------
  function showFallbackOnce(){
    // Blende Fallback kurz ein, falls Core länger braucht
    // (Wir halten ihn bereit, aber zeigen ihn nur
    // falls der Inspector nach 800ms noch nicht offen ist.)
    const fb = S.el.fallback;
    fb.classList.add("hidden");
    setTimeout(()=>{
      if (!S.open && S.el.root && S.el.root.style.display!=="flex") {
        fb.classList.remove("hidden");
      }
    }, 800);
    // Sobald Core geöffnet hat, Fallback sicher ausblenden
    on(window,"cb:inspector-open",()=> fb.classList.add("hidden"),{once:true});
  }

  function wireGlobal(){
    // API veröffentlichen
    window.__INSPECTOR_CORE__ = window.__INSPECTOR_CORE__ || {};
    window.__INSPECTOR_CORE__.api = CORE_API;

    // UI-Bridge kompatible Toggles
    window.GameUI = window.GameUI || {};
    window.GameUI.toggleInspector = CORE_API.toggle;

    // Start-Log
    (window.CBLog?.ok || console.log)(MOD, "bereit", VER);
  }

  // Build & init
  buildDOM();
  wireGlobal();
  showFallbackOnce();

  // Standard-Start: geschlossen
  CORE_API.close();

  /* === Responsive Sidebar (Portrait ↔ Landscape) ============================ */
(function responsiveSidebar(){
  const root = document.getElementById('inspector');
  if (!root) return;

  const panel      = root.querySelector('.ins-panel');
  const head       = root.querySelector('.ins-head');
  const tabs       = root.querySelector('.ins-tabs');
  const body       = root.querySelector('.ins-body');
  const paneLogs   = root.querySelector('#tab-logs, .ins-pane-logs') || root.querySelector('.ins-pane'); // tolerant
  const logsCtrl   = root.querySelector('#ins-logs-controls, .slot-logs-controls');
  if (!panel || !head || !tabs || !body) return;

  // Sidebar anlegen (einmal)
  let aside = panel.querySelector('.ins-aside');
  if (!aside){
    aside = document.createElement('aside');
    aside.className = 'ins-aside';
    // in Grid-Landscape wird sie von CSS positioniert; in Portrait bleibt sie leer
    panel.insertBefore(aside, body);
  }

  // Platzhalter merken, um Elemente verlustfrei zurück zu stecken
  function makeAnchor(el){
    if (!el || el.__anchor) return;
    const a = document.createComment('anchor:'+ (el.id || el.className || ''));
    el.parentNode.insertBefore(a, el);
    el.__anchor = a;
  }
  function restore(el){
    if (el && el.__anchor && el.__anchor.parentNode){
      el.__anchor.parentNode.insertBefore(el, el.__anchor.nextSibling);
    }
  }
  makeAnchor(tabs);
  makeAnchor(logsCtrl);

  // Umschalten
  function apply(){
    const landscape = window.matchMedia('(orientation: landscape)').matches
                   || (window.innerWidth > window.innerHeight);

    if (landscape){
      // Tabs in die Sidebar
      if (tabs && tabs.parentNode !== aside) aside.appendChild(tabs);

      // Log-Filter ebenfalls in Sidebar – aber nur anzeigen, wenn Logs-Tab aktiv ist
      if (logsCtrl){
        aside.appendChild(logsCtrl);
        // kleine UX: bei Tabwechsel verstecken/zeigen wir die Controls automatisch
        const onTabChange = () => {
          const active = root.querySelector('.ins-tab.active');
          const isLogs = !!(active && /logs/i.test(active.textContent || active.dataset?.tab || ''));
          logsCtrl.style.display = isLogs ? '' : 'none';
        };
        // einmal sofort & bei jedem Klick auf Tabs
        onTabChange();
        tabs.addEventListener('click', onTabChange, { passive:true });
      }
    } else {
      // Portrait: alles an ursprüngliche Stellen
      restore(tabs);
      restore(logsCtrl);
      if (logsCtrl) logsCtrl.style.display = '';
    }
  }

  // initial + bei Änderungen
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
})();
})();
