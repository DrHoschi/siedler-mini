/* ============================================================================
 * Datei   : tools/debug-tools.js
 * Projekt : Neue Siedler – Debug/Inspector
 * Version : v2.0.0 (2025-10-05)
 * Zweck   : Eruda sicher laden, init + robustes show/hide/toggle
 * Events  : keine
 * ============================================================================
 */
(function () {
  const TAG = '[dbg]';
  const log  = (...a)=>console.log(TAG, ...a);
  const warn = (...a)=>console.warn(TAG, ...a);
  const err  = (...a)=>console.error(TAG, ...a);

  // Button optional: <button id="btn-debug">Konsole</button>
  const BTN_ID = 'btn-debug';

  // 1) Loader – falls eruda fehlt, dynamisch nachladen
  function ensureEruda(cb){
    if (window.eruda && typeof window.eruda.init === 'function') { cb?.(); return; }
    const s = document.createElement('script');
    // Bewährt: jsDelivr. Falls die Domain geblockt ist, bleibt alles einfach aus.
    s.src = 'https://cdn.jsdelivr.net/npm/eruda@3.0.1/eruda.min.js';
    s.async = true;
    s.onload = ()=>{ log('eruda ready'); cb?.(); };
    s.onerror= ()=>{ warn('eruda load failed'); };
    document.head.appendChild(s);
  }

  let _inited=false, _visible=false;

  function initEruda(){
    try{
      if (!window.eruda || _inited) return;
      // Wichtig: .init() existiert; .toggle() gibt es NICHT – deshalb eigenes Toggle.
      window.eruda.init();
      // Startzustand: nicht sichtbar (nur auf Button/Shortcut)
      window.eruda.hide?.();
      _inited = true;
      _visible = false;
      log('eruda init ✓');
    }catch(e){
      warn('eruda init fail', e);
    }
  }

  function show(){ try{ window.eruda?.show?.(); _visible = true; }catch{} }
  function hide(){ try{ window.eruda?.hide?.(); _visible = false; }catch{} }
  function toggle(){ (_visible? hide : show)(); }

  // Exponieren (für Konsole/Buttons)
  window.DBG = { show, hide, toggle };

  // Optionaler UI-Button
  function wireButton(){
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    btn.addEventListener('click', ()=>toggle());
  }

  // Boot
  log('bootstrap');
  ensureEruda(()=>{ initEruda(); wireButton(); });

  // Optional: lang-press Ecke rechts-unten → toggle
  document.addEventListener('pointerdown', (ev)=>{
    const vw = window.innerWidth, vh = window.innerHeight;
    const nearCorner = ev.clientX > vw-64 && ev.clientY > vh-64;
    if (!nearCorner) return;
    let active=true; const t0=Date.now();
    const up = ()=>{ active=false; window.removeEventListener('pointerup', up,{capture:true}); };
    window.addEventListener('pointerup', up, {capture:true, once:true});
    setTimeout(()=>{ if(active) toggle(); }, 600); // 600ms press
  });

  // ============================================================================
// Datei: tools/debug-tools.js
// Zweck: Mobile Debug-Konsole (Eruda) sicher initialisieren
// ============================================================================
(() => {
  if (window.__ERUDA_INIT__) return;  // <-- schützt vor Mehrfachstart!
  window.__ERUDA_INIT__ = true;

  try {
    if (!window.eruda) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/eruda';
      script.onload = () => {
        try {
          eruda.init();
          console.log('[dbg] eruda ready');
        } catch (e) {
          console.warn('[dbg] eruda init fail', e);
        }
      };
      document.body.appendChild(script);
    } else if (!eruda._isInit) {
      eruda.init();
      console.log('[dbg] eruda ready (2)');
    } else {
      console.log('[dbg] eruda already active');
    }
  } catch (err) {
    console.error('[dbg] eruda fatal error', err);
  }
})();
  
})();
