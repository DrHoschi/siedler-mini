/* ============================================================================
 * Datei   : inspector/tabs/inspector.tab.signals-v1.js
 * Version : v25.11.02
 * Zweck   : SIGNALS – Live-Visualisierung von req:/cb: Ereignissen
 * Features:
 *   – Hook auf addEventListener/dispatchEvent (idempotent, leichtgewichtig)
 *   – Ermittelt Sender- und Empfänger-Dateien (Callsite via Error().stack)
 *   – Knoten = Dateien, Kanten = Events (beschriftet), Live-Timeline
 *   – Filter: nur req:/cb:, nur aktive, Min. Kantenanzahl
 *   – Copy/Export als JSON, Clear, Pause/Resume Capture
 * Abhäng. : registerInspectorTab(name, setup)
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
#inspector .sig-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:.75rem}
#inspector .sig-card{border:1px solid #2a2a2e;border-radius:.6rem;padding:.6rem;background:#111;min-height:140px}
#inspector .sig-card h4{margin:.1rem 0 .45rem}
#inspector .sig-pre{max-height:260px;overflow:auto;border:1px solid #222;border-radius:.35rem;background:#0f1013;padding:.5rem;margin:0;white-space:pre}
#inspector .svg-wrap{overflow:auto;border:1px solid #222;border-radius:.35rem;background:#0f1013;padding:.4rem}
#inspector .sig-badge{display:inline-block;border:1px solid #444;border-radius:.4rem;padding:.05rem .4rem;margin-left:.4rem;font-size:.85em;opacity:.85}
#inspector .muted{opacity:.7}
    `;
    document.head.appendChild(s);
  }

  /* ------------------------------ Utilities ------------------------------ */
  const base = (url)=> (url||'').split('?')[0].split('/').pop();
  const getCallFile = ()=>{
    try{
      const st = new Error().stack || '';
      // nimm erstes Frame außerhalb dieser Datei
      const lines = st.split('\n').slice(2);
      for (const ln of lines){
        // iOS/Safari: "http.../path/file.js:123:45"
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
    cap: 400,
    // timeline: [{ts,name,from,to:[file,...]}]
    timeline: [],
    // listeners: {event: Set<{file}>}
    listeners: Object.create(null),
    // who added listener: hook addEventListener
    hooked: false,
  };

  /* ------------------------------ Hooks ---------------------------------- */
  (function hookAdd(){
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
  function buildGraph(filter){
    // Knoten = alle Dateinamen aus Sender+Empfänger; Kanten je (from -> to) pro Event
    const nodes = new Map(); // name -> {name, count}
    const edges = [];        // {from,to,label,count}

    const M = new Map();     // key (from|to|name) -> edge
    const list = SIG.timeline.filter(e => {
      if (filter.onlyActive && (!SIG.listeners[e.name] || SIG.listeners[e.name].size===0)) return false;
      if (filter.name && !e.name.includes(filter.name)) return false;
      return true;
    });

    for (const ev of list){
      nodes.set(ev.from, nodes.get(ev.from)||{name:ev.from, count:0}); nodes.get(ev.from).count++;
      if (ev.to.length===0){
        nodes.set('(kein Empfänger)', nodes.get('(kein Empfänger)')||{name:'(kein Empfänger)',count:0});
        const k = ev.from+'|'+ '(kein Empfänger)' +'|'+ev.name;
        const ed = M.get(k) || {from:ev.from, to:'(kein Empfänger)', label:ev.name, count:0};
        ed.count++; M.set(k, ed);
      } else {
        for (const t of ev.to){
          nodes.set(t, nodes.get(t)||{name:t, count:0});
          const k = ev.from+'|'+t+'|'+ev.name;
          const ed = M.get(k) || {from:ev.from, to:t, label:ev.name, count:0};
          ed.count++; M.set(k, ed);
        }
      }
    }

    for (const ed of M.values()) if (ed.count >= filter.minEdge) edges.push(ed);
    return { nodes:[...nodes.values()], edges };
  }

  /* ----------------------------- SVG Render ------------------------------ */
  function svgGraph(graph){
    const ns = graph.nodes.length;
    const W = Math.max(720, ns*160);
    const H = 360;
    const padX = 90, padY = 60;
    // ordne Sender links, Empfänger rechts (grobe Heuristik)
    const senders = new Set(graph.edges.map(e=>e.from));
    const receivers = new Set(graph.edges.map(e=>e.to));
    const left = [...senders];
    const right = [...new Set([...receivers].filter(x=>!senders.has(x)) || receivers)];
    // rest in die Mitte
    const middle = graph.nodes
      .map(n=>n.name)
      .filter(n=>!left.includes(n) && !right.includes(n));

    function place(list, y0){
      const step = (H-2*padY) / (Math.max(1,list.length)-0.999);
      return list.map((name,i)=>({name, x:0, y:Math.round(padY + i*step)}));
    }
    const L = place(left, padY).map(p=>(p.x = padX, p));
    const R = place(right, padY).map(p=>(p.x = W - padX, p));
    const M = place(middle, padY).map(p=>(p.x = (W/2), p));

    const pos = new Map([...L,...M,...R].map(p=>[p.name,p]));

    function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');}

    let svg = `<div class="svg-wrap"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    // Kanten
    graph.edges.forEach((e,idx)=>{
      const a = pos.get(e.from), b = pos.get(e.to); if (!a||!b) return;
      const col = e.label.startsWith('cb:') ? '#8ab4f8' : '#ffcc00';
      const ay = a.y, by = b.y;
      const path = `M ${a.x+70} ${ay} C ${a.x+150} ${ay}, ${b.x-150} ${by}, ${b.x-70} ${by}`;
      svg += `<defs><marker id="arr${idx}" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${col}"/></marker></defs>`;
      svg += `<path d="${path}" stroke="${col}" stroke-width="2" fill="none" marker-end="url(#arr${idx})" />`;
      // Label mittig
      const lx = (a.x+b.x)/2, ly = (a.y+b.y)/2 - 6;
      svg += `<text x="${lx}" y="${ly}" font-size="10" text-anchor="middle" fill="#ddd">${esc(e.label)} ×${e.count}</text>`;
    });
    // Knoten
    for (const [name,p] of pos.entries()){
      svg += `<rect x="${p.x-70}" y="${p.y-15}" width="140" height="30" rx="6" ry="6" fill="#1a1d22" stroke="#333"/>`;
      svg += `<text x="${p.x}" y="${p.y+4}" font-size="11" text-anchor="middle" fill="#ddd">${esc(name)}</text>`;
    }
    svg += `</svg><div class="muted">Farbe: cb:=blau · req:=gelb.</div></div>`;
    return svg;
  }

  /* --------------------------------- UI ---------------------------------- */
  function el(tag, cls, txt){ const n=document.createElement(tag); if(cls) n.className=cls; if(txt!=null) n.textContent=txt; return n; }
  function render(section){
    section.innerHTML = '<h2>Signals</h2>';
    const tb = el('div','sig-toolbar');
    const bScan   = el('button','sig-btn','Scan/Render');
    const bCopy   = el('button','sig-btn','Copy JSON');
    const bExport = el('button','sig-btn','Export JSON');
    const bClear  = el('button','sig-btn','Clear');
    const bPause  = el('button','sig-btn', SIG.on ? 'Pause Capture' : 'Resume Capture');
    const onlyAct = el('label', ''); onlyAct.innerHTML = `<input type="checkbox" id="sig-only" checked> nur aktive`;
    const minEdge = el('label', ''); minEdge.innerHTML = ` min×<input type="number" id="sig-min" value="1" min="1" style="width:64px">`;
    const nameF   = el('input','sig-input'); nameF.placeholder='Filter (Event-Name)...'; nameF.style.minWidth='220px';
    tb.append(bScan,bCopy,bExport,bClear,bPause,nameF,onlyAct,minEdge);
    section.append(tb);

    const grid = el('div','sig-grid');
    const cGraph = el('div','sig-card'); cGraph.innerHTML = `<h4>Graph</h4><div id="sig-graph"></div>`;
    const cTime  = el('div','sig-card'); cTime.innerHTML  = `<h4>Timeline <span class="sig-badge" id="sig-count">0</span></h4><pre class="sig-pre" id="sig-time"></pre>`;
    const cMeta  = el('div','sig-card'); cMeta.style.gridColumn='1 / span 2'; cMeta.innerHTML = `<h4>Listener & Meta</h4><pre class="sig-pre" id="sig-meta"></pre>`;
    grid.append(cGraph,cTime,cMeta); section.append(grid);

    const OUT = {
      graph: document.getElementById('sig-graph'),
      time:  document.getElementById('sig-time'),
      count: document.getElementById('sig-count'),
      meta:  document.getElementById('sig-meta'),
      only:  section.querySelector('#sig-only'),
      min:   section.querySelector('#sig-min'),
      name:  nameF
    };

    function diagnose(){
      const filter = {
        onlyActive: OUT.only.checked,
        minEdge: Math.max(1, parseInt(OUT.min.value||'1',10)),
        name: OUT.name.value.trim()
      };
      const graph = buildGraph(filter);
      OUT.graph.innerHTML = svgGraph(graph);

      const tl = SIG.timeline.slice(-250);
      OUT.time.textContent = tl.map(e => `${e.ts}  ${e.name}  ${e.from} → ${e.to.length?e.to.join(', '):'(kein Empfänger)'}`).join('\n') || '(leer)';
      OUT.count.textContent = String(SIG.timeline.length);

      const listenersObj = Object.fromEntries(Object.entries(SIG.listeners).map(([k,v])=>[k,[...v]]));
      const meta = {
        captureOn: SIG.on,
        listeners: listenersObj,
        timelineSize: SIG.timeline.length
      };
      OUT.meta.textContent = JSON.stringify(meta, null, 2);

      // global exportierbar
      window.__SIGNALS_DIAG__ = { ts: new Date().toISOString(), graph, timeline: tl, listeners: listenersObj };
    }

    bScan.onclick = diagnose;
    bClear.onclick = ()=>{ SIG.timeline.length = 0; diagnose(); };
    bCopy.onclick = async()=>{
      try{
        await navigator.clipboard.writeText(JSON.stringify(window.__SIGNALS_DIAG__||{}, null, 2));
        console.info('[signals] Diagnose in Zwischenablage kopiert.');
      }catch(e){ console.warn('[signals] Copy fehlgeschlagen', e); }
    };
    bExport.onclick = ()=>{
      const data = JSON.stringify(window.__SIGNALS_DIAG__||{}, null, 2);
      const url = URL.createObjectURL(new Blob([data],{type:'application/json'}));
      const a = Object.assign(document.createElement('a'), {href:url, download:'inspector-signals.json'});
      document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    };
    bPause.onclick = ()=>{
      SIG.on = !SIG.on;
      bPause.textContent = SIG.on ? 'Pause Capture' : 'Resume Capture';
    };

    // Initial zeichnen + beim Tabwechsel aktualisieren
    diagnose();
    window.addEventListener('cb:insp:tab:change', (e)=>{ if (e?.detail?.tab==='signals') diagnose(); });
  }

  /* ----------------------------- Registrierung --------------------------- */
  window.registerInspectorTab('signals', function setup(section){
    injectCSS();
    render(section);
  });

})();
