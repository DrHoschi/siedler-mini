/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.layer-v1.js
 * Projekt : Neue Siedler
 * Version : v1.0.0 (2025-11-04)
 * Zweck   : Inspector-Tab "Layer" – Layer-/Hit-Diagnose, z-Boost, pointer-events
 *
 * WICHTIG
 * - Registriert sich direkt über window.registerInspectorTab(...) (keine core-Bridge).
 * - Run-Once-Guard verhindert Doppel-Registrierung.
 * - Nutzt #game ODER #game-canvas (beide geprüft).
 * ========================================================================== */

(function(){
  'use strict';

  // --------------------------- Run-Once-Guard -------------------------------
  window.__INSP_TABS__ = window.__INSP_TABS__ || {};
  if (window.__INSP_TABS__['layer-v1']) return;
  window.__INSP_TABS__['layer-v1'] = true;

  if (typeof window.registerInspectorTab !== 'function') {
    console.warn('[layer-tab] registerInspectorTab fehlt – Tab kann nicht angelegt werden.');
    return;
  }

  // ------------------------------ Inline CSS --------------------------------
  function injectCSS(){
    if (document.getElementById('insp-layer-inline-style')) return;
    const st = document.createElement('style');
    st.id = 'insp-layer-inline-style';
    st.textContent = `
#inspector .layer-toolbar{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin:.25rem 0 .75rem}
#inspector .layer-btn{padding:.25rem .6rem;border:1px solid #333;background:#222;border-radius:.5rem;cursor:pointer}
#inspector .layer-table{width:100%;border-collapse:collapse;font-size:12px}
#inspector .layer-table th,#inspector .layer-table td{border-bottom:1px solid #2a2a2e;padding:.4rem .5rem;text-align:left}
#inspector .layer-pre{max-height:260px;overflow:auto;border:1px solid #222;border-radius:.35rem;background:#0f1013;padding:.5rem;margin:0;white-space:pre}
    `;
    document.head.appendChild(st);
  }

  // ------------------------------- Utils ------------------------------------
  const $ = (s,sc=document)=> sc.querySelector(s);
  const $$ = (s,sc=document)=> Array.from(sc.querySelectorAll(s));
  function css(el){ try{ return getComputedStyle(el); }catch(_){ return {}; } }
  function z(el,cs){ const v=(cs||css(el)).zIndex; return (v==null||v==='auto')?'auto':String(v); }
  function fmtBBox(el){
    if(!el || !el.getBoundingClientRect) return '—';
    const b = el.getBoundingClientRect();
    return `x:${Math.round(b.x)}, y:${Math.round(b.y)}, w:${Math.round(b.width)}, h:${Math.round(b.height)}`;
  }

  const SAVE = new WeakMap();
  function save(el, prop){
    if (!el) return;
    const bag = SAVE.get(el) || {};
    if (!(prop in bag)) bag[prop] = el.style[prop] || '';
    SAVE.set(el, bag);
  }
  function setAndRemember(el, prop, val){ save(el, prop); el.style[prop] = val; }
  function restore(el, prop){
    const bag = SAVE.get(el); if(!bag) return;
    if (prop in bag){ el.style[prop] = bag[prop]; delete bag[prop]; }
  }
  function restoreAll(){
    for (const [el, bag] of SAVE){ Object.keys(bag).forEach(p=> el.style[p]=bag[p]); }
    SAVE.clear();
  }

  function stackAt(x,y){
    const list = (document.elementsFromPoint?.(x,y) || []);
    return list.map(el=>{
      const c = css(el);
      return {
        el,
        tag: el.tagName.toLowerCase() + (el.id?('#'+el.id):'') + (el.className?('.'+String(el.className).replace(/\s+/g,'.')):''),
        z: z(el,c), disp: c.display, vis: c.visibility, op: c.opacity, pe: c.pointerEvents
      };
    });
  }
  function formatStackText(x,y, items){
    const lines = items.map(it=> `${it.tag}\n  z:${it.z} disp:${it.disp} vis:${it.vis} op:${it.op} pe:${it.pe}`);
    return `@(${x},${y}) elementsFromPoint: ${items.length}\n\n` + lines.join('\n\n');
  }

  // --------------------------- Beobachtete Layer -----------------------------
  // Diagnose-Dump zeigt #game als Canvas-ID, nicht #game-canvas. 
  const LAYERS = [
    { sel:'#game',             label:'Canvas (#game)' },
    { sel:'#game-canvas',      label:'Canvas (#game-canvas)' },
    { sel:'#ui-root',          label:'UI Root' },
    { sel:'#hud-root',         label:'HUD Root' },
    { sel:'#build-dock',       label:'BuildDock' },
    { sel:'#btn-build',        label:'Build Button' },
    { sel:'#inspector',        label:'Inspector' }
  ];

  // ------------------------------ Tab-Render --------------------------------
  function mount(sectionEl){
    injectCSS();

    // Grundlayout
    sectionEl.innerHTML = '';
    const wrap = document.createElement('div');

    const h = document.createElement('h3');
    h.textContent = 'UI / Layer';
    wrap.appendChild(h);

    // Toolbar
    const bar = document.createElement('div');
    bar.className = 'layer-toolbar';
    wrap.appendChild(bar);

    const bFit = mkBtn('Canvas: Fit Window', ()=>{
      const c = $('#game') || $('#game-canvas');
      if (c){ c.width = innerWidth; c.height = innerHeight; c.style.display='block'; }
    });
    const bPeek = mkBtn('Peek (halten)', ()=>{
      /* gedrückt halten → body pointer-events:none */
    });
    bPeek.addEventListener('mousedown', ()=>{ setAndRemember(document.body,'pointerEvents','none'); });
    ['mouseup','mouseleave'].forEach(evt=> bPeek.addEventListener(evt, ()=> restore(document.body,'pointerEvents')));

    const bPE2s = mkBtn('PE off (2s)', ()=>{
      setAndRemember(document.body,'pointerEvents','none');
      setTimeout(()=> restore(document.body,'pointerEvents'), 2000);
    });

    const bStartpanel = mkBtn('Startpanel zeigen', ()=>{
      const sp = $('#start-panel');
      if (sp){ sp.style.display='block'; sp.hidden=false; }
      document.body.classList.remove('is-playing');
      window.dispatchEvent(new CustomEvent('cb:ui-ready'));
    });

    bar.append(bFit, bPeek, bPE2s, bStartpanel);

    // Tabelle
    const table = document.createElement('table');
    table.className = 'layer-table';
    table.innerHTML = `
      <thead><tr>
        <th>Layer</th><th>display</th><th>visibility</th><th>opacity</th>
        <th>pointer</th><th>z</th><th>BBox</th><th>Aktion</th>
      </tr></thead>
      <tbody></tbody>
    `;
    wrap.appendChild(table);

    // Stack-Ausgabe
    const h2 = document.createElement('h3'); h2.textContent = 'Hit-Test / Stack';
    const pre = document.createElement('pre'); pre.className = 'layer-pre'; pre.textContent = '—';
    wrap.appendChild(h2); wrap.appendChild(pre);

    sectionEl.appendChild(wrap);

    const tbody = $('tbody', table);

    function mkBtn(txt, fn){
      const b=document.createElement('button'); b.className='layer-btn'; b.textContent=txt; b.addEventListener('click', fn); return b;
    }
    function row(values){
      const tr=document.createElement('tr');
      values.forEach(v=>{
        const td=document.createElement('td');
        if (v instanceof Node) td.appendChild(v); else td.textContent=String(v);
        tr.appendChild(td);
      });
      return tr;
    }

    function render(){
      tbody.innerHTML = '';
      LAYERS.forEach(def=>{
        const el = $(def.sel);
        const c  = el ? css(el) : { display:'—', visibility:'—', opacity:'—', pointerEvents:'—' };
        const actions = document.createElement('div');
        actions.style.display='flex'; actions.style.gap='6px'; actions.style.flexWrap='wrap';

        // Highlight toggle
        const bHl = mkBtn('Mark', ()=>{
          if(!el) return;
          const on = el.style.outline && el.style.outline.includes('#ffcc00');
          if (on){
            el.style.outline=''; el.style.outlineOffset=''; el.style.boxShadow='';
          } else {
            setAndRemember(el,'outline','2px dashed #ffcc00');
            setAndRemember(el,'outlineOffset','-2px');
            setAndRemember(el,'boxShadow','0 0 0 2px rgba(255,204,0,.2) inset');
          }
        });

        // z-Boost
        const bZ = mkBtn('z+', ()=>{ if(!el) return; setAndRemember(el,'zIndex', String(2147483000)); });

        // pointer-events toggle
        const bPE = mkBtn((c.pointerEvents==='none')?'PE on':'PE off', ()=>{
          if(!el) return;
          if (css(el).pointerEvents==='none') restore(el,'pointerEvents');
          else setAndRemember(el,'pointerEvents','none');
        });

        // Stack in Mitte
        const bHit = mkBtn('Stack @ center', ()=>{
          const b = el?.getBoundingClientRect?.(); if(!b) return;
          const x = Math.max(0, b.left + Math.min(5, b.width/2));
          const y = Math.max(0, b.top  + Math.min(5, b.height/2));
          const items = stackAt(x,y);
          pre.textContent = formatStackText(x,y, items);
          console.group('[Layer] Stack');
          items.forEach((it,i)=> console.log(`#${i+1}`, it.tag, {z:it.z, display:it.disp, visibility:it.vis, opacity:it.op, pointer:it.pe}));
          console.groupEnd();
        });

        actions.append(bHl,bZ,bPE,bHit);

        tbody.appendChild( row([
          (el? `${def.label} (${def.sel})` : `${def.label} (not found)`),
          c.display, c.visibility, c.opacity,
          c.pointerEvents, (el? z(el,c):'—'), (el? fmtBBox(el):'—'),
          actions
        ]));
      });
    }

    render();
    // kleines Auto-Refresh, damit Veränderungen sichtbar werden
    sectionEl._layer_timer && clearInterval(sectionEl._layer_timer);
    sectionEl._layer_timer = setInterval(render, 1000);
    window.addEventListener('cb:insp:close', ()=> { try{ clearInterval(sectionEl._layer_timer);}catch(_){} }, { once:true });

    (window.CBLog?.info||console.info)('Layer-Tab bereit (v1.0.0)');
  }

  // ----------------------------- Registrierung ------------------------------
  // eigener Name/ID, um Kollisionen mit bestehendem "UI"-Tab zu vermeiden
  window.registerInspectorTab('Layer', mount, { id:'insp-tab-layer', order: 120 });

})();
