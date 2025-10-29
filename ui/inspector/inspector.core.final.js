/* ============================================================================
 * Datei   : ui/inspector/inspector.core.js
 * Projekt : Neue Siedler – Inspector
 * Version : v18.16.6 (final, robust core + generic-view)
 * Zweck   : Kern des Inspector-Overlays (Host, Tabs, Views, API – stabil)
 *
 * WICHTIG
 * - Dieses Modul MUSS VOR allen anderen Inspector-Modulen geladen werden.
 * - Keine globalen Theme-Variablen hier – Styling liegt in ui-inspector.css.
 *
 * Features (gegenüber v18.16.3)
 * - Robustere Host-Erzeugung (Fallback-Slots werden sicher erstellt)
 * - Generischer Slot (data-slot="generic-view") für dynamische Tabs (z. B. "ui")
 * - Tab-API mit Synonymen (res/resources, paths/pfade, tests/events …)
 * - onShow-Callbacks werden bei Aktivierung des Tabs aufgerufen (und beim Mount)
 * - Events: cb:insp:tab:change, inspector:ready
 * - Open/Close/Toggle setzen zusätzlich body.inspector-open (für CSS)
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.core]';
  const VER='18.16.6';

  // ---------------------------------------------------------------------------
  // [A] Host + Grundgerüst
  // ---------------------------------------------------------------------------
  function ensureHost(){
    let el = document.getElementById('inspector');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'inspector';
    el.setAttribute('aria-hidden','true');

    el.innerHTML = [
      '<div class="insp-shell" role="dialog" aria-label="Inspector" aria-modal="true">',
      '  <div class="insp-header">',
      '    <div class="insp-tabs" data-slot="tabs" role="tablist"></div>',
      '    <button class="insp-close" type="button" aria-label="Schließen">×</button>',
      '  </div>',
      '  <div class="insp-content" data-slot="view">',
      '    <section data-slot="logs-view"></section>',
      '    <section data-slot="build-view" hidden></section>',
      '    <section data-slot="paths-view" hidden></section>',
      '    <section data-slot="res-view" hidden></section>',
      '    <section data-slot="tests-view" hidden></section>',
      '    <!-- Generischer Slot für dynamische Tabs (z. B. "ui") -->',
      '    <section data-slot="generic-view" hidden></section>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(el);
    el.querySelector('.insp-close')?.addEventListener('click', ()=> API.close());
    return el;
  }

  const host = ensureHost();

  // Slots einsammeln (Container bleibt IMMER sichtbar)
  const container = host.querySelector('[data-slot="view"]');
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

  // Fallbacks sicherstellen, falls HTML anders war
  if (!slots.generic){
    const gen = document.createElement('section');
    gen.setAttribute('data-slot','generic-view');
    gen.hidden = true;
    container.appendChild(gen);
    slots.generic = gen;
  }
  const views = {
    logs : slots.logs,
    build: slots.build,
    paths: slots.paths,
    res  : slots.res,
    tests: slots.tests
    // dynamische Tabs → slots.generic
  };

  // ---------------------------------------------------------------------------
  // [B] Helfer: ID-Normalisierung & Button-Registry
  // ---------------------------------------------------------------------------
  function normalizeId(id){
    if (!id) return 'logs';
    const s = String(id).toLowerCase().trim();
    if (['ress.','ress','resources','resource'].includes(s)) return 'res';
    if (['pfade','pfad','path','paths'].includes(s))         return 'paths';
    if (['event','events','test','tests'].includes(s))       return 'tests';
    return s;
  }

  const tabButtons = Object.create(null);
  const tabHandlers = Object.create(null); // onShow-Callbacks je Tab

  function ensureTabButton(id, label){
    const norm = normalizeId(id);
    if (tabButtons[norm]){ // Label aktualisieren erlaubt
      if (label) tabButtons[norm].textContent = label;
      return tabButtons[norm];
    }
    const b = document.createElement('button');
    b.className = 'insp-tab';
    b.type = 'button';
    b.textContent = label || norm;
    b.dataset.tab = norm;
    b.setAttribute('role','tab');
    b.addEventListener('click', ()=> setActiveTab(norm));
    slots.tabs?.appendChild(b);
    tabButtons[norm] = b;
    return b;
  }

  // ---------------------------------------------------------------------------
  // [C] Tabwechsel
  // ---------------------------------------------------------------------------
  function setActiveTab(id){
    const norm = normalizeId(id);
    const isKnown = Object.prototype.hasOwnProperty.call(views, norm);

    // Bekannte Views sichtbar, andere verstecken
    Object.entries(views).forEach(([key, el])=>{
      if (!el) return;
      el.hidden = (key !== norm);
    });
    // Generischen Slot nur zeigen, wenn Tab nicht "bekannt" ist
    if (slots.generic) slots.generic.hidden = isKnown;

    // Buttons markieren
    Object.entries(tabButtons).forEach(([key, b])=>{
      b.classList.toggle('active', key === norm);
    });

    // onShow (lazy) – beim Aktivieren aufrufen
    try{
      const handler = tabHandlers[norm] || (isKnown ? tabHandlers[norm] : tabHandlers['generic']);
      const target  = isKnown ? views[norm] : slots.generic;
      if (typeof handler === 'function' && target){
        // nur ausführen, wenn noch leer oder explizit gewünscht
        if (!target.__insp_rendered) {
          handler(target);
          target.__insp_rendered = true;
        }
      }
    }catch(e){
      (console.error||console.log)('[insp] onShow error:', e);
    }

    // Event für alle, die reagieren wollen
    window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail:{ tab:norm } }));
  }

  // ---------------------------------------------------------------------------
  // [D] Öffentliche API
  // ---------------------------------------------------------------------------
  const API = {
    open(tab){
      host.classList.add('open');
      Object.assign(host.style, { display:'block', visibility:'visible', opacity:'1', pointerEvents:'auto' });
      host.setAttribute('aria-hidden','false');
      document.body.classList.add('inspector-open');
      setActiveTab(tab || 'logs');
    },
    close(){
      host.classList.remove('open');
      Object.assign(host.style, { display:'none', visibility:'hidden', opacity:'0', pointerEvents:'none' });
      host.setAttribute('aria-hidden','true');
      document.body.classList.remove('inspector-open');
    },
    toggle(tab){
      (getComputedStyle(host).display==='none') ? API.open(tab) : API.close();
    },

    /** Registrierung eines Tabs.
     *  @param {{id:string,title?:string,onShow?:(el:HTMLElement)=>void}} def */
    registerTab(def){
      const norm = normalizeId(def.id);
      ensureTabButton(norm, def.title || def.id);

      // Zielslot bestimmen
      const slot = views[norm] || slots.generic;

      // onShow merken – nicht sofort erzwingen (lazy), aber initial einmal rendern
      if (typeof def.onShow === 'function'){
        tabHandlers[norm] = def.onShow;
        try {
          // Initialer Render, damit „leere Tabs“ nach Mount gefüllt sind
          slot.innerHTML = '';
          def.onShow(slot);
          slot.__insp_rendered = true;
        } catch(e){
          (console.error||console.log)('[insp] initial onShow error:', e);
        }
      }
      return slot;
    },

    /** Kurzform: nur ID + onShow (Title = ID) */
    mount(id, onShow){ return API.registerTab({ id, title:id, onShow }); },

    /** Slot ermitteln (view=Container, generic=generischer Slot, …) */
    getSlot(name){
      if (name==='view') return slots.container;
      if (slots[name])   return slots[name];
      return document.querySelector(`[data-slot="${name}"]`);
    }
  };

  // global bereitstellen
  window.Inspector = Object.assign(window.Inspector||{}, API);
  window.__INSPECTOR_CORE__ = { api: API };

  // ---------------------------------------------------------------------------
  // [E] Standard-Tabs + Initialzustand
  // ---------------------------------------------------------------------------
  ensureTabButton('logs','logs');
  ensureTabButton('build','build');
  ensureTabButton('paths','paths');
  ensureTabButton('res','resources');
  ensureTabButton('tests','tests');
  ensureTabButton('ui','ui'); // dynamischer Tab → generic-view

  setActiveTab('logs');
  (window.CBLog?.info||console.info)(MOD,'bereit v%s', VER);
  setTimeout(()=> window.dispatchEvent(new Event('inspector:ready')),0);
})();