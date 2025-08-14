// Siedler-Mini – game.js (V14.7-kompatible Schablone)
export function startGame(opts){
  const { canvas, DPR=1, onHUD=()=>{}, getView, setView } = opts;
  const ctx = canvas.getContext('2d');

  // --- Spielzustand ---
  const S = {
    tool: 'pointer',
    debug: false,
    wood: 30, stone: 20, food: 0, gold: 0, carrier: 0,
    nodes: [], // {type:'hq'|'wood'|'depot', x,y,w,h,label}
    roads: [], // [{x1,y1,x2,y2}]
  };

  // HUD initial
  function pushHUD(){
    onHUD('Holz', S.wood);
    onHUD('Stein', S.stone);
    onHUD('Nahrung', S.food);
    onHUD('Gold', S.gold);
    onHUD('Traeger', S.carrier);
  }
  pushHUD();

  // --- Platzhaltergrößen (Weltkoordinaten) ---
  const W = { cell: 64, hq: {w:9*16, h:6*16}, b: {w:4*16, h:4*16} };

  // Welt->Screen
  function worldToScreen(wx, wy){
    const v = getView();
    const x = (wx + v.panX) * DPR;
    const y = (wy + v.panY) * DPR;
    return {x, y};
  }

  // Zeichnen
  function draw(){
    const {width, height} = canvas;
    ctx.clearRect(0,0,width,height);

    // Straßen
    ctx.lineWidth = 6*DPR;
    ctx.strokeStyle = '#7bd38a';
    ctx.setLineDash([12*DPR, 10*DPR]);
    ctx.beginPath();
    for (const r of S.roads){
      const a = worldToScreen(r.x1, r.y1);
      const b = worldToScreen(r.x2, r.y2);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Gebäude
    for (const n of S.nodes){
      const {x,y} = worldToScreen(n.x, n.y);
      const w = n.w * DPR, h = n.h * DPR;
      ctx.fillStyle = n.type==='hq' ? '#2aa351' : n.type==='depot' ? '#d83e8a' : '#3b82f6';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#cfe3ff';
      ctx.font = `${14*DPR}px system-ui`;
      ctx.fillText(n.label, x+8*DPR, y+8*DPR);
    }

    if (S.debug){
      // einfaches Raster oben drauf
      ctx.strokeStyle = '#1b2a40';
      ctx.lineWidth = 1;
      const step = 80 * DPR;
      ctx.beginPath();
      for (let x=0; x<width; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,height); }
      for (let y=0; y<height; y+=step){ ctx.moveTo(0,y); ctx.lineTo(width,y); }
      ctx.stroke();
    }
  }

  // Hilfen zum Bauen
  function gridSnap(v){ return Math.round(v / W.cell) * W.cell; }
  function addNode(type, wx, wy){
    const snapX = gridSnap(wx), snapY = gridSnap(wy);
    const n = {
      type,
      x: snapX, y: snapY,
      w: (type==='hq'?W.hq.w:W.b.w),
      h: (type==='hq'?W.hq.h:W.b.h),
      label: (type==='hq'?'HQ': type==='wood'?'Holzfäller':'Depot')
    };
    S.nodes.push(n);
    draw();
  }
  function addRoad(ax,ay,bx,by){
    S.roads.push({x1:gridSnap(ax), y1:gridSnap(ay), x2:gridSnap(bx), y2:gridSnap(by)});
    draw();
  }

  // Interaktion (sehr simpel)
  let down=false, sx=0, sy=0, lastTap=0;
  canvas.addEventListener('pointerdown', (e)=>{
    down = true; sx = e.clientX; sy = e.clientY;
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointerup', (e)=>{
    if (!down) return; down = false;
    const now=Date.now();
    const rect = canvas.getBoundingClientRect();
    const v = getView();
    const wx = (e.clientX - rect.left)/DPR - v.panX;
    const wy = (e.clientY - rect.top )/DPR - v.panY;

    if (S.tool === 'pointer'){
      if (now-lastTap < 260){ /* double tap -> center here */
        setView({ panX: v.panX - (wx - 0), panY: v.panY - (wy - 0) });
      }
      lastTap = now;
    } else if (S.tool === 'hq'){ addNode('hq', wx, wy); }
      else if (S.tool === 'woodcutter'){ addNode('wood', wx, wy); }
      else if (S.tool === 'depot'){ addNode('depot', wx, wy); }
      else if (S.tool === 'road'){
        // Einfache horizontale Straße von letzter zur neuen Position
        addRoad(wx, wy, wx + W.cell, wy);
      } else if (S.tool === 'erase'){
        // Alles löschen in Klicknähe
        const hit = (arr,pred)=>{ const i=arr.findIndex(pred); if(i>=0) arr.splice(i,1); };
        hit(S.nodes, n => Math.abs(n.x-wx)<W.cell && Math.abs(n.y-wy)<W.cell);
        hit(S.roads, r => Math.hypot((r.x1+r.x2)/2 - wx, (r.y1+r.y2)/2 - wy) < W.cell);
        draw();
      }
  });

  // API für boot.js
  startGame.setTool = (t)=>{ S.tool=t; };
  startGame.center  = ()=>{ setView({panX:0, panY:0, zoom:1}); draw(); };
  startGame.reset   = ()=>{ S.nodes.length=0; S.roads.length=0; draw(); };
  startGame.setDebug= (v)=>{ S.debug=!!v; draw(); };

  // Ein HQ in die Mitte setzen (optional – kannst du entfernen)
  addNode('hq', -W.hq.w/2, -W.hq.h/2);

  // Initial zeichnen
  draw();

  return startGame;
}

// Optional default export
export default { startGame };
