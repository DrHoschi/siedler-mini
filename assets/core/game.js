/* ============================================================================
 * Neue Siedler – Core Engine
 * Datei: core/game.js
 * Version: v18.1.0
 *
 * Zweck:
 *  - Zentrale GameCore-Engine (State + Events + Loop)
 *  - Integrierte Gebäude-Bridge (Platzierung + Zeichnen)
 *  - Platzhalter-Rechtecke mit Kategorienfarben, falls Sprites fehlen
 * ============================================================================
 */
(function(){
  'use strict';

  const L = {
    info:(...a)=> (window.CBLog?.info||console.log)('[GameCore]',...a),
    ok  :(…a)=> (window.CBLog?.ok  ||console.log)('[GameCore]',...a),
    warn:(...a)=> (window.CBLog?.warn||console.warn)('[GameCore]',...a),
    err :(…a)=> (window.CBLog?.error||console.error)('[GameCore]',...a),
  };

  if (window.GameCore?.Engine) { L.warn('bereits init – skip'); return; }

  const GameCore = (window.GameCore = window.GameCore||{});
  const state = (GameCore.state = GameCore.state||{
    version:'18.1.0',
    map:{tile:64,cols:16,rows:16,url:null,data:null},
    entities:{buildings:[],_idseq:0},
    ui:{started:false}
  });

  // --- Utils ------------------------------------------------------------
  const DPR = Math.max(1, window.devicePixelRatio||1);
  const SPRITES = new Map();

  function snap(v){ const t=state.map.tile||64; return Math.round(v/t)*t; }
  function getCanvas(){ return document.getElementById('game')||document.querySelector('canvas'); }
  function camCenter(){
    const cam=window.GameCamera, cvs=getCanvas();
    if(!cam||!cvs) return {x:0,y:0};
    const w=(cvs.width/DPR)/(cam.scale||1), h=(cvs.height/DPR)/(cam.scale||1);
    return {x:(cam.x||0)+w/2,y:(cam.y||0)+h/2};
  }

  // --- Platzhalter-Farben je Kategorie ---------------------------------
  const CAT_COLOR={
    admin : 'rgba(52,152,219,0.7)',   // Verwaltung blau
    food  : 'rgba(46,204,113,0.7)',   // Nahrung grün
    res   : 'rgba(160,82,45,0.7)',    // Rohstoffe braun
    home  : 'rgba(149,165,166,0.7)',  // Wohnen grau
    mil   : 'rgba(231,76,60,0.7)',    // Militär rot
    deco  : 'rgba(241,196,15,0.7)',   // Deko gelb
    other : 'rgba(155,89,182,0.7)'    // Sonstiges lila
  };
  function kindToCat(kind){
    if(/hq|depot|rathaus/.test(kind)) return 'admin';
    if(/farm|fisher|mill|baker/.test(kind)) return 'food';
    if(/lumber|stone|smith|mine/.test(kind)) return 'res';
    if(/house/.test(kind)) return 'home';
    if(/tower|guard|soldier|mil/.test(kind)) return 'mil';
    if(/tree|grass|sand|rock/.test(kind)) return 'deco';
    return 'other';
  }

  // --- Buildings --------------------------------------------------------
  function loadSprite(kind){
    if(SPRITES.has(kind)) return SPRITES.get(kind);
    const img=new Image();
    img.onload =()=>L.ok('Sprite geladen:',kind);
    img.onerror=()=>{SPRITES.set(kind,'error');L.warn('Sprite fehlt:',kind);};
    img.src=`assets/buildings/${kind}.png`;
    SPRITES.set(kind,img);
    return img;
  }

  function place(kind,x,y){
    if(!kind) return null;
    if(typeof x!=='number'||typeof y!=='number'){ const c=camCenter(); x=c.x;y=c.y; }
    const t=state.map.tile||64;
    const b={id:++state.entities._idseq,kind,x:snap(x),y:snap(y),w:t,h:t};
    loadSprite(kind);
    state.entities.buildings.push(b);
    L.info('platziert:',kind,'→',b.x,b.y);
    return b;
  }

  window.drawEntities=function(ctx){
    for(const b of state.entities.buildings){
      const spr=SPRITES.get(b.kind);
      if(spr&&spr!=='error'&&spr.complete){
        ctx.drawImage(spr,b.x,b.y,b.w,b.h);
      } else {
        ctx.save();
        const cat=kindToCat(b.kind);
        ctx.fillStyle=CAT_COLOR[cat]||CAT_COLOR.other;
        ctx.strokeStyle='rgba(0,0,0,0.6)';
        ctx.lineWidth=2;
        ctx.fillRect(b.x,b.y,b.w,b.h);
        ctx.strokeRect(b.x+0.5,b.y+0.5,b.w-1,b.h-1);
        ctx.fillStyle='#111'; ctx.font='12px system-ui';
        ctx.fillText(b.kind,b.x+4,b.y+b.h/2+4);
        ctx.restore();
      }
    }
  };

  // --- Map / Start ------------------------------------------------------
  async function loadMapFromCanvas(){ /* wie zuvor … */ }
  async function start(mapUrl){ /* wie zuvor … */ }
  function stop(){ state.ui.started=false; }

  // --- Events ------------------------------------------------------------
  window.addEventListener('cb:build:place',ev=>place(ev?.detail?.kind,ev?.detail?.x,ev?.detail?.y));
  const onBuildAction=ev=>{
    const act=ev?.detail?.action||''; if(act.startsWith('place-')) place(act.slice(6));
  };
  window.addEventListener('build:action',onBuildAction);
  window.addEventListener('cb:build-action',onBuildAction);

  // --- API ---------------------------------------------------------------
  GameCore.Engine={start,stop};
  const Game=(window.Game=window.Game||{});
  Game.place=place; Game.state=state;

  L.info('Modul geladen env:'+(window.__ENV_VERSION__||'unknown'));
})();
