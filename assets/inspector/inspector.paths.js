/* ============================================================================
 * Inspector Paths – v18.11.1
 *  - Overlay-Path-Tools (toggle/reset) + kleiner Status
 * ========================================================================== */
(function(){
  'use strict';
  const core = window.__INSPECTOR_CORE__;
  if(!core?.api) return;

  core.api.mount('paths', ()=>{
    const host = core.api.getSlot('paths-host'); if(!host) return;
    host.innerHTML='';

    const row = document.createElement('div'); row.className='ins-controls';
    const b1 = document.createElement('button'); b1.className='ins-toggle'; b1.textContent='Overlay umschalten';
    const b2 = document.createElement('button'); b2.className='ins-toggle'; b2.textContent='Heatmap zurücksetzen';
    row.append(b1,b2);

    const st = document.createElement('div');
    st.style.cssText='opacity:.8;margin-top:6px';

    const refresh = ()=>{
      const on = !!(window.__cb && window.__cb.pathsEnabled);
      st.textContent = `Pfade-Overlay: ${on?'AN':'AUS'}`;
    };
    refresh();

    b1.addEventListener('click',()=>{ try{ window.dispatchEvent(new CustomEvent('cb:paths:toggle')); }catch(_){}
      setTimeout(refresh,50);
    });
    b2.addEventListener('click',()=>{ try{ window.dispatchEvent(new CustomEvent('cb:paths:reset')); }catch(_){}
    });

    host.append(row, st);
  });
})();
