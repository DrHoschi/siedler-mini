// ============================================================================
// Datei : ui/ui-hud.js
// Projekt: Neue Siedler
// Version: v1.1.0 (2025-10-13)
// Zweck  : HUD-Leiste rendern, Orientation-Docking (oben/links/rechts),
//          "nur Zellinhalte drehen" wird via CSS-Klassen gelöst.
// API    : HUD.init({ resources, frameSrc? })
//          HUD.setAmounts({holz:123, ...})
// Hinweis: Logs-Block aus deinem Projekt bleibt erhalten (nicht gelöscht)
// ============================================================================

/* (function(){
  'use strict';

  // -------------------------------------------------------------------------
  // [00] DOM/Logging/Utils
  // -------------------------------------------------------------------------
  const $root = document.getElementById('hud-top');
  if (!$root){ (console.error)('[hud] #hud-top fehlt'); return; }

  const log = {
    ok  : (...a)=>(window.CBLog?.ok   || console.log )('[hud]', ...a),
    inf : (...a)=>(window.CBLog?.info || console.info)('[hud]', ...a),
    wrn : (...a)=>(window.CBLog?.warn || console.warn)('[hud]', ...a),
    err : (...a)=>(window.CBLog?.err  || console.error)('[hud]', ...a),
  };
*/ 

const HUD = (() => {
  const state = { resources: [], byId: {}, frameSrc: null };

  function $(sel, root=document){ return root.querySelector(sel); }
  function on(el, ev, fn, opt){ el && el.addEventListener(ev, fn, opt); }

  function setDockingByOrientation() {
    const bar = $("#hud-bar");
    const type = (screen.orientation && screen.orientation.type) ||
      (window.innerWidth > window.innerHeight ? "landscape" : "portrait");

    bar.classList.remove("hud--portrait","hud--land-left","hud--land-right");

    if (String(type).startsWith("portrait")) {
      bar.classList.add("hud--portrait");
    } else {
      const angle = (screen.orientation && screen.orientation.angle);
      // rechts halten → 90deg; links halten → 270deg / -90deg
      if (angle === 90) {
        bar.classList.add("hud--land-right");
      } else if (angle === 270 || angle === -90) {
        bar.classList.add("hud--land-left");
      } else {
        // Fallback: rechts andocken
        bar.classList.add("hud--land-right");
      }
    }
  }

  function render(resources) {
    const strip = $("#hud-strip");
    strip.innerHTML = "";
    resources.forEach(res => {
      const cell = document.createElement("div");
      cell.className = "hud-cell";

      const inner = document.createElement("div");
      inner.className = "hud-cell__content";
      inner.innerHTML = `
        <img class="hud-icon" src="${res.icon}" alt="${res.name}">
        <div class="hud-name">${res.name}</div>
        <div class="hud-amt" id="amt-${res.id}">${formatAmt(res.amount)}</div>
      `;
      cell.appendChild(inner);
      strip.appendChild(cell);
      state.byId[res.id] = res;
    });
  }

  function formatAmt(v) {
    if (typeof v !== "number") return v ?? "0";
    if (v >= 1_000_000) return (v/1_000_000).toFixed(1).replace(".", ",")+" M";
    if (v >= 10_000)    return Math.round(v/1000)+" K";
    return String(v);
  }

  function init(cfg = {}) {
    state.resources = cfg.resources || demoResources();
    state.frameSrc  = cfg.frameSrc || null;

    if (state.frameSrc) {
      document.documentElement.style.setProperty("--hud-frame-src", `url("${state.frameSrc}")`);
    }

    render(state.resources);
    setDockingByOrientation();

    on(window, "resize", setDockingByOrientation);
    if (screen.orientation && screen.orientation.addEventListener) {
      on(screen.orientation, "change", setDockingByOrientation);
    }
    // iOS Fallback
    on(window, "orientationchange", setDockingByOrientation);

    console.log("[HUD] ready with", state.resources.length, "resources.");
  }

  function setAmounts(map) {
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(`amt-${id}`);
      if (el) el.textContent = formatAmt(val);
      if (state.byId[id]) state.byId[id].amount = val;
    });
  }

  function demoResources() {
    return [
      { id:"wood",  name:"Holz",  amount:120, icon:"assets/icons/resources/wood.png"  },
      { id:"stone", name:"Stein", amount:85,  icon:"assets/icons/resources/stone.png" },
      { id:"fish",  name:"Fisch", amount:42,  icon:"assets/icons/resources/fish.png"  },
      { id:"food",  name:"Nahrung", amount:63, icon:"assets/icons/resources/food.png" },
      { id:"gold",  name:"Gold",  amount:7,   icon:"assets/icons/resources/gold.png"  },
      { id:"pop",   name:"Bev.",  amount:24,  icon:"assets/icons/resources/pop.png"   }
    ];
  }

  return { init, setAmounts };
})();

// Auto-Init (nur wenn als Standalone geladen)
window.addEventListener("DOMContentLoaded", () => {
  HUD.init({
    // frameSrc: "assets/ui/panel.svg"  // <- optional überschreiben
  });
  // Beispiel-Update
  setTimeout(() => HUD.setAmounts({ wood: 135, stone: 93 }), 1500);
});

export default HUD;
