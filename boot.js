(function boot(){
  const $ = (id)=>document.getElementById(id);
  const startBtn = $('startBtn');
  const fsPreBtn = $('fsPreBtn');
  const card     = $('card');

  let appMod = null;
  async function app(){
    if(!appMod){
      // Falls das Modul noch nicht geladen ist: dynamisch importieren
      appMod = await import('./main.js?v=13.8');
    }
    return appMod;
  }

  startBtn?.addEventListener('click', async (e)=>{
    try{ (await app()).startFromOverlay?.(e); }catch(err){ console.error(err); }
  }, {passive:true});

  fsPreBtn?.addEventListener('click', async ()=>{
    try{ (await app()).toggleFullscreen?.(); }catch(err){ console.error(err); }
  }, {passive:true});

  // Doppelklick/Doppeltipp auf Karte → Vollbild (nur im Overlay)
  let lastTap=0;
  card?.addEventListener('touchend', async ()=>{
    const now=Date.now(); if(now-lastTap<300){ (await app()).toggleFullscreen?.(); }
    lastTap=now;
  }, {passive:true});
  card?.addEventListener('dblclick', async ()=>{
    try{ (await app()).toggleFullscreen?.(); }catch(err){ console.error(err); }
  });
})();
