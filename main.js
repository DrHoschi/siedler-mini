// V15 main – Orchestrierung
import { createWorld } from './world.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { createStorage } from './storage.js';

export function createGame(opts){
  const hud = (k,v)=>opts.onHUD?.(k,v);
  const log = (m)=>opts.onLog?.(m);
  const err = (m)=>opts.onError?.(m);

  const state = {
    running:false,
    tool:'pointer',
    zoom:1,
    lastTs:0,
  };

  const storage = createStorage('siedler_v15');
  const world = createWorld({ onHUD: hud, log, err });
  const renderer = createRenderer({ canvas: opts.canvas, world, onHUD: hud });
  const input = createInput({
    canvas: opts.canvas,
    world,
    getTool: ()=>state.tool,
    setZoom: z => { state.zoom=z; hud('Zoom', z.toFixed(2)+'x'); },
    getZoom: ()=>state.zoom,
    moveCamera: (dx,dy)=>renderer.camera.pan(dx,dy),
    screenToWorld: (sx,sy)=>renderer.screenToWorld(sx,sy),
    onPlaceRoad: seg => world.addRoad(seg),
    onPlaceBuilding: (type, pos)=>world.placeBuilding(type,pos),
    onEraseAt: (pos)=>world.eraseAt(pos),
    onLog: log
  });

  function setTool(t){
    state.tool = t;
    world.cancelRoadStart();
    hud('Tool', ({
      pointer:'Zeiger', road:'Straße', hq:'HQ',
      woodcutter:'Holzfäller', depot:'Depot', erase:'Abriss'
    })[t] || t);
  }

  function tick(ts){
    if (!state.running){ renderer.draw(); return requestAnimationFrame(tick); }
    const dt = Math.min(0.05, (ts - state.lastTs)/1000 || 0);
    state.lastTs = ts;

    world.update(dt);
    renderer.draw();

    requestAnimationFrame(tick);
  }

  function start(){
    if (state.running) return;
    // Save laden (falls vorhanden)
    const save = storage.load();
    if (save) {
      try { world.fromJSON(save.world); renderer.camera.fromJSON(save.cam); }
      catch(e){ err('Save laden fehlgeschlagen, starte neu.'); storage.clear(); }
    } else {
      world.newGame();                         // neues Spiel
      renderer.camera.centerOn(world.center);  // Kamera mittig
    }

    state.zoom = renderer.camera.zoom;
    hud('Zoom', state.zoom.toFixed(2)+'x');
    setTool('pointer');
    state.running = true;
    requestAnimationFrame(tick);

    // Autosave alle 10s
    setInterval(()=> {
      try {
        storage.save({ world: world.toJSON(), cam: renderer.camera.toJSON() });
        log('💾 Autosave');
      } catch(e){ err('Autosave-Fehler: '+e.message); }
    }, 10000);
  }

  function center(){ renderer.camera.centerOn(world.center); }
  function resetSave(){ storage.clear(); }

  return { start, setTool, center, resetSave };
}
