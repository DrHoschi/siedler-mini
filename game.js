/* =========================================================================
 *  Siedler-Mini — game.js
 *  Version: v16.1.0
 *  Zweck: sehr einfache Spielschicht + Ressourcen & Build-API
 *  Public API (von index/ui genutzt):
 *    - window.GameLoader.start(mapPath)
 *    - window.CityBuilder (setTool/placeAt/addResources/toggleFreeBuild/getResources)
 *    - window.GameEditor.open()   (Dummy)
 *    - window.GameInspector.toggle() (Dummy)
 * ========================================================================= */

(function(){
  const V = 'v16.1.0';
  const log = (type,msg)=>window.__gameLog ? window.__gameLog(type, msg) : console.log(`[${type}] ${msg}`);

  // --- Canvas & simple state ------------------------------------------------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const Game = {
    map:{ width:0,height:0,tile:64 },
    running:false,
    tool:'cancel',
    freeBuild:false,
    resources:{ wood:30, stone:30, coins:50 }, // Startwerte (anpassbar)
    costs:{
      road:   { stone:2 },
      path:   { wood:1 },
      house:  { wood:10, stone:5, coins:20 },
      factory:{ stone:20, coins:50 },
      bulldoze:{}, cancel:{}
    },
    placed:[], // demo: merken was gesetzt wurde
  };

  function fitCanvas(){
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    const w = Math.floor(window.innerWidth);
    const h = Math.floor(window.innerHeight - 120); // Platz für Build-Bar
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w+'px'; canvas.style.height = h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    log('ok', `Canvas ${w}x${h} dpr:${dpr}`);
    renderPlaceholder();
  }
  window.addEventListener('resize', fitCanvas);

  function renderPlaceholder(){
    // sehr simpler Hintergrund
    ctx.fillStyle = '#2c5a3e';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px ui-sans-serif';
    ctx.fillText('PLACEHOLDER-RENDER (game.js '+V+')', 12, 24);
    ctx.globalAlpha = 1;
    // grobes Grid
    const t = Game.map.tile||64;
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    for(let x=0;x<canvas.width;x+=t){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
    for(let y=0;y<canvas.height;y+=t){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
    // Zeichne platzierte Items
    Game.placed.forEach(p=>{
      const x=p.x*t, y=p.y*t;
      ctx.fillStyle = {road:'#7aa4b2', path:'#d7c28a', house:'#e8f1ff', factory:'#d0d6ff', bulldoze:'#ffb4b4'}[p.type]||'#fff';
      ctx.fillRect(x+4,y+4,t-8,t-8);
    });
  }

  // --- Ressourcen -----------------------------------------------------------
  function hasResources(cost){
    if (Game.freeBuild) return true;
    return Object.entries(cost).every(([k, v]) => (Game.resources[k]||0) >= v);
  }
  function spend(cost){
    if (Game.freeBuild) return true;
    Object.entries(cost).forEach(([k,v]) => Game.resources[k]=(Game.resources[k]||0)-v);
    CityBuilderUI?.syncResources?.(Game.resources);
  }
  function addRes(delta){
    Object.entries(delta).forEach(([k,v]) => Game.resources[k]=(Game.resources[k]||0)+v);
    CityBuilderUI?.syncResources?.(Game.resources);
  }

  // --- Platzieren -----------------------------------------------------------
  function place(type, gx, gy){
    const cost = Game.costs[type] || {};
    if (!hasResources(cost)) { log('warn', `Zu wenig Ressourcen für ${type}`); return false; }
    spend(cost);
    Game.placed.push({type,x:gx,y:gy});
    log('ok', `Platziert: ${type} @ (${gx},${gy})`);
    renderPlaceholder();
    return true;
  }

  // --- Map-Loader (Minimal) -------------------------------------------------
  async function loadMap(path){
    // Dummy: liest nur meta (width/height/tile) – genug für Demo
    const res = await fetch(path, {cache:'reload'});
    const json = await res.json();
    const w=json.width|0, h=json.height|0, tile=json.tile||64;
    if (!w || !h){ log('err','Start fehlgeschlagen: Map: width/height fehlen oder sind 0'); return false; }
    Game.map.width=w; Game.map.height=h; Game.map.tile=tile;
    log('ok', `Map OK size ${w}x${h} tile ${tile}`);
    return true;
  }

  // --- Öffentliche API ------------------------------------------------------
  window.GameLoader = {
    async start(path){
      log('ok', `GameLoader.start ${path}`);
      const ok = await loadMap(path);
      if (!ok) return;
      Game.running = true;
      renderPlaceholder();
      log('ok', 'Game started');
    }
  };

  // Editor / Inspector Dummies (Hooks von index)
  window.GameEditor = {
    open(){ log('ok','Editor geöffnet (Dummy)'); }
  };
  window.GameInspector = {
    _on:false,
    toggle(){ this._on=!this._on; log('ok', `Inspector: ${this._on?'an':'aus'}`); }
  };

  // CityBuilder API (von ui-build.js verwendet)
  window.CityBuilder = {
    version: V,
    setTool(t){ Game.tool = t; log('ok', `Tool gesetzt: ${t}`); },
    getTool(){ return Game.tool; },
    placeAt(gx,gy){ return place(Game.tool, gx, gy); },
    addResources(delta){ addRes(delta); log('ok', `Ressourcen +${JSON.stringify(delta)}`); },
    toggleFreeBuild(on){ Game.freeBuild = on; log(on?'ok':'warn', `Free-Build ${on?'an':'aus'}`); },
    getResources(){ return {...Game.resources}; },
    getCosts(){ return JSON.parse(JSON.stringify(Game.costs)); }
  };

  // Boot
  fitCanvas();
  log('ok', `game.js initialisiert (Index meldet ${window.__indexVersion||'unbekannt'})`);
  log('ok', `game.js geladen, ${V}`);
})();
