// V15-hf2 boot.js
import { game } from "./game.js";

const $ = (sel) => document.querySelector(sel);

// --- HUD Binding ---
function bindHUD() {
  const toolButtons = document.querySelectorAll('#tools [data-tool]');
  toolButtons.forEach(btn => {
    btn.addEventListener('click', () => game.setTool(btn.dataset.tool));
  });

  $("#btnCenter")?.addEventListener("click", () => game.center());
  $("#btnDebug")?.addEventListener("click", () => game.toggleDebug());
  $("#btnFull") ?.addEventListener("click", () => requestFullscreen());

  // Startkarte
  $("#btnStart") ?.addEventListener("click", () => {
    $("#startCard")?.setAttribute("hidden","hidden");
    game.startGame({ 
      canvas: $("#canvas"),
      onHUD: (k,v) => {
        if (k === "Zoom")  $("#hudZoom").textContent  = v;
        if (k === "Tool")  $("#hudTool").textContent  = v;
      }
    });
    game.center(); // sicherheitshalber gleich nach Start
  });

  $("#btnFs") ?.addEventListener("click", () => requestFullscreen());
  $("#btnReset")?.addEventListener("click", () => location.reload());
}

// --- Fullscreen helper inkl. iOS-Fallback ---
function requestFullscreen(){
  const el = document.documentElement;
  const canFS = el.requestFullscreen || el.webkitRequestFullscreen;
  if (canFS) {
    (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
  } else {
    alert("Vollbild wird von diesem Browser/Modus nicht unterstützt.\nTipp: iOS Safari ab iOS 16 oder Seite zum Homescreen hinzufügen.");
  }
}

// --- Boot ---
window.addEventListener("DOMContentLoaded", () => {
  bindHUD();

  // Canvas sofort initialisieren, damit Grid sichtbar sein kann
  game.initCanvas($("#canvas"), {
    onHUD:(k,v)=>{
      if (k === "Zoom")  $("#hudZoom").textContent  = v;
      if (k === "Tool")  $("#hudTool").textContent  = v;
    }
  });

  // Doppeltipp auf die Karte → Vollbild (wenn möglich)
  let lastTap = 0;
  $("#game").addEventListener("touchend", () => {
    const now = Date.now();
    if (now - lastTap < 350) requestFullscreen();
    lastTap = now;
  }, {passive:true});
});
