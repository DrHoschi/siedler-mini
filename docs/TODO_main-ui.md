# TODO_main-ui (v1.0.0, 2025‑09‑22)

**Ziel:** `main/ui` vollständig lauffähig mit Startfenster, Build‑Dock (2 Reihen + Scroll), HUD, Inspector‑Bridge und sauber dokumentierten Events.

## A. Struktur & Boot
- [ ] `ui-boot.js` anlegen: Header, Version, Reihenfolge Mount → Start → Build → HUD → Bridge
- [ ] `cb:ui:ready` dispatchen mit `{ version }`
- [ ] `ui-events.js` erstellen (subscribe/dispatch Helpers, Namespaces)

## B. Startfenster
- [ ] `ui-start.js` Buttons: Neues Spiel, Weiterspielen, Vollbild, Reset, Debug
- [ ] Event‑Wiring: `req:game:new`, `req:game:continue`, `req:ui:fullscreen`
- [ ] Sichtbarkeit: Startfenster **zuerst**

## C. Build‑Dock
- [ ] `ui-build.categories.js` (nur Daten + `cb:build-categories-ready`)
- [ ] `ui-build.js` Dock unten, **max. 2 Zeilen sichtbar**, Rest **scrollt**
- [ ] Item‑Click → `req:build:select` { id }
- [ ] Accessibility: Focus/Keyboard‑Scroll

## D. HUD
- [ ] `ui-hud.js` Grundgerüst (Ressourcen‑Keys definieren)
- [ ] Listener für `ev:resource:update`
- [ ] Tooltip‑Hooks (hover/focus)

## E. Dialog/Tooltip/Notify
- [ ] `ui-dialog.js` (Modal‑API: alert/confirm/prompt)
- [ ] `ui-tooltip.js` (ARIA, position follow)
- [ ] `ui-notify.js` (Queue, Auto‑Dismiss)

## F. Inspector‑Bridge
- [ ] `ui-inspector-bridge.js` Ping/Pong (Health), Fehlerindikator
- [ ] Tab **„Editoren“** (Route/Link) sichtbar im Inspector
- [ ] Events dokumentieren (Bridge‑Kontrakt)

## G. CSS & Theme
- [ ] `css/ui.css` Variablen (`--ui-bg`, `--ui-fg`, `--ui-gap`, …)
- [ ] `css/ui-build.css` Dock‑Layout, 2‑Zeilen‑Clamp + Scroll
- [ ] `css/ui-hud.css` Ressourcen‑Bar
- [ ] `css/ui-dialog.css`, `css/ui-tooltip.css`, `css/ui-notify.css`

## H. Doku & Qualität
- [ ] `docs/UI_Structure.mmd` (dieses Diagramm) prüfen/rendern
- [ ] `README.md` finalisieren (Standards, Verantwortungen, Events)
- [ ] Lint/Format (einheitliche EOL, UTF‑8, keine Tabs)
- [ ] Debug‑Logs per Flag schaltbar, aber **nicht entfernen**
- [ ] Cross‑Device Test (iPhone 16 Pro, iPad, Desktop)

## I. Integration in Projekt
- [ ] `index.html` bindet `main/ui/ui-boot.js` nach Core‑Bootstrap
- [ ] Sicherstellen: `core/asset.js` (Singular) im Import‑Pfad
- [ ] Events mit Core/Registry gegentesten

---

### Anhang: Event-IDs (Kurzliste)
- `cb:ui:ready`, `cb:build-categories-ready`
- `req:build:select`, `req:ui:fullscreen`, `req:game:new`, `req:game:continue`
- `ev:resource:update`, `ev:build:enabled`, `ev:game:state`