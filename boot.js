// boot.js — V14.6-mobil-build
// Startbildschirm, HUD-Wiring, Buttons. Übergibt nach Start an game.startGame(opts).

import * as game from "./game.js";

(function () {
  const canvas = document.getElementById("game");
  const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

  // --- HUD helper ---
  const hudMap = {
    holz: document.querySelector("#hudholz"),
    stein: document.querySelector("#hudstein"),
    nahrung: document.querySelector("#hudnahrung"),
    gold: document.querySelector("#hudgold"),
    traeger: document.querySelector("#hudtraeger"),
    tool: document.querySelector("#hudtool"),
    zoom: document.querySelector("#hudzoom"),
  };
  function onHUD(key, val) {
    const el = hudMap[key];
    if (!el) return;
    el.textContent = String(val);
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

  // --- Start-Overlay-UI ---
  const startCard = document.getElementById("startCard");
  const btnStart = document.getElementById("btnStart");
  const btnFull = document.getElementById("btnFull");
  const btnReset = document.getElementById("btnReset");
  const btnCenter = document.getElementById("btnCenter");
  const btnDebug = document.getElementById("btnDebug");

  // Buttons rechts oben (Fullscreen/Center/Debug) vorhanden?
  if (btnFull) btnFull.addEventListener("click", () => enterFullscreen());
  if (btnCenter) btnCenter.addEventListener("click", () => dispatchEvent(new CustomEvent("ui-center")));
  if (btnDebug) btnDebug.addEventListener("click", () => dispatchEvent(new CustomEvent("ui-debug")));

  if (btnReset) {
    btnReset.addEventListener("click", () => {
      try {
        localStorage.removeItem("siedler-mini-save");
      } catch {}
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
        // Overlay einklappen
        if (startCard) startCard.style.display = "none";
        // Wenn das Spiel gerne direkt Fullscreen möchte, erledigen
        if (ret && ret.requestFullscreen) enterFullscreen();
      } catch (err) {
        alert(`Startfehler: ${err && err.message ? err.message : String(err)}`);
      }
    });
  }

  // Tipp: Doppeltipp auf die Karte → Fullscreen (mobile)
  let lastTap = 0;
  canvas.addEventListener("touchend", () => {
    const now = Date.now();
    if (now - lastTap < 300) enterFullscreen();
    lastTap = now;
  });

  // Bildschirmgröße an DPR anpassen
  function resize() {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.floor(r.width * DPR);
    canvas.height = Math.floor(r.height * DPR);
    dispatchEvent(new CustomEvent("ui-resize", { detail: { w: canvas.width, h: canvas.height, DPR } }));
  }
  resize();
  addEventListener("resize", resize);
})();
