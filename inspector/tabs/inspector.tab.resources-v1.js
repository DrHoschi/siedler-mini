/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.resources-v1.js
 * Version : v25.11.01
 * Zweck   : RESSOURCEN – Tabelle + Dazubuchen (add/sub)
 * ========================================================================== */
/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.resources-v1.js
 * Version : v1.0.0 (2025-11-01)
 * Zweck   : Ressourcenstand anfordern & anzeigen
 * Events  : → 'req:res:snapshot'
 *           ← 'cb:res:snapshot'      (detail:{ Holz:..., Stein:..., ... })
 * ========================================================================== */

window.__INSP_TABS__ = window.__INSP_TABS__ || {};
if (window.__INSP_TABS__['<tab:resources>']) return;
window.__INSP_TABS__['<resources-id>'] = true;

(function () {
  function renderResTab(sectionEl) {
    sectionEl.innerHTML = [
      '<div class="insp-pad">',
      '<h3>Ressourcen</h3>',
      '<button type="button" data-action="req">Snapshot anfordern</button>',
      '<pre class="out">(keine Daten)</pre>',
      '</div>'
    ].join('');

    const out = sectionEl.querySelector('.out');
    const reqBtn = sectionEl.querySelector('[data-action="req"]');

    const request = () => {
      out.textContent = '(warte auf Antwort …)';
      window.dispatchEvent(new CustomEvent('req:res:snapshot'));
    };

    const onSnapshot = (ev) => {
      try {
        const data = ev?.detail || {};
        out.textContent = JSON.stringify(data, null, 2) || '(keine Daten)';
      } catch (e) {
        out.textContent = '(Fehler beim Darstellen)';
      }
    };

    reqBtn.addEventListener('click', request);
    window.addEventListener('cb:res:snapshot', onSnapshot, { once: false });

    request();
  }
  window.registerInspectorTab('resources', renderResTab);
})();
(() => {
  const state = { list: {} };

  function mount(panel){
    panel.innerHTML = `
      <div class="insp-toolbar">
        <strong>Ressourcen</strong>
        <span class="spacer"></span>
        <input class="insp-input" id="res-name" placeholder="Name (z.B. Holz)" style="min-width:140px">
        <input class="insp-input" id="res-amount" type="number" value="1" style="width:90px">
        <button class="insp-btn" id="res-add">+ hinzufügen</button>
        <button class="insp-btn" id="res-sub">– abziehen</button>
      </div>
      <table class="insp-table">
        <thead><tr><th>Ressource</th><th style="width:120px">Menge</th></tr></thead>
        <tbody id="res-body"></tbody>
      </table>
    `;

    panel.querySelector("#res-add").addEventListener("click", ()=> applyChange(+1));
    panel.querySelector("#res-sub").addEventListener("click", ()=> applyChange(-1));

    render();
  }

  function render(){
    const tb = document.querySelector('[data-panel="resources"] #res-body');
    if (!tb) return;
    tb.innerHTML = "";
    Object.entries(state.list).forEach(([k,v])=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${k}</td><td>${v}</td>`;
      tb.appendChild(tr);
    });
  }

  function applyChange(sign){
    const root = document.querySelector('[data-panel="resources"]');
    if (!root) return;
    const name = (root.querySelector("#res-name")?.value || "").trim();
    const amount = Number(root.querySelector("#res-amount")?.value || 0);
    if (!name || !Number.isFinite(amount) || amount===0) return;

    const next = { ...state.list, [name]: (state.list[name]||0) + sign * Math.abs(amount) };
    // negative vermeiden (optional):
    if (next[name] < 0) next[name] = 0;

    // global melden → HUD/Spiel + dieser Tab bekommen Update:
    window.dispatchEvent(new CustomEvent("cb:res:change", { detail:{ list: next } }));
  }

  // Spiel/HUD-Update → Zustand übernehmen
  window.addEventListener("cb:res:change", (e)=>{
    state.list = e.detail?.list || {};
    render();
  });

  function ensureMountedOnShow(){
    window.addEventListener("cb:insp:tab:change", (e)=>{
      if (e.detail?.tab !== "resources") return;
      const panel = document.querySelector('[data-panel="resources"]');
      if (!panel) return;
      if (!panel.querySelector("#res-body")) mount(panel);
    });
  }

  document.addEventListener("DOMContentLoaded", ensureMountedOnShow);
})();
