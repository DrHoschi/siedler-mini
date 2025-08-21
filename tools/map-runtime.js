/* tools/map-runtime.js – Karten/Tileset laden + Render‑Probe + Logging */
window.MapRuntime = (function(){
  const log = (t,...a)=>console.log(`%c[${t}]`,"color:#9f7",...a);
  const warn= (t,...a)=>console.warn(`%c[${t}]`,"color:#fb7",...a);
  const err = (t,...a)=>console.error(`%c[${t}]`,"color:#f77",...a);
  const ST = window.__SM_STATE__ || {};

  async function fetchJSON(url){
    const t0 = performance.now();
    const res = await fetch(url,{cache:"no-store"});
    log("net", `${res.status} ${url} (${Math.round(performance.now()-t0)}ms)`);
    if(!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
  }
  function loadImage(url){
    return new Promise((res,rej)=>{
      const img=new Image();
      img.onload=()=>res(img);
      img.onerror=()=>rej(new Error("Image load failed: "+url));
      img.src=url+(url.includes("?")?"&":"?")+"bust="+Date.now();
    });
  }
  async function loadTileset(base, jsonRel, imgRel){
    const j = new URL(jsonRel, base).toString();
    const i = new URL(imgRel,  base).toString();
    log("atlas","base="+base);
    log("atlas","json="+jsonRel+" →", j);
    log("atlas","image="+imgRel+" →", i);
    const data = await fetchJSON(j);
    const image= await loadImage(i);
    return {data,image};
  }

  async function startSelected(url){
    const mapUrl = url || ST.mapUrl;
    if(!mapUrl){ warn("game","Keine Karte ausgewählt."); return; }

    log("game","Lade Karte:", mapUrl);
    let map;
    try{ map = await fetchJSON(mapUrl); }
    catch(e){ err("game","Karte konnte nicht geladen werden:", mapUrl); console.error(e); return; }
    log("game","Karte geladen:", mapUrl);

    const base = mapUrl.substring(0, mapUrl.lastIndexOf("/")+1);
    const atlasJsonRel = map?.atlas?.json  || "../tiles/tileset.json";
    const atlasImgRel  = map?.atlas?.image || "../tiles/tileset.png";

    let atlas=null;
    try{ atlas = await loadTileset(base, atlasJsonRel, atlasImgRel); }
    catch(e){ warn("game","Atlas konnte nicht geladen werden — fahre ohne Atlas fort."); console.warn(e); }

    renderMap(map, atlas);
  }

  function renderMap(map, atlas){
    const canvas=document.getElementById("game");
    const ctx=canvas.getContext("2d");
    const tile = (map.tileSize||64)|0;
    const W = (map.cols||16)*tile, H=(map.rows||16)*tile;

    if (canvas.width!==W || canvas.height!==H){
      canvas.width=W; canvas.height=H;
      if(window.__SM_STATE__){ __SM_STATE__.width=W; __SM_STATE__.height=H; }
    }

    ctx.imageSmoothingEnabled=false;
    ctx.fillStyle="#152536"; ctx.fillRect(0,0,W,H);

    const layer = Array.isArray(map.layers)&&map.layers[0];
    const frames = atlas?.data?.frames||{};
    const img = atlas?.image||null;

    if(!layer){
      // Fallback-Grid
      for(let x=0;x<=W;x+=tile){ ctx.fillStyle=(x/tile)%4===0?"#2a4058":"#1b2f45"; ctx.fillRect(x,0,1,H); }
      for(let y=0;y<=H;y+=tile){ ctx.fillStyle=(y/tile)%4===0?"#2a4058":"#1b2f45"; ctx.fillRect(0,y,W,1); }
      return;
    }

    for(let y=0;y<map.rows;y++){
      for(let x=0;x<map.cols;x++){
        const key = layer[y*map.cols + x];
        if(img && frames[key]){
          const f=frames[key];
          ctx.drawImage(img, f.x,f.y,f.w,f.h, x*tile, y*tile, tile, tile);
        }else{
          ctx.fillStyle = key ? "#345a2b" : "#384e66";
          ctx.fillRect(x*tile,y*tile,tile,tile);
        }
      }
    }
  }

  return { startSelected };
})();
