// ============================================================================
// Datei : ui/ui-hud.js
// Projekt: Neue Siedler
// Version: v1.2.0 (2025-10-13)
// Zweck  : HUD rendern, Docking & korrekte Rotation L/R, Panel-SVG pro Zelle,
//          optionaler Inspector-Tuner für Live-Feintuning.
// API    : HUD.init({ resources, frameSrc?, tuner?: true|false })
//          HUD.setAmounts({holz:123, ...})
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
  const state = { resources: [], byId:{}, frameSrc:null, forceSide:null };

  const $ = (sel, root=document)=>root.querySelector(sel);
  const on = (el, ev, fn, opt)=> el && el.addEventListener(ev, fn, opt);

  function effectiveOrientation(){
    // robust: falls Orientation API fehlt → aus Seitenverhältnis ableiten
    const isLandscape = window.innerWidth > window.innerHeight;
    const angle = (screen.orientation && Number.isFinite(screen.orientation.angle))
      ? screen.orientation.angle
      : (typeof window.orientation === "number" ? ((window.orientation%360)+360)%360 : (isLandscape ? 90 : 0));
    return { isLandscape, angle };
  }

  function setDocking(){
    const bar = $("#hud-bar");
    const { isLandscape, angle } = effectiveOrientation();

    bar.classList.remove("hud--portrait","hud--land-left","hud--land-right");

    if (!isLandscape){
      bar.classList.add("hud--portrait");
      return;
    }

    // Manuelle Übersteuerung (Inspector)
    if (state.forceSide === "left"){ bar.classList.add("hud--land-left"); return; }
    if (state.forceSide === "right"){ bar.classList.add("hud--land-right"); return; }

    // automatisch: 90° → rechts, 270°/-90° → links, sonst rechts als Fallback
    if (angle === 90){ bar.classList.add("hud--land-right"); }
    else if (angle === 270){ bar.classList.add("hud--land-left"); }
    else { bar.classList.add("hud--land-right"); }
  }

  function render(resources){
    const strip = $("#hud-strip");
    strip.innerHTML = "";

    resources.forEach(res=>{
      const cell  = document.createElement("div");
      cell.className = "hud-cell";

      const inner = document.createElement("div");
      inner.className = "hud-cell__content";
      inner.innerHTML = `
        <div class="hud-name">${res.name}</div>
        <img class="hud-icon" src="${res.icon}" alt="${res.name}">
        <div class="hud-amt" id="amt-${res.id}">${fmt(res.amount)}</div>
      `;

      cell.appendChild(inner);
      strip.appendChild(cell);
      state.byId[res.id] = res;
    });
  }

  function fmt(v){
    if (typeof v !== "number") return v ?? "0";
    if (v >= 1_000_000) return (v/1_000_000).toFixed(1).replace(".", ",")+" M";
    if (v >= 10_000)    return Math.round(v/1000)+" K";
    return String(v);
  }

  function init(cfg={}){
    state.resources = cfg.resources || demo();
    state.frameSrc  = cfg.frameSrc || null;

    if (state.frameSrc){
      document.documentElement.style.setProperty("--hud-frame-src", `url("${state.frameSrc}")`);
    }

    render(state.resources);
    setDocking();

    on(window, "resize", setDocking);
    if (screen.orientation?.addEventListener){ on(screen.orientation, "change", setDocking); }
    on(window, "orientationchange", setDocking); // iOS

    // Optionaler Inspector-Tuner
    if (cfg.tuner) mountTuner();
    console.log("[HUD] ready", state.resources.length);
  }

  function setAmounts(map){
    for (const [id,val] of Object.entries(map)){
      const el = document.getElementById(`amt-${id}`);
      if (el) el.textContent = fmt(val);
      if (state.byId[id]) state.byId[id].amount = val;
    }
  }

  function demo(){
    return [
      { id:"wood",  name:"Holz",  amount:120, icon:"assets/icons/resources/wood.png"  },
      { id:"stone", name:"Stein", amount:85,  icon:"assets/icons/resources/stone.png" },
      { id:"fish",  name:"Fisch", amount:42,  icon:"assets/icons/resources/fish.png"  },
      { id:"food",  name:"Nahrung", amount:63, icon:"assets/icons/resources/food.png" },
      { id:"gold",  name:"Gold",  amount:7,   icon:"assets/icons/resources/gold.png"  },
      { id:"pop",   name:"Bev.",  amount:24,  icon:"assets/icons/resources/pop.png"   }
    ];
  }

  /* ---------- kleiner Inspector-Tuner (optional) ---------- */
  function mountTuner(){
    if ($("#hud-tuner")) return;
    const box = document.createElement("div");
    box.id = "hud-tuner";
    box.innerHTML = `
      <label>Portrait Höhe: <input id="t-php" type="range" min="40" max="120" value="72"></label>
      <label>Portrait Zelle: <input id="t-ps"  type="range" min="40" max="120" value="64"></label>
      <label>Landscape Breite: <input id="t-lw" type="range" min="48" max="160" value="80"></label>
      <label>Landscape Zelle: <input id="t-ls" type="range" min="56" max="160" value="72"></label>
      <label>Dock: 
        <select id="t-side">
          <option value="">auto</option>
          <option value="left">links</option>
          <option value="right">rechts</option>
        </select>
      </label>
    `;
    document.body.appendChild(box);

    const setVar = (n,v)=> document.documentElement.style.setProperty(n, v);
    $("#t-php").addEventListener("input", e=> setVar("--hud-height-portrait", e.target.value+"px"));
    $("#t-ps").addEventListener("input",  e=> setVar("--cell-size-portrait", e.target.value+"px"));
    $("#t-lw").addEventListener("input",  e=> setVar("--hud-width-landscape", e.target.value+"px"));
    $("#t-ls").addEventListener("input",  e=> setVar("--cell-size-land", e.target.value+"px"));
    $("#t-side").addEventListener("change", e=> { state.forceSide = e.target.value || null; setDocking(); });

    // Toggle per Taste "H" ein/aus
    window.addEventListener("keydown", (ev)=>{
      if (ev.key.toLowerCase() === "h"){
        box.style.display = box.style.display === "none" ? "grid" : "none";
      }
    });
  }

  return { init, setAmounts };
})();

// Auto-Init (falls als Standalone in Testseite)
window.addEventListener("DOMContentLoaded", ()=>{
  HUD.init({
    frameSrc: "assets/ui/panel.svg",
    tuner: true  // Inspector-Tuner aktiv (toggle per Taste "H")
  });
  setTimeout(()=>HUD.setAmounts({ wood: 135, stone: 93 }), 1500);
});

export default HUD;
