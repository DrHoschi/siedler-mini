/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.layer-v1.js
 * Projekt : Neue Siedler
 * Version : v1.0.1 (2025-11-04, final)
 * Zweck   : Inspector-Tab "Layer" – UI-/Layer-Diagnose (Hit-Test, z-Boost, PE),
 *           Startpanel sichtbar machen OHNE Events zu emittieren.
 *
 * Wichtig
 * - Dieser Tab sendet KEIN "cb:ui-ready" mehr (kein Seiteneffekt!).
 * - "Startpanel zeigen" macht nur DOM-/CSS-Änderungen (panel-open/is-playing).
 *
 * Struktur  : Run-Once → Register-Helper → CSS → Utils → MOUNT → Register
 * Kompatibel: Neuer Inspector (registerInspectorTab), DOM-Fallback nach 10s.
 * ========================================================================== */

(function(){
  'use strict';

  /* ============================== Run-Once ================================= */
  window.__INSP_TABS__ = window.__INSP_TABS__ || {};
  if (window.__INSP_TABS__['layer-v1']) return;
  window.__INSP_TABS__['layer-v1'] = true;

  /* ======================= Late Registration Helper ======================== */
  function universalRegister(tabTitle, tabId, mountFn, order){
    const tryAPI = ()=>{
      if (typeof window.registerInspectorTab === 'function'){
        window.registerInspectorTab(tabTitle, mountFn, { id: tabId, order: order||120 });
        (window.CBLog?.info||console.info)('[layer-tab] via API registriert.');
        return true;
      }
      return false;
    };
    if (tryAPI()) return;

    const onReady = ()=>{ if (tryAPI()) cleanup(); };
    function cleanup(){
      window.removeEventListener('cb:insp:core:ready', onReady);
      window.removeEventListener('cb:insp:content:ready', onReady);
      clearInterval(poll); clearTimeout(tout);
    }
    window.addEventListener('cb:insp:core:ready', onReady);
    window.addEventListener('cb:insp:content:ready', onReady);

    const poll = setInterval(onReady, 200);
    const tout = setTimeout(()=>{
      clearInterval(poll);
      if (typeof window.registerInspectorTab === 'function') return;

      // Minimaler DOM-Fallback
      const insp    = document.querySelector('#inspector');
      const tabs    = insp?.querySelector('.insp-tabs');
      const content = insp?.querySelector('.insp-content');
      if (tabs && content){
        const btn = document.createElement('button');
        btn.textContent = tabTitle; btn.dataset.tab = tabId; tabs.appendChild(btn);
        const sec = document.createElement('section');
        sec.id = tabId; content.appendChild(sec);

        tabs.querySelectorAll('button').forEach(b=>{
          b.addEventListener('click', ()=>{
            const id = b.dataset.tab;
            content.querySelectorAll('section').forEach(s=> s.style.display = (s.id===id?'block':'none'));
            window.dispatchEvent(new CustomEvent('cb:insp:tab:change', { detail:{ tab: b.textContent } }));
          });
        });
        mountFn(sec); sec.style.display='block';
        (window.CBLog?.info||console.info)('[layer-tab] DOM-Fallback aktiv.');
      } else {
        console.warn('[layer-tab] Weder API noch .insp-tabs/.insp-content vorhanden.');
      }
    }, 10000);
  }

  /* ================================= CSS =================================== */
  function injectCSS(){
    if (document.getElementById('insp-layer-inline-style')) return;
    const st = document.createElement('style');
    st.id='insp-layer-inline-style';
    st.textContent = `
#inspector .layer-toolbar{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin:.25rem 0 .75rem}
#inspector .layer-btn{padding:.25rem .6rem;border:1px solid #333;background:#222;border-radius:.5rem;cursor:pointer}
#inspector .layer-table{width:100%;border-collapse:collapse;font-size:12px}
#inspector .layer-table th,#inspector .layer-table td{border-bottom:1px solid #2a2a2e;padding:.4rem .5rem;text-align:left}
#inspector .layer-pre{max-height:260px;overflow:auto;border:1px solid #222;border-radius:.35rem;background:#0f1013;padding:.5rem;margin:0;white-space:pre}
    `;
    document.head.appendChild(st);
  }

  /* ================================= Utils ================================= */
  const $ = (s,sc=document)=> sc.querySelector(s);
  function css(el){ try{ return getComputedStyle(el); }catch(_){ return {}; } }
  function z(el,cs){ const v=(cs||css(el)).zIndex; return (v==null||v==='auto')?'auto':String(v); }
  function fmtBBox(el){
    if(!el || !el.getBoundingClientRect) return '—';
    const b = el.getBoundingClientRect();
    return `x:${Math.round(b.x)}, y:${Math.round(b.y)}, w:${Math.round(b.width)}, h:${Math.round(b.height)}`;
  }

  // Style-Safe: Änderungen rücknehmbar halten
  const SAVE = new WeakMap();
  function save(el, prop){ if(!el) return; const bag=SAVE.get(el)||{}; if(!(prop in bag)) bag[prop]=el.style[prop]||''; SAVE.set(el,bag); }
  function setAndRemember(el, prop, val){ save(el,prop); el.style[prop]=val; }
  function restore(el, prop){ const bag=SAVE.get(el); if(!bag) return; if(prop in bag){ el.style[prop]=bag[prop]; delete bag[prop]; } }
  function restoreAll(){ for (const [el,bag] of SAVE){ Object.keys(bag).forEach(p=> el.style[p]=bag[p]); } SAVE.clear(); }

  // Hit-Test
  function stackAt(x,y){
    const list = (document.elementsFromPoint?.(x,y) || []);
    return list.map(el=>{
      const c = css(el);
      return { el, tag: el.tagName.toLowerCase() + (el.id?('#'+el.id):'') + (el.className?('.'+String(el.className).replace(/\s+/g,'.')):''), z:z(el,c), disp:c.display, vis:c.visibility, op:c.opacity, pe:c.pointerEvents };
    });
  }
  function formatStackText(x,y, items){
    const lines = items.map(it=> `${it.tag}\n  z:${it.z} disp:${it.disp} vis:${it.vis} op:${it.op} pe:${it.pe}`);
    return `@(${x},${y}) elementsFromPoint: ${items.length}\n\n` + lines.join('\n\n');
  }

  /* ============================ Beobachtete Layer =========================== */
  const LAYERS = [
    { sel:'#game',        label:'Canvas (#game)' },
    { sel:'#game-canvas', label:'Canvas (#game-canvas)' },
    { sel:'#ui-root',     label:'UI Root' },
    { sel:'#hud-root',    label:'HUD Root' },
    { sel:'#build-dock',  label:'BuildDock' },
    { sel:'#btn-build',   label:'Build Button' },
    { sel:'#inspector',         label:'Inspector' },
    { sel:'#paths-overlay', label:'PathOverlay (Canvas)' },
    { sel:'#overlay-hocks', label:'OverlayHocks (Canvas)' },
    { sel:'#paths-traces.overlay', label:'Path-tracesOverlay (Canvas)' },
  // falls du für Kreise einen eigenen Layer benutzt:
  // { sel:'#workarea-overlay',  label:'Arbeitsbereich' },
  ];

  /* ================================= MOUNT ================================= */
  function mount(sectionEl){
    injectCSS();

    sectionEl.innerHTML = '';
    const wrap = document.createElement('div');

    const h = document.createElement('h3');
    h.textContent = 'UI / Layer';
    wrap.appendChild(h);

    // ---- Toolbar ------------------------------------------------------------
    const bar = document.createElement('div'); bar.className='layer-toolbar'; wrap.appendChild(bar);
    const mkBtn = (txt, fn)=>{ const b=document.createElement('button'); b.className='layer-btn'; b.textContent=txt; b.addEventListener('click', fn); return b; };

    const bFit = mkBtn('Canvas: Fit Window', ()=>{
      const c = $('#game') || $('#game-canvas');
      if (c){ c.width = innerWidth; c.height = innerHeight; c.style.display='block'; }
    });

    const bPeek = mkBtn('Peek (halten)', ()=>{});
    bPeek.addEventListener('mousedown', ()=> setAndRemember(document.body,'pointerEvents','none'));
    ;['mouseup','mouseleave'].forEach(evt=> bPeek.addEventListener(evt, ()=> restore(document.body,'pointerEvents')));

    const bPE2s = mkBtn('PE off (2s)', ()=>{
      setAndRemember(document.body,'pointerEvents','none');
      setTimeout(()=> restore(document.body,'pointerEvents'), 2000);
    });

    const bStartpanel = mkBtn('Startpanel zeigen', ()=>{
      // Nur DOM/CSS – KEIN cb:ui-ready emitten!
      const html = document.documentElement;
      const sp   = document.getElementById('start-panel');
      document.body.classList.remove('is-playing');   // Spiel-Layout aus
      html.classList.add('panel-open');               // Panel-Layout an
      if (sp){ sp.hidden=false; sp.style.display='grid'; }
    });

    bar.append(bFit, bPeek, bPE2s, bStartpanel);

    // ---- Tabelle ------------------------------------------------------------
    const table = document.createElement('table'); table.className='layer-table';
    table.innerHTML = `
      <thead><tr>
        <th>Layer</th><th>display</th><th>visibility</th><th>opacity</th>
        <th>pointer</th><th>z</th><th>BBox</th><th>Aktion</th>
      </tr></thead><tbody></tbody>`;
    wrap.appendChild(table);
    const tbody = table.querySelector('tbody');

    // ---- Stack-Ausgabe ------------------------------------------------------
    const h2 = document.createElement('h3'); h2.textContent='Hit-Test / Stack';
    const pre = document.createElement('pre'); pre.className='layer-pre'; pre.textContent='—';
    wrap.appendChild(h2); wrap.appendChild(pre);

    sectionEl.appendChild(wrap);

    function row(values){
      const tr=document.createElement('tr');
      values.forEach(v=>{ const td=document.createElement('td'); if (v instanceof Node) td.appendChild(v); else td.textContent=String(v); tr.appendChild(td); });
      return tr;
    }

    function render(){
      tbody.innerHTML='';
      LAYERS.forEach(def=>{
        const el = $(def.sel);
        const c  = el ? css(el) : { display:'—', visibility:'—', opacity:'—', pointerEvents:'—' };

        const actions = document.createElement('div'); actions.style.cssText='display:flex;gap:6px;flex-wrap:wrap';

        // Mark / Unmark
        const bHl = mkBtn('Mark', ()=>{
          if(!el) return;
          const marked = (el.style.outline && el.style.outline.includes('#ffcc00'));
          if (marked){ el.style.outline=''; el.style.outlineOffset=''; el.style.boxShadow=''; }
          else { setAndRemember(el,'outline','2px dashed #ffcc00'); setAndRemember(el,'outlineOffset','-2px'); setAndRemember(el,'boxShadow','0 0 0 2px rgba(255,204,0,.2) inset'); }
        });

        // z-Boost
        const bZ = mkBtn('z+', ()=>{ if(!el) return; setAndRemember(el,'zIndex', String(2147483000)); });

        // pointer-events toggle
        const bPE = mkBtn((c.pointerEvents==='none')?'PE on':'PE off', ()=>{
          if(!el) return;
          if (css(el).pointerEvents==='none') restore(el,'pointerEvents'); else setAndRemember(el,'pointerEvents','none');
        });

        // Stack @ center
        const bHit = mkBtn('Stack @ center', ()=>{
          const b = el?.getBoundingClientRect?.(); if(!b) return;
          const x = Math.max(0, b.left + Math.min(5, b.width/2));
          const y = Math.max(0, b.top  + Math.min(5, b.height/2));
          const items = stackAt(x,y);
          pre.textContent = formatStackText(x,y, items);
          console.group('[Layer] Stack @ center');
          items.forEach((it,i)=> console.log(`#${i+1}`, it.tag, {z:it.z, display:it.disp, visibility:it.vis, opacity:it.op, pointer:it.pe}));
          console.groupEnd();
        });

        actions.append(bHl,bZ,bPE,bHit);

        tbody.appendChild( row([
          (el? `${def.label} (${def.sel})` : `${def.label} (not found)`),
          c.display, c.visibility, c.opacity, c.pointerEvents,
          (el? z(el,c):'—'), (el? fmtBBox(el):'—'), actions
        ]) );
      });
    }

    render();
    sectionEl._layer_timer && clearInterval(sectionEl._layer_timer);
    sectionEl._layer_timer = setInterval(render, 1000);
    window.addEventListener('cb:insp:close', ()=>{ try{ clearInterval(sectionEl._layer_timer); }catch(_){} }, { once:true });

    (window.CBLog?.info||console.info)('ℹ️ Layer-Tab bereit (v1.0.1)');
  }

  /* ============================= Registrierung ============================= */
  universalRegister('Layer📑', 'insp-tab-layer', mount, 120);

})();
