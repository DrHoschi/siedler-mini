/* ============================================================================
 * Datei    : core/carrier.js
 * Projekt  : Neue Siedler – Epoche 1
 * Version  : v25.10.25-final+traces
 * Zweck    : Träger-Logik (Jobs annehmen → Ressource holen → ins HQ liefern)
 *
 * Events (emit):
 *   cb:carrier:job:accepted {res, from:{x,y}, to:{x,y}}
 *   cb:carrier:pickup:ok    {res, at:{x,y}}
 *   cb:carrier:pickup:fail  {res, at:{x,y}, reason}
 *   cb:carrier:deliver:ok   {res, qty, to:{x,y}}
 *   cb:carrier:idle         {id}
 *   cb:res:change           {res, delta, source:'carrier'} // Fallback
 *   cb:path:trace           {from:{x,y}, to:{x,y}}          // Weltpixel (Trampelpfad)
 *   cb:request-repaint      {}                              // nach Schritt
 * ============================================================================ */
(() => {
  'use strict';

  const LOG  = (...a)=> (window.CBLog?.info  ?? console.log )('[carrier]', ...a);
  const WARN = (...a)=> (window.CBLog?.warn  ?? console.warn)( '[carrier]', ...a);
  const EVT  = (n,d)=> { try{ window.dispatchEvent(new CustomEvent(n,{detail:d})); }catch{} };

  const VERSION = 'v25.10.25-final+traces';
  const ICON_SIZE = 20;
  const T = ()=> (window.Game?.tileSize || window.Entities?.state?.tile || 64);

  // ---- Adapter auf Game-API (defensiv) --------------------------------------
  const G = {
    isBlocked(tx,ty){
      if (typeof window.Game?.getObstacleAt === 'function') return !!window.Game.getObstacleAt(tx,ty);
      if (typeof window.Game?.isBlocked    === 'function') return !!window.Game.isBlocked(tx,ty);
      return false;
    },
    popJob(){
      if (typeof window.Game?.popJob === 'function') return window.Game.popJob() || null;
      return null;
    },
    takeFromBuilding(tx,ty,res){
      if (typeof window.Game?.takeFromBuilding === 'function') return window.Game.takeFromBuilding(tx,ty,res) || 0;
      return 0;
    },
    deliverToHQ(res,qty){
      if (typeof window.Game?.deliverToHQ === 'function') return window.Game.deliverToHQ(res,qty);
      // Fallback: minimal HUD-Event
      EVT('cb:res:change', { res, delta:qty, source:'carrier' });
      return true;
    }
  };

  // ---- Movement -------------------------------------------------------------
 /* function stepTowardFallback(u, tx, ty){
    if (u.x === tx && u.y === ty) return true;
    if (u.x < tx && !G.isBlocked(u.x+1,u.y)) u.x++;
    else if (u.x > tx && !G.isBlocked(u.x-1,u.y)) u.x--;
    else if (u.y < ty && !G.isBlocked(u.x,u.y+1)) u.y++;
    else if (u.y > ty && !G.isBlocked(u.x,u.y-1)) u.y--;
    return (u.x === tx && u.y === ty);
  }
  */
    // Einfacher Fallback-Schritt Richtung Ziel – aktuell benutzt für Träger.
  // NEU: Move-Slowdown über _moveSkip → Träger laufen nicht mehr so schnell.
  function stepTowardFallback(u, tx, ty){
    // Alle N Frames bewegen (hier: nur jeden 5. Frame = deutlich langsamer)
    const SKIP_FRAMES = 4; // 0 = jedes Frame, 4 = alle 5 Frames
    if (u._moveSkip == null) u._moveSkip = 0;

    if (u._moveSkip > 0){
      u._moveSkip--;
      return false; // noch nicht bewegen
    }

    u._moveSkip = SKIP_FRAMES;

    const dx = Math.sign(tx - u.x);
    const dy = Math.sign(ty - u.y);
    const nx = u.x + dx;
    const ny = u.y + dy;
    if (dx===0 && dy===0) return true;
    if (!isWalkable(nx,ny)) return false;
    u.x = nx;
    u.y = ny;
    return (u.x === tx && u.y === ty);
  }

  function ensureCarryIcon(u){
    if (u._iconElm) return;
    const el = document.createElement('img');
    el.style.position='absolute';
    el.style.width=ICON_SIZE+'px'; el.style.height=ICON_SIZE+'px';
    el.style.pointerEvents='none';
    el.style.zIndex='35';
    document.body.appendChild(el);
    u._iconElm = el;
  }
  function updateCarryIcon(u){
    if (!u._iconElm) return;
    const ts = T();
    if (u.carrying && u.carrying.res){
      u._iconElm.style.display='block';
      u._iconElm.src = `assets/icons/resources/${u.carrying.res}.png`;
      u._iconElm.style.left = (u.x*ts + 6) + 'px';
      u._iconElm.style.top  = (u.y*ts - 10) + 'px';
    } else {
      u._iconElm.style.display='none';
    }
  }

  // Optionaler Pfadplaner (AdFinder)
  function planPath(from, to){
    try{
      if (window.AdFinder?.findPath){
        const list = window.AdFinder.findPath({x:from.x,y:from.y},{x:to.x,y:to.y});
        if (Array.isArray(list) && list.length){
          return list.map(p => (typeof p.x==='number') ? {x:p.x,y:p.y} : {x:p[0],y:p[1]});
        }
      }
    }catch(e){ WARN('AdFinder.findPath:', e?.message||e); }
    return null;
  }
  function stepAlongPath(u){
    if (!Array.isArray(u._path) || u._path.length===0) return false;
    const next = u._path[0];
    if (u.x === next.x && u.y === next.y){
      u._path.shift();
      if (u._path.length===0) return true;
    }
    const tgt = u._path[0];
    return stepTowardFallback(u, tgt.x, tgt.y) && u._path.length===1;
  }

  // ---- Trampelpfad-Hook (Tiles → Weltpixel) ---------------------------------
  function traceMoveIfChanged(u, prevX, prevY){
    if (u.x === prevX && u.y === prevY) return;
    const ts = T();
    const fromPx = { x: prevX*ts, y: prevY*ts };
    const toPx   = { x: u.x*ts,   y: u.y*ts   };
    EVT('cb:path:trace', { from: fromPx, to: toPx });
    // Einen Frame anfordern (Overlay wird im selben Frame gezeichnet)
    try{ window.dispatchEvent(new Event('cb:request-repaint')); }catch{}
  }

  // ---- Runtime --------------------------------------------------------------
  const CarrierRuntime = {
    _initOnce: (()=>{ LOG(`Modul geladen (${VERSION})`); return true; })(),

    tick(u, dt, state){
      if (!u || typeof u.x!=='number' || typeof u.y!=='number') return;

      // Vorherige Tile-Pos merken (für Trampelspur)
      const px = u.x, py = u.y;

      // 1) Idle → Job holen
      if (!u.task){
        const job = G.popJob();
        if (job){
          u.task = { step:'toPickup', job };
          u._path = planPath({x:u.x,y:u.y}, job.from) || null;
          EVT('cb:carrier:job:accepted', { res: job.res, from: job.from, to: job.to });
        } else {
          EVT('cb:carrier:idle', { id: u.id ?? null });
          updateCarryIcon(u);
          return;
        }
      }

      const J = u.task.job;

      // 2) zur Abholstelle
      if (u.task.step === 'toPickup'){
        const reached = u._path ? stepAlongPath(u) : stepTowardFallback(u, J.from.x, J.from.y);
        if (reached){
          const got = G.takeFromBuilding(J.from.x, J.from.y, J.res);
          if (got > 0){
            u.carrying = { res:J.res, qty:1 };
            ensureCarryIcon(u);
            EVT('cb:carrier:pickup:ok', { res:J.res, at:J.from });
            u._path = planPath({x:u.x,y:u.y}, J.to) || null;
            u.task.step = 'toHQ';
          } else {
            EVT('cb:carrier:pickup:fail', { res:J.res, at:J.from, reason:'empty' });
            u.task = null;
            u._path = null;
          }
        }
      }

      // 3) zur Ablieferung
      else if (u.task.step === 'toHQ'){
        const reached = u._path ? stepAlongPath(u) : stepTowardFallback(u, J.to.x, J.to.y);
        if (reached){
          if (u.carrying){
            G.deliverToHQ(u.carrying.res, u.carrying.qty);
            EVT('cb:carrier:deliver:ok', { res:u.carrying.res, qty:u.carrying.qty, to:J.to });
          }
          u.carrying = null;
          u.task = null;
          u._path = null;
        }
      }

      // 4) Debug-Icon & Trampelspur nach tatsächlichem Schritt
      updateCarryIcon(u);
      traceMoveIfChanged(u, px, py);
    }
  };

  window.CarrierRuntime = CarrierRuntime;
})();
