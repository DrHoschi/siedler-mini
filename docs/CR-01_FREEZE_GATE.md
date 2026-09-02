# CR-01 – Abschluss-/Freeze-Gate

Status: DEVICE TEST PENDING
Branch: `feature/cr-01-freeze-gate`
Basis: CR-01C `828c77ed05c827eef7686812a808762b5e078580`

## Ziel

CR-01 wird als zusammenhängende Foundation abgeschlossen. Dieses Gate führt keine neuen Gameplay-Systeme ein. Es prüft ausschließlich Regression, Ownership, Abhängigkeiten, Scope und Legacy-Isolation für CR-00 bis CR-01C.

## Geprüfter Aufbau

### CR-00 – Clean Runtime Foundation
- neuer `src/`-Runtime-Einstieg
- EventBus, Scheduler, Store/StoreRegistry, Runtime-Lifecycle, Renderer
- Foundation-Self-Test bleibt Bestandteil der Gesamtkette

### CR-01A – Stable IDs & Authoritative World Store
- stabile IDs
- zentraler WorldStore
- kontrollierte Create/Get/Update/Remove-Pfade
- getrennte und tief eingefrorene Snapshots

### CR-01B – World/Map Structure Foundation
- genau eine Map-Entity
- Tile-Definitionen als World-Entities
- Cells als World-Entities mit stabiler Cell-ID
- räumlicher `x,y -> cellId`-Index nur als Index, nicht als zweiter autoritativer State

### CR-01C – Core Domain Stores Foundation
- vier getrennte Stores: Buildings, Units, Resources, Jobs
- produktive Stores bleiben im Foundation-Stand leer
- noch kein Verhalten zwischen den Stores

## Ownership-Matrix

| Datenbereich | Autoritative Ownership | Erlaubter Sekundärzustand |
|---|---|---|
| World-Identität / Map / Tile / Cell | `WorldStore` | `MapStructure` darf nur räumlichen Index halten |
| Buildings | `domains.buildings` | keiner |
| Units | `domains.units` | keiner |
| Resources | `domains.resources` | keiner |
| Jobs | `domains.jobs` | keiner |

Kein DomainStore darf seine Items zusätzlich im WorldStore spiegeln. CR-01 enthält noch keine fachlichen Cross-Store-Schreibpfade.

## Dependency Gate

Erlaubte neue Runtime-Abhängigkeiten:

- `src/main.js` -> `src/runtime/*`, `src/render/*`, `src/world/*`, `src/domain/*`, `src/dev/*`
- `src/domain/domain-store.js` -> `src/runtime/store.js`, `src/world/stable-id.js`
- `src/world/map-structure.js` -> WorldStore-kompatibler Vertrag über Injection

Nicht Teil des neuen Einstiegspfads:

- `core/*`
- alte `ui/*`
- Inspector-Legacy-Code
- SA-04 / SA-05
- altes SaveGame
- alte Job-/Carrier-/Production-/Navigation-/Pathfinding-Systeme
- Legacy-Patches und Bridges

Der Root-`index.html` lädt weiterhin nur `src/main.js` als JavaScript-Einstieg. Damit bleibt der alte Bestand im Repository vorhanden, aber außerhalb der neuen Runtime.

## Automatische Freeze-Gate-Prüfungen

`src/dev/cr-01-freeze-gate.js` prüft auf der echten produktiven Foundation-Instanz:

1. World-Ownership: nur `map`, `tile`, `cell`; 1 Map, 1 Default-Tile, 64 Cells.
2. Referenzintegrität: jede Cell verweist auf die aktive Map und eine existierende Tile-Entity.
3. Domain-Isolation: Buildings/Units/Resources/Jobs sind getrennt und leer, Revision jeweils 0.
4. Snapshot-Schutz: World-, Map- und Domain-Snapshots sind eingefroren.
5. Scope-Schutz: keinerlei produktiver Gameplay-State in den vier DomainStores.

Zusätzlich müssen die bestehenden Self-Tests von CR-00, CR-01A, CR-01B und CR-01C weiterhin PASS sein.

## Scope-Audit

Im Freeze-Gate werden keine Ressourcenbestände, Gebäudeinstanzen, Einheiten, Jobs, Wege oder Produktionszustände erzeugt. Es gibt weiterhin keine Baustellenlogik, Transporte, Wegfindung, Wirtschaft, Save/Load oder UI-Gameplay-Funktionen.

## Freeze-Kriterium

CR-01 darf auf `PASS / FROZEN` gesetzt werden, wenn:

- CR-00 Self-Test PASS
- CR-01A Self-Test PASS
- CR-01B Self-Test PASS
- CR-01C Self-Test PASS
- CR-01 Freeze-Gate PASS
- Gerätetest über GitHub Pages PASS
- 0 Blocker

Bis zum Gerätetest lautet der formale Zustand: `READY FOR FREEZE TEST`.
