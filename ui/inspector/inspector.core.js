/* ============================================================================
 * Datei   : ui/inspector/inspector.core.js
 * Version : v18.16.2 (final)
 * Zweck   : Kern des Inspector-Overlays (Host, Tabs, View-Slots, API)
 *
 * WICHTIG
 * - Dieses Modul MUSS VOR allen anderen Inspector-Modulen geladen werden.
 *   Nur so existieren die Slots, wenn weitere Module ihre Tabs registrieren.
 *
 * Features
 * - Erzeugt das Overlay (#inspector) mit Header, Tabs und Content-Bereich
 * - Verwaltet Tabs (Buttons + aktives View) mit Synonym-Mapping
 * - Stellt API bereit (open/close/toggle/registerTab/mount/getSlot)
 * - Sendet cb:insp:tab:change bei Tabwechsel (für Auto-Refreshs)
 *
 * Änderungen ggü. deiner v18.16.1
 * - Bugfix: Der generische Slot (slots.view) wird NUR bei dynamischen Tabs
 *   angezeigt (z. B. „ui“). Bei bekannten Tabs bleibt er verborgen.
 * - Code & Kommentare vollständig strukturiert.
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.core]';

  // --------------------------------------------------------------------------
  // [1] Host erzeugen (nur einmal)
  // --------------------------------------------------------------------------
  function ensureHost(){
    let el = document.getElementById('inspector');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'inspector';
    el.setAttribute('aria-hidden','true');

    el.innerHTML = `
      <div class="insp-frame" role="dialog" aria-label="Inspector" aria-modal="true">
        <!-- Kopfzeile mit Tabs und Schließen-Button -->
        <div class="insp-header">
          <div class="insp-tabs" data-slot="tabs" role="tablist"></div>
          <button class="insp-close" type="button" aria-label="Schließen">Schließen</button>
        </div>

        <!-- Content-Bereich: bekannte Views + generischer "view"-Slot -->
        <div class="insp-content" data-slot="view">
          <div data-slot="logs-view"></div>
          <div data-slot="build-view" hidden></div>
          <div data-slot="paths-view" hidden></div>
          <div data-slot="res-view" hidden></div>
          <div data-slot="tests-view" hidden></div>
        </div>
      </div>`;
    document.body.appendChild(el);

    // Schließen-Button → Overlay schließen
    el.querySelector('.insp-close').addEventListener('click', ()=> API.close());

    return el;
  }

  const host = ensureHost();

  // --------------------------------------------------------------------------
  // [2] Slot-Referenzen & bekannte Views
  // --------------------------------------------------------------------------
  const slots = {
    tabs : host.querySelector('[data-slot="tabs"]'),
    view : host.querySelector('[data-slot="view"]'),     // generischer Slot (für neue Tabs)
    logs : host.querySelector('[data-slot="logs-view"]'),
    build: host.querySelector('[data-slot="build-view"]'),
    paths: host.querySelector('[data-slot="paths-view"]'),
    res  : host.querySelector('[data-slot="res-view"]'),
    tests: host.querySelector('[data-slot="tests-view"]')
  };

  const views = {
    logs : slots.logs,
    build: slots.build,
    paths: slots.paths,
    res  : slots.res,
    tests: slots.tests
    // Dynamische Tabs (z. B. „ui“) benutzen slots.view.
  };

  // --------------------------------------------------------------------------
  // [3] Tab-ID-Normalisierung (Synonyme)
  // --------------------------------------------------------------------------
  function normalizeId(id){
    if (!id) return 'logs';
    const s = String(id).toLowerCase().trim();

    if (['ress.','ress','resources','resource'].includes(s)) return 'res';
    if (['pfade','pfad','path','paths'].includes(s))         return 'paths';
    if (['event','events'].includes(s))                     return 'tests';
    return s;
  }

  // --------------------------------------------------------------------------
  // [4] Tab-Buttons verwalten
  // --------------------------------------------------------------------------
  const tabButtons = {}; // key = normalisierte ID

  function addTabButton(id, label){
    const norm = normalizeId(id);
    if (tabButtons[norm]) {
      if (label) tabButtons[norm].textContent = label;
      return;
    }
    const b = document.createElement('button');
    b.className = 'insp-tab';
    b.type = 'button';
    b.textContent = label || norm;
    b.dataset.tab = norm;
    b.setAttribute('role','tab');
    b.addEventListener('click', ()=> setActiveTab(norm));
    slots.tabs.appendChild(b);
    tabButtons[norm] = b;
  }

  // --------------------------------------------------------------------------
  // [5] Aktiven Tab setzen
  // --------------------------------------------------------------------------
  function setActiveTab(id){
    const norm = normalizeId(id);
    const isKnown = Object.prototype.hasOwnProperty.call(views, norm);

    // 1) bekannte Views ein-/ausblenden
    Object.entries(views).forEach(([key, el])=>{
      if (el) el.hidden = (key !== norm);
    });

    // 2) generischen Slot nur zeigen, wenn kein bekannter Tab aktiv ist
    if (slots.view) slots.view.hidden = isKnown;

    // 3) Tab-Buttons visuell markieren
    Object.entries(tabButtons).forEach(([key,b])=>{
      b.classList.toggle('active', key === norm);
    });

    // 4) Event cb:insp:tab:change (für Module mit Auto-Refresh)
    window.dispatchEvent(
      new CustomEvent('cb:insp:tab:change', { detail:{ tab:norm } })
    );
  }

  // --------------------------------------------------------------------------
  // [6] Öffentliche API
  // --------------------------------------------------------------------------
  const API = {
    /** Öffnet den Inspector (optional direkt mit Tab) */
    open(tab){
      host.classList.add('open');
      Object.assign(host.style, {
        display:'block', visibility:'visible', opacity:'1', pointerEvents:'auto'
      });
      host.setAttribute('aria-hidden','false');
      document.body.classList.add('inspector-open');
      setActiveTab(tab || 'logs');
    },

    /** Schließt den Inspector */
    close(){
      host.classList.remove('open');
      Object.assign(host.style, {
        display:'none', visibility:'hidden', opacity:'0', pointerEvents:'none'
      });
      host.setAttribute('aria-hidden','true');
      document.body.classList.remove('inspector-open');
    },

    /** Toggle (öffnet/schließt, optional Tab angeben) */
    toggle(tab){
      (getComputedStyle(host).display === 'none') ? API.open(tab) : API.close();
    },

    /** Registriert oder aktualisiert einen Tab */
    registerTab({ id, title, onShow }){
      const norm = normalizeId(id);
      addTabButton(norm, title || id);

      // Ziel-Slot: bekannter oder generischer Slot
      const slot = views[norm] || slots.view;

      if (slot && typeof onShow === 'function'){
        slot.innerHTML = '';
        onShow(slot);
      }
    },

    /** Kurzform */
    mount(id,onShow){ API.registerTab({ id, title:id, onShow }); },

    /** Zugriff auf bekannten Slot */
    getSlot(name){ return slots[name] || document.querySelector(`[data-slot="${name}"]`); }
  };

  // --------------------------------------------------------------------------
  // [7] API global registrieren
  // --------------------------------------------------------------------------
  window.Inspector = Object.assign(window.Inspector||{}, API);
  window.__INSPECTOR_CORE__ = { api: API };

  // --------------------------------------------------------------------------
  // [8] Standard-Tabs im Header
  // --------------------------------------------------------------------------
  addTabButton('logs','logs');
  addTabButton('build','build');
  addTabButton('paths','paths');
  addTabButton('res','resources');
  addTabButton('tests','tests');
  addTabButton('ui','ui'); // eigener Debug-Tab

  // --------------------------------------------------------------------------
  // [9] Startzustand + Ready-Event
  // --------------------------------------------------------------------------
  setActiveTab('logs');
  (window.CBLog?.info||console.info)(MOD,'bereit v%s','18.16.2');
  setTimeout(()=> window.dispatchEvent(new Event('inspector:ready')),0);
})();
