/* ui-build.css — v16.3.3
   Styling für Build-Toggle, Build-Bar, Tabs & Tool-Buttons
   Kompatibel zu unserem ui-build.js (IDs/Klassen siehe unten).
   - Toggle-Button: #build-toggle (links unten)
   - Leiste/Panel:  #build-bar     (unten, über Safe-Area)
   - Tabs:          .build-tabs .tab
   - Tools:         .build-grid .tool
*/

/* ========= Root & Theme ========= */
:root{
  --ui-bg: rgba(20,28,24,0.68);
  --ui-bg-strong: rgba(20,28,24,0.82);
  --ui-stroke: rgba(255,255,255,0.06);
  --ui-shadow: 0 8px 24px rgba(0,0,0,0.35);
  --ui-radius: 14px;

  --txt: #e8efe9;
  --txt-dim: #c2d0c7;
  --txt-muted: #a8b7ad;

  --accent: #44d27d;     /* OK/Primary */
  --accent-2: #7fb2ff;   /* Secondary */
  --danger: #ff4f64;     /* Abriss */
  --tab: rgba(255,255,255,0.08);

  --btn-bg: rgba(255,255,255,0.06);
  --btn-bg-active: rgba(255,255,255,0.14);
  --btn-border: rgba(255,255,255,0.10);

  --glass-blur: 18px;
  --ring: 0 0 0 2px rgba(255,255,255,0.20) inset;
}

html,body{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"; }

/* ========= Helper ========= */
.hidden{ display:none !important; }
.visually-hidden{ position:absolute !important; left:-9999px; top:auto; width:1px; height:1px; overflow:hidden; }

/* ========= Toggle (links unten) ========= */
#build-toggle{
  position: fixed;
  left: calc(env(safe-area-inset-left, 0px) + 16px);
  bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  z-index: 40;
  width: 56px; height: 56px;
  border-radius: 999px;
  display: grid; place-items: center;
  color: var(--txt);
  background: var(--ui-bg-strong);
  -webkit-backdrop-filter: blur(var(--glass-blur)); backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--ui-shadow);
  border: 1px solid var(--ui-stroke);
  cursor: pointer;
  user-select: none; -webkit-user-select: none;
  transform: translateZ(0);
}
#build-toggle svg, #build-toggle img{ width: 24px; height: 24px; opacity:.95; }
#build-toggle:active{ transform: scale(0.98); }
#build-toggle.is-active{ box-shadow: var(--ui-shadow), var(--ring); }

/* ========= Build-Bar (unten) ========= */
#build-bar{
  position: fixed;
  left: calc(env(safe-area-inset-left, 0px) + 8px);
  right: calc(env(safe-area-inset-right, 0px) + 8px);
  bottom: calc(env(safe-area-inset-bottom, 0px) + 8px);
  z-index: 39;
  color: var(--txt);
  background: var(--ui-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)); backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--ui-stroke);
  border-radius: var(--ui-radius);
  box-shadow: var(--ui-shadow);
  padding: 10px 10px 12px;
  opacity: 0; pointer-events: none; transform: translateY(12px);
  transition: opacity .18s ease, transform .18s ease;
}
#build-bar.open{ opacity: 1; pointer-events: auto; transform: translateY(0); }

/* Layout: Tabs oben, Tool-Grid unten */
.build-bar-inner{
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 10px;
}

/* ========= Tabs (Kategorien) ========= */
.build-tabs{
  display: flex; gap: 8px;
  overflow-x: auto; -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding: 2px 2px 0;
}
.build-tabs::-webkit-scrollbar{ display:none; }

.tab{
  flex: 0 0 auto;
  padding: 10px 12px;
  border-radius: 999px;
  color: var(--txt-dim);
  background: var(--tab);
  border: 1px solid var(--ui-stroke);
  font-weight: 600;
  letter-spacing: .2px;
  line-height: 1;
  user-select: none;
}
.tab:active{ transform: translateY(1px); }
.tab.is-active{ color: var(--txt); background: var(--btn-bg-active); box-shadow: var(--ring); }

/* ========= Tool-Grid ========= */
.build-grid{
  display: grid;
  grid-template-columns: repeat( auto-fit, minmax(132px,1fr) );
  gap: 10px;
}

/* Ein Eintrag/Tool-Button */
.tool{
  display: grid;
  grid-template-columns: 28px 1fr;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  color: var(--txt);
  border: 1px solid var(--btn-border);
  background: var(--btn-bg);
}
.tool:active{ transform: translateY(1px); }
.tool.is-active{ background: var(--btn-bg-active); box-shadow: var(--ring); }
.tool.is-primary{ border-color: color-mix(in oklab, var(--accent) 45%, var(--btn-border)); }
.tool.is-danger { border-color: color-mix(in oklab, var(--danger) 45%, var(--btn-border)); }

.tool__icon{
  width: 28px; height: 28px; display:grid; place-items:center;
  border-radius: 8px;
  background: rgba(255,255,255,0.07);
}
.tool__icon img, .tool__icon svg{ width: 20px; height: 20px; object-fit: contain; }
.tool__label{
  font-weight: 600; letter-spacing: .2px; line-height: 1.1;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* Spezielle Stati (z.B. Bulldozer als Gefahr) */
.tool--danger{ color: #ffe7eb; background: color-mix(in oklab, var(--danger) 12%, var(--btn-bg)); }
.tool--danger .tool__icon{ background: color-mix(in oklab, var(--danger) 24%, rgba(255,255,255,0.07)); }

/* ========= Responsive Tuning ========= */
@media (max-width: 420px){
  .build-grid{ grid-template-columns: repeat( auto-fit, minmax(120px,1fr) ); gap: 8px; }
  .tool{ padding: 9px 10px; }
}
@media (min-width: 900px){
  #build-bar{ left: 12%; right: 12%; }
}

/* ========= Animations/Focus ========= */
.tab:focus-visible, .tool:focus-visible, #build-toggle:focus-visible{
  outline: none; box-shadow: var(--ring);
}

/* ========= „Docking“-Stubs für Canvas / HUD =========
   Falls du unten links noch weitere HUD-Buttons hast: mit diesem
   Abstand verhindern wir Überschneidungen. */
.hud-bottom-left-spacer{
  position: fixed;
  left: 0;
  bottom: 0;
  width: 92px;                     /* Platz für Toggle + Inspector-Button */
  height: calc(56px + 24px + env(safe-area-inset-bottom,0px));
  pointer-events: none;
}

/* ========= Z-Index Leitplanke =========
   (Nur zur Dokumentation; Inspector liegt idR darüber) */
#inspector, .inspector{ z-index: 50; } /* dein Inspector */
