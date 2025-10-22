/* ============================================================================
 * Datei   : ui/inspector/inspector.core.js
 * Version : v18.16.1
 * Zweck   : Kern des Inspector-Overlays (Host, Tabs, View-Slots, API)
 *
 * WICHTIG
 * - Dieses Modul muss VOR allen anderen Inspector-Modulen geladen werden,
 *   damit Tabs und Slots existieren, wenn sich weitere Module registrieren.
 *
 * Features
 * - Erzeugt Host-Overlay (#inspector) inkl. Header, Tabs, Content-Bereich
 * - Verwaltet Tabs (Buttons + aktives View), inkl. Synonym-Mapping
 * - Stellt eine öffentliche API bereit (open/close/toggle/registerTab/…)
 * - Sendet cb:insp:tab:change-Event bei Tabwechsel (für Auto-Refreshs)
 *
 * Anpassungen ggü. Baseline:
 * - Normierung von Tab-IDs (z.B. "resources" -> "res", "pfade" -> "paths")
 * - Standard-Buttons inkl. "UI"-Tab (damit dein inspector.ui.js sofort andockt)
 * - Fallback-Rendering: unbekannte Tabs nutzen den generischen "view"-Slot
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.core]';

  // --------------------------------------------------------------------------
  // Host erzeugen (nur einmal). Der Host enthält:
  // - Header mit Tab-Buttons und Close-Button
  // - Content-Bereich mit vordefinierten Slots (logs/build/paths/res/tests)
  //   + einen generischen "view"-Slot für dynamische/zusätzliche Tabs (z.B. "ui")
  // --------------------------------------------------------------------------
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

    // Close-Button -> Inspector schließen
    el.querySelector('.insp-close').addEventListener('click', ()=> API.close());

    return el;
  }

  const host = ensureHost();

  // Referenzen auf Slots/Views
  const slots = {
    tabs : host.querySelector('[data-slot="tabs"]'),
    view : host.querySelector('[data-slot="view"]'),         // generischer Slot
    logs : host.querySelector('[data-slot="logs-view"]'),
    build: host.querySelector('[data-slot="build-view"]'),
    paths: host.querySelector('[data-slot="paths-view"]'),
    res  : host.querySelector('[data-slot="res-view"]'),
    tests: host.querySelector('[data-slot="tests-view"]')
  };

  // Bekannte, benannte Views (werden beim Tabwechsel gezielt hidden/shown)
  const views = {
    logs : slots.logs,
    build: slots.build,
    paths: slots.paths,
    res  : slots.res,
    tests: slots.tests
    // Hinweis: Für zusätzliche Tabs (z.B. "ui") gibt es KEINEN eigenen Slot.
    // Sie rendern in den generischen Slot "slots.view" und werden über
    // das Hiding der bekannten Views sichtbar gemacht.
  };

  // --------------------------------------------------------------------------
  // Tab-ID normalisieren (Synonyme tolerieren, alles lowercase)
  // --------------------------------------------------------------------------
  function normalizeId(id){
    if (!id) return 'logs';
    const s = String(id).toLowerCase().trim();

    // Ressourcen (Synonyme)
    if (s === 'ress.' || s === 'ress' || s === 'resources' || s === 'resource') return 'res';

    // Paths/Pfade (Synonyme)
    if (s === 'pfade' || s === 'pfad' || s === 'path' || s === 'paths') return 'paths';

    // Events-Tab (früher teils "events" genannt, steckt heute in "tests")
    if (s === 'event' || s === 'events') return 'tests';

    // Standard: unbekanntes Label unverändert zurück (z.B. "ui")
    return s;
  }

  // --------------------------------------------------------------------------
  // Tab-Button-Verwaltung
  // --------------------------------------------------------------------------
  const tabButtons = {}; // key = normierte ID

  function addTabButton(id, label){
    const norm = normalizeId(id);
    if (tabButtons[norm]) {
      // Button existiert – ggf. Titel aktualisieren und zurück
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
  // Aktiven Tab setzen:
  // - Versteckt bekannte Views (logs/build/paths/res/tests), so dass
  //   der generische Slot sichtbar bleibt, falls ein dynamischer Tab gewählt ist.
  // - Markiert den zugehörigen Tab-Button als .active
  // - Meldet Tabwechsel (cb:insp:tab:change)
  // --------------------------------------------------------------------------
  function setActiveTab(id){
    const norm = normalizeId(id);

    // bekannte Views (sichtbar/nicht sichtbar)
    Object.entries(views).forEach(([key, el])=>{
      if (el) el.hidden = (key !== norm);
    });

    // Buttons visuell markieren
    Object.entries(tabButtons).forEach(([key, b])=>{
      b.classList.toggle('active', key === norm);
    });

    // Tabwechsel melden (für Module, die beim Wechsel neu rendern wollen)
    window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail:{ tab: norm } }));
  }

  // --------------------------------------------------------------------------
  // Öffentliche API
  // - open(tab)   : Overlay öffnen und optional Tab aktivieren
  // - close()     : Overlay schließen
  // - toggle(tab) : je nach Zustand öffnen/schließen, optional Tab
  // - registerTab({id,title,onShow})
  //                Registriert (oder aktualisiert) einen Tab-Button und
  //                rendert den Inhalt in den vorgesehenen Slot:
  //                -> Bei bekannten IDs: eigener Slot (views[ID])
  //                -> Bei neuen IDs: generischer "slots.view"
  // - mount(id,onShow) : Kurzform für registerTab
  // - getSlot(name)    : Zugriff auf bekannte Slots (z.B. "logs")
  // --------------------------------------------------------------------------
  const API = {
    open(tab){
      host.classList.add('open');
      host.style.display = 'block';
      host.style.visibility = 'visible';
      host.style.opacity = '1';
      host.style.pointerEvents = 'auto';
      host.setAttribute('aria-hidden','false');
      document.body.classList.add('inspector-open');
      setActiveTab(tab || 'logs');
    },

    close(){
      host.classList.remove('open');
      host.style.display = 'none';
      host.style.visibility = 'hidden';
      host.style.opacity = '0';
      host.style.pointerEvents = 'none';
      host.setAttribute('aria-hidden','true');
      document.body.classList.remove('inspector-open');
    },

    toggle(tab){
      (getComputedStyle(host).display === 'none') ? API.open(tab) : API.close();
    },

    registerTab({ id, title, onShow }){
      const norm = normalizeId(id);
      addTabButton(norm, title || id);

      // Ziel-Slot bestimmen: bekannter Slot ODER generischer Slot
      const slot = views[norm] || slots.view;

      // initial rendern (onShow ist für diesen Tab zuständig)
      if (slot && typeof onShow === 'function') {
        slot.innerHTML = '';
        onShow(slot);
      }
    },

    mount(id, onShow){
      API.registerTab({ id, title:id, onShow });
    },

    getSlot(name){
      return slots[name] || document.querySelector(`[data-slot="${name}"]`);
    }
  };

  // API global bereitstellen (alte und neue Namen)
  window.Inspector = Object.assign(window.Inspector || {}, API);
  window.__INSPECTOR_CORE__ = { api: API };

  // --------------------------------------------------------------------------
  // Standard-Tab-Buttons (Reihenfolge im Header)
  // --------------------------------------------------------------------------
  addTabButton('logs',  'logs');
  addTabButton('build', 'build');
  addTabButton('paths', 'paths');
  addTabButton('res',   'resources');
  addTabButton('tests', 'tests');
  addTabButton('ui',    'ui');   // NEU: für deinen UI-Debug-Tab (inspector.ui.js)

  // Startzustand → Logs sichtbar
  setActiveTab('logs');

  // "bereit"-Log + asynchrones Ready-Event (für Module, die auf den Core warten)
  (window.CBLog?.info || console.info)(MOD, 'bereit v%s', '18.16.1');
  setTimeout(()=> window.dispatchEvent(new Event('inspector:ready')), 0);
})();
