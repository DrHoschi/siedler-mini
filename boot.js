/* boot.js — UI & Start, lädt game.js dynamisch
   V15.2‑terrain
*/
import { game } from './game.js?v=15.2t';

const $ = (s)=>document.querySelector(s);

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

function wireUI(){
  ui.btnStart.addEventListener("click", ()=>{
    ui.startCard.style.display = "none";
    game.startGame({
      canvas: ui.canvas,
      onHUD: (k,v)=>{
        if (k==="Zoom") ui.hudZoom.textContent = v;
        if (k==="Tool") ui.hudTool.textContent = v;
      }
    });
  });

  ui.btnReset.addEventListener("click", ()=>{
    location.reload();
  });

  // Vollbild (funktioniert nicht auf allen iPhones – kein Fehler, nur still)
  function goFS(){
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req) req.call(el);
  }
  ui.btnFs.addEventListener("click", goFS);
  ui.btnFull.addEventListener("click", goFS);

  ui.btnCenter.addEventListener("click", ()=> game.center());
  ui.btnDebug.addEventListener("click", ()=> game.toggleDebug());

  // Tools
  ui.tools.addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-tool]");
    if (!btn) return;
    const name = btn.dataset.tool;
    game.setTool(name);
    // Aktiv‑Klasse
    for (const b of ui.tools.querySelectorAll("button[data-tool]")){
      b.classList.toggle("active", b===btn);
    }
  });
}

wireUI();
