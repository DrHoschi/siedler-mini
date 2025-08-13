// core/assets.js  v14.2 – einfacher Loader mit Platzhaltern
export const IM = {
  grass:null, water:null, shore:null, dirt:null, sand:null, rocky:null,
  road:null, road_straight:null, road_curve:null,
  hq:null, hq_stone:null, hq_wood:null,
  lumberjack:null, depot:null,
  carrier:null
};

const LIST = [
  ['grass','assets/grass.png'],
  ['water','assets/water.png'],
  ['shore','assets/shore.png'],
  ['dirt','assets/dirt.png'],
  ['sand','assets/sand.png'],
  ['rocky','assets/rocky.png'],
  ['road','assets/road.png'],
  ['road_straight','assets/road_straight.png'],
  ['road_curve','assets/road_curve.png'],
  ['hq','assets/hq_wood.png'],
  ['hq_stone','assets/hq_stone.png'],
  ['hq_wood','assets/hq_wood.png'],
  ['lumberjack','assets/lumberjack.png'],
  ['depot','assets/depot.png'],
  ['carrier','assets/carrier.png'],
];

export function loadAllAssets(){
  return Promise.all(LIST.map(([k,src]) => loadOne(k,src)));
}

function loadOne(key, src){
  return new Promise(res=>{
    const img = new Image();
    img.onload = () => { IM[key]=img; res(); };
    img.onerror = () => {
      console.warn(`⚠️ [assets] fehlt: ${src} – Platzhalter verwendet`);
      // Platzhalter (farbiges Canvas) erzeugen
      const c=document.createElement('canvas'); c.width=128; c.height=64;
      const g=c.getContext('2d');
      g.fillStyle='#334455'; g.fillRect(0,0,c.width,c.height);
      g.fillStyle='#8899bb'; g.fillText(key,8,20);
      IM[key]=c; res();
    };
    img.src = src;
  });
}
