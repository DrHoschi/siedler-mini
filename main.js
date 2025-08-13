// main.js – V14.3
// Wird von boot.js via dynamic import geladen.
// Hier wieder “scharf” mit Start des eigentlichen Spiels.
import { startGame } from './game.js?v=14.3';

export async function run() {
  // 1) Canvas holen
  const canvas = document.getElementById('game');
  if (!canvas) throw new Error('#game (Canvas) nicht gefunden.');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas.getContext("2d") schlug fehl.');

  // 2) DPR-scharf ans Fenster binden
  const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  function resize() {
    const w = Math.floor(window.innerWidth);
    const h = Math.floor(window.innerHeight);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width  = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize, { passive:true });
  resize();

  // 3) HUD Grundwerte sichtbar
  const $ = id => document.getElementById(id);
  const setHud = (kv) => {
    for (const [id, val] of Object.entries(kv)) {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val);
    }
  };
  const showHud = () => { const bar = $('#uiBar'); if (bar) bar.style.opacity = 1; };

  // 4) Spiel starten
  const game = await startGame({
    canvas,
    DPR,
    onHud: (key, val) => {
      // erwartete keys: hudWood,hudStone,hudFood,hudGold,hudCar,hudTool,hudZoom
      const el = $('#'+key);
      if (el) el.textContent = String(val);
    }
  });

  // 5) öffentliche Helfer (z.B. “Zentrieren”-Button in der UI)
  window.__centerMap = () => { try { game?.center?.(); } catch(_){} };

  // 6) HUD einblenden
  showHud();

  // 7) Fallback: falls dein game nichts zeichnet, kleines Grid zeigen (Debug)
  requestAnimationFrame(() => {
    try {
      // wenn dein Renderer/Loop läuft, ist dieser Frame überschrieben – sonst Platzhalter:
      if (canvas.__drawnOnce) return;
      const c = canvas.getContext('2d');
      c.fillStyle = '#0f1823'; c.fillRect(0,0,canvas.width,canvas.height);
      c.fillStyle = '#1a2b3d';
      for (let y=0; y<canvas.height; y+=64) for (let x=0; x<canvas.width; x+=64) c.fillRect(x,y,63,63);
      c.fillStyle = '#cfe3ff'; c.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      c.fillText('Rendering-Fallback (prüfe Renderer/Loop)', 16, 28);
    } catch {}
  });
}
