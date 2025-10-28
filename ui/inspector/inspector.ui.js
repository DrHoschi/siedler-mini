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
/* ============================================================================
 * Datei   : ui/inspector/inspector.ui.js
 * Projekt : Neue Siedler
 * Version : v18.16.5 (final, Floating Tools + Event/State-Bridge)
 * Zweck   : UI-/Layer-Diagnose + verschiebbare Floating-Tool-Leiste
 *
 * Kernideen:
 *  - Floating-Tools funktionieren unabhängig vom Inspector (außerhalb des Hosts).
 *  - Ergebnisse (Stack/Logs) werden in window.UIProbeState persistiert
 *    und via CustomEvents (ui-probe:*) publiziert.
 *  - Der UI-Tab rendert bei Mount die letzten Ergebnisse und subscribed live.
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.ui]'; const VER='v18.16.5';

  // ---------- Core-Bridge -----------------------------------------------------
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

  // ---------- Globaler State & kleine Event-Helfer ---------------------------
  // Wird einmalig angelegt. Inspector & Floating-Tools teilen sich diesen State.
  const ProbeState = (window.UIProbeState = window.UIProbeState || {
    lastStackText: '',            // bereits formattierter Textblock
    history: [],                  // Array von { ts, x, y, items: [...], text }
    max: 50
  });

  function emit(name, detail){ window.dispatchEvent(new CustomEvent(name, { detail })); }
  function rememberStack(x,y, items, text){
    const ts = Date.now();
    const entry = { ts, x, y, items, text };
    ProbeState.history.unshift(entry);
    if (ProbeState.history.length > ProbeState.max) ProbeState.history.pop();
    ProbeState.lastStackText = text;
    emit('ui-probe:stack', { ts, x, y, count: items.length, text });
  }
  function rememberReset(){
    emit('ui-probe:reset', {});
  }

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

  // Style save/restore
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

  // Highlight
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

  // Table helpers
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

  // Hit-Test
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

  // ========================================================================== 
  // Floating Tools (Toastleiste) – außerhalb des Inspectors, mit Events
  // ==========================================================================
  let Probe = null;

  function ensureProbe(){
    if (Probe) return Probe;

    const root = document.createElement('div');
    root.id = 'ui-probe';
    root.setAttribute('role','dialog');
    root.style.cssText = `
      position:fixed; top:16px; left:16px;
      z-index:2147482999;           /* unter Inspector */
      background:#1f1f23; color:#fff; border:1px solid #2a2a2e;
      border-radius:10px; min-width:220px; font:13px/1.4 ui-monospace,Menlo,Consolas,monospace;
      box-shadow:0 6px 24px rgba(0,0,0,.35); user-select:none;
    `;

    // Restore Position
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
      cursor:move;`;
    head.innerHTML = `<strong style="font-weight:700">UI Tools</strong>`;
    root.appendChild(head);

    // Buttons
    const box = document.createElement('div');
    box.style.cssText = `display:flex; gap:6px; padding:8px; flex-wrap:wrap;`;
    const bCross = mkBtn('Crosshair', 'Zielkreuz → Klick zeigt Stack', ()=> enableCrosshair());
    const bStack = mkBtn('Stack @ cursor', 'Stack an aktueller Mausposition', ()=>{
      const {x,y} = window.__uiProbe_last || {x: innerWidth/2, y: innerHeight/2};
      const items = stackAt(x,y);
      const text  = formatStackText(x,y, items);
      consoleStack(x,y, items);
      rememberStack(x,y, items, text);    // <-- persist + event
      flash(root);
    });
    const bPE2s  = mkBtn('PE off 2s', 'pointer-events:none auf Body (2s)', ()=>{
      saveStyle(document.body, 'pointerEvents');
      document.body.style.pointerEvents='none';
      setTimeout(()=> restoreStyle(document.body,'pointerEvents'), 2000);
      flash(root);
    });
    const bReset = mkBtn('Reset', 'Alle Tweaks zurücksetzen', ()=>{
      resetTweaks();
      rememberReset();                     // <-- event
      flash(root);
    });
    box.append(bCross, bStack, bPE2s, bReset);
    root.appendChild(box);

    // >>> In inspector.ui.js innerhalb deiner init(root, api) Funktion ergänzen:

// --- Theme-Umschalter einfügen ---------------------------------------------
const box = document.createElement('section');
box.dataset.tab = 'UI'; // erscheint im UI-Tab
box.innerHTML = `
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
    <label style="font-weight:600">Theme:</label>
    <select id="insp-theme">
      <option value="dark">dark</option>
      <option value="light">light</option>
      <option value="wood">wood</option>
    </select>
    <button id="insp-theme-apply" class="insp-tab">Übernehmen</button>
    <span id="insp-theme-hint" style="opacity:.7;font-size:.9em"></span>
  </div>
`;
box.style.margin = '6px 0 10px';
root.appendChild(box);

// --- Setzen/Laden -----------------------------------------------------------
function setTheme(name){
  document.documentElement.setAttribute('data-theme', name);
  try{ localStorage.setItem('insp-theme', name); }catch(e){}
  hint.textContent = `aktiv: ${name}`;
}
const select = box.querySelector('#insp-theme');
const apply  = box.querySelector('#insp-theme-apply');
const hint   = box.querySelector('#insp-theme-hint');

// Letzte Auswahl laden
const saved = (localStorage.getItem('insp-theme') || 'dark');
select.value = saved;
setTheme(saved);

// Klick-Apply
apply.addEventListener('click', () => setTheme(select.value));

// Optional: sofort reagieren bei Auswahl (ohne Button)
// select.addEventListener('change', () => setTheme(select.value));
    
    // Footer
    const foot = document.createElement('div');
    foot.style.cssText = `display:flex; gap:6px; padding:6px 8px; justify-content:flex-end; border-top:1px solid #2a2a2e;`;
    const bMin = mkBtn('–', 'Minimieren', ()=>{
      const min = root.getAttribute('data-min') === '1';
      if (min){ root.setAttribute('data-min','0'); box.style.display='flex'; }
      else    { root.setAttribute('data-min','1'); box.style.display='none'; }
    });
    const bClose = mkBtn('×', 'Schließen', ()=> hideProbe());
    foot.append(bMin,bClose);
    root.appendChild(foot);

    // Drag
    dragEnable(root, head);

    // Maus-Tracking für „Stack @ cursor“
    window.addEventListener('mousemove', (ev)=>{
      window.__uiProbe_last = { x: ev.clientX, y: ev.clientY };
    }, { passive:true });

    document.body.appendChild(root);

    Probe = {
      el: root,
      show(){ root.style.display='block'; root.style.opacity='1'; emit('ui-probe:show',{}); },
      hide(){ root.style.display='none'; emit('ui-probe:hide',{}); },
      toggle(){ (getComputedStyle(root).display==='none') ? this.show() : this.hide(); },
      isVisible(){ return getComputedStyle(root).display !== 'none'; }
    };
    window.UIProbe = Probe;

    return Probe;
  }

  function mkBtn(txt, title, fn){
    const b = document.createElement('button');
    b.textContent = txt; b.title = title||'';
    b.style.cssText = `padding:6px 10px; border-radius:999px; border:1px solid #444; background:#3a3a40; color:#fff; cursor:pointer; line-height:1.2;`;
    b.addEventListener('click', fn);
    b.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); fn(); } });
    return b;
  }

  function dragEnable(panel, handle){
    let sx=0, sy=0, ox=0, oy=0, dragging=false;
    const onDown = (ev)=>{
      dragging=true; sx = ev.clientX; sy = ev.clientY;
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
      try{
        const r = panel.getBoundingClientRect();
        localStorage.setItem('uiProbe.x', String(Math.round(r.left)));
        localStorage.setItem('uiProbe.y', String(Math.round(r.top)));
      }catch(_){}
    };
    handle.addEventListener('mousedown', onDown);
  }

  // Format/Console
  function formatStackText(x,y, items){
    const lines = items.map(it=> `${it.tag}\n  z:${it.z} disp:${it.disp} vis:${it.vis} op:${it.op} pe:${it.pe}`);
    return `@(${x},${y}) elementsFromPoint: ${items.length}\n\n` + lines.join('\n\n');
  }
  function consoleStack(x,y, items){
    console.group(`[UI Tools] Stack @ (${x},${y}) – ${items.length} Elemente`);
    items.forEach((it,i)=>{
      console.log(`#${i+1} ${it.tag}`, { z:it.z, display:it.disp, visibility:it.vis, opacity:it.op, pointer:it.pe });
    });
    console.groupEnd();
  }
  function flash(el){ saveThen(el,'boxShadow','0 0 0 2px rgba(255,255,255,.35) inset'); setTimeout(()=> restoreStyle(el,'boxShadow'), 200); }

  function showProbe(){ ensureProbe().show(); }
  function hideProbe(){ if(!Probe) return; Probe.hide(); }

  // ========================================================================== 
  // UI-Tab (generic-view) – subscribed auf ui-probe:* Events
  // ==========================================================================
  core.mount('ui', (host)=>{
    host.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className='pad';

    const h = document.createElement('h3'); h.textContent='UI / Layer';
    wrap.appendChild(h);

    // Toolbar (inkl. Floating-Tools Toggle)
    const bar = document.createElement('div'); bar.className='toolbar';
    const bProbe = btn('Floating Tools: Show', ()=>{
      const v = ensureProbe().isVisible();
      if (!v){ showProbe(); bProbe.textContent='Floating Tools: Hide'; }
      else    { hideProbe(); bProbe.textContent='Floating Tools: Show'; }
    }, 'Toastleiste ein-/ausblenden (bleibt auch bei geschlossenem Inspector sichtbar)');

    const bPeek = btn('Peek (halten)', ()=>{}, 'Solange gedrückt: pointer-events:none auf Body');
    bPeek.addEventListener('mousedown', ()=>{ saveStyle(document.body,'pointerEvents'); document.body.style.pointerEvents='none'; });
    ;['mouseup','mouseleave'].forEach(evt => bPeek.addEventListener(evt, ()=> restoreStyle(document.body,'pointerEvents')));

    const bPeOff = btn('PE off (2s)', ()=>{
      saveStyle(document.body, 'pointerEvents');
      document.body.style.pointerEvents='none';
      setTimeout(()=> restoreStyle(document.body, 'pointerEvents'), 2000);
    }, 'pointer-events temporär ausschalten (2s)');

    const bCross = btn('Crosshair', ()=> enableCrosshair(), 'Zielkreuz; Klick zeigt elementsFromPoint-Stack');
    const bReset = btn('Reset tweaks', ()=> { resetTweaks(); rememberReset(); }, 'Alle Tweaks & Saved Styles zurücksetzen');

    const hintFront = document.createElement('span'); hintFront.className='hint';
    hintFront.textContent = 'Tipp: "z+" pro Zeile bringt Layer nach vorn.';

    bar.append(bProbe, bPeek, bPeOff, bCross, bReset, hintFront);
    wrap.appendChild(bar);

    // Layer-Tabelle
    const table = document.createElement('table'); table.className='inspector-table';
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>
      <th>Layer</th><th>display</th><th>visibility</th><th>opacity</th>
      <th>pointer</th><th>z</th><th>BBox</th><th>Aktion</th>
    </tr>`;
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    const hint = document.createElement('div'); hint.className='hint';
    hint.textContent = 'Bei „Crosshair“ klicken → vollständiger Stack unten.';
    wrap.appendChild(hint);
    wrap.appendChild(table);

    // Stack-Ausgabe (spiegelt UIProbeState.lastStackText)
    const h2 = document.createElement('h3'); h2.textContent='Hit-Test / Stack';
    const stackBox = document.createElement('div');
    stackBox.style.cssText='margin-top:8px; border:1px solid #444; border-radius:8px; padding:8px; max-height:32vh; overflow:auto; font-family:ui-monospace,Menlo,Consolas,monospace; font-size:12px;';
    wrap.appendChild(h2); wrap.appendChild(stackBox);

    host.appendChild(wrap);

    // Initial: letzten Stack zeigen (falls vorhanden)
    if (ProbeState.lastStackText){
      stackBox.textContent = ProbeState.lastStackText;
    } else {
      stackBox.textContent = '—';
    }

    // Render-Funktion Tabelle
    function render(){
      tbody.innerHTML='';
      LAYERS.forEach(def=>{
        const el = $(def.sel, document);
        const c  = el ? css(el) : {};
        const bActions = document.createElement('div'); bActions.style.cssText='display:flex; gap:6px; flex-wrap:wrap';

        const on = HL.has(el);
        const bHl = btn(on?'Unmark':'Mark', ()=>{ const now=HL.has(el); toggleHighlight(el,!now); render(); }, 'Outline/Highlight toggeln');

        const bZ = btn('z+', '', 'z-index temporär erhöhen (bis Reset)');
        bZ.addEventListener('click', ()=>{ if(!el) return; saveThen(el,'zIndex', String(2147483000)); render(); });

        const bPE = btn((c.pointerEvents==='none')?'PE on':'PE off', ()=>{
          if(!el) return;
          if (c.pointerEvents==='none') restoreStyle(el,'pointerEvents'); else saveThen(el,'pointerEvents','none');
          render();
        }, 'pointer-events toggeln');

        const bHit = btn('Stack @ center', ()=>{
          const b = el?.getBoundingClientRect?.(); if(!b) return;
          const x = Math.max(0, b.left + Math.min(5, b.width/2));
          const y = Math.max(0, b.top  + Math.min(5, b.height/2));
          const items = stackAt(x,y);
          const text  = formatStackText(x,y, items);
          consoleStack(x,y, items);
          rememberStack(x,y, items, text);        // persist + event
          stackBox.textContent = text;            // direkt anzeigen falls Tab offen ist
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

    // Crosshair (nutzt rememberStack)
    let crosshairActive=false, crossDiv=null, crossH=null, crossV=null;
    function enableCrosshair(){
      if(crosshairActive) { disableCrosshair(); return; }
      crosshairActive=true;

      crossDiv = document.createElement('div');
      crossDiv.style.cssText='position:fixed; inset:0; z-index:2147483001; pointer-events:none;';
      crossH = document.createElement('div'); crossV = document.createElement('div');
      [crossH, crossV].forEach(l=>{ l.style.position='absolute'; l.style.background='rgba(100,180,255,.6)'; });
      crossH.style.height='1px'; crossH.style.left='0'; crossH.style.right='0';
      crossV.style.width='1px';  crossV.style.top='0';  crossV.style.bottom='0';
      crossDiv.append(crossH,crossV); document.body.appendChild(crossDiv);

      const onMove = (ev)=>{ crossH.style.top = ev.clientY+'px'; crossV.style.left = ev.clientX+'px'; };
      const onClick = (ev)=>{
        ev.preventDefault(); ev.stopPropagation();
        const x = ev.clientX, y = ev.clientY;
        const items = stackAt(x,y);
        const text  = formatStackText(x,y, items);
        consoleStack(x,y, items);
        rememberStack(x,y, items, text);     // persist + event
        stackBox.textContent = text;          // falls Tab offen
        disableCrosshair();
      };
      crossDiv.addEventListener('mousemove', onMove, { passive:true });
      document.addEventListener('click', onClick, { once:true, capture:true });
    }
    function disableCrosshair(){ crosshairActive=false; if(crossDiv){ crossDiv.remove(); crossDiv=null; } }

    function resetTweaks(){
      Array.from(HL.keys()).forEach(el=> toggleHighlight(el, false));
      restoreAll();
      disableCrosshair();
      stackBox.textContent = '—';
    }

    // Subscribe: Wenn Floating-Tools Events feuern, UI hier aktualisieren
    const onStack = (e)=>{ if (e?.detail?.text) stackBox.textContent = e.detail.text; };
    const onReset = ()=>{ stackBox.textContent = '—'; };
    window.addEventListener('ui-probe:stack', onStack);
    window.addEventListener('ui-probe:reset', onReset);

    // Lifecycle
    render();
    host._insp_ui_timer && clearInterval(host._insp_ui_timer);
    host._insp_ui_timer = setInterval(render, 1000);

    const stop = ()=>{ try{ clearInterval(host._insp_ui_timer); }catch(_){ } 
      window.removeEventListener('ui-probe:stack', onStack);
      window.removeEventListener('ui-probe:reset', onReset);
    };
    window.addEventListener('cb:insp:tab:change', (e)=>{ if(e?.detail?.tab !== 'ui') stop(); });

    (window.CBLog?.ok||console.log)(MOD,'bereit',VER);
  });

})();
