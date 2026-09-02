# S2D-03B – Commands, Queries, Events & Cross-System Contracts

Status: **COMPLETE – Bestandteil von S2D-03 TECHNICAL ARCHITECTURE V0.1 DRAFT**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-03-technical-architecture`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02 UNIT & WORKFORCE MODEL V0.1 FROZEN` + `S2D-03A COMPLETE`

> Konsolidierungshinweis: Dieser geschlossene Teilblock wird spätestens beim S2D-03 Freeze-Gate in `S2D-03_TECHNICAL_ARCHITECTURE.md` konsolidiert. Er ist kein zusätzliches dauerhaftes Architektur-Masterdokument.

## 1. Zweck

S2D-03B definiert, wie die in S2D-03A festgelegten Runtime-Owner miteinander kommunizieren dürfen.

Der Block legt fest:

- wie fachliche Zustandsänderungen angefordert werden,
- wie fremde Zustände gelesen werden,
- wie Systeme über abgeschlossene Änderungen informiert werden,
- welche Daten über Systemgrenzen hinweg transportiert werden dürfen,
- welche direkten Zugriffe ausdrücklich verboten sind,
- wie UI, Renderer, SaveGame, Guidance und Inspector dieselben Verträge benutzen,
- wie historische direkte Array-/Map-/Objektzugriffe schrittweise ersetzt werden.

Noch nicht festgelegt werden konkrete JavaScript-Klassennamen, Funktionssignaturen, Event-Bus-Bibliotheken, Promise-/Callback-Details, Serialisierungsformate oder Scheduler-Reihenfolgen.

## 2. Zentrale Vertragsregel

> **Nur der autoritative Owner darf seinen eigenen Gameplay-State direkt verändern.**

Andere Systeme dürfen einen Zustand nur über drei klar getrennte Vertragsarten benutzen:

1. **Command / Operation** – Änderung beim Owner anfordern,
2. **Query / Snapshot** – Zustand lesen, ohne Ownership zu erhalten,
3. **Event** – über eine bereits eingetretene relevante Änderung informiert werden.

Damit gilt:

`Consumer -> Command -> Owner -> State Mutation -> Event -> interessierte Consumer`

und für reine Lesevorgänge:

`Consumer -> Query/Snapshot -> Owner -> read-only Antwort`

Nicht zulässig ist:

`Consumer -> fremdes internes Objekt/Array -> direkte Mutation`

## 3. Commands

Ein Command beschreibt eine gewünschte fachliche Zustandsänderung.

Beispiele fachlicher Commands:

- Gebäude platzieren,
- Gebäude pausieren/fortsetzen,
- Gebäude zum Abriss markieren,
- Baustellenmaterial reservieren bzw. liefern,
- Assignment binden/beenden,
- Ware aufnehmen,
- Ware liefern,
- Produktionszyklus starten/abschließen,
- WorkArea setzen,
- Home-Bindung ändern,
- Debug-Parameter über kontrollierten Inspector-Command ändern.

Ein Command besitzt keine eigene zweite Business-Logik. Er delegiert an den zuständigen Owner, der:

1. Voraussetzungen prüft,
2. die Mutation entweder vollständig akzeptiert oder ablehnt,
3. seine Invarianten schützt,
4. anschließend relevante Events veröffentlicht.

## 4. Command-Grundsätze

Für Commands gelten verbindlich:

1. Der Empfänger ist der zuständige Owner oder ein klarer fachlicher Coordinator.
2. Ein Command darf nicht mehrere Owner heimlich durch direkte Fremdmutation verändern.
3. Cross-System-Abläufe werden als koordinierte Folge definierter Owner-Operationen ausgeführt.
4. Fehler/Ablehnung müssen explizit erkennbar sein; stilles Teilanwenden ist zu vermeiden.
5. Wiederholte oder verspätete Ausführung darf wirtschaftliche Effekte nicht doppeln.
6. Commands dürfen keine internen Collections an den Aufrufer zurückreichen, über die dieser danach mutiert.

Die konkrete technische Form – Methodenaufruf, Command-Objekt, Service-Funktion oder anderer Mechanismus – bleibt offen.

## 5. Queries

Eine Query dient ausschließlich zum Lesen eines Zustands.

Beispiele:

- aktueller HQ-Bestand,
- Baustellenstatus,
- verfügbare Restbedarfe,
- Unit-Verfügbarkeit,
- Jobstatus,
- Produktionszustand,
- lokale BuildingStocks,
- WorkArea,
- Reachability-Ergebnis,
- Animal-/MapResource-Snapshot,
- Path/Wear-Statistik.

Eine Query darf niemals durch bloßes Lesen eine fachliche Zustandsänderung auslösen.

## 6. Read-only Snapshots und Views

Systemgrenzen sollen bevorzugt stabile Read-Modelle/Snapshots liefern statt interne Mutable-Objekte nach außen zu geben.

Ein Snapshot darf enthalten:

- IDs,
- Werte,
- Zustände,
- referenzierte IDs,
- abgeleitete Anzeigeinformationen,
- unveränderliche Listen/Kopien,
- gezielt freigegebene Diagnosefelder.

Ein Snapshot darf nicht bedeuten:

- Consumer erhält direkten Zugriff auf den echten Owner-State,
- Consumer darf intern gespeicherte Arrays sortieren/leeren/ergänzen,
- UI/Renderer/Inspector dürfen durch Objektmutation Gameplay verändern.

## 7. Keine fremden Mutable References

Folgende Muster sind Zielarchitektur-unzulässig:

- `Renderer` erhält echte Building-Objekte und setzt Statusflags,
- `UI` verändert direkt `building.paused`,
- `Production` verändert direkt globalen HQ-Bestand,
- `JobEngine` schreibt direkt Unit-Type oder Unit-Position,
- `Resident-Patch` verändert direkt Joblisten,
- `SaveGame` hält referenzierte Live-Objekte als eigenen Runtime-State,
- `Inspector` verändert Arrays/Maps unmittelbar,
- ein Guard korrigiert fremde Zustände im Hintergrund.

Stattdessen muss ein definierter Command/Owner-Aufruf verwendet werden.

## 8. IDs statt Objektkopplung

Cross-System-Verträge verwenden bevorzugt stabile IDs und fachliche Referenzen statt langfristig geteilte Mutable-Objekte.

Beispiele:

- `buildingId`,
- `unitId`,
- `jobId`,
- `assignmentId`,
- `resourceNodeId`,
- `animalId`,
- `stockLocationId`,
- `workAreaId`.

Ein System darf kurzfristig einen internen Objektverweis innerhalb seines eigenen Owners verwenden. Über Owner-Grenzen hinweg soll jedoch die fachliche Identität über stabile Referenzen laufen.

Das reduziert:

- versteckte Doppel-Ownership,
- veraltete Referenzen nach Abriss/Reload,
- direkte Fremdmutation,
- schwer nachvollziehbare Save/Continue-Probleme.

## 9. Events

Ein Event beschreibt eine fachlich relevante Tatsache, die bereits eingetreten ist.

Beispiele:

- Gebäude wurde platziert,
- Baustellenmaterial wurde geliefert,
- Builder ist angekommen,
- Bau wurde abgeschlossen,
- Produktion wurde pausiert,
- Output wurde erzeugt,
- Ware wurde aufgenommen,
- Ware wurde geliefert,
- Assignment wurde begonnen/beendet,
- Job wurde in Backoff gesetzt,
- Unit ist zuhause angekommen,
- Tier wurde entfernt,
- WorkArea wurde geändert,
- SaveGame wurde erfolgreich wiederhergestellt.

Events sind keine versteckten Commands.

## 10. Event-Regeln

Für Events gelten:

1. Event meldet einen bereits gültig vollzogenen Zustand.
2. Publisher bleibt Owner seiner Mutation.
3. Listener dürfen daraus eigene zuständige Reaktionen ableiten.
4. Listener dürfen den Publisher-State nicht direkt zurückmutieren.
5. Event-Verarbeitung darf nicht Voraussetzung dafür sein, dass die ursprüngliche Mutation überhaupt konsistent wird.
6. Kritische wirtschaftliche Transaktionen müssen beim Owner/Coordinator konsistent abgeschlossen sein, bevor das Event ausgesendet wird.
7. Ein Event darf nicht als zweite dauerhafte State-Wahrheit missbraucht werden.

## 11. Commands vs. Events

Die Trennung ist verbindlich:

### Command

`Bitte führe X aus.`

Kann akzeptiert oder abgelehnt werden.

### Event

`X ist passiert.`

Die auslösende Mutation ist bereits gültig abgeschlossen.

Beispiel Transport:

`Logistics -> Pickup-Command -> BuildingStock/Storage Owner überträgt Ware -> Unit/Assignment-Kontext erhält Ware -> Event GoodsPickedUp`

Ein Listener darf `GoodsPickedUp` nicht erst benutzen, um den eigentlichen Quellbestand nachträglich zu korrigieren.

## 12. Query vs. Event

Events sind keine vollständige Datenbank.

Ein Consumer, der aktuellen Zustand benötigt, verwendet eine Query/Snapshot.

Events dienen insbesondere dazu:

- Änderungen effizient zu erkennen,
- UI/Renderer selektiv zu aktualisieren,
- Guidance auszulösen,
- Inspector-Trace zu erzeugen,
- Scheduler/Polling-Aufwand zu reduzieren.

Ein Consumer darf nach einem Event bei Bedarf den aktuellen Owner-Snapshot neu abfragen.

## 13. Cross-System-Transaktionen

Einige fachliche Vorgänge betreffen mehrere Owner.

Beispiele:

- Pickup: Stock -> Unit,
- Delivery: Unit -> Stock/Baustelle,
- Construction Completion: Construction -> Buildings-Lifecycle,
- Bewohnererzeugung: Housing/Building -> Unit,
- Abriss mit laufenden Assignments: Buildings -> Workforce/Logistics/Construction,
- Save Restore: SaveGame -> mehrere Owner.

Solche Abläufe benötigen einen klaren Coordinator oder einen definierten atomaren Übergabevertrag.

Dabei gilt:

> **Ein Coordinator koordiniert Ownership-Übergänge, wird aber nicht selbst zum zweiten Owner der beteiligten Zustände.**

## 14. Warenübergaben als besonders kritischer Vertrag

Für physische Waren ist die S2D-01-Einmaligkeitsregel technisch zu schützen.

### Pickup

Vorher:

`Ware = Quelle`

Nachher:

`Ware = Unit`

### Delivery

Vorher:

`Ware = Unit`

Nachher:

`Ware = Ziel`

Der Übergang muss als ein fachlich zusammenhängender Vorgang behandelt werden.

Unzulässig sind Zwischenzustände, in denen:

- Quelle bereits reduziert ist, Unit aber keine Ware besitzt,
- Unit Ware besitzt, Quelle aber noch dieselbe freie Menge führt,
- Ziel bereits gutgeschrieben ist, Unit aber weiter dieselbe Ware trägt.

Die konkrete technische Atomarität wird später präzisiert.

## 15. Assignment-Vertrag

Job, Workforce und Unit-System müssen über einen eindeutigen Assignment-Vertrag verbunden sein.

Mindestens gilt:

1. Job ist vergabefähig.
2. Workforce wählt genau eine geeignete Unit.
3. Assignment wird eindeutig erzeugt/bestätigt.
4. Unit wird `ASSIGNED` und referenziert dasselbe Assignment.
5. Job referenziert dieselbe Zuweisung bzw. denselben Assignment-Bezug.
6. Ausführung erfolgt über Unit-/Domain-Operationen.
7. Completion/Cancel/Failure beendet beide Seiten kontrolliert.
8. Danach existiert keine einseitige Restbindung.

S2D-03B verbietet damit ausdrücklich zwei getrennte Zuweisungsobjekte, die unabhängig voneinander leben.

## 16. Building-Verträge

Buildings stellt anderen Systemen mindestens fachlich zur Verfügung:

- stabile Building-ID,
- Typ/Definition,
- Position/Footprint,
- Existenzstatus,
- öffentliche Access-/Interaction-Referenzen,
- grundlegenden Lifecycle-Status.

Andere Systeme dürfen Gebäudezustände nicht direkt verändern.

Beispiele:

- Production fordert Pause/Resume über Buildings/Production-Vertrag an,
- Construction meldet Fertigstellung über definierten Übergang,
- Renderer liest Snapshot,
- UI sendet Command,
- SaveGame benutzt Snapshot/Restore-Vertrag.

## 17. Construction-Verträge

Construction darf Bedarf publizieren bzw. abfragbar machen, aber keine Transport-Units direkt steuern.

Zulässiger Fluss:

`Construction Bedarf -> Logistics/Job-System -> Assignment -> Unit -> Delivery -> Construction bestätigt Materialeingang`

Für Builder:

`Construction WAIT_BUILDER -> Builder-Job -> Assignment -> Unit bewegt sich -> Arrival-Operation -> Construction darf BUILDING starten`

Construction darf nicht aus einem bloßen Jobstatus `assigned` auf tatsächliche Ankunft schließen.

## 18. Production-Verträge

Production liest:

- Gebäudezustand,
- WorkArea,
- MapResources/Animals,
- Worker-Verfügbarkeit,
- lokale Output-Kapazität.

Production verändert fremde Owner nur über definierte Operationen.

Output wird ausschließlich über den BuildingStock-Vertrag eingebucht.

Production darf kein Event benutzen, um anschließend direkt einen fremden Stock zu verändern.

## 19. Logistics-Verträge

Logistics darf:

- Bedarfe lesen,
- verfügbare Quellen abfragen,
- Reservationen über den zuständigen Reservierungsvertrag anfordern,
- Transportjobs erzeugen,
- Pickup/Delivery koordinieren,
- Recovery veranlassen.

Logistics darf nicht:

- Stock-Arrays direkt verändern,
- Unit-Type ändern,
- Unit-Position teleportieren,
- Construction-Bestand direkt erhöhen,
- HQ-Bestand direkt gutschreiben.

## 20. Navigation-Vertrag

NavigationService ist der einzige fachliche Zugang zu Reachability/Path-Anfragen.

Andere Systeme dürfen:

- Reachability anfragen,
- Pfad/Route anfragen,
- Ergebnis konsumieren,
- Fehlschlaggrund/Status verwenden.

Sie dürfen nicht:

- eigene konkurrierende A*-Wahrheiten führen,
- intern auf Grid-/Node-Strukturen zugreifen und sie verändern,
- bei jedem Tick ungefiltert denselben fehlgeschlagenen Request neu erzeugen.

Job-/Assignment-Systeme speichern nur den für Backoff/Planung nötigen fachlichen Fehlschlagzustand, nicht eine zweite Navigation.

## 21. SaveGame-Verträge

SaveGame ist Coordinator für Persistenz.

Jeder Owner stellt einen definierten Snapshot bereit und akzeptiert einen definierten Restore-/Rehydrate-Vorgang.

SaveGame darf:

- Owner-Snapshots sammeln,
- Version/Schema koordinieren,
- Restore-Reihenfolge steuern,
- Referenzen nach Restore validieren/re-konstruieren.

SaveGame darf nicht:

- Live-Objekte als zweite Runtime-Wahrheit weiterführen,
- fremde interne Arrays direkt ersetzen, wenn dafür kein Restore-Vertrag existiert,
- eigene Business-Regeln erfinden,
- bei Restore widersprüchliche Doppelzustände erzeugen.

## 22. Renderer-Verträge

Renderer ist reiner Consumer.

Er darf:

- Snapshots/Views lesen,
- Events für Dirty-/Selective-Updates nutzen,
- visuelle Caches besitzen.

Renderer darf nicht:

- Gebäudezustände ändern,
- Warenbestände korrigieren,
- Unit-Aktivität als Gameplay-State setzen,
- Path-Wear besitzen,
- fehlende Gameplay-Transitions durch Render-Callbacks nachholen.

Visuelle Caches sind jederzeit aus Owner-State rekonstruierbar.

## 23. UI-Verträge

UI besitzt keinen Gameplay-State.

UI darf:

- Read-Modelle abfragen,
- ausgewählte Anzeigezustände lokal halten,
- Commands senden,
- Events für Aktualisierung nutzen.

UI darf nicht:

- `paused`, `completed`, `resourceCount`, `population` oder ähnliche Gameplay-Werte direkt verändern,
- interne Building-/Unit-/Job-Objekte mutieren,
- Business-Regeln duplizieren, um Zustände selbst auszurechnen, wenn der Owner sie bereitstellen kann.

## 24. Guidance-Verträge

Guidance hört öffentliche Gameplay-Events und liest bei Bedarf Queries.

Guidance darf:

- eigenen Tutorial-/Hinweisfortschritt speichern,
- Hinweise auslösen,
- Hilfezustand lesen.

Guidance darf nicht:

- Gebäude automatisch fertigstellen,
- Ressourcen verändern,
- Jobs erzeugen,
- Units umtypen,
- Gameplay-State korrigieren.

## 25. Inspector-Verträge

Inspector benutzt dieselben öffentlichen Read-/Command-Grenzen wie andere Consumer, ergänzt um explizit markierte Debug-Verträge.

Er darf:

- Owner-Snapshots anzeigen,
- Event-/Job-/Performance-Traces abonnieren,
- definierte Debug-Commands senden,
- Diagnoseinformationen lesen.

Er darf nicht:

- interne Arrays/Maps direkt manipulieren,
- Gameplay-Patches enthalten,
- produktive Owner ersetzen,
- im deaktivierten Zustand das Spielverhalten verändern.

## 26. Scheduler-Verträge

Der zentrale Scheduler ruft Systeme über definierte Update-/Step-Verträge auf.

Feature-Systeme dürfen nicht dauerhaft eigene autonome Polling-Schleifen starten, wenn derselbe Zweck über Scheduler oder Events abbildbar ist.

Events sollen insbesondere dort Polling ersetzen, wo Änderungen selten und eindeutig sind.

Beispiele:

- UI aktualisiert Baustellenstatus nach Event/Dirty-Signal statt alle 50 ms komplette Listen zu scannen,
- Guidance reagiert auf `building.completed` statt ständig Gebäude zu durchsuchen,
- Job-System reagiert auf neue Bedarfe/Verfügbarkeiten plus kontrollierte Scheduler-Phasen statt ungefilterte Endlossuche.

Exakte Scheduler-Phasen gehören in einen folgenden S2D-03-Unterblock.

## 27. Fehlergrenzen

Ein Consumer darf bei einem fehlgeschlagenen Command nicht versuchen, den Owner-State anschließend selbst zu reparieren.

Stattdessen:

`Command -> Owner lehnt ab/fehlschlägt -> definierter Fehlerstatus -> Consumer reagiert fachlich`

Beispiele:

- Pickup abgelehnt -> Assignment/Logistics behandelt Fehler,
- Delivery abgelehnt -> Recovery,
- Pause abgelehnt -> UI zeigt unveränderten Zustand,
- Assignment-Bindung abgelehnt -> Job bleibt wartend/backoff.

Keine Catch-all-Patches, die fremde Zustände im Hintergrund zurechtrücken.

## 28. Invarianten an Systemgrenzen

Cross-System-Verträge müssen mindestens folgende Invarianten schützen:

1. ein Gameplay-State hat genau einen Owner,
2. Consumer verändern fremden State nicht direkt,
3. Commands fordern Mutation an,
4. Queries lesen ohne Mutation,
5. Events berichten bereits eingetretene Tatsachen,
6. Events sind keine versteckten Commands,
7. fremde Mutable-References werden nicht als öffentliche API benutzt,
8. stabile IDs verbinden Systeme,
9. Cross-System-Transaktionen besitzen einen klaren Coordinator,
10. Coordinator wird nicht zweiter Owner,
11. Warenübergänge erhalten die Einmaligkeitsregel,
12. Assignment besitzt eine eindeutige gemeinsame Wahrheit,
13. SaveGame benutzt Snapshot/Restore-Verträge,
14. Renderer/UI/Guidance/Inspector besitzen keine Produktivlogik,
15. Navigation wird nur über NavigationService angefragt,
16. Fehler werden beim zuständigen Owner/Coordinator behandelt, nicht durch Fremdpatches,
17. Events/Polling dürfen keine zweite Runtime-Wahrheit erzeugen,
18. technische Caches sind aus Owner-State rekonstruierbar.

## 29. Historische Migrationsregeln

Beim späteren Umbau gilt für bestehende direkte Zugriffe:

1. direkten Fremdzugriff identifizieren,
2. zuständigen Ziel-Owner bestimmen,
3. benötigte Query/Command/Event-Grenze definieren,
4. Consumer auf diese Grenze umstellen,
5. alten Direktzugriff entfernen,
6. temporären Adapter nur verwenden, wenn er keine zweite Wahrheit erzeugt,
7. Adapter mit Removal-Bedingung dokumentieren.

Nicht zulässig ist, alte Direktzugriffe dauerhaft nur mit weiteren Guards zu ummanteln.

## 30. Bewusst noch offen

Nach S2D-03B bleiben insbesondere offen:

- konkrete API-/Methodennamen,
- konkrete Eventnamen und Payload-Schemata,
- EventBus-Implementierung,
- synchrone vs. asynchrone Command-Ausführung,
- konkrete atomare Übergabetechnik bei Waren,
- konkreter Assignment-Datenträger,
- konkrete Restore-Reihenfolge,
- Scheduler-Phasen und Tickfrequenzen,
- konkrete Cache-/Dirty-Strategien,
- Threading/Worker-Nutzung,
- Migrationsreihenfolge der Legacy-Module.

Diese Punkte werden in folgenden S2D-03-Blöcken geschlossen.

## 31. Abschluss S2D-03B

S2D-03B ist fachlich vollständig, wenn:

- Mutation nur beim jeweiligen Owner erfolgt,
- Commands, Queries und Events klar getrennt sind,
- Cross-System-Transaktionen einen Coordinator besitzen,
- keine öffentliche API auf direkte fremde Mutable-State-Manipulation angewiesen ist,
- SaveGame/UI/Renderer/Guidance/Inspector klar als Consumer/Coordinator begrenzt sind,
- Navigation und Assignment definierte Systemgrenzen besitzen,
- die spätere Migration historischer Direktzugriffe ohne neue Doppel-Owner möglich ist.

Ergebnis:

**S2D-03B – COMPLETE / 0 BLOCKER**
