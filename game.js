/*  Siedler-Mini – Core
    Datei: game.js
    Version: v16.0.10
    Verantwortlich:
      - GameLifecycle, Map/Atlas laden (Mock)
      - Einfaches Tile-Grid + verbotene Tiles
      - Ressourcenverwaltung (Coins/Wood/Stone)
      - Schnittstellen für Build-UI (place/undo/canPlace/ghost)
*/

(function(global){
  const VERSION = 'v16.0.10';
  const state = {
    ctx:null, canvas:null,
    w:0,h:0,tile:64, cols:16, rows:10,
    dpr: Math.max(1, Math.min(3, window.devicePixelRatio||1)),
    mapName:null,
    grid: [],           // string IDs der platzierten Objekte
    forbid: new Set(),  // verbotene Felder (z.B. water,mountain)
    lastPlacement:null, // für Undo
    res: { coins: 200, wood: 50, stone: 30 },
    prices: {
      road:    { coins: 1,  wood:0, stone:0 },
      path:    { coins: 0,  wood:1, stone:0 },
      house:   { coins: 10, wood:10, stone:5 },
      factory: { coins: 30, wood:0,  stone:20 },
      bulldoze:{ coins: 0,  wood:0,  stone:0 },
    },
    buildCallbacks: null, // wird von ui-build.js registriert
  };

  // ---------- Utils ----------
  function logCanvas(){
    logOK(`Canvas ${state.w}x${state.h} dpr:${state.dpr}`);
  }
  function fitCanvas(){
    const root = document.getElementById('game-root');
    const rect = root.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height - 120); // Platz fürs Buildbar/HUD
    const c = state.canvas;
    const d = state.dpr;
    c.width  = Math.floor(w*d);
    c.height = Math.floor(h*d);
    c.style.width = w+'px';
    c.style.height= h+'px';
    state.w = w; state.h = h;
    state.ctx.setTransform(d,0,0,d,0,0);
    logCanvas();
    render();
  }
  function render(){
    const g = state.ctx; if(!g) return;
    g.fillStyle = '#2b553d';
    g.fillRect(0,0,state.w,state.h);

    // zeichne Grid
    const t = state.tile;
    g.strokeStyle = 'rgba(255,255,255,.06)';
    for(let x=0; x<=state.cols; x++){
      g.beginPath(); g.moveTo(x*t,0); g.lineTo(x*t, state.rows*t); g.stroke();
    }
    for(let y=0; y<=state.rows; y++){
      g.beginPath(); g.moveTo(0,y*t); g.lineTo(state.cols*t, y*t); g.stroke();
    }

    // verbotene Kacheln markieren
    g.fillStyle = 'rgba(255,0,0,.08)';
    state.forbid.forEach(key=>{
      const [cx,cy] = key.split(',').map(Number);
      g.fillRect(cx*t, cy*t, t, t);
    });

    // platzierte Objekte
    for(let y=0;y<state.rows;y++){
      for(let x=0;x<state.cols;x++){
        const id = state.grid[y][x];
        if(!id) continue;
        drawEntity(id, x, y);
      }
    }

    // Placeholder Wasser/Info
    g.fillStyle = 'rgba(255,255,255,.08)';
    g.fillRect(8,8,220,22);
    g.fillStyle = 'rgba(255,255,255,.4)';
    g.font = '12px ui-monospace';
    g.fillText('PLACEHOLDER-RENDER (game.js v16.0.10)',12,24);
  }
  function drawEntity(id,x,y){
    const g = state.ctx, t = state.tile;
    const px = x*t, py=y*t;
    g.save();
    if(id==='road'){ g.fillStyle='#5a7c66'; g.fillRect(px+10,py+26,t-20,12); }
    else if(id==='path'){ g.fillStyle='#d9c28a'; g.fillRect(px+18,py+30,t-36,6); }
    else if(id==='house'){ g.fillStyle='#b36c4b'; g.fillRect(px+14,py+18,t-28,t-26); g.fillStyle='#f5e2c3'; g.fillRect(px+26,py+30,12,12); }
    else if(id==='factory'){ g.fillStyle='#6b727b'; g.fillRect(px+10,py+14,t-20,t-20); g.fillStyle='#8b939c'; g.fillRect(px+18,py+6,22,10); }
    else if(id==='bulldoze'){ /* nix */ }
    g.restore();
  }
  function key(x,y){ return `${x},${y}`; }

  // ---------- Ressourcen / Preise ----------
  function hasResources(cost){
    return state.res.coins>=cost.coins && state.res.wood>=cost.wood && state.res.stone>=cost.stone;
  }
  function pay(cost){
    state.res.coins -= cost.coins;
    state.res.wood  -= cost.wood;
    state.res.stone -= cost.stone;
    updateHUD();
  }
  function refund(cost){
    state.res.coins += cost.coins;
    state.res.wood  += cost.wood;
    state.res.stone += cost.stone;
    updateHUD();
  }
  function updateHUD(){
    const c = document.getElementById('res-coins');
    const w = document.getElementById('res-wood');
    const s = document.getElementById('res-stone');
    c.textContent = `🟡 Coins: ${state.res.coins}`;
    w.textContent = `🪵 Wood: ${state.res.wood}`;
    s.textContent = `🪨 Stone: ${state.res.stone}`;
    // „bad“-Markierung, wenn negatives Budget (sollte nicht vorkommen, aber visuell nützlich)
    [c,w,s].forEach(el=> el.classList.remove('bad'));
    if(state.res.coins<0) c.classList.add('bad');
    if(state.res.wood<0)  w.classList.add('bad');
    if(state.res.stone<0) s.classList.add('bad');
  }

  // ---------- Platzierungs-API (für ui-build.js) ----------
  function canPlace(id, gx, gy){
    if(gx<0||gy<0||gx>=state.cols||gy>=state.rows) return { ok:false, reason:'außerhalb' };
    if(state.forbid.has(key(gx,gy))) return { ok:false, reason:'gesperrt' };
    if(id!=='bulldoze' && state.grid[gy][gx]) return { ok:false, reason:'belegt' };
    // einfache Terrain-Regel: z.B. Wasser/Berg simulieren in forbid
    return { ok:true };
  }
  function place(id, gx, gy){
    if(id==='bulldoze'){
      const prev = state.grid[gy][gx];
      if(!prev){ logWARN('Da ist nichts zum Abreißen.'); return false; }
      state.grid[gy][gx] = null;
      state.lastPlacement = { type:'bulldoze', prev, x:gx, y:gy, cost: state.prices.bulldoze };
      render();
      logOK(`Abgerissen @ (${gx},${gy})`);
      return true;
    }
    const cost = state.prices[id] || {coins:0,wood:0,stone:0};
    const chk = canPlace(id, gx, gy);
    if(!chk.ok){ logWARN(`Platzierung blockiert (${chk.reason}) @ (${gx},${gy})`); return false; }
    if(!hasResources(cost)){ logWARN(`Zu wenig Ressourcen für ${id}`); return false; }
    pay(cost);
    state.grid[gy][gx] = id;
    state.lastPlacement = { type:'place', id, x:gx, y:gy, cost };
    render();
    logOK(`Platziert: ${id} @ (${gx},${gy})`);
    return true;
  }
  function undo(){
    const last = state.lastPlacement;
    if(!last){ logWARN('Nichts zum Rückgängig machen.'); return; }
    if(last.type==='place'){
      state.grid[last.y][last.x] = null;
      refund(last.cost);
      render();
      logOK(`Rückgängig: ${last.id} @ (${last.x},${last.y})`);
    } else if(last.type==='bulldoze'){
      state.grid[last.y][last.x] = last.prev;
      render();
      logOK(`Rückgängig: Abriss @ (${last.x},${last.y})`);
    }
    state.lastPlacement = null;
  }

  // ---------- Ghost (UI nutzt setGhost/clearGhost) ----------
  function setGhost(ok, gx, gy){
    const el = document.getElementById('ghost');
    const t = state.tile;
    el.style.left = (gx*t)+'px';
    el.style.top  = (gy*t)+'px';
    el.style.width= t+'px';
    el.style.height=t+'px';
    el.style.background = ok ? getComputedStyle(document.documentElement).getPropertyValue('--ghost-ok')
                             : getComputedStyle(document.documentElement).getPropertyValue('--ghost-bad');
    el.style.display = 'block';
  }
  function clearGhost(){
    const el = document.getElementById('ghost');
    el.style.display = 'none';
  }

  // ---------- Simple Map Loader (Mock) ----------
  async function loadMap(url){
    // Wir simulieren Wasser/Berge, wenn die Map Größe vorgibt.
    // In echten Daten würdest du hier JSON laden.
    const sizes = {
      './assets/maps/map-mini.json' : { cols:16, rows:10 },
      './assets/maps/map-pro.json'  : { cols:20, rows:12 },
    };
    const s = sizes[url] || sizes['./assets/maps/map-mini.json'];
    state.cols = s.cols; state.rows = s.rows;
    state.grid = Array.from({length: state.rows}, ()=> Array(state.cols).fill(null));
    state.forbid.clear();
    // Beispiel: eine Wasserlinie oben + Bergblock rechts unten
    for(let x=0;x<state.cols;x++) state.forbid.add(key(x,0));
    for(let y=state.rows-3;y<state.rows;y++) state.forbid.add(key(state.cols-2,y));
    logOK('Map OK size '+state.cols+'x'+state.rows+' tile '+state.tile);
  }

  // ---------- Public API ----------
  const GameLoader = {
    async start(mapUrl){
      try{
        state.mapName = mapUrl;
        await loadMap(mapUrl);
        render();
        // HUD initial
        updateHUD();
        document.getElementById('hud').hidden = false;
        logOK('Game started');
      } catch(e){
        logERR('Start fehlgeschlagen: '+e.message);
        throw e;
      }
    },
    getVersion(){ return VERSION; },
    getPrices(){ return JSON.parse(JSON.stringify(state.prices)); },
    getResources(){ return JSON.parse(JSON.stringify(state.res)); },

    // Build API
    canPlace, place, undo,
    setGhost, clearGhost,

    // Grid Helper for UI cursor
    worldToCell(clientX, clientY){
      const rect = state.canvas.getBoundingClientRect();
      const x = Math.floor((clientX - rect.left) / state.tile);
      const y = Math.floor((clientY - rect.top)  / state.tile);
      return { x, y };
    },
    get size(){ return { cols:state.cols, rows:state.rows, tile:state.tile }; },

    // internal exposure
    _state: state,
  };

  // ---------- Boot ----------
  function boot(){
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    state.canvas = canvas; state.ctx = ctx;
    fitCanvas();
    window.addEventListener('resize', fitCanvas, { passive:true });
    logOK(`game.js initialisiert (Index meldet ${window.APP_VERSION})`);
    logOK(`game.js geladen, game.js ${VERSION}`);
  }

  // Expose
  global.GameLoader = GameLoader;

  // DOM ready
  window.addEventListener('load', ()=>{
    boot();
    // Editor/Inspector stubs werden ggf. von index überschrieben
  });

})(window);
