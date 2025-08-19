// Map Runtime with Tileset Atlas & basic tile animation
// Exports SiedlerMap which draws tile layers to a 2D canvas context.

import { Assets } from '../core/asset.js';

export class SiedlerMap {
  constructor(opts) {
    this.opts = opts || {};
    this.tileSize = 64;
    this.world = null;
    this.atlas = null;
    this.atlasImageURL = null;
    this.atlasImage = null;
    this.time = 0;
    this._ready = false;
  }

  async loadFromObject(worldJson) {
    this.world = worldJson;
    this.tileSize = worldJson.tileSize || this.tileSize;

    const atlasURL = worldJson.atlas || this.opts.tileResolver?.('tiles/tileset.json') || 'assets/tiles/tileset.json';
    this.atlas = await Assets.loadJSON(atlasURL);
    this.atlasImageURL = (this.atlas.meta?.image)
      ? (this.opts.tileResolver?.('tiles/' + this.atlas.meta.image) || 'assets/tiles/' + this.atlas.meta.image)
      : (this.opts.tileResolver?.('tiles/tileset.png') || 'assets/tiles/tileset.png');

    this.atlasImage = await Assets.loadImage(this.atlasImageURL);
    this._ready = true;
    this.opts.onReady && this.opts.onReady();
  }

  draw(ctx, view) {
    if (!this._ready || !this.world) return;

    const now = performance.now();
    const dt = this._lastT ? (now - this._lastT) : 16.7;
    this._lastT = now;
    this.time += dt;

    const ts = this.tileSize;
    const startCol = Math.floor(view.x / ts);
    const startRow = Math.floor(view.y / ts);
    const endCol   = Math.ceil((view.x + view.w) / ts);
    const endRow   = Math.ceil((view.y + view.h) / ts);

    Assets.imageRenderingCrisp(ctx);

    for (const layer of (this.world.layers || [])) {
      if (layer.type !== 'tile') continue;
      const grid = layer.grid;

      for (let r = startRow; r < endRow; r++) {
        const row = grid[r];
        if (!row) continue;
        for (let c = startCol; c < endCol; c++) {
          const cell = row[c];
          if (!cell) continue;

          let key = (typeof cell === 'string') ? cell : (cell.key || '');
          if (!key) continue;

          if (this.atlas.aliases && this.atlas.aliases[key]) key = this.atlas.aliases[key];

          const anim = this.atlas.animations?.[key];
          if (anim) {
            const frameIdx = this._animFrame(anim, this.time);
            const frameKey = anim.frames[frameIdx];
            this._blitFrame(ctx, frameKey, c * ts - view.x, r * ts - view.y, cell);
          } else {
            this._blitFrame(ctx, key, c * ts - view.x, r * ts - view.y, cell);
          }
        }
      }
    }
  }

  _animFrame(anim, timeMs) {
    const fps = anim.fps || 6;
    const len = anim.frames.length || 1;
    const f = Math.floor((timeMs / 1000) * fps);
    if (anim.loop !== false) return f % len;
    return Math.min(f, len - 1);
  }

  _blitFrame(ctx, frameKey, dx, dy, cell) {
    const f = this.atlas.frames?.[frameKey];
    if (!f) return;
    const sx = f.x|0, sy = f.y|0, sw = f.w|0, sh = f.h|0;

    const flipX = !!(cell && cell.flipX);
    const flipY = !!(cell && cell.flipY);

    if (flipX || flipY) {
      ctx.save();
      ctx.translate(dx + (flipX ? sw : 0), dy + (flipY ? sh : 0));
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      ctx.drawImage(this.atlasImage, sx, sy, sw, sh, 0, 0, sw, sh);
      ctx.restore();
    } else {
      ctx.drawImage(this.atlasImage, sx, sy, sw, sh, dx, dy, sw, sh);
    }
  }
}
