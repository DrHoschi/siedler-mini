// game.js (V14.3-safe4)
// Minimal-Start: stellt sicher, dass nach main.run() immer gezeichnet wird.

import Renderer from './render.js';

export async function startGame(opts) {
  const { canvas, DPR, onHUD = () => {} } = opts;

  // --- State ---------------------------------------------------------------
  const st = {
    tool: 'pointer',
    zoom: 1,
    // Eine "Bildschirm-Weltgröße", nur damit wir was zum Zeichnen haben
    world: { w: 40, h: 28 },
  };

  // --- Canvas-Größe initial & on resize -----------------------------------
  function setCanvasSize() {
    const w = Math.floor(canvas.clientWidth * DPR);
    const h = Math.floor(canvas.clientHeight * DPR);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
  }
  setCanvasSize();
  window.addEventListener('resize', setCanvasSize);

  // --- HUD initial ---------------------------------------------------------
  onHUD('hudWood', 0);
  onHUD('hudStone', 0);
  onHUD('hudFood', 0);
  onHUD('hudGold', 0);
  onHUD('hudCar', 0);
  onHUD('hudTool', 'Zeiger');
  onHUD('hudZoom', '1.00x');

  // --- Tool-Buttons (falls vorhanden) -------------------------------------
  const $ = (sel) => document.querySelector(sel);
  function bindBtn(id, tool) {
    const el = $(id);
    if (!el) return;
    el.addEventListener('click', () => {
      st.tool = tool;
      onHUD('hudTool', tool === 'pointer' ? 'Zeiger' :
                       tool === 'road'    ? 'Straße' :
                       tool === 'hq'      ? 'HQ' :
                       tool === 'lumber'  ? 'Holzfäller' :
                       tool === 'depot'   ? 'Depot' : 'Abriss');
      // aktive Klasse pflegen
      ['#toolPointer','#toolRoad','#toolHQ','#toolLumber','#toolDepot','#toolErase']
        .forEach(sel => {
          const b = $(sel);
          if (b) b.classList.toggle('active', b === el);
        });
    });
  }
  bindBtn('#toolPointer', 'pointer');
  bindBtn('#toolRoad',    'road');
  bindBtn('#toolHQ',      'hq');
  bindBtn('#toolLumber',  'lumber');
  bindBtn('#toolDepot',   'depot');
  bindBtn('#toolErase',   'erase');

  // --- Renderer ------------------------------------------------------------
  const renderer = Renderer(canvas, DPR, st);

  // API für main.js
  function setSize() {
    setCanvasSize();
  }
  function draw() {
    renderer.draw();
  }

  return { setSize, draw };
}
