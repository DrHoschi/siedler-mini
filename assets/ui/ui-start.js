/* ui-start.js — v17.8.9 (clean, no-legacy) */
(function () {
  "use strict";

  const MOD = "[ui-start]";
  const info = (window.CBLog?.info ?? console.log).bind(console, MOD);
  const ok   = (window.CBLog?.ok   ?? console.log).bind(console, MOD);
  const warn = (window.CBLog?.warn ?? console.warn).bind(console, MOD);
  const err  = (window.CBLog?.err  ?? console.error).bind(console, MOD);

  const QS  = (s, r = document) => r.querySelector(s);
  const QSA = (s, r = document) => r.querySelectorAll(s);

  function removeLegacyBars(){
    const suspects = [
      "#start-legacy-bar", ".start-legacy", "#debug-start-bar",
      ".start-buttons", "#startButtons"          // häufige alte Reste
    ];
    suspects.forEach(sel => QSA(sel).forEach(n => n.remove()));
  }

  function ensureStartPanel(){
    let panel = QS("#start-panel");
    if (!panel){
      panel = document.createElement("div");
      panel.id = "start-panel";
      panel.className = "ui-start";
      panel.innerHTML = `<div class="ui-start-bg" role="img" aria-label="Hintergrund"></div>`;
      document.body.appendChild(panel);
      warn("Start-Panel fehlte → neu angelegt.");
    }
    let card = QS(".ui-start-card", panel);
    if (!card){
      card = document.createElement("div");
      card.className = "ui-start-card";
      card.setAttribute("role","dialog");
      card.setAttribute("aria-modal","true");
      card.innerHTML = `
        <h1>Neue Siedler</h1>
        <div class="actions">
          <button id="btnStartNew"        class="btn main">Neues Spiel</button>
          <button id="btnStartResume"     class="btn">Weiterspielen</button>
          <button id="btnStartReset"      class="btn ghost">Reset</button>
          <button id="btnStartFullscreen" class="btn ghost">Fullscreen</button>
        </div>`;
      panel.appendChild(card);
      ok("Start-Card automatisch erzeugt.");
    }
    return panel;
  }

  function wireActions(panel){
    const byId = id => QS("#"+id, panel);

    byId("btnStartNew")?.addEventListener("click", ()=>{ info("Start klick (Neues Spiel)"); dispatchStart(); });
    byId("btnStartResume")?.addEventListener("click", ()=>{ info("Start klick (Weiterspielen)"); dispatchStart(); });
    byId("btnStartReset")?.addEventListener("click", ()=>{
      try{ localStorage.clear(); ok("Spielstand zurückgesetzt."); }catch(_){}
    });
    byId("btnStartFullscreen")?.addEventListener("click", async ()=>{
      try{
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      }catch(e){ warn("Fullscreen nicht möglich:", e?.message || e); }
    });
  }

  function dispatchStart(){
    const panel = QS("#start-panel");
    if (panel){ panel.remove(); ok("Start-Panel entfernt."); }
    try{
      window.dispatchEvent(new CustomEvent("cb:game-start"));
      info("cb:game-start dispatcht");
    }catch(e){ err("cb:game-start fehlgeschlagen:", e?.message || e); }
  }

  function init(){
    info("geladen (v17.8.9)");
    removeLegacyBars();
    const panel = ensureStartPanel();
    wireActions(panel);
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init, { once:true });
  }else{
    init();
  }
})();
