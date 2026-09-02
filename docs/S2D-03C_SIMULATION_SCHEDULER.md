# S2D-03C – Simulation Scheduler, Update Phases & Runtime Timing Model

Status: **COMPLETE – Bestandteil von S2D-03 TECHNICAL ARCHITECTURE V0.1 DRAFT**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-03-technical-architecture`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02 UNIT & WORKFORCE MODEL V0.1 FROZEN` + `S2D-03A/B COMPLETE`

> Konsolidierungshinweis: Dieser geschlossene Teilblock wird spätestens beim S2D-03 Freeze-Gate in `S2D-03_TECHNICAL_ARCHITECTURE.md` konsolidiert. Er ist kein zusätzliches dauerhaftes Architektur-Masterdokument.

## 1. Zweck

S2D-03C definiert die zeitliche Zielarchitektur der Simulation.

Der Block legt fest:

- wer den Simulationsfortschritt taktet,
- wie Runtime-Systeme in definierte Update-Phasen eingeordnet werden,
- welche Systeme kontinuierlich/tickbasiert und welche ereignisgetrieben arbeiten,
- wie Feature-eigene `setInterval`-/Polling-Schleifen langfristig entfernt werden,
- wie Jobs, Workforce, Units, Produktion, Bau, Logistik, Tiere und Wege ohne konkurrierende Timer zusammenspielen,
- wie Backoff, seltene Aufgaben und visuelle Aktualisierung zeitlich entkoppelt werden,
- wie Save/Continue und Pause mit dem Scheduler zusammenwirken,
- welche Performance- und Determinismusregeln für den späteren Umbau gelten.

Noch nicht festgelegt werden konkrete Millisekundenwerte, finale Tickrate, JavaScript-Klassennamen, exakte Queue-Datenstrukturen, Worker-Threads oder Render-FPS.

## 2. Zentrale Zeitregel

> **Es gibt genau eine autoritative Quelle für den Fortschritt der Gameplay-Simulation.**

Diese Rolle übernimmt fachlich ein zentraler `SimulationScheduler` / `GameTick`.

Runtime-Systeme dürfen ihren Gameplay-State nicht dauerhaft über unabhängige Endlos-Timer fortschreiben.

Zielbild:

`Game Loop / Clock -> SimulationScheduler -> definierte Phasen -> Owner-Systeme -> Events/Resultate`

Nicht Zielbild:

`GameTick + Resident-Interval + Builder-Guard-Interval + Hunter-Interval + Tax-Interval + Path-Interval + weitere Feature-Timer`

## 3. Simulation und Rendering werden getrennt

Rendering und Gameplay-Simulation besitzen unterschiedliche Aufgaben.

### Simulation

- verändert autoritativen Gameplay-State,
- läuft über den zentralen Scheduler,
- arbeitet in kontrollierter Reihenfolge,
- darf bei schwankender Render-FPS nicht unkontrolliert schneller/langsamer werden.

### Rendering

- stellt den aktuellen Runtime-State dar,
- darf über `requestAnimationFrame` bzw. die Render-Schleife laufen,
- besitzt keinen Gameplay-State,
- darf keine Simulation nachholen oder korrigieren.

Damit gilt:

> **Render-FPS ist nicht die Simulations-Tickrate.**

## 4. Scheduler als Coordinator, nicht als Gameplay-Owner

Der Scheduler besitzt keine Gebäude, Units, Jobs, Waren oder Tiere.

Er besitzt nur zeitliche Koordination, z. B.:

- aktuelle Simulationszeit,
- Tick-/Step-Fortschritt,
- registrierte Systemphasen,
- Fälligkeit langsam laufender Aufgaben,
- Pause-/Resume-Zustand der Simulation,
- Performance-Messpunkte.

Die fachlichen Zustände bleiben bei den in S2D-03A definierten Ownern.

## 5. Grundmodell eines Simulation Steps

Ein logischer Simulationsschritt folgt einer stabilen Phasenordnung.

Fachliches Zielmodell:

1. **INPUT / COMMAND INTAKE**
2. **WORLD VALIDATION & INVALIDATION**
3. **DEMAND / JOB GENERATION**
4. **ASSIGNMENT / WORKFORCE SCHEDULING**
5. **UNIT INTENT & NAVIGATION REQUESTS**
6. **UNIT MOVEMENT & ARRIVAL**
7. **WORK / PRODUCTION / CONSTRUCTION EXECUTION**
8. **LOGISTICS TRANSFERS / ECONOMY EFFECTS**
9. **RECOVERY / COMPLETION / RELEASE**
10. **POST-STEP EVENTS / DERIVED STATE**
11. **LOW-FREQUENCY / MAINTENANCE WORK, falls fällig**

Die finalen technischen Namen dürfen später abweichen; die Reihenfolge der Verantwortungsarten soll jedoch nachvollziehbar und stabil bleiben.

## 6. Phase 1 – Input / Command Intake

In dieser Phase werden externe Änderungsanforderungen kontrolliert angenommen.

Quellen können sein:

- Spieler-UI,
- Inspector-Debug-Commands,
- Guidance-vermittelte Spieleraktionen,
- Restore-/Initialisierungsbefehle in dafür vorgesehenem Lifecycle-Kontext.

Commands werden nicht beliebig mitten in fremden Owner-Updates ausgeführt, wenn dadurch inkonsistente Zwischenzustände entstehen könnten.

Der Scheduler darf eine definierte Command-Queue bzw. einen sicheren Ausführungspunkt verwenden.

Exakte Queue-Technik bleibt offen.

## 7. Phase 2 – World Validation & Invalidation

Vor neuer Arbeit werden relevante Änderungen der Welt berücksichtigt.

Beispiele:

- Gebäude wurde entfernt,
- Rohstoffquelle ist erschöpft,
- Tierziel ist ungültig,
- WorkArea wurde geändert,
- Zugang/Reachability-Grundlage hat sich geändert,
- Baustellenbedarf wurde erfüllt oder gelöscht.

Ziel ist, ungültige Jobs/Assignments möglichst früh zu markieren, bevor neue Zuweisungen erfolgen.

Diese Phase ersetzt keine Owner-Validierung, sondern ordnet die Reaktion auf bereits eingetretene Änderungen zeitlich.

## 8. Phase 3 – Demand / Job Generation

Domain-Systeme erzeugen oder aktualisieren nur realen Arbeitsbedarf.

Beispiele:

- Construction meldet fehlendes Material,
- Construction meldet Builder-Bedarf,
- BuildingStock/Storage und Zielsysteme erzeugen Transportbedarf,
- Production erzeugt Arbeitsbedarf,
- Housing/Economy erzeugt keine künstlichen Worker-Jobs ohne fachlichen Bedarf.

Jobs entstehen nicht aus Polling nur deshalb, weil ein Timer abläuft, sondern aus tatsächlichem Zustand bzw. relevanten Events/Dirty-Marks.

## 9. Phase 4 – Assignment / Workforce Scheduling

Nur vergabefähige Jobs werden gegen freie geeignete Units geprüft.

Hier gelten S2D-02C und S2D-03B:

- Job muss gültig sein,
- Unit muss `FREE` und geeignet sein,
- Capability muss passen,
- Spezialisten-Vorrang gilt,
- Helper-Residents nur für erlaubte einfache Aufgaben,
- Reachability wird vor Bindung soweit sinnvoll geprüft,
- genau ein normales Assignment pro Person,
- keine Typmutation.

Jobs im Backoff werden in dieser Phase nicht bei jedem Tick erneut vollständig geprüft.

## 10. Phase 5 – Unit Intent & Navigation Requests

Zugewiesene Units bestimmen aus ihrem Assignment die nächste fachliche Bewegung bzw. Aktion.

Navigation wird ausschließlich über den NavigationService angefordert.

Wichtig:

- nicht jedes System ruft A* selbst auf,
- identische fehlgeschlagene Anfragen werden nicht in mehreren Feature-Timern wiederholt,
- ein Unit-/Assignment-Zustand löst nur die fachlich notwendige Navigation aus,
- erneute Suche erfolgt bei neuem Bedarf, relevantem Welttrigger oder nach kontrolliertem Backoff.

## 11. Phase 6 – Unit Movement & Arrival

Units bewegen sich anhand gültiger Bewegungszustände.

In dieser Phase werden insbesondere:

- Weltpositionen fortgeschrieben,
- Zielerreichung geprüft,
- Arrival-Zustände erzeugt,
- Freizeit-/Return-Home-Bewegungen aktualisiert,
- reale Bewegung für das Path/Wear-System gemeldet.

Arrival ist eine echte Zustandsänderung und darf anschließend Work-/Pickup-/Delivery-Phasen freigeben.

## 12. Phase 7 – Work / Production / Construction Execution

Erst nach gültiger Ankunft dürfen fachliche Arbeitseffekte stattfinden.

Beispiele:

- Builder erzeugt Baufortschritt,
- Holzfäller arbeitet am Baum,
- Steinbrucharbeiter arbeitet an Stein,
- Fischer arbeitet im gültigen Bereich,
- Jäger arbeitet mit realem Tierziel,
- Produktionszyklus schreitet fort.

Damit bleibt verbindlich:

`Assignment != Arrival != Work Effect`

Kein separater Builder-Guard-Timer darf außerhalb dieser Ordnung Baufortschritt erzeugen oder verhindern.

## 13. Phase 8 – Logistics Transfers / Economy Effects

Wirtschaftliche Übergänge werden an definierten fachlichen Punkten ausgeführt.

Beispiele:

- erfolgreicher Pickup: Ware Quelle -> Unit,
- erfolgreiche Delivery: Ware Unit -> Ziel,
- Produktionsabschluss: Output -> BuildingStock,
- abgeschlossene Steuerperiode/Tax-Regel: Goldmutation beim Gold-Owner,
- Baustellenlieferung: Zielbestand wird aktualisiert.

Kritische Transaktionen müssen innerhalb ihres Owner-/Coordinator-Vertrags konsistent abgeschlossen sein, bevor Folgeevents entstehen.

## 14. Phase 9 – Recovery / Completion / Release

Hier werden abgeschlossene oder ungültige Assignments sauber bereinigt.

Beispiele:

- Assignment erfolgreich abgeschlossen,
- Unit wird `FREE`,
- Reservation wird erfüllt/freigegeben,
- Transport-Recovery wird eingeleitet,
- verlorenes Ziel führt zu kontrolliertem Abbruch,
- Job wird in Backoff gesetzt,
- Unit startet Rückkehr nach Hause.

Eine Unit darf erst freigegeben werden, wenn ihre wirtschaftlichen Bindungen sauber beendet sind.

## 15. Phase 10 – Post-Step Events & Derived State

Nach konsistent abgeschlossenen Mutationen werden Events veröffentlicht.

Beispiele:

- `GoodsDelivered`,
- `AssignmentCompleted`,
- `ConstructionCompleted`,
- `ProductionPaused`,
- `UnitArrivedHome`,
- `JobBackoffStarted`.

Abgeleitete Werte können aktualisiert bzw. invalidiert werden, z. B.:

- Bevölkerung aus realen Bewohnern,
- UI-Read-Models,
- Inspector-Snapshots,
- Guidance-Reaktionsgrundlagen.

Events dürfen keine zweite Simulationsschleife erzeugen, die denselben State parallel bearbeitet.

## 16. Phase 11 – Low-Frequency / Maintenance Work

Nicht jede Aufgabe muss in jedem Simulation Step vollständig laufen.

Seltene bzw. teurere Aufgaben können vom zentralen Scheduler mit eigener Fälligkeit innerhalb derselben Zeitarchitektur ausgeführt werden.

Beispiele:

- Autosave-Anstoß,
- Path/Wear-Rebake bzw. Dirty-Region-Verarbeitung,
- langsamere Economy-/Tax-Prüfung,
- Diagnoseaggregation,
- seltene Aufräum-/Validation-Arbeit,
- Guidance-/UI-Hilfsaktualisierungen, soweit überhaupt periodisch nötig.

Wichtig:

> **Low-frequency bedeutet Scheduler-verwaltet, nicht Feature-eigenes freilaufendes `setInterval`.**

## 17. Event-driven statt Polling

Wenn ein Zustand nur auf konkrete Änderungen reagieren muss, ist eventgetriebene Aktivierung vorzuziehen.

Beispiele:

- neue Ware im BuildingStock -> Logistics kann Bedarf/Transport prüfen,
- Baustellenmaterial vollständig -> Builder-Bedarf wird relevant,
- Gebäude pausiert -> Production reagiert,
- Unit wird frei -> Workforce kann passende wartende Arbeit berücksichtigen,
- Tier entfernt -> betroffene Jagdarbeit wird invalidiert,
- WorkArea geändert -> Production validiert Zielbezug,
- SaveRestoreCompleted -> Renderer/UI/Guidance bauen Views neu auf.

Polling bleibt nur dort zulässig, wo kontinuierlicher Zeitfortschritt tatsächlich fachlich notwendig ist.

## 18. Kontinuierlich tickende Systeme

Typische Systeme mit legitimem regelmäßigem Fortschritt:

- Unit-Bewegung,
- Baufortschritt während realer Arbeit,
- Produktions-/Arbeitsfortschritt während aktiver Arbeit,
- Tierbewegung,
- zeitabhängige Wear-/Decay-Effekte,
- ausdrücklich zeitbasierte Economy-Regeln.

Auch diese Systeme laufen unter dem zentralen Scheduler und besitzen keine unabhängige Clock.

## 19. Nicht kontinuierlich pollende Systeme

Folgende Bereiche sollen im Zielmodell nicht ohne Anlass permanent die gesamte Welt durchsuchen:

- JobEngine nach unveränderten ungültigen Jobs,
- Workforce nach bereits gebundenen Units,
- Construction nach Builder-Ankunft, wenn Arrival-Event/State vorhanden ist,
- Logistics nach unveränderten vollständig gedeckten Bedarfen,
- Production nach pausierten Gebäuden ohne Zustandsänderung,
- Guidance nach allen möglichen Tutorialbedingungen,
- UI nach allen Runtime-Collections,
- Inspector nach Business-Korrekturen.

Sie reagieren bevorzugt auf Dirty-Flags, Events, fällige Jobs oder gezielte Queries.

## 20. Backoff ist Scheduler-Zeit, kein eigener Timer

Retry/Backoff aus S2D-02C/E wird als planbare Fälligkeit betrachtet.

Ein Job kann fachlich besitzen:

- `retryNotBefore`,
- Backoff-Kategorie,
- relevanten Invalidation-/World-Trigger.

Der zentrale Scheduler berücksichtigt ihn erst wieder, wenn:

- seine Fälligkeit erreicht ist,
- oder ein relevanter Event/World-Change eine frühere Neubewertung rechtfertigt.

Dadurch entsteht kein eigener Timeout/Interval pro Job.

Die konkreten Zeitwerte werden später festgelegt.

## 21. Keine Timer pro Unit/Job/Gebäude

Die Zielarchitektur vermeidet tausende eigenständige JavaScript-Timer.

Nicht zulässig als Dauerarchitektur:

- `setInterval` pro Unit,
- `setTimeout`-Ketten pro Job als primäre Schedulerlogik,
- eigener Production-Timer je Gebäude,
- eigener Tax-Timer je Haus,
- eigener Retry-Timer je Navigation-Fail.

Zeitpunkte werden zentral über Simulationszeit/Fälligkeiten verwaltet.

Lokale Animationstimer im reinen Rendering sind davon getrennt, solange sie keinen Gameplay-State verändern.

## 22. Historische Intervalle – Migrationsregel

Die vorhandene Runtime besitzt historisch mehrere parallele Timer-/Polling-Schichten, unter anderem für:

- GameTick,
- Builder-/Pause-Korrekturen,
- Runtime-Guards,
- Resident-Workforce,
- Hunter-Verhalten,
- Housing/Taxes,
- Housing-Menü/UI,
- Minimap-/Overlay-Aktualisierung,
- Autosave,
- Path-/Render-Aktualisierung.

S2D-03C legt fest:

1. Gameplay-relevante Timer werden schrittweise in Scheduler-Phasen oder Eventreaktionen überführt.
2. UI-/Render-Timer dürfen getrennt bleiben, wenn sie ausschließlich Darstellung betreffen.
3. Autosave darf als Scheduler-/Lifecycle-Aufgabe bestehen, besitzt aber keine Gameplay-Ownership.
4. Temporäre Legacy-Timer dürfen während Migration noch existieren, müssen aber einen dokumentierten Removal Point besitzen.
5. Kein neuer Feature-Timer wird als bequemer Ersatz für fehlende Architektur eingeführt.

## 23. Pause der Simulation

Eine Spielpause stoppt den fachlichen Simulationsfortschritt kontrolliert.

Während Pause:

- Units bewegen sich nicht fachlich weiter,
- Produktions- und Baufortschritt steht,
- zeitbasierte Economy schreitet nicht fort,
- Backoff-/Simulationstermine laufen nicht unbemerkt weiter,
- Render/UI dürfen weiterhin reagieren und darstellen,
- Menüs/Inspector dürfen lesbar bleiben.

Realzeit und Simulationszeit werden damit klar getrennt.

## 24. Gebäude-Pause vs. Spielpause

Eine Produktionsgebäude-Pause ist kein Anhalten der gesamten Simulation.

Sie betrifft nur den zuständigen Domain-Ablauf:

- kein neuer Produktionszyklus,
- laufender Zyklus sicher abschließen/stoppen gemäß S2D-02,
- fertige Ware bleibt transportierbar,
- Units, Logistik und restliche Siedlung laufen normal weiter.

Die zentrale Schedulerzeit läuft weiter.

## 25. Save / Continue und Scheduler

SaveGame darf keinen zweiten Zeit-Owner erzeugen.

Snapshot enthält nur die für fachliche Rekonstruktion notwendige Zeitinformation, z. B.:

- Simulationszeit bzw. relevante Zeitmarken,
- fällige dauerhafte Domain-Zustände,
- Backoff-/Retry-Fälligkeit soweit notwendig,
- laufende fachliche Progresswerte.

Nicht zwingend persistiert werden müssen flüchtige technische Details wie:

- aktueller Frame,
- temporäre Scheduler-Iteration,
- interne Queue-Position,
- gecachte Navigationsergebnisse,
- Render-Timer.

Nach Continue werden technische Schedulerstrukturen kontrolliert neu aufgebaut.

## 26. Autosave

Autosave ist eine Lifecycle-/Persistence-Aufgabe.

Es darf:

- zu einem sicheren Snapshot-Zeitpunkt ausgelöst werden,
- Owner-Snapshots abfragen,
- serialisieren/speichern.

Es darf nicht:

- Gameplay-State direkt korrigieren,
- fremde Live-Objekte als zweiten Zustand halten,
- während einer halbfertigen Cross-System-Transaktion einen inkonsistenten Snapshot erzwingen.

## 27. Simulation Step und Transaktionsgrenzen

Nicht jede fachliche Aktion muss komplett innerhalb eines einzigen Tick abgeschlossen werden.

Aber innerhalb eines Steps dürfen keine sichtbaren halbfertigen Ownership-Übergänge zurückbleiben.

Beispiel Pickup:

- Quellreservation prüfen,
- Ware aus Quelle entfernen,
- Ware Unit zuweisen,
- Assignmentphase aktualisieren,
- erst danach `GoodsPickedUp` veröffentlichen.

Ein anderer Consumer darf nicht zwischen diesen Teiloperationen eine fachlich unmögliche Doppel-/Null-Ware als gültigen Zustand beobachten.

Die technische Transaktionsmechanik wird später konkretisiert.

## 28. Deterministische Reihenfolge

Bei gleichem Ausgangszustand soll die Scheduler-Reihenfolge reproduzierbar sein.

Insbesondere:

- keine zufällige Abhängigkeit davon, welcher `setInterval` zuerst feuert,
- kein unterschiedlicher Bau-/Transportausgang allein durch Render-FPS,
- keine doppelte Jobvergabe durch konkurrierende Workforce-Schleifen,
- keine wirtschaftliche Mutation durch UI-Refresh-Timing.

Zufall darf als bewusstes Gameplay-Element existieren, muss aber von Scheduler-Rennen getrennt sein.

## 29. Arbeit pro Tick begrenzen

Zentralisierung bedeutet nicht, dass in jedem Tick alle Units, Jobs und Weltobjekte vollständig gescannt werden müssen.

Zielprinzipien:

- Dirty-/Event-basierte Aktivierung,
- fällige statt alle Jobs,
- aktive statt alle Assignments,
- räumliche/Owner-spezifische Queries,
- Budgetierung teurer Arbeit,
- Caches nur als ableitbare Performance-Hilfe, nicht als zweiter State.

Damit soll der zentrale Scheduler die Performance verbessern, nicht einen neuen monolithischen Vollscan erzeugen.

## 30. Navigation und Performance

Die historische A*-Fail-Problematik zeigt, dass zeitliche Ownership Teil der Performancearchitektur ist.

Verbindlich:

- Navigation nur bei fachlichem Bedarf,
- Vorab-Reachability soweit sinnvoll,
- kein sofortiger Retry desselben unveränderten Fehlschlags,
- Backoff/Fälligkeit zentral,
- Weltänderungen dürfen gezielt Jobs/Navigation invalidieren,
- keine parallelen Guards, die dieselbe Route unabhängig erneut anfordern.

S2D-03C ersetzt A* nicht; es verhindert die bekannte zeitliche Fail-Schleife architektonisch.

## 31. Path/Wear Timing

Unit-Bewegung meldet lokale Nutzung an PathSystem.

PathSystem aggregiert Wear gameplayseitig.

Die visuelle Aktualisierung kann langsamer erfolgen:

`Movement -> Wear update -> Dirty region -> periodischer/cache-basierter Render update`

Damit muss nicht jeder einzelne Schritt sofort ein neues permanentes Grafikobjekt erzeugen.

Gameplay-Wear und visuelles Re-Bake dürfen unterschiedliche Updatefrequenzen besitzen, solange die visuelle Darstellung aus dem autoritativen Wear-State abgeleitet bleibt.

## 32. Tiere

Tierbewegung läuft schedulerkontrolliert.

Nicht jedes Tier benötigt einen eigenen JavaScript-Timer.

Hunting reagiert auf Animal-State und gültige Ziele über definierte Owner-Verträge.

Wird ein Tier entfernt/ungültig, wird betroffene Arbeit invalidiert; ein Hunter-Feature-Timer darf das nicht separat korrigieren müssen.

## 33. Economy / Taxes Timing

Zeitbasierte Gold-/Steuerregeln dürfen langsamere Fälligkeiten besitzen als Unit-Bewegung.

Sie laufen dennoch unter derselben Simulationszeit.

Damit gilt:

- Spielpause stoppt Steuerfortschritt,
- Save/Continue kann Zeitmarken konsistent rekonstruieren,
- Häuser besitzen keine unabhängigen Realzeitintervalle,
- Goldmutation bleibt beim Economy-/Gold-Owner.

Der bisherige Testwert ist keine Architekturkonstante.

## 34. UI, Guidance und Inspector

### UI

UI darf per Render-/UI-Zyklus aktualisieren, verändert aber Gameplay nur über Commands.

### Guidance

Guidance ist primär eventgetrieben und braucht keine permanente Vollweltprüfung.

### Inspector

Inspector darf Snapshots in einer geeigneten Diagnosefrequenz lesen, aber:

- keine eigene Gameplay-Schleife besitzen,
- keine States im Hintergrund reparieren,
- keine produktive Schedulerphase ersetzen.

Diagnosepolling muss abschaltbar sein, ohne Gameplay zu ändern.

## 35. Scheduler-Registrierung

Runtime-Systeme werden langfristig explizit beim Scheduler registriert bzw. durch einen zentralen Lifecycle gestartet.

Ein System muss erkennen lassen:

- in welcher Phase es arbeitet,
- ob es kontinuierlich, fälligkeitsbasiert oder eventgetrieben ist,
- welche Inputs es liest,
- welchen eigenen State es verändern darf,
- welche Events es anschließend emittiert.

Versteckte Selbststarts beim Laden einer Feature-Datei sind keine Zielarchitektur.

## 36. Boot und Shutdown

Boot/Lifecycle startet Scheduler und Runtime-Systeme in definierter Reihenfolge.

Shutdown/Neustart/Load müssen:

- laufende Schedulerarbeit kontrolliert stoppen,
- keine alten Intervalle zurücklassen,
- Event-Subscriptions bereinigen,
- keine doppelt registrierten Systeme erzeugen.

Ein Continue darf nicht versehentlich eine zweite Workforce-/Tax-/Hunter-Schleife neben der alten starten.

## 37. Fehlerisolation

Ein Fehler in einem System darf nicht stillschweigend dazu führen, dass derselbe Tick mehrfach oder in anderer Reihenfolge weiterläuft.

Ziel ist:

- Fehler klar erfassen,
- betroffenen Owner/Step diagnostizieren,
- keine automatische Fremdstate-Reparatur durch Guards,
- Inspector/Telemetry kann Fehler sehen,
- Recovery folgt fachlichen Regeln aus S2D-02E.

Die konkrete Exception-Strategie bleibt offen.

## 38. Performance-Messung

Der Scheduler soll später pro Phase/System messbar sein.

Mindestens sinnvoll:

- Step-Dauer,
- Dauer pro Phase,
- Dauer teurer Systeme,
- aktive/fällige Jobs,
- Navigation Calls/Failrate,
- Unit-Update-Menge,
- Maintenance-Kosten,
- Save-Snapshot-Kosten.

Diese Messung gehört in Runtime-Diagnose/Inspector, nicht in Business-Logic.

## 39. Keine Architektur durch Guard-Timer

Temporäre Guards können während Migration erlaubt sein, aber nur wenn dokumentiert ist:

- welches Legacy-Problem sie abfangen,
- welcher Zielowner sie ersetzt,
- wann sie entfernt werden,
- dass sie keinen neuen dauerhaften State besitzen.

Ein Guard mit eigenem 50/100/200-ms-Timer ist niemals der endgültige Owner einer Gameplayregel.

## 40. Scheduler-Invarianten

Für die Zielarchitektur gelten verbindlich:

1. Eine autoritative Gameplay-Simulationszeit.
2. Ein zentral koordinierter Scheduler/GameTick.
3. Rendering ist von Simulation getrennt.
4. Runtime-Owner besitzen keine konkurrierenden unabhängigen Gameplay-Clocks.
5. Gameplay-`setInterval` ist nicht die normale Dauerarchitektur.
6. Eventgetriebene Reaktion wird gegenüber Polling bevorzugt.
7. Kontinuierliche Systeme werden zentral getickt.
8. Seltene Aufgaben werden zentral fälligkeitsbasiert geplant.
9. Backoff erzeugt keinen eigenen Timer pro Job.
10. Keine Timer pro Unit/Job/Gebäude als Kernmodell.
11. Assignment/Arrival/Work bleiben zeitlich getrennte Phasen.
12. Kritische Warenübergänge sind innerhalb ihrer fachlichen Transaktionsgrenze konsistent.
13. Spielpause stoppt Simulationszeit, nicht zwingend UI/Rendering.
14. Gebäude-Pause stoppt nur die zuständige Domainaktivität.
15. SaveGame besitzt keine eigene Clock.
16. Continue baut flüchtige Schedulerstrukturen neu auf.
17. Scheduler-Reihenfolge ist stabil und reproduzierbar.
18. Render-FPS entscheidet nicht über Wirtschaftsergebnisse.
19. Schedulerzentralisierung darf keinen Vollscan-Monolithen erzeugen.
20. Navigation wird nicht aus parallelen Feature-Timern wiederholt angefordert.
21. Legacy-Timer müssen dokumentierte Removal Points erhalten.
22. Inspector/Guidance/UI dürfen keine zweite Simulation bilden.
23. Boot/Continue dürfen keine doppelten Schedulerregistrierungen erzeugen.
24. Scheduler koordiniert Owner, besitzt aber deren Gameplay-State nicht.

## 41. Bewusst offen nach S2D-03C

Noch nicht entschieden werden:

- finale Basistickrate,
- fixed timestep vs. variable timestep im konkreten JavaScript-Design,
- maximale Catch-up-Steps,
- konkrete Millisekundenwerte für Backoff,
- konkrete Frequenzen für Taxes, Wear-Rebake, Autosave und Diagnose,
- konkrete Scheduler-/Queue-Klassen,
- Event-Bus-Implementierung,
- Priority-Queue/Due-Time-Datenstruktur,
- Navigation-Budget pro Step,
- Job-/Unit-Budgetierung,
- Worker-/WebWorker-Nutzung,
- konkrete Pause-/Speed-Control-UI,
- technische Transaktions- und Idempotenzmechanismen.

Diese Punkte dürfen in nachfolgenden S2D-03-Blöcken konkretisiert werden, ohne die hier definierten Zeit-/Ownership-Grenzen zu verletzen.

## 42. S2D-03C Abschluss

S2D-03C ist fachlich/architektonisch abgeschlossen, wenn:

- zentrale Simulationszeit festgelegt ist,
- Simulation und Rendering getrennt sind,
- Update-Phasen definiert sind,
- Tick-/Event-/Fälligkeitsarbeit getrennt ist,
- Legacy-Intervalle als Migrationsbestand eingeordnet sind,
- Backoff ohne Timer-Schleifen abbildbar ist,
- Pause und Save/Continue zeitlich eindeutig sind,
- keine S2D-00/01/02-Regel verletzt wird.

Ergebnis:

**S2D-03C – COMPLETE / 0 BLOCKER**
