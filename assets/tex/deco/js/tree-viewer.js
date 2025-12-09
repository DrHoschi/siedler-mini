/* ============================================================================
 * Datei   : js/tree-viewer.js
 * Projekt : Trees Mega Atlas – Test-Viewer
 * Version : v25.12.09b (Indexed-JSON + Smart-Sort)
 * Zweck   : Lädt trees_mega_atlas.png + JSON (assets.draw-Format)
 *           und erlaubt:
 *             - einzelne Frames anzeigen
 *             - per Prev/Next durchgehen
 *             - einfache Animationen nach Prefix abspielen (z.B. e1_regrow_)
 *
 * Wichtige Änderungen in dieser Version:
 *   ✔ Unterstützung für "trees_mega_atlas_indexed.json"
 *   ✔ Intelligente Sortierung:
 *        - Indexed-Namen: tree_00_r0c0 ... tree_63_r7c7 → Reihenfolge wie im Grid
 *        - Semantische Namen: alphabetisch sortiert wie vorher
 *   ✔ Debug-Ausgabe zeigt zusätzlich Grid-Position (rX,cY)
 *
 * Erwartete Projektstruktur relativ zur index.html:
 *
 *   assets/trees/trees_mega_atlas.png
 *   assets/trees/trees_mega_atlas_padded.png
 *   assets/trees/trees_mega_atlas.json              (semantische Namen, optional)
 *   assets/trees/trees_mega_atlas_indexed.json      (neutrale Namen, empfohlen)
 *
 * JSON-Format (assets.draw):
 *   {
 *     "image": "trees_mega_atlas.png",
 *     "tileW": 128,
 *     "tileH": 128,
 *     "frames": {
 *       "tree_00_r0c0": [0,0],
 *       "tree_01_r0c1": [1,0],
 *       ...
 *     }
 *   }
 * ==========================================================================*/

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
 * ==========================================================================*/
const state = {
  atlasImage: null,      // HTMLImageElement
  atlasData: null,       // JSON-Inhalt
  frameNames: [],        // Liste aller Framenamen (in gewünschter Reihenfolge)
  frameMap: {},          // name -> {x,y,w,h, gx,gy}
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
 * ==========================================================================*/
function logDebug(msg) {
  console.log('[TreesViewer]', msg);
  if (debugOutput) {
    debugOutput.textContent = String(msg);
  }
}

/**
 * Prüft, ob die übergebene Namensliste einem "indexed" Schema entspricht:
 *   tree_00_r0c0, tree_01_r0c1, ...
 *
 * Heuristik:
 *   - Alle Namen fangen mit "tree_" an
 *   - Der zweite Teil ist eine zweistellige Zahl
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
 * [4] Atlas laden (Bild + JSON)
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

// Promise-basierter Image-Loader
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

/**
 * JSON (assets.draw) in frameMap übersetzen.
 *
 * data.frames:
 *   "name": [gridX, gridY]
 */
function parseFramesFromAssetsDraw(data) {
  state.frameNames = [];
  state.frameMap = {};

  const frames = data.frames || {};

  // In Einfügereihenfolge sammeln
  for (const [name, coord] of Object.entries(frames)) {
    const gx = coord[0];
    const gy = coord[1];
    const x = gx * state.tileW;
    const y = gy * state.tileH;

    state.frameNames.push(name);
    state.frameMap[name] = { x, y, w: state.tileW, h: state.tileH, gx, gy };
  }

  // Sortier-Strategie:
  //  - Indexed-JSON (tree_00_r0c0, ...) → NICHT sortieren (Reihenfolge = Grid)
  //  - Sonst → alphabetisch sortieren (wie ursprüngliche Version)
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

    // Zusatzinfo: Grid-Position (rX,cY) anhängen
    const gridInfo = (f && typeof f.gx === 'number' && typeof f.gy === 'number')
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
 *
 * Gruppenbildung:
 *   - "e1_regrow_seed"    → Prefix "e1_regrow"
 *   - "e2_regrow_tree_big"→ Prefix "e2_regrow"
 *   - "cut_fall_left"     → Prefix "cut_fall"
 *
 * Indexed-Namen ("tree_00_r0c0") erzeugen zwar Prefix "tree_00", sind aber
 * in der Praxis eher für Einzelbild-Test gedacht – kann man trotzdem wählen.
 * ==========================================================================*/
function buildAnimationsFromNames() {
  const groups = new Map(); // prefix -> [names]

  for (const name of state.frameNames) {
    const parts = name.split('_');
    let prefix;
    if (parts.length >= 3) {
      prefix = parts[0] + '_' + parts[1]; // z.B. e1_regrow, tree_00
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

  // "Keine Animation"
  const optNone = document.createElement('option');
  optNone.value = '';
  optNone.textContent = '– (Einzelbild / kein Auto-Loop) –';
  animSelect.appendChild(optNone);

  const sortedPrefixes = Array.from(groups.keys()).sort();
  for (const prefix of sortedPrefixes) {
    const names = groups.get(prefix).slice();

    // Für indexed "tree_00" etc. wollen wir meist keine Gruppe im Sinne von Animation,
    // trotzdem bleibt es wählbar – schadet nicht.
    names.sort();

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
 * [7] Frame zeichnen
 * ==========================================================================*/
function renderCurrentFrame() {
  if (!state.atlasImage || !state.frameNames.length) return;

  const index = state.currentFrameIndex;
  const name  = state.frameNames[index];
  const frame = state.frameMap[name];

  if (!frame) return;

  // Canvas leeren
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 128x128 → 256x256 skalieren und zentrieren
  const scaleX = canvas.width / state.tileW;
  const scaleY = canvas.height / state.tileH;
  const scale  = Math.min(scaleX, scaleY);

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

  const i     = state.currentFrameIndex;
  const name  = state.frameNames[i];
  const frame = state.frameMap[name];
  const total = state.frameNames.length;

  const gridInfo = frame
    ? `  [r${frame.gy}, c${frame.gx}]`
    : '';

  canvasInfo.textContent = `Frame: ${name}${gridInfo}`;
  frameIndexInfo.textContent = `Index: ${i + 1}/${total}`;
}

/* ============================================================================
 * [8] Animation-Loop
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
 * [9] Event-Handler
 * ==========================================================================*/
frameSelect.addEventListener('change', () => {
  const idx = Number(frameSelect.value) || 0;
  state.currentFrameIndex = idx;
  state.isPlaying = false; // Einzelbild-Auswahl stoppt ggf. Animation
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
    // Fallback: wenn vorhanden, e1_regrow-Gruppe nutzen
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

/* ============================================================================
 * [10] Initialisierung
 * ==========================================================================*/
function init() {
  logDebug('Initialisiere Trees Mega Atlas Viewer ...');
  speedInfo.textContent = `${state.animDelay} ms/Frame`;

  // Sicherstellen, dass die neue JSON-Datei im Dropdown vorhanden ist
  // (falls du sie nicht manuell in die index.html eingetragen hast)
  if (atlasJsonSel) {
    const filesWanted = [
      'trees_mega_atlas.json',
      'trees_mega_atlas_indexed.json'
    ];

    const existingValues = Array.from(atlasJsonSel.options).map(o => o.value);
    for (const file of filesWanted) {
      if (!existingValues.includes(file)) {
        const opt = document.createElement('option');
        opt.value = file;
        opt.textContent =
          file === 'trees_mega_atlas_indexed.json'
            ? 'trees_mega_atlas_indexed.json (indexed)'
            : file;
        atlasJsonSel.appendChild(opt);
      }
    }

    // Standard: bevorzugt indexed-JSON, falls vorhanden
    if (existingValues.includes('trees_mega_atlas_indexed.json')) {
      atlasJsonSel.value = 'trees_mega_atlas_indexed.json';
    }
  }

  // Atlas laden
  loadAtlas().catch(err => logDebug(err));

  // Animationsloop starten
  requestAnimationFrame(animationLoop);
}

window.addEventListener('load', init);
