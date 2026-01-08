/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.editor-v1.js
 * Version : v25.11.01
 * Zweck   : EDITOREN – Sammelort für deine Editor-Tools (später erweiterbar)
 * ========================================================================== */
(() => {
  function mount(panel){
    panel.innerHTML = `
      <div class="insp-toolbar"><strong>Editoren</strong></div>
      <div class="pad">Hier hängen wir deine Editor-Tools zentral rein (Door/Entrance, DOT, Node-Playground …).</div>
    `;
  }

  function ensureMountedOnShow(){
    window.addEventListener("cb:insp:tab:change", (e)=>{
      if (e.detail?.tab !== "editor") return;
      const panel = document.querySelector('[data-panel="editor"]');
      if (!panel) return;
      if (!panel.firstElementChild) mount(panel);
    });
  }

  document.addEventListener("DOMContentLoaded", ensureMountedOnShow);
})();
