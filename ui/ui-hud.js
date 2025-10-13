// ============================================================================
// Datei : ui/ui-hud.js
// Projekt: Neue Siedler
// Version: v1.3.1
// Zweck  : HUD rendern, Portrait = oben / Landscape = immer links,
//          Inhalte lesbar halten (CSS-Variable), Panel.svg pro Zelle,
//          optionaler Inspector (Taste "H").
// API    : HUD.init({ resources?, frameSrc?, tuner?: boolean })
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
  const state = { resources: [], byId: {}, frameSrc: null };

  const $  = (sel, root=document)=>root.querySelector(sel);
  const on = (el, ev, fn, opt)=>el && el.addEventListener(ev, fn, opt);

  // Portrait = oben, Landscape = immer links (keine Seiten-Umschaltung)
  function setDocking(){
    const bar = $("#hud-bar");
    const isPortrait = window.matchMedia("(orientation: portrait)").matches;
    bar.classList.remove("hud--portrait", "hud--land-left");
    bar.classList.add(isPortrait ? "hud--portrait" : "hud--land-left");
  }

  function render(resources){
    const strip = $("#hud-strip");
    strip.innerHTML = "";

    resources.forEach(res=>{
      const cell = document.createElement("div");
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

    // Panel-Pfad zur Laufzeit setzen (falls gewünscht)
    if (state.frameSrc){
      document.documentElement.style.setProperty("--hud-frame-src", `url("${state.frameSrc}")`);
    }

    render(state.resources);
    setDocking();

    // Reagiere auf Drehen/Resize – nur Docking-Klasse umschalten
    on(window, "resize", setDocking);
    if (screen.orientation?.addEventListener) on(screen.orientation, "change", setDocking);
    on(window, "orientationchange", setDocking); // iOS-Fallback

    // Optionaler Inspector (Taste H)
    if (cfg.tuner) mountTuner();

    console.log("[HUD] ready – resources:", state.resources.length);
  }

  function setAmounts(map){
    for (const [id, val] of Object.entries(map)){
      const el = document.getElementById(`amt-${id}`);
      if (el) el.textContent = fmt(val);
      if (state.byId[id]) state.byId[id].amount = val;
    }
  }

  function demo(){
    return [
      { id:"wood",  name:"Holz",   amount:120, icon:"assets/icons/resources/wood.png"  },
      { id:"stone", name:"Stein",  amount:85,  icon:"assets/icons/resources/stone.png" },
      { id:"fish",  name:"Fisch",  amount:42,  icon:"assets/icons/resources/fish.png"  },
      { id:"food",  name:"Nahrung",amount:63,  icon:"assets/icons/resources/food.png"  },
      { id:"gold",  name:"Gold",   amount:7,   icon:"assets/icons/resources/gold.png"  },
      { id:"pop",   name:"Bev.",   amount:24,  icon:"assets/icons/resources/pop.png"   }
    ];
  }

  /* ---------- Inspector (Taste "H") -------------------------------------- */
  function mountTuner(){
    if ($("#hud-tuner")) return;
    const box = document.createElement("div");
    box.id = "hud-tuner";
    box.innerHTML = `
      <label>Portrait Höhe: <input id="t-php" type="range" min="40" max="140" value="72"></label>
      <label>Portrait Zelle: <input id="t-ps"  type="range" min="40" max="120" value="64"></label>
      <label>Landscape Breite: <input id="t-lw" type="range" min="56" max="160" value="84"></label>
      <label>Landscape Zelle: <input id="t-ls" type="range" min="56" max="160" value="72"></label>
      <label>Rotation L:
        <select id="t-rot">
          <option value="-90deg">-90° (Standard)</option>
          <option value="90deg">+90°</option>
        </select>
      </label>
      <span>Toggle <kbd>H</kbd></span>
    `;
    document.body.appendChild(box);

    const setVar = (n,v)=> document.documentElement.style.setProperty(n, v);
    $("#t-php").addEventListener("input", e=> setVar("--hud-height-portrait", e.target.value+"px"));
    $("#t-ps").addEventListener("input",  e=> setVar("--cell-size-portrait", e.target.value+"px"));
    $("#t-lw").addEventListener("input",  e=> setVar("--hud-width-landscape", e.target.value+"px"));
    $("#t-ls").addEventListener("input",  e=> setVar("--cell-size-land", e.target.value+"px"));
    $("#t-rot").addEventListener("change", e=> setVar("--land-rotation", e.target.value));

    window.addEventListener("keydown", (ev)=>{
      if (ev.key.toLowerCase() === "h"){
        box.style.display = (box.style.display === "none" || !box.style.display) ? "grid" : "none";
      }
    });
  }

  return { init, setAmounts };
})();

// Auto-Init (für Testseite)
window.addEventListener("DOMContentLoaded", ()=>{
  HUD.init({
    // Wenn du den Pfad lieber hier setzt statt in CSS:
   // frameSrc: "../../assets/ui/panel.svg",
    tuner: true
  });
  setTimeout(()=>HUD.setAmounts({ wood: 135, stone: 93 }), 1500);
});

export default HUD;
