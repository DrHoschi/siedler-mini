# 📘 core/ — Projekt „Neue Siedler“ (Epoche 1)

## 🧩 Übersicht
Das Verzeichnis `/core/` enthält **alle Kernmodule** des Spiels „Neue Siedler“.  
Sie bilden gemeinsam die **Engine-Basis, Registry-Verwaltung, UI-Bridges, Rendering- und Overlay-Systeme** sowie die Integrationspunkte zum Inspector.

---

## 1️⃣ Engine-Kernmodule

| Datei | Zweck / Hauptfunktion | Events / API / Hinweise |
|-------|------------------------|--------------------------|
| **boot.js** | Einstiegspunkt des Spiels. Initialisiert Engine, Assets & UI; reagiert auf `cb:boot:ready` und `cb:game:start`. | Startet `Game.start()`, bereitet Canvas #game vor. |
| **game.js** | Haupt-Engine-Loop (Grid, Gebäude-Platzierung, Ressourcen-Produktion, Träger-Jobs). | sendet `cb:res:change`, `cb:place:*`, `cb:game-start`. |
| **game.bootstrap.js** | Bridge zwischen Boot → Game → Canvas. Handhabt Pointer-Eingaben, Preview / Confirm-Events. | Lauscht auf `req:place:*`, emittiert `cb:game:initialized`. |
| **camera.js** | Kameraposition, Scroll, Viewport. | Optionaler Bestandteil für spätere Pan/Zoom-Steuerung. |
| **zoom.js** | Zentrale Zoom-Verwaltung (`Zoom.scale`, `Zoom.set(n)`). Sendet `cb:zoom:change {scale}`. | Von `MapRuntime` abonniert. |
| **carrier.js** | Träger-Laufzeitlogik (Job annehmen → Ressource holen → HQ liefern). | nutzt `Game.popJob()` usw.; sendet `cb:carrier:*`. |
| **core.env.js** | Gemeinsamer Namespace `window.GameCore`, Logging-Helper + Shared State (Map, Camera, Entities). | Grundlage für Module wie `pfglue.js`. |
| **core.render.shim.js** | Passiver Render-Shim – belässt die Frame-Kontrolle bei `game.js`. | Dient nur zur Rückwärts-Kompatibilität. |

---

## 2️⃣ Karten-/Map-System

| Datei | Zweck / Hauptfunktion | Hinweise |
|-------|------------------------|-----------|
| **core.map.js** | Renderer für Tileset-Karten. Lädt JSON-Map und Atlas, zeichnet nur sichtbare Tiles. | Lauscht auf `cb:zoom:change`; setzt `window.MapRuntime`. |
| **map-runtime.bridge.js** | Bridge / Kompatibilitätsschicht zwischen alten und neuen Map-Events. | Stellt sicher, dass MapRuntime mit Inspector & Engine kompatibel bleibt. |
| **layout.js** | Steuert responsive Layout: quadratischer Canvas, Portrait/Landscape-Wechsel. | Nutzt `#app-layout` Container; reagiert auf `resize` und `orientationchange`. |

---

## 3️⃣ Ressourcen / Registry / Icons

| Datei | Zweck | API / Events |
|-------|-------|---------------|
| **registry.js** | Zentrale Datenbank für Buildings, Units, Resources & Balance. | Events `cb:registry:ready`, `cb:res:snapshot`. Enthält `Registry.resources` (aktuelle Werte). |
| **registry.type-aliases.js** | Alias-Fixer: „building“ ↔ „buildings“ / „category“ ↔ „categories“. | Wrapper für `Registry.list`, `get`, `set`, `register`. |
| **icons-map.js** | Zentrale Icon-Zuordnung (Ressourcen → Dateipfade). | Exportiert `resolveIcon()`, `getIconSafe()`. |
| **ui-build.data-bridge.js** | Verbindet Registry mit dem UI-Bau-Panel. Lädt Kategorien + Items. | Lauscht auf `cb:registry:ready` / `cb:registry:update`. |

---

## 4️⃣ Input / Platzierung / Bridges

| Datei | Zweck | Hinweise |
|-------|-------|-----------|
| **core.input.js** | Pointer-Ereignisse → Tile-Koordinaten → `cb:place-building` etc. | Übersetzt Maus / Touch in Tile-Events. |
| **input.bridge.js** | Übersetzt alte Event-Formate (cb:set-build-tool usw.) ↔ neues req/ cb:place-System. | Kennzeichnet Events mit `__bridge` zum Loop-Schutz. |

---

## 5️⃣ Entities / Assets / Produktion

| Datei | Zweck / Beschreibung |
|-------|----------------------|
| **core.entities.js** | Verwaltung und Rendering von Gebäuden (Entity-Liste, Sprites, Platzhalter). |
| **core.production.js** | Simpler Produktions-Ticker (Holz, Stein, Fisch). Füttert `cb:res:change`. |
| **asset.js** | Zentraler Asset-Loader (Preload, ensureReady, repaint-Trigger). |
| **entities.registry.js** | Brücke zwischen alter Entity-Verwaltung und neuer Registry. |
| **core.build.assets.js** *(entfällt)* | Früherer Bootstrap-Loader – in `asset.js` integriert. |

---

## 6️⃣ Pathfinding / Overlays / Debug

| Datei | Zweck / Hauptfunktion | Hinweise |
|-------|------------------------|-----------|
| **core.pfglue.js** | Initialisiert PathFinder, stellt Obstacle-Provider und Overlay-Loop. | optional – aktiviert sich bei `cb:engine-ready`. |
| **overlay-hooks.js** | Zentrale Overlay-Registry → `OverlayHooks.register(name, drawFn)`. | Nutzt `window.DEBUG_PATH_OVERLAY`. |
| **path-traces.overlay.js** | Pfad-/Trampelspur-Darstellung (Zeichnet Linien, wenn Träger laufen). | Grundlage für Inspector-Pfadanalyse. |
| **path-overlay.js** | Alternativer einfacher Pfad-Overlay (falls kein OverlayHooks). | Bleibt im Projekt – für Inspector & Debug-Modus. |
| **unit-overlay.js** | Overlay-Canvas für Einheiten (Kreise + Ressourcen-Icons). | nutzt `Carriers.list()`; wird im Inspector aktiviert. |

---

## 7️⃣ Event / Utility Layer

| Datei | Zweck |
|-------|-------|
| **eventbus.js** | Leichter Event-Wrapper (`emit`, `on`, `once`, `off`) → `window`-Events. |
| **core.env.js** | (siehe oben) Basiselement für gemeinsamen Zustand & Logging. |
| **cblog.polyfill.js** | Sanftes Polyfill für Logging – stellt `CBLog.ok/warn/err/info` bereit. |

---

## 🧱 Zusätzliche Hinweise / To-Do-Vermerke

| Bereich | Empfohlene Nachrüstungen |
|----------|--------------------------|
| **MapRuntime** | Kamera-Pan (+Scroll), Map-Reload, Tile-Interaktions-Layer für Inspector. |
| **Game.js** | Delete/Undo-Support für Platzierungen, Rotation, Building-Costs UI-Feedback. |
| **Carrier.js** | Pfad-Decay → Trampelpfade zeichnen (`PathOverlay.trace()` bei Bewegung). |
| **Inspector-Integration** | Erweiterung für Events-Tab (`cb:res:*`, `cb:place:*`) und Map-Viewport. |
| **HUD / UI** | Ressourcen-Snapshot mit Icons aus `icons-map.js` verknüpfen (aktuell nur Text). |
| **Registry** | Optional: JSON-Cache oder lokale Storage-Mirror zum Offline-Betrieb. |

---

## 🔧 Script-Lade-Reihenfolge (Empfohlen)

```html
<!-- Polyfills & Event-System -->
<script src="core/cblog.polyfill.js"></script>
<script src="core/eventbus.js"></script>

<!-- Environment & Camera -->
<script src="core/core.env.js"></script>
<script src="core/camera.js"></script>
<script src="core/zoom.js"></script>

<!-- Map & Overlays -->
<script src="core/core.map.js"></script>
<script src="core/map-runtime.bridge.js"></script>
<script src="core/overlay-hooks.js"></script>
<script src="core/unit-overlay.js"></script>
<script src="core/path-traces.overlay.js"></script>

<!-- Registry & Bridges -->
<script src="core/registry.js"></script>
<script src="core/registry.type-aliases.js"></script>
<script src="core/ui-build.data-bridge.js"></script>

<!-- Entities, Game & Bootstrap -->
<script src="core/core.entities.js"></script>
<script src="core/core.production.js"></script>
<script src="core/core.input.js"></script>
<script src="core/input.bridge.js"></script>
<script src="core/game.js"></script>
<script src="core/game.bootstrap.js"></script>
```
