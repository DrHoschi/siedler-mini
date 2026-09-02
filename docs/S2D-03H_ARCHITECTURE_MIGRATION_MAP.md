# S2D-03H – Architecture Migration Map & Legacy Replacement Strategy

Status: **COMPLETE – Bestandteil von S2D-03 TECHNICAL ARCHITECTURE V0.1 DRAFT**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-03-technical-architecture`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02 UNIT & WORKFORCE MODEL V0.1 FROZEN` + `S2D-03A/B/C/D/E/F/G COMPLETE`

> Konsolidierungshinweis: Dieser geschlossene Teilblock wird spätestens beim S2D-03 Freeze-Gate in `S2D-03_TECHNICAL_ARCHITECTURE.md` konsolidiert. Er ist kein zusätzliches dauerhaftes Architektur-Masterdokument.

## 1. Zweck

S2D-03H übersetzt das in S2D-03A–G definierte Zielbild in eine konkrete Migrationskarte für den tatsächlich vorhandenen Runtime-Bestand.

Dieser Block legt fest:

- welche vorhandenen Module fachlich weiterverwendet werden können,
- welche Module intern umgebaut werden müssen,
- welche Bridge-/Guard-/Patch-Dateien nur Übergangsbestand sind,
- welche Doppel-Owner aufgelöst werden müssen,
- welche Feature-Timer in den zentralen Scheduler überführt werden,
- welche Zuständigkeit jedes Legacy-Modul im Zielbild erhält,
- welche Abhängigkeiten vor seiner Ablösung erfüllt sein müssen,
- welche konkrete Exit-/Löschbedingung gilt.

S2D-03H beginnt **noch keinen Runtime-Umbau**.

Es werden keine bestehenden Gameplay-Dateien verändert, entfernt oder umbenannt.

## 2. Statusklassen

Jeder relevante Bestand erhält genau eine Migrationsklasse.

### KEEP

Das Modul entspricht grundsätzlich dem Zielbild und kann als fachliche Basis erhalten bleiben.

KEEP bedeutet nicht automatisch, dass keinerlei API-/Scheduler-Anpassung nötig ist.

### ADAPT

Das Modul besitzt eine richtige fachliche Kernverantwortung, greift aber heute noch direkt auf fremde States zu, verwendet alte Events/Timer oder enthält Legacy-Kopplungen.

Es bleibt als Basis bestehen, wird aber an die S2D-03-Verträge angepasst.

### REPLACE

Die aktuelle Verantwortung oder Struktur widerspricht dem Zielbild so stark, dass die Funktion kontrolliert in einen neuen Owner/Service überführt wird.

Der alte Code bleibt nur so lange aktiv, bis der Ersatz die vorhandene Funktion vollständig übernimmt.

### REMOVE

Das Modul ist ausschließlich Kompatibilitäts-, Guard-, Diagnose- oder Patch-Schicht und besitzt im Zielbild keine produktive Runtime-Rolle.

Es darf erst entfernt werden, wenn seine konkrete Exit-Bedingung erfüllt und regressionsgetestet ist.

## 3. Zentrale Migrationsregel

> **Wir entfernen keine funktionierende Legacy-Schicht, bevor der vorgesehene Ziel-Owner ihre fachliche Verantwortung vollständig und getestet übernommen hat.**

Gleichzeitig gilt:

> **Kein Legacy-Guard darf durch einen neuen permanenten Guard ersetzt werden.**

Ziel ist immer:

`Legacy-Fehler -> Ziel-Owner/Vertrag implementieren -> Regression PASS -> Guard entfernen`

und nicht:

`Legacy-Guard -> neuer Guard -> weiterer Wrapper -> dauerhafte Patch-Kette`.

## 4. Verifizierter aktueller Core-Bestand

Auf dem aktuellen S2D-03-Branch existieren unter anderem folgende für die Migration relevante Runtime-Dateien:

- `core/game.tick.js`
- `core/game.js`
- `core/game.buildings.js`
- `core/game.construction.js`
- `core/game.units.js`
- `core/job.engine.js`
- `core/building.stock.js`
- `core/carrier.runtime.js`
- `core/logistics.prio.js`
- `core/game.production.js`
- `core/game.production.jobs.js`
- `core/game.production.wood.js`
- `core/game.production.stone.js`
- `core/game.production.fish.js`
- `core/game.production.hunt.js`
- `core/worker.production.js`
- `core/map.resources.js`
- `core/map.animals.js`
- `core/game.workarea.js`
- `core/core.pfglue.js`
- `core/path-overlay.js`
- `core/path-traces.overlay.js`
- `core/savegame.js`
- `core/savegame-v2.js`
- `core/savegame-v2-uid-guard.js`
- `core/sa04.production-bridge.js`
- `core/sa04.runtime-guards.js`
- `core/sa04.stock-persistence.js`
- `core/sa04.pause-builder-fixes.js`
- `core/sa04.worker-pause-hunter.js`
- `core/sa04.housing-residents.js`
- `core/sa04.housing-taxes.js`
- `core/sa04.housing-menu.js`
- `core/sa04.hunter-entry-fix.js`
- `core/sa04.hunter-production-fix.js`
- `core/sa04.resource-piles.js`
- `core/sa05.resident-workforce.js`
- `core/sa05.path-render-diagnostic.js`
- `core/eventbus.js`
- `core/event.compat.js`
- `core/game.renderer.js`
- `core/render.shim.js`
- `core/unit-overlay.js`
- `core/overlay-hooks.js`

Diese Liste bildet den migrationsrelevanten Kern und ist keine Behauptung, dass jede übrige Core-/UI-/Inspector-Datei verändert werden muss.

## 5. Gesamt-Migrationsmatrix

| Aktueller Bestand | Klasse | Zielsystem / Zielrolle | Hauptproblem heute | Abhängigkeit vor Ablösung | Exit-/Abschlussbedingung |
|---|---|---|---|---|---|
| `game.tick.js` | ADAPT | zentraler SimulationScheduler/GameTick | einfacher eigener Intervall statt vollständigem Phasenmodell | S2D-03C Scheduler-Phasen implementiert | alle Gameplay-Feature-Timer registriert/ersetzt, ein autoritativer Simulationstakt |
| `game.js` | ADAPT | Boot/Game-Fassade + Render-Loop, kein Domain-Monolith | historische Sammelverantwortung und globale Zugriffe | Domain-Owner öffentliche APIs vorhanden | keine parallele Ownership von Buildings/Units/Resources/Jobs |
| `game.buildings.js` | ADAPT | BuildingStore/Buildings Owner | Überschneidung mit `Game.buildings` und fremden Lifecycle-Zuständen | ein BuildingStore-Vertrag | genau eine Gebäudecollection, alle Consumer über Query/ID |
| `game.construction.js` | ADAPT | ConstructionSystem Owner | Legacy-Baustart vor realer Builder-Ankunft; Fremdsteuerung über Guards | Assignment/Arrival-Vertrag + Materialrestbedarf | Construction selbst schützt WAIT_MATERIAL -> WAIT_BUILDER -> BUILDING, Builder-Guards unnötig |
| `game.units.js` | ADAPT | UnitStore + Unit Execution | Job-/Assignment-/Navigation-Kopplung historisch zu breit | S2D-02 Identity/Assignment + NavigationService | stabile Identity/Capability/Assignment-Zustände ohne Type-Mutation |
| `job.engine.js` | ADAPT | JobEngine Owner für Arbeitsbedarf | wird aktuell von mehreren Wrappern gepatcht/gefiltert | definierter Job-/Assignment-Vertrag | keine `pop()`-Wrapper/Legacy-Jobfilter mehr, keine Unit-Identity-Mutation |
| `building.stock.js` | KEEP/ADAPT | BuildingStock Owner | fachlich passend, aber ältere Whitelists/Bridge-Kopplung | Production/Logistics Contracts | alleinige Wahrheit für lokalen Output, keine Bridge-Override-Listen |
| `carrier.runtime.js` | REPLACE/ABSORB | Logistics + Unit Assignment Execution | transportbezogene Spezialruntime außerhalb einheitlichem Workforce-Modell | Logistics/Assignment/Navigation | Carrier-Ausführung ist normale capability-basierte Assignment-Ausführung; keine separate zweite Task-Wahrheit |
| `logistics.prio.js` | ADAPT | Logistics-Priorisierung | Priorisierung getrennt von vollständig definiertem Logistics Owner | Logistics-Demand-/Reservation-Vertrag | Priorisierung arbeitet nur auf öffentlichen Logistics-/Job-Daten |
| `game.production.js` | ADAPT | ProductionSystem Owner | historische direkte/indirekte Resource- und Event-Kopplungen | BuildingStock + Jobs + Pause-Vertrag | jeder physische Output endet zuerst ausschließlich in BuildingStock |
| `game.production.jobs.js` | ADAPT | Production -> JobEngine Adapter/Domain Contract | potenziell parallele Joblogik | JobEngine Commands/Events | keine eigene unabhängige Jobliste/-wahrheit |
| `game.production.wood.js` | ADAPT | Production-Subdomain | direkte Map-/Worker-/Event-Kopplung möglich | MapResources + WorkArea + Workforce APIs | nur öffentliche Owner-Operationen |
| `game.production.stone.js` | ADAPT | Production-Subdomain | wie oben | MapResources + WorkArea + Workforce APIs | nur öffentliche Owner-Operationen |
| `game.production.fish.js` | ADAPT | Production-Subdomain | wie oben | MapResources/WorkArea/Workforce APIs | nur öffentliche Owner-Operationen |
| `game.production.hunt.js` | ADAPT | Hunting-Production-Subdomain | historische Hunter-Fix-Schichten | MapAnimals + Workforce + Navigation | reale Tiere über MapAnimals, keine Hunter-Fixes mehr |
| `worker.production.js` | REPLACE/ABSORB | Unit/Workforce + Production Execution | eigener `setInterval`, eigener Worker-Lifecycle | Scheduler + Assignment/Activity-Modell | Worker-Execution läuft in zentralen Phasen, kein Feature-Timer |
| `map.resources.js` | KEEP/ADAPT | MapResources Owner | fachlich bereits klar, APIs ggf. direkt konsumiert | Commands/Queries | keine fremden Kopien/Mutationen |
| `map.animals.js` | KEEP/ADAPT | MapAnimals Owner | Hunter-Patches greifen ggf. direkt ein | Hunting Contracts | Tiermutation ausschließlich über MapAnimals |
| `game.workarea.js` | KEEP/ADAPT | WorkAreaSystem Owner | mögliche Direktreferenzen | Query/Command API | genau eine WorkArea-Wahrheit |
| `core.pfglue.js` | REPLACE/ABSORB | NavigationService Adapter/Implementierung | Navigation als Glue statt klarer zentraler Service | S2D-03E API/Cache/Invalidierung | alle Gameplay-Systeme gehen nur über NavigationService |
| `path-overlay.js` | REPLACE/SPLIT | PathSystem + PathRenderer | Wear und Visualisierung/Stamp-State gekoppelt | S2D-03F PathSystem + Render Cache | persistenter Wear getrennt von Cache/Stamps; Renderer Consumer only |
| `path-traces.overlay.js` | REMOVE/REPLACE | PathRenderer/Diagnostics | Overlay-/Registrierungslogik für Legacy-Darstellung | neuer PathRenderer | keine produktive Wear-Ownership oder Bootstrap-Polling mehr |
| `savegame-v2.js` | ADAPT | SaveGameService | heutiger Restore muss durch Zusatzmodule repariert werden | Owner snapshot/restore + Restore Gate | vollständige Owner-Snapshots, definierte Restore-Reihenfolge, keine Post-Restore-Reparatur |
| `savegame.js` | REPLACE/RETIRE | optional Legacy-Importer, sonst entfernen | paralleles altes Save-System + eigener Autosave-Timer | V2/Target SaveGame deckt benötigte Slots/Autosave | keine produktive zweite Save-Wahrheit |
| `savegame-v2-uid-guard.js` | REMOVE | keine produktive Zielrolle | Guard für UID-Lücke | BuildingStore erzeugt/restauriert stabile IDs | UID-Invariante beim Owner + Restore PASS |
| `sa04.production-bridge.js` | REMOVE | Verantwortung nach Production + BuildingStock + SaveGame | Event-Abfangen, Bridge-Whitelist, Rehydrate-Replay, JobEngine-Wrapper | Production/Stock/Restore-Verträge | Output/Pause/Continue/Legacy-job Verhalten nativ korrekt |
| `sa04.runtime-guards.js` | REMOVE | Verantwortung verteilt auf Buildings, Construction, Logistics, PathSystem, SaveGame | mehrere fremde Owner werden direkt gepatcht; eigener Polling-Timer | jeweilige Zielowner umgesetzt | alle vier Guard-Funktionen durch Owner-Invarianten ersetzt |
| `sa04.stock-persistence.js` | REMOVE | BuildingStock snapshot/restore | additiver Persistenzpatch | SaveGame owner snapshots | BuildingStock nativ persistiert/restauriert |
| `sa04.pause-builder-fixes.js` | REMOVE | Construction + Production + Workforce | Pause/Builder nachträglich korrigiert | Pause- und Builder-Contracts | Pause + Builder Arrival regressionsfest ohne Patch |
| `sa04.worker-pause-hunter.js` | REMOVE | Workforce + Production/Hunting | Worker/Hunter-Sonderkorrekturen | einheitliche Worker-Activity + Hunting | Spezialfälle nativ im Owner-Verhalten |
| `sa04.housing-residents.js` | REPLACE/ABSORB | HousingService + UnitStore | Housing-Logik als Add-on statt Domain-Owner | Home-/Population-Modell | reale Bewohner/Home-Bindungen im Unit/Housing-Domain |
| `sa04.housing-taxes.js` | REPLACE/ABSORB | Economy/Housing | eigener Tax-Timer und direkte Goldlogik | zentraler Scheduler + Gold Owner | Taxes zentral geplant, Gold nur beim Owner mutiert |
| `sa04.housing-menu.js` | REPLACE/ABSORB | UI ViewModel für Housing | UI liest/pollt Runtime direkt | Housing Query/ViewModel | kein eigener Gameplay-Polling-State |
| `sa04.hunter-entry-fix.js` | REMOVE | Building Access + Hunting/Navigation | nachträgliche Zugangskorrektur | definierte Interaction Points | Hunter nutzt gültigen Access über Building/Navigation |
| `sa04.hunter-production-fix.js` | REMOVE | Production/Hunting | korrigiert Produktionspfad nachträglich | Hunting-Production-Vertrag | Hunter produziert nativ meat+pelt -> BuildingStock |
| `sa04.resource-piles.js` | REPLACE/ABSORB | BuildingStock Renderer/View | sichtbare Stapel eng mit Patchlogik gekoppelt | BuildingStock ReadModel + Renderer | Stapel rein visuelle Repräsentation autoritativer Bestände |
| `sa05.resident-workforce.js` | REMOVE nach Split | Housing/Unit Lifestyle + Workforce Assignment + PathSystem | Type-Mutation resident<->carrier; eigenes 200-ms-Tick; direkte `Game.buildings`; zusätzlich Path-Patch | S2D-02 Workforce + Scheduler + PathSystem | alle fachlichen Teile in Ownern, keine Type-Mutation/kein eigener Timer/kein Path-Patch |
| `sa05.path-render-diagnostic.js` | KEEP/ADAPT oder MOVE DEV | Inspector/Diagnostics | Diagnose als SA-05-Sonderdatei | Runtime Metrics API | reine Diagnose ohne produktive Mutation, ggf. Inspector-Modul |
| `eventbus.js` | KEEP/ADAPT | Domain Event Transport | kleiner vorhandener Bus, Verträge noch nicht vollständig normiert | S2D-03B Event Contract | Events Facts-after-mutation, keine versteckten Commands |
| `event.compat.js` | REMOVE langfristig | temporärer Legacy Event Adapter | Kompatibilitätsschicht | neue Producer/Consumer auf Zielevents migriert | kein produktiver Listener benötigt alte Event-Aliase |
| `game.renderer.js` | KEEP/ADAPT | Renderer Consumer | muss komplett mutierungsfrei sein | Owner ReadModels | keinerlei Gameplay-Mutation |
| `render.shim.js` | REMOVE langfristig | ggf. temporärer Render Adapter | Shim/Kompatibilität | neuer Render-Vertrag vollständig | kein Legacy-Render-Hook nötig |
| `unit-overlay.js` | KEEP/ADAPT | Render/Debug Layer | darf keine Unit-Wahrheit besitzen | Unit Snapshot/View | read-only Rendering |
| `overlay-hooks.js` | KEEP/ADAPT oder RETIRE | Render-Layer Registry | historisches Hook-System | finaler Render-Layer-Vertrag | nur Darstellung; keine Gameplay-Kopplung |

## 6. Gebäude-Doppel-Owner: höchste Priorität

Der heutige Bestand enthält historisch mindestens zwei sichtbare Zugriffswege auf Gebäudezustand:

- `Game.buildings`
- `Buildings.list`

`sa04.runtime-guards.js` synchronisiert beide nach Restore ausdrücklich auf dieselbe Liste.

Das ist ein klarer Übergangsbeweis: Der Guard darf nicht Zielarchitektur werden.

### Ziel

Ein BuildingStore/Buildings-System besitzt genau eine Collection.

Andere Systeme erhalten:

- `buildingId`,
- Queries/Snapshots,
- Commands,
- Events.

### Migration

1. festlegen, welche vorhandene Collection technisch zur Basis des BuildingStore wird,
2. alle produktiven direkten Leser inventarisieren,
3. Query-/Command-Grenze bereitstellen,
4. Consumer einzeln umstellen,
5. SaveGame ausschließlich gegen BuildingStore snapshot/restore,
6. `Game.buildings` bzw. `Buildings.list` nur noch Alias während Migration,
7. Alias entfernen,
8. Sync-Teil aus `sa04.runtime-guards.js` löschen.

### Exit Gate

PASS nur wenn:

- New Game funktioniert,
- Continue funktioniert,
- Pause funktioniert,
- Renderer/UI sehen dieselben Gebäude,
- keine zweite Collection mehr mutiert wird,
- Restore benötigt keine Listensynchronisierung.

## 7. Construction- und Builder-Patches

`sa04.runtime-guards.js` setzt eine Baustelle nach einem Legacy-Start-Event zurück auf `waiting-builders` und prüft anschließend alle 100 ms, ob ein Builder tatsächlich `working` erreicht hat.

Das Verhalten ist fachlich richtig motiviert, technisch aber genau die Art nachträglicher Fremdkorrektur, die S2D-03 ersetzt.

### Ziel

Construction besitzt den Zustand selbst:

`WAIT_MATERIAL -> WAIT_BUILDER -> BUILDING -> COMPLETE`

Der Übergang `WAIT_BUILDER -> BUILDING` erfolgt ausschließlich nach bestätigtem Builder-Arrival/Work-Beginn über den Assignment-/Unit-Vertrag.

### Zu entfernen

- Builder-Polling in `sa04.runtime-guards.js`,
- entsprechende Korrekturen in `sa04.pause-builder-fixes.js`,
- zusätzliche Builder-Flags als zweite Wahrheit.

### Exit Gate

- vollständige Materialien allein starten niemals Baufortschritt,
- Builder muss physisch ankommen,
- nach Continue bleibt derselbe fachliche Zustand erhalten/reconstructable,
- keine 50-/100-ms-Builder-Polls nötig.

## 8. Überlieferungs- und Logistics-Patches

`sa04.runtime-guards.js` deckelt `delivered`, löscht bereits laufende Carrier-Tasks und wrappt `JobEngine.pop()`, um überzählige Delivery-Jobs zu verwerfen.

Diese Funktion wird durch S2D-01B/S2D-02/S2D-03A/B als Owner-Problem gelöst.

### Ziel

Construction veröffentlicht realen Restbedarf:

`remaining = required - delivered - validReservedOrInTransit`

Logistics reserviert nur diesen Bedarf.

Pickup und Delivery sind validierte Transaktionen.

### Migration

1. Construction-Restbedarf autoritativ machen,
2. Reservationen definieren,
3. Logistics-Demand daraus erzeugen,
4. neue überzählige Jobs verhindern statt später löschen,
5. laufende ungültig gewordene Assignments über definierte Cancel/Recovery-Regeln beenden,
6. `JobEngine.pop()`-Wrapper entfernen.

### Exit Gate

Kein Testfall darf Material über Soll liefern oder Phantomwaren durch Cancel erzeugen.

## 9. Production + BuildingStock

`sa04.production-bridge.js` stoppt aktuell Legacy-Output-Events, schreibt stattdessen in `BuildingStock`, überschreibt eine ältere Stockable-Whitelist und rehydriert Produktion nach Continue durch Replay von `cb:build:complete`.

Der fachlich wertvolle Teil ist die bereits etablierte Regel:

`Production -> BuildingStock -> Logistics -> Unit -> HQ/Storage`

Die Bridge selbst bleibt jedoch nicht.

### Ziel

- Production ruft BuildingStock über definierten Owner-Command auf,
- Pause wird vor Produktionsfortschritt/Output beim Production Owner geprüft,
- SaveGame restauriert Production/BuildingStock direkt,
- kein Event-Replay zur künstlichen Reinitialisierung,
- kein `stopImmediatePropagation()` als produktive Business-Architektur,
- keine lokale Patch-Whitelist neben BuildingStock.

### Exit Gate

Wood/Stone/Fish/Meat/Pelt werden nach Produktion ausschließlich lokal gebucht und erst nach echter Lieferung im HQ verfügbar.

## 10. Workforce-Migration

`sa05.resident-workforce.js` enthält mehrere wertvolle Produktideen, aber mehrere Zielarchitektur-Verstöße zugleich:

- `resident` wird temporär zu `carrier`,
- `GameUnits.needsJob` und `assignJob` werden gewrappt,
- direkte Mutationen an Unit-Interna,
- direkte Suche in `Game.buildings`,
- eigener 200-ms-Timer,
- eigene Lifestyle-State-Map,
- zusätzlich Path-Performance-Patching im selben Modul.

### Zielzerlegung

Die Datei wird nicht 1:1 weitergebaut, sondern fachlich aufgeteilt:

#### Unit/Housing

- Home-Bindung,
- inside/home,
- leisure walk,
- return home.

#### Workforce

- FREE/ASSIGNED,
- Capabilities,
- Specialist priority,
- Helper Resident darf `CAN_SIMPLE_TRANSPORT`,
- kein Type-Wechsel.

#### Scheduler

- Lifestyle/Movement über definierte Phasen,
- kein eigenes `setInterval`.

#### PathSystem

- Wear-Performance vollständig getrennt von Workforce.

### Exit Gate

Ein Bewohner kann einen einfachen Transportjob übernehmen, bleibt währenddessen dieselbe Person/Identität und kehrt danach nach Hause zurück; kein `u.type='carrier'` wird benötigt.

## 11. Worker Production

`worker.production.js` besitzt derzeit einen eigenen Produktionsworker-Tick.

Das Zielbild zieht die zeitliche Ausführung in den zentralen Scheduler.

Der fachliche Worker-Ablauf kann wiederverwendet werden, aber nicht als autonomer Timer-Owner.

### Ziel

`Assignment -> Navigation -> Arrival -> Work Phase -> Production Result`

### Exit Gate

Kein produktiver Worker führt Gameplay-Fortschritt außerhalb des zentralen SimulationScheduler aus.

## 12. SaveGame-Migration

Es existieren aktuell mindestens:

- `savegame.js`,
- `savegame-v2.js`,
- `savegame-v2-uid-guard.js`,
- `sa04.stock-persistence.js`,
- Save-Erweiterung in `sa04.runtime-guards.js`,
- Continue-Rehydrate in `sa04.production-bridge.js`,
- Continue-Reaktion in `sa05.resident-workforce.js`.

Das ist genau die verteilte Restore-Verantwortung, die S2D-03D beendet.

### Ziel

Ein SaveGameService orchestriert:

`Owner.snapshot -> Save Document`

und:

`Validate/Migrate -> Owner.restore -> Cross References -> Runtime Reconstruction -> Validation Gate -> Scheduler Start`.

### Migration

1. stabile IDs absichern,
2. Owner-Snapshot-Verträge einführen,
3. BuildingStock integrieren,
4. Units/Home/Specialization integrieren,
5. Construction integrieren,
6. MapResources/Animals/WorkArea integrieren,
7. PathSystem Wear integrieren,
8. Assignments/carrying/recovery rekonstruierbar machen,
9. alle SA04/SA05 Restore-Listener entfernen,
10. alten Save-Pfad nur noch optional als Import/Migration behandeln.

### Exit Gate

Continue benötigt **keinen** Post-Restore-Gameplay-Patch.

## 13. Navigation-Migration

`core.pfglue.js` und Navigation-Aufrufe in Units/Carrier/Worker/Legacy-Code werden auf den gemeinsamen NavigationService konzentriert.

### Ziel

- Structural Reachability,
- Exact Reachability,
- Actual Path Request,
- positive/negative Caches,
- gezielte Invalidierung,
- deduplizierte Requests,
- kontrollierter Backoff.

### Exit Gate

- kein direkter A*-Aufruf außerhalb NavigationService,
- kein Feature-eigener Navigation-Retry-Timer,
- identische strukturell unmögliche Requests erzeugen keine Fail-Flut,
- Navigation-Diagnose zeigt Request-/Fail-/Cache-Zahlen zentral.

## 14. Path/Wear-Migration

`path-overlay.js` besitzt aktuell Teile von Wear und sichtbaren Stamps; zusätzliche Path-State-Persistenz und Performancebegrenzung liegen in SA04/SA05-Patches.

### Zielzerlegung

#### PathSystem

- persistenter Wear,
- Accumulation,
- Decay,
- Dirty Regions.

#### PathRenderer

- Bake/Cache,
- visuelle Variation,
- kein persistenter Gameplay-State.

### Nicht übernehmen

- permanente Einzelstamp-Liste als Hauptzustand,
- Persistenz sichtbarer Stamps als notwendige Spielwahrheit,
- Workforce-Modul als Path-Performance-Owner,
- Renderer-interne Wear-Mutation.

### Exit Gate

Save/Continue restauriert Wear und baut Darstellung neu; Anzahl historischer Laufbewegungen bestimmt nicht die Anzahl dauerhafter Renderobjekte.

## 15. Housing- und Economy-Migration

Die SA04-Housing-Dateien sind funktionierende Feature-Erweiterungen, aber keine dauerhafte Domain-Grenze.

### HousingService / Unit Domain übernimmt

- Bewohnererzeugung gemäß Gebäudeinhalt,
- Home-Bindung,
- Housing Query,
- keine zweite Bewohnerliste.

### Economy übernimmt

- Tax-Logik,
- Gold-Erzeugungsregel.

### Scheduler übernimmt

- zeitliche Fälligkeit der Tax-Berechnung.

### UI übernimmt

- Housing-Menü als Query/ViewModel-Consumer.

### Exit Gate

Housing/Taxes funktionieren ohne eigene Gameplay-Intervalle und ohne direkten fremden State-Write.

## 16. Hunter-Migration

Die Dateien `sa04.hunter-entry-fix.js`, `sa04.hunter-production-fix.js` und Teile von `sa04.worker-pause-hunter.js` zeigen, dass Hunter-Verhalten aktuell über mehrere Schichten verteilt ist.

### Ziel

Ein Hunting-Produktionspfad nutzt:

- Building Access,
- WorkArea,
- MapAnimals,
- Workforce/Assignment,
- NavigationService,
- ProductionSystem,
- BuildingStock.

### Exit Gate

Der Jäger findet nur reale gültige Tiere, erreicht seinen Arbeitsbereich über Navigation, erzeugt meat+pelt lokal und benötigt keine Hunter-spezifische Fix-Datei.

## 17. Scheduler-/Timer-Migration

Gameplay-relevante bestehende Timer werden nicht pauschal gelöscht, sondern einzeln übernommen.

### Bekannte produktive/produktnahe Timer

- `game.tick.js` – bleibt als Basis, wird zum zentralen Scheduler erweitert,
- `worker.production.js` – in Scheduler-Work-Phase,
- `sa04.runtime-guards.js` Builder-Poll – entfällt durch Arrival Contract,
- `sa04.production-bridge.js` Wrapper-Wait – entfällt nach stabiler Initialisierung/JobEngine,
- `sa05.resident-workforce.js` – in Unit/Workforce/Scheduler,
- `sa04.housing-taxes.js` – Low-Frequency Economy Scheduler,
- Hunter-/Pause-Fix-Timer – entfallen oder werden Domain-Phasen,
- Save-Autosave – zentrale fällige Maintenance-Aufgabe statt zweiter Gameplay-Uhr.

UI-/Inspector-Timer sind getrennt zu bewerten. Ein UI-Live-Refresh darf bestehen, sofern er nur ReadModels liest und keinen Gameplay-State steuert.

### Exit Gate

Es existiert nur eine autoritative Gameplay-Simulationszeit.

## 18. Event- und Wrapper-Migration

Vorhandene Events sind nützlich und müssen nicht pauschal ersetzt werden.

Problematisch sind jedoch Muster wie:

- Event in Capture-Phase stoppen, um falsche Business-Logik zu verhindern,
- fertiges Gebäude-Event nach Continue künstlich erneut emittieren,
- Owner-Methode zur Laufzeit überschreiben (`JobEngine.pop`, `GameUnits.assignJob`),
- per Poll warten, bis ein globales Objekt existiert, dann monkey-patchen.

### Ziel

- Commands für gewünschte Mutationen,
- Events nur als Facts after successful mutation,
- Query/Snapshot für Reads,
- Adapter nur als dokumentierte Übergangsschicht.

### Exit Gate

Produktive Business-Regeln benötigen keine Laufzeit-Monkey-Patches mehr.

## 19. Inspector und Diagnostics

Bestehende Diagnosebestandteile sollen nicht unnötig verloren gehen.

### KEEP/ADAPT

- FPS-/Performanceanzeige,
- Navigation-Metriken,
- Job-/Assignment-Trace,
- SaveGame-Validierung,
- Runtime-Invariant-Ansicht,
- Path/Wear-Statistik.

### MOVE OUT / Shared Dev Tools

Asset-/Sprite-/Atlas-/JSON-Entwicklung gehört langfristig in die gemeinsame Halle-Demo-Dev-Tool-Umgebung.

### Verbindliche Grenze

Inspector darf:

- Snapshots lesen,
- Events beobachten,
- explizite Debug-Commands senden.

Inspector darf nicht:

- `Game.buildings` reparieren,
- Units umtypisieren,
- Joblisten korrigieren,
- Save-State nachpatchen,
- Render-/Path-Interna als Gameplay-State verändern.

## 20. Migrationsabhängigkeiten

Die technische Migration darf nicht in beliebiger Reihenfolge erfolgen.

Folgende Abhängigkeiten sind verbindlich:

### Foundation

1. öffentliche Owner-Grenzen / IDs / Commands / Queries / Events,
2. zentraler Scheduler-Rahmen,
3. Runtime Validation/Diagnostics.

### Domain Ownership

4. Buildings Single Owner,
5. Unit Identity + Workforce/Assignment,
6. JobEngine-Vertrag,
7. Construction,
8. BuildingStock + Production,
9. Logistics + Reservations,
10. Housing/Economy.

### Infrastructure

11. NavigationService,
12. PathSystem/PathRenderer,
13. SaveGame owner-basierter Restore.

Diese Reihenfolge ist eine **Abhängigkeitsordnung**, noch keine finale Implementierungs-Roadmap mit Arbeitsblocknummern. Die konkrete Umbauplanung gehört S2D-06 bzw. einem späteren Implementation Plan.

## 21. Regeln für Legacy-Adapter während des Umbaus

Temporäre Adapter sind erlaubt, wenn ein System nicht atomar umgestellt werden kann.

Jeder Adapter muss dokumentieren:

- Legacy-Quelle,
- Ziel-Owner,
- erlaubte Richtung,
- welche Daten übersetzt werden,
- welche Invariante geschützt wird,
- wann er entfernt wird.

Ein Adapter darf nicht:

- neue Business-Logik besitzen,
- eine zweite Collection führen,
- fremden State periodisch korrigieren,
- unbefristet als „funktioniert doch“ bestehen bleiben.

## 22. Migration ohne Big-Bang-Rewrite

Die Architektur verlangt **keinen** Komplett-Neubau des Spiels.

Wir verwenden das funktionierende System als Übergangsbasis und ersetzen Ownership-Konflikte kontrolliert.

Verbindliche Strategie:

`bestehende Funktion einfrieren -> Zielvertrag daneben bereitstellen -> einen Consumer/Owner umstellen -> Regression -> alten Pfad deaktivieren -> nächste Schicht`

Nicht zulässig:

`alle Core-Dateien gleichzeitig neu schreiben und anschließend versuchen herauszufinden, was verloren ging`.

## 23. Regression-Gates pro Legacy-Ablösung

Eine Legacy-Datei darf erst entfernt/deaktiviert werden, wenn die zugehörigen Kernfälle PASS sind.

Mindestens relevant:

- New Game,
- Continue,
- Gebäude platzieren,
- Gebäude pausieren/fortsetzen,
- Baustelle mit Material beliefern,
- keine Überlieferung,
- Builder muss ankommen,
- Bau fertigstellen,
- Production lokal erzeugen,
- Carrier transportiert real,
- HQ erhält erst nach Delivery,
- Resident Helper bleibt Resident,
- Specialist Priority,
- Unit Return Home,
- Hunting mit realem Tier,
- Paths entstehen aus realer Bewegung,
- Paths bleiben nach Continue,
- kein Navigation-Fail-Hotloop,
- keine Zombie-Assignments/Reservationen,
- keine doppelte Warenbuchung.

## 24. Legacy-Dateien mit klarer REMOVE-Zielentscheidung

Folgende Dateien besitzen nach heutigem Zielbild **keine permanente produktive Runtime-Rolle**:

- `sa04.runtime-guards.js`
- `sa04.production-bridge.js`
- `sa04.stock-persistence.js`
- `sa04.pause-builder-fixes.js`
- `sa04.worker-pause-hunter.js`
- `sa04.hunter-entry-fix.js`
- `sa04.hunter-production-fix.js`
- `savegame-v2-uid-guard.js`
- `event.compat.js` nach Eventmigration
- `render.shim.js` nach Render-Migration

`sa05.resident-workforce.js` wird ebenfalls als Datei entfernt, **aber erst nachdem seine fachlich gewünschten Teile** in Housing/Units/Workforce/Scheduler überführt wurden.

`sa04.resource-piles.js` wird nicht als Patch weitergeführt; die sichtbare Funktion kann im BuildingStock-Renderer neu aufgehen.

## 25. Dateien mit hohem Wiederverwendungswert

Folgende vorhandene Bereiche sind keine Wegwerfarchitektur, sondern gute Kandidaten für kontrollierte Weiterentwicklung:

- `game.buildings.js`
- `game.construction.js`
- `game.units.js`
- `job.engine.js`
- `building.stock.js`
- `game.production*.js`
- `map.resources.js`
- `map.animals.js`
- `game.workarea.js`
- `eventbus.js`
- `game.renderer.js`
- `savegame-v2.js`
- bestehende Unit-Animation/Direction-Module
- vorhandene Daten-/Registry-Strukturen, soweit sie S2D-00–03 nicht widersprechen.

Das Ziel ist also **Konsolidierung**, nicht pauschales Löschen.

## 26. Kritische Migration Hotspots

Vier Bereiche müssen besonders kontrolliert umgebaut werden.

### Hotspot 1 – Buildings + SaveGame

Weil ein falscher Schritt wieder den bekannten Continue-Verlust oder Pause-Bug erzeugen kann.

### Hotspot 2 – Jobs + Units + Logistics

Weil hier Doppelassignment, Warenverlust, Overdelivery und Workforce-Rückschritte entstehen können.

### Hotspot 3 – Production + BuildingStock

Weil paralleler Outputpfad sofort Ressourcen doppeln kann.

### Hotspot 4 – Navigation + Paths

Weil falsche Kopplung Performance-Fail-Loops oder wieder unbeschränkte Path-Stamps erzeugen kann.

Jeder dieser Hotspots muss in kleinen isolierten Implementation Blocks migriert werden.

## 27. S2D-03H Invarianten

1. Kein Legacy-Guard wird ohne getesteten Ersatz entfernt.
2. Kein Legacy-Guard wird als permanente Zielarchitektur akzeptiert.
3. Jeder wichtige State endet bei genau einem Owner.
4. Jede Remove-Datei besitzt eine explizite Exit-Bedingung.
5. Jeder Adapter ist zeitlich begrenzt und dokumentiert.
6. Keine Migration führt temporäre Unit-Type-Mutation als Zielmechanismus weiter.
7. Keine Migration führt parallele SaveGame-Wahrheiten weiter.
8. Keine Migration führt parallele Production-Outputpfade weiter.
9. Keine Migration führt mehrere autoritative Gebäudelisten weiter.
10. Keine Migration führt Feature-eigene Gameplay-Timer als Endzustand weiter.
11. Keine Migration führt A*-Direktzugriffe außerhalb NavigationService als Endzustand weiter.
12. Keine Migration macht Renderer/Inspector zum Gameplay-Owner.
13. Keine Migration darf Waren ohne klaren autoritativen Ort erzeugen oder löschen.
14. Keine Migration darf funktionierendes Spieler-Verhalten ohne Regression Gate entfernen.
15. Ziel ist kontrollierte Konsolidierung, kein Big-Bang-Rewrite.

## 28. Explizit noch offen

S2D-03H legt noch nicht fest:

- konkrete Implementation-Blocknummern,
- exakte Dateinamen der neuen Services,
- ob bestehende Dateien intern umbenannt werden,
- finale API-Signaturen,
- finale Eventnamen,
- konkrete Scheduler-Tickraten,
- konkrete SaveGame-Schema-Version,
- konkrete Navigation-Cache-Datenstruktur,
- konkrete Path-Grid-/Chunkgröße,
- konkrete Reihenfolge einzelner Pull Requests/Commits.

Diese Punkte dürfen erst nach Abschluss/Freeze von S2D-03 in einer kontrollierten Implementierungsplanung festgezogen werden.

## 29. Abschluss S2D-03H

Prüfung gegen S2D-00/01/02 und S2D-03A–G:

- tatsächlicher Legacy-Core-Bestand aufgenommen: **PASS**
- zentrale Doppel-Owner zugeordnet: **PASS**
- Guards/Bridges/Patches klassifiziert: **PASS**
- Timer-Zielzuordnung definiert: **PASS**
- Save/Continue-Altpfade zugeordnet: **PASS**
- Navigation/Path-Migration zugeordnet: **PASS**
- Workforce-Type-Mutation als Remove-Pfad erfasst: **PASS**
- KEEP/ADAPT/REPLACE/REMOVE-Kriterien definiert: **PASS**
- Exit Gates pro kritischem Bereich definiert: **PASS**
- Big-Bang-Rewrite ausgeschlossen: **PASS**
- Gameplay-Code geändert: **0**
- offene Architekturblocker: **0**

**S2D-03H – COMPLETE / 0 BLOCKER**
