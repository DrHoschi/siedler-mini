// Entry-point integration with minimal DOM/canvas stubs, not browser/device evidence.
import assert from 'node:assert/strict';
const info=console.info;
console.info=()=>{};
const context=new Proxy({}, {get:(_target,key)=>key==='measureText'?()=>({width:10}):()=>{}});
class Element {
  dataset={};
  setAttribute() {} removeAttribute() {} addEventListener() {}
}
class Canvas extends Element {
  clientWidth=800; clientHeight=600;
  getContext() {return context;}
  getBoundingClientRect() {return {width:800,height:600,left:0,top:0};}
}
const canvas=new Canvas(), output=new Element(), status=new Element(), test=new Element(), storage=new Map();
globalThis.Element=Element;
globalThis.HTMLCanvasElement=Canvas;
globalThis.window={devicePixelRatio:1,addEventListener(){},setInterval:()=>0,clearInterval(){},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}};
globalThis.document={readyState:'loading',addEventListener(){},querySelector:s=>s==='#game-canvas'?canvas:s==='#runtime-status'?status:s==='#test-status'?test:s==='[data-im19g-population-housing-gold-state]'?output:null,querySelectorAll:()=>[]};
const errors=[];
process.on('unhandledRejection',e=>errors.push(String(e)));
await import('../main.js');
await new Promise(resolve=>setTimeout(resolve,100));
assert.equal(window.CleanRuntime.domains.units.ids().length,0);
assert.equal(window.CleanRuntime.im21fNewGameLifecycle.startFresh().status,'STARTED');
window.CleanRuntime.runtime.pause();
window.CleanRuntime.renderCurrentWorld();
assert.equal(output.dataset.population,'6');assert.equal(output.dataset.gold,'100');
await window.CleanRuntime.saveToBrowserStorage();
await import('../main.js?im38-reload-smoke=1');
await new Promise(resolve=>setTimeout(resolve,100));
assert.equal(window.CleanRuntime.domains.units.ids().length,0);
assert.equal(window.CleanRuntime.continueFromBrowserStorage().status,'CONTINUED');
window.CleanRuntime.runtime.pause();
assert.equal(output.dataset.population,'6');assert.equal(output.dataset.gold,'100');
assert.deepEqual(errors,[]);
console.info=info;
console.log('IM-38 main entry/New Game/HUD/Save/reload/Continue DOM-stub smoke PASS');
