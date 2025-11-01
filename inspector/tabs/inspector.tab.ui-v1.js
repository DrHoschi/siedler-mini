/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.ui-v1.js
 * Version : v25.11.01
 * Zweck   : UI – einfache Übersicht (Beispiel: aktive Layer / markierbare Nodes)
 * ========================================================================== */
/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.ui-v1.js
 * Version : v1.0.0 (2025-11-01)
 * Zweck   : Einfache UI/DOM-Infos (sichtbar/Flags/Counts)
 * ========================================================================== */
(function () {
  function renderUiTab(sectionEl) {
    const info = () => {
      const host = document.getElementById('inspector');
      const flags = {
        body_is_inspector : document.body.classList.contains('is-inspector'),
        host_display      : host ? getComputedStyle(host).display : '(kein host)',
        tabs_rendered     : document.querySelectorAll('#inspector .insp-tabs button').length,
        sections_rendered : document.querySelectorAll('#inspector .insp-content > section').length
      };
      return JSON.stringify(flags, null, 2);
    };

    sectionEl.innerHTML = [
      '<div class="insp-pad">',
      '<h3>UI / Diagnose</h3>',
      '<button type="button" data-action="refresh">aktualisieren</button>',
      '<pre class="out"></pre>',
      '</div>'
    ].join('');

    const out = sectionEl.querySelector('.out');
    const refresh = () => { out.textContent = info(); };

    sectionEl.querySelector('[data-action="refresh"]').addEventListener('click', refresh);
    refresh();
  }
  window.registerInspectorTab('ui', renderUiTab);
})();
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
