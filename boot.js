// Start/Werkbank + sicheres Laden von main.js
export function boot(){
  const qs = (s)=>document.querySelector(s);

  // Doppeltipp auf Overlay → Vollbild
  qs('#startOverlay').addEventListener('dblclick', ()=>toggleFullscreen());
  qs('#startFsBtn').addEventListener('click', ()=>toggleFullscreen());
  qs('#resetBtn').addEventListener('click', resetAll);

  // Start klick → Overlay aus, main.js laden
  qs('#startBtn').addEventListener('click', startGame);

  // HUD‑Knöpfe (werden von main.js übernommen, aber hier kein Blocker)
  qs('#fsBtn').addEventListener('click', toggleFullscreen);

  // Wenn du direkt starten willst (z. B. nach Reset):  // startGame();

  async function startGame(){
    hideOverlay();
    try{
      const mod = await import('./main.js?v=14.1');   // Cache‑Bust
      if (mod && typeof mod.run === 'function') {
        await mod.run({
          onZoom:(z)=>{ const l=document.getElementById('zoomLbl'); if(l) l.textContent=`Zoom ${z.toFixed(2)}×`; },
          onTool:(name)=>{ const lab=document.getElementById('toolLabel'); if(lab) lab.textContent=name; }
        });
      } else {
        alert('Fehler: main.js geladen, aber run() fehlt.');
      }
    } catch(err){
      console.error(err);
      alert('Startfehler: main.js konnte nicht geladen werden.\n' + (err?.message||err));
      showOverlay();
    }
  }

  function hideOverlay(){ const o = document.getElementById('startOverlay'); if(o) o.style.display='none'; }
  function showOverlay(){ const o = document.getElementById('startOverlay'); if(o) o.style.display='flex'; }

  async function resetAll(){
    try {
      localStorage.clear();
      sessionStorage.clear();
      // Service‑Worker deregistrieren (baut viele „Geister‑Versionen“ ab)
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
      location.reload(true);
    } catch(e) {
      console.warn('ResetAll:', e);
      location.reload(true);
    }
  }

  function toggleFullscreen(){
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) el.requestFullscreen().catch(()=>{});
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});
    }
  }

  // Qualität des Lebens: bei Resize den Canvas‑Owner informieren (main.js hängt sich ran)
  window.addEventListener('resize', ()=>window.dispatchEvent(new CustomEvent('app-resize')));
}
