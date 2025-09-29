/* ============================================================================
 * Datei   : ui/css/ui-start.css
 * Version : v19.0.1
 * Zweck   : Startfenster-UI mit Panel-Hintergrund (Holz/Papier)
 * Leitplanken:
 *   - Panel sichtbar bis cb:game-start
 *   - Hintergrundgrafiken: panel.png (Rahmen) + start-bg.jpg (Vollbild-BG)
 *   - Responsive Layout (ohne feste Breiten)
 * ========================================================================== */

:root{
  --start-radius: 16px;
  --start-shadow: 0 18px 48px rgba(0,0,0,.32);
}

/* Vollflächiger Hintergrund unter Panel */
#bg-start{
  position: fixed;
  inset: 0;
  z-index: 900; /* unter Panel, über Canvas */
  pointer-events: none;
  opacity: 1;
  transition: opacity .5s ease;
  background:
    radial-gradient(120% 120% at 50% 10%, rgba(0,0,0,.05) 0%,
                    rgba(0,0,0,.22) 70%, rgba(0,0,0,.34) 100%),
    url("../../assets/ui/start-bg.jpg") center/cover no-repeat;
}
#bg-start.fadeout{ opacity: 0; }

/* Panel selbst */
#start-panel{
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 1000;
  min-width: 280px;
  max-width: 92vw;
  color: #1b2430;

  background:
    url("../../assets/ui/panel.png") center center / contain no-repeat,
    linear-gradient(to bottom, rgba(243,247,251,.95), rgba(230,237,245,.95));

  border: 1px solid #cbd5e1;
  border-radius: var(--start-radius);
  box-shadow: var(--start-shadow);
  padding: 18px 20px;
}

/* Sichtbarkeitsklassen */
#start-panel.hidden { display:none !important; }
#start-panel.visible{ display:block !important; }

/* Titel */
#start-panel h1{
  margin: 0 0 12px 0;
  font: 600 22px/1.3 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  color: #1b2430;
  padding: 10px 12px;
  background: #e6edf5;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
}

/* Button-Stack */
#start-panel .actions{
  display: grid;
  gap: 10px;
  margin-top: 10px;
}
#start-panel button{
  appearance: none;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #0b1220;
  font: 600 16px/1.3 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  padding: 12px 14px;
  border-radius: 12px;
  box-shadow: 0 1px 0 rgba(255,255,255,.8) inset, 0 6px 18px rgba(0,0,0,.06);
  cursor: pointer;
}
#start-panel button:hover{ transform: translateY(-1px); }
#start-panel button:active{ transform: translateY(0); }

/* Responsive Tweaks */
@media (max-width: 600px){
  #start-panel{ top: 12px; left: 12px; min-width: 240px; }
  #start-panel button{ font-size: 14px; padding: 10px 12px; }
}
