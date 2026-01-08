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
    let btnPauseEl = null;

    // -----------------------------------------------------------------------
    // Helper: Live-Building aus der zentralen Game-Liste holen
    // (wichtig: buildingDetail aus Event ist oft nur ein Snapshot)
    // -----------------------------------------------------------------------
    function getLiveBuilding (detail){
      const uid = detail?.uid || detail?.buildingUid || detail?.homeBuildingUid || null;
      const id  = detail?.id  || null;
      const list = window.Game?.buildings;
      if (!Array.isArray(list)) return null;
      return (uid && list.find(b => b && b.uid === uid)) || (id && list.find(b => b && b.id === id)) || null;
    }

    let panel = null;

    // -----------------------------------------------------------------------
    // 2. Hilfsfunktionen: Panel erzeugen / füllen / anzeigen
    // -----------------------------------------------------------------------

    function createPanel() {
      if (panel) return panel;

      panel = document.createElement('div');
      panel.id = 'ui-building-menu';
      panel.className = 'ui-building-menu ui-card';

      // Header --------------------------------------------------------------
      const header = document.createElement('div');
      header.className = 'ui-building-menu-header';

      const title = document.createElement('div');
      title.className = 'ui-building-menu-title';
      header.appendChild(title);

      const btnClose = document.createElement('button');
      btnClose.className = 'ui-button ui-button-close';
      btnClose.textContent = '×';
      btnClose.addEventListener('click', hidePanel);
      header.appendChild(btnClose);

      // Body ----------------------------------------------------------------
      const body = document.createElement('div');
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
      rowStatus.className = 'ui-building-row';
      rowStatus.innerHTML =
        '<span class="ui-label">Status</span>' +
        '<span class="ui-value" data-field="status"></span>';
      body.appendChild(rowStatus);

      // Zeile: Kategorie
      const rowCat = document.createElement('div');
      rowCat.className = 'ui-building-row';
      rowCat.innerHTML =
        '<span class="ui-label">Kategorie</span>' +
        '<span class="ui-value" data-field="category"></span>';
      body.appendChild(rowCat);

      // Zeile: Position
      const rowPos = document.createElement('div');
      rowPos.className = 'ui-building-row';
      rowPos.innerHTML =
        '<span class="ui-label">Position</span>' +
        '<span class="ui-value" data-field="pos"></span>';
      body.appendChild(rowPos);

      // Button-Leiste -------------------------------------------------------
      const footer = document.createElement('div');
      footer.className = 'ui-building-menu-footer';

      const btnWork = document.createElement('button');
      btnWork.className = 'ui-button primary';
      btnWork.textContent = 'Arbeitsbereich setzen';
      btnWork.addEventListener('click', onClickWorkArea);

      // Pause/Weiter (Produktion + Worker im Gebäude anhalten)
      const btnPause = document.createElement('button');
      btnPause.className = 'ui-button';
      btnPause.textContent = 'Pause';
      btnPause.addEventListener('click', () => {
        const live = getLiveBuilding(currentBuilding) || currentBuilding;
        const uid = live?.uid || currentBuilding?.uid;
        const pausedNow = !!live?.workPaused;
        const next = !pausedNow;
        try{
          window.dispatchEvent(new CustomEvent('req:building:setPaused', { detail:{ uid, paused: next } }));
        }catch(e){}
        // UI sofort aktualisieren (auch wenn Core-Event später kommt)
        if (btnPauseEl) btnPauseEl.textContent = next ? 'Weiter' : 'Pause';
      });
      btnPauseEl = btnPause;
      footer.appendChild(btnPause);

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


      // Pause-Button Text aus Live-State ableiten
      const live = getLiveBuilding(b) || b;
      if (btnPauseEl) btnPauseEl.textContent = live?.workPaused ? 'Weiter' : 'Pause';

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

    // Wenn Pause-Status im Core geändert wird, Menü-Button live aktualisieren
    window.addEventListener('cb:building:pause-changed', (ev) => {
      try{
        const d = ev?.detail || {};
        const uid = d.uid || null;
        const live = getLiveBuilding(currentBuilding) || currentBuilding;
        if (!live) return;
        if (uid && live.uid && uid !== live.uid) return;
        if (btnPauseEl) btnPauseEl.textContent = d.paused ? 'Weiter' : 'Pause';
      }catch(e){}
    });

    LOG.ok('✅ [ui-building] Gebäude-Menü bereit.');
  })();
}