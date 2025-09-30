📖 Neue Siedler – README

Version: v1.0.1
Projekt: Neue Siedler (Siedler-Mini)
Stand: 2025-09-30

🚀 Projektüberblick

Neue Siedler ist eine 2D-Top-Down Aufbau- und Wirtschaftssimulation.
Die Spieler:innen starten mit einer kleinen Siedlergruppe, erschließen Rohstoffe, bauen erste Produktionsketten auf und entwickeln ihre Siedlung über 10 Epochen zu einer Hochkultur.

repo-root/
│
├── index.html              # Einstiegspunkt (Startpanel zuerst sichtbar)
├── core/                   # Kernlogik (Engine, Assets, Game, Registry)
│   ├── boot.js
│   ├── asset.js
│   ├── game.js
│   ├── registry.js
│   ├── path-overlay.js
│   └── … 
│
├── ui/                     # Benutzeroberfläche
│   ├── ui-start.js         # Startpanel
│   ├── ui-hud.js           # Ressourcenanzeige
│   ├── ui-build.js         # Bau-Menü
│   ├── ui-dialog.js        # Dialogsystem
│   ├── ui-inspector.js     # Inspector-Overlay (Logs, Tests, Ressourcen, Pfade, Editor)
│   └── …
│
├── data/                   # Spieldaten (JSON, Schema-konform)
│   ├── buildings.json
│   ├── units.json
│   ├── balance.json
│   ├── campaign.json
│   ├── maps/
│   └── save.json
│
├── assets/                 # Grafiken & Ressourcen
│   ├── icons/
│   ├── tiles/
│   ├── buildings/
│   ├── characters/
│   ├── paths/
│   └── ui/
│
├── docs/                   # Dokumentation
│   ├── Lastenheft_NeueSiedler_v1.0.pdf
│   ├── Lastenheft_NeueSiedler_Registry_Patch.pdf
│   ├── Code_Struktur_Vorgaben.pdf
│   ├── Inspektor_Struktur_Vorgaben.pdf
│   ├── CODE_STYLE.md
│   ├── INSPECTOR_GUIDE.md
│   └── …
│
└── schemas/                # Diagramme & Mermaid-Dateien
    ├── Epoche1.mmd
    ├── Produktionsketten.mmd
    ├── Projektstruktur.mmd
    └── …

    
🔑 Kernmodule & Schnittstellen

	•	core/boot.js → Initialisierung, 
		Events (cb:assets-ready, cb:game-start)
	•	core/asset.js → Asset-Verwaltung 
		(Sprites, Sounds, Tiles), immer singular
	•	core/game.js → Spielloop, 
		World-State, Kollisionslogik
	•	core/registry.js → Zentrale Sammlung aller IDs 
		(Gebäude, Figuren, Ressourcen) ￼
	•	ui/ui-inspector.js → Inspector mit Tabs: 
		Logs, Tests, Ressourcen, Pfade, Editor ￼

🧩 Inspector

Der Inspector ist ein fester Bestandteil des Projekts (niemals entfernen).
Funktionen:
	•	Logs → Fehler, Warnung, Info, OK
	•	Tests → AI-Simulation, Warenfluss, Pfadfindung
	•	Ressourcen → Werte ändern, auffüllen, resetten
	•	Pfade → Overlays, Heatmap, Kollisionszonen
	•	Editor → Karten erstellen, speichern, exportieren, testen

Design: Tabs oben, aktiver Tab hellgrau, Overlay im Vollbild ￼.

🗄️ Datenformate (JSON)
	•	buildings.json → Gebäude mit Kosten, 
		Inputs/Outputs, Zykluszeit, Epoche ￼
	•	units.json → Figuren/Rollen mit Speed, 
		Capacity, Epoche ￼
	•	balance.json → Globale Parameter, 
		Produktionsmultiplikatoren ￼
	•	campaign.json → Kampagnenkapitel, 
		Ziele, Freischaltungen ￼
	•	maps/ → Karten im Editor-kompatiblen Format ￼
	•	save.json → Savegames, versionssicher ￼

 🏗️ Entwicklungsstandards
	•	Einheitliche Dateistruktur: 
		Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports ￼
	•	Jedes Modul loggt beim Laden seine Version:
   		 js [boot] Modul geladen (v1.0.0)
 	•	Events immer mit Prefix 
		cb:* (z. B. cb:build:place, cb:res:change) ￼
	•	Inspector & Debug-Tools sind Pflichtbestandteile.

📜 Setup & Start
	1.	Repo clonen oder ZIP entpacken
	2.	Lokalen Server starten (z. B. npx http-server)
	3.	Im Browser http://localhost:8080 öffnen
	4.	Startpanel → Neues Spiel wählen

⸻

📘 Begleitdokumente
	•	Lastenheft_NeueSiedler_v1.0.pdf – Vollständige Anforderungen ￼
	•	Registry_Patch.pdf – Ergänzung zur Registry ￼
	•	CODE_STYLE.md – Einheitliche Code- und Kommentarregeln ￼
	•	INSPECTOR_GUIDE.md – Design- und Funktionsvorgaben für den Inspector ￼

⸻

✅ Abnahmekriterien (v1)
	•	Startpanel zuerst sichtbar
	•	Engine lädt Assets, Registry prüft IDs
	•	Inspector vollständig integriert
	•	JSON-Dateien Schema-konform
	•	Mobile: Back-Button-Flow, 
				Safe-Areas, 
				Performance ≥30 FPS

⸻

👉 Empfehlung: 
Den Inspector kannst du später nach tools/ verschieben, solange die Einbindung in index.html und Events (cb:insp:*) bestehen bleibt.

Ziel-Struktur (Standard)

So soll es am Ende aussehen 
(Code/JSON sauber getrennt; 
Bilder bleiben in assets/):

/index.html
/boot.js
/core/                      # Laufzeit-Engine & Systems (nur .js)
	  asset.js
	  registry.js
	  registry.type-aliases.js
	  render.js
	  ui-build.data-bridge.js
	  ui-build.js
	  ... (weitere Core-Module)

/ui/                        # UI-Skripte & CSS
  ui-start.js
  ui-hud.js
  ui-build.js
  css/
    ui-build.css
  inspector/
    ui-inspector.js
    ...

/data/                      # Gameplay-Daten (nur .json/.jsonc)
  buildings.json
  buildings.jsonc
  characters/
    *.json
  maps/
    *.json
  ...

/tools/                     # Editor/Dev-Tools (optional)
  editor/
    editor.js

/assets/                    # NUR Medien (Bilder/Audio/Fonts/Icons)
  buildings/*.png
  characters/*.png
  tiles/*.png
  ui/*.png
  icons/** (nur .png/.svg …)
