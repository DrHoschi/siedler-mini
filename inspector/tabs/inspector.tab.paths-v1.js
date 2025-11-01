/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.paths-v1.js
 * Version : v25.11.01
 * Zweck   : PFAD-TOOLS – Buttons für Overlay/Heatmap (steuern Spielmodule)
 * ========================================================================== */
/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.paths-v1.js
 * Version : v1.0.0 (2025-11-01)
 * Zweck   : Pfad-Overlay steuern (on/off + Heatmap)
 * Bridge  : inspector/inspector.bridges.js verdrahtet die Events ins Spiel.
 * Events  : Inspector sendet:
 *            'cb:path:overlay:on'  | 'cb:path:overlay:off'
 *            'cb:path:heatmap:on'  | 'cb:path:heatmap:off'
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
  window.registerInspectorTab('paths', renderPathsTab);
})();
(() => {
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
    panel.querySelector("#p-ov-on").addEventListener("click", ()=> UIInspector.pathOverlay(true));
    panel.querySelector("#p-ov-off").addEventListener("click",()=> UIInspector.pathOverlay(false));
    panel.querySelector("#p-hm-on").addEventListener("click", ()=> UIInspector.heatmap(true));
    panel.querySelector("#p-hm-off").addEventListener("click",()=> UIInspector.heatmap(false));
  }

  // Falls dein Spiel Status liefert:
  window.addEventListener("cb:paths:ready", (e)=>{
    const box = document.querySelector('[data-panel="paths"] #paths-info');
    if (box) box.textContent = JSON.stringify(e.detail ?? {ready:true}, null, 2);
  });

  function ensureMountedOnShow(){
    window.addEventListener("cb:insp:tab:change", (e)=>{
      if (e.detail?.tab !== "paths") return;
      const panel = document.querySelector('[data-panel="paths"]');
      if (!panel) return;
      if (!panel.querySelector("#paths-info")) mount(panel);
    });
  }

  document.addEventListener("DOMContentLoaded", ensureMountedOnShow);
})();
