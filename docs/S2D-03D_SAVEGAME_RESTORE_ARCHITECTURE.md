# S2D-03D – SaveGame Snapshot, Restore & Runtime Reconstruction Architecture

Status: **COMPLETE – Bestandteil von S2D-03 TECHNICAL ARCHITECTURE V0.1 DRAFT**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-03-technical-architecture`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02 UNIT & WORKFORCE MODEL V0.1 FROZEN` + `S2D-03A/B/C COMPLETE`

> Konsolidierungshinweis: Dieser geschlossene Teilblock wird spätestens beim S2D-03 Freeze-Gate in `S2D-03_TECHNICAL_ARCHITECTURE.md` konsolidiert. Er ist kein zusätzliches dauerhaftes Architektur-Masterdokument.

## 1. Zweck

S2D-03D definiert die technische Zielarchitektur für SaveGame, Continue, Restore und Runtime-Rekonstruktion.

Der Block legt fest:

- welcher autoritative Owner welche fachliche Wahrheit persistiert,
- welche Zustände ausdrücklich nicht als Live-Runtime-Strukturen gespeichert werden,
- wie stabile IDs und Referenzen über Save/Continue erhalten bleiben,
- wie laufende Assignments, Reservationen und getragene Waren konsistent behandelt werden,
- wie Jobs und Backoff-Zustände wiederhergestellt oder rekonstruiert werden,
- in welcher Reihenfolge Owner wiederhergestellt werden,
- wann Cross-System-Referenzen validiert und rekonstruiert werden,
- wann der zentrale Scheduler nach Continue wieder starten darf,
- wie historische Continue-Probleme durch klare Ownership statt zusätzliche Restore-Patches vermieden werden.

Noch nicht festgelegt werden konkrete JSON-Feldnamen, Storage-Technologie, Kompression, Versionsmigrationscode, Dateigröße, konkrete Autosave-Intervalle oder endgültige JavaScript-Klassen.

## 2. Zentrale SaveGame-Regel

> **SaveGame speichert die autoritative fachliche Wahrheit der Owner – nicht die zufällige Form ihrer aktuellen Runtime-Implementierung.**

Damit gilt:

`Owner State -> Snapshot Contract -> SaveGame Document`

und beim Laden:

`SaveGame Document -> Validation/Migration -> Owner Restore -> Cross-Reference Reconstruction -> Runtime Reconstruction -> Validation -> Scheduler Start`

Nicht zulässig ist:

`Live Objects / Timer / Renderer Cache / A*-State / Event Queue -> serialisieren -> beim Continue unverändert weiterlaufen lassen`

SaveGame ist damit **Koordinator und Persistenzformat**, aber kein zweiter Runtime-Owner.

## 3. Persistente Wahrheit vs. transiente Runtime

Jeder Zustand wird technisch einer von drei Kategorien zugeordnet.

### 3.1 Persistent Authoritative State

Muss gespeichert werden, weil er die fachliche Welt bestimmt.

Beispiele:

- Gebäudeinstanzen und stabile IDs,
- Bauzustand und Baufortschritt,
- physische Warenbestände und deren tatsächlicher Ort,
- Bewohner/Units mit stabilen IDs,
- Home-Bindung,
- Spezialisierung/Capabilities,
- tatsächliche Unit-Position,
- relevante Weltressourcen und Tiere,
- WorkAreas,
- Gold/Wirtschaftswerte,
- Path/Wear-Werte, sofern sie sichtbarer dauerhafter Weltzustand sind,
- Guidance-Fortschritt.

### 3.2 Persistent Coordinated Runtime State

Muss nur dann gespeichert werden, wenn reine Rekonstruktion die Wirtschaft oder Unit-Identität verfälschen könnte.

Beispiele:

- laufendes Assignment mit fachlich relevantem Fortschritt,
- Unit trägt physische Ware,
- gültige Reservationen,
- sicherer Produktions-/Bau-Arbeitszustand,
- Recovery-Kontext einer Unit,
- relevanter Backoff-Grund bzw. logisch verbleibende Wartezeit, falls andernfalls sofort dieselbe Fail-Schleife entstehen würde.

Diese Zustände müssen nicht zwingend 1:1 als interne Runtime-Objekte persistiert werden. Persistiert wird nur die fachlich notwendige Rekonstruktionsinformation.

### 3.3 Transient Reconstructable Runtime State

Wird nicht als autoritative SaveGame-Wahrheit gespeichert.

Beispiele:

- A*-Open-/Closed-Listen,
- fertige Pathfinding-Pfade als interne Cache-Struktur,
- Renderer-Objekte,
- Sprite-/Animation-Handles,
- Event-Queues,
- Dirty-Flags, sofern aus Owner-State ableitbar,
- Performance-Messwerte,
- Inspector-Ansichten,
- Scheduler-Registrierungen,
- JavaScript-Timer-Handles,
- Render-Caches/OffscreenCanvas,
- abgeleitete Population-Zähler,
- Query-/View-Caches.

Diese Strukturen werden nach Restore neu aufgebaut.

## 4. Snapshot-Verantwortung liegt beim Owner

Jeder autoritative Owner stellt seinen eigenen fachlichen Snapshot bereit.

SaveGame darf Owner nicht dadurch serialisieren, dass es deren interne Live-Objekte beliebig durchläuft und kopiert.

Zielvertrag fachlich:

`Owner.snapshot() -> stabile persistierbare Daten`

und:

`Owner.restore(snapshotPart) -> eigener fachlicher State`

Die konkreten Methodennamen bleiben offen.

Wichtig ist:

- Owner bestimmt, welche Daten seine Wahrheit bilden,
- SaveGame kennt nicht unnötig interne Datenstrukturen,
- Restore darf keine fremde Owner-State-Mutation über Hintertüren durchführen,
- neue interne Implementierung darf möglich sein, ohne alte SaveGames an interne Objektformen zu koppeln.

## 5. Stabilität über IDs

Persistente Beziehungen verwenden stabile fachliche IDs.

Beispiele:

- `buildingId`,
- `unitId`,
- `jobId` oder rekonstruierbare Demand-ID,
- `assignmentId`, falls Assignment persistiert wird,
- `resourceNodeId`,
- `animalId`,
- `workAreaId`,
- `stockLocationId`.

Keine persistente Cross-System-Beziehung darf darauf vertrauen, dass derselbe JavaScript-Objektverweis nach Continue wieder existiert.

Restore baut Referenzen aus IDs neu auf.

## 6. Gebäude

BuildingStore persistiert mindestens die fachlich notwendigen Gebäudeinformationen:

- stabile Building-ID,
- Gebäudetyp/Definition,
- Position,
- Footprint/Orientierung soweit relevant,
- Existenzzustand,
- grundlegender Lifecycle-Bezug,
- persistente Spielerparameter wie Pause, sofern Owner dort liegt.

Domänenspezifische Zustände werden nicht doppelt im Building-Snapshot gespeichert, wenn ihr Owner ein anderes System ist.

Beispiel:

- Construction speichert Baufortschritt,
- BuildingStock speichert lokalen Warenbestand,
- Housing/Units speichert Bewohner/Home-Bezug.

## 7. Construction

ConstructionSystem persistiert fachlich mindestens:

- Baustellenidentität/Building-Bezug,
- Sollmaterialien,
- bereits physisch gelieferte Materialien,
- Baufortschritt,
- relevanten Baustellenstatus,
- ob Builder fachlich bereits angekommen/aktiv war, falls dies für einen konsistenten Fortsetzungszustand notwendig ist.

Nicht als zweite Wahrheit gespeichert werden dürfen dieselben Materialmengen noch einmal in SaveGame-eigenen Baustellenlisten.

Nach Restore muss Construction aus gelieferten Materialien und Baufortschritt einen gültigen Zustand rekonstruieren können.

## 8. BuildingStock und zentrale Lager

Jede physische Ware muss auch im SaveGame genau einen autoritativen Ort besitzen.

Mögliche persistente Orte:

- Weltquelle,
- lokaler BuildingStock,
- HQ/Lager,
- Unit-Inventar während Transport/Recovery,
- Baustellenbestand.

Verbindliche Save-Invariante:

> **Eine Warenmenge darf im Snapshot nicht gleichzeitig an Quelle und Unit oder an Unit und Ziel als vorhandener Bestand erscheinen.**

Reservationen ändern den Warenort nicht.

## 9. Units

UnitStore persistiert für reale Personen mindestens:

- stabile Unit-ID,
- tatsächliche Weltposition bzw. eindeutig rekonstruierbare Position,
- Home-Bindung oder definierter fehlender/Übergangsstatus,
- dauerhafte Spezialisierung/Capabilities,
- relevante Availability-/Activity-Information nur soweit für konsistente Rekonstruktion nötig,
- fachlich relevante Assignment-Verknüpfung,
- getragene physische Ware,
- Recovery-Kontext, falls vorhanden.

Nicht gespeichert wird eine temporäre Identitätsmutation wie `resident -> carrier`, da sie in der Zielarchitektur nicht existiert.

## 10. Getragene Waren sind persistenter Wirtschaftsstate

Eine Unit, die beim Speichern Ware trägt, besitzt diese Ware fachlich real.

Deshalb muss der Snapshot eindeutig enthalten:

- welche Unit die Ware trägt,
- welche Ware/Menge getragen wird,
- ursprünglicher Transport-/Recovery-Kontext soweit notwendig,
- gültiges Ziel oder rekonstruierbare Recovery-Absicht.

Beim Continue gilt:

`Ware bleibt Unit -> Transport/Recovery wird rekonstruiert -> erst reale Delivery ändert Warenort`

Unzulässig:

- Ware beim Laden zusätzlich zurück in Quelle buchen,
- Ware gleichzeitig im Zielbestand erzeugen,
- Unit ohne gültigen Recovery-/Assignment-Kontext freigeben.

## 11. Assignments

Assignments werden nicht pauschal entweder vollständig gespeichert oder vollständig verworfen.

Die Regel lautet:

> **Persistiert wird so viel Assignment-Wahrheit, wie nötig ist, um wirtschaftlich und personell denselben gültigen Zustand wiederherzustellen – nicht mehr.**

### Rekonstruierbar ohne wirtschaftlichen Effekt

Beispiel:

Eine freie Unit war auf einem Freizeitweg.

Nach Continue darf Freizeitroute neu geplant werden.

### Fachlich relevant

Beispiel:

Eine Unit hat bereits Ware aufgenommen.

Hier muss ein Transport-/Recovery-Kontext erhalten bleiben.

### Builder/Production

Bei laufender Arbeit muss der Snapshot so viel enthalten, dass nicht fälschlich Arbeit vor Arrival entsteht, Fortschritt doppelt gebucht wird oder der Worker als frei erscheint, obwohl ein gültiger fachlicher Arbeitskontext fortgesetzt werden soll.

Die exakte Persistenzgranularität je Assignment-Art wird in der späteren Implementierung aus diesen Regeln abgeleitet.

## 12. JobEngine und Jobs

Jobs sind teilweise aus Owner-State rekonstruierbarer Bedarf.

Beispiele:

- fehlendes Baustellenmaterial,
- vollständig versorgte Baustelle benötigt Builder,
- fertige lokale Ware benötigt Transport,
- Produktionsgebäude benötigt geeignete Arbeit.

Solche Jobs sollen bevorzugt aus der restaurierten fachlichen Welt neu erzeugt werden, statt alle internen Queue-/Heap-/Pointer-Strukturen zu speichern.

Persistiert werden müssen nur Jobzustände, deren Verlust zu inkonsistentem Verhalten führen würde, insbesondere:

- aktive Bindung an ein persistiertes Assignment,
- Reservationen,
- relevanter Recovery-Kontext,
- gegebenenfalls Backoff-/Failure-Zustand.

## 13. Backoff

Backoff darf nach Continue weder:

- vollständig verloren gehen und sofort dieselbe Fail-Schleife wieder auslösen,
- noch als ewiger alter Timerzustand hängen bleiben.

Zielregel:

- Backoff wird relativ zur Simulationszeit verstanden,
- gespeichert wird nur fachlich relevante Restinformation,
- reale Timer-Handles werden nie persistiert,
- nach Restore wird Fälligkeit gegen die neue Scheduler-Simulationszeit rekonstruiert,
- strukturell ungültige Jobs werden beim Restore verworfen statt nur erneut in Backoff gelegt.

Exakte Zeitwerte bleiben offen.

## 14. Reservationen

Reservationen müssen gemeinsam mit ihrem realen Warenort und Bedarf validiert werden.

Beim Restore gilt für jede Reservation:

1. Ware existiert noch am erwarteten Owner-Ort,
2. reservierte Menge ist vorhanden,
3. Bedarf existiert noch,
4. zugehöriges Assignment/Job ist gültig oder rekonstruierbar,
5. dieselbe Menge ist nicht mehrfach reserviert.

Ungültige Reservationen werden kontrolliert freigegeben bzw. aus der rekonstruierten Welt nicht wieder erzeugt.

SaveGame darf keine verwaisten Reservationen konservieren.

## 15. Navigation

NavigationService persistiert keine internen Suchzustände.

Nach Continue werden neu aufgebaut:

- Navigation-Caches,
- Pfade,
- Reachability-Caches,
- A*-temporäre Daten,
- Bewegungsintents, soweit sie nicht fachlich persistiert werden müssen.

Units starten von ihrer restaurierten tatsächlichen Position.

Wenn ein laufendes Assignment fortgeführt wird, wird sein nächstes Ziel aus Assignment-/Domain-State neu bestimmt und die Route neu berechnet.

Dadurch können alte ungültige Wege nicht als SaveGame-Altlast weiterleben.

## 16. Path/Wear

Da Trampelpfad-Wear sichtbarer dauerhafter Weltzustand ist, muss der fachliche Wear-State gespeichert werden, sofern er beim Continue erhalten bleiben soll.

Nicht gespeichert werden müssen:

- einzelne Render-Stempelobjekte,
- OffscreenCanvas-Bitmap als notwendige Gameplay-Wahrheit,
- Dirty-Render-Queues.

Nach Restore:

`Wear-State -> PathRenderer Cache/Re-Bake`

Damit verschwinden die Pfade nicht mehr nur deshalb, weil ihre Darstellung transient war.

## 17. MapResources und Tiere

Persistiert werden relevante Veränderungen der Welt:

- verbliebene/verbrauchte Ressourcenmengen bzw. Zustände,
- entfernte/erschöpfte Quellen,
- persistente Tiere und deren notwendiger Weltzustand entsprechend späterer Animal-Architektur.

Nicht gespeichert werden müssen rein visuelle Animationsphasen.

Produktions-/Hunter-Systeme rekonstruieren nach Restore ihre Arbeitsziele anhand der autoritativen Weltzustände.

## 18. Housing und Population

Persistiert werden:

- reale Units,
- Home-Bindungen,
- notwendige Housing-Zuordnungen.

Population wird danach erneut abgeleitet.

Ein gespeicherter Population-Counter darf nicht als unabhängige zweite Wahrheit benutzt werden.

Bei Inkonsistenz gilt die reale restaurierte Bewohnerzahl als fachliche Grundlage.

## 19. Economy / Gold

Gold ist persistenter Wirtschaftswert und wird beim zuständigen Owner gespeichert.

Nicht wiederhergestellt werden historische autonome Tax-Timer.

Stattdessen wird nach Restore die Economy in den zentralen Scheduler eingebunden und die nächste relevante Fälligkeit kontrolliert rekonstruiert.

## 20. Guidance

GuidanceSystem persistiert ausschließlich seinen eigenen Fortschritt, z. B.:

- ungesehen,
- gezeigt,
- abgeschlossen,
- gegebenenfalls bewusst zurückgesetzt.

Guidance speichert keine Gameplay-Zustände als zweite Wahrheit.

## 21. SaveGame-Metadaten

Das SaveGame benötigt fachlich Metadaten für kontrollierte Validierung und spätere Migration.

Mindestens konzeptionell:

- SaveGame-Schema-/Formatversion,
- Produkt-/Architekturversion soweit nötig,
- Save-Zeitpunkt bzw. Simulationszeitbezug,
- Map-/Scenario-Identität,
- optional Integritäts-/Validierungsinformationen.

Konkrete Feldnamen bleiben offen.

## 22. Snapshot-Erzeugung

Ein Save darf keinen fachlich zerrissenen Zwischenzustand erzeugen.

Der Snapshot wird deshalb an einem kontrollierten Safe Point erzeugt.

Zielablauf:

1. neue externe Commands kurz nicht mitten in laufende Snapshot-Erfassung einmischen,
2. aktueller Simulationsstep erreicht definierten konsistenten Punkt,
3. jeder Owner liefert seinen Snapshot,
4. Cross-System-Referenzen werden validiert,
5. Dokument wird serialisiert/gespeichert,
6. Simulation läuft weiter.

Ob dafür ein vollständiger Tick pausiert, Copy-on-write oder eine andere Technik genutzt wird, bleibt offen.

Verbindlich ist nur: Save darf keine halbfertige fachliche Mutation serialisieren.

## 23. Restore-Grundsatz

Restore ist kein normaler laufender Gameplay-Tick.

Während Restore:

- Scheduler steht,
- normale Jobvergabe steht,
- Produktion/Bau schreiten nicht fort,
- keine autonomen Feature-Timer laufen,
- Renderer darf Lade-/Zwischenzustand darstellen, aber nichts mutieren.

Erst nach vollständigem Restore + Validierung startet die Simulation.

## 24. Restore-Reihenfolge

Die Zielreihenfolge ist fachlich:

### Phase R1 – Save-Dokument laden und validieren

- Syntax/Schema prüfen,
- Version erkennen,
- nötige Migration vorbereiten,
- Map/Definitionen verfügbar machen.

### Phase R2 – fundamentale Welt-/Definitionsebene bereitstellen

- Map-Grundlage,
- statische Definitionen,
- IDs/Registry-Grundlagen,
- keine Simulation starten.

### Phase R3 – primäre Owner restaurieren

Zuerst Zustände, auf die andere Systeme referenzieren:

- Buildings,
- MapResources,
- MapAnimals,
- WorkAreas,
- Storage/ResourceStore,
- BuildingStock,
- Construction,
- Units/Housing,
- Economy,
- Path/Wear,
- Guidance.

Die genaue Reihenfolge zwischen unabhängigen Ownern darf implementierungsbedingt variieren; referenzierte Grundobjekte müssen vor abhängigen Cross-Links existieren.

### Phase R4 – Cross-System-Referenzen rekonstruieren

- Home -> Building,
- Construction -> Building,
- BuildingStock -> Building,
- WorkArea -> Building,
- Unit -> Home,
- carried goods -> Unit/Transportkontext,
- Reservations -> Stock/Need,
- Assignment -> Unit + Job/Demand.

Hier werden ausschließlich stabile IDs aufgelöst.

### Phase R5 – Jobs/Assignments/Recovery rekonstruieren

- persistierte kritische Assignments validieren,
- getragene Waren zwingend an gültigen Recovery-/Transportkontext binden,
- rekonstruierbare Jobs aus realem Bedarf neu erzeugen,
- veraltete Jobs nicht blind wiederherstellen,
- Backoff/Fälligkeiten kontrolliert rekonstruieren.

### Phase R6 – transiente Runtime neu aufbauen

- Navigation-Caches,
- Pfade,
- Render-Layer/Caches,
- PathRenderer-Rebake,
- Scheduler-Registrierungen,
- Event-Abonnements,
- Derived Views/Population,
- Inspector-Snapshots.

### Phase R7 – Gesamtvalidierung

Vor Start muss mindestens geprüft werden:

- keine doppelte Building-/Unit-ID,
- keine verwaiste Home-Bindung ohne definierten Übergang,
- keine doppelte Warenposition,
- keine doppelte Reservation,
- keine Unit gleichzeitig frei und assigned,
- keine Unit mit Ware ohne Recovery/Assignment,
- keine Baustelle `BUILDING`, obwohl Builder-Ankunft fachlich nicht erfüllt ist,
- keine erfüllten Jobs als offen,
- keine ungültigen Jobs in sofortiger Retry-Schleife.

### Phase R8 – Scheduler starten

Erst nach PASS der Restore-Gesamtvalidierung wird der zentrale SimulationScheduler gestartet bzw. fortgesetzt.

## 25. Restore darf keine normalen Gameplay-Events doppelt auslösen

Das Wiederherstellen eines bereits gespeicherten Zustands ist nicht dasselbe wie ein neues Gameplay-Ereignis.

Beispiel:

Beim Restore eines bereits fertig gebauten Hauses darf nicht erneut `building completed` so verarbeitet werden, als wäre der Bau gerade im Spiel abgeschlossen worden und müsste neue Bewohner/Belohnungen ein zweites Mal erzeugen.

Deshalb müssen Restore und normale Runtime-Mutation unterscheidbar sein.

Nach vollständigem Restore darf ein eigenes Ereignis wie `runtime restored` bzw. ein entsprechender Lifecycle-Hook die Consumer darüber informieren, dass ein konsistenter Zustand verfügbar ist.

Konkreter Eventname bleibt offen.

## 26. Idempotenz und Doppelwirkungen

Restore muss vermeiden:

- Bewohner zweimal zu erzeugen,
- Waren doppelt zu buchen,
- Construction-Material erneut anzurechnen,
- Steuern rückwirkend doppelt auszulösen,
- Job/Assignment doppelt zu registrieren,
- Guidance-Hinweise erneut als neu zu markieren,
- Pfad-Wear doppelt einzubacken,
- Eventlistener mehrfach zu registrieren.

Die technische Umsetzung der Idempotenz folgt später; die Einmaligkeitsanforderung ist verbindlich.

## 27. Continue und laufende Arbeit

Continue soll für den Spieler konsistent wirken, muss aber nicht jede flüchtige Bewegung pixelgenau fortsetzen.

Erlaubt:

- Route neu berechnen,
- Animation neu starten,
- Render-Cache neu aufbauen,
- Job-Queue neu sortieren,
- Freizeitweg neu planen.

Nicht erlaubt:

- wirtschaftlichen Warenort ändern,
- Worker plötzlich frei machen, obwohl er Ware trägt,
- Builder als angekommen behandeln, obwohl das nicht restauriert/validiert ist,
- Produktionsoutput doppeln,
- Home-Bindung verlieren,
- Trampelpfad-Wear verschwinden lassen,
- bereits erfüllten Bedarf erneut erzeugen.

## 28. Ungültige Save-Zustände

Restore darf offensichtliche Inkonsistenzen nicht einfach still mit neuen Patches überschreiben.

Stattdessen gilt:

1. Fehler erkennen,
2. wenn eindeutig möglich kontrolliert rekonstruieren/reparieren,
3. Repair im Diagnose-/Inspector-Kontext sichtbar machen,
4. wenn keine eindeutige wirtschaftlich korrekte Lösung möglich ist, Restore als fehlerhaft behandeln statt Waren/Units zu erfinden oder zu löschen.

Welche Reparaturen automatisch zulässig sind, wird später konkretisiert.

## 29. Autosave

Autosave ist eine fällige Scheduler-/Lifecycle-Aufgabe, kein Feature-eigener unkoordinierter Gameplay-Timer.

Es darf einen Snapshot nur an einem konsistenten Safe Point anfordern.

Die konkrete Frequenz bleibt offen.

## 30. New Game vs. Continue

New Game und Continue müssen früh im Lifecycle getrennt werden.

### New Game

- Map initialisieren,
- Startgebäude/-Units/-Bestände aus Startdefinition erzeugen,
- keine Restore-Logik auf bereits neue Owner-Zustände anwenden.

### Continue

- keine Startwerte zusätzlich erzeugen,
- Snapshot restaurieren,
- fehlende transiente Runtime rekonstruieren,
- anschließend Scheduler starten.

Dadurch wird verhindert, dass Continue zuerst einen neuen Spielzustand erzeugt und danach nur teilweise Save-Daten darüberlegt.

## 31. Inspector und Save-Diagnose

Der Runtime-Inspector soll später lesen können:

- SaveGame-Version,
- letzter Snapshot-Status,
- Owner-Snapshot-Abschnitte,
- Restore-Phase,
- Referenzfehler,
- ungültige Reservationen,
- Assignment-/Unit-Konsistenz,
- Warenort-Invarianten,
- rekonstruierte vs. persistierte Runtime-Anteile,
- Scheduler-Startfreigabe.

Der Inspector darf Restore nicht durch direkte State-Mutation reparieren, sondern nur kontrollierte Debug-/Repair-Commands verwenden.

## 32. Historische Continue-Probleme und Zielersatz

Die bekannten historischen Probleme werden architektonisch wie folgt adressiert:

### Gebäude nach Continue weg

-> BuildingStore ist persistenter Owner und wird vor abhängigen Systemen restauriert.

### Ressourcen nach Continue null

-> ResourceStore/BuildingStock besitzen eigene Snapshots; SaveGame ist kein separater Ressourcenzähler.

### Trampelpfade verschwinden

-> persistenter Wear-State wird gespeichert; nur Render-Cache wird rekonstruiert.

### Pause funktioniert nach Continue nicht

-> Pause gehört zum zuständigen Gebäude-/Produktionsowner und wird dort persistiert; keine Restore-Patch-Flag-Kopie.

### Gebäude baut vor Builder-Ankunft

-> Construction restauriert gültigen Bauzustand; Builder-Ankunft ist fachliche Voraussetzung und wird validiert.

### Carrier liefern zu viel

-> Bedarf/Reservation wird aus realem Soll/Geliefert/Unterwegs-Zustand rekonstruiert; erfüllter Restbedarf erzeugt keinen neuen Job.

### Resident-Workforce verliert Verhalten

-> Unit-Identität, Home, Capabilities und kritische Assignments gehören zum Unit-/Workforce-Modell; keine Type-Mutation wird restauriert.

## 33. SaveGame-Invarianten

1. SaveGame ist kein Runtime-Owner.
2. Jeder Owner serialisiert seine eigene fachliche Wahrheit.
3. Cross-System-Referenzen werden über stabile IDs gespeichert.
4. Transiente Runtime-Strukturen werden rekonstruiert.
5. Eine physische Ware besitzt auch im Snapshot genau einen Ort.
6. Reservation ist keine zweite Warenkopie.
7. Getragene Ware bleibt beim Continue bei der Unit, bis reale Delivery erfolgt.
8. Eine Unit mit getragener Ware darf nicht ohne gültigen Recovery-/Assignment-Kontext frei werden.
9. Rekonstruierbare Jobs werden bevorzugt aus realem Bedarf neu erzeugt.
10. Veraltete Jobs werden nicht blind aus alten Queues geladen.
11. Backoff wird ohne Timer-Handle fachlich rekonstruiert.
12. Navigation wird neu berechnet; alte A*-Interna werden nicht gespeichert.
13. Wear-State darf persistieren, Render-Cache wird rekonstruiert.
14. Population wird aus Units abgeleitet.
15. Restore läuft bei gestoppter Simulation.
16. Owner werden vor abhängigen Cross-Links restauriert.
17. Scheduler startet erst nach Gesamtvalidierung.
18. Restore darf normale Gameplay-Effekte nicht doppelt auslösen.
19. New Game und Continue sind getrennte Lifecycle-Pfade.
20. Fehlerhafte Persistenz darf nicht durch stille wirtschaftliche Erfindung kaschiert werden.

## 34. Bewusst offen für spätere technische Detailentscheidung

Noch nicht entschieden:

- genaue SaveGame-JSON-Struktur,
- konkrete Snapshot-Methodensignaturen,
- Versionsnummernschema,
- Migration Registry,
- LocalStorage vs. IndexedDB vs. Datei/Cloud für spätere Plattformen,
- Kompression,
- Checksums,
- atomarer Write-/Backup-Mechanismus,
- genaue Autosave-Frequenz,
- exakte persistierte Assignment-Felder je Jobart,
- exakte Backoff-Persistenz,
- automatische Repair-Policy,
- Performance-/Chunking-Strategie für große Saves.

Diese Punkte dürfen die hier festgelegten Ownership- und Restore-Invarianten nicht verletzen.

## 35. Abschluss S2D-03D

S2D-03D ist fachlich/architektonisch geschlossen, wenn folgende Fragen eindeutig beantwortet sind:

- Wer speichert welchen Zustand? -> **Owner selbst über Snapshot-Vertrag**
- Was wird nicht gespeichert? -> **transiente Runtime/Caches/Timer/Pfade/Event-Queues**
- Wie bleiben Waren korrekt? -> **genau ein persistenter Ort; carried goods bleiben bei Unit**
- Wie bleiben Assignments korrekt? -> **nur notwendige fachliche Wahrheit persistieren, Rest rekonstruieren**
- Wie bleiben Jobs korrekt? -> **realen Bedarf rekonstruieren, kritische Bindungen erhalten**
- Wie bleibt Backoff korrekt? -> **fachliche Fälligkeit rekonstruieren, keine Timer-Handles**
- Wie werden Referenzen hergestellt? -> **stabile IDs und Cross-Link-Phase**
- Wann startet Simulation? -> **erst nach Restore-Validierung PASS**
- Werden alte Feature-Timer restauriert? -> **nein**
- Bleibt SaveGame zweiter Owner? -> **nein**

Status S2D-03D: **COMPLETE / 0 BLOCKER**
