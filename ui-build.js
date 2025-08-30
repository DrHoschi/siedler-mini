/* ui-build.js — CityBuilder Build-UI
 * Version: v16.1.6 (ES5)
 * Zweck: Bau-Menü + öffentlicher API-Hook für Start-Flow
 * Pfad: /ui-build.js (Root!)
 *
 * Öffentliche API auf window.GameUI:
 * - openBuildMenu(), closeBuildMenu(), toggleBuildMenu()
 * - showBuildButton(), hideBuildButton()
 * - onGameStarted() → vom Start-Flow aufzurufen ODER Event 'cb:game-started' dispatchen
 *
 * UI-Verhalten:
 * - Runde FAB unten links (erscheint erst nach Spielstart)
 * - Bau-Menü als Bottom-Sheet; Buttons zeigen jeweils EIN Icon (Sprite/Preview)
 * - Tastatur: Taste "B" toggelt Bau-Menü (Desktop)
 *
 * Logging:
 * - Nutzt window.Debug.ok/warn/err falls vorhanden, sonst console.log
 */
(function () {
  var VERSION = "v16.1.6"; // beibehalten

  // ---------- Utility: Logging sicher kapseln ----------
  var Debug = window.Debug || {};
  function logOk() {
    if (Debug.ok) return Debug.ok.apply(Debug, arguments);
    var a = Array.prototype.slice.call(arguments);
    a.unshift("[ok]");
    return console.log.apply(console, a);
  }
  function logWarn() {
    if (Debug.warn) return Debug.warn.apply(Debug, arguments);
    var a = Array.prototype.slice.call(arguments);
    a.unshift("[warn]");
    return console.warn.apply(console, a);
  }
  function logErr() {
    if (Debug.err) return Debug.err.apply(Debug, arguments);
    var a = Array.prototype.slice.call(arguments);
    a.unshift("[err]");
    return console.error.apply(console, a);
  }

  // ---------- DOM Referenzen / State ----------
  var rootFabBtn = null;   // runder Build-FAB (links unten)
  var panel = null;        // Bottom-Sheet Panel
  var panelBackdrop = null;// halbtransparenter Backdrop
  var started = false;     // wird auf true gesetzt, wenn Spiel gestartet
  var isOpen = false;      // Status Bau-Menü
  var initialized = false;

  // ---------- Styles (scoped, damit ohne CSS-Datei lauffähig) ----------
  var STYLE_ID = "cb-ui-build-style";
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css = "/* === ui-build (v16.1.6) === */\n"
      + ".cb-fab-build{position:fixed;left:12px;bottom:12px;width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;"
      + "background:rgba(0,0,0,0.45);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,0.12);box-shadow:0 6px 18px rgba(0,0,0,0.35);cursor:pointer;"
      + "user-select:none;z-index:2000;opacity:0;pointer-events:none;transition:opacity .2s ease}\n"
      + ".cb-fab-build.is-visible{opacity:1;pointer-events:auto}\n"
      + ".cb-fab-build img{width:28px;height:28px;display:block}\n"
      + ".cb-build-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.25);backdrop-filter:blur(2px);z-index:1998;opacity:0;pointer-events:none;transition:opacity .2s ease}\n"
      + ".cb-build-backdrop.is-open{opacity:1;pointer-events:auto}\n"
      + ".cb-build-panel{position:fixed;left:0;right:0;bottom:0;background:rgba(20,30,25,0.9);backdrop-filter:blur(10px);"
      + "border-top:1px solid rgba(255,255,255,0.12);box-shadow:0 -18px 40px rgba(0,0,0,0.35);z-index:1999;transform:translateY(100%);transition:transform .22s ease}\n"
      + ".cb-build-panel.is-open{transform:translateY(0)}\n"
      + ".cb-build-panel__header{display:flex;align-items:center;justify-content:space-between;padding:10px 12px}\n"
      + ".cb-build-panel__title{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-weight:700;color:#dfe7df;font-size:16px}\n"
      + ".cb-build-panel__close{appearance:none;border:none;border-radius:8px;padding:8px 10px;background:rgba(255,255,255,0.08);color:#e7efe7;font-weight:600;cursor:pointer}\n"
      + ".cb-build-panel__grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;padding:10px 12px 14px}\n"
      + ".cb-build-tile{height:72px;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;position:relative;cursor:pointer}\n"
      + ".cb-build-tile__img{max-width:90%;max-height:90%;image-rendering:auto}\n"
      + ".cb-build-tile__label{position:absolute;left:8px;bottom:6px;right:8px;font-size:12px;color:#e8efe8;text-shadow:0 1px 0 rgba(0,0,0,0.6);font-weight:600;text-align:center}\n"
      + "@media (min-width:840px){.cb-build-panel{left:10vw;right:10vw;border-radius:16px 16px 0 0}}\n";
    var el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }

  // ---------- DOM aufbauen ----------
  function createFab() {
    if (rootFabBtn) return rootFabBtn;
    rootFabBtn = document.createElement("button");
    rootFabBtn.className = "cb-fab-build";
    rootFabBtn.title = "Bau-Menü öffnen (B)";

    var img = document.createElement("img");
    img.alt = "Bauen";
    img.src = (window.CB_ASSET_ICON_BUILD) || "assets/icons/icons_spritesheet_64.png";
    rootFabBtn.appendChild(img);

    rootFabBtn.addEventListener("click", function(){ toggleBuildMenu(); });
    document.body.appendChild(rootFabBtn);
    return rootFabBtn;
  }

  function createPanel() {
    if (panel) return panel;

    panelBackdrop = document.createElement("div");
    panelBackdrop.className = "cb-build-backdrop";
    panelBackdrop.addEventListener("click", function(){ closeBuildMenu(); });

    panel = document.createElement("div");
    panel.className = "cb-build-panel";

    var header = document.createElement("div");
    header.className = "cb-build-panel__header";
    var title = document.createElement("div");
    title.className = "cb-build-panel__title";
    title.textContent = "Bauen";
    var closeBtn = document.createElement("button");
    closeBtn.className = "cb-build-panel__close";
    closeBtn.textContent = "Schließen";
    closeBtn.addEventListener("click", function(){ closeBuildMenu(); });
    header.appendChild(title);
    header.appendChild(closeBtn);

    var grid = document.createElement("div");
    grid.className = "cb-build-panel__grid";

    // ---- Buttons: je EIN Bild je Kategorie (Icon-Preview) ----
    var entries = [
      { key: "road",      label: "Straße",     img: "assets/tex/road/topdown_road_straight.png" },
      { key: "path",      label: "Weg",        img: "assets/tex/path/topdown_path0.PNG" },
      { key: "bulldozer", label: "Abreißen",   img: "assets/icons/icons_spritesheet_64.png" },
      { key: "wood0",     label: "Lumberjack", img: "assets/buildings/lumberjack/lumberjack_tiers_grid.png" },
      { key: "factory",   label: "Fabrik",     img: "assets/tex/building/wood/windmuehle_wood.PNG" }
    ];

    for (var i=0;i<entries.length;i++){
      var e = entries[i];
      var btn = document.createElement("div");
      btn.className = "cb-build-tile";
      btn.setAttribute("data-key", e.key);

      var im = document.createElement("img");
      im.className = "cb-build-tile__img";
      im.alt = e.label;
      im.src = e.img;

      var lab = document.createElement("div");
      lab.className = "cb-build-tile__label";
      lab.textContent = e.label;

      btn.appendChild(im);
      btn.appendChild(lab);

      (function(entryKey){
        btn.addEventListener("click", function(){
          try {
            if (window.Game && typeof window.Game.setTool === "function") {
              window.Game.setTool(entryKey);
            }
            logOk("Tool gesetzt: " + entryKey);
          } catch (err) {
            logWarn("Tool setzen fehlgeschlagen: " + entryKey);
          }
          closeBuildMenu();
        });
      })(e.key);

      grid.appendChild(btn);
    }

    panel.appendChild(header);
    panel.appendChild(grid);

    document.body.appendChild(panelBackdrop);
    document.body.appendChild(panel);
    return panel;
  }

  // ---------- Öffentliche API ----------
  function openBuildMenu() {
    createPanel();
    if (isOpen) return;
    isOpen = true;
    panel.classList.add("is-open");
    panelBackdrop.classList.add("is-open");
    logOk("Bau-Menü geöffnet (ui-build.js " + VERSION + ")");
  }

  function closeBuildMenu() {
    if (!panel) return;
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove("is-open");
    panelBackdrop.classList.remove("is-open");
    logOk("Bau-Menü geschlossen");
  }

  function toggleBuildMenu() {
    if (isOpen) closeBuildMenu(); else openBuildMenu();
  }

  function showBuildButton() {
    createFab();
    rootFabBtn.classList.add("is-visible");
  }

  function hideBuildButton() {
    if (!rootFabBtn) return;
    rootFabBtn.classList.remove("is-visible");
  }

  function onGameStarted() {
    if (started) return;
    started = true;
    showBuildButton();
    logOk("Bau-Menü bereit (ui-build.js " + VERSION + ")");
  }

  // ---------- Init ----------
  function initOnce() {
    if (initialized) return;
    initialized = true;
    injectStyles();
    createFab(); // erstellt FAB, bleibt unsichtbar bis onGameStarted()

    // Tastatur-Fallback (Desktop)
    window.addEventListener("keydown", function(ev){
      var k = ev && ev.key ? String(ev.key).toLowerCase() : "";
      if (k === "b") toggleBuildMenu();
    });

    // Event-Hook: globaler Start-Trigger
    window.addEventListener("cb:game-started", onGameStarted, { passive: true });

    logOk("UI bereit (ui-build.js " + VERSION + ")");
  }

  // sofort initialisieren
  initOnce();

  // API publizieren
  var api = {
    version: VERSION,
    openBuildMenu: openBuildMenu,
    closeBuildMenu: closeBuildMenu,
    toggleBuildMenu: toggleBuildMenu,
    showBuildButton: showBuildButton,
    hideBuildButton: hideBuildButton,
    onGameStarted: onGameStarted
  };
  window.GameUI = (function(prev, ext){
    var out = {}; // merge wie Object.assign, aber ES5
    prev = prev || {};
    for (var k in prev) if (prev.hasOwnProperty(k)) out[k] = prev[k];
    for (var k2 in ext) if (ext.hasOwnProperty(k2)) out[k2] = ext[k2];
    return out;
  })(window.GameUI, api);
})();
