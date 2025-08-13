// V14.1 – Assets laden (PNG aus /assets, sonst Platzhalter)
export const IM = {
  grass: null, water: null, shore: null, dirt: null, rocky: null, sand: null,
  road: null, road_straight: null, road_curve: null,
  hq_stone: null, hq_wood: null, lumberjack: null, depot: null, carrier: null
};

const MAP = [
  ['grass',         'assets/grass.png'],
  ['water',         'assets/water.png'],
  ['shore',         'assets/shore.png'],
  ['dirt',          'assets/dirt.png'],
  ['rocky',         'assets/rocky.png'],
  ['sand',          'assets/sand.png'],
  ['road',          'assets/road.png'],
  ['road_straight', 'assets/road_straight.png'],
  ['road_curve',    'assets/road_curve.png'],
  ['hq_stone',      'assets/hq_stone.png'],
  ['hq_wood',       'assets/hq_wood.png'],
  ['lumberjack',    'assets/lumberjack.png'],
  ['depot',         'assets/depot.png'],
  ['carrier',       'assets/carrier.png'],
];

export async function loadAllAssets(){
  await Promise.all(MAP.map(([k, src]) => loadOne(k, src)));
}

function loadOne(key, src){
  return new Promise(res => {
    const img = new Image();
    img.onload  = () => { IM[key] = img; res(); };
    img.onerror = () => { console.warn(`[assets] fehlt: ${src}`); IM[key] = null; res(); };
    img.src = src;
  });
}
