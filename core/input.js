// core/input.js
// V14.2 – saubere Touchsteuerung (Pan nur im Zeiger-Tool), Tap-Box für Abriss

export class Input {
  constructor(getState) {
    this.getState = getState; // {tool, camera, pickAtScreen, demolishAtWorld}
    this.touches = new Map();
    this.lastTapMs = 0;
  }

  attach(el) {
    el.addEventListener('touchstart', this.onStart, {passive:false});
    el.addEventListener('touchmove',  this.onMove,  {passive:false});
    el.addEventListener('touchend',   this.onEnd,   {passive:false});
    el.addEventListener('touchcancel',this.onEnd,   {passive:false});
  }

  onStart = (ev) => {
    if (!ev.target) return;
    const now = performance.now();
    if (now - this.lastTapMs < 280) {
      // Doppeltipp lassen wir die App (UI) abfangen – hier: nichts
    }
    for (const t of ev.changedTouches) this.touches.set(t.identifier, {x:t.clientX, y:t.clientY});
    this.lastTapMs = now;
  }

  onMove = (ev) => {
    const st = this.getState();
    if (!st) return;
    if (ev.touches.length === 1 && st.tool === 'pointer') {
      const t = ev.touches[0];
      const prev = this.touches.get(t.identifier);
      if (prev) {
        st.camera.pan(t.clientX - prev.x, t.clientY - prev.y);
        prev.x = t.clientX; prev.y = t.clientY;
      }
      ev.preventDefault();
    } else if (ev.touches.length === 2) {
      // Pinch‑Zoom
      const [a,b] = ev.touches;
      const pa = this.touches.get(a.identifier) ?? {x:a.clientX, y:a.clientY};
      const pb = this.touches.get(b.identifier) ?? {x:b.clientX, y:b.clientY};
      const d0 = Math.hypot(pa.x - pb.x, pa.y - pb.y);
      const d1 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (d0 > 0 && d1 > 0) {
        const f = st.camera.zoom * (d1 / d0);
        const cx = (a.clientX + b.clientX) * 0.5;
        const cy = (a.clientY + b.clientY) * 0.5;
        st.camera.zoomTo(f, cx, cy);
      }
      this.touches.set(a.identifier, {x:a.clientX, y:a.clientY});
      this.touches.set(b.identifier, {x:b.clientX, y:b.clientY});
      ev.preventDefault();
    }
  }

  onEnd = (ev) => {
    const st = this.getState();
    if (!st) return;
    // kurzer Tap → bauen/abreißen
    if (ev.changedTouches.length === 1) {
      const t = ev.changedTouches[0];
      const screen = {x:t.clientX, y:t.clientY};
      const world = st.pickAtScreen(screen.x, screen.y);
      if (!world) return;

      if (st.tool === 'demolish') {
        // großzügige Hitbox (ein Tile‑Quadrat um den Tap)
        st.demolishAtWorld(world.wx, world.wy, world.tileX, world.tileY);
      } else {
        st.buildAtWorld(world.wx, world.wy, world.tileX, world.tileY);
      }
    }
    for (const t of ev.changedTouches) this.touches.delete(t.identifier);
  }
}
