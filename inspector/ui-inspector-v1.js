/* ============================================================================
 * Datei   : inspector/ui-inspector-v1.js
 * Version : v25.11.01-final
 * Projekt : Neue Siedler – Inspector v1 (Core)
 * Zweck   : Overlay-Host finden/vereinheitlichen, Shell bereitstellen,
 *           API exportieren (init/open/close/toggle/isOpen) und Events senden.
 *
 * WICHTIG:
 *  - NON-DESTRUCTIVE: vorhandene Inhalte (Tabs/Sections) werden NICHT gelöscht.
 *  - Host-Migration: #inspector-overlay (alt) → #inspector (neu).
 *  - Sichtbarkeit:   body.is-inspector  (legacy: body.inspector-open)
 *  - Events:         cb:insp:core:ready, cb:insp:open, cb:insp:close,
 *                    req:insp:content:mount (Ping, falls Content später lädt)
 * Struktur: KONSTANTEN → HILFSFUNKTIONEN → KLASSE → INIT/EXPORT
 * ========================================================================== */

/* ==== Inspector-Adapter-Header (neu + alt) ================================= */
(function(){
  'use strict';

  // Run-Once: verhindert Doppel-Registrierung
  window.__INSP_TABS__ = window.__INSP_TABS__ || {};
  if (window.__INSP_TABS__['layer-v1']) return;
  window.__INSP_TABS__['layer-v1'] = true;

  // Universal-Registrierer: nutzt neue API oder fällt auf DOM-Fallback zurück
  function universalRegister(tabTitle, tabId, mountFn, order){
    const tryAPI = ()=> {
      if (typeof window.registerInspectorTab === 'function') {
        window.registerInspectorTab(tabTitle, mountFn, { id: tabId, order: order||120 });
        console.info('[layer-tab] via API registriert.');
        return true;
      }
      return false;
    };

    if (tryAPI()) return; // neue API war da

    // Auf Ready-Events warten (neuer Inspector feuert diese)
    const onReady = ()=> { if (tryAPI()) cleanup(); };
    function cleanup(){
      window.removeEventListener('cb:insp:core:ready', onReady);
      window.removeEventListener('cb:insp:content:ready', onReady);
      clearInterval(poll);
      clearTimeout(tout);
    }
    window.addEventListener('cb:insp:core:ready', onReady);
    window.addEventListener('cb:insp:content:ready', onReady);

    // Polling + Timeout-Fallback (falls keine Events kommen)
    const poll = setInterval(onReady, 200);
    const tout = setTimeout(()=>{
      clearInterval(poll);
      // Fallback: Tab-Button + Section direkt in den Inspector einhängen
      const insp = document.querySelector('#inspector');
      const tabs = insp?.querySelector('.insp-tabs');
      const content = insp?.querySelector('.insp-content');
      if (tabs && content) {
        const btn = document.createElement('button');
        btn.textContent = tabTitle; btn.dataset.tab = tabId;
        tabs.appendChild(btn);

        const sec = document.createElement('section');
        sec.id = tabId; content.appendChild(sec);

        tabs.querySelectorAll('button').forEach(b=>{
          b.addEventListener('click', ()=>{
            const id = b.dataset.tab;
            content.querySelectorAll('section').forEach(s=> s.style.display = (s.id===id?'block':'none'));
            window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail:{ tab: b.textContent } }));
          });
        });

        // mount jetzt direkt
        mountFn(sec);
        sec.style.display = 'block';
        console.info('[layer-tab] DOM-Fallback aktiv.');
      } else {
        console.warn('[layer-tab] Weder API noch .insp-tabs/.insp-content gefunden.');
      }
    }, 10000);
  }

/* ==== AB HIER DEIN BESTEHENDER CODE (utils, render, etc.) ================== */
// … (lass deinen bisherigen Code so wie er ist) …

(() => {
  /* ---------------------------------- KONSTANTEN -------------------------- */
  const CFG = {
    ID_NEW      : 'inspector',
    ID_OLD      : 'inspector-overlay',     // Legacy-ID
    HOST_CLASS  : 'inspector-host',
    BODY_FLAG   : 'is-inspector',
    BODY_FLAG_LE: 'inspector-open',        // Legacy-Flag, weiter pflegen
    EVT_OPEN    : 'cb:insp:open',
    EVT_CLOSE   : 'cb:insp:close',
    EVT_CORE_RDY: 'cb:insp:core:ready',
    EVT_MOUNT   : 'req:insp:content:mount',
    VERSION     : 'v25.11.01-final'
  };

  /* -------------------------------- HILFSFUNKTIONEN ----------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls) => Object.assign(document.createElement(tag), { className: cls || '' });

  /**
   * Host ermitteln (kompatibel zu Alt-ID) und ggf. migrieren.
   * Regeln:
   *  - existiert nur #inspector-overlay  → ID nach #inspector umbenennen.
   *  - existieren beide: den mit Inhalt priorisieren, den anderen entfernen.
   *  - existiert keiner: neuen Host (#inspector) an <body> anhängen.
   */
  function getHost() {
    let hNew = document.getElementById(CFG.ID_NEW);
    let hOld = document.getElementById(CFG.ID_OLD);

    // beide vorhanden → den mit Inhalt behalten
    if (hNew && hOld) {
      const oldHasKids = hOld.childElementCount > 0;
      const newHasKids = hNew.childElementCount > 0;
      if (oldHasKids && !newHasKids) {
        hOld.id = CFG.ID_NEW;    // Alt → Neu
        hNew.remove();
        return hOld;
      } else {
        hOld.remove();
        return hNew;
      }
    }
    // nur alt vorhanden → migrieren
    if (hOld && !hNew) {
      hOld.id = CFG.ID_NEW;
      return hOld;
    }
    // nur neu vorhanden
    if (hNew) return hNew;

    // gar keiner vorhanden → neu erstellen
    const host = el('div', CFG.HOST_CLASS);
    host.id = CFG.ID_NEW;
    document.body.appendChild(host);
    return host;
  }

  /**
   * Shell (Header/Tabs/Content) nur erzeugen, wenn keine existiert.
   * KEIN innerHTML-Reset – bestehender Inhalt bleibt erhalten.
   * Ergänzt einen Close-Button (×), falls noch keiner vorhanden ist.
   */
  function ensureShell(host) {
    const shell = host.querySelector('.insp-shell');
    if (shell) {
      host.dataset.shellReady = '1';
      // Close-Button sicherstellen
      const header = host.querySelector('.insp-header') || shell.firstElementChild;
      if (header && !header.querySelector('[data-action="insp-close"]')) {
        addCloseButton(header);
      }
      return host;
    }

    // Minimal-Shell erzeugen (Content/Tabs dürfen später einhängen)
    const sh   = el('div', 'insp-shell');
    const head = el('div', 'insp-header');
    const tabs = el('div', 'insp-tabs');     tabs.setAttribute('role', 'tablist');
    const cont = el('div', 'insp-content');  cont.setAttribute('role', 'region');

    head.appendChild(tabs);
    sh.appendChild(head);
    sh.appendChild(cont);
    host.appendChild(sh);
    host.dataset.shellReady = '1';

    addCloseButton(head);
    return host;
  }

  /** kleinen ×-Button rechts oben im Header einfügen */
  function addCloseButton(headerEl) {
    headerEl.style.position = 'relative';
    const btn = el('button');
    btn.type = 'button';
    btn.textContent = '×';
    btn.setAttribute('aria-label', 'Inspector schließen');
    btn.setAttribute('data-action', 'insp-close');
    btn.style.cssText =
      'position:absolute;right:12px;top:10px;font-size:24px;background:none;border:0;color:#ddd;cursor:pointer;';
    btn.addEventListener('click', () => Inspector.close());
    headerEl.appendChild(btn);
  }

  /** Sichtbarkeit (Klassen + aria) schalten */
  function setActive(on) {
    document.body.classList.toggle(CFG.BODY_FLAG, on);
    document.body.classList.toggle(CFG.BODY_FLAG_LE, on);     // Legacy weiter pflegen
    const host = getHost();
    host.setAttribute('aria-hidden', on ? 'false' : 'true');
  }

  /* ------------------------------------ KLASSE ---------------------------- */
  class InspectorCore {
    constructor() { this.initialized = false; this.mount = null; }

    /**
     * Initialisierung: Host finden/migrieren, Shell bereitstellen,
     * Closed starten, Ready-Event senden und Content ggf. anstupsen.
     */
    init(opts = {}) {
      const host = ensureShell(getHost());
      this.mount = opts.mount || host;

      setActive(false);      // niemals offen starten
      this.initialized = true;

      (window.CBLog?.info || console.info)(`[insp] Core bereit (${CFG.VERSION}).`);
      window.dispatchEvent(new CustomEvent(CFG.EVT_CORE_RDY, { detail: { version: CFG.VERSION, host: this.mount }}));

      // Falls Tabs/Content nachträglich laden: kurzer Mount-Ping
      setTimeout(() => {
        const tabsCount = document.querySelectorAll(`#${CFG.ID_NEW} .insp-tabs button`).length;
        const secCount  = document.querySelectorAll(`#${CFG.ID_NEW} .insp-content > section`).length;
        if (tabsCount === 0 && secCount === 0) {
          window.dispatchEvent(new CustomEvent(CFG.EVT_MOUNT, { detail: { host: this.mount }}));
        }
      }, 0);

      return this;
    }

    open()   { setActive(true);  window.dispatchEvent(new CustomEvent(CFG.EVT_OPEN)); }
    close()  { setActive(false); window.dispatchEvent(new CustomEvent(CFG.EVT_CLOSE)); }
    toggle(force) { (typeof force === 'boolean' ? force : !this.isOpen()) ? this.open() : this.close(); }
    isOpen() { return document.body.classList.contains(CFG.BODY_FLAG); }
  }

  /* ---------------------------------- INIT/EXPORT ------------------------- */
  const core = new InspectorCore();

  // ESC schließt (nur wenn offen)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && core.isOpen()) { e.preventDefault(); core.close(); }
  });

  // Öffentliche API (stable)
  window.Inspector = {
    get initialized(){ return core.initialized; },
    init   : (...a) => core.init(...a),
    open   : (...a) => core.open(...a),
    close  : (...a) => core.close(...a),
    toggle : (...a) => core.toggle(...a),
    isOpen : (...a) => core.isOpen(...a),
  };

  // Auto-Init, falls noch nicht anderswo aufgerufen
  document.addEventListener('DOMContentLoaded', () => { if (!core.initialized) core.init(); });
})();
/* ==== Registrierung ======================================================== */
  // Name/Titel absichtlich "Layer", ID eindeutig:
  universalRegister('Layer', 'insp-tab-layer', mount, 120);

})(); // <--- schließt den Adapter-Header
