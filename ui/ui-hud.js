/* ============================================================================
 * Datei    : ui/ui-hud.js
 * Projekt  : Neue Siedler
 * Version  : v23.0.0 (2025-10-07)
 * Modul    : Ressourcen-HUD (oben andockend, 1-zeilig; bei kleinen Screens 2-zeilig)
 *
 * Events (listen)
 *   - cb:registry:ready
 *   - cb:ui-ready
 *   - cb:res:change   {res|id, delta? , amount?}  // +/− oder absolute Menge
 *   - cb:res:reset    {scope:'all'|'one', res?}
 *   - cb:res:snapshot {amounts:{<resId>:number}}
 *
 * Events (emit)
 *   - cb:hud-ready                { ok:true }
 *   - req:res:snapshot            {}         // Core kann daraufhin cb:res:snapshot senden
 *   - req:res:focus               { resId, active } // Klick auf Ressourcenkachel (für Producer/Consumer-Highlight)
 *   - cb:hud:res:focus            { resId, active } // UI-Bestätigung
 *
 * Abhängigkeiten
 *   - (optional) core/registry.js → Registry.list('resources' | 'resource' | 'goods' | 'materials')
 *   - Icons unter assets/icons/resources/<id>.png
 *   - Styling in ui/css/ui-hud.css (Panelrahmen je Kachel via --hud-panel-img)
 *
 * Changelog
 *   v23.0.0
 *     - robuste Registry-Erkennung + Gebäude-Filter
 *     - klare DOM-Struktur: Titel oben links, Icon mittig, Menge unten rechts
 *     - Deduplizierte Appends, sauberes Event-Wiring, Snapshot-Support
 * ========================================================================== */

(function(){
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

  // ============================================================================
// Datei : ui/ui-hud.js
// Projekt: Neue Siedler
// Version: v1.0.0 (2025-10-13)
// Zweck  : HUD-Leiste rendern, Daten binden, Orientation-Docking (oben/links/rechts),
//          Scroll-Buttons, und "nur Zellinhalte drehen" implementieren.
// API    : HUD.init({ resources, onSelect?, frameSrc? })
//          HUD.setAmounts({holz:123, ...})
// Leitplanken: Startfenster zuerst, Debug-Logs lassen wir drin
// ============================================================================

const HUD = (() => {

  // ------------------------------
  // Konfiguration & State
  // ------------------------------
  const state = {
    resources: [],
    byId: {},
    frameSrc: null
  };

  // ------------------------------
  // Helpers
  // ------------------------------
  function $(sel, root=document){ return root.querySelector(sel); }
  function on(el, ev, fn, opt){ el && el.addEventListener(ev, fn, opt); }

  function setDockingByOrientation() {
    const bar = $("#hud-bar");
    const type = (screen.orientation && screen.orientation.type) || (window.innerWidth > window.innerHeight ? "landscape" : "portrait");

    bar.classList.remove("hud--portrait","hud--land-left","hud--land-right");

    if (String(type).startsWith("portrait")) {
      bar.classList.add("hud--portrait");
    } else {
      // Landscape: abhängig vom Winkel links/rechts andocken
      // 90deg  → rechts; -90deg oder 270deg → links
      const angle = (screen.orientation && screen.orientation.angle) || (window.orientation || 0);
      if (angle === 90) {
        bar.classList.add("hud--land-right");
      } else if (angle === -90 || angle === 270) {
        bar.classList.add("hud--land-left");
      } else {
        // Fallback: rechts
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
    // große Zahlen kompakt
    if (v >= 1_000_000) return (v/1_000_000).toFixed(1).replace(".", ",")+" M";
    if (v >= 10_000)    return Math.round(v/1000)+" K";
    return String(v);
  }

  function bindNav() {
    const strip = $("#hud-strip");
    const left  = $(".hud-nav--left");
    const right = $(".hud-nav--right");

    on(left,  "click", () => {
      if (strip.scrollLeft !== undefined) strip.scrollLeft -= 200;
      else strip.scrollTop -= 200;
    });
    on(right, "click", () => {
      if (strip.scrollLeft !== undefined) strip.scrollLeft += 200;
      else strip.scrollTop += 200;
    });

    // Mauswheel -> horizontal scrollen im Portrait
    on(strip, "wheel", (e) => {
      if (strip.scrollLeft !== undefined && Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
        strip.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive:false });
  }

  // ------------------------------
  // Public API
  // ------------------------------
  function init(cfg = {}) {
    state.resources = cfg.resources || demoResources();
    state.frameSrc  = cfg.frameSrc || null;

    // optional: Pfad zum 9-Slice Rahmen dynamisch setzen
    if (state.frameSrc) {
      document.documentElement.style.setProperty("--hud-frame-src", `url("${state.frameSrc}")`);
    }

    render(state.resources);
    bindNav();
    setDockingByOrientation();

    // Orientation + Resize beobachten
    on(window, "resize", setDockingByOrientation);
    if (screen.orientation && screen.orientation.addEventListener) {
      on(screen.orientation, "change", setDockingByOrientation);
    }

    console.log("[HUD] ready with", state.resources.length, "resources.");
  }

  function setAmounts(map) {
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(`amt-${id}`);
      if (el) el.textContent = formatAmt(val);
      if (state.byId[id]) state.byId[id].amount = val;
    });
  }

  // Demo-Daten falls nichts übergeben wird
  function demoResources() {
    return [
      { id:"wood",  name:"Holz",  amount:120, icon:"assets/icons/wood.png"  },
      { id:"stone", name:"Stein", amount:85,  icon:"assets/icons/stone.png" },
      { id:"fish",  name:"Fisch", amount:42,  icon:"assets/icons/fish.png"  },
      { id:"food",  name:"Nahrung", amount:63, icon:"assets/icons/food.png" },
      { id:"gold",  name:"Gold",  amount:7,   icon:"assets/icons/gold.png"  },
      { id:"pop",   name:"Bev.",  amount:24,  icon:"assets/icons/pop.png"   }
    ];
  }

  return { init, setAmounts };
})();

// Auto-Init, falls direkt eingebunden
window.addEventListener("DOMContentLoaded", () => {
  HUD.init({
    // frameSrc: "assets/ui/frame_wood_parchment_v2_2.svg"  // <- optional überschreiben
  });
  // Beispiel-Update
  setTimeout(() => HUD.setAmounts({ wood: 135, stone: 93 }), 1500);
});

export default HUD;
