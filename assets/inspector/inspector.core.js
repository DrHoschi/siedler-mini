/* ============================================================================
 * Datei: assets/inspector/inspector.core.js
 * Projekt: Siedler-Mini
 * Version: v18.10.12
 *
 * Zweck:
 *   - Zentrales Inspector-Overlay (Fullscreen)
 *   - Tabs: Logs | Build | Pfade | Tests (Slots für Submodule)
 *   - Stabile API für Submodule (mount/getSlot/signal)
 *
 * Events:
 *   Empfangen:  cb:inspector-open, cb:inspector-close
 *   Senden:     cb:inspector-opened, cb:inspector-closed, cb:inspector-tab
 *
 * Abhängigkeiten:
 *   - KEINE harten; Submodule binden sich über window.__INSPECTOR_CORE__.api.mount()
 *
 * Style-Hinweis:
 *   - Visuelle Gestaltung kommt aus assets/inspector/inspector.css.
 *   - Dieses Core setzt nur minimale Inline-Styles, damit das Panel immer sichtbar ist.
 * ========================================================================== */
(function(){
  "use strict";

  const MOD = "[inspector.core]";
  const VER = "v18.10.12";
  const log = (...a)=> (window.CBLog?.info||console.log)(MOD, ...a);
  const warn= (...a)=> (window.CBLog?.warn||console.warn)(MOD, ...a);

  // ---------------------------------------------------------------------------
  // Root/Panel-Setup (einmalig)
  // ---------------------------------------------------------------------------
  const state = {
    isOpen: false,
    activeTab: "logs",
    mounts: {},          // { tabId: { render:fn, unmount:fn|null } }
    slots: {},           // Slot-Cache
  };

  // Root-Container
  let root = document.getElementById("inspector");
  if (!root){
    root = document.createElement("div");
    root.id = "inspector";
    // Minimal sichtbar halten – Feinschliff kommt aus CSS:
    root.style.cssText = "position:fixed;inset:0;display:none;z-index:2147483646;";
    document.body.appendChild(root);
  }

  // Panel-Struktur (Header/Tabs/Body/Footer)
  root.innerHTML = `
    <div class="ins-root">
      <div class="ins-panel" role="dialog" aria-label="Inspector" aria-modal="true">
        <div class="ins-head">
          <div class="ins-title">Inspector</div>
          <div class="ins-tabs" role="tablist" aria-label="Inspector Tabs">
            <button class="ins-tab" data-tab="logs"   role="tab" aria-selected="true">Logs</button>
            <button class="ins-tab" data-tab="build"  role="tab" aria-selected="false">Build</button>
            <button class="ins-tab" data-tab="paths"  role="tab" aria-selected="false">Pfade</button>
            <button class="ins-tab" data-tab="tests"  role="tab" aria-selected="false">Tests</button>
          </div>
          <button class="ins-close" title="Schließen" aria-label="Inspector schließen">×</button>
        </div>
        <div class="ins-body">
          <!-- LOGS -->
          <section class="ins-tabpage" data-page="logs" aria-labelledby="tab-logs">
            <div id="ins-logs-controls" class="slot-logs-controls"></div>
            <div id="ins-logs-view"     class="slot-logs-view"></div>
          </section>

          <!-- BUILD -->
          <section class="ins-tabpage" data-page="build" hidden aria-labelledby="tab-build">
            <div id="ins-build-body" class="slot-build-body"></div>
          </section>

          <!-- PATHS -->
          <section class="ins-tabpage" data-page="paths" hidden aria-labelledby="tab-paths">
            <div id="ins-paths-body" class="slot-paths-body"></div>
          </section>

          <!-- TESTS -->
          <section class="ins-tabpage" data-page="tests" hidden aria-labelledby="tab-tests">
            <div id="ins-tests-body" class="slot-tests-body"></div>
          </section>
        </div>
      </div>
    </div>
  `;

  const closeBtn = root.querySelector(".ins-close");
  const tabButtons = Array.from(root.querySelectorAll(".ins-tab"));

  // ---------------------------------------------------------------------------
  // Slot-API für Submodule
  // ---------------------------------------------------------------------------
  function getSlot(name){
    if (state.slots[name]) return state.slots[name];
    const el =
      root.querySelector(`#ins-${name}`) ||
      root.querySelector(`.slot-${name}`);
    if (!el) warn("Slot fehlt:", name);
    state.slots[name] = el || null;
    return state.slots[name];
  }

  // Tab-Mounting
  function mount(tabId, renderFn){
    if (typeof renderFn !== "function") return warn("mount ohne renderFn:", tabId);
    state.mounts[tabId] = { render: renderFn, unmount: null };
    // auto-mount, falls Tab aktuell aktiv ist
    if (state.activeTab === tabId && state.isOpen){
      const un = safeCallMount(tabId);
      state.mounts[tabId].unmount = un || null;
    }
  }

  function signal(name, payload){
    // Hook für Submodule, falls benötigt (optional)
    try{
      const ev = new CustomEvent("inspector:signal", { detail:{ name, payload } });
      window.dispatchEvent(ev);
    }catch(_){}
  }

  function safeCallMount(tabId){
    try{
      const m = state.mounts[tabId];
      if (!m || typeof m.render!=="function") return null;
      return m.render() || null; // darf optional eine Unmount-Funktion zurückgeben
    }catch(e){
      warn("mount-Fehler:", tabId, e?.message);
      return null;
    }
  }
  function safeCallUnmount(tabId){
    try{
      const m = state.mounts[tabId];
      if (m && typeof m.unmount==="function"){
        m.unmount();
        m.unmount = null;
      }
    }catch(e){
      warn("unmount-Fehler:", tabId, e?.message);
    }
  }

  // ---------------------------------------------------------------------------
  // Tab-Umschalten (zeigt genau 1 Tab, mount/unmount sauber)
  // ---------------------------------------------------------------------------
  function setActiveTab(tabId){
    if (state.activeTab === tabId) return;

    // bisherige Seite verstecken + unmounten
    const prev = state.activeTab;
    if (prev){
      const prevPage = root.querySelector(`.ins-tabpage[data-page="${prev}"]`);
      if (prevPage){ prevPage.hidden = true; }
      safeCallUnmount(prev);
    }

    // neuen Tab aktivieren
    state.activeTab = tabId;

    // Tabs optisch markieren
    tabButtons.forEach(btn=>{
      const on = (btn.dataset.tab === tabId);
      btn.setAttribute("aria-selected", on ? "true":"false");
      btn.classList.toggle("active", on);
    });

    // neue Seite zeigen + mounten
    const curPage = root.querySelector(`.ins-tabpage[data-page="${tabId}"]`);
    if (curPage){ curPage.hidden = false; }

    if (state.isOpen){
      const un = safeCallMount(tabId);
      if (state.mounts[tabId]) state.mounts[tabId].unmount = un || null;
    }

    // Event
    try{
      window.dispatchEvent(new CustomEvent("cb:inspector-tab", { detail:{ tab: tabId }}));
    }catch(_){}
  }

  // Klick-Handler Tabs
  tabButtons.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const t = btn.dataset.tab || "logs";
      setActiveTab(t);
    });
  });

  // ---------------------------------------------------------------------------
  // Open/Close/Toggle – inkl. Events
  // ---------------------------------------------------------------------------
  function open(){
    if (state.isOpen) return;
    state.isOpen = true;
    root.style.display = "block";
    document.body.classList.add("inspector-open");

    // aktiven Tab mounten
    const un = safeCallMount(state.activeTab);
    if (state.mounts[state.activeTab]) state.mounts[state.activeTab].unmount = un || null;

    try{ window.dispatchEvent(new Event("cb:inspector-opened")); }catch(_){}
    log("geöffnet", VER);
  }
  function close(){
    if (!state.isOpen) return;
    // aktiven Tab unmounten
    safeCallUnmount(state.activeTab);

    state.isOpen = false;
    root.style.display = "none";
    document.body.classList.remove("inspector-open");
    try{ window.dispatchEvent(new Event("cb:inspector-closed")); }catch(_){}
    log("geschlossen");
  }
  function toggle(force){
    const willOpen = (force==null) ? !state.isOpen : !!force;
    willOpen ? open() : close();
  }

  closeBtn.addEventListener("click", close);

  // Bridge-Events (externes Öffnen/Schließen)
  window.addEventListener("cb:inspector-open",  open);
  window.addEventListener("cb:inspector-close", close);

  // ---------------------------------------------------------------------------
  // Export-Core
  // ---------------------------------------------------------------------------
  window.__INSPECTOR_CORE__ = {
    version: VER,
    api: { mount, getSlot, signal, setActiveTab },
    ui:  { open, close, toggle },
  };

  // Für GameUI-Bridge zugänglich machen (falls sie uns vorher geladen hat)
  window.__INSPECTOR_API__ = window.__INSPECTOR_API__ || {};
  window.__INSPECTOR_API__.open   = open;
  window.__INSPECTOR_API__.close  = close;
  window.__INSPECTOR_API__.toggle = toggle;

  log("bereit", VER);
})();
