/* ============================================================================
 * Datei   : ui/inspector/inspector.ui.js
 * Projekt : Neue Siedler
 * Version : v18.16.0
 * Zweck   : Inspector-Tab "ui" zum Untersuchen von Layern/Z-Order/Pointer Events
 *
 * Features:
 *  - Live-Infos zu relevanten Layern (display/visibility/opacity/pointerEvents/zIndex/BBox)
 *  - Highlight/Outline pro Layer toggeln
 *  - Hit-Test (elementsFromPoint): zeigt Stack + zIndex + display/visibility
 *  - Crosshair-Modus: Antippen irgendwo → Stack + Styles
 *  - Quick Actions: inspector open/close, pointer-events on/off, z-boost
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.ui]'; const VER='v18.16.0';

  // ---- Core-Bridge robust beziehen ----
  const core = (function(){
    if (window.__INSPECTOR_CORE__?.api) return window.__INSPECTOR_CORE__.api;
    const ins = window.Inspector || window.__INSPECTOR__ || {};
    return {
      registerTab(def){ return (ins.registerTab||ins.addTab||function(){ })(def); },
      getSlot(name){
        return document.querySelector(`#inspector [data-slot="${name}"]`)
            || document.querySelector(`[data-inspector-slot="${name}"]`)
            || document.getElementById(`ins-${name}`)
            || document.getElementById(name);
      },
      mount(id,onShow){ return this.registerTab({ id, title:id, onShow }); },
      open(tab){ (window.Inspector?.open||function(){}) (tab); },
      close(){ (window.Inspector?.close||function(){}) (); },
    };
  })();

  // ---- beobachtete Layer (ID/CSS-Selector + Label) -------------------------
  const LAYERS = [
    { sel:'#game-canvas',     label:'Canvas' },
    { sel:'#ui-root',         label:'UI Root' },
    { sel:'#hud-root',        label:'HUD' },
    { sel:'#build-dock',      label:'BuildDock' },
    { sel:'#btn-build',       label:'Build Button' },
    { sel:'#inspector',       label:'Inspector (Split-Core)' },
    { sel:'#inspector-overlay', label:'Inspector (Overlay-Fallback)' },
    // du kannst beliebig ergänzen …
  ];

  // ---- Utils ---------------------------------------------------------------
  const $ = (s,sc=document)=> sc.querySelector(s);
  function css(el){ try{ return getComputedStyle(el); }catch(_){ return {}; } }
  function z(el,cs){ const v=(cs||css(el)).zIndex; return (v==null||v==='auto')?'auto':String(v); }
  function fmtBBox(el){
    if(!el || !el.getBoundingClientRect) return '—';
    const b = el.getBoundingClientRect();
    return `x:${Math.round(b.x)}, y:${Math.round(b.y)}, w:${Math.round(b.width)}, h:${Math.round(b.height)}`;
  }
  function styleNum(v){ const n = parseFloat(v); return isNaN(n)?0:n; }

  // Highlight-Manager
  const HL = new Map();
  function toggleHighlight(el, on){
    if(!el) return;
    if(on){
      const old = {
        outline: el.style.outline,
        outlineOffset: el.style.outlineOffset,
        boxShadow: el.style.boxShadow
      };
      HL.set(el, old);
      el.style.outline = '2px dashed #ffcc00';
      el.style.outlineOffset = '-2px';
      el.style.boxShadow = '0 0 0 2px rgba(255,204,0,.2) inset';
    }else{
      const old = HL.get(el)||{};
      el.style.outline = old.outline||'';
      el.style.outlineOffset = old.outlineOffset||'';
      el.style.boxShadow = old.boxShadow||'';
      HL.delete(el);
    }
  }

  function row(values){
    const tr=document.createElement('tr');
    values.forEach(v=>{
      const td=document.createElement('td'); td.className='pad';
      if (v instanceof Node) td.appendChild(v); else td.textContent=v;
      tr.appendChild(td);
    });
    return tr;
  }

  // Mini button
  function btn(txt,fn,title){
    const b=document.createElement('button');
    b.className='insp-btn'; b.textContent=txt;
    if(title) b.title=title;
    b.addEventListener('click',fn);
    return b;
  }

  // ---- Hit-Test/Stack ------------------------------------------------------
  function stackAt(x,y){
    const list = (document.elementsFromPoint?.(x,y) || []);
    return list.map(el=>{
      const c = css(el);
      return {
        el,
        tag: el.tagName.toLowerCase() + (el.id?('#'+el.id):'') + (el.className?('.'+String(el.className).replace(/\s+/g,'.')):''),
        z: z(el,c),
        disp: c.display, vis: c.visibility, op: c.opacity, pe: c.pointerEvents
      };
    });
  }

  // ---- UI-Tab --------------------------------------------------------------
  core.mount('ui', (host)=>{
    host.innerHTML = ''; // clean
    const wrap = document.createElement('div'); wrap.className='pad';

    // Header
    const h = document.createElement('h3'); h.textContent='UI / Layer';
    wrap.appendChild(h);

    // Quick actions
    const bar = document.createElement('div'); bar.className='toolbar';
    const bOpen  = btn('Inspector open', ()=> core.open('ui'));
    const bClose = btn('Inspector close',()=> core.close());
    const bPeOff = btn('PE off', ()=>{
      document.body.style.pointerEvents='none';
      setTimeout(()=>{ document.body.style.pointerEvents=''; }, 2000);
    }, 'pointer-events temporär ausschalten (2s)');
    const bCross = btn('Crosshair', ()=> enableCrosshair());
    bar.append(bOpen,bClose, bPeOff, bCross);
    wrap.appendChild(bar);

    // Layer-Tabelle
    const table = document.createElement('table'); table.className='inspector-table';
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>
      <th>Layer</th>
      <th>display</th>
      <th>visibility</th>
      <th>opacity</th>
      <th>pointer</th>
      <th>z</th>
      <th>BBox</th>
      <th>Aktion</th>
    </tr>`;
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    // Hint
    const hint = document.createElement('div'); hint.className='hint';
    hint.textContent = 'Tipp: Bei „Crosshair“ antippen/anklicken → vollständiger Stack (elementsFromPoint) unten.';
    wrap.appendChild(hint);
    wrap.appendChild(table);

    // Stack-Ausgabe
    const h2 = document.createElement('h3'); h2.textContent='Hit-Test / Stack';
    const stackBox = document.createElement('div'); stackBox.style.cssText='margin-top:8px; border:1px solid #444; border-radius:8px; padding:8px; max-height:32vh; overflow:auto; font-family:ui-monospace,Menlo,Consolas,monospace; font-size:12px;';
    wrap.appendChild(h2); wrap.appendChild(stackBox);

    host.appendChild(wrap);

    // Render-Funktion
    function render(){
      tbody.innerHTML='';
      LAYERS.forEach(def=>{
        const el = $(def.sel, document);
        const c  = el ? css(el) : {};
        const bActions = document.createElement('div'); bActions.style.display='flex'; bActions.style.gap='6px'; bActions.style.flexWrap='wrap';

        // highlight toggle
        const on = HL.has(el);
        const bHl = btn(on?'Unmark':'Mark', ()=>{
          const now = HL.has(el); toggleHighlight(el, !now); render();
        }, 'Outline/Highlight toggeln');

        // z-boost temporär
        const bZ = btn('z+','', 'z-index temporär erhöhen (bis zum nächsten Render)');
        bZ.addEventListener('click', ()=>{
          if(!el) return;
          const old = el.getAttribute('data-insp-old-z') ?? '';
          if(!old){ el.setAttribute('data-insp-old-z', (el.style.zIndex||'')); }
          el.style.zIndex = String( 2147483000 );
          render();
        });

        // pointer-events toggle
        const bPE = btn((c.pointerEvents==='none')?'PE on':'PE off', ()=>{
          if(!el) return;
          el.style.pointerEvents = (c.pointerEvents==='none') ? '' : 'none';
          render();
        }, 'pointer-events toggeln');

        // show in Stack sofort (center top-left)
        const bHit = btn('Stack @ center', ()=>{
          const b = el?.getBoundingClientRect?.(); if(!b) return;
          const x = Math.max(0, b.left + Math.min(5, b.width/2));
          const y = Math.max(0, b.top  + Math.min(5, b.height/2));
          showStackAt(x,y);
        });

        bActions.append(bHl,bZ,bPE,bHit);

        tbody.appendChild( row([
          def.label + (el?` (${def.sel})`:' (not found)'),
          c.display||'—',
          c.visibility||'—',
          c.opacity||'—',
          c.pointerEvents||'—',
          el? z(el,c):'—',
          el? fmtBBox(el):'—',
          bActions
        ]));
      });
    }

    // Crosshair
    let crosshairActive=false, crossDiv=null, crossH=null, crossV=null;
    function enableCrosshair(){
      if(crosshairActive) { disableCrosshair(); return; }
      crosshairActive=true;

      crossDiv = document.createElement('div');
      crossDiv.style.cssText='position:fixed; inset:0; z-index:2147483001; pointer-events:none;';
      crossH = document.createElement('div');
      crossV = document.createElement('div');
      [crossH, crossV].forEach(l=>{
        l.style.position='absolute'; l.style.background='rgba(100,180,255,.6)';
      });
      crossH.style.height='1px'; crossH.style.left='0'; crossH.style.right='0';
      crossV.style.width='1px';  crossV.style.top='0';  crossV.style.bottom='0';
      crossDiv.append(crossH,crossV); document.body.appendChild(crossDiv);

      // capture click
      const onMove = (ev)=>{
        const x = ev.clientX, y = ev.clientY;
        crossH.style.top = y+'px'; crossV.style.left = x+'px';
      };
      const onClick = (ev)=>{
        ev.preventDefault(); ev.stopPropagation();
        showStackAt(ev.clientX, ev.clientY);
        disableCrosshair();
      };
      crossDiv.addEventListener('mousemove', onMove, { passive:true });
      document.addEventListener('click', onClick, { once:true, capture:true });
    }
    function disableCrosshair(){
      crosshairActive=false;
      if(crossDiv){ crossDiv.remove(); crossDiv=null; }
    }

    function showStackAt(x,y){
      const items = stackAt(x,y);
      const pre = document.createElement('pre');
      const lines = items.map(it=>{
        return `${it.tag}\n  z:${it.z} disp:${it.disp} vis:${it.vis} op:${it.op} pe:${it.pe}`;
      });
      pre.textContent = `@(${x},${y}) elementsFromPoint: ${items.length}\n\n` + lines.join('\n\n');
      stackBox.innerHTML=''; stackBox.appendChild(pre);
    }

    // Auto-Refresh (klein, per Tab-Wechsel triggert core ohnehin cb:insp:tab:change)
    render();
    host._insp_ui_timer && clearInterval(host._insp_ui_timer);
    host._insp_ui_timer = setInterval(render, 1000);

    // Aufräumen wenn Tab gewechselt → Timer stoppen
    const stop = ()=>{ try{ clearInterval(host._insp_ui_timer); }catch(_){ } };
    window.addEventListener('cb:insp:tab:change', (e)=>{
      if(e?.detail?.tab !== 'ui') stop();
    });

    (window.CBLog?.ok||console.log)(MOD,'bereit',VER);
  });

})();
