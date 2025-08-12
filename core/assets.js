// Texturen – fehlende Dateien sind ok (Fallback-Farben)
export const IM = {
  grass:null, water:null, shore:null,
  road_straight:null, road_curve:null,
  hq:null, lumber:null, depot:null
};
const LIST = [
  ['grass','assets/grass.png'],
  ['water','assets/water.png'],
  ['shore','assets/shore.png'],
  ['road_straight','assets/road_straight.png'],
  ['road_curve','assets/road_curve.png'],
  ['hq','assets/hq_wood.png'],
  ['lumber','assets/lumberjack.png'],
  ['depot','assets/depot.png']
];

export function loadAllAssets(){
  return Promise.all(LIST.map(([k,src])=> loadOne(k,src)));
}
function loadOne(key, src){
  return new Promise(res=>{
    const img=new Image();
    img.onload=()=>{ IM[key]=img; res(); };
    img.onerror=()=>{ console.warn(`[assets] fehlend: ${src}`); IM[key]=null; res(); };
    img.src=src;
  });
}
