// core/input.js
// V14.2 – Touchsteuerung: Pan nur im Zeiger‑Tool, Pinch‑Zoom, Tap‑Box für Abriss/Bau

export class Input {
  constructor(getState) {
    // getState() soll { tool, camera, pickAtScreen, buildAtWorld, demolishAtWorld } liefern
    this.getState = getState;
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
    // Doppeltipp fängt die UI selbst ab (Vollbild o.ä.), hier nix tun
    if (now - this.lastTapMs < 280) return;
    for (const t of ev.changedTouches) this.touches.set(t.identifier, t);
    this.lastTapMs = now;
    // Drag-Start für Einfingerpan
    if (this.touches.size === 1) {
      const t = [...this.touches.values()][0];
      const st = this.getState();
      if (st.tool === 'pointer') st.camera.dragStart(t.clientX, t.clientY);
    }
  }

  onMove = (ev) => {
    const st = this.getState();
    if (!st) return;

    if (this.touches.size === 1 && st.tool === 'pointer') {
      const t = ev.touches[0];
      st.camera.dragMove(t.clientX, t.clientY);
      ev.preventDefault();
      return;
    }

    // Pinch‑Zoom (2 Finger)
    if (ev.touches.length === 2) {
      const [a,b] = ev.touches;
      const [a0,b0] = [...this.touches.values()];
      if (a0 && b0) {
        const dist0 = Math.hypot(a0.clientX - b0.clientX, a0.clientY - b0.clientY);
        const dist1 = Math.hypot(a.clientX - b.clientX,   a.clientY - b.clientY);
        if (dist0 > 0) {
          const f = dist1 / dist0;
          const cx = (a.clientX + b.clientX) / 2;
          const cy = (a.clientY + b.clientY) / 2;
          st.camera.zoomAt(f, cx, cy);
        }
      }
      ev.preventDefault();
    }

    // Touch‑Map aktualisieren
    this.touches.clear();
    for (const t of ev.touches) this.touches.set(t.identifier, t);
  }

  onEnd = (ev) => {
    const st = this.getState();
    if (!st) return;

    // Tap‑Events (kurzer Tipp)
    for (const t of ev.changedTouches) {
      // nur kurzer Tap ohne Bewegung
      // (hier genügt: wenn nach dem End keine Touches aktiv sind)
      const sx = t.clientX, sy = t.clientY;
      const world = st.pickAtScreen(sx, sy);
      if (!world) continue;

      if (st.tool === 'demolish') {
        // großzügige 1x1‑Tile‑Hitbox
        st.demolishAtWorld(world.wx, world.wy, world.worldTileX, world.worldTileY);
      } else if (st.tool !== 'pointer') {
        st.buildAtWorld(world.wx, world.wy, world.worldTileX, world.worldTileY);
      }
    }

    // Drag‑End / Touch‑Map
    st.camera.dragEnd();
    for (const t of ev.changedTouches) this.touches.delete(t.identifier);
  }
}
