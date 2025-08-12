// core/render.js – zeichnet sichtbare Tiles, Zoom/Pan per Kamera
import { cam } from './camera.js';
import { drawWorld } from './world.js';

let canvas=null, ctx=null;
export function setMainCanvas(cnv){
  canvas=cnv; ctx=canvas.getContext('2d',{alpha:false});
  ctx.imageSmoothingEnabled = true;
}

let needsDraw=true;
export function requestDraw(){
  needsDraw=true;
  if(!requestDraw._raf){
    requestDraw._raf = requestAnimationFrame(()=>{
      requestDraw._raf=null;
      if(needsDraw){ needsDraw=false; drawAll(); }
    });
  }
}
export function prerenderGround(){ /* no-op */ }

export function drawAll(){
  if(!canvas||!ctx) return;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const z=cam.z||1;
  ctx.save(); ctx.scale(z,z);
  ctx.fillStyle='#20361b'; ctx.fillRect(0,0,canvas.width/z,canvas.height/z);

  // Sichtfenster in „Logik“-Pixeln (vor dem Zoom)
  drawWorld(ctx, { x:cam.x, y:cam.y, width:canvas.width/z, height:canvas.height/z });

  ctx.restore();
}
