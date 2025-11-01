/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.signals-v1.js
 * Version : v25.11.02-a (Replay + Zoom/Pan + Export)
 * Zweck   : SIGNALS – Live-Visualisierung von req:/cb: Ereignissen
 * Features:
 *   – Hook auf addEventListener/dispatchEvent (idempotent, leichtgewichtig)
 *   – Sender/Empfänger-Dateien via Error().stack
 *   – Graph: Zoom ±, Fit, Drag/Pan, Fullscreen, Export SVG/PNG
 *   – Timeline Replay: Play/Pause, Step, Speed (0.5×..4×), zeichnet Kanten nacheinander
 *   – Filter: nur aktive, Min-Kanten, Textfilter (Eventname)
 * API     : registerInspectorTab('signals', setup)
 * ========================================================================== */
(function(){
  if (typeof window.registerInspectorTab !== 'function') {
    console.warn('[signals-tab] registerInspectorTab fehlt.');
    return;
  }

  /* ----------------------------- kleines CSS ----------------------------- */
  function injectCSS(){
    if (document.getElementById('insp-signals-style')) return;
    const s=document.createElement('style'); s.id='insp-signals-style';
    s.textContent = `
#inspector .sig-toolbar{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin:.25rem 0 .75rem}
#inspector .sig-btn{padding:.25rem .6rem;border:1px solid #333;background:#222;border-radius:.5rem;cursor:pointer}
#inspector .sig-input{padding:.25rem .4rem;border:1px solid #333;background:#111;border-radius:.35rem;color:#ddd}
#inspector .sig-grid{display:grid;grid-template-columns:1.6fr .9fr;gap:.75rem}
#inspector .sig-card{border:1px solid #2a2a2e;border-radius:.6rem;padding:.6rem;background:#111;min-height:140px}
#inspector .sig-card h4{margin:.1rem 0 .45rem}
#inspector .sig-pre{max-height:300px;overflow:auto;border:1px solid #222;border-radius:.35rem;background:#0f1013;padding:.5rem;margin:0;white-space:pre}
#inspector .svg-wrap{overflow:auto;border:1px solid #222;border-radius:.35rem;background:#0f1013;position:relative}
#inspector .svg-wrap .sig-hint{position:absolute;left:.5rem;bottom:.5rem;color:#aab;opacity:.9;font-size:.9em}
#inspector .sig-badge{display:inline-block;border:1px solid #444;border-radius:.4rem;padding:.05rem .4rem;margin-left:.4rem;font-size:.85em;opacity:.85}
#inspector .muted{opacity:.7}
#inspector .sig-row{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center}
    `;
    document.head.appendChild(s);
  }

  /* ------------------------------ Utilities ------------------------------ */
  const base = (url)=> (url||'').split('?')[0].split('/').pop();
  const getCallFile = ()=>{
    try{
      const st = new Error().stack || '';
      const lines = st.split('\n').slice(2);
      for (const ln of lines){
        const m = /(https?:\/\/[^\s)]+\.js)/.exec(ln);
        if (m) return base(m[1]);
      }
    }catch(_){}
    return '(unbekannt)';
  };
  const isSig = (name)=> typeof name==='string' && /^(cb:|req:)/.test(name);

  /* --------------------------- Globale Speicher --------------------------- */
  const SIG = window.__SIG_MON__ = window.__SIG_MON__ || {
    on: true,
    cap: 800,
    timeline: [],                // [{ts,name,from,to:[file,...]}]
    listeners: Object.create(null), // {event:Set(file)}
    hooked: false,
  };

  /* -------------------------------- Hooks -------------------------------- */
  (function hookOnce(){
    if (SIG.hooked) return;
    SIG.hooked = true;
    const AT = window.EventTarget && window.EventTarget.prototype;
    if (!AT || !AT.addEventListener) return;

    const origAdd = AT.addEventListener;
    AT.addEventListener = function(type, listener, opts){
      try{
        if (isSig(type)){
          const file = getCallFile();
          const set = SIG.listeners[type] || (SIG.listeners[type] = new Set());
          set.add(file);
        }
      }catch(_){}
      return origAdd.call(this, type, listener, opts);
    };

    const origDisp = AT.dispatchEvent;
    AT.dispatchEvent = function(evt){
      if (!SIG.on) return origDisp.call(this, evt);
      try{
        const name = evt && evt.type;
        if (isSig(name)){
          const from = getCallFile();
          const toSet = SIG.listeners[name] || new Set();
          const to = [...toSet];
          const ts = new Date().toISOString().replace('T',' ').replace('Z','');
          SIG.timeline.push({ts, name, from, to});
          if (SIG.timeline.length > SIG.cap) SIG.timeline.splice(0, SIG.timeline.length - SIG.cap);
        }
      }catch(_){}
      return origDisp.call(this, evt);
    };
  })();

  /* --------------------------- Datenaufbereitung ------------------------- */
  function buildGraph(list, filter){
    const nodes = new Map(); // name -> {name}
    const edges = [];        // {from,to,label,count}

    const M = new Map();     // key -> edge

    for (const ev of list){
      if (filter.onlyActive && (!SIG.listeners[ev.name] || SIG.listeners[ev.name].size===0)) continue;
      if (filter.name && !ev.name.includes(filter.name)) continue;

      nodes.set(ev.from, {name:ev.from});
      if (ev.to.length===0){
        const to='(kein Empfänger)';
        nodes.set(to,{name:to});
        const k = `${ev.from}|${to}|${ev.name}`;
        const ed = M.get(k) || {from:ev.from, to, label:ev.name, count:0};
        ed.count++; M.set(k, ed);
      }else{
        for (const t of ev.to){
          nodes.set(t, {name:t});
          const k = `${ev.from}|${t}|${ev.name}`;
          const ed = M.get(k) || {from:ev.from, to:t, label:ev.name, count:0};
          ed.count++; M.set(k, ed);
        }
      }
    }
    for (const ed of M.values()) if (ed.count >= filter.minEdge) edges.push(ed);
    return { nodes:[...nodes.values()], edges };
  }

  /* ----------------------------- SVG Render ------------------------------ */
  function layoutPositions(graph, W, H){
    const senders = new Set(graph.edges.map(e=>e.from));
    const receivers = new Set(graph.edges.map(e=>e.to));
    const left = [...senders];
    const right = [...new Set([...receivers].filter(x=>!senders.has(x)) || receivers)];
    const middle = graph.nodes
      .map(n=>n.name)
      .filter(n=>!left.includes(n) && !right.includes(n));

    function place(list){
      const padY=60, step=(H-2*padY)/(Math.max(1,list.length)-0.999);
      return list.map((name,i)=>({name, x:0, y:Math.round(padY + i*step)}));
    }
    const L = place(left).map(p=>(p.x=90,p));
    const R = place(right).map(p=>(p.x=W-90,p));
    const M = place(middle).map(p=>(p.x=W/2,p));
    return new Map([...L,...M,...R].map(p=>[p.name,p]));
  }

  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');}

  function svgGraph(graph, opt){
    const W = opt.width, H = opt.height;
    const pos = layoutPositions(graph, W, H);
    const vb   = [0,0,W,H].join(' ');
    let svg = `<svg id="sig-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${W}" height="${H}">`;

    // Kanten
    graph.edges.forEach((e,idx)=>{
      const a = pos.get(e.from), b = pos.get(e.to); if (!a||!b) return;
      const col = e.label.startsWith('cb:') ? '#8ab4f8' : '#ffcc00';
      const ay = a.y, by = b.y;
      const path = `M ${a.x+70} ${ay} C ${a.x+150} ${ay}, ${b.x-150} ${by}, ${b.x-70} ${by}`;
      svg += `<defs><marker id="arr${idx}" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${col}"/></marker></defs>`;
      svg += `<path class="edge" data-label="${esc(e.label)}" stroke="${col}" stroke-width="2" fill="none" marker-end="url(#arr${idx})" d="${path}" />`;
      const lx = (a.x+b.x)/2, ly = (a.y+b.y)/2 - 6;
      svg += `<text x="${lx}" y="${ly}" font-size="10" text-anchor="middle" fill="#ddd">${esc(e.label)} ×${e.count}</text>`;
    });

    // Knoten
    for (const [name,p] of pos.entries()){
      svg += `<rect x="${p.x-70}" y="${p.y-15}" width="140" height="30" rx="6" ry="6" fill="#1a1d22" stroke="#333"/>`;
      svg += `<text x="${p.x}" y="${p.y+4}" font-size="11" text-anchor="middle" fill="#ddd">${esc(name)}</text>`;
    }
    svg += `</svg>`;
    return svg;
  }

  /* ------------------------------- Export -------------------------------- */
  function download(name, data, type){
    const url = URL.createObjectURL(new Blob([data],{type}));
    const a = Object.assign(document.createElement('a'), {href:url, download:name});
    document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function exportSVG(wrapper){
    const svg = wrapper.querySelector('#sig-svg');
    if (!svg) return;
    const data = svg.outerHTML.replace(/>\s+</g,'><');
    download('inspector-signals.svg', data, 'image/svg+xml');
  }
  async function exportPNG(wrapper, scale=2){
    const svg = wrapper.querySelector('#sig-svg');
    if (!svg) return;
    const svgData = new Blob([svg.outerHTML], {type:'image/svg+xml'});
    const url = URL.createObjectURL(svgData);
    const img = new Image();
    await new Promise(res=>{ img.onload=res; img.src=url; });
    const W = img.naturalWidth*scale, H = img.naturalHeight*scale;
    const c = Object.assign(document.createElement('canvas'), {width:W, height:H});
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, W, H);
    URL.revokeObjectURL(url);
    c.toBlob(b=> download('inspector-signals.png', b, 'image/png'));
  }

  /* --------------------------------- UI ---------------------------------- */
  function el(tag, cls, txt){ const n=document.createElement(tag); if(cls) n.className=cls; if(txt!=null) n.textContent=txt; return n; }

  window.registerInspectorTab('signals', function setup(section){
    injectCSS();

    section.innerHTML = '<h2>Signals</h2>';

    // Toolbar 1: Daten/Replay
    const tb1 = el('div','sig-toolbar');
    const bScan   = el('button','sig-btn','Scan/Render');
    const bCopy   = el('button','sig-btn','Copy JSON');
    const bExport = el('button','sig-btn','Export JSON');
    const bClear  = el('button','sig-btn','Clear');
    const bPause  = el('button','sig-btn', SIG.on ? 'Pause Capture' : 'Resume Capture');
    const filterName = el('input','sig-input'); filterName.placeholder='Filter (Event-Name)…'; filterName.style.minWidth='220px';
    const onlyAct = el('label','sig-row'); onlyAct.innerHTML = `<input type="checkbox" id="sig-only" checked> nur aktive`;
    const minEdge = el('label','sig-row'); minEdge.innerHTML = ` min×<input type="number" id="sig-min" value="1" min="1" style="width:64px" class="sig-input">`;
    tb1.append(bScan,bCopy,bExport,bClear,bPause, filterName, onlyAct, minEdge);
    section.append(tb1);

    // Toolbar 2: Graph-Ansicht/Replay-Controls
    const tb2 = el('div','sig-toolbar');
    const sizeIn = el('input','sig-input'); sizeIn.type='number'; sizeIn.value='1200'; sizeIn.min='800'; sizeIn.style.width='92px';
    const bFit   = el('button','sig-btn','Fit');
    const bZoomP = el('button','sig-btn','Zoom +');
    const bZoomM = el('button','sig-btn','Zoom –');
    const bFull  = el('button','sig-btn','Fullscreen');
    const bSVG   = el('button','sig-btn','Export SVG');
    const bPNG   = el('button','sig-btn','Export PNG');

    const bPlay  = el('button','sig-btn','▶︎ Play');
    const bStep  = el('button','sig-btn','Step');
    const speed  = el('select','sig-input'); ['0.5','1','2','4'].forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v+'×'; if(v==='1')o.selected=true; speed.append(o);});
    tb2.append(el('span','muted','Breite:'), sizeIn, bFit, bZoomP, bZoomM, bFull, bSVG, bPNG, el('span','muted','Replay:'), bPlay, bStep, speed);
    section.append(tb2);

    // Layout
    const grid = el('div','sig-grid');
    const cGraph = el('div','sig-card'); cGraph.innerHTML = `<h4>Graph</h4><div id="sig-graph" class="svg-wrap"><div class="sig-hint">Farbe: cb=blau · req=gelb. Drag zum Verschieben, Zoom ±/Fit.</div></div>`;
    const cTime  = el('div','sig-card');  cTime.innerHTML  = `<h4>Timeline <span class="sig-badge" id="sig-count">0</span></h4><pre class="sig-pre" id="sig-time"></pre>`;
    const cMeta  = el('div','sig-card');  cMeta.style.gridColumn = '1 / span 2'; cMeta.innerHTML = `<h4>Listener & Meta</h4><pre class="sig-pre" id="sig-meta"></pre>`;
    grid.append(cGraph, cTime, cMeta); section.append(grid);

    const OUT = {
      wrap:  cGraph.querySelector('#sig-graph'),
      count: cTime.querySelector('#sig-count'),
      time:  cTime.querySelector('#sig-time'),
      meta:  cMeta.querySelector('#sig-meta'),
      only:  onlyAct.querySelector('input'),
      min:   minEdge.querySelector('input'),
      name:  filterName,
      sizeIn,
    };

    // Replay-State
    const REPLAY = { on:false, h:null, cursor:0, zoom:1, pan:{x:0,y:0}, lastGraph:null, lastList:[], lastFilter:null };

    function currentFilter(){
      return {
        onlyActive: OUT.only.checked,
        minEdge: Math.max(1, parseInt(OUT.min.value||'1',10)),
        name: OUT.name.value.trim(),
      };
    }

    function diagnose(listOverride){
      const list = listOverride || SIG.timeline;
      const filter = currentFilter();
      const graph = buildGraph(list, filter);
      REPLAY.lastGraph = graph; REPLAY.lastList = list; REPLAY.lastFilter = filter;

      // render SVG
      const width = Math.max(800, parseInt(OUT.sizeIn.value||'1200',10));
      const height = 520; // groß
      OUT.wrap.innerHTML = svgGraph(graph, {width, height});

      // simple pan/zoom via viewBox
      const svg = OUT.wrap.querySelector('#sig-svg');
      let view = [0,0,width,height];
      function applyView(){ svg.setAttribute('viewBox', view.join(' ')); }
      function zoom(delta){
        const f = delta>0 ? 0.9 : 1.1;
        const [x,y,w,h] = view; const nw=w*f, nh=h*f;
        view = [x+(w-nw)/2, y+(h-nh)/2, nw, nh]; applyView();
      }
      function fit(){ view=[0,0,width,height]; applyView(); }
      applyView(); // init
      REPLAY.zoomApi = {zoom,fit};
      bFit.onclick = fit; bZoomP.onclick = ()=>zoom(-1); bZoomM.onclick = ()=>zoom(+1);

      // Drag/Pan
      let dragging=false, sx=0, sy=0, sv=[...view];
      svg.onmousedown = e=>{ dragging=true; sx=e.clientX; sy=e.clientY; sv=[...view]; };
      svg.onmousemove = e=>{ if(!dragging) return; const dx=e.clientX-sx, dy=e.clientY-sy; view=[sv[0]-dx, sv[1]-dy, sv[2], sv[3]]; applyView(); };
      window.onmouseup = ()=> dragging=false;

      // Fullscreen
      bFull.onclick = ()=> OUT.wrap.requestFullscreen && OUT.wrap.requestFullscreen();

      // Text-Ausgaben
      const tl = list.slice(-400);
      OUT.time.textContent = tl.map(e => `${e.ts}  ${e.name}  ${e.from} → ${e.to.length?e.to.join(', '):'(kein Empfänger)'}`).join('\n') || '(leer)';
      OUT.count.textContent = String(SIG.timeline.length);

      const listenersObj = Object.fromEntries(Object.entries(SIG.listeners).map(([k,v])=>[k,[...v]]));
      OUT.meta.textContent = JSON.stringify({captureOn:SIG.on, timelineSize:SIG.timeline.length, listeners:listenersObj}, null, 2);

      // Export-Buttons
      bSVG.onclick = ()=> exportSVG(OUT.wrap);
      bPNG.onclick = ()=> exportPNG(OUT.wrap, 2);
    }

    function renderAll(){ diagnose(); }

    // Replay: baut eine Teil-Timeline bis Cursor und rendert daraus den Graph
    function stepReplay(){
      REPLAY.cursor = Math.min(REPLAY.cursor+1, SIG.timeline.length);
      const partial = SIG.timeline.slice(0, REPLAY.cursor);
      diagnose(partial);
      if (REPLAY.cursor >= SIG.timeline.length){ stopReplay(); }
    }
    function playReplay(){
      if (REPLAY.on) return;
      REPLAY.on = true;
      bPlay.textContent = '⏸ Pause';
      const sp = parseFloat(speed.value || '1'); // 1×
      const interval = Math.max(60, 240 / sp);
      REPLAY.h = setInterval(stepReplay, interval);
    }
    function stopReplay(){
      REPLAY.on = false; bPlay.textContent = '▶︎ Play';
      if (REPLAY.h){ clearInterval(REPLAY.h); REPLAY.h=null; }
    }

    // Bindings
    bScan.onclick = renderAll;
    bClear.onclick = ()=>{ SIG.timeline.length=0; REPLAY.cursor=0; renderAll(); };
    bCopy.onclick = async()=>{ 
      await navigator.clipboard.writeText(JSON.stringify({ts:new Date().toISOString(), timeline:SIG.timeline, listeners:Object.fromEntries(Object.entries(SIG.listeners).map(([k,v])=>[k,[...v]]))}, null, 2));
      console.info('[signals] Diagnose in Zwischenablage kopiert.');
    };
    bExport.onclick = ()=> download('inspector-signals.json', JSON.stringify({ts:new Date().toISOString(), timeline:SIG.timeline, listeners:Object.fromEntries(Object.entries(SIG.listeners).map(([k,v])=>[k,[...v]]))}, null, 2), 'application/json');
    bPause.onclick  = ()=>{ SIG.on=!SIG.on; bPause.textContent = SIG.on ? 'Pause Capture' : 'Resume Capture'; };
    OUT.sizeIn.onchange = renderAll;

    bPlay.onclick = ()=> REPLAY.on ? stopReplay() : (REPLAY.cursor=0, playReplay());
    bStep.onclick = ()=>{ stopReplay(); stepReplay(); };

    // Initial + beim Tabwechsel aktualisieren
    renderAll();
    window.addEventListener('cb:insp:tab:change', (e)=>{ if (e?.detail?.tab==='signals') renderAll(); });
  });
})();
