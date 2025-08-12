// Kamera & Canvas für Mobile
export const cam = { x:0, y:0, z:1.2 };     // Weltkoordinaten (iso-Projektion), Zoom
export const ZMIN=0.6, ZMAX=2.6;

export function resizeCanvas(canvas){
  canvas.width  = window.innerWidth  * (window.devicePixelRatio||1);
  canvas.height = window.innerHeight * (window.devicePixelRatio||1);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1,0,0,1,0,0);   // neutral
  ctx.imageSmoothingEnabled = true;
}
