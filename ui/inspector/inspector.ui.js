/* ============================================================================
 * Datei   : ui/inspector/inspector.ui.js
 * Projekt : Neue Siedler
 * Version : v18.16.3 (final, UI-Diagnose-Tools)
 * Zweck   : Inspector-Tab "ui" zum Untersuchen von Layern/Z-Order/Pointer Events
 *
 * Features:
 *  - Live-Infos zu relevanten Layern (display/visibility/opacity/pointerEvents/zIndex/BBox)
 *  - Highlight/Outline pro Layer toggeln (Mark/Unmark)
 *  - Hit-Test (elementsFromPoint): zeigt Stack + zIndex + display/visibility
 *  - Crosshair-Modus: Zielkreuz → Klick zeigt Stack am Punkt
 *  - Quick Actions: Peek (halten), PE off (2s), Reset aller Tweaks
 *  - Pro-Layer „z+“ (temporärer z-index Boost), pointer-events Toggles
 *
 * Hinweise:
 *  - Rendert in den dynamischen Tab "ui" (Core: generic-view Slot).
 *  - Keine Inspector open/close Buttons mehr – Close oben rechts im Header.
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.ui]'; const VER='v18.16.3';

  // ---- Core-Bridge (robust) -------------------------------------------------
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
    };
  })();

  // ---- Beobachtete Layer (Selector + Label) ---------------------------------
  const LAYERS = [
    { sel:'#game-canvas',       label:'Canvas' },
    { sel:'#ui-root',           label:'UI Root' },
    { sel:'#hud-root',          label:'HUD' },
    { sel:'#build-dock',        label:'BuildDock' },
    { sel:'#btn-build',         label:'Build Button' },
    { sel:'#inspector',         label:'Inspector (Split-Core)' },
    { sel:'#inspector-overlay', label:'Inspector (Overlay-Fallback)' },
    // ggf. ergänzen …
  ];

  // ---- Utils ----------------------------------------------------------------
  const $ = (s,sc=document)=> sc.querySelector(s);
  function css(el){ try{ return getComputedStyle(el); }catch(_){ return {}; } }
  function z(el,cs){ const v=(cs||css(el)).zIndex; return (v==null||v==='auto')?'auto':String(v); }
  function fmtBBox(el){
    if(!el || !el.getBoundingClientRect) return '—';
    const b = el.getBoundingClientRect();
    return `x:${Math.round(b.x)}, y:${Math.round(b.y)}, w:${Math.round(b.width)}, h:${Math.round(b.height)}`;
  }

  // ---------- Style-Save/Restore: sicher temporär ändern ---------------------
  const __SAVE = new WeakMap();
  function saveStyle(el, prop){
    if (!el) return;
    const bag = __SAVE.get(el) || {};
    if (!(prop in bag)) bag[prop] = el.style[prop] || '';
    __SAVE.set(el, bag);
  }
  function restoreStyle(el, prop){
    if (!el) return;
    const bag = __SAVE.get(el) || {};
    if (prop in bag){ el.style[prop] = bag[prop]; delete bag[prop]; }
    __SAVE.set(el, bag);
  }
  function saveThen(el, prop, value){
    saveStyle(el, prop);
    el.style[prop] = value;
  }
  function restoreAll(){
    for (const [el, bag] of __SAVE){
      Object.keys(bag).forEach(prop => { el.style[prop] = bag[prop]; });
      __SAVE.delete(el);
    }
  }

  // ---------- Highlight-Manager ----------------------------------------------
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

  // ---------- Tabellen-Helfer -------------------------------------------------
  function row(values){
    const tr=document.createElement('tr');
    values.forEach(v=>{
      const td=document.createElement('td'); td.className='pad';
      if (v instanceof Node) td.appendChild(v); else td.textContent=v;
      tr.appendChild(td);
    });
    return tr;
  }
  function btn(txt,fn,title){
    const b=document.createElement('button');
    b.className='insp-btn'; b.textContent=txt;
    if(title) b.title=title;
    b.addEventListener('click',fn);
    return b;
  }

  // ---- Hit-Test/Stack -------------------------------------------------------
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

  // ---- UI-Tab ---------------------------------------------------------------
  core.mount('ui', (host)=>{
    host.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className='pad';

    // Header
    const h = document.createElement('h3'); h.textContent='UI / Layer';
    wrap.appendChild(h);

    // --- Toolbar: Diagnose-Tools (kein open/close mehr) ----------------------
    const bar = document.createElement('div'); bar.className='toolbar';

    // (A) Peek (halten): solange gedrückt → pointer-events:none auf body
    const bPeek = btn('Peek (halten)', ()=>{}, 'Solange gedrückt: pointer-events:none auf Body');
    bPeek.addEventListener('mousedown', ()=>{
      saveStyle(document.body, 'pointerEvents');
      document.body.style.pointerEvents='none';
    });
    ['mouseup','mouseleave'].forEach(evt =>
      bPeek.addEventListener(evt, ()=> restoreStyle(document.body,'pointerEvents'))
    );

    // (B) PE off (2s): kurz „durchklicken“ zulassen
    const bPeOff = btn('PE off (2s)', ()=>{
      saveStyle(document.body, 'pointerEvents');
      document.body.style.pointerEvents='none';
      setTimeout(()=> restoreStyle(document.body, 'pointerEvents'), 2000);
    }, 'pointer-events temporär ausschalten (2s)');

    // (C) Crosshair: Zielkreuz → Klick zeigt Stack
    const bCross = btn('Crosshair', ()=> enableCrosshair(), 'Zielkreuz; Klick zeigt elementsFromPoint-Stack');

    // (D) Reset: alle Tweaks zurücknehmen (z+, Highlights, PE-Patches, Crosshair)
    const bReset = btn('Reset tweaks', ()=> resetTweaks(), 'Alle Highlights, z-Boosts und pointer-events-Restores rückgängig');

    const hintFront = document.createElement('span'); hintFront.className='hint';
    hintFront.textContent = 'Tipp: "z+" pro Zeile bringt Layer nach vorn.';

    bar.append(bPeek, bPeOff, bCross, bReset, hintFront);
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
    hint.textContent = 'Bei „Crosshair“ klicken → vollständiger Stack (elementsFromPoint) unten.';
    wrap.appendChild(hint);
    wrap.appendChild(table);

    // Stack-Ausgabe
    const h2 = document.createElement('h3'); h2.textContent='Hit-Test / Stack';
    const stackBox = document.createElement('div');
    stackBox.style.cssText='margin-top:8px; border:1px solid #444; border-radius:8px; padding:8px; max-height:32vh; overflow:auto; font-family:ui-monospace,Menlo,Consolas,monospace; font-size:12px;';
    wrap.appendChild(h2); wrap.appendChild(stackBox);

    host.appendChild(wrap);

    // ---------------- Render-Funktion (1/s) ----------------------------------
    function render(){
      tbody.innerHTML='';
      LAYERS.forEach(def=>{
        const el = $(def.sel, document);
        const c  = el ? css(el) : {};
        const bActions = document.createElement('div');
        bActions.style.display='flex'; bActions.style.gap='6px'; bActions.style.flexWrap='wrap';

        // highlight toggle
        const on = HL.has(el);
        const bHl = btn(on?'Unmark':'Mark', ()=>{
          const now = HL.has(el); toggleHighlight(el, !now); render();
        }, 'Outline/Highlight toggeln');

        // z-boost temporär (per Save/Restore rücksetzbar)
        const bZ = btn('z+', '', 'z-index temporär erhöhen (bis Reset)');
        bZ.addEventListener('click', ()=>{
          if(!el) return;
          saveThen(el, 'zIndex', String(2147483000));
          render();
        });

        // pointer-events toggle
        const bPE = btn((c.pointerEvents==='none')?'PE on':'PE off', ()=>{
          if(!el) return;
          if (c.pointerEvents==='none') restoreStyle(el,'pointerEvents');
          else saveThen(el,'pointerEvents','none');
          render();
        }, 'pointer-events toggeln');

        // show Stack @ center
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

    // ---------------- Crosshair-Modus ----------------------------------------
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

    // ---------------- Lifecycle / Cleanup ------------------------------------
    render();
    host._insp_ui_timer && clearInterval(host._insp_ui_timer);
    host._insp_ui_timer = setInterval(render, 1000);

    function resetTweaks(){
      // Highlights entfernen
      Array.from(HL.keys()).forEach(el=> toggleHighlight(el, false));
      // Styles restoren (PE, zIndex, …)
      restoreAll();
      // Crosshair & Stack-Ausgabe zurücksetzen
      disableCrosshair();
      stackBox.innerHTML='';
      // Neu rendern
      render();
    }

    // Timer stoppen wenn Tab verlassen wird
    const stop = ()=>{ try{ clearInterval(host._insp_ui_timer); }catch(_){ } };
    window.addEventListener('cb:insp:tab:change', (e)=>{
      if(e?.detail?.tab !== 'ui') stop();
    });

    (window.CBLog?.ok||console.log)(MOD,'bereit',VER);
  });

})();
