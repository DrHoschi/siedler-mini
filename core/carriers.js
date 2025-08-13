// core/carriers.js
// V14.2 – einfache Träger: spawnen, laufen Straßen‑Pfad (Array von Punkten), despawnen am Ziel

export class Carriers {
  constructor(world, pathfinder) {
    this.world = world;
    this.pathfinder = pathfinder; // (fromTile, toTile) => [{x,y}, ...]
    this.list = [];
    this.speed = 60; // px/s
  }

  // neue Lieferung anfordern
  request(fromTile, toTile, payload = {type:'wood', qty:1}) {
    const path = this.pathfinder(fromTile, toTile);
    if (!path || path.length < 2) return false;

    const startPx = this.world.tileToWorld(path[0].x, path[0].y);
    this.list.push({
      payload,
      path,
      seg: 0,
      t: 0,
      px: startPx.x,
      py: startPx.y,
      active: true,
    });
    return true;
  }

  update(dt) {
    const pxStep = this.world.tileStepPx; // {dx,dy} in Welt‑Pixeln
    const v = this.speed;

    for (const c of this.list) {
      if (!c.active) continue;
      // aktuelles Segment
      const a = c.path[c.seg], b = c.path[c.seg + 1];
      if (!b) { c.active = false; continue; }
      const ax = a.x * pxStep.dx + pxStep.ox;
      const ay = a.y * pxStep.dy + pxStep.oy;
      const bx = b.x * pxStep.dx + pxStep.ox;
      const by = b.y * pxStep.dy + pxStep.oy;

      const dx = bx - ax, dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      c.t += (v * dt) / len;
      if (c.t >= 1) {
        c.seg++;
        c.t = 0;
        c.px = bx; c.py = by;
        if (c.seg >= c.path.length - 1) { c.active = false; }
        continue;
      }
      c.px = ax + dx * c.t;
      c.py = ay + dy * c.t;
    }

    // inaktiv aufräumen
    this.list = this.list.filter(c => c.active);
  }

  // Daten fürs Rendern
  getDrawList() {
    // {px,py} in Welt‑Pixeln – das Rendern übernimmt render.js
    return this.list.map(c => ({px:c.px, py:c.py, payload:c.payload}));
  }
}
