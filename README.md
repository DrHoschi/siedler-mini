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
