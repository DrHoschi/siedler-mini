export const cam = { x:0, y:0, z:1.15 };

export function resizeCanvas(canvas){
  const dpr = Math.max(1, Math.min(devicePixelRatio||1, 2));
  const rect = canvas.getBoundingClientRect();
  canvas.width  = Math.max(1, rect.width  * dpr);
  canvas.height = Math.max(1, rect.height * dpr);
  const ctx = canvas.getContext('2d',{alpha:false});
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
