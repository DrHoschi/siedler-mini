/* ============================================================================
 * render.js — Zeichnet Map, Gebäude und Figuren auf #stage
 * Erwartet: World.state (rows/cols/tile,map.layers[0].grid), Textures
 * Globale Exports: window.Render
 * ========================================================================== */
(() => {
  if (window.Render) return;

  const R = {
    canvas: null,
    ctx: null,
    dpr: window.devicePixelRatio || 1,
    raf: 0,
    showGrid: false,
  };

  function ensureCanvas(){
    if (R.canvas) return;
    R.canvas = document.getElementById('stage');
    R.ctx = R.canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }
  function resize(){
    const w = Math.max(1, R.canvas.clientWidth  || window.innerWidth);
    const h = Math.max(1, R.canvas.clientHeight || window.innerHeight);
    const W = Math.floor(w * R.dpr), H = Math.floor(h * R.dpr);
    if (R.canvas.width!==W || R.canvas.height!==H){ R.canvas.width=W; R.canvas.height=H; }
  }

  function worldToScreen(x, y, S){
    const W=R.canvas.width, H=R.canvas.height;
    const z=S.camera.zoom;
    const ox = W/2 - S.camera.x*z;
    const oy = H/2 - S.camera.y*z;
    return { x: ox + x*z, y: oy + y*z, z };
  }

  function drawMap(S){
    const ctx=R.ctx, tile=S.tile;
    const layer = S.map?.layers?.[0];
    if (!layer) return;

    const grid = layer.grid; // 1D‑Array mit Keys (rows*cols)
    if (!grid || !grid.length) return;

    // Hintergrund
    ctx.fillStyle='#0c1b2b'; ctx.fillRect(0,0,R.canvas.width,R.canvas.height);

    // Kacheln
    for (let r=0; r<S.rows; r++){
      for (let c=0; c<S.cols; c++){
        const key = grid[r*S.cols + c] || 'missing';
        const wx = c*tile, wy = r*tile;
        const scr = worldToScreen(wx, wy, S);
        Textures.drawTile(ctx, key, scr.x, scr.y, tile*scr.z);
      }
    }

    // optionales Overlay‑Grid (fein)
    if (R.showGrid) {
      ctx.save();
      ctx.strokeStyle='rgba(255,255,255,.08)';
      for (let r=0; r<=S.rows; r++){
        const wy = r*tile; const a=worldToScreen(0,wy,S); const b=worldToScreen(S.cols*tile,wy,S);
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      }
      for (let c=0; c<=S.cols; c++){
        const wx = c*tile; const a=worldToScreen(wx,0,S); const b=worldToScreen(wx,S.rows*tile,S);
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawBuildings(S){
    const ctx=R.ctx, t=S.tile;
    ctx.save();
    for (const b of S.buildings){
      const x = b.tx*t, y=b.ty*t;
      const scr = worldToScreen(x,y,S);
      const sz = t*scr.z;
      ctx.fillStyle='rgba(255,160,80,.85)';
      ctx.fillRect(scr.x, scr.y, b.w*sz, b.h*sz);
      ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.strokeRect(scr.x+0.5, scr.y+0.5, b.w*sz-1, b.h*sz-1);
      ctx.fillStyle='rgba(0,0,0,.6)'; ctx.font= Math.max(10, sz*0.22)+'px ui-monospace,monospace';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(b.type, scr.x + (b.w*sz)/2, scr.y + (b.h*sz)/2);
    }
    ctx.restore();
  }

  function drawUnits(S){
    const ctx=R.ctx, t=S.tile;
    ctx.save();
    for (const u of S.units){
      const scr=worldToScreen(u.x, u.y, S);
      const r = Math.max(3, t*scr.z*0.18);
      ctx.beginPath(); ctx.fillStyle=u.color||'#ff0';
      ctx.arc(scr.x, scr.y, r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.stroke();
    }
    ctx.restore();
  }

  function loop(){
    R.raf = requestAnimationFrame(loop);
    const S = window.World?.state;
    if (!S || !R.ctx) return;

    drawMap(S);
    drawBuildings(S);
    drawUnits(S);
  }

  function start(){
    ensureCanvas();
    if (!R.raf) R.raf = requestAnimationFrame(loop);
  }
  function stop(){
    if (R.raf) cancelAnimationFrame(R.raf); R.raf=0;
  }

  window.Render = { start, stop, worldToScreen, set showGrid(v){R.showGrid=!!v;} };
})();
