/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.paths-v1.js
 * Version : v25.12.01
 * Zweck   : PFAD-TOOLS – Buttons für Overlay/Heatmap (steuern Spielmodule)
 *
 * Bridge  : inspector/inspector.bridges.js verdrahtet die Events ins Spiel.
 * Events  : Inspector sendet:
 *            'cb:path:overlay:on'  | 'cb:path:overlay:off'
 *            'cb:path:heatmap:on'  | 'cb:path:heatmap:off'
 * Hinweis : Es wird NICHT mehr UIInspector.pathOverlay/heatmap aufgerufen,
 *           weil diese Funktionen in deinem Projekt nicht existieren.
 * ========================================================================== */

/* ============================================================================
 * TEIL 1 – Legacy-Tab-Registrierung (altes Inspector-API)
 *   - Wird über window.registerInspectorTab(...) eingebunden.
 *   - Nutzt bereits die Event-API (cb:path:overlay/heatmap:*).
 * ========================================================================== */
(function () {
  function renderPathsTab(sectionEl) {
    sectionEl.innerHTML = [
      '<div class="insp-pad">',
      '<h3>Paths / Overlays</h3>',
      '<div class="row">',
      '  <button type="button" data-action="ovl-on">Overlay ON</button>',
      '  <button type="button" data-action="ovl-off">Overlay OFF</button>',
      '</div>',
      '<div class="row" style="margin-top:8px;">',
      '  <button type="button" data-action="heat-on">Heatmap ON</button>',
      '  <button type="button" data-action="heat-off">Heatmap OFF</button>',
      '</div>',
      '<p style="opacity:.7;margin-top:8px">',
      'Hinweis: Wenn kein PathOverlay vorhanden ist, passiert einfach nichts.',
      '</p>',
      '</div>'
    ].join('');

    // Zentrale Helper-Funktion: schickt Events ins Spiel
    const send = (type) => window.dispatchEvent(new CustomEvent(type));

    sectionEl.querySelector('[data-action="ovl-on"]')
      .addEventListener('click', () => send('cb:path:overlay:on'));

    sectionEl.querySelector('[data-action="ovl-off"]')
      .addEventListener('click', () => send('cb:path:overlay:off'));

    sectionEl.querySelector('[data-action="heat-on"]')
      .addEventListener('click', () => send('cb:path:heatmap:on'));

    sectionEl.querySelector('[data-action="heat-off"]')
      .addEventListener('click', () => send('cb:path:heatmap:off'));
  }

  // Legacy-API des Inspectors (Adapter kümmert sich um Einbindung)
  window.registerInspectorTab && window.registerInspectorTab('paths', renderPathsTab);
})();

/* ============================================================================
 * TEIL 2 – Neues Panel-Layout (data-panel="paths")
 *   - Wird über das Event 'cb:insp:tab:change' aktiviert.
 *   - Zeichnet eine Toolbar + Statuszeile.
 *   - Nutzt dieselbe Event-API wie oben (KEIN UIInspector.* mehr!).
 * ========================================================================== */
(() => {

  // Hilfsfunktion: zentrales Event-Dispatching für Overlay/Heatmap
  function send(type) {
    window.dispatchEvent(new CustomEvent(type));
  }

  // Status-Text unten im Panel aktualisieren
  function setInfo(msg) {
    const box = document.querySelector('[data-panel="paths"] #paths-info');
    if (box) box.textContent = msg;
  }

  function mount(panel){
    panel.innerHTML = `
      <div class="insp-toolbar">
        <strong>Pfade</strong>
        <span class="spacer"></span>
        <button class="insp-btn" id="p-ov-on">Overlay an</button>
        <button class="insp-btn" id="p-ov-off">Overlay aus</button>
        <button class="insp-btn" id="p-hm-on">Heatmap an</button>
        <button class="insp-btn" id="p-hm-off">Heatmap aus</button>
      </div>
      <div id="paths-info" class="pad muted">(keine Daten)</div>
    `;

    const btnOverlayOn  = panel.querySelector("#p-ov-on");
    const btnOverlayOff = panel.querySelector("#p-ov-off");
    const btnHeatOn     = panel.querySelector("#p-hm-on");
    const btnHeatOff    = panel.querySelector("#p-hm-off");

    // Overlay EIN
    btnOverlayOn?.addEventListener("click", () => {
      send('cb:path:overlay:on');
      setInfo('Overlay eingeschaltet (Event cb:path:overlay:on).');
    });

    // Overlay AUS
    btnOverlayOff?.addEventListener("click", () => {
      send('cb:path:overlay:off');
      setInfo('Overlay ausgeschaltet (Event cb:path:overlay:off).');
    });

    // Heatmap EIN
    btnHeatOn?.addEventListener("click", () => {
      send('cb:path:heatmap:on');
      setInfo('Heatmap eingeschaltet (Event cb:path:heatmap:on).');
    });

    // Heatmap AUS
    btnHeatOff?.addEventListener("click", () => {
      send('cb:path:heatmap:off');
      setInfo('Heatmap ausgeschaltet (Event cb:path:heatmap:off).');
    });
  }

  // Wenn dein Spiel Status liefert, hier in die Info-Zeile schreiben
  window.addEventListener("cb:paths:ready", (e)=>{
    const box = document.querySelector('[data-panel="paths"] #paths-info');
    if (!box) return;
    const detail = e.detail ?? { ready: true };
    box.textContent = JSON.stringify(detail, null, 2);
  });

  // Tab-Wechsel abfangen und Panel bei Bedarf erst dann aufbauen
  function ensureMountedOnShow(){
    window.addEventListener("cb:insp:tab:change", (e)=>{
      if (e.detail?.tab !== "paths") return;
      const panel = document.querySelector('[data-panel="paths"]');
      if (!panel) return;
      if (!panel.querySelector("#paths-info")) {
        mount(panel);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", ensureMountedOnShow);
  } else {
    ensureMountedOnShow();
  }
})();
