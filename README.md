# siedler-mini
siedler-mini-v11

siedler-mini-v11/
│
├── index.html
├── main.js
├── manifest.webmanifest
├── sw.js
└── assets/
    ├── hq_wood.png
    ├── hq_stone.png
    ├── road.png
    ├── depot.png
    ├── carrier.png
    └── … (weitere Texturen)

index.html          // nur Loader + Canvas + UI
main.js             // Initialisierung, Loop, State-Management
core/
 ├─ assets.js       // Laden und Verwalten der Texturen
 ├─ camera.js       // Pan/Zoom-Logik
 ├─ input.js        // Pointer Events speziell für Touch
 ├─ render.js       // Spielfeld zeichnen
 ├─ world.js        // Spiellogik (Bauen, Abriss, Rohstoffe)
 ├─ ui.js           // Buttons, Menüs, HUD
 └─ sim.js          // Produktion, Träger, Wegfindung
assets/
 └─ *.png           // Texturen



index.html
main.js
/core/
  assets.js
  camera.js
  input.js
  render.js
  world.js
/assets/
  grass.png  water.png  shore.png
  road_straight.png  road_curve.png
  hq_wood.png  lumberjack.png  depot.png
