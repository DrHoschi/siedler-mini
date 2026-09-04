# Neue Siedler / Siedler-Mini

Dieses Repository enthält derzeit zwei bewusst getrennte Linien:

- `main` bleibt vorerst die historische Referenz des alten Spiels.
- Die aktuelle modulare Neuentwicklung lebt auf der CR-Linie und basiert auf dem vollständig eingefrorenen **CR-21 – Reservation-Controlled Traffic Execution Foundation**.

## Aktuelle modulare Baseline

Verbindlicher eingefrorener Stand vor dem Pre-CR22-Cleanup:

`4cb7261dc2325767070177a68f951df69b7523fd`

Rollback-Branch:

`frozen/cr-21-reservation-controlled-traffic-execution-foundation`

Aktiver Cleanup-Branch:

`maintenance/pre-cr22-repository-cleanup`

Der veränderliche operative Entwicklungsstatus steht ausschließlich in:

`docs/DEVELOPMENT_WORKFLOW_CURRENT.md`

## Aktive Struktur

Die modulare Runtime verwendet die Struktur unter `src/`:

- `src/runtime/` – Runtime-Grundlagen
- `src/domain/` – Domain Stores und Kernverträge
- `src/world/` – Welt-, Map- und Stable-ID-Grundlagen
- `src/resources/` – Ressourcen-, Demand-, Matching- und Assignment-Systeme
- `src/transport/` – Transport, Routing, Traffic, Reservation und Movement
- `src/render/` – Rendering-Grundlage
- `src/ui/` – aktuelle UI-Basis
- `src/dev/` – Self-Tests, Regressionen und Freeze-Gates
- `tools/` – Struktur-/CI-Hilfen
- `assets/` – visuelle Assets; diese werden beim Cleanup ausdrücklich bewahrt
- `docs/` – aktuelle CR- und Entwicklungsdokumentation
- `docs/legacy/` – historische, für die aktive Architektur nicht mehr verbindliche Dokumentation

`index.html` lädt die modulare Runtime über `src/main.js` und das aktuelle Stylesheet `src/ui/app.css`.

## Legacy-Abgrenzung

Die alte Monolith-Struktur mit Root-Verzeichnissen wie `core/`, `ui/`, `data/`, `demo/`, `qa/` und `schemas/` ist **keine aktive Architektur mehr**. Ihre historischen Inhalte bleiben über Git-Historie und `main` nachvollziehbar, werden aber nicht in die bereinigte CR-22-Baseline übernommen.

Alte Root-Strukturunterlagen wurden nach `docs/legacy/` verschoben. Aussagen dort besitzen keine operative Verbindlichkeit für die modulare CR-Linie.

## Aktueller Frozen-Vertrag

CR-21 schließt für genau eine Routenzelle die Kette:

`Next-Cell Intent → REQUESTED Reservation → deterministische CR-19 Arbitration → GRANTED / WAITING → genau ein reservierter Zelleneintritt → CONSUMED → CR-20 Blocking-Freigabe → Bereitschaft für einen späteren nächsten Intent`

Nicht Bestandteil von CR-21 sind insbesondere automatisches Chaining eines zweiten Reservation-Zyklus, Multi-Cell-Lookahead, neue Arbitration, neues Pathfinding oder Rerouting.

## Entwicklung und Prüfung

Installationsschritt ist aktuell nicht erforderlich; die Tests laufen mit Node über die vorhandenen npm-Skripte.

```bash
npm run ci
```

Der vollständige CR-21-Freeze-Gate bleibt zusätzlich als Regression verfügbar.

Vor jedem neuen CR muss `docs/DEVELOPMENT_WORKFLOW_CURRENT.md` gelesen und der tatsächliche Branch/HEAD geprüft werden.

## Pre-CR22-Cleanup

CR-22 darf erst beginnen, wenn der verpflichtende Repository-Cleanup vollständig verifiziert ist. Dazu gehören:

- alte Monolith-Inhalte aus der modularen Baseline entfernen,
- Assets erhalten,
- irreführende Legacy-Dokumentation klar abgrenzen,
- obsolete Arbeits-/Patch-/Temp-Branches nach Sicherheitsprüfung bereinigen,
- Cleanup-Verifikationsgate mit `PASS / 0 BLOCKER` abschließen.

`main` bleibt bis zu einem späteren neuen laufenden Spiel-/Integrationsstand unverändert.
