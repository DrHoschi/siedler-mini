// render.js – V14.2
// Zeichnet Welt (Boden/Gras), Straßen, Gebäude, Träger

export function createRenderer(canvas, IM, state) {
  const ctx = canvas.getContext('2d');

  let viewW=canvas.width, viewH=canvas.height, dpr=1;
  function setSize(w,h,_dpr){ viewW=w; viewH=h; dpr=_dpr||1; }

  function clear() {
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,viewW,viewH);
    ctx.fillStyle = '#0f1420';
    ctx.fillRect(0,0,viewW,viewH);
  }

  function drawGround() {
    const g = state.game;
    const cam = state.camera;

    // Sichtbares Tile‑Rechteck grob schätzen
    const pad = 2;
    const topLeft = g.worldToTile(cam.x, cam.y);
    const bottomRight = g.worldToTile(cam.x + viewW/cam.zoom, cam.y + viewH/cam.zoom);

    const minX = Math.max(0, topLeft.tx - pad);
    const minY = Math.max(0, topLeft.ty - pad);
    const maxX = Math.min(g.w-1, bottomRight.tx + pad);
    const maxY = Math.min(g.h-1, bottomRight.ty + pad);

    for (let ty=minY; ty<=maxY; ty++) {
      for (let tx=minX; tx<=maxX; tx++) {
        const {wx,wy} = g.tileToWorld(tx,ty);
        const sx = (wx - cam.x) * cam.zoom;
        const sy = (wy - cam.y) * cam.zoom;

        const img = IM.grass;
        if (img) {
          const w = 64 * cam.zoom, h = 32 * cam.zoom; // Basisgröße passend zum TileDX/DY
          ctx.drawImage(img, sx - w/2, sy - h/2, w, h);
        } else {
          // Platzhalter‑Diamant
          ctx.fillStyle = '#1b2a16';
          drawDiamond(sx, sy, 32*cam.zoom, 16*cam.zoom);
          ctx.fill();
          ctx.strokeStyle = '#2e4a26';
          ctx.stroke();
        }
      }
    }
  }

  function drawRoads() {
    const g = state.game, cam = state.camera;
    for (let ty=0; ty<g.h; ty++) for (let tx=0; tx<g.w; tx++) {
      const c = g.tiles[ty][tx];
      if (!c.road) continue;
      const {wx,wy} = g.tileToWorld(tx,ty);
      const sx = (wx - cam.x) * cam.zoom;
      const sy = (wy - cam.y) * cam.zoom;

      const img = IM.road_straight || IM.road || null;
      if (img) {
        const w = 64 * cam.zoom, h = 32 * cam.zoom;
        ctx.drawImage(img, sx - w/2, sy - h/2, w, h);
      } else {
        ctx.fillStyle = '#8e8e8e';
        drawDiamond(sx, sy, 28*cam.zoom, 12*cam.zoom);
        ctx.fill();
      }
    }
  }

  function drawBuildings() {
    const g=state.game, cam=state.camera, S=g.sprite;
    for (let ty=0; ty<g.h; ty++) for (let tx=0; tx<g.w; tx++) {
      const b = g.tiles[ty][tx].b; if (!b) continue;
      const {wx,wy} = g.tileToWorld(tx,ty);
      const sx = (wx - cam.x) * cam.zoom;
      const sy = (wy - cam.y) * cam.zoom;

      const name = b.type;
      const img = IM[name] || null;
      const off = S[name] || {ox:0,oy:0};
      if (img) {
        const w = img.width * cam.zoom, h = img.height * cam.zoom;
        ctx.drawImage(img, sx + off.ox*cam.zoom, sy + off.oy*cam.zoom, w, h);
      } else {
        // Platzhalter‑Kasten
        ctx.fillStyle = '#555';
        ctx.fillRect(sx-20*cam.zoom, sy-20*cam.zoom, 40*cam.zoom, 40*cam.zoom);
      }
    }
  }

  function drawCarriers() {
    const cam = state.camera;
    const list = state.carriers?.getDrawList() || [];
    if (!list.length) return;

    for (const c of list) {
      const sx = (c.px - cam.x) * cam.zoom;
      const sy = (c.py - cam.y) * cam.zoom;
      const img = IM.carrier;
      if (img) {
        const w = img.width * cam.zoom, h = img.height * cam.zoom;
        ctx.drawImage(img, sx - w/2, sy - h + 6*cam.zoom, w, h);
      } else {
        ctx.fillStyle = '#caa76a';
        ctx.beginPath();
        ctx.arc(sx, sy-6*cam.zoom, 6*cam.zoom, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }

  function drawDiamond(cx, cy, rx, ry) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - ry);
    ctx.lineTo(cx + rx, cy);
    ctx.lineTo(cx, cy + ry);
    ctx.lineTo(cx - rx, cy);
    ctx.closePath();
  }

  function drawHUD() {
    // optional: kleine Debug‑Infos
    const cam = state.camera;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = 'rgba(255,255,255,0.66)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`Zoom ${cam.zoom.toFixed(2)}`, 12, 16);
  }

  function draw() {
    clear();
    drawGround();
    drawRoads();
    drawBuildings();
    drawCarriers();
    drawHUD();
  }

  return { setSize, draw };
}
