/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.tests-v1.js
 * Version : v25.11.01
 * Zweck   : TESTS – Buttons für typische Events (Schnellprüfung)
 * ========================================================================== */
(() => {
  function mount(panel){
    panel.innerHTML = `
      <div class="insp-toolbar">
        <strong>Tests</strong>
        <button class="insp-btn" id="t-open">Open</button>
        <button class="insp-btn" id="t-close">Close</button>
        <button class="insp-btn" id="t-toggle">Toggle</button>
        <span class="spacer"></span>
        <button class="insp-btn" id="t-res">res:change</button>
        <button class="insp-btn" id="t-build">build:ready</button>
        <button class="insp-btn" id="t-paths">paths:ready</button>
      </div>
      <div id="tests-info" class="pad">Bereit.</div>
    `;

    const info = panel.querySelector("#tests-info");
    panel.querySelector("#t-open").onclick   = ()=> UIInspector.open();
    panel.querySelector("#t-close").onclick  = ()=> UIInspector.close();
    panel.querySelector("#t-toggle").onclick = ()=> UIInspector.toggle();

    panel.querySelector("#t-res").onclick = ()=>{
      const demo = { Holz: Math.floor(Math.random()*10), Stein: 5, Fisch: 3 };
      window.dispatchEvent(new CustomEvent("cb:res:change",{detail:{list:demo}}));
      info.textContent = "res:change gesendet.";
    };
    panel.querySelector("#t-build").onclick = ()=>{
      window.dispatchEvent(new CustomEvent("cb:build:ready",{detail:{source:"tests", ts:Date.now()}}));
      info.textContent = "build:ready gesendet.";
    };
    panel.querySelector("#t-paths").onclick = ()=>{
      window.dispatchEvent(new CustomEvent("cb:paths:ready",{detail:{nodes:123, edges:456}}));
      info.textContent = "paths:ready gesendet.";
    };
  }

  function ensureMountedOnShow(){
    window.addEventListener("cb:insp:tab:change", (e)=>{
      if (e.detail?.tab !== "tests") return;
      const panel = document.querySelector('[data-panel="tests"]');
      if (!panel) return;
      if (!panel.querySelector("#tests-info")) mount(panel);
    });
  }

  document.addEventListener("DOMContentLoaded", ensureMountedOnShow);
})();
