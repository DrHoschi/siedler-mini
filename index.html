/* game.js — Siedler‑Mini Runtime
   - Atlas-Support (tileset.json + tileset.png)
   - Zoom/Pan nur im Canvas (#stage)
   - Debug-Overlay + Log-Puffer + Download
   - hört auf ui:start / ui:reload (aus index.html) und app:start (aus boot.js)
   - F2 toggelt Debug
*/
(() => {
  'use strict';

  // ===== Short helpers =======================================================
  const $ = s => document.querySelector(s);
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const logBuf = [];
  function klog(tag, ...a){
    const line = `[${tag}] ${a.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(' ')}`;
    logBuf.push(line);
    if (logBuf.length>2000) logBuf.shift();
    console.log(line);
  }
  function saveLog(){
    const blob = new Blob([logBuf.join('\n')], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `siedler-mini-debug-${Date.now()}.txt`;
    a.href = url; a.click();
    URL.revokeObjectURL(url);
  }
  window.SM_DEBUG = { saveLog, lines:()=>logBuf.slice() };

  // ===== DOM/Canvas ==========================================================
  const canvas = $('#stage') || (()=>{ const c=document.createElement('canvas'); c.id='stage'; document.body.appendChild(c); return c; })();
  const ctx = canvas.getContext('2d');
  const dbg = $('#debugOverlay');         // <pre id="debugOverlay">
  if (!dbg) {                             // falls nicht vorhanden → still anlegen
    const p = document.createElement('pre');
    p.id = 'debugOverlay'; document.body.appendChild(p);
  }

  // Vollbild‑Canvas (CSS) – echte Pixel per DPR dynamisch
  function resizeCanvas(){
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio||1));
    const r = canvas.getBoundingClientRect();
    canvas.width  = Math.round(r.width  * dpr);
    canvas.height = Math.round(r.height * dpr);
    state.dpr = dpr;
  }
  window.addEventListener('resize', ()=>{ resizeCanvas(); });

  // ===== State ===============================================================
  const state = {
    running:false,
    dpr: Math.max(1, Math.min(3, window.devicePixelRatio||1)),

    // Kamera/Transform (wir transformieren im Canvas, UI bleibt fix)
    cam:{ x:0, y:0, z:1, zMin:0.5, zMax:3.5 },

    // Map
    map:{
      url:null,
      rows:16, cols:16, tile:64,
      layers:[]  // layer[0].grid = flache Liste (rows*cols) von Tile-Keys
    },

    // Atlas
    atlas:{
      frames:null,       // { key:{x,y,w,h} }
      image:null,        // HTMLImageElement
      ok:false
    },

    // Input
    drag:false, down:{x:0,y:0}, cam0:{x:0,y:0},
    pinch:null, // {d, z0}

    // Debug
    debugOn: true
  };

  // ===== Debug Overlay =======================================================
  function setDebug(text){
    const el = $('#debugOverlay');
    if (!el) return;
    el.style.display = state.debugOn ? 'block':'none';
    if (state.debugOn) el.textContent = text || '';
  }
  window.setDebug = setDebug; // optional von außen nutzbar

  function updateOverlay(extra=''){
    if (!state.debugOn) return;
    const size = `${Math.round(canvas.clientWidth)}x${Math.round(canvas.clientHeight)}`;
    const lines = [
      `Cam: x=${state.cam.x.toFixed(1)}  y=${state.cam.y.toFixed(1)}  zoom=${state.cam.z.toFixed(2)}`,
      `Map: ${state.map.url || '—'}`,
      `rows=${state.map.rows}  cols=${state.map.cols}  tile=${state.map.tile}`,
      `Atlas: ${state.atlas.ok ? 'OK':'—'}`,
      `DPR=${state.dpr}   Size=${size}`
    ];
    if (extra) lines.push(extra);
    setDebug(lines.join('\n'));
  }

  window.addEventListener('keydown', (e)=>{
    if (e.code === 'F2'){
      state.debugOn = !state.debugOn;
      updateOverlay(state.debugOn?'[debug] ON':'[debug] OFF');
    }
    if (e.code === 'KeyD' && (e.ctrlKey||e.metaKey)){
      // Ctrl/Cmd+D → Debug speichern
      e.preventDefault();
      saveLog();
    }
  });

  // ===== Camera helpers ======================================================
  function applyCam(){
    // Alles in CSS‑Pixeln zeichnen, DPR bereits über canvas.width/height berücksichtigt
    ctx.setTransform(1,0,0,1,0,0);
    // Mittelpunkt = Bildschirmmitte
    const cx = Math.floor(canvas.width/state.dpr/2);
    const cy = Math.floor(canvas.height/state.dpr/2);
    ctx.translate(cx, cy);
    ctx.scale(state.cam.z, state.cam.z);
    ctx.translate(-state.cam.x, -state.cam.y);
  }

  function zoomTo(z, centerCssX, centerCssY){
    z = clamp(z, state.cam.zMin, state.cam.zMax);
    if (centerCssX!=null && centerCssY!=null){
      // Zoom um Zeiger: korrigiere Kamera so, dass der Punkt stehen bleibt
      const before = cssToWorld(centerCssX, centerCssY);
      state.cam.z = z;
      const after  = cssToWorld(centerCssX, centerCssY);
      state.cam.x += (before.x - after.x);
      state.cam.y += (before.y - after.y);
    } else {
      state.cam.z = z;
    }
  }

  function cssToWorld(px, py){
    const cx = canvas.getBoundingClientRect().width/2;
    const cy = canvas.getBoundingClientRect().height/2;
    return {
      x: (px - cx)/state.cam.z + state.cam.x,
      y: (py - cy)/state.cam.z + state.cam.y
    };
  }

  // ===== Input (nur Canvas reagiert) ========================================
  canvas.addEventListener('wheel', (e)=>{
    e.preventDefault();
    const delta = -Math.sign(e.deltaY)*0.12;
    zoomTo(state.cam.z + delta, e.clientX, e.clientY);
    updateOverlay();
  }, {passive:false});

  canvas.addEventListener('pointerdown', (e)=>{
    canvas.setPointerCapture(e.pointerId);
    if (e.isPrimary){
      state.drag = true;
      state.down.x = e.clientX; state.down.y = e.clientY;
      state.cam0.x = state.cam.x; state.cam0.y = state.cam.y;
    }
  });
  canvas.addEventListener('pointermove', (e)=>{
    if (!state.drag) return;
    const dx = (e.clientX - state.down.x)/state.cam.z;
    const dy = (e.clientY - state.down.y)/state.cam.z;
    state.cam.x = state.cam0.x - dx;
    state.cam.y = state.cam0.y - dy;
    updateOverlay();
  });
  window.addEventListener('pointerup', ()=>{ state.drag=false; });

  // Touch‑Pinch
  canvas.addEventListener('touchstart', (e)=>{
    if (e.touches.length===2){
      e.preventDefault();
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      state.pinch = { d, z0: state.cam.z };
    }
  }, {passive:false});
  canvas.addEventListener('touchmove', (e)=>{
    if (state.pinch && e.touches.length===2){
      e.preventDefault();
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = d / Math.max(1, state.pinch.d);
      zoomTo(state.pinch.z0 * scale);
      updateOverlay();
    }
  }, {passive:false});
  canvas.addEventListener('touchend', ()=>{ state.pinch=null; }, {passive:true});

  // ===== Map/Atlas laden =====================================================
  async function loadMap(url){
    state.map.url = url;
    klog('map', 'lade', url);
    updateOverlay('[map] lädt …');
    try{
      const res = await fetch(url, {cache:'no-store'});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const map = await res.json();

      state.map.rows = Number(map.rows) || state.map.rows;
      state.map.cols = Number(map.cols) || state.map.cols;
      state.map.tile = Number(map.tileSize||map.tile) || state.map.tile;

      // layer
      const L0 = map.layers && map.layers[0];
      if (L0 && Array.isArray(L0.grid)){
        state.map.layers = [ { grid: L0.grid.slice() } ];
      } else {
        // Fallback: simple checker
        const grid = [];
        for (let r=0;r<state.map.rows;r++){
          for (let c=0;c<state.map.cols;c++){
            grid.push( ((r+c)&1) ? 'grass' : 'dirt' );
          }
        }
        state.map.layers = [ { grid } ];
      }

      // Atlas optional
      state.atlas.ok = false;
      state.atlas.frames = null;
      state.atlas.image = null;

      const base = url.substring(0, url.lastIndexOf('/')+1);
      const atlasJson = map?.atlas?.json  ? new URL(map.atlas.json, base).toString()  : null;
      const atlasImg  = map?.atlas?.image ? new URL(map.atlas.image, base).toString() : null;

      if (atlasJson && atlasImg){
        const [j, img] = await Promise.all([
          fetch(atlasJson, {cache:'no-store'}).then(r=>r.ok?r.json():null),
          loadImage(atlasImg)
        ]);
        if (j && img){
          state.atlas.frames = j.frames || j; // beide Schemata unterstützen
          state.atlas.image  = img;
          state.atlas.ok     = true;
          klog('atlas', 'OK', atlasJson, atlasImg);
        } else {
          klog('atlas', 'fehlend/unvollständig → Fallback');
        }
      } else {
        klog('atlas', 'nicht angegeben → Fallback');
      }

      // Kamera in die Mitte der Map
      state.cam.x = (state.map.cols*state.map.tile)/2;
      state.cam.y = (state.map.rows*state.map.tile)/2;
      updateOverlay('[map] geladen ✓');
      state.running = true;
    } catch(err){
      klog('ERR', 'map load', String(err?.message||err));
      updateOverlay('[map] Fehler: '+String(err?.message||err));
      state.running = true; // trotzdem Grid zeigen
    }
  }

  function loadImage(src){
    return new Promise((resolve)=>{ const img=new Image(); img.onload=()=>resolve(img); img.onerror=()=>resolve(null); img.src=src+(src.includes('?')?'&':'?')+'v='+Date.now(); });
  }

  // ===== Rendering ===========================================================
  function render(){
    // Clear (CSS‑Pixel)
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width/state.dpr, canvas.height/state.dpr);

    applyCam();

    const tile = state.map.tile;
    const cols = state.map.cols;
    const rows = state.map.rows;

    // Map‑Hintergrund
    ctx.fillStyle = '#102433';
    ctx.fillRect(0,0, cols*tile, rows*tile);

    // Zeichnen
    const L0 = state.map.layers[0]?.grid;
    if (L0){
      if (state.atlas.ok){
        // mit Atlas
        const F = state.atlas.frames, IMG = state.atlas.image;
        for (let i=0;i<L0.length;i++){
          const key = L0[i];
          if (!key) continue;
          const f = F[key];
          if (!f) continue;
          const r = (i/cols)|0, c = i%cols;
          ctx.drawImage(IMG, f.x, f.y, f.w, f.h, c*tile, r*tile, tile, tile);
        }
      } else {
        // Fallback‑Farben
        const col = (k)=> k==='grass'?'#2b7d2e': k==='dirt'?'#7a5a2a': k==='water'?'#1e4a6a': k==='rock'?'#5b6672': k==='snow'?'#cfd7df': k==='sand'?'#bda36c': k==='lava'?'#6b2b1e':'#3a4a59';
        for (let i=0;i<L0.length;i++){
          const key = L0[i];
          if (!key) continue;
          const r = (i/cols)|0, c = i%cols;
          ctx.fillStyle = col(key);
          ctx.fillRect(c*tile, r*tile, tile, tile);
        }
      }
    }

    // dezentes Grid drüber
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1/state.cam.z;
    ctx.beginPath();
    for (let c=0;c<=cols;c++){ const x = c*tile+0.5; ctx.moveTo(x,0); ctx.lineTo(x,rows*tile); }
    for (let r=0;r<=rows;r++){ const y = r*tile+0.5; ctx.moveTo(0,y); ctx.lineTo(cols*tile,y); }
    ctx.stroke();
  }

  function loop(){
    if (state.running) render();
    updateOverlay();
    requestAnimationFrame(loop);
  }

  // ===== UI‑Brücken ==========================================================
  // index.html Variante
  window.addEventListener('ui:start', (e)=>{ const u=e.detail?.map; if (u) startGame(u); });
  window.addEventListener('ui:reload', (e)=>{ const u=e.detail?.map; if (u) startGame(u); });

  // boot.js Variante
  document.addEventListener('app:start', (e)=>{ const u=e.detail?.mapUrl; if (u) startGame(u); });

  // Public API (für andere Skripte)
  async function startGame(url){ await loadMap(url); }
  async function reloadGame(url){ await loadMap(url || state.map.url); }
  window.GameLoader = { start: (url)=>startGame(url), reload: (url)=>reloadGame(url) };
  window.GameCamera = {
    setZoom:(z)=>{ zoomTo(z); },
    setPosition:(x,y)=>{ state.cam.x=x; state.cam.y=y; }
  };

  // ===== Init ================================================================
  // Buttons, falls vorhanden: Debug speichern (langfristig UX-Button in UI)
  (function hookButtons(){
    const btnStart = $('#btnStart');
    const btnReload= $('#btnReload');
    const mapSel   = $('#mapSelect');

    if (btnStart && mapSel) btnStart.addEventListener('click', ()=>startGame(mapSel.value));
    if (btnReload && mapSel) btnReload.addEventListener('click', ()=>reloadGame(mapSel.value));

    // Langdruck Geste auf Debug‑Overlay → Log speichern
    const overlay = $('#debugOverlay');
    if (overlay){
      let t0=0;
      overlay.addEventListener('pointerdown', ()=>{ t0=performance.now(); });
      overlay.addEventListener('pointerup', ()=>{ if (performance.now()-t0>600) saveLog(); });
    }
  })();

  resizeCanvas();
  state.cam.z = 1;
  state.cam.x = (state.map.cols*state.map.tile)/2;
  state.cam.y = (state.map.rows*state.map.tile)/2;
  klog('boot','Runtime bereit');
  requestAnimationFrame(loop);
})();
