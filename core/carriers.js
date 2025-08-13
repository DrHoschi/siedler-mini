import { worldToScreen } from './camera.js';
import { IM } from './assets.js';

export const carriers = [];

export function startCarriers(){
  carriers.length = 0; // leer; werden später vom Spiel erzeugt
}

export function createCarrier(pos){
  carriers.push({
    x:pos.x, y:pos.y, t:0, speed:1.2, path:[] // path optional
  });
}

export function tickCarriers(dt){
  for(const c of carriers){
    // simple idle wobble
    c.t += dt;
  }
}

export function drawCarriers(ctx){
  for(const c of carriers){
    const [sx,sy] = worldToScreen(c.x,c.y);
    const img = IM.carrier;
    if(img) ctx.drawImage(img, sx-24, sy-40, 48, 48);
    else {
      ctx.fillStyle='#ffd166'; ctx.beginPath(); ctx.arc(sx,sy-10,6,0,Math.PI*2); ctx.fill();
    }
  }
}
