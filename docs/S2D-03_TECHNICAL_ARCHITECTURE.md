# S2D-03 – TECHNICAL ARCHITECTURE

Status: **V0.1 FROZEN – PASS / 0 BLOCKER**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-03-technical-architecture`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02 UNIT & WORKFORCE MODEL V0.1 FROZEN`

## 1. Zweck

S2D-03 übersetzt die eingefrorenen Produkt-, Economy- und Workforce-Regeln in eine belastbare technische Zielarchitektur.

Dieses Dokument konsolidiert die geschlossenen Teilblöcke:

- S2D-03A – Runtime Ownership & Core System Boundaries,
- S2D-03B – Commands, Queries, Events & Cross-System Contracts,
- S2D-03C – Simulation Scheduler, Update Phases & Runtime Timing Model,
- S2D-03D – SaveGame Snapshot, Restore & Runtime Reconstruction Architecture,
- S2D-03E – Navigation, Reachability & Path Request Architecture,
- S2D-03F – Path/Wear Runtime, Dirty Regions & Render Cache Architecture,
- S2D-03G – Runtime Validation, Invariants & Failure Containment Architecture,
- S2D-03H – Architecture Migration Map & Legacy Replacement Strategy,
- S2D-03I – Internal Consistency & Architecture Freeze Gate.

Konkrete Klassen-, API-, Millisekunden-, Tickrate-, Cachegrößen-, Balance- und Implementierungsdetails bleiben späteren Implementierungsblöcken vorbehalten, sofern sie hier nicht ausdrücklich als Architekturregel eingefroren sind.

## 2. Zentrale Architekturregeln

### 2.1 Ein State – ein Owner

> **Jeder wichtige Gameplay-Zustand besitzt genau einen autoritativen Runtime-Owner.**

Andere Systeme dürfen Zustände über öffentliche Queries/Snapshots lesen, über Commands/Services verändern lassen und über Events auf bereits erfolgte Änderungen reagieren. Parallel geführte zweite Wahrheiten sind nicht zulässig.

### 2.2 Nur der Owner mutiert direkt

> **Nur der autoritative Owner darf seinen eigenen Gameplay-State direkt verändern.**

Systemgrenzen werden über drei Vertragsarten überschritten:

1. Command / Operation – Mutation beim Owner anfordern,
2. Query / Snapshot – Zustand ohne Ownership lesen,
3. Event – über eine bereits abgeschlossene relevante Änderung informieren.

Zielbild:

`Consumer -> Command -> Owner -> Mutation -> Event -> Consumer`

### 2.3 Eine Gameplay-Zeitquelle

> **Es gibt genau eine autoritative Quelle für den Fortschritt der Gameplay-Simulation.**

Gameplay-State wird über einen zentralen SimulationScheduler / GameTick fortgeschrieben. Feature-eigene Endlosintervalle sind keine dauerhafte Zielarchitektur.

### 2.4 SaveGame speichert fachliche Wahrheit

> **SaveGame speichert die autoritative fachliche Wahrheit der Owner – nicht die zufällige Form ihrer aktuellen Runtime-Implementierung.**

### 2.5 Navigation nur über NavigationService

> **Alle Gameplay-Systeme greifen auf Navigation ausschließlich über einen gemeinsamen NavigationService zu.**

### 2.6 PathSystem besitzt Wear

> **PathSystem besitzt den autoritativen Wear-Zustand; Renderer und Render-Cache besitzen ausschließlich dessen visuelle Repräsentation.**

### 2.7 Validatoren reparieren nicht heimlich

> **Validatoren dürfen Inkonsistenzen erkennen, klassifizieren und unsichere Abläufe stoppen, aber keinen fremden Gameplay-State heimlich passend umschreiben.**

## 3. Owner, Consumer und Coordinator

Ein Owner besitzt die autoritative fachliche Wahrheit und ist allein für deren gültige Mutation verantwortlich.

Ein Consumer liest Zustände oder reagiert auf Events, besitzt sie aber nicht. Renderer, UI, Guidance und Inspector sind typische Consumer.

Ein Coordinator verbindet mehrere Owner über definierte Abläufe, darf aber deren Zustände nicht als zweite Wahrheit dauerhaft duplizieren. Logistics, Workforce/Assignment und SaveGame sind typische koordinierende Rollen.

## 4. Runtime-Ownership-Matrix

| Fachbereich | Autoritativer Ziel-Owner |
|---|---|
| Boot/Lifecycle | Boot-/Lifecycle-System |
| globale physische Ressourcen im HQ/Lager | ResourceStore / Storage-System |
| Gold / Wirtschaftswert | Economy-System bzw. klar abgegrenzter Gold-Store |
| Gebäudeinstanzen | BuildingStore / Buildings-System |
| Gebäude-Lifecycle | Buildings-/zuständiges Domain-System |
| Baustellenzustand | ConstructionSystem |
| lokale Produktionsbestände | BuildingStock |
| Produktionszyklen | ProductionSystem |
| reale Personen/Units | UnitStore / GameUnits-Zielsystem |
| Unit-Identität, Home, Spezialisierung, Capabilities | Unit-/Workforce-Domain |
| Unit-Aktivität und Bewegung | Unit-System |
| Jobs / Arbeitsbedarf | JobEngine |
| konkrete Assignment-Bindung | Workforce-/Assignment-Service in enger Kopplung mit Unit-System |
| Transportbedarf / Koordination | LogisticsSystem |
| von Unit getragene Ware | Unit-/Transport-Assignment-Kontext |
| Wohnraum / Home-Bindung | Housing-Service + Unit-Domain |
| Bevölkerung | abgeleitet aus realen Bewohnern |
| Tiere | MapAnimals / AnimalSystem |
| Weltressourcen | MapResources |
| Arbeitsbereiche | WorkAreaSystem |
| Navigation / Reachability | NavigationService |
| Path/Wear | PathSystem |
| Path-Darstellung / Cache | PathRenderer / Render-Cache |
| SaveGame | SaveGameService |
| Rendering | Render-Pipeline / Layer-System |
| UI | UI-System |
| Guidance | GuidanceSystem |
| Inspector | separater Dev-Read/Command-Layer |
| Hauptsimulation | zentraler SimulationScheduler / GameTick |

Die konkreten technischen Namen dürfen später angepasst werden; Ownership-Grenzen dürfen nur über eine dokumentierte Architekturentscheidung geändert werden.

## 5. Buildings

Buildings besitzt stabile Building-ID, Typ/Definition, Position, Footprint, Existenz und gemeinsame Interaktions-/Zugangsreferenzen.

Domänenspezifische Zustände bleiben bei ihren jeweiligen Ownern:

- Baufortschritt bei Construction,
- lokale Output-Ware bei BuildingStock,
- Produktionszyklus bei Production,
- Bewohner/Home-Zuordnung bei Housing/Units.

`Game.buildings` und `Buildings.list` dürfen langfristig keine zwei unabhängigen Wahrheiten sein.

## 6. Construction

Construction ist alleiniger Owner des fachlichen Baustellenablaufs.

Verbindlicher Ablauf:

`WAIT_MATERIAL -> WAIT_BUILDER -> BUILDING -> COMPLETE`

Construction besitzt Materialbedarf, physisch gelieferte Materialien, Baufortschritt, Baustellenstatus und die gültige Builder-Ankunft als Voraussetzung für Fortschritt.

Verbindlich gilt:

> **Vollständig gelieferte Materialien allein starten keinen Baufortschritt. Ein geeigneter Builder muss tatsächlich angekommen sein.**

Construction steuert keine Carrier und berechnet keine Wege. Materialbedarf wird an Logistics gemeldet, Builder-Bedarf an JobEngine/Workforce.

Überlieferung wird vor Entstehung zusätzlicher Transportarbeit verhindert. Restbedarf wird fachlich bestimmt als:

`Restbedarf = Soll - geliefert - gültig reserviert/unterwegs`

## 7. Production und BuildingStock

Production besitzt Regeln und aktive Produktionszyklen. Es prüft Voraussetzungen, referenziert reale Rohstoff-/Tierziele über deren Owner und übergibt erfolgreich erzeugten Output an BuildingStock.

Production darf keine globale HQ-Ressource direkt gutschreiben.

Verbindlicher Warenfluss:

`Production -> BuildingStock -> Logistics -> Unit -> Storage/ResourceStore`

BuildingStock ist die einzige wirtschaftliche Wahrheit für lokal fertig produzierte physische Waren. Sichtbare Stapel sind reine Darstellung und dürfen keinen zweiten Bestand besitzen.

Pause eines Produktionsgebäudes verhindert neue Produktionsarbeit; bereits fertige lokale Ware bleibt transportierbar.

## 8. ResourceStore, Gold und Population

HQ-/Lagerbestände werden ausschließlich durch fachlich gültige Übergänge verändert, insbesondere erfolgreiche Delivery.

Physische Waren bleiben von Gold getrennt. Gold ist ein nicht-physischer Wirtschaftswert und wird nur beim zuständigen Gold-/Economy-Owner mutiert.

Population ist kein unabhängig gepflegter Rohstoffcounter:

`Population = Anzahl gültiger realer Bewohner`

UI darf diesen Wert anzeigen oder cachen, aber nicht als zweite Gameplay-Wahrheit führen.

## 9. Units, Workforce und Assignment

Das Unit-System besitzt reale Personen einschließlich stabiler Unit-ID, tatsächlicher Position, Home-Bindung, Spezialisierung/Capabilities, Availability, Activity, Assignment-Referenz und gegebenenfalls getragener Ware.

Verbindlich bleibt S2D-02:

> **Ein temporärer Job verändert niemals die dauerhafte Unit-Identität.**

Historische Muster wie `resident -> carrier -> resident` sind Zielarchitektur-OUT.

JobEngine besitzt Arbeitsbedarf, nicht Personenzustand. Workforce prüft geeignete Units und bindet genau eine gültige Person an genau ein Assignment.

Zielablauf:

`realer Bedarf -> Job -> Eligibility/Capability -> Reachability -> Assignment -> reale Ausführung -> Completion/Recovery -> Release`

Eine Unit ist erst `FREE`, wenn kein Assignment, keine exklusive Reservation, keine ungeklärte getragene Ware und kein Recovery-Kontext mehr offen ist.

## 10. Logistics, Warenort und Reservation

Logistics koordiniert Transport, besitzt Waren aber nicht als zweiten Bestand.

Verbindliche Zustände:

- vor Pickup: Ware liegt bei der Quelle,
- nach Pickup: Ware liegt bei der Unit,
- nach Delivery: Ware liegt beim Ziel.

> **Eine physische Warenmenge besitzt zu jedem Zeitpunkt genau einen autoritativen wirtschaftlichen Ort.**

Reservation ist keine Warenkopie. Sie blockiert eine reale Menge an ihrem aktuellen Owner-Ort für einen konkreten Bedarf.

Bei Abbruch vor Pickup bleibt Ware an der Quelle und Reservation wird gelöst. Nach Pickup bleibt Ware bei der Unit und muss über einen definierten Recovery-Pfad zu einem gültigen Ziel geführt werden. Silent delete oder Rückteleport sind nicht zulässig.

## 11. MapResources, MapAnimals und WorkAreas

MapResources besitzt reale abbaubare/nutzbare Weltressourcen. Produktionssysteme referenzieren und verändern sie ausschließlich über definierte Operationen.

MapAnimals besitzt existierende Tiere und deren relevanten Weltzustand. Hunter-Logik darf keine eigene Tierwahrheit führen.

WorkAreaSystem besitzt Arbeitsbereiche. Änderungen an WorkAreas invalidieren betroffene Arbeitsziele gezielt und können Job-/Navigation-Neubewertung auslösen.

## 12. Cross-System Contracts

Commands fordern Mutationen an. Der Owner validiert Voraussetzungen, schützt seine Invarianten, akzeptiert oder lehnt ab und emittiert erst nach konsistenter Mutation ein Event.

Queries und Snapshots sind nebenwirkungsfrei. Über Systemgrenzen werden bevorzugt stabile IDs statt Live-Objektverweise verwendet.

Events sind Fakten nach einer Änderung, keine versteckten Commands. Event-Listener dürfen auf ein Event reagieren, aber keine fremden Owner-Interna direkt verändern.

UI, Renderer, Guidance, SaveGame und Inspector verwenden dieselben öffentlichen Verträge. Direkte Array-/Map-/Objektmanipulation über Systemgrenzen ist Zielarchitektur-OUT.

## 13. Simulation Scheduler

Gameplay-Simulation und Rendering sind getrennt. Render-FPS ist nicht Simulations-Tickrate.

Der Scheduler besitzt keine Gebäude, Units, Jobs oder Waren. Er besitzt nur zeitliche Koordination, Simulationszeit, Phasenreihenfolge, Fälligkeiten, Pause/Resume und Performance-Messpunkte.

Ein logischer Simulationsschritt folgt fachlich dieser Reihenfolge:

1. INPUT / COMMAND INTAKE
2. WORLD VALIDATION & INVALIDATION
3. DEMAND / JOB GENERATION
4. ASSIGNMENT / WORKFORCE SCHEDULING
5. UNIT INTENT & NAVIGATION REQUESTS
6. UNIT MOVEMENT & ARRIVAL
7. WORK / PRODUCTION / CONSTRUCTION EXECUTION
8. LOGISTICS TRANSFERS / ECONOMY EFFECTS
9. RECOVERY / COMPLETION / RELEASE
10. POST-STEP EVENTS / DERIVED STATE
11. LOW-FREQUENCY / MAINTENANCE WORK, falls fällig

Verbindliche Trennung:

`Assignment != Arrival != Work Effect`

Feature-eigene `setInterval`-Schleifen für Builder, Residents, Hunter, Taxes, Production, Navigation-Retry oder Path-Decay sind langfristig zu entfernen und in Scheduler-Phasen oder Eventreaktionen zu überführen.

Pause stoppt Simulationszeit. Renderer, UI und Inspector dürfen weiterlaufen, aber keine Gameplay-Zeit fortschreiben.

## 14. Event-driven statt Full-Polling

Bevorzugte Reaktionen sind ereignis-/dirty-getrieben, z. B.:

- neuer BuildingStock-Output -> Logistics neu bewerten,
- Construction vollständig versorgt -> Builder-Bedarf,
- Unit wird frei -> Workforce neu bewerten,
- Gebäude pausiert -> Production reagieren,
- Tier entfernt -> Hunting-Target invalidieren,
- WorkArea geändert -> Arbeitsziel neu prüfen,
- Restore abgeschlossen -> Views/Caches neu aufbauen.

Nicht in jedem Tick vollständig neu gescannt werden sollen unveränderte ungültige Jobs, gebundene Units, erfüllte Transportbedarfe, pausierte Produktion, Guidance-Bedingungen oder UI-/Inspector-Komplettbestände.

## 15. Backoff und Retry

Backoff ist Simulationszustand/Fälligkeit innerhalb des zentralen Schedulers, kein Timer pro Job.

Ein fehlgeschlagener unveränderter Job/Navigation-Request wird nicht in jedem Tick neu vollständig geprüft.

Erneute Bewertung erfolgt bei:

- Ablauf von `retryNotBefore` in Simulationszeit,
- relevanter Weltänderung/Invalidierung,
- Änderung der fachlichen Voraussetzungen.

Ein neuer Renderframe oder GameTick allein ist kein ausreichender Retry-Grund.

## 16. NavigationService

Navigation besitzt begehbare Navigationsrepräsentation, Reachability-Prüfungen, Pfadsuche, Cache, Invalidierung, Deduplizierung und Diagnosemetriken. Es besitzt keine Jobs oder Units.

Navigation wird in drei fachliche Ebenen getrennt:

1. Structural Reachability – billige/grobe Connectivity-Prüfung,
2. Exact Reachability Check – konkrete Erreichbarkeit, wenn erforderlich,
3. Actual Path Request – konkreter Bewegungspfad für eine bereits gültige Bewegungsabsicht.

Zielablauf vor Assignment:

`Job gültig -> Unit capability/availability -> structural reachability -> falls nötig exact reachability -> Assignment -> actual path request`

Damit ist das historische Muster `für jeden Tick -> für jeden Job -> für jede freie Unit -> voller A*` ausdrücklich verboten.

Positive und insbesondere negative Reachability-Ergebnisse dürfen gecacht werden. Gleichwertige Requests sollen dedupliziert werden.

Navigationsergebnisse werden durch relevante Weltänderungen gezielt invalidiert. Normale Unit-Bewegung löst keine globale Cache-Invalidierung aus.

Gebäude werden über definierte Access-, Pickup-, Delivery- und Build-Punkte navigiert, nicht blind über Gebäudezentren.

A*-Pfad, Open-/Closed-Listen und Navigation-Cache sind transiente Runtime und werden nach Continue neu aufgebaut.

## 17. Path/Wear

Wear entsteht ausschließlich aus real stattfindender Unit-Bewegung.

Zielablauf:

`reale Unit-Bewegung -> Wear-Akkumulation -> Dirty Region -> Re-Bake -> sichtbarer Trampelpfad`

Wiederholte Bewegung verstärkt vorhandenen lokalen Wear, statt unbegrenzt neue permanente Einzelstempel anzulegen.

Bewegung wird segmentbasiert eingetragen, damit zwischen Simulationsschritten keine sichtbaren Lücken entstehen.

Wear sättigt sich und kann über Simulationszeit langsam abklingen. Decay ist Low-Frequency-Arbeit des Schedulers; kein Full-Map-Scan pro GameTick.

Änderungen markieren nur betroffene Dirty Regions. Dirty Regions können koalesziert und gesammelt neu gebacken werden.

PathRenderer/Render-Cache ist rein abgeleitet. Cachetechnik wie OffscreenCanvas/RenderTexture/Chunk-Texturen bleibt Implementierungsdetail.

SaveGame persistiert den autoritativen Wear-State, nicht Render-Caches, Dirty-Flags, Canvas-Daten oder Einzelstempel als zweite Wahrheit.

Automatische Wear-Pfade bleiben fachlich getrennt von späteren gebauten Straßen.

## 18. SaveGame Snapshot

Jeder Owner liefert einen eigenen fachlichen Snapshot. SaveGame darf nicht beliebig interne Live-Objekte serialisieren.

Persistente Beziehungen verwenden stabile IDs, nicht JavaScript-Objektreferenzen.

### 18.1 Persistent Authoritative State

Dazu gehören insbesondere:

- Gebäude und stabile IDs,
- Construction-Zustand und Fortschritt,
- BuildingStock und zentrale Lagerbestände,
- Units, Home-Bindungen und dauerhafte Spezialisierung,
- getragene Waren,
- relevante Production-Zyklen/Pause,
- Weltressourcen,
- Tiere,
- WorkAreas,
- Gold,
- Path/Wear,
- Guidance-Fortschritt.

### 18.2 Persistent Coordinated Runtime State

Nur soweit zur verlustfreien Rekonstruktion erforderlich:

- laufende fachlich relevante Assignments,
- gültige Reservationen,
- Recovery-Kontexte,
- relevante Backoff-Information in Simulationszeit.

### 18.3 Transient Reconstructable State

Nicht als autoritative SaveGame-Wahrheit speichern:

- A*-Suchzustände und fertige Pfad-Caches,
- Renderer-/Sprite-/Animation-Handles,
- Event-Queues,
- Dirty-Flags,
- Performance-Messdaten,
- Inspector-Views,
- Scheduler-Registrierungen/Queuepositionen,
- JavaScript-Timer-Handles,
- Render-/OffscreenCanvas-Caches,
- abgeleitete Population,
- sichtbare Stacks.

## 19. Restore / Continue

Continue ist ein eigener Lifecycle-Pfad und darf nicht den New-Game-Initialisierer ausführen, der Defaultzustände zusätzlich spawnt oder gutschreibt.

Verbindliche Restore-Reihenfolge:

1. Scheduler stoppen / Runtime quiescent machen,
2. Save lesen und Schema/Version validieren,
3. inkompatiblen oder korrupten Save vor Mutation ablehnen,
4. alte Runtime sauber leeren,
5. grundlegende Welt-/Building-/Store-Owner restaurieren,
6. Construction, Production, Housing, Economy, MapResources, Animals, WorkAreas und Path/Wear restaurieren,
7. Units und stabile Beziehungen restaurieren,
8. getragene Waren, notwendige Reservationen/Assignments/Recovery rekonstruieren,
9. rekonstruierbare Jobs aus realem Bedarf neu erzeugen,
10. Cross-Owner-Invarianten validieren,
11. Navigation, Render-Caches, Views und weitere transiente Runtime neu aufbauen,
12. Scheduler/Systeme genau einmal registrieren,
13. Scheduler erst nach PASS starten,
14. ein Restore-Completed-Lifecycle-Event emittieren; historische Fachereignisse nicht blind replayen.

Verbindlich:

> **Continue benötigt im Zielbild keinen Post-Restore-Gameplay-Patch mehr.**

Das Laden desselben SaveGames muss zu einem äquivalenten Zustand führen und darf keine additiven Bewohner, Gebäude, Waren oder Timer erzeugen.

## 20. Runtime Validation und Failure Containment

Owner schützen lokale Invarianten unmittelbar an ihren Mutationen. Cross-System-Grenzen werden an kritischen Übergängen geprüft, insbesondere Assignment, Pickup, Delivery und Restore.

Wirtschaftlich kritische Mutationen arbeiten fail-closed: Sind zentrale Voraussetzungen ungültig, findet die Mutation nicht statt.

Normale Wartezustände wie `kein Builder`, `Output voll`, `kein freier Worker` oder `temporär unerreichbar` sind keine Architekturfehler.

Architektur-/Runtimefehler sind z. B.:

- doppelte autoritative Warenposition,
- Unit gleichzeitig FREE und assigned,
- Zombie-Assignment,
- Zombie-Reservation,
- getragene Ware ohne gültigen Assignment-/Recovery-Kontext,
- Baufortschritt ohne reale Builder-Ankunft,
- doppelte Resident-/Home-Ownership,
- identische Navigation-Fails in Hot-Retry-Schleife,
- Restore mit ungültigen Cross-Referenzen,
- mehrfach registrierte Scheduler-/Event-Schleifen nach Continue.

Der betroffene Ablauf wird kontrolliert gestoppt oder isoliert. Recovery bleibt fachliche Logik des zuständigen Owners/Coordinators.

Inspector und Diagnostics dürfen Invariant Violations, IDs, FailReasons, Trace und Performance-Metriken anzeigen, aber keine Produktivlogik reparieren.

Globale Vollvalidierungen laufen gezielt, insbesondere vor/nach Restore oder als bewusste Diagnose, nicht als Full-State-Scan pro GameTick.

## 21. UI, Renderer, Guidance und Inspector

Renderer besitzt keine Gameplay-Ownership. Er liest Owner-Zustände und abgeleitete Views.

UI liest öffentliche Zustände und sendet Commands. Direkte Mutation von Gameplay-Arrays ist verboten.

Guidance reagiert auf öffentliche Events und besitzt nur eigenen Tutorial-/Guidance-Fortschritt.

Inspector ist ein optionaler Dev-Read/Command-Layer. Er darf Runtime-Snapshots lesen, Diagnosen anzeigen und kontrollierte Debug-Commands senden. Er darf keine produktive Business-Logik ersetzen oder automatisch fremde Zustände patchen.

Asset-/Sprite-/JSON-Entwicklungswerkzeuge gehören langfristig in die gemeinsame Halle-Demo-Dev-Tool-Umgebung, nicht in den produktiven Runtime-Inspector.

## 22. Boot, Registrierung und Shutdown

Runtime-Systeme werden explizit durch Lifecycle/Boot registriert und gestartet. Hidden Self-Start beim bloßen Laden einer Feature-Datei ist nicht Zielarchitektur.

Systemregistrierung definiert mindestens fachlich:

- Scheduler-Phase,
- continuous / due / event-driven,
- gelesene Inputs,
- eigene Mutationen,
- emittierte Events.

Shutdown/Continue muss Subscriptions und Registrierungen sauber lösen. Nach Continue darf kein altes Feature-Intervall und keine doppelte Scheduler-Registrierung weiterlaufen.

## 23. Performance-Messung

Diagnostics/Inspector sollen später mindestens beobachtbar machen:

- Simulation-Step-Dauer,
- Phase-/System-Dauer,
- aktive/fällige Jobs,
- Navigation-Aufrufe und Failrate,
- Unit-Update-Anzahl,
- Maintenance-Kosten,
- Save-Snapshot-Kosten,
- Path dirty/re-bake Aktivität.

Messung ist Diagnose, nicht Business-Owner.

## 24. Migrationsklassen

Bestehende Runtime-Dateien werden in vier Klassen eingeordnet:

- **KEEP** – fachliche Basis passt grundsätzlich,
- **ADAPT** – richtige Kernverantwortung, aber alte Kopplungen/API/Timer müssen angepasst werden,
- **REPLACE** – Funktion wird kontrolliert in einen neuen Owner/Service überführt,
- **REMOVE** – reine Legacy-/Guard-/Patch-Schicht nach bestandenem Exit-Gate löschen.

Die Migration erfolgt kontrolliert und nicht als Big-Bang-Rewrite.

## 25. Legacy Migration Map – Kernbestand

### 25.1 KEEP / ADAPT

Hoher Wiederverwendungswert besteht insbesondere bei:

- `core/game.buildings.js` -> Buildings/BuildingStore,
- `core/game.construction.js` -> ConstructionSystem,
- `core/game.units.js` -> UnitStore/GameUnits-Zielsystem,
- `core/job.engine.js` -> JobEngine,
- `core/building.stock.js` -> BuildingStock,
- `core/game.production.js` und Produktionsmodule -> ProductionSystem,
- `core/map.resources.js` -> MapResources,
- `core/map.animals.js` -> MapAnimals,
- `core/game.workarea.js` -> WorkAreaSystem,
- `core/eventbus.js` -> Event-Infrastruktur,
- `core/game.renderer.js` -> Render-Pipeline,
- `core/savegame-v2.js` -> Ausgangsbasis für SaveGameService.

Diese Module dürfen angepasst werden, bis sie die eingefrorenen Owner-/Contract-/Scheduler-Regeln erfüllen.

### 25.2 REPLACE / ABSORB

Funktional in Zielsysteme zu überführen sind insbesondere:

- `core/worker.production.js` -> Production/Workforce/Scheduler,
- `core/carrier.runtime.js` -> Logistics/Unit/Assignment/Scheduler,
- `core/core.pfglue.js` -> NavigationService,
- heutiges `path-overlay.js`-/Stamp-Modell -> PathSystem + PathRenderer/Cache.

### 25.3 REMOVE nach Exit-Gate

Reine Übergangs-/Patch-Schichten sind insbesondere:

- `core/sa04.runtime-guards.js`,
- `core/sa04.production-bridge.js`,
- `core/sa04.stock-persistence.js`,
- `core/sa04.pause-builder-fixes.js`,
- `core/sa04.worker-pause-hunter.js`,
- `core/sa04.hunter-entry-fix.js`,
- `core/sa04.hunter-production-fix.js`,
- `core/sa05.resident-workforce.js`,
- `core/savegame-v2-uid-guard.js`,
- `core/event.compat.js`,
- später obsolete Render-/Compatibility-Shims, sofern ihre Funktionen ersetzt sind.

`sa04.resource-piles.js` darf funktional nur als rein visuelle BuildingStock-Darstellung weiterleben oder in eine solche überführt werden.

Diagnosemodule dürfen erhalten bleiben, wenn sie ausschließlich beobachten und keine produktive Zustandskorrektur durchführen.

## 26. Exit Gates für Legacy-Guards

Ein Guard/Patch darf erst entfernt werden, wenn der Ziel-Owner die Verantwortung selbst korrekt erfüllt und die zugehörige Regression PASS ist.

### Building-Doppel-Owner

Entfernung erst wenn:

- genau eine Building-Collection autoritativ ist,
- New Game und Continue dieselbe Owner-Quelle benutzen,
- Pause/UI/Renderer/Construction darüber laufen,
- keine Listen-Synchronisierung nach Restore nötig ist.

### Construction Builder Guard

Entfernung erst wenn:

- Materials complete -> WAIT_BUILDER,
- realer Builder wird zugewiesen,
- Navigation/Arrival läuft über Standardpfad,
- Baufortschritt erst nach realer Ankunft,
- kein Polling-Guard mehr notwendig.

### Overdelivery Guard

Entfernung erst wenn:

- Restbedarf Reservationen/unterwegs berücksichtigt,
- keine neuen überschüssigen Lieferjobs entstehen,
- bestehende Transporttransaktionen sauber über Recovery behandelt werden,
- kein nachträgliches Löschen von Carrier-State nötig ist.

### Production Bridge

Entfernung erst wenn:

- Production nativ nach BuildingStock schreibt,
- keine direkte HQ-Gutschrift parallel existiert,
- Pause nativ vom Production-Owner berücksichtigt wird,
- Continue Owner-State restauriert statt BuildComplete zu replayen,
- keine Legacy-Buildjobs mehr entstehen.

### Resident Workforce Patch

Entfernung erst wenn:

- Residents dauerhafte Identität behalten,
- Housing/Home-Bindung nativ im Unit-/Housing-Modell liegt,
- Workforce Helper-Residents über Capabilities zuweist,
- Idle/Home/Leisure über Scheduler/Unit-Lifecycle läuft,
- kein Unit-Type-Mutieren und kein eigener Resident-Timer mehr existiert,
- Path-Performance nicht mehr in Workforce-Code steckt.

### SaveGame Guards

Entfernung erst wenn:

- Owner eigene Snapshots/Restore-Verträge liefern,
- stabile IDs nativ garantiert sind,
- Restore-Reihenfolge definiert und getestet ist,
- keine additive Post-Restore-Patchphase mehr notwendig ist,
- Scheduler/Subscriptions genau einmal starten.

## 27. Verbotene Dauerarchitekturen

Langfristig ausdrücklich OUT sind:

1. mehrere unabhängige Stores für denselben Gameplay-State,
2. Feature-Patches, die fremde Owner-Interna periodisch korrigieren,
3. Resident-Identity-Mutation für temporäre Arbeit,
4. direkte HQ-Gutschrift aus Production vor physischem Transport,
5. Construction, die Carrier direkt steuert,
6. Renderer/UI/Inspector als Gameplay-Owner,
7. SaveGame als zweiter Runtime-Store,
8. A*-Aufrufe aus vielen Feature-Modulen mit eigenen Retry-Schleifen,
9. ein A*-Vollpfad pro Job × Unit × Tick,
10. persistente Einzelstempel als Pfad-Gameplaymodell,
11. Timer pro Unit/Job/Gebäude als Primärsimulation,
12. Event-Replay beim Restore, das erneut wirtschaftliche Side Effects erzeugt,
13. Validator-/Guard-Code, der Inkonsistenzen durch fremde Direktmutation kaschiert,
14. Teleport/Silent Delete als produktiver Recovery-Fallback für Waren oder Personen.

## 28. Bewusst offene Implementierungsdetails

Noch nicht eingefroren sind unter anderem:

- konkrete JavaScript-Klassennamen und Modulgrenzen innerhalb eines Owners,
- finale API-Signaturen,
- EventBus-Implementierung,
- Basis-Tickrate,
- fixed vs. variable timestep,
- Catch-up-Regeln,
- konkrete Backoff-Zeiten,
- konkrete Due-Queue-Datenstruktur,
- konkrete Navigation-Grid-/Graph-/Heap-Strukturen und Heuristik,
- Cachegrößen,
- Navigation-/Job-/Unit-Budgets,
- Path-Raster-/Brush-Größe,
- Wear-/Decay-Balance,
- Re-Bake-Frequenz,
- OffscreenCanvas/GPU/Worker-Technik,
- konkrete SaveGame-JSON-Feldnamen, Kompression und Storage-Technologie,
- Save-Migrationscode,
- konkrete Autosave-Frequenz,
- Inspector-UI-Layout,
- spätere Spielgeschwindigkeitsstufen.

Diese Offenheit ist kein Blocker, solange die eingefrorenen Owner-, Contract-, Timing-, Restore- und Invariantenregeln eingehalten werden.

## 29. S2D-03I – Internal Consistency & Architecture Freeze Gate

Geprüft wurden S2D-03A–H geschlossen gegen die eingefrorenen S2D-00/01/02-Regeln.

### 29.1 Prüfergebnis

| Prüfung | Ergebnis |
|---|---|
| Widersprüche zu S2D-00 Product Scope | 0 |
| Widersprüche zu S2D-01 Game Design / Economy | 0 |
| Widersprüche zu S2D-02 Unit & Workforce | 0 |
| doppelte autoritative Owner im Zielbild | 0 |
| Cross-System-Contract-Widersprüche | 0 |
| Scheduler-/Feature-Timer-Widersprüche | 0 |
| Save/Continue-/Restore-Widersprüche | 0 |
| Navigation-/Backoff-Widersprüche | 0 |
| Path/Wear-/Rendering-Ownership-Widersprüche | 0 |
| Validation-/Recovery-Ownership-Widersprüche | 0 |
| Migration ohne Exit-Gate | 0 |
| vorgezogene UI-/Balance-/Content-Detailentscheidungen als Blocker | 0 |
| Gameplay-/Runtime-Codeänderungen in S2D-03 | 0 |
| offene Architekturblocker | **0** |

### 29.2 Kritische Cross-Checks

- Physical Goods: S2D-01B One-Location-Invariant bleibt in Logistics, SaveGame und Recovery konsistent.
- Construction: Material vollständig + reale Builder-Ankunft bleibt in Scheduler, Restore und Validation konsistent.
- Workforce: stabile Resident-Identität bleibt in Ownership, Assignment, Migration und SaveGame konsistent.
- Backoff: gehört zur Job-/Scheduling-Logik und erzeugt keine eigenständigen Timer.
- Continue: restauriert Owner-State, rekonstruiert transiente Runtime und startet den Scheduler erst nach PASS.
- Path/Wear: autoritativer Wear-State wird persistiert; Render-Cache bleibt transient.
- Validation: erkennt/isoliert, übernimmt aber keine fremde Ownership.
- Legacy: jeder bekannte Guard-/Bridge-Bestand besitzt Ziel-Owner und Exit-Bedingung.

### 29.3 Freeze-Entscheidung

S2D-03A – COMPLETE  
S2D-03B – COMPLETE  
S2D-03C – COMPLETE  
S2D-03D – COMPLETE  
S2D-03E – COMPLETE  
S2D-03F – COMPLETE  
S2D-03G – COMPLETE  
S2D-03H – COMPLETE  
S2D-03I – PASS / 0 BLOCKER

**S2D-03 TECHNICAL ARCHITECTURE V0.1 FROZEN**

Änderungen an diesen Architekturregeln erfolgen ab jetzt nur noch kontrolliert über `S2D-07 – DECISION & CHANGE LOG` bzw. einen ausdrücklich freigegebenen späteren Architektur-Revisionsblock.
