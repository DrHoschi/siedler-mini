/* ============================================================================
 * Datei    : core/carrier.js
 * Projekt  : Neue Siedler – Epoche 1
 * Version  : v19.0.0 (2025-10-05)
 * Zweck    : Träger-Logik (Job holen → vom Gebäude holen → zur HQ liefern)
 * Hinweis  : Vereinfachtes Grid-Laufen (4-Richtungen, keine Diagonale)
 * ============================================================================
 */

(function(root, factory){
  root.CarrierRuntime = factory();
})(typeof window!=='undefined'?window:this, function(){

  function stepToward(u, tx, ty){
    if(Math.abs(u.x - tx) + Math.abs(u.y - ty) === 0) return true;
    if(u.x < tx && !Game.isBlocked(u.x+1,u.y)) u.x++;
    else if(u.x > tx && !Game.isBlocked(u.x-1,u.y)) u.x--;
    else if(u.y < ty && !Game.isBlocked(u.x,u.y+1)) u.y++;
    else if(u.y > ty && !Game.isBlocked(u.x,u.y-1)) u.y--;
    return (u.x===tx && u.y===ty);
  }

  function ensureCarryIcon(u){
    if(u._iconElm) return;
    const el = document.createElement('img');
    el.style.position='absolute';
    el.style.width='20px'; el.style.height='20px';
    el.style.pointerEvents='none';
    el.style.zIndex='35';
    document.body.appendChild(el);
    u._iconElm = el;
  }
  function updateCarryIcon(u){
    if(!u._iconElm) return;
    if(u.carrying && u.carrying.res){
      u._iconElm.style.display='block';
      u._iconElm.src = `assets/icons/resources/${u.carrying.res}.png`;
      u._iconElm.style.left = (u.x*Game.tileSize + 6) + 'px';
      u._iconElm.style.top  = (u.y*Game.tileSize - 10) + 'px';
    } else {
      u._iconElm.style.display='none';
    }
  }

  return {
    tick(u, dt, state){
      // 1) Job annehmen
      if(!u.task){
        const job = Game.popJob();
        if(job){
          u.task = { step:'toPickup', job };
        }
      }
      if(!u.task){ updateCarryIcon(u); return; }

      const J = u.task.job;
      if(u.task.step==='toPickup'){
        if(stepToward(u, J.from.x, J.from.y)){
          // Vom Gebäude 1x entnehmen
          const got = Game.takeFromBuilding(J.from.x, J.from.y, J.res);
          if(got>0){
            u.carrying = { res:J.res, qty:1 };
            ensureCarryIcon(u);
            u.task.step='toHQ';
          }else{
            // nichts da -> Job verwerfen
            u.task = null;
          }
        }
      } else if(u.task.step==='toHQ'){
        if(stepToward(u, J.to.x, J.to.y)){
          // Abliefern
          if(u.carrying){
            Game.deliverToHQ(u.carrying.res, u.carrying.qty);
          }
          u.carrying = null;
          u.task = null;
        }
      }

      updateCarryIcon(u);
    }
  };
});
