/**
 * Siedler‑Mini — BOOT
 * Version: v16.0.0 (Baseline, 2025‑08‑25)
 * Aufgabe:
 *   - Verbindet DOM ↔ game.js
 *   - Start-Overlay steuern
 *   - Map-Pfad zentral (hier auf map-mini.json)
 */

const $ = (s) => document.querySelector(s);
const log = (...a) => console.log("[boot]", ...a);

async function main() {
  const canvas  = $("#stage");
  const overlay = $("#start");
  const btn     = $("#btnStart");

  const fit = ()=>{ canvas.width = innerWidth|0; canvas.height = innerHeight|0; };
  addEventListener("resize", fit, { passive:true }); fit();

  btn.addEventListener("click", async ()=>{
    overlay.style.display = "none";
    try {
      const { startGame } = await import("./game.js");
      await startGame({
        canvas,
        mapUrl: "assets/maps/map-mini.json",
        onReady: ()=> log("Game ready")
      });
    } catch (e) {
      overlay.style.display = "";
      alert("Fehler beim Start: " + e.message);
      console.error(e);
    }
  });

  if (location.search.includes("autostart")) btn.click();
}
main();
