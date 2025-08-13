// V14.1 – Bootstrap, UI, Loop
import { loadAllAssets } from './core/assets.js';
import { Camera } from './core/camera.js';
import { makeInput } from './core/input.js';
import { Renderer } from './render.js';
import { makeWorld, placeRoad, placeBuilding } from './world.js';
import { Game, Tools } from './game.js';

const VERSION='V14.1';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', {alpha:false, desynchronized:true});

let world, game, cam, renderer, running=false;

function resize(){
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height= window.innerHeight* devicePixelRatio;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(devicePixelRatio, devicePixelRatio);
  cam.setViewport(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);

function markActiveTool(){
  document.querySelectorAll('[data-tool]').forEach(b=>{
    b.classList.toggle('active', toolFromBtn(b)===game.tool);
  });
}
function toolFromBtn(el){
  const m = el.getAttribute('data-tool');
  switch(m){
    case 'pointer': return Tools.POINTER;
    case 'road':    return Tools.ROAD;
    case 'hq':      return Tools.HQ;
    case 'lumber':  return Tools.LUMBER;
    case 'depot':   return Tools.DEPOT;
    case 'bulldoze':return Tools.BULL;
    default: return Tools.POINTER;
  }
}

function updateResUI(){
  rWood.textContent=game.resources.wood;
  rStone.textContent=game.resources.stone;
  rFood.textContent=game.resources.food;
  rGold.textContent=game.resources.gold;
  rCar.textContent=game.resources.carriers;
}

function worldFromScreen(sx,sy){
  // nutzt renderer.screenToWorldTile (korrigiert für zoom/offset)
  return renderer.screenToWorldTile(sx,sy);
}

async function init(){
  world = makeWorld(90,70);
  game = new Game(world);

  cam = new Camera(window.innerWidth, window.innerHeight, 128,64);
  renderer = new Renderer(ctx, cam, world);

  resize();
  updateResUI();
  markActiveTool();

  // Input
  makeInput(canvas,
    // Tap
    (sx,sy)=>{
      if (!running) return;
      const {tx,ty}=worldFromScreen(sx,sy);
      if (tx<0||ty<0||tx>=world.w||ty>=world.h) return;
      switch(game.tool){
        case Tools.ROAD: placeRoad(world,tx,ty); break;
        case Tools.HQ:   placeBuilding(world,tx,ty,'hq'); break;
        case Tools.LUMBER: placeBuilding(world,tx,ty,'lumber'); break;
        case Tools.DEPOT:  placeBuilding(world,tx,ty,'depot'); break;
        case Tools.BULL: world.buildings[ty][tx]=null; world.roads[ty][tx]=0; break;
        default: /* pointer */ break;
      }
    },
    // Pan
    (dx,dy)=>{ if (game.tool===Tools.POINTER) cam.pan(-dx,-dy); },
    // Pinch (Zoom)
    (factor,cx,cy)=>{
      cam.zoomAt(factor, cx, cy);
      zoomLabel.textContent=`Zoom ${cam.scale.toFixed(2)}×`;
    },
    ()=> game.tool===Tools.POINTER
  );

  // UI Buttons
  document.getElementById('toolCol').addEventListener('click', (ev)=>{
    const btn = ev.target.closest('[data-tool]'); if (!btn) return;
    game.setTool(toolFromBtn(btn)); markActiveTool();
  });

  centerBtn.addEventListener('click', ()=>{
    renderer.centerOnTile(game.hqPos.tx, game.hqPos.ty);
  });
  dbgBtn.addEventListener('click', ()=>{ game.debug=!game.debug; dbgBtn.classList.toggle('active',game.debug); });
  fsBtn.addEventListener('click', toggleFullscreen);

  // Overlay
  startBtn.addEventListener('click', startGame);
  startFsBtn.addEventListener('click', ()=>{ toggleFullscreen(); startGame(); });
  document.getElementById('startCard').addEventListener('dblclick', ()=>toggleFullscreen());

  await loadAllAssets(); // nach UI bereit
  renderer.centerOnTile(game.hqPos.tx, game.hqPos.ty);
  draw();
}

function toggleFullscreen(){
  const el=document.documentElement;
  if (!document.fullscreenElement){
    el.requestFullscreen?.().catch(()=>{});
  } else {
    document.exitFullscreen?.();
  }
}

function startGame(){
  if (running) return;
  running=true;
  overlay.style.display='none';
}

function draw(){
  renderer.draw();
  requestAnimationFrame(draw);
}

init().catch(err=>{
  alert('Startfehler: '+err?.message);
  console.error(err);
});
