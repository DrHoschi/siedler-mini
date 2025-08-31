/* assets/ui/ui-build.js — Build-UI mit Tabs/Kategorien (kompakte Thumbs)
   Version v16.1.9 (ES5) */
(function () {
  'use strict';

  var VERSION = "v16.1.9";
  var STYLE_ID = "cb-ui-build-style";

  function ok(){ (window.CBLog && CBLog.ok ? CBLog.ok : console.log).apply(console, arguments); }
  function warn(){ (window.CBLog && CBLog.warn ? CBLog.warn : console.warn).apply(console, arguments); }

  // Styles für kompakte Thumbnails
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      ".cb-fab-build{position:fixed;left:12px;bottom:12px;width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;"
      +"background:rgba(0,0,0,.45);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.12);box-shadow:0 6px 18px rgba(0,0,0,.35);cursor:pointer;user-select:none;z-index:2000;opacity:0;pointer-events:none;transition:opacity .2s ease}"
      +".cb-fab-build.is-visible{opacity:1;pointer-events:auto}"
      +".cb-fab-build img{width:28px;height:28px;display:block}"
      +".cb-build-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.25);backdrop-filter:blur(2px);z-index:1998;opacity:0;pointer-events:none;transition:opacity .2s ease}"
      +".cb-build-backdrop.is-open{opacity:1;pointer-events:auto}"
      +".cb-build{position:fixed;left:0;right:0;bottom:0;background:rgba(20,30,25,.92);backdrop-filter:blur(10px);border-top:1px solid rgba(255,255,255,.12);"
      +"box-shadow:0 -18px 40px rgba(0,0,0,.35);z-index:1999;transform:translateY(100%);transition:transform .22s ease}"
      +".cb-build.is-open{transform:translateY(0)}"
      +".cb-build__head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px}"
      +".cb-build__title{font:700 16px system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#dfe7df}"
      +".cb-build__close{appearance:none;border:none;border-radius:8px;padding:8px 10px;background:rgba(255,255,255,.08);color:#e7efe7;font-weight:600;cursor:pointer}"

      +".cb-tabs{display:flex;gap:8px;padding:0 12px 8px;flex-wrap:wrap}"
      +".cb-tab{appearance:none;border:none;border-radius:10px;padding:6px 10px;background:rgba(255,255,255,.08);color:#e7efe7;cursor:pointer;font-weight:600;font-size:13px}"
      +".cb-tab.is-active{background:rgba(92,205,139,.22);outline:1px solid rgba(92,205,139,.4)}"

      +".cb-grid{display:grid;gap:10px;padding:8px 12px 12px;grid-template-columns:repeat(3,minmax(0,1fr))}"
      +"@media(min-width:600px){.cb-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}"
      +"@media(min-width:1000px){.cb-grid{grid-template-columns:repeat(6,minmax(0,1fr))}}"

      +".cb-tile{height:64px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.12);"
      +"background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;position:relative;cursor:pointer}"
      +".cb-tile__img{max-width:90%;max-height:90%;width:auto;height:auto;object-fit:contain;image-rendering:auto}"
      +".cb-tile__label{position:absolute;left:6px;bottom:4px;right:6px;font-size:11px;color:#e8efe8;text-shadow:0 1px 0 rgba(0,0,0,.6);font-weight:700;text-align:center;opacity:.95}"

      +"@media(min-width:840px){.cb-build{left:10vw;right:10vw;border-radius:16px 16px 0 0}}";
    var el = document.createElement("style"); el.id = STYLE_ID; el.textContent = css; document.head.appendChild(el);
  }

  // Kategorien + Einträge (Keys passen zu game.js: BUILDINGS)
  var CATALOG = {
    "Infrastruktur": [
      { key:"road",      label:"Straße",    img:"assets/tex/road/topdown_road_straight.png", type:"tool" },
      { key:"path",      label:"Weg",       img:"assets/tex/path/topdown_path0.PNG",         type:"tool" },
      { key:"bulldozer", label:"Abreißen",  img:"assets/icons/icons_spritesheet_64.png",     type:"tool" }
    ],
    "Gebäude": [
      { key:"townhall",   label:"Rathaus",     img:"assets/tex/building/Holz_Rathaus_1.png",        type:"building" },
      { key:"depot",      label:"Lager",       img:"assets/tex/building/wood/depot_wood.PNG",       type:"building" },
      { key:"lumberjack", label:"Holzfäller",  img:"assets/tex/building/wood/lumberjack_wood.PNG",  type:"building" },
      { key:"farm",       label:"Farm",        img:"assets/tex/building/wood/farm_wood.PNG",        type:"building" },
      { key:"mill",       label:"Windmühle",   img:"assets/tex/building/wood/windmuehle_wood.PNG",  type:"building" },
      { key:"watermill",  label:"Wassermühle", img:"assets/tex/building/wood/wassermuehle_wood.PNG",type:"building" },
      { key:"bakery",     label:"Bäckerei",    img:"assets/tex/building/wood/baeckerei_wood.PNG",   type:"building" },
      { key:"blacksmith", label:"Schmied",     img:"assets/tex/building/wood/Schmied_wood0.png",    type:"building" },
      { key:"stonecutter",label:"Steinmetz",   img:"assets/tex/building/wood/steinmetz_wood.png",   type:"building" }
    ],
    "Wohnen": [
      { key:"house0",     label:"Wohnhaus A",  img:"assets/tex/building/wood/haeuser_wood1.PNG",    type:"building" },
      { key:"house1",     label:"Wohnhaus B",  img:"assets/tex/building/wood/haeuser_wood2.PNG",    type:"building" }
    ],
    "Militär": [
      { key:"watchtower", label:"Wachturm",    img:"assets/tex/building/wood/wachturm _wood.png",   type:"building" }
    ],
    "Deko": [
      { key:"tree",       label:"Baum",        img:"assets/tex/terrain/sm_topdown_tree_needle0_ug0.PNG", type:"building" }
    ]
  };

  var fab, backdrop, panel, tabsWrap, grid;
  var currentTab = null, isOpen = false, started = false;

  function createFab(){
    if (fab) return fab;
    fab = document.createElement("button");
    fab.className = "cb-fab-build";
    fab.title = "Bau-Menü öffnen (B)";
    var img = document.createElement("img");
    img.src = "assets/icons/icons_spritesheet_64.png";
    img.alt = "B
