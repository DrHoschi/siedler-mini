/* ============================================================================
 * assets/inspector/inspector.paths.js — v18.10.4
 * Pfade-Tab: Overlay toggle + Heatmap reset
 * ========================================================================== */
(function(){
  "use strict";
  const Core = window.__InspectorCore__; if (!Core) return;

  function render(body/*, footer*/){
    body.innerHTML = "";
    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;align-items:center";
    body.appendChild(row);

    const status = document.createElement("div");
    status.style.cssText="opacity:.8";
    const refresh = ()=>{
      const on = !!(window.__cb && window.__cb.pathsEnabled);
      status.textContent = `Pfade-Overlay: ${on ? "AN" : "AUS"}`;
    };
    refresh();

    row.appendChild(btn("Overlay umschalten", ()=>{
      try{ window.dispatchEvent(new CustomEvent("cb:paths:toggle")); }catch{}
      setTimeout(refresh,60);
    }));
    row.appendChild(btn("Heatmap zurücksetzen", ()=>{
      try{ window.dispatchEvent(new CustomEvent("cb:paths:reset")); }catch{}
    }));
    row.appendChild(status);
  }

  function btn(t,fn){ const b=document.createElement("button"); b.className="ins-btn"; b.textContent=t; b.onclick=fn; return b; }

  Core.registerTab("paths","Pfade", render);
})();
