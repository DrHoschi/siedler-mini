export const TILE_W = 96;     // Iso-Breite oben
export const TILE_H = 54;     // Iso-Höhe (halbe Kachel)
export const camera = {
  x:0, y:0,        // Weltkoordinaten (Tile‑Space, nicht Pixel)
  zoom:1.00,
  canvas:null
};

export function setCanvas(c){ camera.canvas=c; }
export function setZoom(z){ camera.zoom = Math.max(0.3, Math.min(3, z)); }
export function addZoom(d){ setZoom(camera.zoom * d); }

/* Welt -> Bildschirm (Pixel) */
export function worldToScreen(wx, wy){
  const px = (wx - wy) * (TILE_W/2);
  const py = (wx + wy) * (TILE_H/2);
  const cx = (camera.x - camera.y) * (TILE_W/2);
  const cy = (camera.x + camera.y) * (TILE_H/2);
  const sx = (px - cx) * camera.zoom + camera.canvas.width / 2 / devicePixelRatio;
  const sy = (py - cy) * camera.zoom + camera.canvas.height/ 2 / devicePixelRatio;
  return [sx, sy];
}

/* Bildschirm -> Welt (Tile‑Float) */
export function screenToWorld(sx, sy){
  const cx = camera.canvas.width / 2 / devicePixelRatio;
  const cy = camera.canvas.height/ 2 / devicePixelRatio;
  const zx = (sx - cx) / camera.zoom;
  const zy = (sy - cy) / camera.zoom;
  const cxp = (camera.x - camera.y) * (TILE_W/2);
  const cyp = (camera.x + camera.y) * (TILE_H/2);
  const px = zx + cxp;
  const py = zy + cyp;
  const wx = (py/(TILE_H/2) + px/(TILE_W/2)) / 2;
  const wy = (py/(TILE_H/2) - px/(TILE_W/2)) / 2;
  return [wx, wy];
}

export function pan(dx,dy){ camera.x += dx; camera.y += dy; }
export function centerOn(wx,wy){ camera.x = wx; camera.y = wy; }

/* Komfort */
export function centerOnHQ(){
  if (window.HQ_POS) centerOn(window.HQ_POS.x, window.HQ_POS.y);
}
