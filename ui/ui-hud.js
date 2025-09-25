/* ============================================================================
 * Datei: ui/ui-hud.js
 * Version: v18.8.0 (2025-09-25)
 * Zweck: HUD-Anzeige (Ressourcen, Status)
 * Leitplanken:
 *   - Reagiert auf: cb:game-start, cb:res:change
 *   - Minimal-Layout: Ressourcenleiste; erweiterbar (FPS, Map-Name, Seed, etc.)
 * Struktur:
 *   (0) Logger-Guard
 *   (1) Konstanten/State
 *   (2) Helper (DOM)
 *   (3) Render/Update
 *   (4) Event-Wiring
 *   (5) Exports
 * ========================================================================== */

/* (0) Logger-Guard ----------------------------------------------------------- */
if (!window.CBLog || typeof window.CBLog.ok !== "function") {
  window.CBLog = { ok:console.log, info:console.log, warn:console.warn, error:console.error };
  CBLog.info("[ui-hud] Hinweis: globaler CBLog nicht gefunden – Fallback aktiv");
}

/* (1) Konstanten/State ------------------------------------------------------- */
const HUD_MOD = "[ui-hud]";
const HUD_VER = "v18.8.0";

const HUD_STATE = {
  root: null,
  res:  { wood:0, stone:0, fish:0 },
  info: { mapUrl:null, seed:null }
};

/* (2) Helper (DOM) ----------------------------------------------------------- */
function $(sel, root=document){ return root.querySelector(sel); }
function el(tag, cls, html=""){ const e=document.createElement(tag); if(cls) e.className=cls; if(html) e.innerHTML=html; return e; }

/* (3) Render/Update ---------------------------------------------------------- */
function ensureRoot(){
  if (!HUD_STATE.root) {
    HUD_STATE.root = $("#hud");
    if (!HUD_STATE.root) {
      CBLog.error(`${HUD_MOD} Root #hud fehlt`);
      return false;
    }
  }
  return true;
}

function renderOnce(){
  if (!ensureRoot()) return;
  HUD_STATE.root.innerHTML = `
    <div class="hud-bar">
      <div class="hud-group hud-res">
        <span class="hud-res-item" data-res="wood">🌲 <b class="v">0</b></span>
        <span class="hud-res-item" data-res="stone">🪨 <b class="v">0</b></span>
        <span class="hud-res-item" data-res="fish">🐟 <b class="v">0</b></span>
      </div>
      <div class="hud-group hud-info">
        <span class="hud-map">Map: <b class="v">—</b></span>
        <span class="hud-seed">Seed: <b class="v">—</b></span>
      </div>
    </div>
  `;
}

function updateRes(res){
  if (!ensureRoot()) return;
  for (const [k,v] of Object.entries(res)){
    const node = HUD_STATE.root.querySelector(`.hud-res-item[data-res="${k}"] .v`);
    if (node) node.textContent = String(v);
  }
}

function updateInfo(info){
  if (!ensureRoot()) return;
  const mapNode  = HUD_STATE.root.querySelector(".hud-map .v");
  const seedNode = HUD_STATE.root.querySelector(".hud-seed .v");
  if (mapNode)  mapNode.textContent  = info.mapUrl || "—";
  if (seedNode) seedNode.textContent = info.seed   || "—";
}

/* (4) Event-Wiring ----------------------------------------------------------- */
window.addEventListener("cb:game-start", (ev)=>{
  renderOnce();
  if (HUD_STATE.root) HUD_STATE.root.removeAttribute("hidden");

  // lese Info aus Event, falls vorhanden
  const d = ev?.detail || {};
  HUD_STATE.info.mapUrl = d.mapUrl || HUD_STATE.info.mapUrl || null;
  HUD_STATE.info.seed   = d.seed   || HUD_STATE.info.seed   || null;
  updateInfo(HUD_STATE.info);

  CBLog.ok(`${HUD_MOD} sichtbar (${HUD_VER})`);
});

window.addEventListener("cb:res:change", (ev)=>{
  const { res, delta } = ev.detail || {};
  if (!res) return;
  HUD_STATE.res[res] = (HUD_STATE.res[res] || 0) + (delta||0);
  updateRes(HUD_STATE.res);
});

/* (5) Exports ---------------------------------------------------------------- */
// keine externen Methoden nötig – HUD reagiert ausschließlich auf Events
