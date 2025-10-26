/* ============================================================================
 * Datei   : ui/inspector/inspector.diag.js
 * Projekt : Neue Siedler – Inspector (Diag-Tab)
 * Version : v25.10.27-diag2
 * Autor   : Mann & GPT-5
 *
 * Zweck   : Ein separater Inspector-Tab "diag", der
 *           - Boot-/Start-Snapshot anzeigt (Registry/Assets/Map/Meta),
 *           - Live-Ressourcen (über cb:res:snapshot),
 *           - einen Live-Tick-Monitor (FPS & Δt) rendert,
 *           - Schnellaktionen anbietet (req:res:snapshot / req:registry:snapshot),
 *           - und sich automatisch aktualisiert, solange der Tab aktiv ist.
 *
 * Abhängigkeiten:
 *   - inspector.core.js / inspector.ui.js (Tab-API: Inspector.registerTab/mount)
 *   - core/diag.boot.js (optional, sendet cb:diag:boot-snapshot)
 *   - core/registry.js  (snapshot(), data-Spiegel)
 *   - core/game.js      (sendet cb:game:tick mit { now,t,dt,fps })
 *
 * Lauscht :
 *   - cb:diag:boot-snapshot { counts, assets, map, meta }
 *   - cb:registry:ready
 *   - cb:res:snapshot       { resources }
 *   - cb:game:tick          { now, t, dt, fps }
 *   - cb:insp:tab:change
 *
 * Sendet :
 *   - req:res:snapshot
 *   - req:registry:snapshot
 *
 * Einbindung (index.html) – nach den anderen Inspector-Dateien:
 *   <script src="ui/inspector/inspector.diag.js"></script>
 * ========================================================================== */
(function(){
  'use strict';

  /* ============================= [LOGGING] ============================= */
  const MOD='[inspector.diag]'; const VER='v25.10.27-diag2';
  const LOG = (window.CBLog?.info || console.info).bind(console, MOD);
  const OK  = (window.CBLog?.ok   || console.log ).bind(console, MOD);
  const WRN = (window.CBLog?.warn || console.warn).bind(console, MOD);
  const ERR = (window.CBLog?.err  || console.error).bind(console, MOD);

  // ---- Diag Doppel-Mount Guard ---------------------------------------
if (window.__INSPECTOR_DIAG_MOUNTED__) {
  (window.CBLog?.info || console.info)('[inspector.diag] duplicate load – skipped');
  // sofort aussteigen
  // (nichts weiter in dieser Datei ausführen)
  // eslint-disable-next-line no-useless-return
  return;
}
window.__INSPECTOR_DIAG_MOUNTED__ = true;
  
  /* =========================== [CORE-BRIDGE] =========================== */
  // Kompatible, minimale Brücke zur Tab-API (unabhängig vom genauen Core-Stand)
  const core = (function(){
    if (window.__INSPECTOR_CORE__?.api) return window.__INSPECTOR_CORE__.api;
    const ins = window.Inspector || window.__INSPECTOR__ || {};
    return {
      mount(id,onShow){ return (ins.registerTab||ins.addTab||function(){ })({ id, title:id, onShow }); },
      getSlot(name){
        return document.querySelector(`#inspector [data-slot="${name}"]`)
            || document.querySelector(`[data-inspector-slot="${name}"]`)
            || document.getElementById(`ins-${name}`)
            || document.getElementById(name);
      }
    };
  })();

  /* ============================== [DOM] =============================== */
  const $ = (s,sc=document)=> sc.querySelector(s);
  function el(tag, cls, html){
    const n=document.createElement(tag); if(cls) n.className=cls; if(html!=null) n.innerHTML=html; return n;
  }

  /* ============================= [STATE] ============================== */
  const state = {
    lastBoot : null,               // { counts, assets, map, meta }
    resMap   : {},                 // Ressourcenwerte
    mounted  : false,
    timer    : 0,

    // Live-Tick-Monitor
    tick: {
      fps: 0,
      dt : 0,
      // Ring-Puffer für Graphen
      histFPS:  new Array(120).fill(0),  // ~2s bei 60fps
      histDT :  new Array(120).fill(0),
      ptr: 0,
      canvas: null,
      ctx: null,
      // Statistiken
      minFPS: 999, maxFPS: 0,
      minDT :  99, maxDT : 0
    }
  };

  /* =========================== [RENDER HELFER] =========================== */
  function safe(v){
    if (v==null) return '—';
    if (typeof v==='object') return Array.isArray(v) ? `[${v.length}]` : JSON.stringify(v);
    return String(v);
  }
  function kvTable(obj, order){
    const tbl = el('table','inspector-table');
    const head = el('thead',null,'<tr><th>Key</th><th>Value</th></tr>');
    const body = el('tbody');
    const keys = order ? order.filter(k=>k in obj) : Object.keys(obj||{});
    keys.forEach(k=>{
      const tr = el('tr',null,`<td class="pad"><code>${k}</code></td><td class="pad">${safe(obj[k])}</td>`);
      body.appendChild(tr);
    });
    tbl.append(head, body);
    return tbl;
  }
  function resTable(map){
    const tbl = el('table','inspector-table');
    const head = el('thead',null,'<tr><th>Res</th><th style="width:120px;text-align:right">Menge</th></tr>');
    const body = el('tbody');
    const ids = Object.keys(map||{}).sort((a,b)=>a.localeCompare(b));
    ids.forEach(id=>{
      const val = Number(map[id]||0);
      const tr = el('tr');
      tr.innerHTML = `<td class="pad"><code>${id}</code></td><td class="pad" style="text-align:right">${val}</td>`;
      body.appendChild(tr);
    });
    tbl.append(head,body);
    return tbl;
  }

  /* =========================== [TICK MONITOR] ============================ */
  // Zeichnet simple Linien für FPS (oben) und Δt (unten) in ein Canvas.
  function drawTickCanvas(){
    const C = state.tick.canvas, ctx = state.tick.ctx;
    if (!C || !ctx) return;
    const W=C.width, H=C.height;
    ctx.clearRect(0,0,W,H);

    // Achsen/Skalen
    ctx.globalAlpha=0.25;
    ctx.fillStyle='#999';
    // Mittellinie
    ctx.fillRect(0, H*0.5|0, W, 1);
    // 60fps Linie (oben)
    const y60 = H - (60/120)*H; // skaliere fps auf 0..120
    ctx.fillRect(0, y60|0, W, 1);

    ctx.globalAlpha=1;

    // FPS Kurve
    ctx.beginPath();
    for (let i=0;i<state.tick.histFPS.length;i++){
      const idx=(state.tick.ptr+i)%state.tick.histFPS.length;
      const v=state.tick.histFPS[idx]; // fps
      const x = i/(state.tick.histFPS.length-1)*W;
      const y = H - Math.min(120, v)/120*H;
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.strokeStyle='#3bd16f';
    ctx.lineWidth=1;
    ctx.stroke();

    // DT Kurve (ms) – skaliert auf 0..100ms
    ctx.beginPath();
    for (let i=0;i<state.tick.histDT.length;i++){
      const idx=(state.tick.ptr+i)%state.tick.histDT.length;
      const v=state.tick.histDT[idx]; // ms
      const x = i/(state.tick.histDT.length-1)*W;
      const y = H - Math.min(100, v)/100*H;
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.strokeStyle='#f6b73c';
    ctx.lineWidth=1;
    ctx.stroke();
  }

  function pushTickSample(fps, dtMs){
    const t = state.tick;
    t.histFPS[t.ptr] = fps;
    t.histDT [t.ptr] = dtMs;
    t.ptr = (t.ptr + 1) % t.histFPS.length;

    // Stats
    t.fps = fps|0;
    t.dt  = dtMs;
    t.minFPS = Math.min(t.minFPS, fps);
    t.maxFPS = Math.max(t.maxFPS, fps);
    t.minDT  = Math.min(t.minDT,  dtMs);
    t.maxDT  = Math.max(t.maxDT,  dtMs);

    drawTickCanvas();
  }

  /* ============================ [VIEW-BAU] ============================= */
  function buildView(host){
    host.innerHTML = '';
    const wrap = el('div','pad');

    // Kopf & Toolbar
    const h = el('h3',null,'Diagnose');
    const bar = el('div','toolbar');
    const bReqRes  = el('button','insp-btn','res: snapshot');
    const bReqReg  = el('button','insp-btn','registry: snapshot');
    const bRefresh = el('button','insp-btn','Refresh');
    bReqRes.addEventListener('click', ()=> dispatchEvent(new Event('req:res:snapshot')));
    bReqReg.addEventListener('click', ()=> dispatchEvent(new Event('req:registry:snapshot')));
    bRefresh.addEventListener('click', ()=> renderAll(host));
    bar.append(bReqRes, bReqReg, bRefresh);

    // Live-Tick-Monitor (Box oben rechts)
    const mon = el('div','diag-monitor');
    mon.innerHTML = `
      <div class="diag-mon__row">
        <div class="diag-mon__metric"><label>FPS</label><span id="diag-fps">—</span></div>
        <div class="diag-mon__metric"><label>Δt</label><span id="diag-dt">—</span></div>
      </div>
      <canvas id="diag-canvas" width="280" height="70" style="display:block; margin-top:6px; border:1px solid #444; border-radius:4px"></canvas>
      <div class="diag-mon__row diag-mon__stats">
        <div><small>min / max FPS:</small> <span id="diag-fps-min">—</span> / <span id="diag-fps-max">—</span></div>
        <div><small>min / max Δt:</small> <span id="diag-dt-min">—</span> / <span id="diag-dt-max">—</span> ms</div>
      </div>
    `;

    // Sektionen
    const boxRegistry = el('div'); // Registry counts + meta
    const boxAssets   = el('div'); // Assets stats
    const boxMap      = el('div'); // Map info
    const boxRes      = el('div'); // Ressourcen live

    wrap.append(h, bar,
      // Monitor prominent platzieren
      mon,
      el('h4',null,'Registry'),
      boxRegistry,
      el('h4',null,'Assets'),
      boxAssets,
      el('h4',null,'Map'),
      boxMap,
      el('h4',null,'Ressourcen (live)'),
      boxRes
    );
    host.appendChild(wrap);

    // Canvas-Refs speichern
    state.tick.canvas = $('#diag-canvas', wrap);
    state.tick.ctx    = state.tick.canvas?.getContext('2d') || null;

    // CSS-Minimum (nur wenn nicht vorhanden) – unaufdringlich
    injectDiagStyles();

    // Render-Funktionen binden
    host._renderDiag = function(){
      try{
        // Registry
        const meta = state.lastBoot?.meta || {};
        const counts = state.lastBoot?.counts || {
          buildings: window.Registry?.data?.buildings?.length||0,
          units    : window.Registry?.data?.units?.length||0,
          resources: Array.isArray(window.Registry?.data?.resources)
                     ? window.Registry.data.resources.length
                     : Object.keys(window.Registry?.data?.resources||{}).length
        };
        boxRegistry.innerHTML='';
        boxRegistry.appendChild( kvTable(counts, ['buildings','units','resources']) );
        if (meta && Object.keys(meta).length){
          const t = kvTable(meta, ['categories','iconsBase']);
          t.querySelector('thead tr th:last-child').textContent='Meta';
          boxRegistry.appendChild(t);
        }

        // Assets
        const assets = state.lastBoot?.assets || (window.Assets?.stats?.() || { json:0, img:0 });
        boxAssets.innerHTML='';
        boxAssets.appendChild( kvTable(assets, ['json','img']) );

        // Map
        const map = state.lastBoot?.map || (window.MapRuntime?.info?.() || {});
        boxMap.innerHTML='';
        boxMap.appendChild( kvTable(map, ['name','width','height','tile','seed']) );

        // Ressourcen
        boxRes.innerHTML='';
        boxRes.appendChild( resTable(state.resMap) );

        // Monitor-Zahlen aktualisieren
        updateMonitorNumbers();
        drawTickCanvas();
      }catch(e){
        ERR('renderDiag', e?.message || e);
        dispatchEvent(new CustomEvent('cb:insp:console',{detail:{type:'error',msg:String(e)}}));
      }
    };

    // Initial render
    host._renderDiag();
  }

  function injectDiagStyles(){
    if (document.getElementById('diag-monitor-style')) return;
    const css = `
      .diag-monitor{ margin-bottom:12px; padding:8px; border:1px solid #444; border-radius:6px; }
      .diag-mon__row{ display:flex; gap:16px; align-items:center; justify-content:flex-start; }
      .diag-mon__metric{ display:flex; gap:6px; align-items:baseline; }
      .diag-mon__metric label{ font-size:12px; opacity:.8; }
      .diag-mon__metric span{ font-variant-numeric: tabular-nums; font-weight:600; }
      .diag-mon__stats{ gap:24px; margin-top:6px; opacity:.85; }
    `;
    const tag = document.createElement('style');
    tag.id='diag-monitor-style'; tag.textContent=css;
    document.head.appendChild(tag);
  }

  function updateMonitorNumbers(){
    const fpsEl = document.getElementById('diag-fps');
    const dtEl  = document.getElementById('diag-dt');
    const minF  = document.getElementById('diag-fps-min');
    const maxF  = document.getElementById('diag-fps-max');
    const minD  = document.getElementById('diag-dt-min');
    const maxD  = document.getElementById('diag-dt-max');
    if (!fpsEl) return;

    fpsEl.textContent = String(state.tick.fps);
    dtEl .textContent = (state.tick.dt).toFixed(2);

    if (minF) minF.textContent = (state.tick.minFPS|0);
    if (maxF) maxF.textContent = (state.tick.maxFPS|0);
    if (minD) minD.textContent = state.tick.minDT.toFixed(2);
    if (maxD) maxD.textContent = state.tick.maxDT.toFixed(2);
  }

  /* =========================== [RENDER FLOW] =========================== */
  function renderAll(host){
    try{
      // Falls kein Boot-Snapshot existiert, lokal erzeugen
      if (!state.lastBoot && window.Registry?.snapshot){
        const snap = window.Registry.snapshot();
        state.lastBoot = {
          counts : {
            buildings: snap.data?.buildings?.length||0,
            units    : snap.data?.units?.length||0,
            resources: Array.isArray(snap.data?.resources)
                      ? snap.data.resources.length
                      : Object.keys(snap.data?.resources||{}).length
          },
          assets : window.Assets?.stats?.() || { json:0, img:0 },
          map    : window.MapRuntime?.info?.() || {},
          meta   : snap.meta||{}
        };
      }
    }catch(_){}
    host._renderDiag?.();
  }

  function renderIfActive(tabId){
    const active = document.querySelector('#inspector .insp-tab.active')?.dataset?.tab;
    if (active === tabId){
      const host = core.getSlot('generic') || core.getSlot('view');
      host?._renderDiag?.();
    }
  }

  /* ========================== [EVENT HANDLERS] ========================== */
  function onBootSnapshot(e){
    state.lastBoot = e?.detail || null;
    renderIfActive('diag');
  }
  function onResSnapshot(e){
    const map = e?.detail?.resources || e?.detail || {};
    state.resMap = Object.assign({}, map);
    renderIfActive('diag');
  }
  function onGameTick(e){
    const d = e?.detail || {};
    if (!d) return;
    const fps = Number(d.fps||0);
    const dtMs = Number(d.dt||0) * 1000; // dt ist in Sekunden → ms
    pushTickSample(fps, dtMs);
    // Nur Zahlen im Monitor updaten, wenn Tab sichtbar – Canvas wird sowieso gezeichnet
    const active = document.querySelector('#inspector .insp-tab.active')?.dataset?.tab;
    if (active === 'diag') updateMonitorNumbers();
  }

  /* ============================== [MOUNT] ============================== */
  core.mount('diag', (host)=>{
    // Sicher auf den generic-slot gehen (Core >= 18.16.3), sonst host nehmen
    if (host && !host.closest || !host.closest('.insp-content')) {
      host = core.getSlot('generic') || host;
    }
    buildView(host);
    renderAll(host);

    // Auto-Refresh solange der Tab aktiv ist (Counts/Meta können sich ändern)
    clearInterval(state.timer);
    state.timer = setInterval(()=> renderAll(host), 1500);

    OK('bereit', VER);
  });

  /* ============================ [SUBSCRIPTIONS] ============================ */
  window.addEventListener('cb:diag:boot-snapshot', onBootSnapshot);
  window.addEventListener('cb:res:snapshot',       onResSnapshot);
  window.addEventListener('cb:game:tick',          onGameTick);

  window.addEventListener('cb:registry:ready', ()=> {
    // Direkt nach registry-ready: lokalen Boot-Snapshot bauen (falls keiner kam)
    try{
      const snap = window.Registry?.snapshot?.();
      if (snap){
        state.lastBoot = {
          counts : {
            buildings: snap.data?.buildings?.length||0,
            units    : snap.data?.units?.length||0,
            resources: Array.isArray(snap.data?.resources)
                      ? snap.data.resources.length
                      : Object.keys(snap.data?.resources||{}).length
          },
          assets : window.Assets?.stats?.() || { json:0, img:0 },
          map    : window.MapRuntime?.info?.() || {},
          meta   : snap.meta||{}
        };
      }
    }catch(_){}
    // Ressourcenstand erfragen
    dispatchEvent(new Event('req:res:snapshot'));
  });

  // Tab-Wechsel → Timer pausieren
  window.addEventListener('cb:insp:tab:change', (e)=>{
    if (e?.detail?.tab !== 'diag') {
      clearInterval(state.timer); state.timer = 0;
    } else {
      // erneut starten, wenn "diag" wieder aktiv wird
      clearInterval(state.timer);
      state.timer = setInterval(()=>{
        const host = core.getSlot('generic') || core.getSlot('view');
        if (host) renderAll(host);
      }, 1500);
    }
  });

})();
