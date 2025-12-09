/* ============================================================================
 * Datei   : ui/ui-building-menu.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.09-workarea-bridge-v5-button-fix
 *
 * Zweck   :
 *   - Gebäude-Menü (Anzeige von Name, Status, Kategorie, Position)
 *   - WorkArea-Button → Übergabe an GameWorkArea.beginSelection(...)
 *
 *   Spezial:
 *   - Beim Schließen des Menüs wird GameWorkArea.cancelSelection() aufgerufen,
 *     damit der Kreis verschwindet.
 *   - Klick außerhalb des Panels schließt das Menü (außer im aktiven
 *     WorkArea-Setzmodus).
 * ========================================================================== */

(function(){
  const TAG = '[ui-building]';

  function LOG(...args){
    if (window.CBLog && CBLog.info) CBLog.info(TAG, ...args);
    else console.log(TAG, ...args);
  }
  function WARN(...args){
    if (window.CBLog && CBLog.warn) CBLog.warn(TAG, ...args);
    else console.warn(TAG, ...args);
  }

  // Wurzel-Container der UI (wird vom HUD/Start-UI genutzt)
  const UI_ROOT = document.querySelector('#ui-root') || document.body;

  // --------------------------------------------------------------------------
  // Panel + DOM-Struktur erzeugen
  // --------------------------------------------------------------------------
  const panel = document.createElement('div');
  panel.id = 'ui-building-menu';
  panel.className = 'ui-panel hidden';
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

  const elTitle    = panel.querySelector('#ui-building-title');
  const elSubTitle = panel.querySelector('#ui-building-subtitle');
  const elId       = panel.querySelector('#ui-building-id');
  const elStatus   = panel.querySelector('#ui-building-status');
  const elCategory = panel.querySelector('#ui-building-category');
  const elPos      = panel.querySelector('#ui-building-pos');

  const btnClose   = panel.querySelector('#ui-building-close');
  const btnWork    = panel.querySelector('#btn-building-workarea');

  let currentBuilding = null;

  // --------------------------------------------------------------------------
  // Helper
  // --------------------------------------------------------------------------

  function hidePanel() {
    panel.classList.add('hidden');

    // Beim Schließen evtl. aktive WorkArea-Selektion abbrechen
    try {
      if (window.GameWorkArea && typeof GameWorkArea.cancelSelection === 'function'){
        GameWorkArea.cancelSelection();
      }
    } catch (e) {
      WARN('Fehler beim Abbrechen der WorkArea-Selektion beim Schließen des Menüs:', e);
    }
  }

  function showPanelForBuilding(b){
    if (!b){
      currentBuilding = null;
      hidePanel();
      return;
    }

    const id        = b.kind || b.id || '–';
    const uid       = b.uid  || '—';
    const label     = b.label || id;
    const status    = b.status || '—';
    const category  = b.category || '—';

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

    panel.classList.remove('hidden');
  }

  // --------------------------------------------------------------------------
  // Event-Bindings
  // --------------------------------------------------------------------------

  // Schließen-Button (X)
  btnClose?.addEventListener('click', (ev)=>{
    // Klick nicht nach außen durchreichen
    ev?.stopPropagation?.();
    ev?.preventDefault?.();

    hidePanel();
  });

  // WorkArea-Button
  btnWork?.addEventListener('click', (ev)=>{
    // Ganz wichtig: verhindert, dass globale Click-Handler das Panel schließen
    ev?.stopPropagation?.();
    ev?.stopImmediatePropagation?.();
    ev?.preventDefault?.();

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

  // Klick außerhalb des Panels → Menü schließen (außer im WorkArea-Setzmodus)
  document.addEventListener('click', (ev)=>{
    if (panel.classList.contains('hidden')) return;

    const target = ev.target;
    if (!target) return;

    if (panel.contains(target)) return; // Klick im Panel → ignorieren

    try {
      if (window.GameWorkArea && typeof GameWorkArea.isSelecting === 'function') {
        if (GameWorkArea.isSelecting()) return; // beim Setzen nicht automatisch schließen
      }
    } catch(e){}

    hidePanel();
  });

  // --------------------------------------------------------------------------
  // Listener: Klick auf Gebäude → cb:building:menu-open
  // --------------------------------------------------------------------------
  window.addEventListener('cb:building:menu-open', (ev)=>{
    const detail = ev.detail || ev;
    LOG('cb:building:menu-open empfangen', detail);
    showPanelForBuilding(detail);
  });

  // Debug: kleines Log beim Laden
  LOG('Gebäude-Menü geladen (v25.12.09-workarea-bridge-v5-button-fix)');
})();
