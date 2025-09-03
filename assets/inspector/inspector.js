/* 
========================================
 Datei: assets/inspector/inspector.js
 Projekt: Siedler-Mini
 Version: v18.3.1
 Zweck: Inspector-Fenster mit Tabs
========================================
*/

(function(){
  const VERSION = "v18.3.1";
  const rootId = "inspector";

  // Hilfs-Logger
  const log = (...a)=> (window.CBLog?.info||console.log)("[inspector]",...a);

  // DOM Grundstruktur
  let root, tabs, body;

  function create(){
    if(root) return;
    root = document.createElement("div");
    root.id = rootId;
    root.className = "inspector";
    root.innerHTML = `
      <div class="insp-head">
        <span class="title">Inspector</span>
        <button class="close">Schließen</button>
      </div>
      <div class="insp-tabs">
        <button data-tab="overview" class="active">Übersicht</button>
        <button data-tab="logs">Logs</button>
        <button data-tab="build">Build</button>
        <button data-tab="paths">Pfade</button>
        <button data-tab="tests">Tests</button>
      </div>
      <div class="insp-body"></div>
    `;
    document.body.appendChild(root);

    tabs = root.querySelectorAll(".insp-tabs button");
    body = root.querySelector(".insp-body");

    root.querySelector(".close").onclick=close;
    tabs.forEach(btn=>btn.onclick=()=>openTab(btn.dataset.tab));

    openTab("logs");
    refreshLogs();
  }

  function open(){ create(); root.style.display="block"; }
  function close(){ if(root) root.style.display="none"; }
  function toggle(){ (root && root.style.display==="block")?close():open(); }

  function openTab(tab){
    tabs.forEach(b=>b.classList.remove("active"));
    const btn=[...tabs].find(b=>b.dataset.tab===tab);
    if(btn) btn.classList.add("active");

    if(tab==="logs"){ refreshLogs(); }
    else { body.innerHTML=`<div class="placeholder">[${tab}] noch leer</div>`; }
  }

  // Logs live anbinden
  function refreshLogs(){
    body.innerHTML = `<div id="insp-logs">[Log wird geladen...]</div>`;
    if(!window.CBLog){ body.innerHTML="[CBLog nicht verfügbar]"; return; }

    const container = body.querySelector("#insp-logs");
    window.CBLog.LogStream.start(msg=>{
      const line=document.createElement("div");
      line.textContent=msg.text||msg;
      container.appendChild(line);
      container.scrollTop=container.scrollHeight;
    });
  }

  // Events anbinden
  window.addEventListener("cb:inspector-toggle", ()=>toggle());

  // API
  window.GameUI = window.GameUI||{};
  window.GameUI.openInspector=open;
  window.GameUI.closeInspector=close;
  window.GameUI.toggleInspector=toggle;

  log("bereit ("+VERSION+")");
})();
