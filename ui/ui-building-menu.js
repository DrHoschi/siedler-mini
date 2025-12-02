/* ============================================================================
 * Datei   : ui/ui-building-menu.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.02-building-menu-workarea
 *
 * Zweck   :
 *   - Generisches Gebäude-Menü, das beim Klick auf ein Gebäude geöffnet wird.
 *   - Zeigt Basis-Infos an (Name, Typ, Status, Position).
 *   - Für Produktionsgebäude (z.B. b.lumberjack / b.fisher / b.quarry):
 *       * Button "Arbeitsbereich setzen"
 *       * ruft bevorzugt GameWorkArea.startSelectionForBuilding(...) auf
 *         (interaktive Kreiswahl), ansonsten Fallback:
 *         ProductionWood.setWorkArea(...) mit Standardradius.
 *
 * Ereignisse:
 *   IN :
 *     - cb:building:menu-open { id, uid?, x,y,w,h, label?, category?, workArea? }
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[ui-building]';
  const LOG  = (window.CBLog?.ok   || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn || console.warn).bind(console, TAG);

  let root        = null;
  let titleEl     = null;
  let subtitleEl  = null;
  let bodyEl      = null;
  let footerEl    = null;
  let btnClose    = null;
  let btnWorkArea = null;

  // aktuell ausgewähltes Gebäude (Detail-Objekt aus cb:building:menu-open)
  let current     = null;

  // ---------------------------------------------------------------------------
  // Globale Close-Handler (Klick außerhalb + ESC-Taste)
  // ---------------------------------------------------------------------------

  function setupGlobalCloseHandlers(){
    // Klick irgendwo außerhalb des Panels schließt das Menü
    window.addEventListener('pointerdown', (ev)=>{
      if (!root || root.classList.contains('hidden')) return;
      const t = ev.target;
      if (!t) return;
      if (root.contains(t)) return; // Klick INS Panel → ignorieren
      closeMenu();
    }, true); // Capture, damit wir den Klick früh sehen

    // ESC schließt das Menü
    window.addEventListener('keydown', (ev)=>{
      if (ev.key === 'Escape'){
        closeMenu();
      }
    });
  }

  setupGlobalCloseHandlers();

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
          Arbeitsbereich setzen
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

    btnClose?.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      closeMenu();
    });

    // Verhindern, dass Klicks im Panel "durchfallen"
    root.addEventListener('pointerdown', (ev)=>{
      ev.stopPropagation();
    });

    btnWorkArea?.addEventListener('click', ()=>{
      if (!current) return;

      const id  = current.id;
      const uid = current.uid || `${id}@${current.x},${current.y}`;

      const w   = current.w || 3;
      const h   = current.h || 3;
      const cx  = current.x + w / 2;
      const cy  = current.y + h / 2;

      const defaultRadius =
        (current.workArea && typeof current.workArea.radiusTiles === 'number')
          ? current.workArea.radiusTiles
          : 2.5;

      // 1. Bevorzugt: neues WorkArea-Modul (interaktive Kreiswahl)
      if (window.GameWorkArea && typeof window.GameWorkArea.startSelectionForBuilding === 'function'){
        try{
          window.GameWorkArea.startSelectionForBuilding({
            id,
            uid,
            x: current.x,
            y: current.y,
            w,
            h,
            radiusTiles: defaultRadius
          });
        } catch (e){
          WARN('GameWorkArea.startSelectionForBuilding Fehler:', e);
        }
        return;
      }

      // 2. Fallback: altes Holz-Modul (setzt sofort Kreis, ohne interaktive Wahl)
      if (window.ProductionWood && typeof window.ProductionWood.setWorkArea === 'function'){
        try{
          window.ProductionWood.setWorkArea(uid, {
            cx,
            cy,
            radiusTiles: defaultRadius
          });
        } catch(e){
          WARN('ProductionWood.setWorkArea Fehler:', e);
        }
        return;
      }

      WARN('Arbeitsbereich: weder GameWorkArea noch ProductionWood verfügbar.');
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

    bodyEl.innerHTML = `
      <div class="ui-building-info-row"><span>Typ:</span><span>${id}</span></div>
      ${category ? `<div class="ui-building-info-row"><span>Kategorie:</span><span>${category}</span></div>` : ''}
      ${status   ? `<div class="ui-building-info-row"><span>Status:</span><span>${status}</span></div>` : ''}
      ${posStr   ? `<div class="ui-building-info-row"><span>Position:</span><span>${posStr}</span></div>` : ''}
    `;

    // WorkArea-Button nur für Produktionsgebäude anzeigen (Epoche 1)
    const canHaveWorkArea =
      id === 'b.lumberjack' ||
      id === 'b.quarry'     ||
      id === 'b.fisher';

    btnWorkArea.hidden = !canHaveWorkArea;

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

  LOG('Gebäude-Menü geladen v25.12.02-building-menu-workarea');

})();
