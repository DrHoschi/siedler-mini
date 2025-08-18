/* boot.js — UI & Start, lädt game.js dynamisch (robust, iOS-safe)
   V15.2t-robust
*/
let game;
try {
  const m = await import('./game.js?v=15.2t');
  game = m.game;
} catch (e) {
  console.error('[boot] game.js Import fehlgeschlagen:', e);
}

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

function safe(fn, name){
  try { return fn(); } catch(e){ console.error('[boot:'+name+']', e); }
}

function startGameNow(){
  if (!game || !ui.canvas) { console.warn('[boot] game/canvas fehlt'); return; }
  // Startkarte weg
  if (ui.startCard) ui.startCard.style.display = "none";
  // Spiel starten
  safe(()=>game.startGame({
    canvas: ui.canvas,
    onHUD: (k,v)=>{
      if (k==="Zoom" && ui.hudZoom) ui.hudZoom.textContent = v;
      if (k==="Tool" && ui.hudTool) ui.hudTool.textContent = v;
    }
  }), 'startGame');
}

function wireUI(){
  // Button-Handler
  ui.btnStart?.addEventListener("click", startGameNow);

  function goFS(){
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    try { req && req.call(el); } catch(e){ console.warn('[boot] fullscreen:', e); }
  }
  ui.btnFs?.addEventListener("click", goFS);
  ui.btnFull?.addEventListener("click", goFS);

  ui.btnReset?.addEventListener("click", ()=> location.reload());
  ui.btnCenter?.addEventListener("click", ()=> safe(()=>game?.center?.(), 'center'));
  ui.btnDebug?.addEventListener("click", ()=> {
    // öffnet dein debug-Overlay, blockiert nicht die UI
    try { window.__debugBox?.classList.toggle('open'); } catch(e){/*noop*/ }
  });

  // Tools
  ui.tools?.addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-tool]");
    if (!btn) return;
    const name = btn.dataset.tool;
    safe(()=>game?.setTool?.(name), 'setTool');
    for (const b of ui.tools.querySelectorAll("button[data-tool]")){
      b.classList.toggle("active", b===btn);
    }
  });
}

// Public API (Fallbacks aus index.html)
if (typeof window !== 'undefined') {
  window.gameAPI = {
    start: () => startGameNow(),
    center: () => safe(()=>game?.center?.(), 'center'),
    setTool: (n) => safe(()=>game?.setTool?.(n), 'setTool'),
    fullscreen: () => {
      const el = document.documentElement;
      try {
        if (!document.fullscreenElement) { (el.requestFullscreen||el.webkitRequestFullscreen)?.call(el); }
        else { (document.exitFullscreen||document.webkitExitFullscreen)?.call(document); }
      } catch(e){ console.warn('[boot] fullscreen api', e); }
    },
    toggleDebug: () => { try { window.__debugBox?.classList.toggle('open'); } catch(e){}; },
    reset: () => { try { location.reload(); } catch(e){}; }
  };
}

function domReady(cb){
  if (document.readyState === 'complete' || document.readyState === 'interactive') cb();
  else document.addEventListener('DOMContentLoaded', cb, {once:true});
}
domReady(wireUI);

// Sanity-Log – hilft sofort am iPhone
console.log('[boot] wired:',
  !!ui.btnStart, !!ui.btnFull, !!ui.btnFs, !!ui.btnCenter, !!ui.btnDebug, !!ui.tools,
  'game:', !!game);
