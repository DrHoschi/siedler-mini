/* ============================================================================
 * Datei   : ui/ui-building-menu.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.09-building-menu-workarea-v3
 * Zweck   : Gebäude-Menü (per Klick auf Gebäude) + WorkArea-Button
 * 
 * Lauscht : cb:building:menu-open (von core.input)
 * Sendet  : GameWorkArea.beginSelection(detail)
 *           GameWorkArea.cancelSelection()
 * ============================================================================ */

(function(){
  const TAG  = '[ui-building]';
  const LOG  = (window.CBLog?.ok   || console.log ).bind(console,  TAG);
  const WARN = (window.CBLog?.warn || console.warn).bind(console,  TAG);

  const UI_ROOT = document.getElementById('ui-root') || document.body;

  // --------------------------------------------------------------------------
  // Panel-HTML
  // --------------------------------------------------------------------------
  const panel = document.createElement('div');
  panel.id = 'ui-building-menu';
  panel.className = 'ui-building-menu hidden';

  panel.innerHTML = `
    <div class="ui-building-menu__titlebar">
      <div>
        <div id="ui-building-title" class="ui-building-menu__title">Gebäude</div>
        <div id="ui-building-subtitle" class="ui-building-menu__subtitle">–</div>
      </div>
      <button id="ui-building-close" class="ui-building-menu__close" type="button">×</button>
    </div>

    <div class="ui-building-menu__body">
      <div class="ui-building-menu__row">
        <span class="ui-building-menu__label">ID</span>
        <span id="ui-building-id" class="ui-building-menu__value">–</span>
      </div>
      <div class="ui-building-menu__row">
        <span class="ui-building-menu__label">Status</span>
        <span id="ui-building-status" class="ui-building-menu__value">–</span>
      </div>
      <div class="ui-building-menu__row">
        <span class="ui-building-menu__label">Kategorie</span>
        <span id="ui-building-category" class="ui-building-menu__value">–</span>
      </div>
      <div class="ui-building-menu__row">
        <span class="ui-building-menu__label">Position</span>
        <span id="ui-building-pos" class="ui-building-menu__value">–</span>
      </div>
    </div>

    <div id="ui-building-footer" class="ui-building-menu__footer">
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
  // Helper: Menü befüllen + anzeigen
  // --------------------------------------------------------------------------
  function fillFromBuilding(b){
    if (!b) return;

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

    // Beim Schließen WorkArea-Selection beenden → Kreis ausblenden
    try {
      if (window.GameWorkArea && typeof GameWorkArea.cancelSelection === 'function') {
        GameWorkArea.cancelSelection();
      }
    } catch (e) {
      WARN('Fehler beim Abbrechen der WorkArea-Selektion beim Schließen des Menüs:', e);
    }
  }

  // --------------------------------------------------------------------------
  // Event-Bindings
  // --------------------------------------------------------------------------
  btnClose?.addEventListener('click', ()=>{
    hidePanel();
  });

  // WICHTIG: Hier MUSS beim Klick ein Log im Inspector auftauchen!
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

  // Klick außerhalb des Panels → Menü schließen (außer im WorkArea-Setzmodus)
  document.addEventListener('click', (ev)=>{
    if (panel.classList.contains('hidden')) return;

    const target = ev.target;
    if (!target) return;

    if (panel.contains(target)) return; // Klick IM Panel → ignorieren

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
  window.addEventListener('cb:building:menu-open', ev=>{
    const detail = ev?.detail || {};
    LOG('cb:building:menu-open empfangen', detail);
    fillFromBuilding(detail);
    showPanel();
  });

  LOG('Modul geladen – Gebäude-Menü bereit (nur via Klick).');
})();
