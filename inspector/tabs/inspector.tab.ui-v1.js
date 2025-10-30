/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.ui-v1.js
 * Version : v25.11.01
 * Zweck   : UI – einfache Übersicht (Beispiel: aktive Layer / markierbare Nodes)
 * ========================================================================== */
(() => {
  function mount(panel){
    panel.innerHTML = `
      <div class="insp-toolbar">
        <strong>UI</strong>
        <span class="spacer"></span>
        <button class="insp-btn" id="ui-refresh">Refresh</button>
      </div>
      <div id="ui-list" class="pad" style="white-space:pre-wrap;"></div>
    `;
    panel.querySelector("#ui-refresh").addEventListener("click", refresh);
    refresh();
  }

  function refresh(){
    const list = Array.from(document.body.querySelectorAll("[data-ui]"))
      .map((el,i)=> `${i+1}. ${el.tagName.toLowerCase()}#${el.id||"-"} .${el.className||"-"} [data-ui="${el.getAttribute('data-ui')}"]`)
      .join("\n") || "(keine [data-ui]-Elemente gefunden)";
    const box = document.querySelector('[data-panel="ui"] #ui-list');
    if (box) box.textContent = list;
  }

  function ensureMountedOnShow(){
    window.addEventListener("cb:insp:tab:change", (e)=>{
      if (e.detail?.tab !== "ui") return;
      const panel = document.querySelector('[data-panel="ui"]');
      if (!panel) return;
      if (!panel.querySelector("#ui-list")) mount(panel);
    });
  }

  document.addEventListener("DOMContentLoaded", ensureMountedOnShow);
})();
