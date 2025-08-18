/* boot.js — UI & Start, lädt game.js robust (V15.2t) */
import * as GameMod from './game.js?v=15.2t';

// robustes Resolve: named, default, oder Modul selbst
const game = (GameMod && (GameMod.game || GameMod.default)) || GameMod;

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

// Mini-Overlay für sofortige Fehlersichtbarkeit (statt nur Konsole)
function ensure(fn, msg){
  try { return fn(); } catch(e){
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:999999;background:#2b1a1a;color:#ffdada;border:1px solid #6a2d2d;border-radius:8px;padding:8px 10px;font:13px system-ui';
    box.textContent = 'boot.js Fehler: ' + msg;
    document.body.appendChild(box);
    console.error('[boot.js]', msg, e);
    return null;
  }
}

function wireUI(){
  if (!ui.btnStart) return;

  ui.btnStart.addEventListener("click", ()=>{
    if (!game || typeof game.startGame !== 'function'){
      ensure(()=>{ throw new Error('game.startGame nicht gefunden'); }, 'game.startGame fehlt – stimmt der Export in game.js?');
      return;
    }
    ui.startCard.style.display = "none";
    game.startGame({
      canvas: ui.canvas,
      onHUD: (k,v)=>{
        if (k==="Zoom" && ui.hudZoom) ui.hudZoom.textContent = v;
        if (k==="Tool" && ui.hudTool) ui.hudTool.textContent = v;
      }
    });
  });

  ui.btnReset?.addEventListener("click", ()=> location.reload());

  function goFS(){
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req) req.call(el);
  }
  ui.btnFs?.addEventListener("click", goFS);
  ui.btnFull?.addEventListener("click", goFS);

  ui.btnCenter?.addEventListener("click", ()=> game?.center?.());
  ui.btnDebug?.addEventListener("click", ()=> game?.toggleDebug?.());

  // Tool-Leiste
  ui.tools?.addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-tool]");
    if (!btn) return;
    const name = btn.dataset.tool;
    game?.setTool?.(name);
    // aktiv markieren
    for (const b of ui.tools.querySelectorAll("button[data-tool]")){
      b.classList.toggle("active", b===btn);
    }
    if (ui.hudTool) ui.hudTool.textContent = name;
  });
}
wireUI();

// Sanity: sofort melden, wenn Export nicht passt
window.__BOOT_OK__ = !!(game && typeof game.startGame === 'function');
if (!window.__BOOT_OK__){
  const keys = Object.keys(GameMod || {});
  console.error('[boot.js] game.js geladen, aber Export passt nicht. Verfügbare Keys:', keys);
  ensure(()=>{ throw new Error('Import/Export-Mismatch in game.js'); }, 'Import/Export-Mismatch in game.js (siehe Konsole)');
}

// (Optional) global nutzbar für Tests
window.game = game;
