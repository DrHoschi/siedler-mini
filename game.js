/* ================================================================================================
   Siedler‑Mini V14.7‑hf5 — game.js
   Zweck:
     • Startfunktion startGame({canvas,ctx})
     • Stabiler Render‑Loop (Pan/Zoom, HiDPI, HUD, Grid‑Fallback)
     • Sanfte Imports (core/asset.js, tools/map-runtime.js)
     • Karten‑Ladung über ROBUSTE URLS (in dieser Reihenfolge):
         1) ./assets/maps/map-pro.json  ← dein aktueller Speicherort
         2) ./maps/map-pro.json         ← Fallback (falls später wieder verschoben)
   Struktur: Imports → Konstanten → Helpers → Klassen → Hauptlogik → Exports
   Hinweise:
     • Kommentare bleiben immer erhalten; wir aktualisieren sie nur.
   ================================================================================================ */

/// —————————————————————————————————————————————————————————————————————————————
/// Dynamic Imports (sanft: keine harten Crashs; Fehler landen im Overlay)
/// —————————————————————————————————————————————————————————————————————————————
async function tryImport(path){
  try{ return await import(path); }
  catch(e){
    console.error(`Import fehlgeschlagen: ${path}`, e);
    dbgOverlay(`Import fehlgeschlagen: ${path}`, e?.stack || String(e));
    return null;
  }
}

// Optionale Module (werden in startGame() geladen)
let M_ASSET = null;   // ./core/asset.js
let M_TOOLS = null;   // ./tools/map-runtime.js

/// —————————————————————————————————————————————————————————————————————————————
/// Konstanten
/// —————————————————————————————————————————————————————————————————————————————
const DPR_MIN   = 1;
const GRID_SIZE = 64;
const HUD_PAD   = 8;
const ZOOM_MIN  = 0.5, ZOOM_MAX = 3.5, ZOOM_STEP = 0.1;

/// —————————————————————————————————————————————————————————————————————————————
/// Hilfsfunktionen (Canvas/Zeichnen/Overlay)
/// —————————————————————————————————————————————————————————————————————————————
function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }

function setupHiDPICanvas(cv){
  const dpr = Math.max(DPR_MIN, window.devicePixelRatio || 1);
  const w = (innerWidth || document.documentElement.clientWidth);
  const h = (innerHeight|| document.documentElement.clientHeight);
  cv.width  = Math.floor(w * dpr);
  cv.height = Math.floor(h * dpr);
  cv.style.width  = w + 'px';
  cv.style.height = h + 'px';
  return dpr;
}

function drawHUD(ctx, lines, dpr){
  const pad = HUD_PAD * dpr, w = ctx.canvas.width;
  ctx.save(); ctx.globalAlpha = .85; ctx.fillStyle = '#0f1b29';
  ctx.fillRect(pad, pad, Math.min(560*dpr, w-2*pad), 20*dpr*(lines.length+1)); ctx.restore();
  ctx.save(); ctx.font = `${Math.max(12*dpr,14*dpr)}px ui-monospace,monospace`; ctx.fillStyle = '#cfe3ff';
  let y = pad + 18*dpr; for(const ln of lines){ ctx.fillText(ln, pad+16*dpr, y); y += 18*dpr; } ctx.restore();
}

function drawGrid(ctx, cam, dpr){
  const w=ctx.canvas.width, h=ctx.canvas.height, step=GRID_SIZE*cam.zoom*dpr;
  const offX = (-(cam.x*cam.zoom*dpr))%step, offY = (-(cam.y*cam.zoom*dpr))%step;
  ctx.save(); ctx.lineWidth = Math.max(1, Math.floor(1*dpr)); ctx.strokeStyle = '#2b3b53'; ctx.beginPath();
  for(let x=offX; x<w; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,h); }
  for(let y=offY; y<h; y+=step){ ctx.moveTo(0,y); ctx.lineTo(w,y); }
  ctx.stroke(); ctx.restore();
}

/** Schreibt eine Zeile ins Debug‑Overlay (nie werfen). */
function dbgOverlay(msg, extra){
  try{
    const box=document.getElementById('dbgOverlay'); if(!box) return;
    box.style.display='block';
    (document.getElementById('dbgPanel')||box)
      .insertAdjacentHTML('beforeend', `<div><b>[${new Date().toLocaleTimeString()}] game:</b> ${msg}${extra?`<pre>${extra}</pre>`:''}</div>`);
  }catch{}
}

/// —————————————————————————————————————————————————————————————————————————————
/// Eingaben (Pan/Zoom)
/// —————————————————————————————————————————————————————————————————————————————
class InputController{
  constructor(canvas, camera){
    this.cv=canvas; this.cam=camera; this.dragging=false; this.last={x:0,y:0}; this.pinch=null;

    // Maus
    this.onDown=(ev)=>{ this.dragging=true; this.last={x:ev.clientX,y:ev.clientY}; ev.preventDefault(); };
    this.onMove=(ev)=>{ if(!this.dragging) return;
      const dx=(ev.clientX-this.last.x)/this.cam.zoom, dy=(ev.clientY-this.last.y)/this.cam.zoom;
      this.cam.x-=dx; this.cam.y-=dy; this.last={x:ev.clientX,y:ev.clientY}; };
    this.onUp =()=>{ this.dragging=false; };

    // Wheel‑Zoom
    this.onWheel=(ev)=>{ const dir=Math.sign(ev.deltaY);
      this.cam.zoom=clamp(this.cam.zoom*(1 - dir*ZOOM_STEP), ZOOM_MIN, ZOOM_MAX); ev.preventDefault(); };

    // Touch
    this.onTouchStart=(ev)=>{ if(ev.touches.length===1){ const t=ev.touches[0];
        this.dragging=true; this.last={x:t.clientX,y:t.clientY}; }
      else if(ev.touches.length===2){ const dx=ev.touches[0].clientX-ev.touches[1].clientX;
        const dy=ev.touches[0].clientY-ev.touches[1].clientY; this.pinch={ d0:Math.hypot(dx,dy), zoom0:this.cam.zoom }; } };
    this.onTouchMove=(ev)=>{ if(ev.touches.length===1 && this.dragging){ const t=ev.touches[0];
        const dx=(t.clientX-this.last.x)/this.cam.zoom, dy=(t.clientY-this.last.y)/this.cam.zoom;
        this.cam.x-=dx; this.cam.y-=dy; this.last={x:t.clientX,y:t.clientY}; }
      else if(ev.touches.length===2 && this.pinch){ const dx=ev.touches[0].clientX-ev.touches[1].clientX;
        const dy=ev.touches[0].clientY-ev.touches[1].clientY; const d1=Math.hypot(dx,dy);
        this.cam.zoom=clamp(this.pinch.zoom0*(d1/this.pinch.d0), ZOOM_MIN, ZOOM_MAX); }
      ev.preventDefault(); };

    this.onTouchEnd=()=>{ this.dragging=false; this.pinch=null; };

    // Registrierung
    canvas.addEventListener('mousedown',this.onDown);
    addEventListener('mousemove',this.onMove);
    addEventListener('mouseup',this.onUp);
    canvas.addEventListener('wheel',this.onWheel,{passive:false});
    canvas.addEventListener('touchstart',this.onTouchStart,{passive:false});
    canvas.addEventListener('touchmove',this.onTouchMove,{passive:false});
    canvas.addEventListener('touchend',this.onTouchEnd,{passive:false});
    canvas.addEventListener('touchcancel',this.onTouchEnd,{passive:false});
  }

  destroy(){
    this.cv.removeEventListener('mousedown',this.onDown);
    removeEventListener('mousemove',this.onMove);
    removeEventListener('mouseup',this.onUp);
    this.cv.removeEventListener('wheel',this.onWheel);
    this.cv.removeEventListener('touchstart',this.onTouchStart);
    this.cv.removeEventListener('touchmove',this.onTouchMove);
    this.cv.removeEventListener('touchend',this.onTouchEnd);
    this.cv.removeEventListener('touchcancel',this.onTouchEnd);
  }
}

/// —————————————————————————————————————————————————————————————————————————————
/// Game‑Klasse
/// —————————————————————————————————————————————————————————————————————————————
class Game{
  constructor({ canvas, ctx }){
    this.cv=canvas; this.ctx=ctx; this.dpr=1;
    this.camera={ x:0, y:0, zoom:1 };
    this.raf=0; this.running=false; this.input=null;
    this.state={ frames:0, t0:performance.now(), last:performance.now(), map:null, assets:null };
    this.onResize=()=>{ this.dpr=setupHiDPICanvas(this.cv); };
  }

  async init(){
    // Größe/DPI
    this.onResize(); addEventListener('resize', this.onResize, {passive:true});

    // Eingaben
    this.input=new InputController(this.cv, this.camera);

    // optional: Asset‑Manager warmup
    if(M_ASSET && M_ASSET.AssetManager){
      try{
        this.state.assets = new M_ASSET.AssetManager({ base: './assets/' });
        await this.state.assets.warmup?.();
      }catch(e){
        console.error('AssetManager init fehlgeschlagen', e);
        dbgOverlay('AssetManager init fehlgeschlagen', e?.stack || String(e));
      }
    }

    // Karte laden (korrekter Pfad + Fallback)
    await this.tryLoadMap();
  }

  /**
   * Map-Loader:
   *  1) Versucht zuerst ./assets/maps/map-pro.json (dein aktueller Speicherort)
   *  2) Fällt zurück auf ./maps/map-pro.json (falls du später wieder verschiebst)
   *  3) Loggt JEDE angefragte URL + Status ins Debug-Overlay
   */
  async tryLoadMap(){
    if(!M_TOOLS || !M_TOOLS.SiedlerMap){
      console.warn('tools/map-runtime.js fehlt — überspringe Kartenladung.');
      dbgOverlay('Map‑Lader übersprungen: tools/map-runtime.js fehlt.');
      return;
    }

    const candidates = [
      new URL('./assets/maps/map-pro.json', document.baseURI).href, // ✅ aktueller Ort
      new URL('./maps/map-pro.json',         document.baseURI).href  // ↩︎ Fallback
    ];

    let loaded = false;
    for(const url of candidates){
      try{
        dbgOverlay(`Lade Karte: ${url}`);
        const res = await fetch(url);
        dbgOverlay(`[net] ${res.status} ${url}`);
        if(!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);

        const json  = await res.json();
        const world = new M_TOOLS.SiedlerMap({ tileResolver: (n)=> './assets/' + n });
        await world.loadFromObject(json);
        this.state.map = world;

        dbgOverlay(`Karte geladen: ${url}`);
        loaded = true;
        break; // Erfolg, weitere Kandidaten nicht nötig
      }catch(e){
        console.warn('Kartenversuch fehlgeschlagen', url, e);
        dbgOverlay(`Karte konnte nicht geladen werden: ${url}`, e?.stack || String(e));
        // weiterer Kandidat wird probiert
      }
    }

    if(!loaded){
      dbgOverlay('Keine Karte geladen – es wird das Grid‑Fallback gerendert.');
    }
  }

  start(){
    if(this.running) return;
    this.running = true;
    this.state.t0 = performance.now();
    this.state.last = this.state.t0;

    const loop = (now)=>{
      if(!this.running) return;
      const dt = now - this.state.last; this.state.last = now;
      this.update(dt);
      this.render(dt);
      this.state.frames++;
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  update(dt){
    // (später) Spiel‑Logik / Entities
    if(this.state.map && this.state.map.update){
      try{ this.state.map.update(dt); }catch(e){ console.error('Map update fail', e); }
    }
  }

  render(dt){
    const { ctx, cv, camera, dpr } = this;
    ctx.clearRect(0,0,cv.width,cv.height);

    // Karte zeichnen oder Grid‑Fallback
    if(this.state.map && this.state.map.draw){
      ctx.save();
      this.state.map.draw(ctx, { x:camera.x, y:camera.y, w:cv.width/dpr, h:cv.height/dpr, zoom:camera.zoom }, performance.now()-this.state.t0);
      ctx.restore();
    } else {
      drawGrid(ctx, camera, dpr);
    }

    // HUD
    drawHUD(ctx, [
      `Frames: ${this.state.frames}  dt=${dt.toFixed(2)}ms`,
      `Cam: x=${camera.x.toFixed(1)}  y=${camera.y.toFixed(1)}  zoom=${camera.zoom.toFixed(2)}`,
      `${this.state.map ? 'Map: aktiv' : 'Map: (keine)'}  /  Assets: ${this.state.assets ? 'aktiv' : '(keine)'}`,
      `DPR=${dpr.toFixed(2)}  Size=${cv.width}x${cv.height}`
    ], dpr);
  }

  destroy(){
    this.running = false;
    if(this.raf) cancelAnimationFrame(this.raf);
    removeEventListener('resize', this.onResize);
    this.input?.destroy?.();
  }
}

/// —————————————————————————————————————————————————————————————————————————————
/// Öffentlicher Start‑Entry
/// —————————————————————————————————————————————————————————————————————————————
export async function startGame({ canvas, ctx }){
  if(!canvas || !ctx) throw new Error('startGame: Canvas/Context fehlen');

  // Sanft importieren (kein Crash bei 404/SyntaxError; Overlay loggt)
  M_ASSET = await tryImport('./core/asset.js');
  M_TOOLS = await tryImport('./tools/map-runtime.js');

  const game = new Game({ canvas, ctx });
  await game.init();
  game.start();

  // Debug‑Zugriff im Fenster
  // @ts-ignore
  window.__SIEDLER_GAME__ = game;
  dbgOverlay('Game gestartet.');
  return game;
}

// Zusätzliche Hooks (optional; beibehalten für spätere Schritte)
export function prewarmAssets(){ /* reserviert */ }
export function stopGame(){ try{ window.__SIEDLER_GAME__?.destroy?.(); }catch{} }
