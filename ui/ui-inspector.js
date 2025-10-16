// … oberer Teil unverändert …

// --- Overlay + Fenster -------------------------------------------------------
const wrap = document.createElement("div");
wrap.id = "inspector";
wrap.style.pointerEvents = "auto";

/* WICHTIG: Erzwinge initial "geschlossen", egal was CSS/Restore macht */
wrap.style.display = "none";

wrap.innerHTML = `
  <div class="window wood-frame">
    <div class="tabs">
      <div class="tab active" data-tab="logs">Logs</div>
      <div class="tab" data-tab="tests">Tests</div>
      <div class="tab" data-tab="res">Ressourcen</div>
      <div class="tab" data-tab="paths">Pfade</div>
      <div class="tab" data-tab="editor">Editor</div>
      <button class="ins-close" title="Schließen" aria-label="Schließen">×</button>
    </div>
    <div class="content" id="inspector-content"></div>
    <div class="statusbar" id="inspector-status">Bereit</div>
  </div>
`;
uiRoot.appendChild(wrap);

const contentEl = ()=> document.getElementById("inspector-content");
const statusEl  = ()=> document.getElementById("inspector-status");

// --- Öffnen/Schließen --------------------------------------------------------
function getActiveTab(){
  const t = wrap.querySelector(".tab.active");
  return t ? t.dataset.tab : "logs";
}

function openIns(){
  if(isOpen) return;
  isOpen = true;
  /* als Grid öffnen (Centering) */
  wrap.style.display = "grid";
  /* Oben starten (falls vorher gescrollt) */
  contentEl().scrollTop = 0;
  window.dispatchEvent(new CustomEvent("cb:inspector:open"));
  log("geöffnet");
  safeRender(getActiveTab());
}

function closeIns(){
  if(!isOpen) return;
  isOpen = false;
  wrap.style.display = "none";
  window.dispatchEvent(new CustomEvent("cb:inspector:close"));
  log("geschlossen");
}

// Toggle-Klick
btn.addEventListener("click", ()=> (isOpen ? closeIns() : openIns()));

// Close per X / ESC / Klick-außerhalb
wrap.querySelector(".ins-close").addEventListener("click", closeIns);
document.addEventListener("keydown", (e)=>{ if(e.key==="Escape" && isOpen) closeIns(); });
wrap.addEventListener("click", (e)=>{ if(e.target===wrap && isOpen) closeIns(); });

// Tabs
wrap.querySelectorAll(".tab").forEach(tab=>{
  tab.addEventListener("click", ()=>{
    wrap.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    safeRender(tab.dataset.tab);
  });
});

// Orientation/Resize: neu rendern (Größe passt sich sofort an)
["resize","orientationchange","visibilitychange"].forEach(ev=>{
  window.addEventListener(ev, ()=>{ if(isOpen) safeRender(getActiveTab()); });
});

// … Rest (CBLog-Bridge, Event-Scanner, Render-Funktionen) unverändert …
