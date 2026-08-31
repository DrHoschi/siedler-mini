/* ============================================================================
 * SA-04 Physical Resource Piles
 * Version: v26.08.31-sa04-piles2
 * - uses the existing item master sprite atlas
 * - visualizes delivered construction material beside construction sites
 * - visualizes BuildingStock output beside production buildings
 * - suppresses the old construction resource dots while this visual layer is active
 * - visual layer only: authoritative quantities stay in delivered/BuildingStock
 * ========================================================================== */
(function(){
  'use strict';

  const TAG='[sa04-piles]';
  const LOG=(...a)=>(window.CBLog?.ok||console.log)(TAG,...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG,...a);
  const ATLAS='items_master_sprite';
  const FRAME_BY_RES={
    wood:'item_log',
    stone:'item_stone',
    fish:'item_food_fish',
    meat:'item_food_meat',
    pelt:'item_sack'
  };

  let atlasRequested=false;
  let rendererWrapped=false;
  let constructionWrapped=false;

  function ensureAtlas(){
    const A=window.Assets;
    if(!A?.loadAtlas) return false;
    if(A.hasAtlas?.(ATLAS) && A.getAtlas?.(ATLAS)?.ok) return true;
    if(atlasRequested) return false;
    atlasRequested=true;
    Promise.resolve(A.loadAtlas(
      ATLAS,
      'assets/items/items_master_sprite.json',
      'assets/items/items_master_sprite.PNG'
    )).catch(e=>WARN('Item-Atlas konnte nicht geladen werden',e));
    return false;
  }

  function buildings(){
    return Array.isArray(window.Game?.buildings) ? window.Game.buildings : [];
  }

  function frameFor(res){
    return FRAME_BY_RES[String(res||'').replace(/^res\./,'')] || 'item_crate';
  }

  function drawItem(ctx,frame,x,y,tileSize,scaleMul=1){
    const A=window.Assets;
    if(!A?.drawAtlasFrame || !A.getAtlas?.(ATLAS)?.ok) return;
    const scale=Math.max(0.15,Math.min(0.34,(Number(tileSize)||64)/210))*scaleMul;
    A.drawAtlasFrame(ctx,ATLAS,frame,x,y,{scale,align:'pivot'});
  }

  function drawCountedPile(ctx,entries,b,tileSize,offsetY){
    if(!entries.length) return;
    const t=Number(tileSize)||64;
    const bw=Math.max(1,Number(b.w)||1);
    const bh=Math.max(1,Number(b.h)||1);
    const cols=Math.max(3,Math.floor(bw*2.2));
    const baseX=(Number(b.x)||0)*t + t*0.45;
    const baseY=((Number(b.y)||0)+bh+offsetY)*t;
    const stepX=t*0.34;
    const stepY=t*0.23;
    let slot=0;

    for(const e of entries){
      const qty=Math.max(0,Math.floor(Number(e.qty)||0));
      const visible=Math.min(qty,8);
      for(let i=0;i<visible;i++){
        const col=slot%cols;
        const row=Math.floor(slot/cols);
        drawItem(
          ctx,
          frameFor(e.res),
          baseX+col*stepX,
          baseY+row*stepY,
          t,
          0.9
        );
        slot++;
      }
    }
  }

  function constructionEntries(b){
    if(!b || b.status==='done' || Number(b.buildStage)>=3) return [];
    const d=b.delivered;
    if(!d || typeof d!=='object') return [];
    return Object.entries(d)
      .filter(([,v])=>Number(v)>0)
      .map(([res,qty])=>({res,qty:Number(qty)||0}));
  }

  function stockByUid(){
    const map=new Map();
    const rows=window.BuildingStock?.snapshot?.() || [];
    for(const row of rows){
      if(!row?.bUid) continue;
      const entries=Object.entries(row)
        .filter(([k,v])=>k!=='bUid' && Number(v)>0)
        .map(([res,qty])=>({res,qty:Number(qty)||0}));
      if(entries.length) map.set(String(row.bUid),entries);
    }
    return map;
  }

  function drawOnMainCanvas(ctx,_cam,tileSize){
    if(!ctx || !ensureAtlas()) return;
    const stock=stockByUid();

    for(const b of buildings()){
      if(!b) continue;
      const construction=constructionEntries(b);
      if(construction.length){
        drawCountedPile(ctx,construction,b,tileSize,0.28);
        continue;
      }

      const entries=stock.get(String(b.uid||'')) || [];
      if(entries.length){
        drawCountedPile(ctx,entries,b,tileSize,0.28);
      }
    }
  }

  function wrapRenderer(){
    const R=window.Renderer;
    if(!R || rendererWrapped || typeof R.draw!=='function') return false;
    const raw=R.draw.bind(R);
    R.draw=function(gameArg){
      raw(gameArg);
      try{
        const g=gameArg || R.game || window.Game;
        const ctx=g?.ctx || R.ctx;
        if(ctx) drawOnMainCanvas(ctx,g?.camera,R.tile || g?.tileSize || 64);
      }catch(e){ WARN('Pile-Rendering fehlgeschlagen',e); }
    };
    rendererWrapped=true;
    LOG('Renderer-Hook aktiv');
    return true;
  }

  function wrapConstruction(){
    const C=window.GameConstruction;
    if(!C || constructionWrapped || typeof C.render!=='function') return false;
    const raw=C.render.bind(C);
    C.render=function(game){
      // The legacy construction renderer draws coloured circles for delivered
      // resources. Hide only those visual drops while preserving delivered data.
      const saved=[];
      for(const b of buildings()){
        if(!b || !Array.isArray(b.drops) || !b.drops.length) continue;
        saved.push([b,b.drops]);
        b.drops=[];
      }
      try{ return raw(game); }
      finally{
        for(const [b,drops] of saved) b.drops=drops;
      }
    };
    constructionWrapped=true;
    LOG('Construction-Dot-Suppression aktiv');
    return true;
  }

  const hookTimer=setInterval(()=>{
    try{ ensureAtlas(); }catch(_e){}
    try{ wrapRenderer(); }catch(e){ WARN('Renderer-Hook',e); }
    try{ wrapConstruction(); }catch(e){ WARN('Construction-Hook',e); }
    if(rendererWrapped && constructionWrapped) clearInterval(hookTimer);
  },100);

  window.SA04ResourcePiles={
    version:'v26.08.31-sa04-piles2',
    frameFor,
    ensureAtlas,
    drawOnMainCanvas,
    wrapRenderer,
    wrapConstruction
  };

  ensureAtlas();
})();
