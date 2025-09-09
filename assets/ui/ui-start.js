/* ui-start.js — v17.8.3 */
(function(){
  "use strict";
  const log = (t,...a)=>(window.CBLog?.ok||console.log)(`[ui-start] ${t}`,...a);

  function dispatch(name, detail){ try{ window.dispatchEvent(new CustomEvent(name,{detail})); }catch(_){} }

  function wire(){
    const root   = document.getElementById("start-panel");
    const btn    = document.getElementById("btnStart");
    if(!root || !btn){ return; }

    btn.addEventListener("click", ()=>{
      // 1) Startpanel schließen
      root.classList.add("hide");

      // 2) Spielstart-Events senden
      dispatch("cb:ui-ready");        // bleibt zur Abwärtskompatibilität
      dispatch("cb:game-start");      // neuer, klarer Trigger

      log("cb:ui-ready & cb:game-start dispatcht");
    });
  }

  document.readyState !== "loading" ? wire() : document.addEventListener("DOMContentLoaded", wire);
})();
