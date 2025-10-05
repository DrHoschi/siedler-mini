/* ============================================================================
 * Datei   : tools/debug_tools.js
 * Projekt : Neue Siedler
 * Version : v0.6.0 (2025-10-05)
 * Zweck   : Leichte Debug-Tools (Eruda) mit Guard & Toggle-Button.
 * ============================================================================ */

(() => {
  const log = (...a)=>(window.CBLog?.ok||console.log)('[dbg]',...a);
  const warn= (...a)=>(window.CBLog?.warn||console.warn)('[dbg]',...a);

  // Toggle-Button (unten rechts)
  function ensureBadge(){
    if (document.getElementById('dbg-badge')) return;
    const b=document.createElement('button');
    b.id='dbg-badge';
    Object.assign(b.style,{
      position:'fixed', right:'10px', bottom:'10px', zIndex:'2147483647',
      border:'1px solid #2d415d', borderRadius:'12px', padding:'6px 8px',
      background:'#0f1521', color:'#e6eefc', fontSize:'12px', opacity:'0.85'
    });
    b.textContent='Konsole';
    b.addEventListener('click',()=>{
      try { window.eruda?.show?.(); } catch{}
    });
    document.body.appendChild(b);
  }

  async function loadEruda(){
    if (window.eruda?.init) { log('eruda ready'); ensureBadge(); return true; }
    try{
      await new Promise((res,rej)=>{
        const s=document.createElement('script');
        s.src='https://cdn.jsdelivr.net/npm/eruda@3/eruda.min.js';
        s.onload=res; s.onerror=rej;
        document.head.appendChild(s);
      });
      if (!window.eruda?.init) throw new Error('no eruda.init');
      try{ window.eruda.init(); window.eruda.show(); }catch(e){ warn('eruda init fail', e); }
      ensureBadge();
      return true;
    }catch(e){ warn('eruda load fail', e); return false; }
  }

  // Autoload nach DOM ready
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', loadEruda);
  } else {
    loadEruda();
  }
})();
