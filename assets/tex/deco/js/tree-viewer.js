/* ============================================================================
 * Datei   : js/tree-viewer.js
 * Projekt : Trees Mega Atlas – Test-Viewer
 * Version : v25.12.09
 * Zweck   : Lädt trees_mega_atlas.png + trees_mega_atlas.json
 *           und erlaubt:
 *             - einzelne Frames anzeigen
 *             - per Prev/Next durchgehen
 *             - einfache Animationen nach Prefix abspielen (z.B. e1_regrow_)
 *
 * Hinweise:
 *   - Erwartet folgende Struktur relativ zur index.html:
 *       assets/trees/trees_mega_atlas.png
 *       assets/trees/trees_mega_atlas_padded.png
 *       assets/trees/trees_mega_atlas.json
 *
 *   - JSON-Format (assets.draw):
 *       {
 *         "image": "trees_mega_atlas.png",
 *         "tileW": 128,
 *         "tileH": 128,
 *         "frames": {
 *           "e1_birch_small": [0,0],
 *           "e1_birch_medium": [1,0],
 *           ...
 *         }
 *       }
 *
 *   - Diese Datei ist bewusst unabhängig vom restlichen Siedler-Code gehalten,
 *     damit du sie als eigenständigen Test in jeden Ordner legen kannst.
 * ============================================================================
 */

/* ============================================================================
 * [1] DOM-Referenzen
 * ==========================================================================*/
const canvas        = document.getElementById('treeCanvas');
const ctx           = canvas.getContext('2d');

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
 * ============================================================================
 */
const state = {
  atlasImage: null,      // HTMLImageElement
  atlasData: null,       // JSON-Inhalt
  frameNames: [],        // sortierte Liste aller Framenamen
  frameMap: {},          // name -> {x,y,w,h}
  tileW: 128,
  tileH: 128,

  currentFrameIndex: 0,

  // Animation
  isPlaying: false,
  animFrames: [],        // Liste von Framenamen in der aktuellen Animation
  animIndex: 0,
  animLastTime: 0,
  animDelay: 250         // ms pro Frame
};

/* ============================================================================
 * [3] Hilfsfunktionen für Debug-Ausgabe
 * ============================================================================
 */
function logDebug(msg) {
  console.log('[TreesViewer]', msg);
  if (debugOutput) {
    debugOutput.textContent = String(msg);
  }
}

/* ============================================================================
 * [4] Atlas laden (Bild + JSON)
 * ============================================================================
 */
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

  // Frames aus JSON extrahieren
  parseFramesFromAssetsDraw(data);

  // UI füllen
  fillFrameSelect();
  buildAnimationsFromNames();

  state.currentFrameIndex = 0;
  updateCanvasInfo();
  renderCurrentFrame();
  logDebug(`Atlas geladen. Frames: ${state.frameNames.length}`);
}

// kleines Promise-basiertes Image-Loader-Helferlein
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

// assets.draw → frameMap
function parseFramesFromAssetsDraw(data) {
  state.frameNames = [];
  state.frameMap = {};
  const frames = data.frames || {};

  for (const [name, coord] of Object.entries(frames)) {
    // coord ist [gridX, gridY]
    const gx = coord[0];
    const gy = coord[1];
    const x = gx * state.tileW;
    const y = gy * state.tileH;

    state.frameNames.push(name);
    state.frameMap[name] = { x, y, w: state.tileW, h: state.tileH };
  }

  // Für konstante Reihenfolge sortieren
  state.frameNames.sort();
}

/* ============================================================================
 * [5] UI-Helfer: Frame-Auswahlliste
 * ============================================================================
 */
function fillFrameSelect() {
  frameSelect.innerHTML = '';
  for (let i = 0; i < state.frameNames.length; i++) {
    const name = state.frameNames[i];
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i.toString().padStart(2,'0')} – ${name}`;
    frameSelect.appendChild(opt);
  }
  frameSelect.value = String(state.currentFrameIndex);
}

/* ============================================================================
 * [6] Animationen aus Namen ableiten
 *      - gruppiert nach Prefix bis zum 2. Unterstrich
 *        Beispiel:
 *          "e1_regrow_seed"   → Prefix "e1_regrow"
 *          "e2_regrow_tree_big" → Prefix "e2_regrow"
 *          "cut_fall_left"    → Prefix "cut_fall"
 * ============================================================================
 */
function buildAnimationsFromNames() {
  const groups = new Map(); // prefix -> [names]

  for (const name of state.frameNames) {
    const parts = name.split('_');
    let prefix;
    if (parts.length >= 3) {
      prefix = parts[0] + '_' + parts[1]; // z.B. e1_regrow
    } else if (parts.length === 2) {
      prefix = parts[0] + '_' + parts[1]; // z.B. cut_fall
    } else {
      prefix = parts[0];                   // fallback
    }

    if (!groups.has(prefix)) {
      groups.set(prefix, []);
    }
    groups.get(prefix).push(name);
  }

  // UI füllen
  animSelect.innerHTML = '';

  // "Keine Animation" / Einzelbild
  const optNone = document.createElement('option');
  optNone.value = '';
  optNone.textContent = '– (Einzelbild / kein Auto-Loop) –';
  animSelect.appendChild(optNone);

  // Für jedes Prefix eine Animation anbieten
  const sortedPrefixes = Array.from(groups.keys()).sort();
  for (const prefix of sortedPrefixes) {
    const names = groups.get(prefix).slice().sort();
    const opt = document.createElement('option');
    opt.value = prefix;
    opt.textContent = `${prefix} (${names.length} Frames)`;
    animSelect.appendChild(opt);
  }

  // Standard: keine Animation
  animSelect.value = '';
  state.animFrames = [];
  state.isPlaying = false;
}

/* ============================================================================
 * [7] Frame zeichnen
 * ============================================================================
 */
function renderCurrentFrame() {
  if (!state.atlasImage || !state.frameNames.length) {
    return;
  }
  const index = state.currentFrameIndex;
  const name = state.frameNames[index];
  const frame = state.frameMap[name];

  // Canvas säubern
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Wir skalieren 128x128 → 256x256 (2x) und zentrieren
  const scaleX = canvas.width / state.tileW;
  const scaleY = canvas.height / state.tileH;
  const scale = Math.min(scaleX, scaleY);

  const drawW = state.tileW * scale;
  const drawH = state.tileH * scale;
  const dx = (canvas.width - drawW) / 2;
  const dy = (canvas.height - drawH) / 2;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    state.atlasImage,
    frame.x, frame.y, frame.w, frame.h,  // Quelle
    dx, dy, drawW, drawH                 // Ziel
  );

  updateCanvasInfo();
}

function updateCanvasInfo() {
  if (!state.frameNames.length) {
    canvasInfo.textContent = 'Frame: (noch nicht geladen)';
    frameIndexInfo.textContent = '';
    return;
  }
  const i = state.currentFrameIndex;
  const name = state.frameNames[i];
  const total = state.frameNames.length;
  canvasInfo.textContent = `Frame: ${name}`;
  frameIndexInfo.textContent = `Index: ${i + 1}/${total}`;
}

/* ============================================================================
 * [8] Animation-Loop
 * ============================================================================
 */
function animationLoop(timestamp) {
  requestAnimationFrame(animationLoop);

  if (!state.isPlaying || !state.animFrames.length) return;

  if (!state.animLastTime) {
    state.animLastTime = timestamp;
  }

  const delta = timestamp - state.animLastTime;
  if (delta >= state.animDelay) {
    state.animLastTime = timestamp;

    // nächsten Frame in der animFrames-Liste wählen
    state.animIndex = (state.animIndex + 1) % state.animFrames.length;

    // globalen Index so setzen, dass UI synchron bleibt
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
 * [9] Event-Handler
 * ============================================================================
 */
frameSelect.addEventListener('change', () => {
  const idx = Number(frameSelect.value) || 0;
  state.currentFrameIndex = idx;
  state.isPlaying = false; // Einzelwahl beendet ggf. Animation
  renderCurrentFrame();
});

btnPrev.addEventListener('click', () => {
  if (!state.frameNames.length) return;
  state.currentFrameIndex = (state.currentFrameIndex - 1 + state.frameNames.length) % state.frameNames.length;
  frameSelect.value = String(state.currentFrameIndex);
  state.isPlaying = false;
  renderCurrentFrame();
});

btnNext.addEventListener('click', () => {
  if (!state.frameNames.length) return;
  state.currentFrameIndex = (state.currentFrameIndex + 1) % state.frameNames.length;
  frameSelect.value = String(state.currentFrameIndex);
  state.isPlaying = false;
  renderCurrentFrame();
});

atlasImageSel.addEventListener('change', () => {
  // Beim Wechsel zwischen tight/padded neu laden
  loadAtlas().catch(err => logDebug(err));
});

atlasJsonSel.addEventListener('change', () => {
  // Falls du später mehrere JSON-Versionen testest
  loadAtlas().catch(err => logDebug(err));
});

animSelect.addEventListener('change', () => {
  const prefix = animSelect.value;
  if (!prefix) {
    state.animFrames = [];
    state.isPlaying = false;
    logDebug('Keine Animation ausgewählt.');
    return;
  }
  const frames = state.frameNames.filter(name => name.startsWith(prefix));
  state.animFrames = frames;
  state.animIndex = 0;
  state.isPlaying = true;
  state.animLastTime = 0;
  logDebug(`Animation "${prefix}" mit ${frames.length} Frames gestartet.`);
});

btnPlay.addEventListener('click', () => {
  if (!state.animFrames.length) {
    // Wenn noch keine Gruppe gewählt wurde, standardmäßig e1_regrow nehmen, falls vorhanden
    const fallbackPrefix = 'e1_regrow';
    const frames = state.frameNames.filter(name => name.startsWith(fallbackPrefix));
    if (frames.length) {
      state.animFrames = frames;
      state.animIndex = 0;
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

/* ============================================================================
 * [10] Initialisierung
 * ============================================================================
 */
function init() {
  logDebug('Initialisiere Trees Mega Atlas Viewer ...');
  speedInfo.textContent = `${state.animDelay} ms/Frame`;

  // Atlas laden
  loadAtlas().catch(err => logDebug(err));

  // Animationsloop starten
  requestAnimationFrame(animationLoop);
}

window.addEventListener('load', init);
