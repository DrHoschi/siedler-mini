// V14.1 – einfache Weltstruktur + Bauen
export function makeWorld(W=80,H=60){
  const terrain = Array.from({length:H},()=>Array(W).fill('grass'));
  // Demo‑See
  for(let y=15;y<27;y++) for(let x=20;x<36;x++) terrain[y][x]= (x===20||x===35||y===15||y===26)?'shore':'water';
  const roads = Array.from({length:H},()=>Array(W).fill(0));
  const buildings = Array.from({length:H},()=>Array(W).fill(null));
  return { w:W, h:H, terrain, roads, buildings };
}

export function inBounds(world, tx,ty){
  return tx>=0 && ty>=0 && tx<world.w && ty<world.h;
}

export function placeRoad(world, tx,ty){
  if (!inBounds(world,tx,ty)) return false;
  world.roads[ty][tx]=1; return true;
}

export function placeBuilding(world, tx,ty, kind){
  if (!inBounds(world,tx,ty)) return false;
  world.buildings[ty][tx] = {kind};
  return true;
}
