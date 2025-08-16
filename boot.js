// Siedler‑Mini boot.js (DEV Cache‑Buster Loader)
const TS = window.__BUILD_TS__ || Date.now();

// ---------- Asset-Helfer ----------
// Immer benutzen, wenn du Bilder/Sprites/JSON lädst:
export function assetURL(path) {
  // relative und absolute Pfade unterstützen
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}v=${TS}`;
}
window.assetURL = assetURL; // optional global

// ---------- Build Badge ----------
(function mountBuildBadge() {
  const el = document.getElementById('buildBadge');
  if (!el) return;
  const when = new Date(TS).toLocaleString();
  el.textContent = `DEV ${when}  •  ts=${TS}`;
})();

// ---------- Optionales Debug-Dock (drag) ----------
export function makeDebugDock() {
  let dock = document.getElementById('debugDock');
  if (!dock) {
    dock = document.createElement('div');
    dock.id = 'debugDock';
    dock.innerHTML = `
      <div class="drag">Debug (ziehen zum Verschieben) · ts=${TS}</div>
      <div id="debugOut" style="font:12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;"></div>
    `;
    document.body.appendChild(dock);
    // Drag
    const drag = dock.querySelector('.drag');
    let sx=0, sy=0, ox=12, oy=12, dragging=false;
    drag.addEventListener('pointerdown', e => {
      dragging = true; sx = e.clientX; sy = e.clientY;
      const r = dock.getBoundingClientRect(); ox = r.left; oy = r.top;
      drag.setPointerCapture(e.pointerId);
    });
    drag.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      dock.style.left = Math.max(8, ox + dx) + 'px';
      dock.style.top  = Math.max(8, oy + dy) + 'px';
      dock.style.right = 'auto'; dock.style.bottom = 'auto';
    });
    drag.addEventListener('pointerup', () => dragging = false);
  }
  return dock.querySelector('#debugOut');
}
window.makeDebugDock = makeDebugDock;

// --------- Textur-Liste (dein Screenshot-Stand) ---------
// Tipp: Nutze diese Konstanten überall, um Tippfehler zu vermeiden.
export const TEX = {
  grass: assetURL('assets/tex/topdown_grass.PNG'),
  dirt:  assetURL('assets/tex/topdown_dirt.PNG'),
  forest: assetURL('assets/tex/topdown_forest.PNG'),
  water: assetURL('assets/tex/topdown_water.PNG'),
  hqWood: assetURL('assets/tex/hq_wood.PNG'),

  // deine neuen Pfad-Intensitäten (topdown_path0..9)
  paths: Array.from({length:10}, (_,i)=> assetURL(`assets/tex/topdown_path${i}.PNG`)),

  // (falls du die Road-Kacheln noch nutzt, bleiben sie verfügbar)
  road: {
    straight: assetURL('assets/tex/topdown_road_straight.PNG'),
    corner:   assetURL('assets/tex/topdown_road_corner.PNG'),
    t:        assetURL('assets/tex/topdown_road_t.PNG'),
    cross:    assetURL('assets/tex/topdown_road_cross.PNG'),
  },
};

// ---------- Module laden (mit Timestamp) ----------
async function main() {
  // game/ui nur als Beispiel – passe die Pfade an deine Struktur an!
  // Wichtig ist das `?v=TS`.
  const [{ game }, ui] = await Promise.all([
    import(`./game.js?v=${TS}`),
    import(`./ui.js?v=${TS}`).catch(()=>({default:null}))
  ]);

  // Falls du kein separates ui.js hast, ist das ok.
  // Dein existierendes Setup starten:
  const canvasId = 'gameCanvas';
  let canvas = document.getElementById(canvasId);
  if (!canvas) {
    // Falls dein game.js selber seinen Canvas erzeugt, überspringt es das einfach.
    canvas = document.createElement('canvas');
    canvas.id = canvasId;
    document.getElementById('app')?.appendChild(canvas);
  }

  // Beispiel: Debug-Dock sofort aktivieren (optional)
  makeDebugDock();

  // HUD-Callback (wenn dein game das unterstützt)
  const onHUD = (k, v) => {
    // du kannst hier HUD-Anzeigen aktualisieren
    // z.B. document.querySelector('#hudZoom')?.textContent = v;
    // oder ins Debug schreiben:
    const out = document.getElementById('debugOut');
    if (out) out.textContent = `${k}: ${v}\n` + out.textContent.slice(0, 4000);
  };

  // Spiel starten
  // (signature bitte zu deinem aktuellen game.startGame anpassen)
  try {
    game.startGame({ canvas, onHUD, textures: TEX, assetURL });
  } catch (err) {
    console.error(err);
    const out = document.getElementById('debugOut');
    if (out) out.textContent = `ERROR: ${err?.message || err}\n` + out.textContent;
  }
}

main();
