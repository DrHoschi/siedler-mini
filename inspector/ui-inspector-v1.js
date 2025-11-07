/* ============================================================================
 * Datei   : inspector/ui-inspector-v1.js
 * Projekt : Neue Siedler – Inspector Core
 * Version : v25.11.13-final
 * Zweck   : Inspector-Overlay (Core) – Host/Shell bereitstellen, Sichtbarkeit
 *           steuern, stabile API exportieren, Events senden.
 *
 * Events  : sendet  → cb:insp:core:ready, cb:insp:open, cb:insp:close,
 *                     req:insp:content:mount
 *           lauscht → DOMContentLoaded (Auto-Init), keydown[Escape]
 *
 * Design  :
 *  - KEINE Zerstörung vorhandener Inhalte (non-destructive).
 *  - Host-Migration: #inspector-overlay (alt) → #inspector (neu).
 *  - Sichtbarkeits-Flags am Body: .is-inspector (neu) + .inspector-open (legacy).
 *  - Run-Once-Guards gegen Doppel-Init und doppelte Listener.
 * ========================================================================== */

/* --------------------------------------------------------------------------
 * [Run-Once: File-Guard] – verhindert mehrfaches Ausführen dieser Datei
 * -------------------------------------------------------------------------- */
if (window.__INSP_CORE_FILE_LOADED__) {
  console.info('[insp] Core-Datei bereits geladen – skip');
  // eslint-disable-next-line no-useless-return
  ;(function(){ return; })();
}
window.__INSP_CORE_FILE_LOADED__ = true;

/* --------------------------------------------------------------------------
 * Konstanten
 * -------------------------------------------------------------------------- */
const CFG = {
  ID_NEW       : 'inspector',
  ID_OLD       : 'inspector-overlay', // Legacy-ID
  HOST_CLASS   : 'inspector-host',
  BODY_FLAG    : 'is-inspector',
  BODY_FLAG_LE : 'inspector-open',    // Legacy-Flag
  EVT_OPEN     : 'cb:insp:open',
  EVT_CLOSE    : 'cb:insp:close',
  EVT_CORE_RDY : 'cb:insp:core:ready',
  EVT_MOUNT    : 'req:insp:content:mount',
  VERSION      : 'v25.11.13-final'
};

/* --------------------------------------------------------------------------
 * Hilfsfunktionen
 * -------------------------------------------------------------------------- */
const $  = (sel, root=document)=> root.querySelector(sel);
const el = (tag, cls)=> Object.assign(document.createElement(tag), { className: cls||'' });

/**
 * Host ermitteln (kompatibel zu Alt-ID) und ggf. migrieren.
 * Regeln:
 *  - existiert nur #inspector-overlay  → ID nach #inspector umbenennen.
 *  - existieren beide: den mit Inhalt priorisieren, den anderen entfernen.
 *  - existiert keiner: neuen Host (#inspector) an <body> anhängen.
 */
function getHost(){
  let hNew = document.getElementById(CFG.ID_NEW);
  let hOld = document.getElementById(CFG.ID_OLD);

  if (hNew && hOld) {
    const oldHasKids = hOld.childElementCount > 0;
    const newHasKids = hNew.childElementCount > 0;
    if (oldHasKids && !newHasKids) {
      hOld.id = CFG.ID_NEW;   // Alt → Neu
      hNew.remove();
      return hOld;
    } else {
      hOld.remove();
      return hNew;
    }
  }
  if (hOld && !hNew) { hOld.id = CFG.ID_NEW; return hOld; }
  if (hNew) return hNew;

  const host = el('div', CFG.HOST_CLASS);
  host.id = CFG.ID_NEW;
  document.body.appendChild(host);
  return host;
}

/**
 * Shell (Header/Tabs/Content) nur erzeugen, wenn keine existiert.
 * KEIN innerHTML-Reset – bestehender Inhalt bleibt erhalten.
 */
function ensureShell(host){
  const shell = host.querySelector('.insp-shell');
  if (shell) {
    host.dataset.shellReady = '1';
    const header = host.querySelector('.insp-header') || shell.firstElementChild;
    if (header && !header.querySelector('[data-action="insp-close"]')) {
      addCloseButton(header);
    }
    return host;
  }

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

/** kleinen ×-Button rechts oben im Header einfügen (einmalig) */
function addCloseButton(headerEl){
  headerEl.style.position = 'relative';
  const btn = el('button');
  btn.type = 'button';
  btn.textContent = '×';
  btn.setAttribute('aria-label', 'Inspector schließen');
  btn.setAttribute('data-action', 'insp-close');
  btn.style.cssText = [
    'position:absolute','right:12px','top:10px','font-size:24px',
    'background:none','border:0','color:#ddd','cursor:pointer'
  ].join(';');
  btn.addEventListener('click', ()=> Inspector.close());
  headerEl.appendChild(btn);
}

/** Sichtbarkeit (Body-Klassen + aria) schalten */
function setActive(on){
  document.body.classList.toggle(CFG.BODY_FLAG, on);
  document.body.classList.toggle(CFG.BODY_FLAG_LE, on); // Legacy weiter pflegen
  const host = getHost();
  host.setAttribute('aria-hidden', on ? 'false' : 'true');
}

/* --------------------------------------------------------------------------
 * Klasse: InspectorCore
 * -------------------------------------------------------------------------- */
class InspectorCore {
  constructor(){ this.initialized = false; this.mount = null; }

  /**
   * Initialisierung: Host finden/migrieren, Shell bereitstellen,
   * geschlossen starten, Ready-Event senden und Content ggf. anstupsen.
   */
  init(opts = {}){
    if (this.initialized) return this; // Init-Guard

    const host = ensureShell(getHost());
    this.mount = opts.mount || host;

    setActive(false); // niemals offen starten
    this.initialized = true;

    (window.CBLog?.info || console.info)(`[insp] Core bereit (${CFG.VERSION}).`);
    window.dispatchEvent(new CustomEvent(CFG.EVT_CORE_RDY, {
      detail: { version: CFG.VERSION, host: this.mount }
    }));

    // Falls Tabs/Content nachträglich laden: kurzer Mount-Ping
    setTimeout(()=>{
      const tabsCount = document.querySelectorAll(`#${CFG.ID_NEW} .insp-tabs button`).length;
      const secCount  = document.querySelectorAll(`#${CFG.ID_NEW} .insp-content > section`).length;
      if (tabsCount === 0 && secCount === 0) {
        window.dispatchEvent(new CustomEvent(CFG.EVT_MOUNT, { detail:{ host:this.mount }}));
      }
    }, 0);

    return this;
  }

  open(){  setActive(true);  window.dispatchEvent(new CustomEvent(CFG.EVT_OPEN)); }
  close(){ setActive(false); window.dispatchEvent(new CustomEvent(CFG.EVT_CLOSE)); }
  toggle(force){ (typeof force==='boolean' ? force : !this.isOpen()) ? this.open() : this.close(); }
  isOpen(){ return document.body.classList.contains(CFG.BODY_FLAG); }
}

/* --------------------------------------------------------------------------
 * Init/Export (Run-Once Guards für Listener)
 * -------------------------------------------------------------------------- */
(function setup(){
  // Instance-Guard (verhindert doppelte Core-Instanzen)
  if (window.__INSP_CORE_INIT__) { console.info('[insp] Core bereits aktiv – skip'); return; }
  window.__INSP_CORE_INIT__ = true;

  const core = new InspectorCore();

  // ESC schließt (nur wenn offen) – Listener nur einmal binden
  if (!window.__INSP_ESC_BIND__) {
    window.__INSP_ESC_BIND__ = true;
    window.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape' && core.isOpen()) { e.preventDefault(); core.close(); }
    });
  }

  // API stabil auf window veröffentlichen (nicht überschreiben, sondern ersetzen)
  window.Inspector = {
    get initialized(){ return core.initialized; },
    init  : (...a)=> core.init(...a),
    open  : (...a)=> core.open(...a),
    close : (...a)=> core.close(...a),
    toggle: (...a)=> core.toggle(...a),
    isOpen: (...a)=> core.isOpen(...a),
  };

  // Auto-Init (einmalig)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ()=>{ if (!core.initialized) core.init(); }, { once:true });
  } else {
    if (!core.initialized) core.init();
  }
})();
