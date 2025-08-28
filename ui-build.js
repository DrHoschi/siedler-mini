/* ui-build.js — CityBuilder Build-UI
 * Version: v16.1.6
 * Zweck: Bau-Menü + öffentlicher API-Hook für Start-Flow
 * Pfad:   /ui-build.js  (Root!)
 *
 * Öffentliche API auf window.GameUI:
 *  - openBuildMenu(), closeBuildMenu(), toggleBuildMenu()
 *  - showBuildButton(), hideBuildButton()
 *  - onGameStarted()  → vom Start-Flow aufzurufen ODER Event 'cb:game-started' dispatchen
 *
 * UI-Verhalten:
 *  - Runde FAB unten links (erscheint erst nach Spielstart)
 *  - Bau-Menü als Bottom-Sheet; Buttons zeigen jeweils EIN Icon (Sprite/Preview)
 *  - Tastatur: Taste "B" toggelt Bau-Menü (Desktop)
 *
 * Logging:
 *  - Nutzt window.Debug.ok/warn/err falls vorhanden, sonst console.log
 */

(function () {
  const VERSION = "v16.1.6";

  // ---------- Utility: Logging sicher kapseln ----------
  const Debug = window.Debug || {};
  const logOk   = (...a) => (Debug.ok   ? Debug.ok(...a)   : console.log("[ok]", ...a));
  const logWarn = (...a) => (Debug.warn ? Debug.warn(...a) : console.warn("[warn]", ...a));
  const logErr  = (...a) => (Debug.err  ? Debug.err(...a)  : console.error("[err]", ...a));

  // ---------- DOM Referenzen / State ----------
  let rootFabBtn = null;      // runder Build-FAB (links unten)
  let panel = null;           // Bottom-Sheet Panel
  let panelBackdrop = null;   // halbtransparenter Backdrop
  let started = false;        // wird auf true gesetzt, wenn Spiel gestartet
  let isOpen = false;         // Status Bau-Menü
  let initialized = false;

  // ---------- Styles (scoped, damit ohne CSS-Datei lauffähig) ----------
  const STYLE_ID = "cb-ui-build-style";
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const css = `
      /* === ui-build (v16.1.6) === */
      .cb-fab-build {
        position: fixed;
        left: 12px;
        bottom: 12px;
        width: 52px; height: 52px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,0.45);
        backdrop-filter: blur(6px);
        border: 1px solid rgba(255,255,255,0.12);
        box-shadow: 0 6px 18px rgba(0,0,0,0.35);
        cursor: pointer; user-select: none;
        z-index: 2000;
        opacity: 0; pointer-events: none; /* erst nach Start sichtbar */
        transition: opacity .2s ease;
      }
      .cb-fab-build.is-visible { opacity: 1; pointer-events: auto; }

      .cb-fab-build img { width: 28px; height: 28px; display:block; }

      .cb-build-backdrop {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.25);
        backdrop-filter: blur(2px);
        z-index: 1998;
        opacity: 0; pointer-events: none;
        transition: opacity .2s ease;
      }
      .cb-build-backdrop.is-open { opacity: 1; pointer-events: auto; }

      .cb-build-panel {
        position: fixed; left: 0; right: 0; bottom: 0;
        background: rgba(20,30,25,0.9);
        backdrop-filter: blur(10px);
        border-top: 1px solid rgba(255,255,255,0.12);
        box-shadow: 0 -18px 40px rgba(0,0,0,0.35);
        z-index: 1999;
        transform: translateY(100%);
        transition: transform .22s ease;
      }
      .cb-build-panel.is-open { transform: translateY(0); }

      .cb-build-panel__header {
        display:flex; align-items:center; justify-content:space-between;
        padding: 10px 12px;
      }
      .cb-build-panel__title {
        font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        font-weight: 700; color: #dfe7df; font-size: 16px;
      }
      .cb-build-panel__close {
        appearance: none; border: none; border-radius: 8px;
        padding: 8px 10px; background: rgba(255,255,255,0.08);
        color: #e7efe7; font-weight: 600; cursor: pointer;
      }

      .cb-build-panel__grid {
        display: grid; grid-template-columns: repeat(5, minmax(0,1fr));
        gap: 10px; padding: 10px 12px 14px;
      }
      .cb-build-tile {
        height: 72px; border-radius: 14px; overflow:hidden;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.08);
        display:flex; align-items:center; justify-content:center;
        position: relative; cursor: pointer;
      }
      .cb-build-tile__img { max-width: 90%; max-height: 90%; image-rendering: auto; }
      .cb-build-tile__label {
        position:absolute; left:8px; bottom:6px; right:8px;
        font-size:12px; color:#e8efe8; text-shadow: 0 1px 0 rgba(0,0,0,0.6);
        font-weight: 600; text-align:center;
      }

      @media (min-width: 840px) {
        .cb-build-panel { left: 10vw; right: 10vw; border-radius: 16px 16px 0 0; }
      }
    `;
    const el = document.createElement("style");
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
    // kleines Standard-Werkzeug-Icon – nimm dein eigenes, wenn vorhanden
    const img = document.createElement("img");
    img.alt = "Bauen";
    img.src = (window.CB_ASSET_ICON_BUILD) || "assets/icons/icons_spritesheet_64.png"; // Fallback
    rootFabBtn.appendChild(img);
    rootFabBtn.addEventListener("click", toggleBuildMenu);
    document.body.appendChild(rootFabBtn);
    return rootFabBtn;
  }

  function createPanel() {
    if (panel) return panel;

    panelBackdrop = document.createElement("div");
    panelBackdrop.className = "cb-build-backdrop";
    panelBackdrop.addEventListener("click", closeBuildMenu);

    panel = document.createElement("div");
    panel.className = "cb-build-panel";

    const header = document.createElement("div");
    header.className = "cb-build-panel__header";

    const title = document.createElement("div");
    title.className = "cb-build-panel__title";
    title.textContent = "Bauen";

    const closeBtn = document.createElement("button");
    closeBtn.className = "cb-build-panel__close";
    closeBtn.textContent = "Schließen";
    closeBtn.addEventListener("click", closeBuildMenu);

    header.appendChild(title);
    header.appendChild(closeBtn);

    const grid = document.createElement("div");
    grid.className = "cb-build-panel__grid";

    // ---- Buttons: je EIN Bild je Kategorie (weißes BG = „Icon“-Look) ----
    const entries = [
      { key: "road",   label: "Straße", img: "assets/tex/road/topdown_road_straight.png" },
      { key: "path",   label: "Weg",    img: "assets/tex/path/topdown_path0.PNG" },
      { key: "bulldozer", label: "Abreißen", img: "assets/icons/icons_spritesheet_64.png" },
      // Lumberjack Button (Hauptvorschau aus deinem Grid/Sprite)
      { key: "wood0",  label: "Lumberjack", img: "assets/buildings/lumberjack/lumberjack_tiers_grid.png",
        crop: { x: 0, y: 0, w: 512, h: 512 } // Hinweis: wir zeigen im UI nur EIN Bild – Platzhalter
      },
      { key: "factory", label: "Fabrik", img: "assets/tex/building/wood/windmuehle_wood.PNG" }
    ];

    for (const e of entries) {
      const btn = document.createElement("div");
      btn.className = "cb-build-tile";
      btn.dataset.key = e.key;

      const img = document.createElement("img");
      img.className = "cb-build-tile__img";
      img.alt = e.label;
      img.src = e.img;

      // Falls später echtes Cropping im Canvas gewünscht → hier ersetzen.
      // Aktuell: reduziertes Icon-Verhalten (nur EIN Bild sichtbar).

      const lab = document.createElement("div");
      lab.className = "cb-build-tile__label";
      lab.textContent = e.label;

      btn.appendChild(img);
      btn.appendChild(lab);
      btn.addEventListener("click", () => {
        // Tool setzen (delegiert an dein Spiel, falls vorhanden)
        try {
          if (window.Game && typeof window.Game.setTool === "function") {
            window.Game.setTool(e.key);
          }
          logOk(`Tool gesetzt: ${e.key}`);
        } catch (err) {
          logWarn(`Tool setzen fehlgeschlagen: ${e.key}`);
        }
        closeBuildMenu();
      });

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
    logOk(`Bau-Menü geöffnet (ui-build.js ${VERSION})`);
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
    (isOpen ? closeBuildMenu : openBuildMenu)();
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
    logOk(`Bau-Menü bereit (ui-build.js ${VERSION})`);
  }

  // ---------- Init ----------
  function initOnce() {
    if (initialized) return;
    initialized = true;
    injectStyles();
    createFab();  // erstellt FAB, aber bleibt unsichtbar bis onGameStarted()
    // Tastatur-Fallback (Desktop)
    window.addEventListener("keydown", (ev) => {
      if (ev.key?.toLowerCase() === "b") toggleBuildMenu();
    });
    // Event-Hook: globaler Start-Trigger
    window.addEventListener("cb:game-started", onGameStarted, { passive: true });
    logOk(`UI bereit (ui-build.js ${VERSION})`);
  }

  // sofort initialisieren
  initOnce();

  // API publizieren
  window.GameUI = Object.assign(window.GameUI || {}, {
    version: VERSION,
    openBuildMenu,
    closeBuildMenu,
    toggleBuildMenu,
    showBuildButton,
    hideBuildButton,
    onGameStarted
  });
})();
