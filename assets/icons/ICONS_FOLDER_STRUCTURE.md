# 📂 ICONS_FOLDER_STRUCTURE.md – Ordner & Kategorien für Spiel-Icons
*Version:* v1.0 · Sprache: DE · Ziel: Klare Struktur für HUD, Bau-Menü, Inspector/Editor und optionale Erweiterungen.

---

## 🎯 Ziel
Eine saubere, konsistente Ablage aller Icon-PNGs (64×64, transparent) inkl. optionaler Kategorien für spätere Epochen/Features.

---

## 🗂️ Ordnerstruktur (empfohlen)

```text
assets/
└─ icons/
   ├─ ui/                # UI/Inspector/Editor (Status, Debug, Dialoge, Tools)
   │  ├─ ok.png
   │  ├─ info.png
   │  ├─ warn.png
   │  ├─ error.png
   │  ├─ path.png
   │  ├─ heatmap.png
   │  ├─ collision.png
   │  ├─ entrance.png
   │  ├─ stats.png
   │  ├─ confirm.png
   │  ├─ cancel.png
   │  ├─ brush.png
   │  ├─ eraser.png
   │  ├─ select.png
   │  ├─ move.png
   │  ├─ undo.png
   │  ├─ redo.png
   │  ├─ save.png
   │  ├─ load.png
   │  ├─ export.png
   │  └─ import.png
   │
   ├─ resources/         # HUD-Ressourcen (Pflicht)
   │  ├─ wood.png
   │  ├─ stone.png
   │  ├─ fish.png
   │  ├─ grain.png
   │  ├─ bread.png
   │  ├─ bricks.png
   │  ├─ ore.png
   │  ├─ tools.png
   │  ├─ weapons.png
   │  ├─ gold.png
   │  ├─ paper.png
   │  ├─ knowledge.png
   │  ├─ prestige.png
   │  ├─ diplomacy.png
   │  └─ population.png
   │
   ├─ buildings/         # Bau-Menü (Gebäude-Icons)
   │  ├─ hq.png
   │  ├─ lumberjack.png
   │  ├─ fishery.png
   │  ├─ quarry.png
   │  ├─ farm.png
   │  └─ ... (später: smith.png, bakery.png, ...)
   │
   ├─ food/              # Nahrungsmittel & Getränke (optional)
   │  ├─ egg.png
   │  ├─ fried_egg.png
   │  ├─ nest_eggs.png
   │  ├─ meal_bento.png
   │  ├─ meal_soup.png
   │  ├─ meal_stew.png
   │  ├─ drink_wine.png
   │  ├─ drink_soda.png
   │  ├─ drink_coffee.png
   │  ├─ drink_beer.png
   │  └─ drink_tea.png
   │
   ├─ nature/            # Natur & Deko (optional)
   │  ├─ tree_broadleaf.png
   │  ├─ tree_pine.png
   │  ├─ tree_palm.png
   │  ├─ flower_rose.png
   │  ├─ flower_tulip.png
   │  ├─ flower_daisy.png
   │  ├─ flower_sakura.png
   │  ├─ plant_potted.png
   │  ├─ plant_seedling.png
   │  ├─ mushroom.png
   │  └─ clover.png
   │
   ├─ animals/           # Tiere (optional)
   │  ├─ bee.png
   │  ├─ cow.png
   │  ├─ goat.png
   │  ├─ horse.png
   │  ├─ cat.png
   │  ├─ dog.png
   │  ├─ fish_animal.png
   │  └─ ... (deer.png, chicken.png, sheep.png, ...)
   │
   ├─ weather/           # Wetter & Elemente (optional)
   │  ├─ sun.png
   │  ├─ rain.png
   │  ├─ snow.png
   │  ├─ wind.png
   │  ├─ lightning.png
   │  ├─ fire.png
   │  ├─ earth.png
   │  ├─ rainbow.png
   │  └─ tornado.png
   │
   └─ misc/              # Kultur & Sonstiges (optional)
      ├─ music.png
      ├─ notes.png
      ├─ trophy.png
      ├─ castle.png
      ├─ map.png
      ├─ moai.png
      └─ statue.png
```

---

## ✅ Regeln & Konventionen
- **Dateiformat:** PNG, 64×64 px, transparenter Hintergrund.
- **Benennung:** `snake_case`, nur ASCII (`tree_broadleaf.png`, nicht `Tree-Broadleaf.png`).
- **Stil:** Mittelalterlich, handgemalt, farbig (S4-inspiriert). Gleiches Shading pro Kategorie.
- **HUD-Klarheit:** Holz = **🪵 wood.png** (Holzstämme), **Bäume** gehören nach `nature/`.
- **Atlas/Preview:** Für Sets zusätzlich `*_preview.png` + `*_atlas.json` im jeweiligen Ordner oder unter `assets/icons/` ablegen.

---

## 🔗 Integration (Beispiel)
**JS (Loader):**
```js
import { loadImage } from './core/assets.js'; // Beispiel

const ICONS = {
  ok: 'assets/icons/ui/ok.png',
  wood: 'assets/icons/resources/wood.png',
  hq: 'assets/icons/buildings/hq.png',
  sun: 'assets/icons/weather/sun.png',
};

export default ICONS;
```

**CSS (HUD-Größe):**
```css
.hud-icon {
  width: 24px;
  height: 24px;
  image-rendering: pixelated;
}
```

**Mermaid-Übersicht:** Siehe `ICONS_FOLDER_STRUCTURE.mmd`.
