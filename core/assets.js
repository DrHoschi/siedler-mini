// core/assets.js — V13.8.3
// Lädt alle Bilder. Fehlende Dateien => Platzhalterfarbe + Fehlerliste.

export const IM = {
  grass:null, water:null, shore:null,
  road:null, road_straight:null, road_curve:null,
  hq_stone:null, hq_wood:null, lumberjack:null, depot:null,
  rocky:null, sand:null, dirt:null, carrier:null
};

const LIST = [
  ['grass',        '/assets/grass.png'],
  ['water',        '/assets/water.png'],
  ['shore',        '/assets/shore.png'],
  ['rocky',        '/assets/rocky.png'],
  ['sand',         '/assets/sand.png'],
  ['dirt',         '/assets/dirt.png'],

  ['road',         '/assets/road.png'],
  ['road_straight','/assets/road_straight.png'],
  ['road_curve',   '/assets/road_curve.png'],

  ['hq_stone',     '/assets/hq_stone.png'],
  ['hq_wood',      '/assets/hq_wood.png'],
  ['lumberjack',   '/assets/lumberjack.png'],
  ['depot',        '/assets/depot.png'],

  ['carrier',      '/assets/carrier.png'],
];

export async function loadAllAssets(){
  const errors = [];
  await Promise.all(LIST.map(([key,src]) => loadOne(key, src).catch(() => {
    // Platzhalter erzeugen
    IM[key] = makePlaceholder(key);
    errors.push({key, src});
  })));
  return { errors };
}

function loadOne(key, src){
  return new Promise((res, rej)=>{
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = ()=>{ IM[key]=img; res(); };
    img.onerror = ()=> rej(new Error(`asset failed: ${src}`));
    img.src = src + `?v=${'13.8.3'}`; // einfache Cache-Busting-Nummer
  });
}

function makePlaceholder(key){
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#22324a'; g.fillRect(0,0,64,64);
  g.fillStyle = '#ff7676';
  g.font = '10px monospace';
  g.textAlign = 'center';
  g.fillText(key, 32, 34);
  const img = new Image();
  img.src = c.toDataURL('image/png');
  return img;
}
