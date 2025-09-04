/* ============================================================================
 * assets/inspector/inspector.tests.js — v18.10.4
 * Platzhalter-Tab für Ad-hoc-Tests
 * ========================================================================== */
(function(){
  "use strict";
  const Core = window.__InspectorCore__; if (!Core) return;

  function render(body/*, footer*/){
    body.innerHTML = "";
    const p = document.createElement("div");
    p.style.opacity=".85";
    p.textContent = "Tests – Platzhalter.";
    body.appendChild(p);
  }

  Core.registerTab("tests","Tests", render);
})();
