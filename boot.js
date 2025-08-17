/* boot.js — UI & Start, lädt game.js dynamisch
   V15.2‑terrain
*/
import { game } from './game.js?v=15.2t';

const $ = (s)=>document.querySelector(s);

function wireUI(){
  const ui = {
    canvas: $("#canvas"),
    startCard: $("#startCard"),
    btnStart: $("#btnStart"),
    btnFs: $("#btnFs"),
    btnReset: $("#btnReset"),
    btnFull: $("#btnFull"),
    btnCenter: $("#btnCenter"),
    btnDebug: $("#btnDebug"),
    tools: $("#tools"),
    hudZoom: $("#hudZoom"),
    hudTool: $("#hudTool"),
  };

  // Sanity‑Check
  const missing = Object.entries(ui).filter(([,el])=>!el).map(([k])=>k);
  if (missing.length){
    console.error("boot.js: Missing UI elements:", missing);
    window.__dbg?.log("boot.js UI missing: "+missing.join(", "));
  }

  // Start
  ui.btnStart?.addEventListener("click", ()=>{
    ui.startCard.style.display = "none";
    game.startGame({
      canvas: ui.canvas,
      onHUD: (k,v)=>{
        if (k==="Zoom") ui.hudZoom.textContent = v;
        if (k==="Tool") ui.hudTool.textContent = v;
        window.__dbg?.set(k, v);
      }
    });
  });

  // Reset
  ui.btnReset?.addEventListener("click", ()=> location.reload());

  // Vollbild (best effort auf iOS/WebKit)
  function goFS(){
    try{
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      req && req.call(el);
    }catch(e){ console.warn(e); }
  }
  ui.btnFs?.addEventListener("click", goFS);
  ui.btnFull?.addEventListener("click", goFS);

  // Camera / Debug
  ui.btnCenter?.addEventListener("click", ()=> game.center?.());
  ui.btnDebug?.addEventListener("click", ()=> window.__debugBox?.classList.toggle('open'));

  // Tools
  ui.tools?.addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-tool]");
    if (!btn) return;
    const name = btn.dataset.tool;
    game.setTool?.(name);
    for (const b of ui.tools.querySelectorAll("button[data-tool]")){
      b.classList.toggle("active", b===btn);
    }
  });

  // Öffentliche Test‑API
  window.gameAPI = {
    start(){ ui.btnStart?.click(); },
    center(){ game.center?.(); },
    setTool(name){ game.setTool?.(name); },
    fullscreen(){ goFS(); },
    reset(){ location.reload(); }
  };

  window.__dbg?.set('boot', 'ok');
}

document.addEventListener("DOMContentLoaded", wireUI);
