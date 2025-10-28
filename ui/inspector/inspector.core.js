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
/* ============================================================================
 * Datei   : ui/inspector/inspector.core.js
 * Version : v18.16.3 (final fix)
 * Zweck   : Inspector-Overlay (Host, Tabs, Views, API)
 * Fix     : Eigener "generic-view" für dynamische Tabs (z. B. "ui").
 *           Der Container (data-slot="view") bleibt IMMER sichtbar.
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.core]';

  // Host erzeugen
  function ensureHost(){
    let el = document.getElementById('inspector');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'inspector';
    el.setAttribute('aria-hidden','true');

    el.innerHTML = `
      <div class="insp-frame" role="dialog" aria-label="Inspector" aria-modal="true">
        <div class="insp-header">
          <div class="insp-tabs" data-slot="tabs" role="tablist"></div>
          <button class="insp-close" type="button" aria-label="Schließen">Schließen</button>
        </div>

        <!-- Content-Container: enthält alle bekannten Views + einen generischen View -->
        <div class="insp-content" data-slot="view">
          <div data-slot="logs-view"></div>
          <div data-slot="build-view" hidden></div>
          <div data-slot="paths-view" hidden></div>
          <div data-slot="res-view" hidden></div>
          <div data-slot="tests-view" hidden></div>
          <!-- NEU: eigener Slot nur für dynamische Tabs -->
          <div data-slot="generic-view" hidden></div>
        </div>
      </div>`;
    document.body.appendChild(el);

    el.querySelector('.insp-close').addEventListener('click', ()=> API.close());
    return el;
  }

  const host = ensureHost();

  // Slots
  const container = host.querySelector('[data-slot="view"]'); // IMMER sichtbar
  const slots = {
    tabs    : host.querySelector('[data-slot="tabs"]'),
    container,
    logs    : host.querySelector('[data-slot="logs-view"]'),
    build   : host.querySelector('[data-slot="build-view"]'),
    paths   : host.querySelector('[data-slot="paths-view"]'),
    res     : host.querySelector('[data-slot="res-view"]'),
    tests   : host.querySelector('[data-slot="tests-view"]'),
    generic : host.querySelector('[data-slot="generic-view"]')
  };

  // Sicherstellen, dass generic existiert (falls alt. HTML ohne generic)
  if (!slots.generic) {
    const gen = document.createElement('div');
    gen.setAttribute('data-slot','generic-view');
    gen.hidden = true;
    slots.container.appendChild(gen);
    slots.generic = gen;
  }

  // Bekannte Views
  const views = {
    logs : slots.logs,
    build: slots.build,
    paths: slots.paths,
    res  : slots.res,
    tests: slots.tests
    // dynamische Tabs benutzen slots.generic
  };

  // Tab-ID normalisieren
  function normalizeId(id){
    if (!id) return 'logs';
    const s = String(id).toLowerCase().trim();
    if (['ress.','ress','resources','resource'].includes(s)) return 'res';
    if (['pfade','pfad','path','paths'].includes(s))         return 'paths';
    if (['event','events'].includes(s))                      return 'tests';
    return s; // z. B. "ui"
  }

  // Tab-Buttons
  const tabButtons = {};
  function addTabButton(id, label){
    const norm = normalizeId(id);
    if (tabButtons[norm]) { if (label) tabButtons[norm].textContent = label; return; }
    const b = document.createElement('button');
    b.className = 'insp-tab'; b.type='button';
    b.textContent = label || norm; b.dataset.tab = norm; b.setAttribute('role','tab');
    b.addEventListener('click', ()=> setActiveTab(norm));
    slots.tabs.appendChild(b); tabButtons[norm]=b;
  }

  // Aktiven Tab setzen (Container bleibt sichtbar!)
  function setActiveTab(id){
    const norm = normalizeId(id);
    const isKnown = Object.prototype.hasOwnProperty.call(views, norm);

    // bekannte Views ein-/ausblenden
    Object.entries(views).forEach(([key, el])=>{
      if (el) el.hidden = (key !== norm);
    });

    // generischen View zeigen, wenn KEIN bekannter Tab aktiv ist (z. B. "ui")
    if (slots.generic) slots.generic.hidden = isKnown;

    // Buttons markieren
    Object.entries(tabButtons).forEach(([key,b])=>{
      b.classList.toggle('active', key === norm);
    });

    // Wechsel melden
    window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail:{ tab:norm } }));
  }

  // API
  const API = {
    open(tab){
      host.classList.add('open');
      Object.assign(host.style, {
        display:'block', visibility:'visible', opacity:'1', pointerEvents:'auto'
      });
      host.setAttribute('aria-hidden','false');
      document.body.classList.add('inspector-open');
      setActiveTab(tab || 'logs');
    },
    close(){
      host.classList.remove('open');
      Object.assign(host.style, {
        display:'none', visibility:'hidden', opacity:'0', pointerEvents:'none'
      });
      host.setAttribute('aria-hidden','true');
      document.body.classList.remove('inspector-open');
    },
    toggle(tab){
      (getComputedStyle(host).display==='none') ? API.open(tab) : API.close();
    },
    registerTab({ id, title, onShow }){
      const norm = normalizeId(id);
      addTabButton(norm, title || id);

      // Ziel-Slot: bekannter Slot ODER der neue generic-view
      const slot = views[norm] || slots.generic;

      if (slot && typeof onShow === 'function'){
        slot.innerHTML = '';
        onShow(slot);
      }
    },
    mount(id,onShow){ API.registerTab({ id, title:id, onShow }); },
    getSlot(name){
      return (name==='view') ? slots.container : (slots[name] || document.querySelector(`[data-slot="${name}"]`));
    }
  };

  // global
  window.Inspector = Object.assign(window.Inspector||{}, API);
  window.__INSPECTOR_CORE__ = { api: API };

  // Standard-Buttons
  addTabButton('logs','logs');
  addTabButton('build','build');
  addTabButton('paths','paths');
  addTabButton('res','resources');
  addTabButton('tests','tests');
  addTabButton('ui','ui'); // dynamischer Tab → generic-view

  // Start + Ready
  setActiveTab('logs');
  (window.CBLog?.info||console.info)(MOD,'bereit v%s','18.16.3');
  setTimeout(()=> window.dispatchEvent(new Event('inspector:ready')),0);
})();
