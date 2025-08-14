// boot.js — V14.6-mobil (fix: echtes <canvas>, korrekte HUD/Btn-IDs)

import * as game from "./game.js";

(function () {
  // WICHTIG: echtes Canvas-Element holen (id="canvas"), nicht das umschließende DIV (#game)
  const canvas = document.getElementById("canvas");
  const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

  // --- HUD helper: IDs exakt wie in deiner index.html ---
  const hudMap = {
    holz:    document.getElementById("hudHolz"),
    stein:   document.getElementById("hudStein"),
    nahrung: document.getElementById("hudNahrung"),
    gold:    document.getElementById("hudGold"),
    traeger: document.getElementById("hudTraeger"),
    tool:    document.getElementById("hudTool"),
    zoom:    document.getElementById("hudZoom"),
  };
  function onHUD(key, val) {
    const el = hudMap[key];
    if (el) el.textContent = String(val);
  }

  // --- Fullscreen helpers ---
  async function enterFullscreen() {
    try {
      if (canvas.requestFullscreen) await canvas.requestFullscreen();
      else if (canvas.webkitRequestFullscreen) await canvas.webkitRequestFullscreen();
    } catch {}
  }
  async function exitFullscreen() {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
    } catch {}
  }

  // --- Buttons / Overlays (IDs wie in deiner HTML) ---
  const startCard = document.getElementById("startCard");
  const btnStart  = document.getElementById("btnStart");
  const btnReset  = document.getElementById("btnReset");
  const btnCenter = document.getElementById("btnCenter");
  const btnDebug  = document.getElementById("btnDebug");
  const btnFull   = document.getElementById("btnFull"); // rechts oben
  const btnFs     = document.getElementById("btnFs");   // im Start-Overlay

  if (btnFull) btnFull.addEventListener("click", () => enterFullscreen());
  if (btnFs)   btnFs.addEventListener("click", () => enterFullscreen());
  if (btnCenter) btnCenter.addEventListener("click", () => dispatchEvent(new CustomEvent("ui-center")));
  if (btnDebug)  btnDebug.addEventListener("click",  () => dispatchEvent(new CustomEvent("ui-debug")));

  if (btnReset) {
    btnReset.addEventListener("click", () => {
      try { localStorage.removeItem("siedler-mini-save"); } catch {}
      location.reload();
    });
  }

  if (btnStart) {
    btnStart.addEventListener("click", async () => {
      try {
        const ret = await game.startGame({
          canvas,
          DPR,
          onHUD,
          onZoom: (z) => onHUD("zoom", `${z.toFixed(2)}x`),
        });
        if (startCard) startCard.style.display = "none";
        if (ret && ret.requestFullscreen) enterFullscreen();
      } catch (err) {
        alert(`Startfehler: ${err && err.message ? err.message : String(err)}`);
      }
    });
  }

  // Doppeltipp aufs Canvas -> Vollbild (Mobile)
  let lastTap = 0;
  canvas.addEventListener("touchend", () => {
    const now = Date.now();
    if (now - lastTap < 300) enterFullscreen();
    lastTap = now;
  });

  // Canvas-Size an DPR koppeln
  function resize() {
    const r = canvas.getBoundingClientRect();
    canvas.width  = Math.floor(r.width  * DPR);
    canvas.height = Math.floor(r.height * DPR);
    dispatchEvent(new CustomEvent("ui-resize", { detail: { w: canvas.width, h: canvas.height, DPR } }));
  }
  resize();
  addEventListener("resize", resize);

  // Safari: Wheel-Zoom nicht passiv (wird in game.js registriert), zur Sicherheit touch-action deaktiviert
  canvas.style.touchAction = "none";
})();
