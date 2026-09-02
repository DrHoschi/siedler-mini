# CR-00 – Clean Runtime Foundation

Status: **IN PROGRESS – FOUNDATION IMPLEMENTED / DEVICE GATE OPEN**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Branch: `feature/cr-00-clean-runtime-foundation`  
Parent/Frozen Basis: `3c166eaaa390d1be1955c65112c0e19dd1ba32b1` (S2D-06 V0.1 FROZEN – PASS / 0 BLOCKER)

## 1. Strategiewechsel

CR-00 beginnt den vollständigen Clean Rebuild der Runtime. Der vorhandene Legacy-Code ist **keine technische Implementierungsbasis** mehr.

Übernommen werden später ausschließlich geeignete visuelle Assets und Referenzen, insbesondere Bilder, Sprites, Icons, Atlasgrafiken, UI-Stilideen, Holzrahmen-/Pergamentoptik sowie gegebenenfalls Map-/Terrainmaterial.

Alte Runtime-, Patch-, Guard-, Timer-, Job-, Save-, Navigation- und Eventimplementierungen werden nicht migriert und nicht vom neuen Einstieg geladen.

## 2. Scope CR-00

CR-00 enthält ausschließlich:
- neuen Root-Einstieg ohne Legacy-Scripts,
- RuntimeConfig,
- EventBus,
- zentralen Scheduler,
- Store/StoreRegistry,
- Runtime-Lifecycle,
- leeren Renderer,
- minimales UI-Shell,
- automatischen Foundation-Self-Test.

Ausdrücklich ausgeschlossen:
- Wirtschaft,
- Gebäude,
- Units/Residents,
- Jobs/Assignments,
- Construction,
- Production,
- Logistics,
- Housing/Gold,
- Navigation,
- Paths,
- SaveGame,
- Guidance,
- produktiver Inspector,
- Assetmigration.

## 3. Architekturregeln

1. Eine zentrale Runtime besitzt Lifecycle, EventBus, StoreRegistry und Scheduler.
2. Der Scheduler ist die einzige geplante Simulationszeitquelle.
3. Systeme registrieren sich mit eindeutiger ID und genau einer Phase.
4. Stores liefern getrennte, eingefrorene Snapshots.
5. Rendering besitzt keinen Gameplay-State.
6. Keine Legacy-Datei wird durch den neuen `index.html` geladen.
7. Keine fachliche Logik in CR-00.

## 4. Scheduler-Phasen

Verbindliche Reihenfolge:
1. input
2. world
3. demand
4. assignment
5. intent
6. movement
7. work
8. economy
9. recovery
10. events
11. maintenance

CR-00 registriert noch keine produktiven Systeme.

## 5. Lifecycle

`CREATED -> BOOTING -> READY -> RUNNING <-> PAUSED -> STOPPED`

Im Foundation-Start bleibt die Runtime nach `boot()` bewusst auf `READY`. Ein Spielstart wird erst in einem späteren Block definiert.

## 6. Foundation Self-Test

Der Browser-Self-Test prüft aktuell:
- EventBus subscribe/unsubscribe,
- Store-Snapshot ist detached und deep frozen,
- Scheduler hält Phasenreihenfolge ein,
- doppelte System-ID wird abgelehnt.

Erwartete Ausgabe im Browser:

`CR-00 SELF-TEST: PASS`

und in der Konsole:

`[CR-00] Clean Runtime READY`

## 7. Entry/Exit Evidence

Entry:
- S2D-06 Parent bestätigt: PASS
- neuer Branch direkt von Frozen Parent: PASS
- main nicht verändert: PASS
- Legacy-Runtime nicht als Basis verwendet: PASS

CR-00 darf erst FROZEN werden, wenn:
- neuer Root lädt ausschließlich Clean Runtime,
- Foundation Self-Test PASS,
- keine Legacy-Scriptreferenz im neuen Root,
- Runtime erreicht READY,
- Canvas/Renderer auf Smartphone lädt,
- kein ungeplanter Timer außer später bewusst gestarteter zentraler Scheduler,
- Changed Files geprüft,
- Open Blockers = 0.

## 8. Nächster Block nach Freeze

Nach CR-00 folgt **CR-01 – World & Core State Foundation**. Dort werden Map-/World-Grundmodell, stabile IDs und erste autoritative Kern-Stores aufgebaut, weiterhin noch ohne vollständige Wirtschaftsketten.
