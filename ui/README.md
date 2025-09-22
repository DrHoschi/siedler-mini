# main/ui — Verzeichnis & Verantwortlichkeiten (v1.0.0, 2025‑09‑22)

Dieses Dokument beschreibt die **Zielstruktur**, Zuständigkeiten und Standards für den Ordner `main/ui` im Projekt **Siedler‑Mini / Neue Siedler**.  
Es dient als verbindliche Arbeitsgrundlage (Copy‑&‑Paste‑fähig) und kann direkt ins Repo gelegt werden: `main/ui/README.md`.

---

## 1) Ziel & Geltungsbereich

Der Ordner `main/ui` enthält **alle UI‑Schichten**, die unabhängig vom Game‑Core funktionieren, aber an ihn andocken:
- Startfenster / Start‑Panel
- Build‑Menü (Bau‑Dock, Kategorien, Items, Scroll‑Logik)
- HUD (Ressourcen‑Leiste, Statusanzeigen)
- Dialoge/Modals, Tooltips & Notifications
- Tabs/Panels für Debug/Tools/Editor‑Integration (Inspector‑Anbindung)
- Styles (CSS, Variablen, Themes)
- UI‑Assets (SVG/PNG‑Icons), aber **keine** großen Spiel‑Assets

> **Wichtige Randbedingungen (aus Projekt‑Präferenzen):**
> 1. **Debug‑Tools/Checker bleiben drin** (nicht entfernen).
> 2. **Kommentare ausführlich** belassen (DE).
> 3. **Datei** `core/asset.js` **(Singular) bleibt** bestehen; Imports konsistent.
> 4. **Startfenster standardmäßig zuerst** sichtbar.
> 5. **Farbschema** wie aktuell beibehalten.
> 6. **Code‑Struktur je Datei:** *Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports*.
> 7. **Alle Dateien 1‑zu‑1 Copy‑&‑Paste‑fertig**, inkl. Header/Version/Marker.
> 8. **Inspector**: neuer Tab „**Editoren**“ geplant (zentraler Einstieg zu Tools).

---

## 2) Empfohlene Verzeichnisstruktur (Soll)

```
main/ui/
├─ index.html                # UI-Nodes/Root-Container, minimaler Bootstrap (falls getrennt von Projekt-Root)
├─ ui-boot.js                # UI-Initialisierung (bindet Panels, registriert Events, cb:ui:ready)
├─ ui-start.js               # Startfenster (Neues Spiel / Weiterspielen / Vollbild / Reset / Debug)
├─ ui-build.js               # Build-Menü Runtime (Dock-Logik, Scroll, Auswahl, Dispatch)
├─ ui-build.categories.js    # Katalog/Kategorien + Items (sendet 'cb:build-categories-ready')
├─ ui-hud.js                 # HUD-Top-Leiste (Ressourcen, Popups)
├─ ui-dialog.js              # Modals/Confirm/Prompt + Standard-Layouts
├─ ui-tooltip.js             # Tooltips (hover/focus), Accessibility-Hooks
├─ ui-notify.js              # Notifications/Toasts (Queue, Auto-Dismiss)
├─ ui-inspector-bridge.js    # Bridge zum Inspector (Events, Tab "Editoren", Ping/Pong)
├─ ui-events.js              # Zentrale UI-Events (CustomEvent-Namespace, Mapping)
├─ css/
│  ├─ ui.css                 # Basisthema (Dark), Variablen, Layout (Grid/Flex)
│  ├─ ui-build.css           # Build-Dock-Stile (2 Zeilen sichtbar, rest scrollt)
│  ├─ ui-hud.css             # HUD-Stile
│  ├─ ui-dialog.css          # Dialog/Modal-Stile
│  ├─ ui-tooltip.css         # Tooltip-Stile
│  └─ ui-notify.css          # Notification-Stile
├─ icons/
│  ├─ build/                 # PNG/SVG für Baumenü
│  ├─ hud/                   # HUD-Icons
│  └─ ui/                    # generische UI-Icons (close, info, warn, …)
└─ docs/
   ├─ UI_Structure.mmd       # Mermaid-Diagramm der UI-Module (siehe unten)
   └─ TODO_main-ui.md        # ToDo-Checkliste für Implementierung/Review
```

**Hinweise:**
- **Keine** Core‑Logik in `main/ui` ablegen. Nur UI, Events, Bridges.
- `ui-build.categories.js` liefert **nur Daten** (Kategorien/Items), **keine** DOM‑Manipulation.
- `ui-boot.js` ist der **einzige** Entry‑Point der UI und wirft `cb:ui:ready`.

---

## 3) Dateiverantwortungen (Kurzreferenz)

### `ui-boot.js` (Entry)
- Lädt/initialisiert **alle** UI‑Module
- Stellt sicher: Startfenster zuerst; registriert globale Listener
- Dispatch: `cb:ui:ready` sobald alle Panels montiert sind

### `ui-start.js`
- Start‑Panel mit Buttons (Neues Spiel, Weiterspielen, Vollbild, Reset, Debug)
- Schaltet bei Start das Baumenü/HUD frei
- Respektiert Farbschema & Responsive‑Vorgaben

### `ui-build.js`
- Dock‑Leiste unten; **max. 2 Zeilen sichtbar**, Rest **scrollt**
- Item‑Klick → dispatch `req:build:select` { id }
- Konsumiert `window.BUILD_CATEGORIES` und wartet auf `cb:build-categories-ready`

### `ui-build.categories.js`
- Struktur `window.BUILD_CATEGORIES = Array<Category>`
- Dispatch: `cb:build-categories-ready` { categories }
- **Keine** DOM‑Zugriffe (reine Datenquelle)

### `ui-hud.js`
- Ressourcen‑Bar (Holz, Stein, Nahrung, Gold, Bevölkerung …)
- Event‑Brücke zu Core (subscribe auf z. B. `ev:resource:update`)

### `ui-dialog.js`, `ui-tooltip.js`, `ui-notify.js`
- Wiederverwendbare Bausteine, ARIA‑konform, Queue/Timeouts

### `ui-inspector-bridge.js`
- Verbindet UI mit **Inspector**, stellt Tab **„Editoren“** bereit (Link/Route)
- Leitungen: sendet/empfängt Health‑Pings, zeigt Status (z. B. roter Punkt bei Fehlern)

### `ui-events.js`
- Einheitlicher **Namespace** für CustomEvents (Prefix `ui:`)
- Hilfsfunktionen zum Dispatch/Subscribe & Logging (Debug bleibt aktiv)

### CSS‑Dateien
- `ui.css`: Variablen (`--ui-gap`, `--ui-bg`, …), Layouts, Typo
- thematische Dateien je Modul (Build/HUD/Dialogs/Tooltips/Notify)

---

## 4) Coding‑Standards (verbindlich)

- **Pro Datei**: Header mit Name, Zweck, **Version**, Autor (optional), Datum.
- **Reihenfolge** stets: **Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports**.
- **Events**: nur über `ui-events.js` (oder klar dokumentierte Ausnahmen).
- **Namensschema**: `req:*` (Anforderung), `ev:*` (Push vom Core), `cb:*` (bereit/Antwort), `ui:*` (UI‑intern).
- **Keine** „magischen Strings“: Konstanten definieren (z. B. Event‑IDs).
- **Kommentare ausführlich (DE)**; Debug‑Logs bleiben erhalten und schaltbar.
- **Startfenster zuerst** sichtbar; erst nach Nutzeraktion UI erweitern.
- **Farbschema** nicht eigenmächtig ändern (Konstanten/Variablen nutzen).

---

## 5) Ereignisse (Event‑Kontrakte – Auszug)

- **Von UI → Core**
  - `req:build:select` { id }
  - `req:ui:fullscreen` {}
  - `req:game:continue` {}
  - `req:game:new` { seed? }

- **Von Core → UI**
  - `ev:resource:update` { key, value, delta }
  - `ev:build:enabled` { id, enabled }
  - `ev:game:state` { state }

- **UI‑interne Signale**
  - `cb:ui:ready` { version }
  - `cb:build-categories-ready` { categories }

---

## 6) Offene Punkte / ToDos (Kurzfassung)
- [ ] `ui-boot.js` Vorlage mit Event‑Wiring (cb:ui:ready)
- [ ] `ui-build.js` Scroll‑Dock (max. 2 Reihen sichtbar)
- [ ] `ui-build.categories.js` (Daten + Dispatch)
- [ ] `ui-hud.js` Grundgerüst + Events
- [ ] `ui-inspector-bridge.js` (Tab „Editoren“ + Health‑Ping)
- [ ] CSS‑Aufteilung + Variablenbasis
- [ ] Docs: `docs/UI_Structure.mmd`, `docs/TODO_main-ui.md`

Siehe **/docs** für die detaillierte Liste mit Abhakfeldern.