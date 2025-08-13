// core/assets.js
// V14.2 – lädt alle Texturen aus /assets, fehlende Dateien => IM[key] bleibt null

export const IM = {
  grass:null, water:null, shore:null, sand:null, rocky:null, dirt:null,
  road:null, road_straight:null, road_curve:null,
  hq_stone:null, hq_wood:null, lumberjack:null, depot:null, carrier:null
};

const LIST = [
  ['grass',        'assets/grass.png'],
  ['water',        'assets/water.png'],
  ['shore',        'assets/shore.png'],
  ['sand',         'assets/sand.png'],
  ['rocky',        'assets/rocky.png'],
  ['dirt',         'assets/dirt.png'],

  ['road',         'assets/road.png'],
  ['road_straight','assets/road_straight.png'],
  ['road_curve',   'assets/road_curve.png'],

  ['hq_stone',     'assets/hq_stone.png'],
  ['hq_wood',      'assets/hq_wood.png'],
  ['lumberjack',   'assets/lumberjack.png'],
  ['depot',        'assets/depot.png'],
  ['carrier',      'assets/carrier.png'],
];

export async function loadAllAssets(onProgress = null) {
  let done = 0;
  await Promise.all(LIST.map(([key, src]) => loadOne(key, src)));
  return true;

  function loadOne(key, src) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => { IM[key] = img; done++; onProgress && onProgress(done, LIST.length); res(); };
      img.onerror = () => { console.warn(`assets fehlt: ${src}`); IM[key] = null; done++; onProgress && onProgress(done, LIST.length); res(); };
      img.src = src;
    });
  }
}
