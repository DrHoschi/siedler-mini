// core/camera.js
export const cam = { x:0, y:0, z:1, sw:800, sh:600 };
export function setCanvasSize(w,h){ cam.sw=w; cam.sh=h; }
export function setZoom(z){ cam.z = Math.max(0.6, Math.min(3, z)); }
export function setCamCenter(wx,wy){ cam.x = wx - cam.sw/2/cam.z; cam.y = wy - cam.sh/2/cam.z; }
