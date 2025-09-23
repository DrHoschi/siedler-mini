# 🎨 ICONS_CATEGORIES.md – Icon-Kategorien (Spielbasis & Erweiterungen)
*Version:* v1.1 (Korrekturen: Holz = **🪵 Holzstämme**, Bäume sind **Pflanzen**)  

---

## 1) Kern-Icons (Pflicht, Spielbasis) — `assets/icons/core/`

### A. Status & Inspector
| Symbol | Name | Dateiname | Einsatz | Kommentar |
|---|---|---|---|---|
| ✅ | ok | `ok.png` | Logs/Tests | Erfolg |
| ℹ️ / 🔵ℹ️ | info | `info.png` | Logs/Dialoge | Rundes Info-Icon (blau) |
| ⚠️ | warn | `warn.png` | Logs | Achtung, braucht Handlung |
| ❌ | error | `error.png` | Logs/Dialogs | Fehler/Abbruch |

### B. Ressourcen (HUD)
> **WICHTIG:** Holz = **🪵 Holzstämme** (kein Baum-Icon).  
| Symbol | Name | Dateiname | Einsatz | Kommentar |
|---|---|---|---|---|
| 🪵 | Holz (Stämme) | `wood.png` | HUD/Costs | **Korrektur**: vorher fälschlich Baum |
| 🪨 | Stein | `stone.png` | HUD/Costs | Rohstoff |
| 🐟 | Nahrung (Fisch) | `fish.png` | HUD/Verbrauch | Basisnahrung E1 |
| 🌾 | Getreide | `grain.png` | HUD/Prod. | Ab Epoche 2 |
| 🍞 | Brot | `bread.png` | HUD/Prod. | Verarbeitet |
| 🧱 | Ziegel | `bricks.png` | HUD/Prod. | Bau-Upgrade |
| ⛏️ | Erz (Roh) | `ore.png` | HUD/Input | Platzhalter-Emoji (Tool) → PNG wird Erzbarren zeigen |
| ⚒ | Werkzeuge | `tools.png` | HUD/Prod. | Produktionsbonus |
| ⚔ | Waffen | `weapons.png` | HUD/Prod. | Militär |
| 🪙 | Gold | `gold.png` | HUD/Währung | Handel/Belohnung |
| 📜 | Papier | `paper.png` | HUD/Prod. | Bildung |
| 📖 | Wissen | `knowledge.png` | HUD/Abstrakt | Bibliothek/Akademie |
| 🏛 | Prestige | `prestige.png` | HUD/Abstrakt | Kultur/Monumente |
| 🤝 | Diplomatiepunkte | `diplomacy.png` | HUD/Abstrakt | Diplomatiehalle |
| 👥 | Bevölkerung | `population.png` | HUD/System | Wachstum |

### C. Debug / Pfad-Overlay
| Symbol | Name | Dateiname | Einsatz | Kommentar |
|---|---|---|---|---|
| 👣 | Trampelpfade | `path.png` | Inspector/Pfade | Overlay |
| 🔥 | Heatmap | `heatmap.png` | Inspector/Pfade | Pfadlast |
| 🚷 | Kollision | `collision.png` | Inspector/Pfade | Blocker |
| 🚪 | Entrance | `entrance.png` | Inspector/Pfade | Tür-Kachel |
| 📈 | Statistik | `stats.png` | Inspector | FPS/Len/Blocked |

### D. Editor & Dialoge
| Symbol | Name | Dateiname | Einsatz | Kommentar |
|---|---|---|---|---|
| ✅ | Bestätigen | `confirm.png` | Dialog | |
| ❌ | Abbrechen | `cancel.png` | Dialog | |
| ✏️ | Pinsel | `brush.png` | Editor | Tiles malen |
| 🩹 | Radierer | `eraser.png` | Editor | |
| 🖱 | Auswahl | `select.png` | Editor | |
| ✋ | Verschieben | `move.png` | Editor | Kamera |
| ↩️ | Undo | `undo.png` | Editor | |
| ↪️ | Redo | `redo.png` | Editor | |
| 💾 | Speichern | `save.png` | Editor | |
| 📂 | Laden | `load.png` | Editor | |
| 📤 | Export | `export.png` | Editor | |
| 📥 | Import | `import.png` | Editor | |

---

## 2) Optionale Erweiterungen — `assets/icons/extended/`

### Pflanzen & Natur
| Symbol | Name | Dateiname | Kommentar |
|---|---|---|---|
| 🌳 | Laubbaum | `tree_broadleaf.png` | **Nicht** für Holz-Ressource |
| 🌲 | Tanne | `tree_pine.png` | Wald/Deko |
| 🌴 | Palme | `tree_palm.png` | Tropen-Biom |
| 🌺 | Hibiskus | `flower_hibiscus.png` | Deko |
| 🌹 | Rose | `flower_rose.png` | Prestige/Deko |
| 🌼 | Gänseblümchen | `flower_daisy.png` | Wiese |
| 🌷 | Tulpe | `flower_tulip.png` | Feld/Handel |
| 🌸 | Kirschblüte | `flower_sakura.png` | Event/Deko |
| 🪴 | Topfpflanze | `plant_potted.png` | Stadt/Deko |
| 🌱 | Setzling | `plant_seedling.png` | Wachstum |
| 🍄 | Pilz | `mushroom.png` | Wald/Events |
| 🍀 | Kleeblatt | `clover.png` | Bonus/Deko |

### Nahrung & Getränke
| Symbol | Name | Dateiname | Kommentar |
|---|---|---|---|
| 🥚 | Ei | `egg.png` | Tierhaltung |
| 🍳 | Spiegelei | `fried_egg.png` | verarbeitet |
| 🪺 | Eier (Nest) | `nest_eggs.png` | Quelle |
| 🍱 | Bento | `meal_bento.png` | Essen allgemein |
| 🥣 | Suppe | `meal_soup.png` |  |
| 🥘 | Eintopf | `meal_stew.png` |  |
| 🍷 | Wein | `drink_wine.png` |  |
| 🥤 | Softdrink | `drink_soda.png` |  |
| ☕ | Kaffee | `drink_coffee.png` |  |
| 🍺 | Bier | `drink_beer.png` |  |
| 🍵 | Tee | `drink_tea.png` |  |

### Tiere (Auszug)
| Symbol | Name | Dateiname | Kommentar |
|---|---|---|---|
| 🐝 | Biene | `bee.png` | Natur/Produktion |
| 🐟 | Fisch (Tier) | `fish_animal.png` | **Ressource separat = `fish.png`** |
| 🐄 | Kuh | `cow.png` |  |
| 🐐 | Ziege | `goat.png` |  |
| 🐎 | Pferd | `horse.png` |  |
| 🐕 | Hund | `dog.png` |  |
| 🐈 | Katze | `cat.png` |  |

### Wetter & Elemente
| Symbol | Name | Dateiname | Kommentar |
|---|---|---|---|
| ☀️ | Sonne | `sun.png` | Wetter |
| 🌧️ | Regen | `rain.png` | Wetter |
| ❄️ | Schnee | `snow.png` | Wetter |
| 🌪️ | Tornado | `tornado.png` | Event |
| 🌈 | Regenbogen | `rainbow.png` | Event |
| ⚡ | Blitz | `lightning.png` | Effekt |
| 🔥 | Feuer | `fire.png` | Effekt |
| 🌍 | Erde | `earth.png` | Element |
| 💨 | Wind | `wind.png` | Effekt |

### Kultur & Sonstiges (Auszug)
| Symbol | Name | Dateiname | Kommentar |
|---|---|---|---|
| 🎧 | Musik | `music.png` | Kultur |
| 🎨 | Palette | `palette.png` | Design |
| 🏆 | Pokal | `trophy.png` | Prestige |
| 🗺️ | Karte | `map.png` | UI/Editor |
| 🏰 | Burg | `castle.png` | Monument |

---

## 3) Konsistenz-Regeln
- **Holz immer 🪵** (Stämme), **Bäume** nur unter *Pflanzen & Natur*.
- Emoji sind **nur Platzhalter**. PNG-Dateien nutzen konsistente Flat-Style-Grafiken.
- Dateinamen: **snake_case**, nur ASCII, klarer Zweck (`wood.png`, `tree_pine.png`).

