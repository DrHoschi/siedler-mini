// boot.js
import { SiedlerMap } from './map-runtime.js';

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const debugOverlay = document.getElementById("debug-overlay");

let world = null;
let animationFrame = null;

// Canvas-Größe anpassen
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (world) world.setSize(canvas.width, canvas.height);
}
window.addEventListener("resize", resize);
resize();

// Map starten
async function start() {
  const mapFile = document.getElementById("mapSelect").value;
  world = new SiedlerMap(canvas, ctx, debugOverlay);
  await world.loadMap(`assets/maps/${mapFile}`);
  loop();
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (world) world.draw();
  animationFrame = requestAnimationFrame(loop);
}

// Buttons
document.getElementById("btnStart").addEventListener("click", start);
document.getElementById("btnReload").addEventListener("click", () => {
  if (world) world.reload();
});

// Auto-Start
if (document.getElementById("autoStart").checked) {
  start();
}
