// Siedler‑Mini V15 textures.js
// Lädt alle benötigten Texturen aus assets/tex/… (64×64)

export const TILE = 64; // passt zu deinen 64×64 PNGs

// sichere Loaderoutine mit Platzhalter, falls eine Datei fehlt
function loadImage(src){
  return new Promise(res=>{
    const img = new Image();
    img.onload = ()=> res(img);
    img.onerror = ()=>{
      // Fallback: karierter Platzhalter
      const c = document.createElement('canvas');
      c.width = c.height = TILE;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#303e55'; ctx.fillRect(0,0,TILE,TILE);
      ctx.fillStyle = '#42597a';
      for(let y=0;y<TILE;y+=8) for(let x= (y/8)%2?0:8; x<TILE; x+=16) ctx.fillRect(x,y,8,8);
      const ph = new Image(); ph.onload = ()=>res(ph); ph.src = c.toDataURL();
    };
    img.src = src;
  });
}

export const Tex = {
  // Boden
  grass: null,
  dirt: null,
  forest: null,
  water: null,
  // Straßen
  road_straight: null,
  road_corner: null,
  road_t: null,
  road_cross: null,
  // Gebäude
  hq: null,
  depot: null,
  woodcutter: null,
};

export async function loadAllTextures(onDebug){
  const base = 'assets/tex';
  const paths = {
    grass: `${base}/topdown_grass.png`,
    dirt: `${base}/topdown_dirt.png`,
    forest: `${base}/topdown_forest.png`,
    water: `${base}/topdown_water.png`,
    road_straight: `${base}/topdown_road_straight.png`,
    road_corner:   `${base}/topdown_road_corner.png`,
    road_t:        `${base}/topdown_road_t.png`,
    road_cross:    `${base}/topdown_road_cross.png`,
    hq:            `${base}/topdown_hq.png`,
    depot:         `${base}/topdown_depot.png`,
    woodcutter:    `${base}/topdown_woodcutter.png`,
  };

  for (const [k,src] of Object.entries(paths)){
    Tex[k] = await loadImage(src);
    onDebug?.(`Texture OK: ${src}`);
  }
}
