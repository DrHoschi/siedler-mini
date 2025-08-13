// core/carriers.js
// V14.2 – einfache Träger-Logik: spawnt, läuft Straßenpfad (array von Punkten), liefert Holz

export class Carriers {
  constructor(world, pathfinder) {
    this.world = world;
    this.pathfinder = pathfinder; // (fromTile, toTile) => [{x,y},...]
    this.list = [];
    this.speed = 60; // px/sec
  }

  request(fromTile, toTile, payload = {type:'wood', qty:1}) {
    const path = this.pathfinder(fromTile, toTile);
    if (!path || path.length < 2) return false;

    const startPx = this.world.tileToWorld(path[0].x, path[0].y);
    this.list.push({
      payload, path, seg:0, t:0, px:startPx.x, py:startPx.y, active:true
    });
    return true;
  }

  update(dt) {
    const tileStep = this.world.tileStepPx; // {dx, dy} or size
    const v = this.speed;

    for (const c of this.list) {
      if (!c.active) continue;
      const a = this.world.tileToWorld(c.path[c.seg].x, c.path[c.seg].y);
      const b = this.world.tileToWorld(c.path[c.seg+1].x, c.path[c.seg+1].y);
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1) { c.seg++; continue; }

      c.t += (v * dt) / dist;
      if (c.t >= 1) {
        c.seg++;
        c.t = 0;
        if (c.seg >= c.path.length - 1) {
          // geliefert
          this.world.onCarrierDelivered?.(c.payload);
          c.active = false;
        }
      } else {
        c.px = a.x + dx * c.t;
        c.py = a.y + dy * c.t;
      }
    }
    // aufräumen
    this.list = this.list.filter(c => c.active);
  }

  draw(ctx, camera, sprite) {
    if (!sprite) return;
    for (const c of this.list) {
      const s = camera.toScreen(c.px, c.py);
      const w = 22, h = 28; // carrier.png ungefähr
      ctx.drawImage(sprite, s.x - w*0.5, s.y - h + 8, w, h);
    }
  }
}
