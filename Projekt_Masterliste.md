# 📂 Projekt-Masterübersicht – Neue Siedler

Diese Tabelle listet **alle enthaltenen Dateien im Projektpaket** auf, mit Zweck & Kategorie.  
Struktur entspricht der ZIP-Datei `siedler_project_full.zip`.

---

## 📁 docs (Dokumentation)

| Datei                         | Zweck |
|-------------------------------|-------|
| Lastenheft_NeueSiedler_v1.0.md | Vollständiges Anforderungsdokument (Kapitel 1–12 + Registry Patch) |
| STANDARDS_Allgemein.md        | Code-Struktur & Projektstandards (Imports, Kommentare, Logging) |
| INSPECTOR_Allgemein.md        | Inspector-Vorgaben (Tabs, Design, Erweiterungen) |
| Projektübersicht.md           | Überblick über Projektstruktur & Inhalte |

---

## 📁 core (Kernmodule)

| Datei        | Zweck |
|--------------|-------|
| boot.js      | Bootstrap, Lifecycle, Event-Hooks (`cb:assets-ready`, `cb:game-start`) |
| asset.js     | Asset-Verwaltung (Sprites, Tiles, Sounds) – bleibt **singular** |
| game.js      | Game-Loop, World-State, Tick, Save/Load-Events |
| registry.js  | Registry-Modul – zentrale Sammlung aller Objekte (Gebäude, Einheiten, Ressourcen) |

---

## 📁 ui (Benutzeroberfläche)

| Datei         | Zweck |
|---------------|-------|
| ui-start.js   | Startpanel (Neues Spiel, Weiterspielen, Reset, Fullscreen, Inspector öffnen) |
| ui-hud.js     | HUD (Ressourcenanzeige, FPS/Debug-Werte optional) |
| ui-build.js   | BuildDock & Platziermodus (Gebäude auswählen, platzieren, abbrechen) |
| ui-dialog.js  | Dialogsystem (Bestätigungen, Auswahl, Info-Dialoge) |
| ui-inspector.js | Inspector (Overlay mit Tabs: Logs, Tests, Ressourcen, Pfade, Editor) |

---

## 📁 data (Spieldaten)

| Datei          | Zweck |
|----------------|-------|
| buildings.json | Gebäude-Definitionen (Kosten, Inputs, Outputs, Zykluszeit, Spritepfade) |
| units.json     | Rollen/Figuren-Definitionen (Speed, Kapazität, aiProfile, Spritepfade) |
| balance.json   | Globale Balance-Parameter (Tickrate, Multiplikatoren pro Schwierigkeitsgrad) |
| campaign.json  | Kampagnenkapitel (Ziele, Freischaltungen, Rewards, Maps) |
| map.json       | Kartenformat (Tiles, Objekte, Spawns, Startressourcen) |
| save.json      | Savegame-Format (Version, MapID, Ressourcen, Gebäude, Einheiten) |

---

## 📁 schemas (Diagramme & Visualisierung)

| Datei                  | Zweck |
|------------------------|-------|
| Epoche1_Schema.mmd     | Produktions- & Gebäudestruktur für Epoche 1 (HQ, Holzfäller, Fischer, Steinbruch) |
| Programmstruktur.mmd   | Technische Programmstruktur (index.html → boot.js → registry.js → inspector) |

---

## 📁 root (Projekthauptordner)

| Datei     | Zweck |
|-----------|-------|
| README.md | Setup-Anleitung, Projektüberblick, Startinfos |

---

✅ Diese Masterliste ist die zentrale Referenz.  
Wenn neue Dateien hinzukommen, bitte hier ergänzen!
