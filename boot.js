/*
 * Siedler‑Mini — BOOT
 * Version: v1.3 (2025‑08‑25)
 * Aufgabe:
 *  - DOM ↔ game.js verbinden
 *  - Start-Overlay steuern (zuerst sichtbar)
 *  - Log-Spot (Debug) + Fehleranzeige
 *  - Map-Ladevorgang anstoßen (assets/maps/map-mini.json)
 * Hinweise:
 *  - Asset‑Lader & Case‑Fallback in core/asset.js (siehe unten)
 *  - game.js soll eine exportierte Funktion startGame(opts) anbieten
 *    mit Signatur: startGame({ canvas, mapUrl, onReady })
 */

import { Assets } from "./core/asset.js";

const $ = (sel) => document.querySelector(sel);
const logEl = $("#dbg");
const log = (...a) => { console.log("[boot]", ...a); if (logEl){ logEl.hidden=false; logEl.textContent = [logEl.textContent, a.join(" ")].filter(Boolean).join("\n").slice(-2000); } };
const showError = (msg) => { alert("Fehler: " + msg); log("ERROR:", msg); };

async function main() {
  log("INDEX early boot");

  // DOM
  const cv = $("#stage");
  const overlay = $("#start");
  const btnStart = $("#btnStart");

  // Canvas fit
  const fit = ()=> { cv.width = Math.floor(window.innerWidth); cv.height = Math.floor(window.innerHeight); };
  window.addEventListener("resize", fit, { passive:true }); fit();

  // Prewarm: kleines Ping an Assets, damit fetch/headers etc. einmal initialisiert sind
  Assets.setOptions({
    // optional: Basisoptionen
  });

  btnStart.addEventListener("click", async ()=>{
    try{
      overlay.style.display = "none";
      log("UI ready, starting game…");

      // Map-URL: existiert lt. deiner filelist
      const mapUrl = "assets/maps/map-mini.json";

      // Lazy import von game.js (Root)
      const mod = await import("./game.js");
      if (typeof mod.startGame !== "function") {
        showError("game.js: export startGame(opts) fehlt.");
        overlay.style.display = ""; return;
      }

      await mod.startGame({
        canvas: cv,
        mapUrl,
        onReady: ()=> log("Game started")
      });

    } catch (err) {
      overlay.style.display = "";
      showError(String(err));
    }
  });

  // Optional: Auto-Start bei ?autostart
  if (location.search.includes("autostart")) btnStart.click();
}

main().catch((e)=> showError(String(e)));
