// V15



/ (Root neben index.html)
  ├─ index.html
  ├─ boot.js
  ├─ main.js
  ├─ world.js
  ├─ render.js
  ├─ input.js
  ├─ storage.js
  └─ textures.js

assets/
  ├─ tex/
  │   ├─ topdown_grass.png
  │   ├─ topdown_dirt.png
  │   ├─ topdown_forest.png
  │   ├─ topdown_water.png
  │   ├─ topdown_road_straight.png
  │   ├─ topdown_road_corner.png
  │   ├─ topdown_road_t.png
  │   ├─ topdown_road_cross.png
  │   ├─ topdown_hq.png
  │   ├─ topdown_depot.png
  │   └─ topdown_woodcutter.png
  └─ sprites/
      ├─ carrier.png        (optional)
      └─ carrier.json       (optional, frames)


/index.html
/main.js
/render.js
/game.js        ← aus core hierher verschoben
/world.js       ← aus core hierher verschoben

/core/
    assets.js
    camera.js
    carriers.js
    input.js

/assets/
    carrier.png
    depot.png
    dirt.png
    grass.png
    hq_stone.png
    hq_wood.png
    lumberjack.png
    road.png
    road_curve.png
    road_straight.png
    rocky.png
    sand.png
    shore.png
    water.png
