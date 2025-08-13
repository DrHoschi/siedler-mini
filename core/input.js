// V14.1 – Touch/Maus‑Input
// 1 Finger = Pan (nur wenn isPointerTool() true) · 2 Finger = Pinch‑Zoom · kurzer Tap = onTap
export function makeInput(canvas, onTap, onPan, onPinch, isPointerTool){
  // iOS/Safari: passive:false, damit preventDefault() erlaubt ist
  const opts = { passive: false };

  let p1 = null; // {id,x,y,prevX,prevY,startX,startY}
  let p2 = null;
  let lastDist = 0;

  // UI‑Elemente dürfen Events bekommen – Canvas soll sie nicht „schlucken“
  const isUI = (ev) => !!ev.target.closest('.ui');

  function pointerDown(ev){
    if (isUI(ev)) return;
    ev.preventDefault();

    const pt = mkPoint(ev);
    if (!p1){
      p1 = pt;
    } else if (!p2){
      p2 = pt;
      lastDist = distance(p1, p2);
    }
  }

  function pointerMove(ev){
    if (isUI(ev)) return;
    ev.preventDefault();

    if (p1 && ev.pointerId === p1.id) updatePoint(p1, ev);
    if (p2 && ev.pointerId === p2.id) updatePoint(p2, ev);

    // Pinch‑Zoom
    if (p1 && p2){
      const d = distance(p1, p2);
      if (lastDist > 0 && isFinite(d) && d > 0){
        onPinch(d / lastDist, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
      }
      lastDist = d;
      return;
    }

    // Pan (nur Zeiger‑Tool)
    if (p1 && !p2 && isPointerTool()){
      const dx = p1.x - p1.prevX;
      const dy = p1.y - p1.prevY;
      if (dx || dy) onPan(-dx, -dy);   // Karte folgt dem Finger (invertiert)
    }
  }

  function pointerUp(ev){
    if (isUI(ev)) return;
    ev.preventDefault();

    if (p1 && ev.pointerId === p1.id){
      // kurzer Tap?
      const moved = Math.hypot(p1.x - p1.startX, p1.y - p1.startY);
      if (!p2 && moved < 10){
        onTap(p1.x, p1.y);
      }
      p1 = p2;      // „nachrücken“
      p2 = null;
      lastDist = 0;
      return;
    }
    if (p2 && ev.pointerId === p2.id){
      p2 = null;
      lastDist = 0;
    }
  }

  function wheel(ev){
    if (isUI(ev)) return;
    ev.preventDefault();
    const factor = ev.deltaY > 0 ? 0.9 : 1.1;
    onPinch(factor, ev.clientX, ev.clientY);
  }

  // Helpers
  function mkPoint(ev){
    return {
      id: ev.pointerId,
      x: ev.clientX, y: ev.clientY,
      prevX: ev.clientX, prevY: ev.clientY,
      startX: ev.clientX, startY: ev.clientY
    };
  }
  function updatePoint(p, ev){
    p.prevX = p.x; p.prevY = p.y;
    p.x = ev.clientX; p.y = ev.clientY;
  }
  function distance(a,b){ return Math.hypot(a.x - b.x, a.y - b.y); }

  // Listener
  canvas.addEventListener('pointerdown', pointerDown, opts);
  window.addEventListener('pointermove', pointerMove, opts);
  window.addEventListener('pointerup',    pointerUp,   opts);
  window.addEventListener('pointercancel',pointerUp,   opts);
  canvas.addEventListener('wheel', wheel, opts);
}
