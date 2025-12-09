/* ============================================================================
 * Datei   : ui/ui-building-menu.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.09-building-menu-workarea-V4
 *
 * Zweck   :
 *   - Bestehendes Gebäude-Menü (HTML + CSS) ansteuern
 *   - Daten anzeigen (Name, ID, Status, Kategorie, Position)
 *   - Button "Arbeitsbereich setzen" → GameWorkArea.beginSelection(...)
 *   - Beim Schließen → GameWorkArea.cancelSelection()
 *
 * Annahmen:
 *   - Es gibt im DOM bereits:
 *       #ui-building-menu          (Panel)
 *       #ui-building-title         (Titel)
 *       #ui-building-subtitle      (Untertitel)
 *       #ui-building-id            (ID-Anzeige)
 *       #ui-building-status        (Status-Anzeige)
 *       #ui-building-category      (Kategorie-Anzeige)
 *       #ui-building-pos           (Positions-Anzeige)
 *       #ui-building-close         (X-Button)
 *       #btn-building-workarea     (Button "Arbeitsbereich setzen")
 *
 * Lauscht:
 *   - window: cb:building:menu-open (von core.input)
 * ============================================================================ */

(function(){
  const TAG  = '[ui-building]';
  const LOG  = (window.CBLog?.ok   || console.log ).bind(console,  TAG);
  const WARN = (window.CBLog?.warn || console.warn).bind(console,  TAG);

  // --------------------------------------------------------------------------
  // DOM-Referenzen auf DEIN vorhandenes Panel
  // --------------------------------------------------------------------------
  const panel     = document.getElementById('ui-building-menu');
  const elTitle   = panel?.querySelector('#ui-building-title');
  const elSub     = panel?.querySelector('#ui-building-subtitle');
  const elId      = panel?.querySelector('#ui-building-id');
  const elStatus  = panel?.querySelector('#ui-building-status');
  const elCat     = panel?.querySelector('#ui-building-category');
  const elPos     = panel?.querySelector('#ui-building-pos');
  const btnClose  = panel?.querySelector('#ui-building-close');
  const btnWork   = panel?.querySelector('#btn-building-workarea');

  if (!panel) {
    WARN('Panel #ui-building-menu nicht gefunden – Modul beendet sich.');
    return;
  }

  let currentBuilding = null;

  // --------------------------------------------------------------------------
  // Helper
  // --------------------------------------------------------------------------
  function showPanel(){
    panel.classList.remove('hidden');
  }

  function hidePanel(){
    panel.classList.add('hidden');
    currentBuilding = null;

    // aktiven WorkArea-Modus abbrechen, falls aktiv
    try {
      if (window.GameWorkArea && typeof GameWorkArea.cancelSelection === 'function') {
        GameWorkArea.cancelSelection();
      }
    } catch (e) {
      WARN('Fehler beim cancelSelection beim Schließen:', e);
    }
  }

  function fillFromBuilding(b){
    if (!b) return;

    const id       = b.id       || b.buildingId || b.kind || '—';
    const uid      = b.uid      || '—';
    const label    = b.label    || id;
    const cat      = b.category || '—';
    const status   = b.status   || '—';
    const x        = (b.x ?? b.tx ?? 0) | 0;
    const y        = (b.y ?? b.ty ?? 0) | 0;
    const w        = (b.w ?? b.width  ?? 3) | 0;
    const h        = (b.h ?? b.height ?? 3) | 0;

    currentBuilding = { id, uid, label, category: cat, status, x, y, w, h };

    if (elTitle)  elTitle.textContent = label;
    if (elSub)    elSub.textContent   = `${id} (${cat})`;
    if (elId)     elId.textContent    = uid !== '—' ? `${id} #${uid}` : id;
    if (elStatus) elStatus.textContent= status;
    if (elCat)    elCat.textContent   = cat;
    if (elPos)    elPos.textContent   = `${x}, ${y} (${w}×${h})`;
  }

  // --------------------------------------------------------------------------
  // Button-Events
  // --------------------------------------------------------------------------
  btnClose?.addEventListener('click', (ev)=>{
    ev?.stopPropagation?.();
    ev?.preventDefault?.();
    hidePanel();
  });

  btnWork?.addEventListener('click', (ev)=>{
    ev?.stopPropagation?.();
    ev?.preventDefault?.();

    if (!currentBuilding){
      WARN('WorkArea-Button gedrückt, aber kein Gebäude gesetzt.');
      return;
    }

    LOG('WorkArea-Button → GameWorkArea.beginSelection', currentBuilding);

    try {
      if (window.GameWorkArea && typeof GameWorkArea.beginSelection === 'function') {
        GameWorkArea.beginSelection(currentBuilding);
      } else {
        WARN('GameWorkArea.beginSelection nicht verfügbar – Script core/game.workarea.js geladen?');
      }
    } catch (e) {
      WARN('Fehler bei GameWorkArea.beginSelection:', e);
    }
  });

  // Klick außerhalb des Panels → schließen (außer wenn WorkArea gerade aktiv)
  document.addEventListener('click', (ev)=>{
    if (panel.classList.contains('hidden')) return;

    const target = ev.target;
    if (!target) return;
    if (panel.contains(target)) return; // Klick im Panel → ignorieren

    try {
      if (window.GameWorkArea && typeof GameWorkArea.isSelecting === 'function') {
        if (GameWorkArea.isSelecting()) return; // bei aktiver Auswahl NICHT schließen
      }
    } catch(e){}

    hidePanel();
  });

  // --------------------------------------------------------------------------
  // cb:building:menu-open vom Input-Modul
  // --------------------------------------------------------------------------
  window.addEventListener('cb:building:menu-open', (ev)=>{
    const detail = ev?.detail || {};
    LOG('cb:building:menu-open empfangen', detail);
    fillFromBuilding(detail);
    showPanel();
  });

  LOG('Gebäude-Menü-Bridge geladen v25.12.09-building-menu-workarea-V4');
})();
