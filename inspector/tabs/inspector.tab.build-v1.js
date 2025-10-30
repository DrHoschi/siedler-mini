/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.build-v1.js
 * Version : v25.11.01
 * Zweck   : BUILD – Zeigt Build/Registry-Infos an (ready/update)
 * ========================================================================== */
(() => {
  function mount(panel){
    panel.innerHTML = `
      <div class="insp-toolbar">
        <strong>Build</strong>
        <span class="spacer"></span>
        <button class="insp-btn" id="b-snapshot">Snapshot anfordern</button>
      </div>
      <pre id="build-pre" class="insp-pre" style="white-space:pre-wrap;background:#0f0f12;border:1px solid #333;padding:8px;border-radius:6px;">(noch keine Daten)</pre>
    `;
    panel.querySelector("#b-snapshot").addEventListener("click", ()=>{
      // Dein Spiel kann hierauf reagieren und Details schicken:
      window.dispatchEvent(new CustomEvent("req:build:snapshot"));
    });
  }

  function render(data){
    const pre = document.querySelector('[data-panel="build"] #build-pre');
    if (pre) pre.textContent = JSON.stringify(data ?? {info:"(keine Details)"}, null, 2);
  }

  function ensureMountedOnShow(){
    window.addEventListener("cb:insp:tab:change", (e)=>{
      if (e.detail?.tab !== "build") return;
      const panel = document.querySelector('[data-panel="build"]');
      if (!panel) return;
      if (!panel.querySelector("#build-pre")) mount(panel);
    });
  }

  // Daten-Events
  window.addEventListener("cb:build:ready",  (e)=> render(e.detail));
  window.addEventListener("cb:build:update", (e)=> render(e.detail));
  window.addEventListener("cb:registry:ready",(e)=> render({registry:"ready", ...(e?.detail||{})}));

  document.addEventListener("DOMContentLoaded", ensureMountedOnShow);
})();
