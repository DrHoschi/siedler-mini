/* ============================================================================
 * Datei   : ui/ui-building-menu.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.09-workarea-menu-fix
 * Zweck   : Gebäude-Menü (Info + Button "Arbeitsbereich setzen")
 *
 * Lauscht : cb:building:menu-open  (vom Input, wenn auf ein Gebäude geklickt wird)
 * Nutzt   : window.GameWorkArea    (optional, für Arbeitsbereich-Auswahl)
 *           window.CBLog           (Logging, falls vorhanden)
 *
 * Wichtig :
 *   - Menü wird dynamisch in #ui-root erzeugt.
 *   - Klick auf "Arbeitsbereich setzen" startet GameWorkArea.beginSelection(...)
 *     und schließt das Menü.
 *   - Wenn GameWorkArea fehlt, kommt ein Warn-Log, aber das Menü funktioniert
 *     trotzdem weiter.
 * ============================================================================ */

/* ---------------------------------------------------------------------------
 * 0. Einmal-Schutz, damit das Skript bei Doppelladung nicht alles doppelt bindet
 * ------------------------------------------------------------------------- */
if (window.__UI_BUILDING_MENU_READY__) {
  // schon initialisiert → nichts tun
} else {
  window.__UI_BUILDING_MENU_READY__ = true;

  (function () {
    // -----------------------------------------------------------------------
    // 1. Konstanten / Shortcuts
    // -----------------------------------------------------------------------
    const LOG = window.CBLog || {
      info: (...a) => console.log('ℹ️', ...a),
      warn: (...a) => console.warn('⚠️', ...a),
      ok:   (...a) => console.log('✅', ...a),
      error:(...a) => console.error('❌', ...a),
    };

    const UI_ROOT = document.getElementById('ui-root');
    if (!UI_ROOT) {
      console.warn('⚠️ [ui-building] Kein #ui-root gefunden – Gebäude-Menü deaktiviert.');
      return;
    }

    // Referenz auf GameWorkArea (wenn geladen)
    const WorkArea = window.GameWorkArea || null;

    // aktuell geöffnetes Gebäude
    let currentBuilding = null;
    let panel = null;

    // -----------------------------------------------------------------------
    // 2. Hilfsfunktionen: Panel erzeugen / füllen / anzeigen
    // -----------------------------------------------------------------------

    function createPanel() {
      if (panel) return panel;

      panel = document.createElement('div');
      panel.id = 'ui-building-menu';
      panel.className = 'ui-panel ui-building-menu';

      // Header --------------------------------------------------------------
      const header = document.createElement('div');
      header.id = 'ui-building-header';
      header.className = 'ui-building-header';

      const titleWrap = document.createElement('div');
      titleWrap.className = 'ui-building-titlewrap';

      const title = document.createElement('div');
      title.id = 'ui-building-title';
      title.className = 'ui-building-menu-title';
      titleWrap.appendChild(title);

      const subtitle = document.createElement('div');
      subtitle.id = 'ui-building-subtitle';
      subtitle.className = 'ui-building-menu-subtitle';
      titleWrap.appendChild(subtitle);

      header.appendChild(titleWrap);

      const btnClose = document.createElement('button');
      btnClose.className = 'ui-building-close';
      btnClose.textContent = '×';
      btnClose.setAttribute('aria-label', 'Schließen');
      btnClose.addEventListener('click', hidePanel);
      header.appendChild(btnClose);

      panel.appendChild(header);

      // Body --------------------------------------------------------------
const body = document.createElement('div');
      body.id = 'ui-building-body';
      body.className = 'ui-building-menu-body';

      // Zeile: ID
      const rowId = document.createElement('div');
      rowId.className = 'ui-building-row';
      rowId.innerHTML =
        '<span class="ui-label">ID</span>' +
        '<span class="ui-value" data-field="id"></span>';
      body.appendChild(rowId);

      // Zeile: Status
      const rowStatus = document.createElement('div');
      rowStatus.className = 'ui-building-info-row';
      rowStatus.innerHTML =
        '<span class="ui-label">Status</span>' +
        '<span class="ui-value" data-field="status"></span>';
      body.appendChild(rowStatus);

      // Zeile: Kategorie
      const rowCat = document.createElement('div');
      rowCat.className = 'ui-building-info-row';
      rowCat.innerHTML =
        '<span class="ui-label">Kategorie</span>' +
        '<span class="ui-value" data-field="category"></span>';
      body.appendChild(rowCat);

      // Zeile: Position
      const rowPos = document.createElement('div');
      rowPos.className = 'ui-building-info-row';
      rowPos.innerHTML =
        '<span class="ui-label">Position</span>' +
        '<span class="ui-value" data-field="pos"></span>';
      body.appendChild(rowPos);

      // Button-Leiste -------------------------------------------------------
      const footer = document.createElement('div');
      footer.id = 'ui-building-footer';
      footer.className = 'ui-building-menu-footer';

            const btnPause = document.createElement('button');
      btnPause.className = 'ui-button ghost';
      btnPause.textContent = 'Pause';
      btnPause.addEventListener('click', () => {
        if (!currentBuilding) return;

        // ------------------------------------------------------------------
        // WICHTIG: currentBuilding ist NUR das "Detail"-Objekt aus core.input
        // (Kopie), NICHT die echte Building-Instanz im Spiel.
        // Darum schicken wir einen Request ans Spiel, damit dort der echte
        // Building-State (workPaused) gesetzt wird.
        // ------------------------------------------------------------------

        const uid = currentBuilding.uid;
        if (!uid) {
          console.warn('[ui-building] Pause: building ohne uid – kann nicht pausieren', currentBuilding);
          return;
        }

        // Lokale UI-Optimistik: Toggle in Detail, damit Button/Anzeige sofort reagiert
        currentBuilding.workPaused = !currentBuilding.workPaused;

        // UI sofort aktualisieren
        fillPanel(currentBuilding);

        // 1) Request: Game soll den echten State setzen
        try{
          window.dispatchEvent(new CustomEvent('req:building:setPaused', {
            detail:{ uid, paused: !!currentBuilding.workPaused }
          }));
        }catch(e){}

        // 2) Callback-Event (für Smoke/Inspector etc.)
        try{
          window.dispatchEvent(new CustomEvent('cb:building:pause-changed', {
            detail:{ uid, paused: !!currentBuilding.workPaused }
          }));
        }catch(e){}
      });
      footer.appendChild(btnPause);

const btnWork = document.createElement('button');
      btnWork.className = 'ui-button primary';
      btnWork.textContent = 'Arbeitsbereich setzen';
      btnWork.addEventListener('click', onClickWorkArea);
      footer.appendChild(btnWork);

      // Zusammenbauen
      panel.appendChild(header);
      panel.appendChild(body);
      panel.appendChild(footer);

      // In UI einhängen
      UI_ROOT.appendChild(panel);

      // Klicks außerhalb schließen das Menü
      document.addEventListener('click', (ev) => {
        if (!panel) return;
        if (!panel.classList.contains('is-open')) return;

        const target = ev.target;
        if (panel.contains(target)) return; // Klick INS Menü → ignorieren

        hidePanel();
      });

      LOG.ok('[ui-building] Panel erzeugt');
      return panel;
    }

    function fillPanel(buildingDetail) {
      if (!panel) createPanel();
      if (!panel) return;

      const b = buildingDetail || {};
      const title = panel.querySelector('.ui-building-menu-title');
      const idField = panel.querySelector('.ui-value[data-field="id"]');
      const statusField = panel.querySelector('.ui-value[data-field="status"]');
      const catField = panel.querySelector('.ui-value[data-field="category"]');
      const posField = panel.querySelector('.ui-value[data-field="pos"]');

      const titleText = b.title || b.name || b.id || 'Gebäude';
      if (title) title.textContent = titleText;

      if (idField) idField.textContent = b.id || '—';
      if (statusField) statusField.textContent = b.status || 'done';
      if (catField) catField.textContent = b.category || '—';

      if (posField) {
        const x = (b.tileX ?? b.x ?? '?');
        const y = (b.tileY ?? b.y ?? '?');
        const size = b.size || b.dim || '3×3';
        posField.textContent = `${x}, ${y} (${size})`;
      }
    }

    function positionPanel(buildingDetail) {
      if (!panel) createPanel();
      if (!panel) return;

      const camera = window.Camera || window.GameCamera || window.MapCamera || null;
      if (!camera || typeof camera.tileToScreen !== 'function') {
        // Fallback: oben rechts
        panel.style.top = '60px';
        panel.style.right = '20px';
        panel.style.left = 'auto';
        return;
      }

      const tx = buildingDetail.tileX ?? buildingDetail.x;
      const ty = buildingDetail.tileY ?? buildingDetail.y;
      if (typeof tx !== 'number' || typeof ty !== 'number') {
        panel.style.top = '60px';
        panel.style.right = '20px';
        panel.style.left = 'auto';
        return;
      }

      const screen = camera.tileToScreen(tx, ty);
      const offsetX = 40; // leicht nach rechts vom Gebäude
      const offsetY = -40; // leicht über das Gebäude
      let x = Math.round(screen.x + offsetX);
      let y = Math.round(screen.y + offsetY);

      if (x < 10) x = 10;
      if (y < 10) y = 10;

      panel.style.left = x + 'px';
      panel.style.top = y + 'px';
      panel.style.right = 'auto';
    }

    function showPanel(buildingDetail) {
      createPanel();
      if (!panel) return;

      currentBuilding = buildingDetail;

      fillPanel(buildingDetail);
      positionPanel(buildingDetail);

      panel.classList.add('is-open');
      panel.style.display = 'block';

      LOG.info('ℹ️ [ui-building] Menü geöffnet für', buildingDetail?.id);
    }

    function hidePanel() {
      if (!panel) return;
      panel.classList.remove('is-open');
      panel.style.display = 'none';
      currentBuilding = null;
    }

    // -----------------------------------------------------------------------
    // 3. Button-Handler "Arbeitsbereich setzen"
    // -----------------------------------------------------------------------
    function onClickWorkArea(ev) {
      ev.stopPropagation();
      ev.preventDefault();

      if (!currentBuilding) {
        LOG.warn('⚠️ [ui-building] Arbeitsbereich: kein aktuelles Gebäude gesetzt.');
        return;
      }

      // GameWorkArea ansprechen, falls vorhanden
      if (window.GameWorkArea && typeof window.GameWorkArea.beginSelection === 'function') {
        LOG.info('ℹ️ [ui-building] Arbeitsbereich-Button → GameWorkArea.beginSelection', currentBuilding.id);
        window.GameWorkArea.beginSelection(currentBuilding);
      } else {
        LOG.warn('⚠️ [ui-building] GameWorkArea.beginSelection nicht verfügbar – Button ohne Wirkung.');
      }

      // Menü schließen, damit der Spieler die Karte sieht
      hidePanel();
    }

    // -----------------------------------------------------------------------
    // 4. Event-Bindung: cb:building:menu-open
    // -----------------------------------------------------------------------
    window.addEventListener('cb:building:menu-open', (ev) => {
      const detail = ev.detail || {};
      const building = detail.building || detail;

      if (!building) {
        LOG.warn('⚠️ [ui-building] cb:building:menu-open ohne building-Detail erhalten.', detail);
        return;
      }

      showPanel(building);
    });

    LOG.ok('✅ [ui-building] Gebäude-Menü bereit.');
  })();
}
