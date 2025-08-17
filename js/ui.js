// ui.js
// Bau-Menü + robuste UI-Bindings, als ES-Modul
// - UI: erzeugt das Build-Menü (Icons aus ASSETS, Auswahl-Highlight, Getter)
// - initGlobalUIBindings: delegiert Klicks auf [data-action], Debug-Box, sichere Events

import { ASSETS } from "../core/assets.js";

/** Kleine Hilfsfunktionen */
const el = (tag, props = {}, styles = {}) => {
  const n = document.createElement(tag);
  Object.assign(n, props);
  Object.assign(n.style, styles);
  return n;
};

const SELECT_CLASS = "ui-selected";

/** Stile einmal injizieren (Highlight etc.) */
function injectStyles() {
  if (document.getElementById("__ui_css")) return;
  const css = `
    #build-menu { -webkit-user-select:none; user-select:none; }
    #build-menu button {
      width:48px; height:48px; background-size:cover; background-position:center;
      border:1px solid #888; border-radius:4px; cursor:pointer; outline:none;
      display:inline-block;
    }
    #build-menu button.${SELECT_CLASS} {
      box-shadow: 0 0 0 2px #7FDBFF inset, 0 0 8px rgba(127,219,255,.6);
      border-color:#7FDBFF;
    }
    #debugBox a { color:#9fd3ff; text-decoration:underline; }
  `.trim();
  const style = el("style", { id: "__ui_css", textContent: css });
  document.head.appendChild(style);
}

/** Bau-Menü */
export class UI {
  /**
   * @param {object} game - deine Game-Instanz (optional, nur falls du callbacks brauchst)
   * @param {object} opts - { onSelect?: (id)=>void, mount?: HTMLElement }
   */
  constructor(game, opts = {}) {
    injectStyles();
    this.game = game;
    this.onSelect = opts.onSelect || null;
    this.selectedBuilding = null;

    // Menü erstellen/anhängen
    this.menu = el(
      "div",
      { id: "build-menu" },
      {
        position: "absolute",
        bottom: "10px",
        left: "10px",
        display: "flex",
        gap: "6px",
        background: "rgba(0,0,0,0.4)",
        padding: "6px",
        borderRadius: "6px",
        backdropFilter: "blur(2px)",
        zIndex: 10000,
        pointerEvents: "auto",
      }
    );

    (opts.mount || document.body).appendChild(this.menu);

    // Buttons definieren (Label, Asset, ID)
    const defs = [
      ["HQ",          ASSETS.building.hq,           "hq"],
      ["Depot",       ASSETS.building.depot,        "depot"],
      ["Farm",        ASSETS.building.farm,         "farm"],
      ["Holzfäller",  ASSETS.building.lumberjack,   "lumberjack"],
      ["Fischer",     ASSETS.building.fischer,      "fischer"],
      ["Haus1",       ASSETS.building.haeuser1,     "haeuser1"],
      ["Haus2",       ASSETS.building.haeuser2,     "haeuser2"],
      ["Steinbruch",  ASSETS.building.stonebraker,  "stonebraker"],
      ["Wassermühle", ASSETS.building.wassermuehle, "wassermuehle"],
      ["Windmühle",   ASSETS.building.windmuehle,   "windmuehle"],
      ["Bäckerei",    ASSETS.building.baeckerei,    "baeckerei"],
    ];

    this.buttons = new Map();
    for (const [label, src, id] of defs) {
      this._createButton(label, src, id);
    }
  }

  _createButton(label, iconSrc, buildingId) {
    const btn = el("button", { title: label }, { backgroundImage: `url(${iconSrc})` });
    btn.dataset.building = buildingId;
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      this.setSelectedBuilding(buildingId);
    });
    this.menu.appendChild(btn);
    this.buttons.set(buildingId, btn);
  }

  setSelectedBuilding(buildingId) {
    this.selectedBuilding = buildingId;

    // Visuelles Highlight
    for (const [id, b] of this.buttons) {
      if (id === buildingId) b.classList.add(SELECT_CLASS);
      else b.classList.remove(SELECT_CLASS);
    }

    // Callback zu deinem Spiel
    if (typeof this.onSelect === "function") {
      try { this.onSelect(buildingId); } catch {}
    }

    // Optional: globale gameAPI informieren (Tool-Logik)
    if (window.gameAPI?.setTool) {
      window.gameAPI.setTool(`build:${buildingId}`);
    }

    // Konsolenhinweis
    console.log("Gebäude gewählt:", buildingId);
  }

  getSelectedBuilding() {
    return this.selectedBuilding;
  }

  /** Menü entfernen (z. B. bei Szenenwechsel) */
  destroy() {
    if (this.menu?.parentNode) this.menu.parentNode.removeChild(this.menu);
    this.buttons.clear();
  }
}

/** --------- Globale, robuste Bindings + Debug-Box --------- */

export function initGlobalUIBindings(gameAPI = window.gameAPI) {
  // Defensiver Event-Helper
  const on = (target, ev, fn) => target && target.addEventListener(ev, fn, { passive: false });

  // Delegation für Buttons/Links mit data-action
  on(document, "click", (e) => {
    const btn = e.target.closest?.("[data-action]");
    if (!btn) return;
    e.preventDefault();
    const act = btn.getAttribute("data-action") || "";

    if (act.startsWith("tool:")) {
      const name = act.split(":")[1];
      gameAPI?.setTool?.(name);
      return;
    }

    switch (act) {
      case "start":      gameAPI?.start?.(); break;
      case "center":     gameAPI?.center?.(); break;
      case "fullscreen": gameAPI?.fullscreen?.(); break;
      case "debug":      gameAPI?.toggleDebug?.(); break;
      case "reset":      gameAPI?.reset?.(); break;
    }
  });

  // Debug-Box einmalig erzeugen
  makeDebugBox();
}

function makeDebugBox() {
  if (window.__debugBox) return;
  const box = el(
    "div",
    { id: "debugBox" },
    {
      position: "fixed",
      left: "12px",
      bottom: "12px",
      maxWidth: "60vw",
      zIndex: 99999,
      background: "rgba(20,30,48,.9)",
      color: "#cfe3ff",
      border: "1px solid #2f425f",
      font: "12px system-ui,-apple-system,Segoe UI",
      padding: "8px 10px",
      borderRadius: "8px",
      pointerEvents: "auto",
      userSelect: "text",
      lineHeight: "1.3",
      whiteSpace: "pre-wrap",
    }
  );
  box.textContent = "Debug (ziehen zum Verschieben)…";
  document.body.appendChild(box);
  window.__debugBox = box;

  // Dragging
  let dragging = false, sx = 0, sy = 0, bx = 12, by = 12;
  const onMove = (ev) => {
    if (!dragging) return;
    const dx = (ev.clientX || 0) - sx;
    const dy = (ev.clientY || 0) - sy;
    box.style.left = (bx + dx) + "px";
    box.style.bottom = "auto";
    box.style.top = (window.innerHeight - (by + dy) - box.offsetHeight) + "px";
  };
  box.addEventListener("pointerdown", (ev) => {
    dragging = true;
    sx = ev.clientX; sy = ev.clientY;
    bx = box.offsetLeft;
    by = window.innerHeight - box.offsetTop - box.offsetHeight;
    box.setPointerCapture(ev.pointerId);
  });
  box.addEventListener("pointermove", onMove);
  box.addEventListener("pointerup", () => { dragging = false; });

  // Fehler-Listener
  window.addEventListener("error", (e) => {
    box.textContent = "JS-Error: " + (e.message || e);
  });
  window.addEventListener("unhandledrejection", (e) => {
    box.textContent = "Promise-Error: " + (e.reason?.message || e.reason || e);
  });
}
