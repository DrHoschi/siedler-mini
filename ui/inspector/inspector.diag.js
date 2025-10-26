/* ============================================================================
 * Datei   : ui/inspector/inspector.diag.js
 * Projekt : Neue Siedler – Inspector (Diagnose-Tab)
 * Version : v25.10.29-final
 *
 * Zweck
 *  - Live-Diagnose in einem eigenen Tab: FPS/Δt, Boot-/Registry-/Assets-/Map-
 *    Snapshot sowie aktuelle Ressourcen-Übersicht (read-only).
 *  - Einfache Schnellaktionen: Res-/Registry-Snapshot anfordern, Refresh.
 *
 * Abhängigkeiten (optional/robust):
 *  - inspector.core.js (Tab-API; kompatible mount-Bridge integriert)
 *  - core/registry.js  (für snapshot() & Ressourcenliste)
 *  - core/assets.js    (Assets.stats() wenn vorhanden)
 *  - MapRuntime.info() (wenn vorhanden)
 *  - game/core tick-Event: cb:game:tick {fps, dt} (dt in Sekunden)
 *
 * Lauscht:
 *  - cb:diag:boot-snapshot { counts, assets, map, meta }    (optional)
 *  - cb:registry:ready
 *  - cb:res:snapshot       { resources }
 *  - cb:game:tick          { fps, dt } (dt in Sekunden)
 *  - cb:insp:tab:change
 *
 * Sendet:
 *  - req:res:snapshot
 *  - req:registry:snapshot
 * ========================================================================== */
(function(){
  'use strict';

  /* =============================== Logging =============================== */
  const MOD='[inspector.diag]';
  const LOG=(window.CBLog?.info  || console.info ).bind(console, MOD);
  const OK =(window.CBLog?.ok    || console.log  ).bind(console, MOD);
  const WRN=(window.CBLog?.warn  || console.warn ).bind(console, MOD);
  const ERR=(window.CBLog?.error || console.error).bind(console, MOD);

  // Doppel-Ladewächter (falls Datei zweimal eingebunden wurde)
  if (window.__INSPECTOR_DIAG_MOUNTED__) {
    LOG('duplicate load – skipped');
    return;
  }
  window.__INSPECTOR_DIAG_MOUNTED__ = true;

  /* ============================ Core-Bridge ============================= */
  // Akzeptiert __INSPECTOR_CORE__.api oder ältere Globals.
  const core = (function(){
    if (window.__INSPECTOR_CORE__?.api) return window.__INSPECTOR_CORE__.api;
    const ins = window.Inspector || window.UIInspector || {};
    return {
      mount(id, onShow){
        const reg = ins.registerTab || ins.addTab;
        return reg ? reg({ id, title:id, onShow }) : null;
      },
      getSlot(name){
        return document.querySelector(`#inspector [data-slot="${name}"]`)
            || document.querySelector(`[data-inspector-slot="${name}"]`)
            || document.getElementById(`ins-${name}`)
            || document.getElementById(name);
      }
    };
  })();

  /* ================================ State =============================== */
  const state = {
    mounted : false,
    timer   : 0,           // Auto-Refresh-Intervall (wenn Tab aktiv)
    lastBoot: null,        // {counts, assets, map, meta}
    resMap  : {},          // Ressourcenwert-Mirror

    tick: {                // Live-Tick-Monitor
      fps: 0, dt: 0,
      minFPS: 999, maxFPS: 0,
      minDT :  99, maxDT : 0,
      histFPS: new Array(120).fill(0),
      histDT : new Array(120).fill(0),
      ptr: 0,
      canvas: null, ctx: null
    }
  };

  /* =============================== Helpers ============================== */
  const $  = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
  const safe = v => (v==null ? '—' : (typeof v==='object' ? (Array.isArray(v)?`[${v.length}]`:JSON.stringify(v)) : String(v)));
  const nowTime = () => new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});

  function el(tag, cls, html){
    const n=document.createElement(tag);
    if (cls)  n.className = cls;
    if (html!=null) n.innerHTML = html;
    return n;
  }
  function kvTable(obj, order, lastColTitle='Wert'){
    const tbl = el('table','inspector-table');
    const thead = el('thead',null,`<tr><th>Key</th><th>${lastColTitle}</th></tr>`);
    const body  = el('tbody');
    const keys  = order ? order.filter(k => k in (obj||{})) : Object.keys(obj||{});
    keys.forEach(k=>{
      const tr = el('tr',null,`<td class="pad"><code>${k}</code></td><td class="pad">${safe(obj[k])}</td>`);
      body.appendChild(tr);
    });
    tbl.append(thead,body);
    return tbl;
  }
  function resTable(map){
    const tbl = el('table','inspector-table');
    const thead = el('thead',null,`<tr><th>Res</th><th style="width:120px;text-align:right">Menge</th></tr>`);
    const body  = el('tbody');
    const ids = Object.keys(map||{}).sort((a,b)=>a.localeCompare(b));
    ids.forEach(id=>{
      const val = Number(map[id]||0);
      const tr = el('tr',null,
        `<td class="pad"><code>${id}</code></td><td class="pad" style="text-align:right">${val}</td>`);
      body.appendChild(tr);
    });
    tbl.append(thead,body);
    return tbl;
  }

  /* =========================== Tick-Monitor (Canvas) ======================== */
  function pushTickSample(fps, dtMs){
    const t = state.tick;
    t.histFPS[t.ptr] = fps;
    t.histDT [t.ptr] = dtMs;
    t.ptr = (t.ptr + 1) % t.histFPS.length;

    t.fps = fps|0; t.dt = dtMs;
    t.minFPS = Math.min(t.minFPS, fps);
    t.maxFPS = Math.max(t.maxFPS, fps);
    t.minDT  = Math.min(t.minDT , dtMs);
    t.maxDT  = Math.max(t.maxDT , dtMs);

    drawTickCanvas();
  }
  function drawTickCanvas(){
    const C = state.tick.canvas, ctx = state.tick.ctx;
    if (!C || !ctx) return;
    const W=C.width, H=C.height;
    ctx.clearRect(0,0,W,H);

    // Hilfslinien
    ctx.globalAlpha=0.25; ctx.fillStyle='#999';
    ctx.fillRect(0, H*0.5|0, W, 1);              // Mitte
    const y60 = H - (Math.min(120, 60)/120)*H;   // 60 FPS
    ctx.fillRect(0, y60|0, W, 1);
    ctx.globalAlpha=1;

    // FPS-Kurve (grün)
    ctx.beginPath();
    for (let i=0;i<state.tick.histFPS.length;i++){
      const idx=(state.tick.ptr+i)%state.tick.histFPS.length;
      const v = state.tick.histFPS[idx]; // 0..120
      const x = i/(state.tick.histFPS.length-1)*W;
      const y = H - Math.min(120, v)/120*H;
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.strokeStyle='#3bd16f'; ctx.lineWidth=1; ctx.stroke();

    // Δt-Kurve (orange, 0..100ms)
    ctx.beginPath();
    for (let i=0;i<state.tick.histDT.length;i++){
      const idx=(state.tick.ptr+i)%state.tick.histDT.length;
      const v = state.tick.histDT[idx]; // ms
      const x = i/(state.tick.histDT.length-1)*W;
      const y = H - Math.min(100, v)/100*H;
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.strokeStyle='#f6b73c'; ctx.lineWidth=1; ctx.stroke();
  }
  function updateMonitorNumbers(){
    const fps  = $('#diag-fps');     const dt   = $('#diag-dt');
    const minF = $('#diag-fps-min'); const maxF = $('#diag-fps-max');
    const minD = $('#diag-dt-min');  const maxD = $('#diag-dt-max');
    if (!fps) return;
    fps.textContent  = String(state.tick.fps);
    dt.textContent   = state.tick.dt.toFixed(2);
    if (minF) minF.textContent = state.tick.minFPS|0;
    if (maxF) maxF.textContent = state.tick.maxFPS|0;
    if (minD) minD.textContent = state.tick.minDT.toFixed(2);
    if (maxD) maxD.textContent = state.tick.maxDT.toFixed(2);
  }

  /* ============================== View-Bau =============================== */
  function buildView(host){
    host.innerHTML = `
      <div class="insp-frame">
        <div class="insp-header">
          <h3>Diagnose</h3>
          <button class="insp-close" title="Inspector schließen">×</button>
        </div>

        <div class="insp-content">
          <div class="pad">
            <!-- Toolbar -->
            <div class="toolbar" style="flex-wrap:wrap;gap:8px">
              <button class="insp-btn" id="d-res-snap">res: snapshot</button>
              <button class="insp-btn" id="d-reg-snap">registry: snapshot</button>
              <button class="insp-btn" id="d-refresh">Refresh</button>
              <span id="d-hint" class="hint"></span>
            </div>

            <!-- Live-Tick-Monitor -->
            <div class="diag-monitor">
              <div class="diag-mon__row">
                <div class="diag-mon__metric"><label>FPS</label><span id="diag-fps">—</span></div>
                <div class="diag-mon__metric"><label>Δt (ms)</label><span id="diag-dt">—</span></div>
              </div>
              <canvas id="diag-canvas" width="280" height="70" style="display:block;margin-top:6px;border:1px solid #444;border-radius:4px"></canvas>
              <div class="diag-mon__row diag-mon__stats">
                <div><small>min / max FPS:</small> <span id="diag-fps-min">—</span> / <span id="diag-fps-max">—</span></div>
                <div><small>min / max Δt:</small> <span id="diag-dt-min">—</span> / <span id="diag-dt-max">—</span> ms</div>
              </div>
            </div>

            <h4>Registry</h4>
            <div id="diag-reg"></div>

            <h4>Assets</h4>
            <div id="diag-assets"></div>

            <h4>Map</h4>
            <div id="diag-map"></div>

            <h4>Ressourcen (live)</h4>
            <div id="diag-res"></div>
          </div>
        </div>
      </div>
    `;

    // Schließen-Button
    $('.insp-close', host)?.addEventListener('click', () => window.Inspector?.close());

    // Tick-Canvas referenzieren
    state.tick.canvas = $('#diag-canvas', host);
    state.tick.ctx    = state.tick.canvas?.getContext('2d') || null;

    // Minimal-Styles injizieren (nur falls nicht schon vorhanden)
    injectDiagStyles();

    // Buttons
    $('#d-res-snap', host).addEventListener('click', ()=>dispatchEvent(new Event('req:res:snapshot')));
    $('#d-reg-snap', host).addEventListener('click', ()=>dispatchEvent(new Event('req:registry:snapshot')));
    $('#d-refresh',  host).addEventListener('click', ()=>renderAll(host));
  }

  function injectDiagStyles(){
    if (document.getElementById('diag-monitor-style')) return;
    const css = `
      .diag-monitor{ margin:10px 0 12px; padding:8px; border:1px solid #444; border-radius:6px; }
      .diag-mon__row{ display:flex; gap:16px; align-items:center; flex-wrap:wrap; }
      .diag-mon__metric{ display:flex; gap:6px; align-items:baseline; }
      .diag-mon__metric label{ font-size:12px; opacity:.8; }
      .diag-mon__metric span{ font-variant-numeric: tabular-nums; font-weight:600; }
      .diag-mon__stats{ gap:24px; margin-top:6px; opacity:.85; }
    `;
    const tag=document.createElement('style'); tag.id='diag-monitor-style';
    tag.textContent=css; document.head.appendChild(tag);
  }

  /* ============================== Render-Flow ============================== */
  function getLocalBootSnapshot(){
    try{
      const snap = window.Registry?.snapshot?.();
      const counts = {
        buildings: snap?.data?.buildings?.length || 0,
        units    : snap?.data?.units?.length     || 0,
        resources: Array.isArray(snap?.data?.resources)
                    ? snap.data.resources.length
                    : (snap?.data?.resources ? Object.keys(snap.data.resources).length : 0)
      };
      const assets = window.Assets?.stats?.() || { json:0, img:0 };
      const map    = window.MapRuntime?.info?.() || {};
      const meta   = snap?.meta || {};
      return { counts, assets, map, meta };
    }catch(_){ return null; }
  }

  function renderAll(host){
    try{
      // Boot/Startdaten: extern gesendet ODER lokal ermitteln
      if (!state.lastBoot) state.lastBoot = getLocalBootSnapshot();

      // Registry
      const regBox = $('#diag-reg', host);
      regBox.innerHTML = '';
      if (state.lastBoot?.counts) regBox.appendChild(kvTable(state.lastBoot.counts, ['buildings','units','resources'], 'Anzahl'));
      if (state.lastBoot?.meta && Object.keys(state.lastBoot.meta).length){
        const t = kvTable(state.lastBoot.meta, ['categories','iconsBase'], 'Meta');
        regBox.appendChild(t);
      }

      // Assets
      const assetsBox = $('#diag-assets', host);
      assetsBox.innerHTML = '';
      assetsBox.appendChild( kvTable(state.lastBoot?.assets || (window.Assets?.stats?.()||{json:0,img:0}), ['json','img'], 'Zahl') );

      // Map
      const mapBox = $('#diag-map', host);
      mapBox.innerHTML = '';
      mapBox.appendChild( kvTable(state.lastBoot?.map || (window.MapRuntime?.info?.()||{}), ['name','width','height','tile','seed'], 'Wert') );

      // Ressourcen (live)
      const resBox = $('#diag-res', host);
      resBox.innerHTML = '';
      resBox.appendChild( resTable(state.resMap) );

      // Monitor-Zahlen & Canvas
      updateMonitorNumbers();
      drawTickCanvas();

    }catch(e){
      ERR('renderAll', e?.message||e);
    }
  }

  function renderIfActive(tabId){
    const active = document.querySelector('#inspector .insp-tab.is-active, #inspector .insp-tab.active')?.dataset?.tab;
    if (active === tabId){
      const host = document.querySelector('.insp-view[data-tab="diag"]') || core.getSlot('generic');
      if (host) renderAll(host);
    }
  }

  /* ============================== Event-Hooks ============================== */
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
    const fps  = Number(d.fps||0);
    const dtMs = Number(d.dt||0) * 1000; // dt in Sekunden → ms
    pushTickSample(fps, dtMs);
    // sichtbare Zahlen aktualisieren, wenn Tab aktiv
    const active = document.querySelector('#inspector .insp-tab.is-active, #inspector .insp-tab.active')?.dataset?.tab;
    if (active === 'diag') updateMonitorNumbers();
  }

  /* ================================ Mount ================================ */
  core.mount('diag', (host)=>{
    // falls der Core einen generischen Slot hat, dort hinein zeichnen
    if (!host?.closest || !host.closest('.insp-content')) {
      host = core.getSlot('generic') || host;
    }
    buildView(host);
    renderAll(host);

    // Auto-Refresh im aktiven Tab (Registry/Map können sich initial ändern)
    clearInterval(state.timer);
    state.timer = setInterval(()=> renderAll(host), 1500);

    OK('bereit v25.10.29-final');
  });

  /* ============================== Subscriptions ============================ */
  window.addEventListener('cb:diag:boot-snapshot', onBootSnapshot);
  window.addEventListener('cb:res:snapshot',       onResSnapshot);
  window.addEventListener('cb:game:tick',          onGameTick);

  window.addEventListener('cb:registry:ready', ()=>{
    // Direkter Fallback-Boot-Snapshot & Ressourcenstand anfordern
    state.lastBoot = getLocalBootSnapshot() || state.lastBoot;
    dispatchEvent(new Event('req:res:snapshot'));
  });

  // Tabwechsel: Timer pausieren/fortsetzen
  window.addEventListener('cb:insp:tab:change', (e)=>{
    if ((e?.detail?.tab||'') !== 'diag') {
      clearInterval(state.timer); state.timer = 0;
    } else {
      clearInterval(state.timer);
      state.timer = setInterval(()=>{
        const host = document.querySelector('.insp-view[data-tab="diag"]') || core.getSlot('generic');
        if (host) renderAll(host);
      }, 1500);
    }
  });
})();
