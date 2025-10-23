/* ============================================================================
 * Datei   : ui/inspector/inspector.ui.js
 * Projekt : Neue Siedler
 * Version : v18.17.0 (UI-Tab + Floating Tools + DOM-Layer-Scanner)
 * Zweck   : UI-/Layer-Diagnose:
 *           1) UI-Tab mit Layer-Tabelle (deine Hauptcontainer)
 *           2) Floating-Tools (Toastleiste), auch bei geschlossenem Inspector
 *           3) DOM-Layer-Scanner: listet "Overlay"-Kandidaten (position fixed/
 *              absolute/sticky, relevante Größe/Z-Index) + direkte Toggles:
 *              - Hide (display:none), Invis (visibility:hidden), PE off (pointer-events:none)
 *              - Highlight, Solo (alle anderen verstecken), Focus (scrollIntoView)
 *
 * Architektur:
 *  - Rendert in den dynamischen Tab "ui" (Core >= v18.16.3 mit generic-view)
 *  - Floating-Tools liegen außerhalb des Inspector-DOM und feuern ui-probe:*
 *  - Ergebnisse werden in window.UIProbeState persistiert
 *    (lastStackText + history), der UI-Tab subscribed live.
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.ui]'; const VER='v18.17.0';

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

  // ---------- Globaler State & Event-Bridge ----------------------------------
  const ProbeState = (window.UIProbeState = window.UIProbeState || {
    lastStackText: '',
    history: [],   // { ts, x, y, items, text }
    max: 50
  });
  function emit(name, detail){ window.dispatchEvent(new CustomEvent(name, { detail })); }
  function rememberStack(x,y, items, text){
    const ts = Date.now();
    ProbeState.history.unshift({ ts, x, y, items, text });
    if (ProbeState.history.length > ProbeState.max) ProbeState.history.pop();
    ProbeState.lastStackText = text;
    emit('ui-probe:stack', { ts, x, y, count: items.length, text });
  }
  function rememberReset(){ emit('ui-probe:reset', {}); }

  // ---------- Beobachtete Haupt-Layer (statische Tabelle oben) ---------------
  const LAYERS = [
    { sel:'#game-canvas',       label:'Canvas' },
    { sel:'#ui-root',           label:'UI Root' },
    { sel:'#hud-root',          label:'HUD' },
    { sel:'#build-dock',        label:'BuildDock' },
    { sel:'#btn-build',         label:'Build Button' },
    { sel:'#inspector',         label:'Inspector (Split-Core)' },
    { sel:'#inspector-overlay', label:'Inspector (Overlay-Fallback)' },
  ];

  // ---------- Utilities -------------------------------------------------------
  const $ = (s,sc=document)=> sc.querySelector(s);
  function css(el){ try{ return getComputedStyle(el); }catch(_){ return {}; } }
  function z(el,cs){ const v=(cs||css(el)).zIndex; return (v==null||v==='auto')?'auto':String(v); }
  function fmtBBox(el){
    if(!el || !el.getBoundingClientRect) return '—';
    const b = el.getBoundingClientRect();
    return `x:${Math.round(b.x)}, y:${Math.round(b.y)}, w:${Math.round(b.width)}, h:${Math.round(b.height)}`;
  }

  // ---------- Style Save/Restore (sichere Tweaks) ----------------------------
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

  // ---------- Hit-Test --------------------------------------------------------
  function stackAt(x,y){
    const list = (document.elementsFromPoint?.(x,y) || []);
    return list.map(el=>{
      const c = css(el);
      return {
        el,
        tag: el.tagName.toLowerCase()
             + (el.id?('#'+el.id):'')
             + (el.className?('.'+String(el.className).replace(/\s+/g,'.')):''),
        z: z(el,c),
        disp: c.display, vis: c.visibility, op: c.opacity, pe: c.pointerEvents
      };
    });
  }
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
      z-index:2147482999;           /* knapp unter #inspector */
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
      rememberStack(x,y, items, text);
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
      rememberReset();
      flash(root);
    });
    box.append(bCross, bStack, bPE2s, bReset);
    root.appendChild(box);

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
  function flash(el){ saveThen(el,'boxShadow','0 0 0 2px rgba(255,255,255,.35) inset'); setTimeout(()=> restoreStyle(el,'boxShadow'), 200); }
  function showProbe(){ ensureProbe().show(); }
  function hideProbe(){ if(!Probe) return; Probe.hide(); }

  // ========================================================================== 
  // UI-Tab (generic-view)
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

    // ====================== (1) Statische Layer-Tabelle ======================
    const table = document.createElement('table'); table.className='inspector-table';
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>
      <th>Layer</th><th>display</th><th>visibility</th><th>opacity</th>
      <th>pointer</th><th>z</th><th>BBox</th><th>Aktion</th>
    </tr>`;
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    wrap.appendChild(table);

    // ====================== (2) DOM-Layer-Scanner ============================
    const hScan = document.createElement('h3'); hScan.textContent='DOM Layer Scanner';
    const hintScan = document.createElement('div'); hintScan.className='hint';
    hintScan.textContent = 'Listet Kandidaten (position fixed/absolute/sticky, relevante Größe). Filter/Actions pro Knoten.';

    // Controls
    const ctrl = document.createElement('div'); ctrl.className='toolbar';
    ctrl.style.marginTop='6px';
    ctrl.innerHTML = `
      <label class="hint">Min z: <input id="ui-minz" type="number" value="1" style="width:70px"></label>
      <label class="hint"><input id="ui-includesmall" type="checkbox"> kleine Elemente einbeziehen</label>
      <label class="hint"><input id="ui-onlyvisible" type="checkbox" checked> nur sichtbare</label>
      <button class="insp-btn" id="ui-scan">Scan</button>
      <button class="insp-btn" id="ui-showall">Show All</button>
    `;

    const scanTable = document.createElement('table'); scanTable.className='inspector-table';
    const scanHead = document.createElement('thead');
    scanHead.innerHTML = `<tr>
      <th>#</th><th>Node</th><th>z</th><th>size</th><th>disp</th><th>vis</th><th>pe</th><th>Action</th>
    </tr>`;
    scanTable.appendChild(scanHead);
    const scanBody = document.createElement('tbody');
    scanTable.appendChild(scanBody);

    wrap.appendChild(hScan);
    wrap.appendChild(hintScan);
    wrap.appendChild(ctrl);
    wrap.appendChild(scanTable);

    // ====================== (3) Hit-Test / Stack-Ausgabe =====================
    const h2 = document.createElement('h3'); h2.textContent='Hit-Test / Stack';
    const stackBox = document.createElement('div');
    stackBox.style.cssText='margin-top:8px; border:1px solid #444; border-radius:8px; padding:8px; max-height:32vh; overflow:auto; font-family:ui-monospace,Menlo,Consolas,monospace; font-size:12px;';
    wrap.appendChild(h2); wrap.appendChild(stackBox);

    host.appendChild(wrap);

    // Initial letzten Stack zeigen
    stackBox.textContent = ProbeState.lastStackText || '—';

    // -------- Render statische Tabelle --------------------------------------
    function renderStatic(){
      tbody.innerHTML='';
      LAYERS.forEach(def=>{
        const el = $(def.sel, document);
        const c  = el ? css(el) : {};
        const bActions = document.createElement('div'); bActions.style.cssText='display:flex; gap:6px; flex-wrap:wrap';

        const on = HL.has(el);
        const bHl = btn(on?'Unmark':'Mark', ()=>{ const now=HL.has(el); toggleHighlight(el,!now); renderStatic(); }, 'Outline/Highlight toggeln');

        const bZ = btn('z+', '', 'z-index temporär erhöhen (bis Reset)');
        bZ.addEventListener('click', ()=>{ if(!el) return; saveThen(el,'zIndex', String(2147483000)); renderStatic(); });

        const bPE = btn((c.pointerEvents==='none')?'PE on':'PE off', ()=>{
          if(!el) return;
          if (c.pointerEvents==='none') restoreStyle(el,'pointerEvents'); else saveThen(el,'pointerEvents','none');
          renderStatic();
        }, 'pointer-events toggeln');

        const bHit = btn('Stack @ center', ()=>{
          const b = el?.getBoundingClientRect?.(); if(!b) return;
          const x = Math.max(0, b.left + Math.min(5, b.width/2));
          const y = Math.max(0, b.top  + Math.min(5, b.height/2));
          const items = stackAt(x,y);
          const text  = formatStackText(x,y, items);
          consoleStack(x,y, items);
          rememberStack(x,y, items, text);
          stackBox.textContent = text;
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

    // -------- DOM-Layer-Scanner ---------------------------------------------
    const EXCLUDE = new Set(['SCRIPT','STYLE','LINK']);
    const EXCLUDE_IDS = new Set(['inspector','inspector-overlay','ui-probe']); // nicht scannen

    function candidateElements(minZ, includeSmall, onlyVisible){
      const out = [];
      const all = document.body.querySelectorAll('*');
      all.forEach(el=>{
        if (!el || !el.tagName) return;
        if (EXCLUDE.has(el.tagName)) return;
        if (EXCLUDE_IDS.has(el.id)) return;
        // Inspector-eigene Crosshair-Overlays erkennen:
        if (el.parentElement && el.parentElement.id === 'ui-probe') return;

        const s = css(el);
        const posOk = ['fixed','absolute','sticky'].includes(s.position);
        if (!posOk) return;

        // Sichtbarkeit
        if (onlyVisible){
          if (s.display==='none' || s.visibility==='hidden' || parseFloat(s.opacity)===0) return;
        }

        const r = el.getBoundingClientRect?.();
        if (!r) return;

        // Größe
        const tooSmall = (r.width<10 || r.height<10);
        if (!includeSmall && tooSmall) return;

        // z-Index
        const zi = parseInt(s.zIndex,10);
        const zVal = isNaN(zi) ? 0 : zi;
        if (zVal < minZ) return;

        out.push({ el, s, r, z:zVal });
      });

      // Sort: höchste z nach oben, dann Fläche
      out.sort((a,b)=> (b.z - a.z) || ((b.r.width*b.r.height) - (a.r.width*a.r.height)));
      return out;
    }

    function mkNodeLabel(el){
      const id = el.id ? ('#'+el.id) : '';
      const cls = el.className ? ('.'+String(el.className).trim().replace(/\s+/g,'.')) : '';
      return el.tagName.toLowerCase()+id+cls;
    }

    // Solo-Cache (welche Elemente wurden „versteckt“, um einen solo zu zeigen)
    let SOLO_HIDDEN = [];
    function solo(el, list){
      // alles andere verstecken (display:none)
      showAll(); // erst zurücksetzen
      SOLO_HIDDEN = [];
      list.forEach(item=>{
        if (item.el !== el){
          saveStyle(item.el,'display');
          item.el.style.display='none';
          SOLO_HIDDEN.push(item.el);
        }
      });
    }
    function showAll(){
      // Solo-Hidden wiederherstellen
      SOLO_HIDDEN.forEach(node=> restoreStyle(node,'display'));
      SOLO_HIDDEN = [];
      // und ggf. alle zuvor per Toggle versteckten Eigenschaften rückgängig machen?
      // (bewusst nicht, das macht "Reset tweaks")
    }

    function renderScan(){
      const minZ = parseInt($('#ui-minz', ctrl).value,10) || 0;
      const includeSmall = $('#ui-includesmall', ctrl).checked;
      const onlyVisible  = $('#ui-onlyvisible',  ctrl).checked;

      const list = candidateElements(minZ, includeSmall, onlyVisible);
      scanBody.innerHTML='';

      list.forEach((it, idx)=>{
        const el = it.el, s = it.s, r = it.r;

        // Aktionen
        const A = document.createElement('div'); A.style.cssText='display:flex; gap:6px; flex-wrap:wrap';

        // Hide/Show (display)
        const bHide = btn((s.display==='none')?'Show':'Hide', ()=>{
          if (s.display==='none') restoreStyle(el,'display');
          else saveThen(el,'display','none');
          renderScan();
        }, 'display toggeln');

        // Invis/Vis (visibility)
        const bVis = btn((s.visibility==='hidden')?'Vis':'Invis', ()=>{
          if (s.visibility==='hidden') restoreStyle(el,'visibility');
          else saveThen(el,'visibility','hidden');
          renderScan();
        }, 'visibility toggeln');

        // PE toggle
        const bPE  = btn((s.pointerEvents==='none')?'PE on':'PE off', ()=>{
          if (s.pointerEvents==='none') restoreStyle(el,'pointerEvents');
          else saveThen(el,'pointerEvents','none');
          renderScan();
        }, 'pointer-events toggeln');

        // Highlight
        const on = HL.has(el);
        const bHl = btn(on?'Unmark':'Mark', ()=>{
          const now = HL.has(el); toggleHighlight(el,!now);
        }, 'Highlight toggeln');

        // Focus (scroll + kurzes Blinken)
        const bFocus = btn('Focus', ()=>{
          try{ el.scrollIntoView({behavior:'smooth', block:'center'}); }catch(_){}
          saveThen(el,'outline','2px solid #0ff');
          setTimeout(()=> restoreStyle(el,'outline'), 600);
        }, 'scrollIntoView + Blink');

        // Solo
        const bSolo = btn('Solo', ()=>{
          solo(el, list);
          renderScan();
        }, 'Alles andere verstecken (display:none), bis Show All');

        A.append(bHide,bVis,bPE,bHl,bFocus,bSolo);

        const node = mkNodeLabel(el);
        const size = `${Math.round(r.width)}×${Math.round(r.height)}`;
        const zval = (it.z || 'auto');

        scanBody.appendChild( row([
          String(idx+1),
          node,
          String(zval),
          size,
          s.display,
          s.visibility,
          s.pointerEvents,
          A
        ]) );
      });
    }

    // Controls verdrahten
    $('#ui-scan', ctrl).addEventListener('click', renderScan);
    $('#ui-showall', ctrl).addEventListener('click', ()=>{ showAll(); renderScan(); });

    // -------- Crosshair (teilt Logik mit Floating-Tools) ---------------------
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
        rememberStack(x,y, items, text);
        stackBox.textContent = text;
        disableCrosshair();
      };
      crossDiv.addEventListener('mousemove', onMove, { passive:true });
      document.addEventListener('click', onClick, { once:true, capture:true });
    }
    function disableCrosshair(){ crosshairActive=false; if(crossDiv){ crossDiv.remove(); crossDiv=null; } }

    // -------- Reset (alles sauber zurück) ------------------------------------
    function resetTweaks(){
      // Highlights
      Array.from(HL.keys()).forEach(el=> toggleHighlight(el, false));
      // Styles
      restoreAll();
      // Crosshair
      disableCrosshair();
      // Solo-Listen zurücksetzen
      showAll();
      // Ausgaben zurücksetzen
      stackBox.textContent = '—';
      // Tabellen neu
      renderStatic();
      renderScan();
    }

    // -------- Subscriptions für Floating-Events -------------------------------
    const onStack = (e)=>{ if (e?.detail?.text) stackBox.textContent = e.detail.text; };
    const onReset = ()=>{ stackBox.textContent = '—'; };
    window.addEventListener('ui-probe:stack', onStack);
    window.addEventListener('ui-probe:reset', onReset);

    // -------- Lifecycle -------------------------------------------------------
    renderStatic();
    renderScan();

    // leichte Auto-Refreshes
    host._insp_ui_timer && clearInterval(host._insp_ui_timer);
    host._insp_ui_timer = setInterval(()=>{ renderStatic(); /* scan manuell */ }, 1000);

    // MutationObserver: wenn DOM stark wechselt → Scan erneut anbieten
    const mo = new MutationObserver(()=>{/* nicht automatisch scannen -> Button */});
    try{ mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']}); }catch(_){}

    const stop = ()=>{
      try{ clearInterval(host._insp_ui_timer); }catch(_){}
      window.removeEventListener('ui-probe:stack', onStack);
      window.removeEventListener('ui-probe:reset', onReset);
      try{ mo.disconnect(); }catch(_){}
    };
    window.addEventListener('cb:insp:tab:change', (e)=>{ if(e?.detail?.tab !== 'ui') stop(); });

    (window.CBLog?.ok||console.log)(MOD,'bereit',VER);
  });

})();
