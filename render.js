import { drawWorld } from './world.js';
import { camera, setCanvas } from './core/camera.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d',{alpha:false});
setCanvas(canvas);

let running = true;
let last = performance.now();

function loop(now){
  const dt = Math.min(0.05, (now-last)/1000);
  last = now;

  // Hintergrund
  ctx.fillStyle = '#0b1117';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  drawWorld(ctx, false);

  if(running) requestAnimationFrame(loop);
}

function resize(){
  const dpr = Math.max(1, window.devicePixelRatio||1);
  canvas.width  = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight* dpr);
  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(dpr,dpr);
}
window.addEventListener('resize', resize);
resize();
requestAnimationFrame(loop);
