// core/render.js — kompakter Safe‑Renderer für V13
// Rendert ohne Offscreen-Canvas nur die sichtbaren Tiles.
// Kompatibel zu deinem main.js (exportiert auch requestDraw / prerenderGround).

import { cam } from './camera.js';
import { drawWorld } from './world.js';

let canvas = null, ctx = null;

/** Muss in main.js einmalig mit dem <canvas> aufgerufen werden */
export function setMainCanvas(cnv){
  canvas = cnv;
  ctx = canvas.getContext('2d', { alpha:false });
  ctx.imageSmoothingEnabled = true;
}

/* ---------------- Invalidation / Zeichenzyklus ---------------- */

let needsDraw = true;
export function requestDraw(){
  needsDraw = true;
  // nur 1x pro Frame zeichnen
  if (!requestDraw._raf) {
    requestDraw._raf = requestAnimationFrame(()=>{
      requestDraw._raf = null;
      if (needsDraw) { needsDraw = false; drawAll(); }
    });
  }
}

/** Dummy – bleibt für Kompatibilität vorhanden (wir brauchen ihn nicht mehr) */
export function prerenderGround(){ /* no-op: wir zeichnen direkt sichtbar */ }

/* ---------------- Haupt-Zeichnen ---------------- */

export function drawAll(){
  if(!canvas || !ctx) return;

  // Voll resetten
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0, canvas.width, canvas.height);

  // Zoom anwenden
  const z = cam.z || 1;
  ctx.save();
  ctx.scale(z, z);

  // Hintergrund – falls mal keine Tiles im View sind
  ctx.fillStyle = '#20361b';
  ctx.fillRect(0, 0, canvas.width / z, canvas.height / z);

  // Sichtfenster (Logik-Pixel) an world.drawWorld übergeben
  const cameraForWorld = {
    x: cam.x,
    y: cam.y,
    width:  canvas.width  / z,
    height: canvas.height / z
  };

  // Welt zeichnet Boden, Straßen, Gebäude (alles sichtbar)
  drawWorld(ctx, cameraForWorld);

  ctx.restore();
}
