// core/assets.js — lädt PNGs, fehlt etwas => Fallback-Farben

export const IM = {
  grass:null, water:null, shore:null, dirt:null,
  road:null, road_straight:null, road_curve:null,
  hq:null, hq_wood:null, hq_stone:null,
  lumber:null, depot:null, carrier:null
};

const LIST = [
  ['grass','assets/grass.png'],
  ['water','assets/water.png'],
  ['shore','assets/shore.png'],
  ['dirt','assets/dirt.png'],
  ['road','assets/road.png'],
  ['road_straight','assets/road_straight.png'],
  ['road_curve','assets/road_curve.png'],
  ['hq','assets/hq_wood.png'],         // Fallback
  ['hq_wood','assets/hq_wood.png'],
  ['hq_stone','assets/hq_stone.png'],
  ['lumber','assets/lumberjack.png'],
  ['depot','assets/depot.png'],
  ['carrier','assets/carrier.png']
];

export function loadAllAssets(){
  return Promise.all(LIST.map(([k,src])=> loadOne(k,src)));
}
function loadOne(k, src){
  return new Promise(res=>{
    const img=new Image();
    img.onload=()=>{ IM[k]=img; res(); };
    img.onerror=()=>{ console.warn(`[assets] fehlt: ${src}`); IM[k]=null; res(); };
    img.src=src;
  });
}
