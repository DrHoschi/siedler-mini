// main.js – V14.3
export async function run() {
  // 1) Canvas holen
  const canvas = document.getElementById('game');
  if (!canvas) throw new Error('#game (Canvas) nicht gefunden.');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas.getContext("2d") schlug fehl.');

  // 2) DevicePixelRatio-scharf an Fenster binden
  const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  function resize() {
    const w = Math.floor(window.innerWidth);
    const h = Math.floor(window.innerHeight);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawPlaceholder();
  }
  window.addEventListener('resize', resize, { passive:true });
  resize();

  // 3) HUD Grundwerte (sichtbar machen)
  const $ = id => document.getElementById(id);
  $('#uiBar') && ($('#uiBar').style.opacity = 1);
  $('#hudWood') && ($('#hudWood').textContent = '20');
  $('#hudStone') && ($('#hudStone').textContent = '10');
  $('#hudFood') && ($('#hudFood').textContent = '10');
  $('#hudGold') && ($('#hudGold').textContent = '0');
  $('#hudCar')  && ($('#hudCar').textContent  = '0');
  $('#hudTool') && ($('#hudTool').textContent = 'Zeiger');
  $('#hudZoom') && ($('#hudZoom').textContent = '1.00x');

  // 4) Platzhalter-Zeichnung (bis dein Game startet)
  function drawPlaceholder() {
    ctx.fillStyle = '#0f1823';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const sz = 64;
    for (let y = -sz; y < canvas.height + sz; y += sz) {
      for (let x = -sz; x < canvas.width + sz; x += sz) {
        ctx.fillStyle = ((x + y) / sz) % 2 ? '#1a2b3d' : '#132235';
        ctx.fillRect(x, y, sz, sz);
      }
    }
    ctx.fillStyle = '#cfe3ff';
    ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText('main.run() OK – Platzhalter', 16, 28);
  }

  // 5) (Optional) Dein echtes Spiel starten:
  // Entkommentieren, wenn game.js vorhanden und startGame exportiert:
  // const { startGame } = await import('./game.js?v=14.3');
  // await startGame({
  //   canvas,
  //   DPR,
  //   onHud: (key, val) => { const el = $('#'+key); if (el) el.textContent = val; }
  // });

  // 6) Zentrieren-Knopf unterstützen (falls gewünscht)
  // Du kannst diese Funktion von deinem Game später überschreiben.
  window.__centerMap = () => { drawPlaceholder(); };
}
