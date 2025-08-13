// render.js  v14.2 – einfacher isometrischer Renderer
import { IM } from './core/assets.js?v=14.2';
import { TILE_SIZE } from './world.js?v=14.2';

export function createRenderer(){
  const R = {
    w: 0, h: 0, dpr: 1,
    debug: false,
    setViewport(w,h,dpr){ this.w=w; this.h=h; this.dpr=dpr||1; },
  };

  R.render = (ctx, world, state, camera, carriers) => {
    // Clear
    ctx.fillStyle = '#0f1823';
    ctx.fillRect(0,0,R.w,R.h);

    ctx.save();
    // Kamera-Transform
    ctx.translate(R.w/2, R.h/2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Karte leicht versetzen: world.originX/Y wird von hier gesetzt
    if(!world._originSet){
      world.originX = - (world.size * (TILE_SIZE.W/2)) / 2;
      world.originY = - (TILE_SIZE.H/2);
      world._originSet = true;
    }
    ctx.translate(world.originX, world.originY);

    // Tiles zeichnen (einfach komplett; Mobile‑größe klein)
    for(let y=0;y<world.size;y++){
      for(let x=0;x<world.size;x++){
        const px = (x - y) * (TILE_SIZE.W/2);
        const py = (x + y) * (TILE_SIZE.H/2);
        const img = IM.grass || null;
        if (img) ctx.drawImage(img, px - TILE_SIZE.W/2, py - TILE_SIZE.H/2, TILE_SIZE.W, TILE_SIZE.H);
        else { ctx.fillStyle = '#234a2d'; ctx.fillRect(px-32,py-16,64,32); }
        // Straße oben drauf
        if(world.hasRoad(x,y)){
          const rimg = IM.road || IM.road_straight || null;
          if (rimg) ctx.drawImage(rimg, px - TILE_SIZE.W/2, py - TILE_SIZE.H/2, TILE_SIZE.W, TILE_SIZE.H);
          else { ctx.fillStyle='#c9b08a'; ctx.fillRect(px-20,py-8,40,16); }
        }
      }
    }

    // Gebäude
    for(const b of world.buildings){
      const px = b.pixelX, py = b.pixelY;
      let img = null;
      if (b.type==='hq' || b.type==='hq_stone') img = IM.hq_stone || IM.hq || null;
      else if (b.type==='hq_wood') img = IM.hq_wood || null;
      else if (b.type==='lumber' || b.type==='lumberjack') img = IM.lumberjack || null;
      else if (b.type==='depot') img = IM.depot || null;

      if (img) {
        // Gebäude sind größer als Tile – mittig aufs Tile setzen
        const w = img.width, h = img.height;
        ctx.drawImage(img, px - w/2, py - h + (TILE_SIZE.H/2));
      } else {
        ctx.fillStyle='#6aa36a';
        ctx.fillRect(px-24, py-24, 48, 48);
      }
    }

    // Träger (optional)
    carriers?.render?.(ctx);

    // Debug‑Grid
    if (R.debug){
      ctx.strokeStyle='rgba(255,255,255,.08)';
      for(let y=0;y<world.size;y++){
        for(let x=0;x<world.size;x++){
          const px = (x - y) * (TILE_SIZE.W/2);
          const py = (x + y) * (TILE_SIZE.H/2);
          ctx.strokeRect(px - TILE_SIZE.W/2, py - TILE_SIZE.H/2, TILE_SIZE.W, TILE_SIZE.H);
        }
      }
    }

    ctx.restore();
  };

  return R;
}
