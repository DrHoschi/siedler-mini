// Welt-Daten & einfache Generierung
export const TILE_W = 96;
export const TILE_H = 54;
export const MAP = { W:48, H:36 };

export const grid = Array.from({length:MAP.H},()=>Array.from({length:MAP.W},()=>({
  ground:'grass'
})));

export function initWorld(){
  // Wasserteich
  for(let y=20;y<30;y++) for(let x=4;x<16;x++) grid[y][x].ground='water';
  // Shore an Randzellen
  for(let y=1;y<MAP.H-1;y++) for(let x=1;x<MAP.W-1;x++){
    if(grid[y][x].ground==='water') continue;
    const near = [
      [1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]
    ].some(([dx,dy])=> grid[y+dy]?.[x+dx]?.ground==='water');
    if(near) grid[y][x].ground='shore';
  }
}
