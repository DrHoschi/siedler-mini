// ui.js
export const ui = (()=>{

  function toggleFS(){
    const el = document.documentElement;
    const inFS = document.fullscreenElement || document.webkitFullscreenElement;
    if (!inFS){
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) req.call(el);
    }else{
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
    }
  }

  function toggleDebug(el){
    el.hidden = !el.hidden;
  }

  function toggleBuildDock(dock){
    dock.hidden = !dock.hidden;
  }

  function closeBuildDock(dock){
    dock.hidden = true;
    // aktive Auswahl optisch zurücksetzen
    dock.querySelectorAll(".tool.active").forEach(b=>b.classList.remove("active"));
  }

  function markActiveTool(btn){
    const group = btn.closest(".group");
    group?.querySelectorAll(".tool.active").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
  }

  // kleines Drag‑Utility für das Debugfenster
  function makeDebugDraggable(panel){
    let dragging=false, sx=0, sy=0, sl=0, st=0;
    panel.addEventListener("pointerdown",(e)=>{
      dragging=true; panel.classList.add("drag");
      sx=e.clientX; sy=e.clientY;
      const r=panel.getBoundingClientRect(); sl=r.left; st=r.top;
      panel.setPointerCapture(e.pointerId);
    });
    panel.addEventListener("pointermove",(e)=>{
      if(!dragging) return;
      const dx=e.clientX-sx, dy=e.clientY-sy;
      panel.style.left = Math.max(6,sl+dx)+"px";
      panel.style.top  = Math.max(6,st+dy)+"px";
    });
    panel.addEventListener("pointerup",(e)=>{
      dragging=false; panel.classList.remove("drag");
      try{panel.releasePointerCapture(e.pointerId);}catch{}
    });
  }

  return { toggleFS, toggleDebug, toggleBuildDock, closeBuildDock, markActiveTool, makeDebugDraggable };
})();
