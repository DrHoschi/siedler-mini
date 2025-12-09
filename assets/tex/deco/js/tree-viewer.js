/* ============================================================================
 * Datei   : assets/tex/deco/js/tree-viewer.js
 * Projekt : Trees Mega Atlas – Test-Viewer
 * Version : v25.12.09c (Grid-Viewer)
 * Zweck   : Lädt einen Atlas (PNG + assets.draw-JSON) und bietet:
 *             - Einzel-Frame-Viewer (großer Canvas)
 *             - Grid-Viewer (Mini-Atlas mit Raster & Klick-Auswahl)
 *             - einfache Animationen nach Prefix
 *
 * Unterstützt:
 *   - 7×7-Atlas (trees_mega_7x7.png/.json)
 *   - 8×8-Atlas (trees_mega_atlas*.png/.json)
 *   - sowie andere Kombinationen, solange tileW/tileH im JSON passen.
 * ==========================================================================*/

/* ============================================================================
 * [1] DOM-Referenzen
 * ==========================================================================*/
const canvas        = document.getElementById('treeCanvas');
const ctx           = canvas.getContext('2d');

const gridCanvas    = document.getElementById('gridCanvas');
const gridCtx       = gridCanvas.getContext('2d');

const atlasImageSel = document.getElementById('atlasImageSel');
const atlasJsonSel  = document.getElementById('atlasJsonSel');
const frameSelect   = document.getElementById('frameSelect');
const frameIndexInfo= document.getElementById('frameIndexInfo');
const canvasInfo    = document.getElementById('canvasInfo');

const btnPrev       = document.getElementById('btnPrev');
const btnNext       = document.getElementById('btnNext');

const animSelect    = document.getElementById('animSelect');
const btnPlay       = document.getElementById('btnPlay');
const btnPause      = document.getElementById('btnPause');
const speedRange    = document.getElementById('speedRange');
const speedInfo     = document.getElementById('speedInfo');

const debugOutput   = document.getElementById('debugOutput');

/* ============================================================================
 * [2] Zustands-Objekt
 * ==========================================================================*/
const state = {
  atlasImage: null,
  atlasData: null,

  frameNames: [],        // Liste aller Framenamen (in gewünschter Reihenfolge)
  frameMap: {},          // name -> {x,y,w,h,gx,gy}
  tileW: 128,
  tileH: 128,
  tilesX: 0,
  tilesY: 0,

  currentFrameIndex: 0,

  // Animation
  isPlaying: false,
  animFrames: [],
  animIndex: 0,
  animLastTime: 0,
  animDelay: 250
};

/* ============================================================================
 * [3] Debug-Helfer & Erkennung für "indexed" Namen
 * ==========================================================================*/
function logDebug(msg) {
  console.log('[TreesViewer]', msg);
  if (debugOutput) {
    debugOutput.textContent = String(msg);
  }
}

/**
 * Heuristik: erkenne neutrale Index-Namen wie tree_00_r0c0
 */
function looksIndexedNameList(names) {
  if (!names.length) return false;
  for (const name of names) {
    if (!name.startsWith('tree_')) return false;
    const parts = name.split('_');
    if (parts.length < 3) return false;
    const num = parts[1];
    if (!/^\d{2}$/.test(num)) return false;
  }
  return true;
}

/* ============================================================================
 * [4] Atlas laden (Bild + JSON) + Ableitung von Grid-Größe
 * ==========================================================================*/
async function loadAtlas() {
  const imgFile  = atlasImageSel.value;
  const jsonFile = atlasJsonSel.value;

  logDebug(`Lade Atlas: ${jsonFile} + ${imgFile}`);

  // JSON laden
  const jsonUrl = `assets/trees/${jsonFile}`;
  const res = await fetch(jsonUrl);
  if (!res.ok) {
    logDebug(`Fehler beim Laden von JSON: ${res.status} ${res.statusText}`);
    return;
  }
  const data = await res.json();
  state.atlasData = data;
  state.tileW = data.tileW || 128;
  state.tileH = data.tileH || 128;

  // Bild laden
  const imgUrl = `assets/trees/${imgFile}`;
  state.atlasImage = await loadImage(imgUrl);

  // Grid-Größe aus Bild + Tilegröße ableiten
  state.tilesX = Math.floor(state.atlasImage.width  / state.tileW);
  state.tilesY = Math.floor(state.atlasImage.height / state.tileH);

  // Frames aus JSON extrahieren
  parseFramesFromAssetsDraw(data);

  // UI füllen
  state.currentFrameIndex = 0;
  fillFrameSelect();
  buildAnimationsFromNames();

  updateCanvasInfo();
  renderCurrentFrame();
  renderGrid();

  logDebug(`Atlas geladen. Tiles: ${state.tilesX}×${state.tilesY}, Frames: ${state.frameNames.length}`);
}

// Promise-Image-Loader
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

/**
 * assets.draw → frameMap
 *
 * data.frames:
 *   "name": [gridX, gridY]
 */
function parseFramesFromAssetsDraw(data) {
  state.frameNames = [];
  state.frameMap = {};

  const frames = data.frames || {};

  // in Einfügereihenfolge sammeln
  for (const [name, coord] of Object.entries(frames)) {
    const gx = coord[0];
    const gy = coord[1];
    const x = gx * state.tileW;
    const y = gy * state.tileH;

    state.frameNames.push(name);
    state.frameMap[name] = { x, y, w: state.tileW, h: state.tileH, gx, gy };
  }

  // Nur nicht-indexed Namen alphabetisch sortieren
  if (!looksIndexedNameList(state.frameNames)) {
    state.frameNames.sort();
  }
}

/* ============================================================================
 * [5] UI-Helfer: Frame-Auswahlliste
 * ==========================================================================*/
function fillFrameSelect() {
  frameSelect.innerHTML = '';
  const total = state.frameNames.length;

  for (let i = 0; i < total; i++) {
    const name = state.frameNames[i];
    const f = state.frameMap[name];
    const labelIndex = i.toString().padStart(2, '0');

    const gridInfo =
      f && typeof f.gx === 'number' && typeof f.gy === 'number'
        ? `  [r${f.gy}c${f.gx}]`
        : '';

    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${labelIndex} – ${name}${gridInfo}`;
    frameSelect.appendChild(opt);
  }

  frameSelect.value = String(state.currentFrameIndex);
}

/* ============================================================================
 * [6] Animationen aus Namen ableiten
 * ==========================================================================*/
function buildAnimationsFromNames() {
  const groups = new Map(); // prefix -> [names]

  for (const name of state.frameNames) {
    const parts = name.split('_');
    let prefix;
    if (parts.length >= 3) {
      prefix = parts[0] + '_' + parts[1]; // e1_regrow, tree_00, ...
    } else if (parts.length === 2) {
      prefix = parts[0] + '_' + parts[1]; // cut_fall
    } else {
      prefix = parts[0];
    }

    if (!groups.has(prefix)) {
      groups.set(prefix, []);
    }
    groups.get(prefix).push(name);
  }

  animSelect.innerHTML = '';

  const optNone = document.createElement('option');
  optNone.value = '';
  optNone.textContent = '– (Einzelbild / kein Auto-Loop) –';
  animSelect.appendChild(optNone);

  const sortedPrefixes = Array.from(groups.keys()).sort();
  for (const prefix of sortedPrefixes) {
    const names = groups.get(prefix).slice().sort();
    const opt = document.createElement('option');
    opt.value = prefix;
    opt.textContent = `${prefix} (${names.length} Frames)`;
    animSelect.appendChild(opt);
  }

  animSelect.value = '';
  state.animFrames = [];
  state.isPlaying = false;
}

/* ============================================================================
 * [7] Einzel-Frame zeichnen
 * ==========================================================================*/
function renderCurrentFrame() {
  if (!state.atlasImage || !state.frameNames.length) return;

  const index = state.currentFrameIndex;
  const name  = state.frameNames[index];
  const frame = state.frameMap[name];
  if (!frame) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const scaleX = canvas.width  / state.tileW;
  const scaleY = canvas.height / state.tileH;
  const scale  = Math.min(scaleX, scaleY);

  const drawW = state.tileW * scale;
  const drawH = state.tileH * scale;
  const dx = (canvas.width  - drawW) / 2;
  const dy = (canvas.height - drawH) / 2;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    state.atlasImage,
    frame.x, frame.y, frame.w, frame.h,
    dx, dy, drawW, drawH
  );

  updateCanvasInfo();
  renderGrid(); // Highlight im Grid aktualisieren
}

function updateCanvasInfo() {
  if (!state.frameNames.length) {
    canvasInfo.textContent = 'Frame: (noch nicht geladen)';
    frameIndexInfo.textContent = '';
    return;
  }

  const i     = state.currentFrameIndex;
  const name  = state.frameNames[i];
  const frame = state.frameMap[name];
  const total = state.frameNames.length;

  const gridInfo = frame ? `  [r${frame.gy}, c${frame.gx}]` : '';

  canvasInfo.textContent = `Frame: ${name}${gridInfo}`;
  frameIndexInfo.textContent = `Index: ${i + 1}/${total}`;
}

/* ============================================================================
 * [8] Grid-Viewer zeichnen
 *      - kompletter Atlas als Miniatur
 *      - Rasterlinien
 *      - Highlight für aktuell ausgewählte Kachel
 * ==========================================================================*/
function renderGrid() {
  if (!state.atlasImage) {
    gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    return;
  }

  const img = state.atlasImage;

  gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);

  // Bild so skalieren, dass es maximal in den Grid-Canvas passt
  const scaleX = gridCanvas.width  / img.width;
  const scaleY = gridCanvas.height / img.height;
  const scale  = Math.min(scaleX, scaleY);

  const drawW = img.width  * scale;
  const drawH = img.height * scale;
  const dx = (gridCanvas.width  - drawW) / 2;
  const dy = (gridCanvas.height - drawH) / 2;

  gridCtx.imageSmoothingEnabled = false;
  gridCtx.drawImage(img, dx, dy, drawW, drawH);

  // Rasterlinien zeichnen
  gridCtx.save();
  gridCtx.translate(dx, dy);
  gridCtx.scale(scale, scale);

  gridCtx.lineWidth = 1 / scale;
  gridCtx.strokeStyle = 'rgba(255,255,255,0.18)';

  for (let gx = 0; gx <= state.tilesX; gx++) {
    const x = gx * state.tileW;
    gridCtx.beginPath();
    gridCtx.moveTo(x + 0.5, 0);
    gridCtx.lineTo(x + 0.5, state.tilesY * state.tileH);
    gridCtx.stroke();
  }

  for (let gy = 0; gy <= state.tilesY; gy++) {
    const y = gy * state.tileH;
    gridCtx.beginPath();
    gridCtx.moveTo(0, y + 0.5);
    gridCtx.lineTo(state.tilesX * state.tileW, y + 0.5);
    gridCtx.stroke();
  }

  // Highlight: aktuelle Kachel
  if (state.frameNames.length) {
    const name  = state.frameNames[state.currentFrameIndex];
    const frame = state.frameMap[name];
    if (frame) {
      gridCtx.lineWidth = 2 / scale;
      gridCtx.strokeStyle = 'rgba(255,210,80,0.9)';
      gridCtx.strokeRect(
        frame.gx * state.tileW + 1,
        frame.gy * state.tileH + 1,
        state.tileW - 2,
        state.tileH - 2
      );
    }
  }

  gridCtx.restore();
}

/**
 * Klick im Grid → Kachel bestimmen → passenden Frame auswählen
 */
function handleGridClick(evt) {
  if (!state.atlasImage) return;

  const rect = gridCanvas.getBoundingClientRect();
  const px = evt.clientX - rect.left;
  const py = evt.clientY - rect.top;

  const img = state.atlasImage;

  const scaleX = gridCanvas.width  / img.width;
  const scaleY = gridCanvas.height / img.height;
  const scale  = Math.min(scaleX, scaleY);

  const drawW = img.width  * scale;
  const drawH = img.height * scale;
  const dx = (gridCanvas.width  - drawW) / 2;
  const dy = (gridCanvas.height - drawH) / 2;

  const localX = (px - dx) / scale;
  const localY = (py - dy) / scale;

  if (localX < 0 || localY < 0 ||
      localX >= img.width || localY >= img.height) {
    // Klick außerhalb des Bildes
    return;
  }

  const gx = Math.floor(localX / state.tileW);
  const gy = Math.floor(localY / state.tileH);

  // passenden Frame mit (gx,gy) suchen
  let index = -1;
  for (let i = 0; i < state.frameNames.length; i++) {
    const f = state.frameMap[state.frameNames[i]];
    if (f && f.gx === gx && f.gy === gy) {
      index = i;
      break;
    }
  }
  if (index === -1) {
    logDebug(`Grid-Klick auf leerer Kachel (gx=${gx}, gy=${gy}) – kein Frame in JSON.`);
    return;
  }

  state.currentFrameIndex = index;
  frameSelect.value = String(index);
  state.isPlaying = false;
  renderCurrentFrame();
}

/* ============================================================================
 * [9] Animation-Loop
 * ==========================================================================*/
function animationLoop(timestamp) {
  requestAnimationFrame(animationLoop);

  if (!state.isPlaying || !state.animFrames.length) return;

  if (!state.animLastTime) {
    state.animLastTime = timestamp;
  }

  const delta = timestamp - state.animLastTime;
  if (delta >= state.animDelay) {
    state.animLastTime = timestamp;

    state.animIndex = (state.animIndex + 1) % state.animFrames.length;

    const name = state.animFrames[state.animIndex];
    const globalIndex = state.frameNames.indexOf(name);
    if (globalIndex >= 0) {
      state.currentFrameIndex = globalIndex;
      frameSelect.value = String(globalIndex);
      renderCurrentFrame();
    }
  }
}

/* ============================================================================
 * [10] Event-Handler
 * ==========================================================================*/
frameSelect.addEventListener('change', () => {
  const idx = Number(frameSelect.value) || 0;
  state.currentFrameIndex = idx;
  state.isPlaying = false;
  renderCurrentFrame();
});

btnPrev.addEventListener('click', () => {
  if (!state.frameNames.length) return;
  state.currentFrameIndex =
    (state.currentFrameIndex - 1 + state.frameNames.length) % state.frameNames.length;
  frameSelect.value = String(state.currentFrameIndex);
  state.isPlaying = false;
  renderCurrentFrame();
});

btnNext.addEventListener('click', () => {
  if (!state.frameNames.length) return;
  state.currentFrameIndex =
    (state.currentFrameIndex + 1) % state.frameNames.length;
  frameSelect.value = String(state.currentFrameIndex);
  state.isPlaying = false;
  renderCurrentFrame();
});

atlasImageSel.addEventListener('change', () => {
  loadAtlas().catch(err => logDebug(err));
});

atlasJsonSel.addEventListener('change', () => {
  loadAtlas().catch(err => logDebug(err));
});

animSelect.addEventListener('change', () => {
  const prefix = animSelect.value;
  if (!prefix) {
    state.animFrames = [];
    state.isPlaying  = false;
    logDebug('Keine Animation ausgewählt.');
    return;
  }

  const frames = state.frameNames.filter(name => name.startsWith(prefix));
  state.animFrames = frames;
  state.animIndex  = 0;
  state.isPlaying  = true;
  state.animLastTime = 0;

  logDebug(`Animation "${prefix}" mit ${frames.length} Frames gestartet.`);
});

btnPlay.addEventListener('click', () => {
  if (!state.animFrames.length) {
    const fallbackPrefix = 'e1_regrow';
    const frames = state.frameNames.filter(name => name.startsWith(fallbackPrefix));
    if (frames.length) {
      state.animFrames = frames;
      state.animIndex  = 0;
      animSelect.value = fallbackPrefix;
      logDebug(`Fallback-Animation "${fallbackPrefix}" gestartet.`);
    } else {
      logDebug('Keine Animationsgruppe gefunden. Bitte oben eine wählen.');
      return;
    }
  }
  state.isPlaying = true;
  state.animLastTime = 0;
});

btnPause.addEventListener('click', () => {
  state.isPlaying = false;
});

speedRange.addEventListener('input', () => {
  const val = Number(speedRange.value) || 250;
  state.animDelay = val;
  speedInfo.textContent = `${val} ms/Frame`;
});

// Grid-Klick
gridCanvas.addEventListener('click', handleGridClick);

/* ============================================================================
 * [11] Initialisierung
 * ==========================================================================*/
function init() {
  logDebug('Initialisiere Trees Mega Atlas Viewer (Grid-Version) ...');
  speedInfo.textContent = `${state.animDelay} ms/Frame`;

  // sicherstellen, dass wichtige JSON-Dateien im Dropdown sind
  if (atlasJsonSel) {
    const wanted = [
      'trees_mega_7x7.json',
      'trees_mega_atlas_indexed.json'
    ];
    const existing = Array.from(atlasJsonSel.options).map(o => o.value);
    for (const file of wanted) {
      if (!existing.includes(file)) {
        const opt = document.createElement('option');
        opt.value = file;
        opt.textContent = file.includes('7x7')
          ? `${file} (7×7, indexed)`
          : `${file} (indexed)`;
        atlasJsonSel.appendChild(opt);
      }
    }
    // Standard: 7x7, wenn verfügbar
    if (wanted.includes('trees_mega_7x7.json')) {
      atlasJsonSel.value = 'trees_mega_7x7.json';
    }
  }

  loadAtlas().catch(err => logDebug(err));
  requestAnimationFrame(animationLoop);
}

window.addEventListener('load', init);
