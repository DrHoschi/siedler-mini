/* Siedler‑Mini V14.7‑hf2 — game.js (mobile/top‑down)
 * -------------------------------------------------------------------------------------------------
 * Module enthält den eigentlichen Spielstart (startGame) + Basis-Laufzeit:
 *  - Sanfte Modul‑Imports (core/asset.js, tools/map-runtime.js), ohne Absturz wenn Pfade fehlen
 *  - DevicePixelRatio‑sicheres Canvas‑Sizing + Resize‑Handler
 *  - Eingaben: Pan (Drag), Zoom (Wheel/Pinch)
 *  - Minimal‑Renderer (Grid + HUD) als Fallback, damit IMMER etwas sichtbar ist
 *  - Optionale Karten‑Ladung (maps/map-pro.json) — sicher mit try/catch (lokal ohne Server ok)
 *  - Sauberer Lifecycle: destroy() räumt Event‑Listener und RAF auf
 *
 * Projekt‑Präferenzen:
 *  (1) Debug‑Tools/Checker DRIN LASSEN
 *  (2) Kommentare ausführlich belassen
 *  (3) Datei‑Name core/asset.js (Singular) — Imports konsistent
 *  (4) Startfenster erscheint standardmäßig zuerst (Index steuert das); Game startet nach Klick
 *  (5) Farbschema wie aktuell (Zeichnung orientiert sich daran)
 *  (6) Standard‑Struktur: Imports → Konstanten → Helpers → Klassen → Hauptlogik → Exports
 */

// =================================================================================================
// Imports (sanft)
// =================================================================================================

async function tryImport(path){
  try { return await import(path); }
  catch (err) { console.error(`Import fehlgeschlagen: ${path}`, err); return null; }
}

// Werden unten asynchron geladen, bevor das Game initialisiert:
let M_ASSET = null;   // ./core/asset.js  (dein Asset‑Manager)
let M_TOOLS = null;   // ./tools/map-runtime.js (Map/Runtime alias + Animationen)

// =================================================================================================
/* Konstanten */
// =================================================================================================

const DPR_MIN = 1;
const GRID_SIZE = 64;         // sichtbares Raster im Fallback‑Renderer
const HUD_PAD = 8;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.5;
const ZOOM_STEP = 0.1;

// =================================================================================================
/* Hilfsfunktionen (kleine Utilities) */
// =================================================================================================

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function setupHiDPICanvas(cv){
  const dpr = Math.max(DPR_MIN, window.devicePixelRatio || 1);
  const w = (innerWidth || document.documentElement.clientWidth);
  const h = (innerHeight || document.documentElement.clientHeight);
  cv.width  = Math.floor(w * dpr);
  cv.height = Math.floor(h * dpr);
  cv.style.width  = w + 'px';
  cv.style.height = h + 'px';
  return dpr;
}

function drawHUD(ctx, lines, dpr){
  const pad = HUD_PAD * dpr;
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.save();
  ctx.globalAlpha = .85;
  ctx.fillStyle = '#0f1b29';
  ctx.fillRect(pad, pad, Math.min(560*dpr, w - 2*pad), 20*dpr*(lines.length+1));
  ctx.restore();
  ctx.save();
  ctx.font = `${Math.max(12*dpr, 14*dpr)}px ui-monospace,monospace`;
  ctx.fillStyle = '#cfe3ff';
  let y = pad + 18*dpr;
  for(const ln of lines){ ctx.fillText(ln, pad + 16*dpr, y); y += 18*dpr; }
  ctx.restore();
}

function drawGrid(ctx, camera, dpr){
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const step = GRID_SIZE * camera.zoom * dpr;
  const offX = (-(camera.x*camera.zoom*dpr)) % step;
  const offY = (-(camera.y*camera.zoom*dpr)) % step;

  ctx.save();
  ctx.lineWidth = Math.max(1, Math.floor(1 * dpr));
  ctx.strokeStyle = '#2b3b53';
  ctx.beginPath();
  for(let x = offX; x < w; x += step){ ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for(let y = offY; y < h; y += step){ ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
  ctx.restore();
}

// Debug‑Convenience: Meldung ins Overlay pushen (falls vorhanden)
function dbgOverlay(msg, extra){
  try{
    const box = document.getElementById('dbgOverlay');
    if(!box) return;
    box.style.display = 'block';
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.innerHTML = `<b>[${time}] game:</b> ${msg}${extra?`<pre>${extra}</pre>`:''}`;
    box.appendChild(line);
  }catch{} // nie crashen
}

// =================================================================================================
/* Klassen */
// =================================================================================================

class InputController{
  constructor(canvas, camera, dprRef){
    this.cv = canvas;
    this.cam = camera;
    this.dprRef = dprRef;
    this.dragging = false;
    this.last = {x:0,y:0};
    this.pinch = null; // {d0, zoom0}

    // Maus
    this.onDown = (ev)=>{ this.dragging = true; this.last = {x:ev.clientX, y:ev.clientY}; ev.preventDefault(); };
    this.onMove = (ev)=>{
      if(!this.dragging) return;
      const dx = (ev.clientX - this.last.x) / (this.cam.zoom);
      const dy = (ev.clientY - this.last.y) / (this.cam.zoom);
      this.cam.x -= dx; this.cam.y -= dy;
      this.last = {x:ev.clientX, y:ev.clientY};
    };
    this.onUp = ()=>{ this.dragging = false; };

    // Wheel‑Zoom
    this.onWheel = (ev)=>{
      const dir = Math.sign(ev.deltaY);
      const z = clamp(this.cam.zoom * (1 - dir*ZOOM_STEP), ZOOM_MIN, ZOOM_MAX);
      this.cam.zoom = z;
      ev.preventDefault();
    };

    // Touch
    this.onTouchStart = (ev)=>{
      if(ev.touches.length === 1){
        const t = ev.touches[0];
        this.dragging = true; this.last = {x:t.clientX, y:t.clientY};
      } else if(ev.touches.length === 2){
        this.dragging = false;
        const dx = ev.touches[0].clientX - ev.touches[1].clientX;
        const dy = ev.touches[0].clientY - ev.touches[1].clientY;
        this.pinch = { d0: Math.hypot(dx,dy), zoom0: this.cam.zoom };
      }
    };
    this.onTouchMove = (ev)=>{
      if(ev.touches.length === 1 && this.dragging){
        const t = ev.touches[0];
        const dx = (t.clientX - this.last.x) / (this.cam.zoom);
        const dy = (t.clientY - this.last.y) / (this.cam.zoom);
        this.cam.x -= dx; this.cam.y -= dy;
        this.last = {x:t.clientX, y:t.clientY};
      } else if(ev.touches.length === 2 && this.pinch){
        const dx = ev.touches[0].clientX - ev.touches[1].clientX;
        const dy = ev.touches[0].clientY - ev.touches[1].clientY;
        const d1 = Math.hypot(dx,dy);
        const z = clamp(this.pinch.zoom0 * (d1/this.pinch.d0), ZOOM_MIN, ZOOM_MAX);
        this.cam.zoom = z;
      }
      ev.preventDefault();
    };
    this.onTouchEnd = ()=>{
      this.dragging = false; this.pinch = null;
    };

    // Registrieren
    canvas.addEventListener('mousedown', this.onDown);
    addEventListener('mousemove', this.onMove);
    addEventListener('mouseup', this.onUp);
    canvas.addEventListener('wheel', this.onWheel, {passive:false});

    canvas.addEventListener('touchstart', this.onTouchStart, {passive:false});
    canvas.addEventListener('touchmove', this.onTouchMove, {passive:false});
    canvas.addEventListener('touchend', this.onTouchEnd, {passive:false});
    canvas.addEventListener('touchcancel', this.onTouchEnd, {passive:false});
  }

  destroy(){
    // Maus
    this.cv.removeEventListener('mousedown', this.onDown);
    removeEventListener('mousemove', this.onMove);
    removeEventListener('mouseup', this.onUp);
    this.cv.removeEventListener('wheel', this.onWheel);
    // Touch
    this.cv.removeEventListener('touchstart', this.onTouchStart);
    this.cv.removeEventListener('touchmove', this.onTouchMove);
    this.cv.removeEventListener('touchend', this.onTouchEnd);
    this.cv.removeEventListener('touchcancel', this.onTouchEnd);
  }
}

class Game{
  constructor({ canvas, ctx }){
    this.cv = canvas;
    this.ctx = ctx;
    this.dpr = 1;
    this.camera = { x:0, y:0, zoom:1 };
    this.raf = 0;
    this.running = false;
    this.input = null;
    this.state = {
      frames: 0, t0: performance.now(), last: performance.now(),
      map: null,       // optionale Map‑Struktur (wenn map-runtime.js verfügbar)
      assets: null,    // optional: Asset‑Manager Instanz
    };

    this.onResize = ()=>{ this.dpr = setupHiDPICanvas(this.cv); };
  }

  async init(){
    // DPI / Größe einstellen
    this.onResize();
    addEventListener('resize', this.onResize, {passive:true});

    // Eingaben
    this.input = new InputController(this.cv, this.camera, ()=>this.dpr);

    // Optionale Module initialisieren
    if(M_ASSET && M_ASSET.AssetManager){
      try{
        this.state.assets = new M_ASSET.AssetManager({ base: './assets/' });
        await this.state.assets.warmup?.(); // optional
      }catch(e){
        console.error('AssetManager init fehlgeschlagen', e);
        dbgOverlay('AssetManager init fehlgeschlagen', e?.stack || String(e));
      }
    }

    // Optionale Map laden (sicher)
    await this.tryLoadMap();
  }

  async tryLoadMap(){
    // Nutze map-runtime.js, falls vorhanden, ansonsten überspringen
    if(!M_TOOLS || !M_TOOLS.SiedlerMap){
      console.warn('tools/map-runtime.js nicht vorhanden oder SiedlerMap fehlt — überspringe Kartenladung.');
      return;
    }
    try{
      const json = await (await fetch('./maps/map-pro.json')).json();
      const world = new M_TOOLS.SiedlerMap({
        tileResolver: (name)=> './assets/' + name,
      });
      await world.loadFromObject(json);
      this.state.map = world;
      dbgOverlay('Karte geladen: maps/map-pro.json');
    }catch(e){
      console.warn('Karte konnte nicht geladen werden (ok im lokalen Dateimodus).', e);
      dbgOverlay('Karte konnte nicht geladen werden (meist lokal/CORS).', e?.stack || String(e));
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
    // Später: Produktion, Carrier, Autotiles, etc.
    if(this.state.map && this.state.map.update){
      try{ this.state.map.update(dt); }catch(e){ console.error('Map update fail', e); }
    }
  }

  render(dt){
    const { ctx, cv, camera, dpr } = this;
    ctx.clearRect(0,0,cv.width,cv.height);

    // Welt zeichnen (falls Map vorhanden)
    if(this.state.map && this.state.map.draw){
      ctx.save();
      // Map erwartet Welt‑Koords → ggf. intern transformieren
      this.state.map.draw(ctx, { x:camera.x, y:camera.y, w:cv.width/dpr, h:cv.height/dpr, zoom:camera.zoom });
      ctx.restore();
    } else {
      // Fallback‑Grid
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

// =================================================================================================
/* Hauptlogik‑Funktionen (öffentliche Startfunktion) */
// =================================================================================================

/**
 * Startet das Spiel. Wird von index.html nach Klick auf „Start“ aufgerufen.
 * @param {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }} param0
 */
export async function startGame({ canvas, ctx }){
  if(!canvas || !ctx) throw new Error('startGame: Canvas/Context fehlen');

  // Sanft: optionale Module laden
  M_ASSET = await tryImport('./core/asset.js');         // bleibt „core/asset.js“ (Projektvorgabe)
  M_TOOLS = await tryImport('./tools/map-runtime.js');  // optional

  const game = new Game({ canvas, ctx });
  await game.init();
  game.start();

  // Optional: Für Debugging im Overlay / Konsole erreichbar machen
  // @ts-ignore
  window.__SIEDLER_GAME__ = game;
  dbgOverlay('Game gestartet.');
  return game; // ermöglicht externes Stoppen: (await startGame(...)).destroy();
}

// =================================================================================================
/* Exports (zusätzlich hilfreiche Hooks) */
// =================================================================================================

// Du kannst diese Hooks in anderen Dateien nutzen (z. B. boot.js), falls gewünscht:
export function prewarmAssets(){ /* optional: reserviert für frühen Asset‑Warmup */ }
export function stopGame(){ try{ window.__SIEDLER_GAME__?.destroy?.(); }catch{} }

// EOF
