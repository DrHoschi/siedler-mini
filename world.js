export const T = { GRASS:0, WATER:1, SHORE:2, DIRT:3, ROCK:4, SAND:5 };
export const B = { EMPTY:0, ROAD:1, HQ:2, LUMBER:3, DEPOT:4 };

export const RES = { wood:0, stone:0, food:0, gold:0 };

export function makeWorld(W,H){
  const world = {
    W,H, tile:new Uint8Array(W*H),
    build:new Uint8Array(W*H),
    res:{...RES},
    carriers:[],
    camStartSet:false, // renderer setzt Kamera beim ersten Render
  };
  // einfache Map: Wiese, in der Mitte ein See
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      world.tile[y*W+x] = T.GRASS;
    }
  }
  const cx=W>>1, cy=H>>1;
  for(let y=-10;y<=10;y++)for(let x=-18;x<=18;x++){
    const tx=cx+x, ty=cy+y;
    if(!inb(world,tx,ty)) continue;
    world.tile[ty*W+tx] = (Math.abs(y)===10||Math.abs(x)===18)?T.SHORE:T.WATER;
  }
  // HQ (Stein) in die Mitte
  world.build[cy*W+cx]=B.HQ;
  return world;
}

export function tileAt(world,x,y){ return inb(world,x,y)? world.tile[y*world.W+x] : T.GRASS; }
export function buildAt(world,x,y){ return inb(world,x,y)? world.build[y*world.W+x] : B.EMPTY; }
function inb(world,x,y){ return x>=0&&y>=0&&x<world.W&&y<world.H; }

export function tryBuild(world, tool, x,y){
  if(!inb(world,x,y)) return false;
  if(tool==='bulldoze'){ world.build[y*world.W+x]=B.EMPTY; return true; }
  if(tool==='road'){ world.build[y*world.W+x]=B.ROAD; return true; }
  if(tool==='lumber'){ world.build[y*world.W+x]=B.LUMBER; return true; }
  if(tool==='depot'){ world.build[y*world.W+x]=B.DEPOT; return true; }
  if(tool==='hq'){ world.build[y*world.W+x]=B.HQ; return true; }
  return false;
}

export function tickWorld(world, dt){
  // (Hier später: Produktion & Träger)
  // vorerst nichts – Renderer zeigt aber alles korrekt
}
