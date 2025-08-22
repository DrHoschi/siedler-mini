// Siedler-Mini v11.1r6 — BOOT/INIT
// Initialisiert Canvas + Startfenster

(function(){
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');

  function resize(){
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // Startfenster
  const startBtn = document.getElementById('startBtn');
  const startScreen = document.getElementById('startScreen');
  startBtn.addEventListener('click', () => {
    startScreen.style.display = 'none';
    if (window.startGame) window.startGame();
  });

  // Globaler Game-State
  window.__GAME_STATE__ = {
    canvas, ctx,
    zoom: 1,
    camX: 0, camY: 0,
    roads: [], buildings: []
  };

  console.log("[BOOT] Initialisierung abgeschlossen.");
})();
