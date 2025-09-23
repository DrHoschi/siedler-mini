# 🎨 ICONS README

Dieses Verzeichnis enthält alle **Spiel-Icons** für das Projekt *Neue Siedler*.  
Die Icons sind im **64×64 px Format**, transparent, handgemalt (Siedler-4 inspiriert).

---

## 📂 Struktur

Die Icons sind nach Gameplay-Kategorien in Unterordner sortiert:

- **`ui/`** → Inspector, Debug & Editor-Icons (Status, Logs, Pfade, Dialoge, Werkzeuge)  
- **`resources/`** → HUD-Ressourcen (Holz, Stein, Nahrung, Erz, Gold, Wissen, Bevölkerung, etc.)  
- **`buildings/`** → Bau-Menü-Icons (HQ, Holzfällerhütte, Fischerhütte, Steinbruch, Farm, Schmiede, Bäckerei …)  
- **`food/`** → Nahrungsmittel & Getränke (Eier, Mahlzeiten, Getränke)  
- **`nature/`** → Pflanzen, Bäume, Blumen, Pilze, Deko-Elemente  
- **`animals/`** → Nutz- und Wildtiere, Fische, Insekten  
- **`weather/`** → Wetter & Elemente (Sonne, Regen, Schnee, Feuer, Wind, Blitz, Regenbogen, Tornado)  
- **`misc/`** → Kultur & Sonstiges (Musik, Trophäe, Statue, Karten, Deko-Objekte)  

---

## 📋 Checklisten

- Siehe [ICONS_CHECKLIST.md](./ICONS_CHECKLIST.md) → zeigt, welche Ordner bereits befüllt sind.  
- Siehe [ICONS_FOLDER_STRUCTURE.md](./ICONS_FOLDER_STRUCTURE.md) → definiert die Ziel-Struktur.  
- Siehe [ICONS_CHECKLIST.mmd](./ICONS_CHECKLIST.mmd) → visuelle Übersicht (Mermaid).  

---

## 🧾 Konventionen

- **Format:** PNG, 64×64 px, transparent  
- **Benennung:** `snake_case`, ASCII (`tree_pine.png`, nicht `TreePine.PNG`)  
- **Stil:** mittelalterlich, handgemalt, farbig (Siedler-4 Look)  
- **HUD-Regel:** Holz = **🪵 wood.png** (Holzstämme), **Bäume** → nur in `nature/`  
- **Atlas:** Für Sets gibt es Sprite-Sheets + JSON-Atlanten (z. B. `resources_preview.png` + `resources_atlas.json`)  

---

## 🔗 Integration

### JavaScript Beispiel
```js
import ICONS from './assets/icons/icons.js';

ctx.drawImage(ICONS['wood'], x, y, 24, 24); // HUD: Holz-Icon
```

### CSS Beispiel
```css
.hud-icon {
  width: 24px;
  height: 24px;
  image-rendering: pixelated;
}
```

---

## ✅ Status

- Pflicht-Icons **fertig:** `resources/`, `ui/`  
- Optionale Kategorien **in Arbeit:** `buildings/`, `food/`, `nature/`, `animals/`, `weather/`, `misc/`  
