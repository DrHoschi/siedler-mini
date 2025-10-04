/* ============================================================================
 * Datei : tools/debug_tools.js
 * Zweck : Inspector (eruda) + sichtbarer Toggle-Button + Hotkeys
 * ============================================================================ */
(() => {
  const LOG = (window.CBLog?.ok || console.log).bind(console, '[dbg]');
  let ready = false;

  function ensureEruda(cb){
    if (window.eruda && window.eruda._isInit){ cb?.(); return; }

    function initNow(){
      try{
        if (!window.eruda) return;
        if (!window.eruda._isInit) window.eruda.init();
        window.eruda.show();
        ready = true;
        LOG('eruda ready');
        cb?.();
      }catch(e){ console.warn('[dbg] eruda init fail', e); }
    }

    if (!window.eruda){
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/eruda@3/eruda.min.js';
      s.async=true;
      s.onload=initNow;
      s.onerror=()=>console.warn('[dbg] eruda cdn load fail');
      document.head.appendChild(s);
    } else initNow();
  }

  // Sichtbarer Button rechts unten
  function mountButton(){
    if (document.getElementById('dbg-toggle-btn')) return;
    const b=document.createElement('button');
    b.id='dbg-toggle-btn';
    b.textContent='Inspector';
    Object.assign(b.style,{
      position:'fixed', right:'10px', bottom:'64px',
      zIndex: 99999,
      padding:'8px 10px', borderRadius:'10px',
      background:'rgba(20,22,30,.9)', color:'#e9eef7',
      border:'1px solid #3b4b74', font:'600 12px system-ui',
      boxShadow:'0 2px 10px rgba(0,0,0,.35)', cursor:'pointer'
    });
    b.onclick = ()=> ensureEruda(()=>window.eruda.toggle());
    document.body.appendChild(b);
  }

  // Hotkeys: "i"
  window.addEventListener('keydown',(e)=>{
    if ((e.key||'').toLowerCase()==='i'){
      ensureEruda(()=>window.eruda.toggle());
    }
  });

  // Long-press links unten (mobil)
  let timer=0;
  window.addEventListener('touchstart', (ev)=>{
    const t=ev.touches?.[0]; if(!t) return;
    const w=innerWidth, h=innerHeight;
    if (t.clientX < w*0.35 && t.clientY > h*0.65){
      timer=setTimeout(()=>ensureEruda(()=>window.eruda.toggle()), 1200);
    }
  }, {passive:true});
  window.addEventListener('touchend', ()=>clearTimeout(timer), {passive:true});

  // Globale Helfer-Funktion (falls ein UI-Button existiert, der das aufruft)
  window.__dbgToggle = ()=> ensureEruda(()=>window.eruda.toggle());

  // Direkt montieren
  mountButton();
  LOG('tools ready');
})();
