/*
  Projekt: Siedler-Mini
  Datei:   ui-build.js
  Version: v16.1.1
  Zweck:   Bau-Menü initialisieren (FAB + Bottom-Bar); nur UI, keine Game-Logik
*/

(function(){
  const VER = (window.__VERSIONS__?.ui) || "v16.1.1";
  const $ = s=>document.querySelector(s);
  const log = (type, msg)=>{
    const out = $("#log"); if(!out) return;
    const now = new Date().toTimeString().slice(0,8);
    const el = document.createElement("div");
    const icon = type==="ok"?"✅ (ok) ":type==="warn"?"⚠️ (warn) ":"❌ (err) ";
    el.className = "logline "+ (type==="ok"?"ok":type==="warn"?"warn":"err");
    el.textContent = `[${now}] ${icon}${msg}`;
    out.appendChild(el);
    const panel = $("#logPanel"); if(panel) panel.scrollTop = panel.scrollHeight;
  };
  const ok = m=>log("ok",m);

  window.addEventListener("load", ()=>{
    ok(`Bau-Menü bereit (ui-build.js ${VER})`);
  });
})();
