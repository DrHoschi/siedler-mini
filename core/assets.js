// core/assets.js
// V14.2 – zentrale Image-Liste + Lazy-Load + Fallbackfarbe

export const IM = {};
const LIST = [
  ['grass',        'assets/grass.png'],
  ['water',        'assets/water.png'],
  ['shore',        'assets/shore.png'],
  ['dirt',         'assets/dirt.png'],
  ['rocky',        'assets/rocky.png'],
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
  await Promise.all(LIST.map(([key, src]) => new Promise(res => {
    const img = new Image();
    img.onload = () => { IM[key] = img; done++; onProgress && onProgress(done, LIST.length); res(); };
    img.onerror = () => { console.warn(`assets fehlt: ${src}`); IM[key] = null; done++; onProgress && onProgress(done, LIST.length); res(); };
    img.src = src;
  })));
}
