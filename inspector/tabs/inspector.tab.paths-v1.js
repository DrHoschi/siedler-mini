/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.paths-v1.js
 * Version : v25.11.01
 * Zweck   : PFAD-TOOLS – Buttons für Overlay/Heatmap (steuern Spielmodule)
 * ========================================================================== */
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
