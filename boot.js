// Siedler-Mini — BOOT
import { Assets } from './core/asset.js';
import { SiedlerMap } from './tools/map-runtime.js';

const cv = document.querySelector('canvas');
const ctx = cv.getContext('2d', { alpha: false });

function resize() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const w = Math.floor(innerWidth);
  const h = Math.floor(innerHeight);
  cv.width = Math.floor(w * dpr);
  cv.height = Math.floor(h * dpr);
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize);
resize();

Assets.imageRenderingCrisp(cv);

// Manifest preload
await Assets.loadAll({
  images: [ './assets/tiles/tileset.png' ],
  json:   [ './assets/tiles/tileset.json', './assets/maps/map-pro.json' ]
});

const worldJson = await Assets.get('./assets/maps/map-pro.json');

const world = new SiedlerMap({
  tileResolver: (name) => './assets/' + name,
  onReady: () => loop()
});
await world.loadFromObject(worldJson);

function loop() {
  ctx.clearRect(0,0,cv.width,cv.height);
  world.draw(ctx, { x:0, y:0, w:cv.width, h:cv.height });
  requestAnimationFrame(loop);
}
