/* ============================================================================
 * Datei : tools/debug_tools.js
 * Zweck : Mobil/Desk-Inspector (Eruda) sicher initialisieren + Toggles
 * ============================================================================ */
(() => {
  const LOG = (window.CBLog?.ok || console.log).bind(console, '[dbg]');
  let ready = false;

  function ensureEruda(cb){
    if (window.eruda && window.eruda._isInit) { cb?.(); return; }

    function initNow(){
      try{
        if (!window.eruda) return;
        if (!window.eruda._isInit) window.eruda.init();
        window.eruda.show();
        ready = true;
        LOG('eruda ready');
        cb?.();
      } catch(e){ console.warn('[dbg] eruda init fail', e); }
    }

    if (!window.eruda) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/eruda@3/eruda.min.js';
      s.async = true;
      s.onload = initNow;
      s.onerror= ()=>console.warn('[dbg] eruda cdn load fail');
      document.head.appendChild(s);
    } else initNow();
  }

  // UI-Toggle über Taste "i" (Desktop) oder langes Drücken (Mobil)
  function bindToggles(){
    if (bindToggles._bound) return; bindToggles._bound = true;

    window.addEventListener('keydown', (e)=>{
      if (e.key?.toLowerCase()==='i'){
        ensureEruda(()=>window.eruda.toggle());
      }
    });

    // langes Drücken Links-Unten (~1.2s) → toggle
    let t = 0, timer = 0;
    function onTouchStart(ev){
      const touch = ev.touches?.[0]; if (!touch) return;
      const h = window.innerHeight, w = window.innerWidth;
      const px = touch.clientX, py = touch.clientY;
      const corner = (px < w*0.35) && (py > h*0.65); // links unten
      if (!corner) return;
      t = Date.now();
      timer = setTimeout(()=>ensureEruda(()=>window.eruda.toggle()), 1200);
    }
    function onTouchEnd(){ clearTimeout(timer); }

    window.addEventListener('touchstart', onTouchStart, {passive:true});
    window.addEventListener('touchend', onTouchEnd, {passive:true});
  }

  // Autostart (optional)
  if (localStorage.getItem('dbg.auto') === '1'){
    ensureEruda();
  }
  bindToggles();
  LOG('tools ready');
})();
