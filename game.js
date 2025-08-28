<!-- SAVE AS: game.js  (v16.1.13) -->
/*
 * game.js — Siedler-Mini Runtime
 * Version: v16.1.13
 *
 * WICHTIGE ÄNDERUNGEN ggü. vorher:
 *  - ✅ Engine-Ready Signal sobald Runtime steht:
 *      window.dispatchEvent(new CustomEvent('cb:engine-ready'));
 *      window.GameUI?.onEngineReady?.();
 *  - ✅ Game-Started Signal nach erfolgreichem Map-Load:
 *      window.dispatchEvent(new CustomEvent('cb:game-started',{detail:{map:url}}));
 *      window.GameUI?.onGameStarted?.(url);
 *  - ✅ Stabiles Logging via klog() (für Inspector)
 *  - ✅ Sauberer Canvas-Clear in Device-Pixeln, ruhiges Bild (floored cam)
 */

(() => {
  'use strict';

  // ────────────────────────────────────────────────────────────────────────────
  // VERSION / LOGGING
  const VERSION = 'v16.1.13';

  const $ = s => document.querySelector(s);
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

  const logBuf = [];
  function klog(tag, ...a){
    const msg = `[${new Date().toLocaleTimeString()}] ${tag} ${a.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(' ')}`;
    logBuf.push(msg);
    if (logBuf.length>2000) logBuf.shift();
    console.log(msg);
    // an UI/Inspector weiterreichen (falls vorhanden)
    try {
      window.dispatchEvent(new CustomEvent('cb:engine-log', {detail:{msg}}));
    } catch {}
  }
  function saveLog(){
    const blob = new Blob([logBuf.join('\n')], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siedler-mini-debug-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
  window.SM_DEBUG = { saveLog, lines:()=>logBuf.slice() };

  // ────────────────────────────────────────────────────────────────────────────
  // CANVAS / DEBUG OVERLAY
  const canvas = $('#stage') || (()=>{ const c=document.createElement('canvas'); c.id='stage'; document.body.appendChild(c); return c; })();
  const ctx = canvas.getContext('2d', { alpha:true, desynchronized:true });
  ctx.imageSmoothingEnabled = false;

  const dbg = $('#debugOverlay') || (()=>{ const p=document.createElement('pre'); p.id='debugOverlay'; document.body.appendChild(p); return p; })();
  function setDebug(text){
    if (!document.body.classList.contains('debug-on')) { dbg.style.display='none'; return; }
    dbg.style.display='block';
    dbg.textContent = text || '';
  }
  window.setDebug = setDebug;

  // ────────────────────────────────────────────────────────────────────────────
  // ENGINE STATE
  const state = {
    dpr: Math.max(1, Math.min(3, window.devicePixelRatio||1)),
    running:false,
    cam:{ x:0, y:0, z:1, zMin:0.5, zMax:3.5 },
    map:{ url:null, rows:16, cols:16, tile:64, layers:[] },
    atlas:{ frames:null, image:null, ok:false },
    drag:false,
    down:{x:0,y:0},
    cam0:{x:0,y:0},
    pinch:null
  };

  function resizeCanvas(){
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio||1));
    state.dpr = dpr;
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
  }
  window.addEventListener('resize', resizeCanvas, {passive:true});

  // ────────────────────────────────────────────────────────────────────────────
  // OVERLAY
  function updateOverlay(extra=''){
    if (!document.body.classList.contains('debug-on')) return;
    const size = `${Math.round(canvas.clientWidth)}x${Math.round(canvas.clientHeight)}`;
    const lines = [
      `Game/Engine ${VERSION}`,
      `Cam: x=${state.cam.x.toFixed(1)} y=${state.cam.y.toFixed(1)} zoom=${state.cam.z.toFixed(2)}`,
      `Map: ${state.map.url || '—'}`,
      `rows=${state.map.rows} cols=${state.map.cols} tile=${state.map.tile}`,
      `Atlas: ${state.atlas.ok?'OK':'—'}`,
      `DPR=${state.dpr} Size=${size}`
    ];
    if (extra) lines.push(extra);
    setDebug(lines.join('\n'));
  }

  window.addEventListener('keydown', (e)=>{
    if (e.code==='F2'){
      const on = !document.body.classList.contains('debug-on');
      document.body.classList.toggle('debug-on', on);
      updateOverlay(on?'[debug] ON':'[debug] OFF');
    }
    if ((e.ctrlKey||e.metaKey) && e.code==='KeyD'){ e.preventDefault(); saveLog(); }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // KAMERA
  function applyCam(){
    // Ganze Pixel → ruhigeres Bild
    const cx = Math.floor((canvas.width/state.dpr) / 2);
    const cy = Math.floor((canvas.height/state.dpr) / 2);
    const x = Math.round(state.cam.x);
    const y = Math.round(state.cam.y);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.translate(cx, cy);
    ctx.scale(state.cam.z, state.cam.z);
    ctx.translate(-x, -y);
  }

  function cssToWorld(px, py){
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;
    const cx = w/2, cy = h/2;
    return { x: (px - cx)/state.cam.z + state.cam.x, y: (py - cy)/state.cam.z + state.cam.y };
  }

  function zoomTo(z, centerCssX, centerCssY){
    const nz = clamp(z, state.cam.zMin, state.cam.zMax);
    if (centerCssX!=null && centerCssY!=null){
      const before = cssToWorld(centerCssX, centerCssY);
      state.cam.z = nz;
      const after = cssToWorld(centerCssX, centerCssY);
      state.cam.x += (before.x - after.x);
      state.cam.y += (before.y - after.y);
    } else {
      state.cam.z = nz;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // INPUT (nur Canvas)
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
      state.down.x = e.clientX;
      state.down.y = e.clientY;
      state.cam0.x = state.cam.x;
      state.cam0.y = state.cam.y;
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

  // Pinch
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

  // ────────────────────────────────────────────────────────────────────────────
  // MAP + ATLAS
  async function loadMap(url){
    state.map.url = url;
    klog('✅(ok)', `Map laden → ${url}`);

    // Reset Atlas/Layer
    state.atlas.ok=false; state.atlas.frames=null; state.atlas.image=null;
    state.map.layers = [];
    updateOverlay('[map] lädt …');

    try{
      // Map laden (no-store gegen Cache-Hänger)
      const res = await fetch(url, {cache:'no-store'});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const map = await res.json();

      state.map.rows = Number(map.rows) || state.map.rows;
      state.map.cols = Number(map.cols) || state.map.cols;
      state.map.tile = Number(map.tileSize || map.tile) || state.map.tile;

      const L0 = map.layers && map.layers[0];
      if (L0 && Array.isArray(L0.grid)) {
        state.map.layers = [ { grid: L0.grid.slice() } ];
      } else {
        // Minimaler Checker/Fallback, falls Map keine Layer enthält
        const g=[];
        for(let r=0;r<state.map.rows;r++){
          for(let c=0;c<state.map.cols;c++){
            g.push((r+c)%2===0?'grass':'dirt');
          }
        }
        state.map.layers = [ { grid: g } ];
      }

      // Atlas (optional) laden
      const atlasJson = map?.atlas?.json;
      const atlasImg  = map?.atlas?.image;
      if (atlasJson && atlasImg){
        const [j, img] = await Promise.all([
          fetch(atlasJson, {cache:'no-store'}).then(r=>r.ok?r.json():null),
          loadImage(atlasImg)
        ]);
        if (j && img){
          state.atlas.frames = j.frames || j;
          state.atlas.image = img;
          state.atlas.ok = true;
          klog('✅(ok)', `Atlas OK → ${atlasJson} / ${atlasImg}`);
        } else {
          klog('⚠️(warn)', 'Atlas fehlend → Fallback-Farben');
        }
      } else {
        klog('⚠️(warn)', 'Atlas nicht angegeben → Fallback-Farben');
      }

      // Kamera auf Kartenmitte
      state.cam.x = (state.map.cols*state.map.tile)/2;
      state.cam.y = (state.map.rows*state.map.tile)/2;

      state.running = true;
      updateOverlay('[map] geladen ✓');
      klog('✅(ok)', `Game gestartet (${url})`);

      // 🔔 GAME-STARTED HOOKS/EVENTS
      try { window.GameUI?.onGameStarted?.(url); } catch {}
      try { window.dispatchEvent(new CustomEvent('cb:game-started', {detail:{map:url}})); } catch {}

    } catch(err){
      klog('❌(err)','Map-Load', String(err?.message||err));
      state.running = true; // wir rendern trotzdem (Fallback)
      updateOverlay('[map] Fehler: '+String(err?.message||err));
    }
  }

  function loadImage(src){
    return new Promise((resolve)=>{
      const im=new Image();
      im.onload=()=>resolve(im);
      im.onerror=()=>resolve(null);
      im.src=src+(src.includes('?')?'&':'?')+'v='+Date.now();
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDERING
  function render(){
    // (1) Identity: komplett löschen in Device-Pixeln
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width, canvas.height);

    // (2) Identity: Hintergrund füllen
    ctx.fillStyle = '#0f1b26';
    ctx.fillRect(0,0, canvas.width, canvas.height);

    // (3) Kamera
    applyCam();

    // (4) Karte
    const tile = state.map.tile, cols=state.map.cols, rows=state.map.rows;

    // Mapfläche (Hintergrund)
    ctx.fillStyle = '#102433';
    ctx.fillRect(0,0, cols*tile, rows*tile);

    const L0 = state.map.layers[0]?.grid;
    if (L0){
      if (state.atlas.ok){
        const F=state.atlas.frames, IMG=state.atlas.image;
        for (let i=0;i<L0.length;i++){
          const r = Math.floor(i/cols), c=i%cols;
          const k = L0[i];
          const fr = F[k] || F[k?.toString?.()] || null;
          if (fr){
            const f = fr.frame || fr; // {x,y,w,h}
            ctx.drawImage(IMG, f.x, f.y, f.w, f.h, c*tile, r*tile, tile, tile);
          } else {
            // Fallback-Farbe pro Key
            ctx.fillStyle =
              k==='grass'?'#2b7d2e':
              k==='dirt' ?'#7a5a2a':
              k==='water'?'#1e4a6a':
              k==='rock' ?'#5b6672':
              k==='snow' ?'#cfd7df':
              k==='sand' ?'#bda36c':
              k==='lava' ?'#6b2b1e':'#3a4a59';
            ctx.fillRect(c*tile, r*tile, tile, tile);
          }
        }
      } else {
        // reine Farb-Fallbacks
        for (let i=0;i<L0.length;i++){
          const r = Math.floor(i/cols), c=i%cols;
          const k = L0[i];
          ctx.fillStyle =
            k==='grass'?'#2b7d2e':
            k==='dirt' ?'#7a5a2a':
            k==='water'?'#1e4a6a':
            k==='rock' ?'#5b6672':
            k==='snow' ?'#cfd7df':
            k==='sand' ?'#bda36c':
            k==='lava' ?'#6b2b1e':'#3a4a59';
          ctx.fillRect(c*tile, r*tile, tile, tile);
        }
      }
    }

    updateOverlay();
  }

  function loop(){ if (state.running) render(); requestAnimationFrame(loop); }

  // ────────────────────────────────────────────────────────────────────────────
  // PUBLIC API / HOOKS
  async function startGame(url){ await loadMap(url); }
  async function reloadGame(url){ await loadMap(url || state.map.url); }

  window.GameLoader = {
    /** Startet das Spiel mit Map-URL */
    start:(u)=>startGame(u),
    /** Lädt aktuelle oder angegebene Map neu */
    reload:(u)=>reloadGame(u),
    /** Versionsabfrage für UI */
    version:()=>VERSION
  };

  window.GameCamera = {
    setZoom:(z)=>zoomTo(z),
    setPosition:(x,y)=>{ state.cam.x=x; state.cam.y=y; }
  };

  // ––– Kompatibilitäts-Events aus älteren UIs (optional) –––
  window.addEventListener('cb:start', (e)=>{ const u=e.detail?.map; if(u) startGame(u); });
  window.addEventListener('ui:reload', (e)=>{ const u=e.detail?.map; if(u) startGame(u); });
  document.addEventListener('app:start',(e)=>{ const u=e.detail?.mapUrl; if(u) startGame(u); });

  // ────────────────────────────────────────────────────────────────────────────
  // BOOT
  resizeCanvas();
  state.cam.z = 1;
  state.cam.x = (state.map.cols*state.map.tile)/2;
  state.cam.y = (state.map.rows*state.map.tile)/2;

  klog('✅(ok)', `Engine bereit (game.js ${VERSION})`);
  // 🔔 ENGINE-READY HOOKS/EVENTS → UI kann Start-Button freischalten
  try { window.GameUI?.onEngineReady?.(VERSION); } catch {}
  try { window.dispatchEvent(new CustomEvent('cb:engine-ready', {detail:{version:VERSION}})); } catch {}

  requestAnimationFrame(loop);
})();
