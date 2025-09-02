/* ============================================================================
 * core/pathfinder.js — v16.5.3
 * Projekt: Siedler-Mini
 * Zweck:
 *   - Hybrid-Pathfinding (A*):
 *       • mode 'roads': 4-Nachbarn, nutzt Road-Maske (Set "x,y")
 *       • mode 'offroad': 8-Nachbarn (Octile), mit Diagonalregeln
 *       • mode 'auto': versucht roads, fällt zurück auf offroad
 *   - Heatmap (Trampelpfade) zum Debuggen / Soft-Costs
 *   - Overlay-Zeichnung (optional) für Inspector-Ansicht
 *
 * Öffentliche API:
 *   PathFinder.init(getMapSizeFn)
 *   PathFinder.setRoadMask(Set|null)
 *   PathFinder.setObstacleProvider(fn|null)   // fn(tx,ty)=>true wenn blockiert
 *   PathFinder.invalidateRoads()
 *   PathFinder.applyHeat(path)                // path: [{x,y},...]
 *   PathFinder.findPath({from:{x,y}, to:{x,y}, mode:'auto'|'offroad'|'roads'})
 *   PathFinder.drawOverlay(ctx, cam)          // cam: {x,y,zoom} in Tiles
 *
 * Erwartete Game-Hooks (optional):
 *   Game.getTileSize() : number
 *   Game.getRoadSet()  : Set
 *   Game.getMapSize()  : {w,h}
 *   Game.getObstacleAt(tx,ty) : boolean
 *
 * Debug:
 *   window.DEBUG_PATH_OVERLAY = true → Heatmap & Pfadlinien sichtbar
 * ========================================================================== */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // internes State
  // ---------------------------------------------------------------------------
  var PF = (window.PathFinder = window.PathFinder || {});
  var _w = 0, _h = 0;                // Map-Größe in Tiles
  var _heat = null;                  // Float32Array[w*h]
  var _roadSet = null;               // Set("x,y") oder null
  var _blockerProvider = null;       // fn(tx,ty)=>true wenn blockiert
  var _lastPaths = [];               // für Overlay: Liste jüngster Pfade
  var _didLazyInit = false;          // einmaliger Lazy-Init-Schutz

  // sanfte Logs (fallen auf console.* zurück)
  function LOG(lvl, msg){
    try{
      if (window.CBLog){
        if (lvl==='ok')   return window.CBLog.ok(msg);
        if (lvl==='warn') return window.CBLog.warn(msg);
        if (lvl==='err')  return window.CBLog.err(msg);
        return window.CBLog.push(lvl||'log', msg);
      }
    }catch(_){}
    var c = (lvl==='err' ? 'error' : lvl==='warn' ? 'warn' : 'log');
    (console[c]||console.log)(msg);
  }

  // ---------------------------------------------------------------------------
  // Utilities / Gitter
  // ---------------------------------------------------------------------------
  function idx(x,y){ return y*_w + x; }
  function inb(x,y){ return x>=0 && y>=0 && x<_w && y<_h; }
  function key(x,y){ return x + ',' + y; }
  function isRoad(x,y){ return _roadSet && _roadSet.has(key(x,y)); }
  function isBlocked(x,y){
    if (!inb(x,y)) return true;
    if (_blockerProvider && _blockerProvider(x,y)) return true;
    return false;
  }

  function heuristic(x0,y0,x1,y1){
    // Octile (für 8-Nachbarn), guter Allrounder
    var dx = Math.abs(x1-x0), dy = Math.abs(y1-y0);
    var F = Math.SQRT2 - 1;
    return (dx<dy) ? F*dx + dy : F*dy + dx;
  }

  // 4-Nachbarn
  var N4 = [[1,0],[-1,0],[0,1],[0,-1]];
  // 8-Nachbarn (Diagonalen ohne "Ecken schneiden": beide Orthogonalen prüfen)
  var N8 = [
    [1,0],[-1,0],[0,1],[0,-1],
    [1,1],[1,-1],[-1,1],[-1,-1]
  ];

  function neighborsRoad(x,y, out){
    for (var i=0;i<4;i++){
      var dx=N4[i][0], dy=N4[i][1], nx=x+dx, ny=y+dy;
      if (!inb(nx,ny)) continue;
      if (isBlocked(nx,ny)) continue;
      if (!isRoad(nx,ny)) continue;
      out.push([nx,ny,1]);
    }
    return out;
  }

  function neighborsOffroad(x,y,out){
    for (var i=0;i<N8.length;i++){
      var dx=N8[i][0], dy=N8[i][1], nx=x+dx, ny=y+dy;
      if (!inb(nx,ny)) continue;
      if (isBlocked(nx,ny)) continue;

      // Diagonalen nur erlauben, wenn nicht beide Orthogonalen blockiert sind
      if (dx!==0 && dy!==0){
        var b1 = isBlocked(x+dx, y);
        var b2 = isBlocked(x, y+dy);
        if (b1 && b2) continue;
      }
      var cost = (dx===0 || dy===0) ? 1 : Math.SQRT2;
      // Heatmap: oft belaufene Felder minimal günstiger (Soft-Cost)
      if (_heat){
        var h = _heat[idx(nx,ny)] || 0;
        cost = Math.max(0.05, cost * (1.0 - Math.min(0.2, h*0.01)));
      }
      out.push([nx,ny,cost]);
    }
    return out;
  }

  // A* auf Grid
  function astar(sx,sy, tx,ty, mode){
    if (sx===tx && sy===ty) return [{x:sx,y:sy}];
    var open = new MinHeap();
    var g = new Float32Array(_w*_h); for (var i=0;i<g.length;i++) g[i]=Infinity;
    var came = new Int32Array(_w*_h); for (var j=0;j<came.length;j++) came[j]=-1;

    function push(x,y, gval, fval){ open.push({x:x,y:y,f:fval}); g[idx(x,y)]=gval; }
    function pop(){ return open.pop(); }

    push(sx,sy, 0, heuristic(sx,sy,tx,ty));
    var iter=0, maxIter = _w*_h*4;

    while (!open.empty() && iter++<maxIter){
      var cur = pop(); var cx=cur.x, cy=cur.y; var ci=idx(cx,cy);
      if (cx===tx && cy===ty){
        // reconstruct
        var path=[{x:tx,y:ty}];
        while (came[ci]!==-1){
          var pi=came[ci], py=(pi/_w)|0, px=(pi%_w)|0;
          path.push({x:px,y:py}); ci=pi;
        }
        path.reverse();
        return path;
      }
      var neigh=[];
      if (mode==='roads') neighborsRoad(cx,cy,neigh);
      else neighborsOffroad(cx,cy,neigh);

      for (var k=0;k<neigh.length;k++){
        var nx=neigh[k][0], ny=neigh[k][1], step=neigh[k][2];
        var ni=idx(nx,ny);
        var ng=g[ci]+step;
        if (ng<g[ni]){
          came[ni]=ci;
          g[ni]=ng;
          var h = heuristic(nx,ny,tx,ty);
          var f = ng + (mode==='roads'? (h*1.2) : h);
          open.push({x:nx,y:ny,f:f});
        }
      }
    }
    return null;
  }

  // kleiner Bin-Heap für Open-Liste
  function MinHeap(){
    this.a=[];
  }
  MinHeap.prototype.empty=function(){ return this.a.length===0; };
  MinHeap.prototype.push=function(n){
    var a=this.a; a.push(n); var i=a.length-1;
    while(i>0){ var p=((i-1)>>1); if (a[p].f<=n.f) break; a[i]=a[p]; i=p; }
    a[i]=n;
  };
  MinHeap.prototype.pop=function(){
    var a=this.a; var n=a[0]; var x=a.pop(); if(a.length){ var i=0;
      while(true){ var l=i*2+1, r=l+1, s=i;
        if (l<a.length && a[l].f<a[s].f) s=l;
        if (r<a.length && a[r].f<a[s].f) s=r;
        if (s===i) break; a[i]=a[s]; i=s;
      }
      // place x
      while(i>0){ var p=((i-1)>>1); if (a[p].f<=x.f) break; a[i]=a[p]; i=p; }
      a[i]=x;
    }
    return n;
  };

  // ---------------------------------------------------------------------------
  // Öffentliche API
  // ---------------------------------------------------------------------------
  PF.init = function(getMapSize){
    try{
      var s = getMapSize && getMapSize();
      _w = (s && s.w)|0; _h=(s && s.h)|0;
      if (_w<=0 || _h<=0){ LOG('warn', '[PF] init: ungültige Größe '+JSON.stringify(s)); return; }
      _heat = new Float32Array(_w*_h);
      LOG('ok', '[PF] init OK '+_w+'x'+_h);
    }catch(e){
      LOG('warn', '[PF] init Fehler: '+(e&&e.message));
    }
  };

  PF.setRoadMask = function(set){ _roadSet = set||null; };
  PF.setObstacleProvider = function(fn){ _blockerProvider = (typeof fn==='function') ? fn : null; };
  PF.invalidateRoads = function(){ /* später evtl. Cache leeren */ };

  PF.applyHeat = function(path){
    if (!_heat || !path) return;
    for (var i=0;i<path.length;i++){
      var p=path[i]; if (inb(p.x,p.y)) _heat[idx(p.x,p.y)] += 1;
    }
    _lastPaths.push(path);
    if (_lastPaths.length>6) _lastPaths.shift();
  };

  // --- LAZY-INIT: falls vergessen wurde, init() nachzuholen -------------------
  function tryLazyInit(){
    if (_didLazyInit) return;
    if (_w>0 && _h>0 && _heat) return;
    try{
      if (window.Game && typeof Game.getMapSize==='function'){
        PF.init(Game.getMapSize);
        _didLazyInit = true;
        if (window.Game && typeof Game.getObstacleAt==='function') PF.setObstacleProvider(Game.getObstacleAt);
        if (window.Game && typeof Game.getRoadSet==='function')   PF.setRoadMask(Game.getRoadSet());
        LOG('ok','[PF] Lazy-Init durchgeführt.');
      }
    }catch(_){}
  }

  PF.findPath = function(cfg){
    tryLazyInit();

    if (!cfg || !cfg.from || !cfg.to){
      LOG('warn','[PF] findPath: ungültige Parameter'); return null;
    }
    if (!_w || !_h || !_heat){
      LOG('warn','[PF] findPath ohne init() aufgerufen'); return null;
    }

    var sx=(cfg.from.x|0), sy=(cfg.from.y|0);
    var tx=(cfg.to.x|0),   ty=(cfg.to.y|0);
    var mode = cfg.mode || 'auto';

    if (isBlocked(sx,sy) || isBlocked(tx,ty)){
      LOG('warn','[PF] Start/Ziel blockiert'); return null;
    }

    var path=null;
    if (mode==='roads'){
      if (isRoad(sx,sy) && isRoad(tx,ty)){
        path = astar(sx,sy,tx,ty,'roads');
      } else {
        path = null;
      }
    } else if (mode==='offroad'){
      path = astar(sx,sy,tx,ty,'offroad');
    } else {
      // auto: erst roads, dann offroad
      if (isRoad(sx,sy) && isRoad(tx,ty)){
        path = astar(sx,sy,tx,ty,'roads');
      }
      if (!path) path = astar(sx,sy,tx,ty,'offroad');
    }

    if (path && path.length){
      PF.applyHeat(path);
      return path;
    } else {
      LOG('warn','[PF] kein Pfad '+sx+','+sy+' → '+tx+','+ty);
      return null;
    }
  };

  PF.drawOverlay = function(ctx, cam){
    try{
      if (!window.DEBUG_PATH_OVERLAY) return;
      if (!ctx || !_heat) return;

      var tile = 64;
      try { tile = (window.Game && Game.getTileSize) ? (Game.getTileSize()|0) : 64; } catch(_){}

      var camx = (cam && typeof cam.x==='number') ? cam.x : 0;
      var camy = (cam && typeof cam.y==='number') ? cam.y : 0;
      var zoom = (cam && typeof cam.zoom==='number') ? cam.zoom : 1;

      // Heatmap
      var max=0; for (var i=0;i<_heat.length;i++) if (_heat[i]>max) max=_heat[i];
      if (max>0){
        for (var y=0;y<_h;y++){
          for (var x=0;x<_w;x++){
            var v=_heat[idx(x,y)]/max; if (v<=0) continue;
            var a = Math.min(0.35, 0.05 + v*0.3);
            ctx.fillStyle = 'rgba(255,0,0,'+a+')';
            ctx.fillRect(x*tile - camx*tile, y*tile - camy*tile, tile, tile);
          }
        }
      }
      // letzte Pfade
      ctx.lineWidth = Math.max(1, (2/zoom));
      for (var i=0;i<_lastPaths.length;i++){
        var p=_lastPaths[i]; if (!p || p.length<2) continue;
        ctx.beginPath();
        for (var k=0;k<p.length;k++){
          var xx=p[k].x*tile - camx*tile + tile/2;
          var yy=p[k].y*tile - camy*tile + tile/2;
          if (k===0) ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy);
        }
        ctx.strokeStyle = 'rgba(0,128,255,0.9)';
        ctx.stroke();
      }
    }catch(_){}
  };

})();
/* ============================================================================
 * Inspector: Tests-Panel — v16.5.5
 * Projekt: Siedler-Mini
 * Features:
 *   - Pfad-Overlay Toggle (window.DEBUG_PATH_OVERLAY)
 *   - Ressourcen-Adder (type + amount)
 * Events:
 *   - dispatchEvent('cb:toggle-path-overlay', {detail:{enabled}})
 *   - dispatchEvent('cb:add-resources', {detail:{type, amount}})
 * Verhalten:
 *   - Hängt sich NUR an den echten Inspector (#inspector), niemals Autocreate.
 *   - Nutzt MutationObserver + sanftes Polling, um den richtigen Zeitpunkt
 *     zu erwischen (wenn der Inspector-Button den Root erzeugt).
 * ========================================================================== */
(function () {
  'use strict';

  var MOD = '[inspector.tests]';
  function ok(m){ try{ (window.CBLog?.ok||console.log)(m); }catch(_){} }
  function warn(m){ try{ (window.CBLog?.warn||console.warn)(m); }catch(_){} }

  var panelAttached = false;
  var pollTimer = 0;
  var pollDeadline = 0;
  var observer = null;

  // --------- Panel bauen und anhängen ----------------------------------------
  function buildPanel(root){
    if (!root || panelAttached) return;

    var panel=document.createElement('div');
    panel.id='inspector-tests';
    panel.setAttribute('aria-label','Inspector Tests');
    panel.style.padding='10px';
    panel.style.borderTop='1px dashed #3a3a3a';
    panel.style.background='rgba(0,0,0,.12)';

    var title=document.createElement('div');
    title.textContent='Tests';
    title.style.fontWeight='700';
    title.style.margin='0 0 8px';
    panel.appendChild(title);

    // Toggle: Pfad-Overlay
    var row=document.createElement('div');
    row.style.display='flex'; row.style.alignItems='center';
    row.style.gap='8px'; row.style.margin='6px 0 8px';
    var chk=document.createElement('input'); chk.type='checkbox'; chk.id='dbg-path-overlay';
    chk.checked=!!window.DEBUG_PATH_OVERLAY;
    var lbl=document.createElement('label'); lbl.htmlFor='dbg-path-overlay'; lbl.textContent='Pfad-Overlay anzeigen';
    chk.addEventListener('change', function(){
      var enabled=!!chk.checked; window.DEBUG_PATH_OVERLAY=enabled;
      window.dispatchEvent(new CustomEvent('cb:toggle-path-overlay',{detail:{enabled}}));
      ok(MOD+' Pfad-Overlay: '+(enabled?'AN':'AUS'));
      try{ window.requestAnimationFrame?.(()=>window.dispatchEvent(new Event('cb:request-repaint')));}catch(_){}
    });
    row.appendChild(chk); row.appendChild(lbl);
    panel.appendChild(row);

    // Ressourcen-Adder
    var grid=document.createElement('div'); grid.style.display='grid';
    grid.style.gridTemplateColumns='1fr 110px'; grid.style.gap='6px'; grid.style.margin='6px 0';
    var inpType=document.createElement('input'); inpType.type='text'; inpType.placeholder='Typ (wood, stone, …)';
    inpType.id='res-type'; inpType.autocomplete='off'; inpType.style.padding='6px 8px';
    inpType.style.background='#181818'; inpType.style.border='1px solid #333'; inpType.style.color='#eee';
    inpType.value='wood';
    var inpAmt=document.createElement('input'); inpAmt.type='number'; inpAmt.min='1'; inpAmt.step='1';
    inpAmt.placeholder='Menge'; inpAmt.id='res-amount'; inpAmt.style.padding='6px 8px';
    inpAmt.style.background='#181818'; inpAmt.style.border='1px solid #333'; inpAmt.style.color='#eee';
    inpAmt.value='10';
    grid.appendChild(inpType); grid.appendChild(inpAmt);
    panel.appendChild(grid);

    var action=document.createElement('div'); action.style.display='flex'; action.style.alignItems='center'; action.style.gap='8px';
    var btn=document.createElement('button'); btn.textContent='Ressourcen hinzufügen';
    btn.style.padding='6px 10px'; btn.style.background='#2b6cb0'; btn.style.border='1px solid '#2a4365';
    btn.style.color='#fff'; btn.style.borderRadius='4px'; btn.style.cursor='pointer';
    var status=document.createElement('div'); status.id='res-status'; status.style.flex='1'; status.style.minHeight='1.2em';
    btn.addEventListener('click', function(){
      var type=String(inpType.value||'').trim(); var amount=Math.max(1, parseInt(inpAmt.value||'0',10)||0);
      if(!type){ status.textContent='Bitte Ressourcentyp angeben.'; status.style.color='#f6ad55'; warn(MOD+' add-res: fehlender Typ'); return; }
      window.dispatchEvent(new CustomEvent('cb:add-resources',{detail:{type,amount}}));
      var okDirect=false;
      try{ if(window.Game && typeof Game.addResources==='function'){ Game.addResources(type,amount); okDirect=true; } }catch(_){}
      if(okDirect){ status.textContent=`+${amount} ${type}`; status.style.color='#68d391'; ok(MOD+` add-res OK: +${amount} ${type}`); }
      else { status.textContent=`Event gesendet: +${amount} ${type} (Game.addResources nicht gefunden)`; status.style.color='#63b3ed'; warn(MOD+' add-res: Event gesendet, direkte API nicht verfügbar'); }
    });
    action.appendChild(btn); action.appendChild(status);
    panel.appendChild(action);

    root.appendChild(panel);
    panelAttached = true;
    ok(MOD+' angehängt (v16.5.5)');

    // Wenn der Inspector später neu aufgebaut wird, dürfen wir erneut anhängen
    // → wir beobachten weiterhin das DOM (observer bleibt aktiv).
  }

  // --------- Root-Finder: robust (Observer + Poll) ---------------------------
  function tryAttach(){
    var root = document.querySelector('#inspector');
    if (root && !panelAttached) buildPanel(root);
  }

  function startPolling(ms, maxMs){
    if (pollTimer) clearInterval(pollTimer);
    pollDeadline = Date.now() + (maxMs||60000);
    pollTimer = setInterval(function(){
      if (panelAttached || Date.now()>pollDeadline){ clearInterval(pollTimer); pollTimer=0; return; }
      tryAttach();
    }, ms||250);
  }

  function startObserver(){
    if (observer) return;
    try{
      observer = new MutationObserver(function(muts){
        for (var i=0;i<muts.length;i++){
          var list = muts[i].addedNodes;
          for (var j=0;j<list.length;j++){
            var n = list[j];
            if (n && n.nodeType===1){
              if (n.id==='inspector' || n.querySelector?.('#inspector')){
                tryAttach();
                if (panelAttached){ /* weiter beobachten, falls Inspector recycelt wird */ }
              }
            }
          }
        }
      });
      observer.observe(document.body, { childList:true, subtree:true });
    }catch(_){}
  }

  // --------- Hooks: auf Spielstart & potentielle UI-Events hören -------------
  window.addEventListener('cb:game-started', function(){
    // Ab jetzt wissen wir: der Button kann den Inspector erzeugen -> wir horchen & pollen
    startObserver();
    startPolling(250, 60000);
    tryAttach();
  });

  // Optionaler Hook: falls euer Inspector beim Öffnen ein Event feuert
  window.addEventListener('cb:inspector-open', function(){
    startObserver();
    startPolling(250, 60000);
    tryAttach();
  });

  // Falls Spielseite ohne Events → trotzdem nach kurzer Zeit mal probieren
  // (schadet nicht und läuft nur kurz)
  setTimeout(function(){ startObserver(); startPolling(250, 10000); tryAttach(); }, 1500);
})();
