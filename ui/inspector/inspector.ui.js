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
/* ============================================================================
 * Datei   : ui/inspector/inspector.ui.js
 * Projekt : Neue Siedler
 * Version : v18.16.4 (UI-Tab + Floating Tools / Toastleiste)
 * Zweck   : Layer-/Hit-Diagnose + frei verschiebbare Tool-Leiste, die
 *           auch bei geschlossenem Inspector sichtbar bleibt.
 *
 * Inhalte
 *  - UI-Tab: Layer-Tabelle (z/visibility/pointer-events/BBox), Mark/Unmark,
 *            z+, PE-Toggle, Stack @ center, Crosshair, Peek/PE off, Reset.
 *  - Floating Tools (Toastleiste):
 *      * Show/Hide aus dem UI-Tab
 *      * Buttons: Crosshair, Stack@Cursor, PE off (2s), Reset, Minimize
 *      * Verschiebbar (Drag am Header), Position in localStorage gemerkt
 *      * Bleibt sichtbar, wenn der Inspector geschlossen wird
 *
 * Abhängigkeiten
 *  - inspector.core.js v18.16.3+ (mit generic-view)
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.ui]'; const VER='v18.16.4';

  // ---------- Core-Bridge (robust) -------------------------------------------
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

  // ---------- Beobachtete Layer ----------------------------------------------
  const LAYERS = [
    { sel:'#game-canvas',       label:'Canvas' },
    { sel:'#ui-root',           label:'UI Root' },
    { sel:'#hud-root',          label:'HUD' },
    { sel:'#build-dock',        label:'BuildDock' },
    { sel:'#btn-build',         label:'Build Button' },
    { sel:'#inspector',         label:'Inspector (Split-Core)' },
    { sel:'#inspector-overlay', label:'Inspector (Overlay-Fallback)' },
  ];

  // ---------- Utils ----------------------------------------------------------
  const $ = (s,sc=document)=> sc.querySelector(s);
  function css(el){ try{ return getComputedStyle(el); }catch(_){ return {}; } }
  function z(el,cs){ const v=(cs||css(el)).zIndex; return (v==null||v==='auto')?'auto':String(v); }
  function fmtBBox(el){
    if(!el || !el.getBoundingClientRect) return '—';
    const b = el.getBoundingClientRect();
    return `x:${Math.round(b.x)}, y:${Math.round(b.y)}, w:${Math.round(b.width)}, h:${Math.round(b.height)}`;
  }

  // ---------- Style-Save/Restore (für temporäre Tweaks) ----------------------
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
  function saveThen(el, prop, value){ saveStyle(el, prop); el.style[prop] = value; }
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
      const old = { outline: el.style.outline, outlineOffset: el.style.outlineOffset, boxShadow: el.style.boxShadow };
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

  // ---------- Tabellen-/Button-Helfer ----------------------------------------
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

  // ---------- Hit-Test/Stack -------------------------------------------------
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

  // ==========================================================================#
  //  A) FLOATING TOOLS (Toastleiste) – bleibt bei geschlossenem Inspector da
  // ==========================================================================#
  // Öffentliche, kleine API für Konsole/Tab:
  //   window.UIProbe.show(), hide(), toggle(), isVisible()
  let Probe = null;

  function ensureProbe(){
    if (Probe) return Probe;
    // Root an body (NICHT im Inspector-Host!)
    const root = document.createElement('div');
    root.id = 'ui-probe';
    root.setAttribute('role','dialog');
    root.style.cssText = `
      position:fixed; top:16px; left:16px;
      z-index:2147482999; /* direkt unter Inspector */
      background:#1f1f23; color:#fff; border:1px solid #2a2a2e;
      border-radius:10px; min-width:220px; font:13px/1.4 ui-monospace,Menlo,Consolas,monospace;
      box-shadow:0 6px 24px rgba(0,0,0,.35);
    `;

    // Position aus localStorage wiederherstellen
    try{
      const x = +localStorage.getItem('uiProbe.x');
      const y = +localStorage.getItem('uiProbe.y');
      if (!isNaN(x) && !isNaN(y)){ root.style.left = `${x}px`; root.style.top = `${y}px`; }
    }catch(_){}

    // Header (Drag-Handle)
    const head = document.createElement('div');
    head.style.cssText = `
      display:flex; align-items:center; justify-content:space-between;
      gap:8px; padding:6px 8px; background:#2b2b30; border-radius:10px 10px 0 0;
      cursor:move; user-select:none;`;
    head.innerHTML = `<strong style="font-weight:700">UI Tools</strong>`;
    root.appendChild(head);

    // Controls
    const box = document.createElement('div');
    box.style.cssText = `display:flex; gap:6px; padding:8px; flex-wrap:wrap;`;
    const bCross = mkBtn('Crosshair', 'Zielkreuz; Klick zeigt Stack', ()=> enableCrosshair());
    const bStack = mkBtn('Stack @ cursor', 'Stack an aktueller Mausposition', ()=>{
      const {x,y} = window.__uiProbe_last || {x: innerWidth/2, y: innerHeight/2};
      showStackConsole(x,y);
      flash(root);
    });
    const bPE2s  = mkBtn('PE off 2s', 'pointer-events:none auf Body (2s)', ()=>{
      saveStyle(document.body, 'pointerEvents');
      document.body.style.pointerEvents='none';
      setTimeout(()=> restoreStyle(document.body,'pointerEvents'), 2000);
      flash(root);
    });
    const bReset = mkBtn('Reset', 'Alle Tweaks zurücksetzen', ()=> { resetTweaks(); flash(root); });
    box.append(bCross, bStack, bPE2s, bReset);
    root.appendChild(box);

    // Footer: Minimize / Close
    const foot = document.createElement('div');
    foot.style.cssText = `display:flex; gap:6px; padding:6px 8px; justify-content:flex-end; border-top:1px solid #2a2a2e;`;
    const bMin = mkBtn('–', 'Minimieren', ()=>{
      const collapsed = root.getAttribute('data-min') === '1';
      if (collapsed){ root.setAttribute('data-min','0'); box.style.display='flex'; }
      else { root.setAttribute('data-min','1'); box.style.display='none'; }
    });
    const bClose = mkBtn('×', 'Schließen', ()=> hideProbe());
    foot.append(bMin,bClose); root.appendChild(foot);

    // Drag
    dragEnable(root, head);

    // Maus-Tracking für "Stack @ cursor"
    window.addEventListener('mousemove', (ev)=>{
      window.__uiProbe_last = { x: ev.clientX, y: ev.clientY };
    }, { passive:true });

    document.body.appendChild(root);

    Probe = {
      el: root,
      show(){ root.style.display='block'; root.style.opacity='1'; },
      hide(){ root.style.display='none'; },
      toggle(){ (getComputedStyle(root).display==='none') ? this.show() : this.hide(); },
      isVisible(){ return getComputedStyle(root).display !== 'none'; }
    };
    window.UIProbe = Probe; // für Konsole

    return Probe;
  }

  function showProbe(){ ensureProbe().show(); window.dispatchEvent(new Event('ui-probe:show')); }
  function hideProbe(){ if(!Probe) return; Probe.hide(); window.dispatchEvent(new Event('ui-probe:hide')); }

  // Button-Helfer (kleine dunkle Pills)
  function mkBtn(txt, title, fn){
    const b = document.createElement('button');
    b.textContent = txt; b.title = title||'';
    b.style.cssText = `
      padding:6px 10px; border-radius:999px; border:1px solid #444; background:#3a3a40; color:#fff;
      cursor:pointer; line-height:1.2;`;
    b.addEventListener('click', fn);
    b.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); fn(); } });
    return b;
  }

  function dragEnable(panel, handle){
    let sx=0, sy=0, ox=0, oy=0, dragging=false;
    const onDown = (ev)=>{
      dragging=true;
      sx = ev.clientX; sy = ev.clientY;
      const r = panel.getBoundingClientRect(); ox = r.left; oy = r.top;
      document.addEventListener('mousemove', onMove, { passive:true });
      document.addEventListener('mouseup', onUp, { once:true });
    };
    const onMove = (ev)=>{
      if(!dragging) return;
      const nx = ox + (ev.clientX - sx);
      const ny = oy + (ev.clientY - sy);
      panel.style.left = Math.max(0, Math.min(innerWidth-40, nx)) + 'px';
      panel.style.top  = Math.max(0, Math.min(innerHeight-24, ny)) + 'px';
    };
    const onUp = ()=>{
      dragging=false;
      document.removeEventListener('mousemove', onMove);
      // Position merken
      try{
        const r = panel.getBoundingClientRect();
        localStorage.setItem('uiProbe.x', String(Math.round(r.left)));
        localStorage.setItem('uiProbe.y', String(Math.round(r.top)));
      }catch(_){}
    };
    handle.addEventListener('mousedown', onDown);
  }

  function showStackConsole(x,y){
    const items = stackAt(x,y);
    console.group(`[UI Tools] Stack @ (${x},${y}) – ${items.length} Elemente`);
    items.forEach((it,i)=>{
      console.log(
        `#${i+1} ${it.tag}`,
        { z:it.z, display:it.disp, visibility:it.vis, opacity:it.op, pointer:it.pe }
      );
    });
    console.groupEnd();
  }

  function flash(el){
    saveThen(el,'boxShadow','0 0 0 2px rgba(255,255,255,.35) inset');
    setTimeout(()=> restoreStyle(el,'boxShadow'), 200);
  }

  // ==========================================================================#
  //  B) UI-TAB (generic-view)
  // ==========================================================================#
  core.mount('ui', (host)=>{
    host.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className='pad';

    const h = document.createElement('h3'); h.textContent='UI / Layer';
    wrap.appendChild(h);

    // Toolbar (Seiten-Tools für aktuelle Session)
    const bar = document.createElement('div'); bar.className='toolbar';

    // Floating Tools (Toastleiste) toggle
    const bProbe = btn('Floating Tools: Show', ()=>{
      const vis = ensureProbe().isVisible();
      if (!vis){ showProbe(); bProbe.textContent='Floating Tools: Hide'; }
      else { hideProbe(); bProbe.textContent='Floating Tools: Show'; }
    }, 'Verschiebbare Tool-Leiste ein-/ausblenden (bleibt bei geschlossenem Inspector sichtbar)');

    // Peek (halten): pointer-events:none auf Body solange gedrückt
    const bPeek = btn('Peek (halten)', ()=>{}, 'Solange gedrückt: pointer-events:none auf Body');
    bPeek.addEventListener('mousedown', ()=>{
      saveStyle(document.body, 'pointerEvents');
      document.body.style.pointerEvents='none';
    });
    ['mouseup','mouseleave'].forEach(evt =>
      bPeek.addEventListener(evt, ()=> restoreStyle(document.body,'pointerEvents'))
    );

    // PE off (2s)
    const bPeOff = btn('PE off (2s)', ()=>{
      saveStyle(document.body, 'pointerEvents');
      document.body.style.pointerEvents='none';
      setTimeout(()=> restoreStyle(document.body, 'pointerEvents'), 2000);
    }, 'pointer-events temporär ausschalten (2s)');

    // Crosshair
    const bCross = btn('Crosshair', ()=> enableCrosshair(), 'Zielkreuz; Klick zeigt elementsFromPoint-Stack');
    // Reset
    const bReset = btn('Reset tweaks', ()=> resetTweaks(), 'Alle Highlights, z-Boosts und pointer-events-Restores rückgängig');

    const hintFront = document.createElement('span'); hintFront.className='hint';
    hintFront.textContent = 'Tipp: "z+" pro Zeile bringt Layer nach vorn.';

    bar.append(bProbe, bPeek, bPeOff, bCross, bReset, hintFront);
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

    const hint = document.createElement('div'); hint.className='hint';
    hint.textContent = 'Bei „Crosshair“ klicken → vollständiger Stack unten im Feld.';
    wrap.appendChild(hint);
    wrap.appendChild(table);

    // Stack-Ausgabe
    const h2 = document.createElement('h3'); h2.textContent='Hit-Test / Stack';
    const stackBox = document.createElement('div');
    stackBox.style.cssText='margin-top:8px; border:1px solid #444; border-radius:8px; padding:8px; max-height:32vh; overflow:auto; font-family:ui-monospace,Menlo,Consolas,monospace; font-size:12px;';
    wrap.appendChild(h2); wrap.appendChild(stackBox);

    host.appendChild(wrap);

    // Render
    function render(){
      tbody.innerHTML='';
      LAYERS.forEach(def=>{
        const el = $(def.sel, document);
        const c  = el ? css(el) : {};
        const bActions = document.createElement('div'); bActions.style.cssText='display:flex; gap:6px; flex-wrap:wrap';

        const on = HL.has(el);
        const bHl = btn(on?'Unmark':'Mark', ()=>{
          const now = HL.has(el); toggleHighlight(el, !now); render();
        }, 'Outline/Highlight toggeln');

        const bZ = btn('z+', '', 'z-index temporär erhöhen (bis Reset)');
        bZ.addEventListener('click', ()=>{ if(!el) return; saveThen(el,'zIndex', String(2147483000)); render(); });

        const bPE = btn((c.pointerEvents==='none')?'PE on':'PE off', ()=>{
          if(!el) return;
          if (c.pointerEvents==='none') restoreStyle(el,'pointerEvents');
          else saveThen(el,'pointerEvents','none');
          render();
        }, 'pointer-events toggeln');

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

    // Crosshair (gemeinsam nutzbar für Tab + Floating Tools)
    let crosshairActive=false, crossDiv=null, crossH=null, crossV=null;
    function enableCrosshair(){
      if(crosshairActive) { disableCrosshair(); return; }
      crosshairActive=true;

      crossDiv = document.createElement('div');
      crossDiv.style.cssText='position:fixed; inset:0; z-index:2147483001; pointer-events:none;';
      crossH = document.createElement('div'); crossV = document.createElement('div');
      [crossH, crossV].forEach(l=>{
        l.style.position='absolute'; l.style.background='rgba(100,180,255,.6)';
      });
      crossH.style.height='1px'; crossH.style.left='0'; crossH.style.right='0';
      crossV.style.width='1px';  crossV.style.top='0';  crossV.style.bottom='0';
      crossDiv.append(crossH,crossV); document.body.appendChild(crossDiv);

      const onMove = (ev)=>{ crossH.style.top = ev.clientY+'px'; crossV.style.left = ev.clientX+'px'; };
      const onClick = (ev)=>{
        ev.preventDefault(); ev.stopPropagation();
        showStackAt(ev.clientX, ev.clientY);
        disableCrosshair();
      };
      crossDiv.addEventListener('mousemove', onMove, { passive:true });
      document.addEventListener('click', onClick, { once:true, capture:true });
    }
    function disableCrosshair(){ crosshairActive=false; if(crossDiv){ crossDiv.remove(); crossDiv=null; } }

    function showStackAt(x,y){
      const items = stackAt(x,y);
      const pre = document.createElement('pre');
      const lines = items.map(it=> `${it.tag}\n  z:${it.z} disp:${it.disp} vis:${it.vis} op:${it.op} pe:${it.pe}`);
      pre.textContent = `@(${x},${y}) elementsFromPoint: ${items.length}\n\n` + lines.join('\n\n');
      stackBox.innerHTML=''; stackBox.appendChild(pre);
      // zusätzlich: ins Console-Log für späteres Nachlesen
      showStackConsole(x,y);
    }

    function resetTweaks(){
      Array.from(HL.keys()).forEach(el=> toggleHighlight(el, false));
      restoreAll();
      disableCrosshair();
      stackBox.innerHTML='';
      render();
    }

    // Lifecycle
    render();
    host._insp_ui_timer && clearInterval(host._insp_ui_timer);
    host._insp_ui_timer = setInterval(render, 1000);
    const stop = ()=>{ try{ clearInterval(host._insp_ui_timer); }catch(_){ } };
    window.addEventListener('cb:insp:tab:change', (e)=>{ if(e?.detail?.tab !== 'ui') stop(); });

    (window.CBLog?.ok||console.log)(MOD,'bereit',VER);
  });

})();
