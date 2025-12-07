/* ============================================================================
 * Datei   : ui/ui-building-menu.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.07-workarea-bridge-v3-clickonly
 *
 * Zweck   :
 *   - Gebäude-Menü (Anzeige von Name, Status, Kategorie, Position)
 *   - WorkArea-Button → Übergabe an GameWorkArea.beginSelection(...)
 *
 * Wichtige Schnittstellen:
 *   IN :
 *     - cb:building:menu-open(detail)   (KLICK auf Gebäude)
 *
 *   OUT (indirekt):
 *     - GameWorkArea.beginSelection(currentBuilding)
 *       → GameWorkArea kümmert sich dann um cb:workarea:set etc.
 * ========================================================================== */

(function(){
  const TAG = '[ui-building]';

  // kleiner Helper fürs Logging
  function LOG(...args){
    if (window.CBLog && CBLog.info) CBLog.info(TAG, ...args);
    else console.log(TAG, ...args);
  }
  function WARN(...args){
    if (window.CBLog && CBLog.warn) CBLog.warn(TAG, ...args);
    else console.warn(TAG, ...args);
  }

  // --------------------------------------------------------------------------
  // DOM-Grundstruktur
  // --------------------------------------------------------------------------
  const UI_ROOT = document.getElementById('ui-root');
  if (!UI_ROOT){
    WARN('ui-root nicht gefunden – Gebäude-Menü wird nicht initialisiert.');
    return;
  }

  // Panel erstellen (wird per CSS rechts oben angezeigt)
  const panel = document.createElement('div');
  panel.id = 'ui-building-menu';
  panel.className = 'ui-panel hidden'; // hidden = display:none !important (siehe CSS)
  panel.innerHTML = `
    <div class="ui-panel__header">
      <div>
        <div id="ui-building-title">Gebäude</div>
        <div id="ui-building-subtitle">–</div>
      </div>
      <button id="ui-building-close" class="btn btn--icon" type="button">×</button>
    </div>
    <div id="ui-building-body">
      <div class="ui-building-info-row">
        <span>ID</span><span id="ui-building-id">–</span>
      </div>
      <div class="ui-building-info-row">
        <span>Status</span><span id="ui-building-status">–</span>
      </div>
      <div class="ui-building-info-row">
        <span>Kategorie</span><span id="ui-building-category">–</span>
      </div>
      <div class="ui-building-info-row">
        <span>Position</span><span id="ui-building-pos">–</span>
      </div>
    </div>
    <div id="ui-building-footer">
      <button id="btn-building-workarea" class="btn btn--small" type="button">
        Arbeitsbereich setzen
      </button>
    </div>
  `;
  UI_ROOT.appendChild(panel);

  // DOM-Referenzen
  const elTitle    = panel.querySelector('#ui-building-title');
  const elSubTitle = panel.querySelector('#ui-building-subtitle');
  const elId       = panel.querySelector('#ui-building-id');
  const elStatus   = panel.querySelector('#ui-building-status');
  const elCategory = panel.querySelector('#ui-building-category');
  const elPos      = panel.querySelector('#ui-building-pos');
  const btnClose   = panel.querySelector('#ui-building-close');
  const btnWork    = panel.querySelector('#btn-building-workarea');

  // aktuelles Gebäude, das im Menü angezeigt wird
  let currentBuilding = null;

  // --------------------------------------------------------------------------
  // Helper: Menü befüllen + anzeigen
  // --------------------------------------------------------------------------
  function fillFromBuilding(b){
    if (!b) return;

    // Default-Werte aus dem Event-Detail herausziehen
    const id       = b.id       || b.buildingId || '—';
    const uid      = b.uid      || '—';
    const label    = b.label    || id;
    const category = b.category || '—';
    const status   = b.status   || '—';
    const x        = (b.x ?? b.tx ?? 0) | 0;
    const y        = (b.y ?? b.ty ?? 0) | 0;
    const w        = (b.w || b.width  || 3) | 0;
    const h        = (b.h || b.height || 3) | 0;

    currentBuilding = {
      id, uid, label, category, status,
      x, y, w, h
    };

    elTitle.textContent    = label;
    elSubTitle.textContent = `${id} (${category})`;
    elId.textContent       = uid !== '—' ? `${id} #${uid}` : id;
    elStatus.textContent   = status;
    elCategory.textContent = category;
    elPos.textContent      = `${x}, ${y} (${w}×${h})`;
  }

  function showPanel(){
    panel.classList.remove('hidden');
  }

  function hidePanel(){
    panel.classList.add('hidden');
    currentBuilding = null;
  }

  // --------------------------------------------------------------------------
  // Event-Bindings: Close-Button + WorkArea-Button
  // --------------------------------------------------------------------------
  btnClose?.addEventListener('click', ()=>{
    hidePanel();
  });

  btnWork?.addEventListener('click', ()=>{
    if (!currentBuilding){
      WARN('WorkArea-Button gedrückt, aber kein Gebäude aktiv.');
      return;
    }

    LOG('WorkArea-Button → GameWorkArea.beginSelection', currentBuilding);

    try {
      if (window.GameWorkArea && typeof GameWorkArea.beginSelection === 'function'){
        GameWorkArea.beginSelection(currentBuilding);
      } else {
        WARN('GameWorkArea.beginSelection nicht verfügbar – WorkArea kann noch nicht gesetzt werden.');
      }
    } catch (e){
      WARN('Fehler bei GameWorkArea.beginSelection:', e);
    }
  });

  // --------------------------------------------------------------------------
  // Listener: Klick auf Gebäude → cb:building:menu-open
  //   → EINZIGER Trigger fürs Menü (kein Fallback mehr).
  // --------------------------------------------------------------------------
  window.addEventListener('cb:building:menu-open', ev=>{
    const detail = ev?.detail || {};
    LOG('cb:building:menu-open empfangen', detail);
    fillFromBuilding(detail);
    showPanel();
  });

  LOG('Modul geladen – Gebäude-Menü bereit (nur via Klick).');
})();
