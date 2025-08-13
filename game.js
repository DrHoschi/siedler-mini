// game.js (V14.4)
// Minimal-Implementierung, damit Start nie ins Leere läuft.
// Ersetze Inhalt später durch dein echtes Spiel – Signatur beibehalten.

export function startGame({ canvas, ctx, DPR, onHUD, onTool, onZoom }){
  let W=0, H=0, zoom=1, tool='Zeiger';

  function setSize(w,h){
    W=w; H=h;
    if (canvas.width !== W || canvas.height !== H){ /* Sicherheit: handled in main */ }
  }

  function draw(){
    // hier nur ein dunkler Clear, main.js zeichnet das Platzhalter‑Grid/HQ bereits
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,W,H);
    // (Wenn du hier deine echte Render-Logik einfügst, bitte komplett zeichnen.)
  }

  function setTool(name){ tool=name; onTool?.(name); }
  function center(){ zoom=1; onZoom?.(zoom); draw(); }
  function toggleDebug(){ /* optional für später */ }

  // Beispiel‑HUD Update (setzt alle Startwerte auf 0 sichtbar)
  ['Wood','Stone','Food','Gold','Carrier','Zoom'].forEach((k,i)=>{
    const v = (k==='Zoom') ? zoom.toFixed(2)+'x' : 0;
    onHUD?.(k, v);
  });

  // einfache Maus‑Zoom‑Demo (Wheel) – kannst du übernehmen/ersetzen
  canvas.addEventListener('wheel', (e)=>{
    e.preventDefault();
    const dz = Math.exp(-e.deltaY * 0.0015);
    zoom = Math.min(2.5, Math.max(0.4, zoom*dz));
    onZoom?.(zoom);
  }, {passive:false});

  return { setSize, draw, setTool, center, toggleDebug };
}
