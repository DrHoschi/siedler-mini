/* =======================================================================
 * game.js – Minimal Engine Scaffold (v16.1.14)
 * – Stellt window.GameLoader.start(mapPath) bereit
 * – Malt eine simple Karte (16x10) als Proof-of-Start
 * – Sendet cb:game-started Event
 * – Bietet optionale GameUI-Stubs für Build-Menü
 * ======================================================================= */

(function(){
  const VERSION = '16.1.14';
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  // Responsive Canvas
  function fitCanvas(){
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width  = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize', fitCanvas, { passive:true });
  fitCanvas();

  // Logs
  function ok(msg){ window.Log?.ok?.(msg) || console.log(msg); }
  function warn(msg){ window.Log?.warn?.(msg) || console.warn(msg); }
  function err(msg){ window.Log?.err?.(msg) || console.error(msg); }

  ok(`game.js geladen, game.js v${VERSION}`);

  // Minimal GameUI Stubs (für Bau-Menü Button)
  window.GameUI = window.GameUI || {};
  window.GameUI.openBuildMenu = function(){
    ok('Bau-Menü geöffnet (Stub)');
  };
  window.GameUI.closeBuildMenu = function(){
    ok('Bau-Menü geschlossen (Stub)');
  };

  // GameLoader
  window.GameLoader = {
    async start(mapPath){
      // Simulierter Map-Load (du kannst hier echte Fetch/Parsing Logik einsetzen)
      if (!mapPath) throw new Error('Kein Map-Pfad angegeben');

      ok(`Map laden → ${mapPath}`);

      // Fake: „laden“
      await sleep(120);

      // Zeichne simple Tiles (nur als Beweis, dass was passiert)
      drawDemoGrid();

      ok(`Game gestartet (${mapPath})`);

      // Event für UI/Build-Button
      window.dispatchEvent(new CustomEvent('cb:game-started'));
    },
    reset(){
      // Leinwand leeren
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ok('Engine reset');
    }
  };

  function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

  function drawDemoGrid(){
    const tile = 64;
    const cols = Math.floor(canvas.clientWidth / tile) || 16;
    const rows = Math.floor(canvas.clientHeight / tile) || 10;

    // Hintergrund
    ctx.fillStyle = '#0f3926';
    ctx.fillRect(0,0,canvas.clientWidth,canvas.clientHeight);

    // „Wiese“ Tiles
    for (let y=0; y<rows; y++){
      for (let x=0; x<cols; x++){
        const gx = x*tile, gy = y*tile;
        ctx.fillStyle = (x+y)%2 ? '#2f7d4a' : '#2a7143';
        ctx.fillRect(gx+1, gy+1, tile-2, tile-2);
      }
    }
    // Demo „Straße“
    ctx.fillStyle = '#6d5d4b';
    for (let x=0; x<cols; x++){
      const gx = x*tile + tile*0.1;
      const gy = Math.floor(rows/2)*tile + tile*0.35;
      ctx.fillRect(gx, gy, tile*0.8, tile*0.3);
    }
  }
})();
