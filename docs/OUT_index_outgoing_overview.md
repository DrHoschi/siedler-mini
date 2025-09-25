# index.html – Ausgehende Ressourcen & Signale (Übersicht)

Version: v18.7.0 (2025-09-25)

Diese Datei dokumentiert, **was aus der `index.html` herausgeht**: eingebundene Stylesheets, geladene Skripte (Reihenfolge), Events/Signale aus Buttons & Hotkeys sowie sonstige globale Marker/Signale.

---

## Stylesheets (eingebunden durch index)

| Reihenfolge | Datei/Quelle            | Zweck/Betroffene Bereiche |
|---:|---|---|
| 1 | `ui/css/ui.css`          | Basis-UI (Layout, Farben, Buttons, Panels) |
| 2 | `ui/css/ui-start.css`    | Startpanel/Hintergrund/Karte |
| 3 | `ui/css/ui-hud.css`      | HUD-Leiste/Topbar |
| 4 | `ui/css/ui-tooltip.css`  | Tooltips |
| 5 | `ui/css/inspector.css`   | Inspector-Overlay (Tabs, Logliste, Panels) |
| — | `:root{ --build-icon-size }` im `<style>` | zentrale Stellschraube für Icon-Größe im Baumenü |

---

## Scripts (Lade-Reihenfolge aus index)

| Reihenfolge | Datei/Quelle                         | Hauptzweck / Wohin die Signale gehen |
|---:|---|---|
| 1 | `core/asset.js`          | Asset-Lader → feuert Engine/Init-Events; liefert `Assets` |
| 2 | `core/registry.js`       | Registry (IDs, Kategorien) → genutzt von UI/Engine |
| 3 | `core/game.js`           | Spielkern/Engine → hört auf Start-Events; stellt `Game`/`GameCore` bereit |
| 4 | `core/path-overlay.js`   | Pfad-Overlay (Debug/Spiel) → Inspector/Renderer-Hooks |
| 5 | `core/boot.js`           | Bootstrap → setzt Spielzustand, emit `cb:game-start` |
| 6 | `assets/inspector/inspector.core.js`       | Inspector Core (Overlay, API `InspectorAPI`) |
| 7 | `assets/inspector/inspector.logs.js`       | Logs-Tab → hört `cb:log` |
| 8 | `assets/inspector/overlay.hooks.js`        | Hooks ins Overlay |
| 9 | `assets/inspector/inspector.paths.js`      | Pfad-Tab |
| 10 | `assets/inspector/inspector.tests.js`     | Test-Tab |
| 11 | `assets/inspector/inspector.resources.js` | Ressourcen-Tab |
| 12 | `assets/inspector/inspector.api-compat.js`| Kompat-Layer |
| 13 | `assets/inspector/inspector.api-bridge.js`| Brücke/Buttons |
| 14 | `ui/ui-events.js`       | UI-Eventbus/Delegation |
| 15 | `ui/ui-bridge.js`       | Brücke UI ↔ Engine/Registry |
| 16 | `ui/ui-build.categories.js` | Kategorien/Meta fürs Baumenü |
| 17 | `ui/ui-build.js`        | Render/Logik Baumenü (`UIBuild`) |
| 18 | `ui/ui-hud.js`          | HUD-Render/Updates |
| 19 | `ui/ui-tooltip.js`      | Tooltips/UI-Hilfen |
| 20 | `ui/ui-start.js`        | Startpanel-Interaktion |
| 21 | `ui/ui-inspector-bridge.js` | UI-Brücke → Inspector |
| 22 | `ui/ui-inspector.js`    | Inspector-UI (Buttons/Shortcuts) |
| 23 | **Inline** „PAGE-SCRIPTS“ | Startpanel-Wiring, Build-Guard, Hotkeys, Smoke-Log |

---

## UI-Signale & Events (aus Buttons/Hotkeys der index)

| Auslöser (UI) | Ziel/Empfänger | Was sendet die index? | Wirkung/Erwartung |
|---|---|---|---|
| Startpanel: **„Neues Spiel“** | Engine (`Game.start()`), Eventbus | `Game.start?.()` (falls vorhanden) **und** `cb:start:new` | Engine startet; später `cb:game-start` → `body.game-started`, HUD sichtbar |
| Startpanel: **„Weiterspielen“** | Eventbus/Engine | `cb:start:continue` | Resume-Flow deiner Engine |
| Startpanel: **„Reset“** | LocalStorage/Seite | `cb:start:reset` + `localStorage.clear()` + Reload | Clean Start |
| Startpanel: **„Fullscreen“** | Browser API | `cb:start:fullscreen` + `requestFullscreen()` | Vollbild anfordern |
| FAB **„🏠 Bau-Menü“** | UI/BuildDock | `GameUI.toggleBuild()` → intern `cb:build:open` / `cb:build:close` | Öffnet/schließt BuildDock **nur**, wenn `game-started` gesetzt ist |
| FAB **„🩺 Inspector“** | Inspector | `InspectorAPI.toggle()` | Inspector Overlay ein/aus |
| Hotkey **B** | UI/BuildDock | wie FAB „🏠“ | Baumenü-Toggle (Start-Guard aktiv) |
| Hotkey **I** | Inspector | wie FAB „🩺“ | Inspector-Toggle |
| Index-Init (DOM-Ready) | Inspector Logs | `cb:ui-ready` + `CBLog.ok("[index] Smoke-Test …")` | Sofort sichtbare Logzeile im Inspector-Log-Tab |
| Build-Toggle intern | Body + Eventbus | setzt `body.has-build-open` + sendet `cb:build:*` | CSS-Schalten + UI-Re-Render (`UIBuild.rerender()`) |

---

## Sonstige globale Signale/Marker aus der index

| Name / Typ | Woher | Wozu / Wer nutzt’s |
|---|---|---|
| `window.__cb.indexVersion = "v18.7.0"` | Inline PAGE-SCRIPTS | Versionsmarke für Diagnose/Inspector-Header |
| `cb:log` (CustomEvent) via **CBLog-Shim** | CBLog-Shim im `<head>` | Inspector-Logs-Tab hört zu; alle `CBLog.ok/info/warn/error` leiten hierhin |
| `cb:ui-ready` (CustomEvent) | PAGE-SCRIPTS beim Laden | Signalisiert: UI-Layer steht; Inspector/Tests können reagieren |
| `body.game-started` (CSS-Klasse) | Listener auf `cb:game-start` | Guard für Baumenü/HUD-Sichtbarkeit |
| `body.has-build-open` (CSS-Klasse) | Build-Open/Close | Dock sichtbar + FAB-Position anheben |
| `GameUI.toggleBuild()` (global) | PAGE-SCRIPTS | Einheitlicher Einstieg fürs Baumenü (Buttons/Hotkeys/Tests) |
| `CBLog` (globales Logger-Objekt) | CBLog-Shim | Einheitliches Logging + Event-Weiterleitung in Inspector |

---

> Hinweis: Diese Übersicht spiegelt den Stand der `index.html` v18.7.0 wider. Änderungen an Datei-Pfaden oder Event-Namen bitte hier mitziehen, damit Diagnose/Inspector-Tests konsistent bleiben.
