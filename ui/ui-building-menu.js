/* ============================================================================
 * Datei   : ui/ui-building-menu.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.01-building-menu-basic
 *
 * Zweck   :
 *   - Generisches Gebäude-Menü, das beim Klick auf ein Gebäude geöffnet wird.
 *   - Zeigt Basis-Infos an (Name, Typ, Status, Position).
 *   - Für Holzfäller (b.lumberjack):
 *       * Button "Arbeitsbereich (Standard 5x5) setzen"
 *       * ruft ProductionWood.setWorkArea(...) auf
 *
 * Ereignisse:
 *   IN :
 *     - cb:building:menu-open { id, uid?, x,y,w,h, label?, category? }
 *
 *   OUT (nur intern im Holz-Modul):
 *     - ruft ProductionWood.setWorkArea(uid, cfg)
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[ui-building]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);

  let root        = null;
  let titleEl     = null;
  let subtitleEl  = null;
  let bodyEl      = null;
  let footerEl    = null;
  let btnClose    = null;
  let btnWorkArea = null;

  let current = null; // aktuell ausgewähltes Gebäude (Detail-Objekt)

  // ---------------------------------------------------------------------------
  // DOM-Aufbau
  // ---------------------------------------------------------------------------

  function createDom(){
    if (root) return;

    const container = document.querySelector('#ui-root') || document.body;

    root = document.createElement('div');
    root.id        = 'ui-building-menu';
    root.className = 'ui-panel ui-building-menu hidden';

    root.innerHTML = `
      <div class="ui-panel__header">
        <div class="ui-building-title"   id="ui-building-title">Gebäude</div>
        <div class="ui-building-subtitle" id="ui-building-subtitle"></div>
        <button class="ui-btn ui-btn--icon" id="ui-building-close" aria-label="Schließen">✕</button>
      </div>
      <div class="ui-panel__body" id="ui-building-body">
        <!-- Infos zum Gebäude werden per JS eingefüllt -->
      </div>
      <div class="ui-panel__footer" id="ui-building-footer">
        <button class="ui-btn" id="ui-building-workarea" hidden>
          Arbeitsbereich (Standard 5×5) setzen
        </button>
      </div>
    `;

    container.appendChild(root);

    titleEl     = root.querySelector('#ui-building-title');
    subtitleEl  = root.querySelector('#ui-building-subtitle');
    bodyEl      = root.querySelector('#ui-building-body');
    footerEl    = root.querySelector('#ui-building-footer');
    btnClose    = root.querySelector('#ui-building-close');
    btnWorkArea = root.querySelector('#ui-building-workarea');

    btnClose?.addEventListener('click', closeMenu);

        // Verhindern, dass Klicks im Panel "durchfallen"
    root.addEventListener('click', (ev)=>{
      ev.stopPropagation();
    });
    
    btnWorkArea?.addEventListener('click', ()=>{
      if (!current) return;
      if (!window.ProductionWood || typeof window.ProductionWood.setWorkArea !== 'function'){
        WARN('ProductionWood.setWorkArea nicht verfügbar.');
        return;
      }

      const id  = current.id;
      const uid = current.uid || `${id}@${current.x},${current.y}`;

      const w = current.w || 3;
      const h = current.h || 3;
      const cx = current.x + w / 2;
      const cy = current.y + h / 2;

      window.ProductionWood.setWorkArea(uid, {
        cx,
        cy,
        radiusTiles: 2.5
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Öffnen / Schließen
  // ---------------------------------------------------------------------------

  function openForBuilding(detail){
    createDom();
    current = detail || {};

    const id       = current.id || 'unbekannt';
    const category = current.category || '';
    const status   = current.status || '';
    const posStr   = (typeof current.x === 'number' && typeof current.y === 'number')
      ? `(${current.x}, ${current.y})`
      : '';

    titleEl.textContent = current.label || id;
    subtitleEl.textContent = [category, status, posStr].filter(Boolean).join(' • ');

    // Einfache Info-Liste
    bodyEl.innerHTML = `
      <div class="ui-building-info-row"><span>Typ:</span><span>${id}</span></div>
      ${category ? `<div class="ui-building-info-row"><span>Kategorie:</span><span>${category}</span></div>` : ''}
      ${status   ? `<div class="ui-building-info-row"><span>Status:</span><span>${status}</span></div>` : ''}
      ${posStr   ? `<div class="ui-building-info-row"><span>Position:</span><span>${posStr}</span></div>` : ''}
    `;

    // Holzfäller-spezifischer Button
    if (id === 'b.lumberjack'){
      btnWorkArea.hidden = false;
    } else {
      btnWorkArea.hidden = true;
    }

    root.classList.remove('hidden');
  }

  function closeMenu(){
    if (!root) return;
    root.classList.add('hidden');
    current = null;
  }

  // ---------------------------------------------------------------------------
  // Event-Hook: Gebäude-Menü öffnen
  // ---------------------------------------------------------------------------

  window.addEventListener('cb:building:menu-open', (ev)=>{
    const d = ev.detail || {};
    openForBuilding(d);
  }, { passive:true });

    // ESC schließt das Menü auch
  window.addEventListener('keydown', (ev)=>{
    if (ev.key === 'Escape'){
      closeMenu();
    }
  });
  
  LOG('Gebäude-Menü geladen v25.12.01-building-menu-basic');

})();
