# S2D-03 – TECHNICAL ARCHITECTURE

Status: **V0.1 DRAFT – S2D-03A COMPLETE**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-03-technical-architecture`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02 UNIT & WORKFORCE MODEL V0.1 FROZEN`  
Technische Referenzen: bestehende SA-Audit-/Ownership-Unterlagen und Scheduler-Inventur, soweit sie dem eingefrorenen S2D-Zielbild nicht widersprechen.

## 1. Zweck

S2D-03 übersetzt die eingefrorenen Produkt-, Economy- und Workforce-Regeln in eine belastbare technische Zielarchitektur.

S2D-03A legt dafür zunächst ausschließlich fest:

- welche Runtime-Zustände existieren,
- welches System jeweils autoritativer Owner ist,
- welche Systeme Zustände nur lesen bzw. über definierte Schnittstellen verändern dürfen,
- welche fachlichen Abhängigkeiten zwischen den Kernsystemen zulässig sind,
- welche historischen Doppel-Owner und Patch-Schichten langfristig ersetzt werden müssen,
- welche Grenzen für SaveGame, Rendering, UI, Inspector und Scheduler gelten.

Noch **nicht** Teil von S2D-03A sind konkrete Klassen-, Datei-, Enum-, Event- oder API-Namen, Tickraten, Datenstrukturen oder eine Implementierungsreihenfolge.

## 2. Zentrale Architekturregel

> **Jeder wichtige Gameplay-Zustand besitzt genau einen autoritativen Runtime-Owner.**

Andere Systeme dürfen diesen Zustand:

- über öffentliche Lesezugriffe bzw. Snapshots beobachten,
- über definierte Commands/Services verändern lassen,
- über Events über Änderungen informiert werden,

aber nicht parallel selbst als zweite Wahrheit führen.

Daraus folgt:

`ein State -> ein Owner -> definierte Schnittstellen -> abhängige Systeme`

Nicht zulässig ist:

`ein State -> mehrere unabhängige Stores/Patches/Timer -> gegenseitige Korrektur`

## 3. Owner vs. Consumer vs. Coordinator

### 3.1 Owner

Ein Owner besitzt die autoritative Wahrheit eines fachlichen Runtime-Zustands und ist allein für dessen gültige Mutation verantwortlich.

### 3.2 Consumer

Ein Consumer darf den Zustand lesen oder darauf reagieren, besitzt ihn aber nicht.

Beispiele:

- Renderer liest Gebäudezustände,
- UI liest Produktionsstatus,
- Inspector liest Unit-/Job-Snapshots.

### 3.3 Coordinator / Service

Ein Coordinator verbindet mehrere Owner über definierte Abläufe, darf aber nicht dieselben Zustände nochmals dauerhaft speichern.

Beispiel:

Ein Logistics-Service darf aus Warenbedarf und Jobs Transportabläufe koordinieren, aber weder BuildingStock noch Unit-Inventar als zweite Wahrheit besitzen.

## 4. Runtime-Ownership-Matrix

| Fachbereich | Autoritativer Ziel-Owner | Darf konsumiert werden von | Darf nicht parallel besitzen |
|---|---|---|---|
| Boot/Lifecycle | Boot-/Lifecycle-System | alle Runtime-Systeme | einzelne Feature-Patches mit eigenem Boot-Lifecycle |
| globale physische Ressourcen im HQ/Lager | ResourceStore / Storage-System | Construction, Logistics, UI, SaveGame, Inspector | UI, Produktion, SaveGame, Carrier-Code |
| Gold / Wirtschaftswert | Economy-System bzw. klar abgegrenzter ResourceStore-Bereich | Housing/Taxes, UI, SaveGame | Housing-Patch, UI-Zähler |
| Gebäudeinstanzen | BuildingStore / Buildings-System | Construction, Production, Housing, Renderer, UI, SaveGame | `Game.buildings` plus zweites `Buildings.list` als unabhängige Wahrheiten |
| Gebäude-Lifecycle/-Betriebszustand | zuständiges Buildings-/Domain-System | UI, Renderer, Guidance, Inspector | separate Guard-/Patch-Flags als zweite Wahrheit |
| Baustellenzustand | ConstructionSystem | Logistics, Buildings, Renderer, UI, SaveGame | Builder-Patch, JobEngine, Renderer |
| lokale Produktionsbestände | BuildingStock-System | Production, Logistics, Renderer, SaveGame | Production-Patch, sichtbare Stack-Objekte |
| Produktionszyklen | ProductionSystem | BuildingStock, Units/Workforce, UI, SaveGame | alte und neue Produktionspfade parallel |
| reale Personen/Units | UnitStore / GameUnits-Zielsystem | Workforce, Logistics, Navigation, Renderer, UI, SaveGame | Resident-Patch, JobEngine, Housing-Patch |
| Unit-Identität/Home/Spezialisierung/Capabilities | Unit-/Workforce-Domain | Housing, Assignment, SaveGame, Inspector | JobEngine oder temporäre Typmutation |
| Unit-Aktivität/Bewegungszustand | Unit-System | Renderer, Workforce, SaveGame | Renderer-/Animationsebene |
| Jobs / Arbeitsbedarf | JobEngine | Workforce Scheduler, UI, Inspector, SaveGame falls nötig | Production-/Construction-/Resident-Patches mit eigenen Joblisten |
| konkrete Assignment-Bindung | Workforce-/Assignment-Service in enger Kopplung mit Unit-System | JobEngine, UI, Inspector, SaveGame | Unit und JobEngine als zwei unabhängige Wahrheiten |
| Transportbedarf/-koordination | Logistics-System | JobEngine, Unit-System, BuildingStock, ResourceStore | Construction-/Production-Patches mit eigener Carrier-Verwaltung |
| von Unit getragene Ware | Unit-/Transport-Assignment-Kontext | Logistics, Renderer, SaveGame | Quell-/Zielbestand gleichzeitig |
| Wohnraum/Home-Bindung | Housing-Service + Unit-Domain | Workforce, Economy, UI, SaveGame | separates Population-/Housing-Patch als zweite Personenliste |
| Bevölkerung | abgeleiteter Wert aus realen Bewohnern | UI, Economy, Guidance | globaler unabhängiger Population-Resource-Counter |
| Tiere | MapAnimals / Animal-System | Hunting/Production, Renderer, SaveGame | Hunter-Patch mit eigener Tierliste |
| Weltressourcen | MapResources | Production, Renderer, SaveGame | einzelne Produktionsmodule mit Kopien der Rohstoffzustände |
| Arbeitsbereiche | WorkArea-System | Production, UI, SaveGame | je Produktionsmodul separate unabhängige WorkArea-States |
| Navigation/Reachability | NavigationService | Workforce, Logistics, Units | einzelne Guards/Patches mit eigener Reachability-Wahrheit |
| Weg-/Wear-Daten | PathSystem | Renderer, SaveGame, Inspector | Renderer/PathOverlay als Gameplay-Owner |
| Pfad-Visualisierung/cache | PathRenderer/Render-Cache | Renderer | PathRenderer darf Wear nicht selbst besitzen |
| SaveGame | SaveGameService | alle Owner über Snapshot/Restore-Verträge | SaveGame als zweiter Runtime-Store |
| Rendering | Render-Pipeline / Layer-System | liest Owner-Zustände | keine Gameplay-Mutation |
| UI | UI-System | liest Owner-Zustände, sendet Commands | keine Gameplay-Ownership |
| Guidance | GuidanceSystem | hört Events, speichert nur Guidance-Fortschritt | keine Gameplay-Logik |
| Inspector | separater Dev-Read/Command-Layer | liest Snapshots, sendet Debug-Commands | keine Produktivlogik / keine direkten internen Arrays |
| Hauptsimulation | zentraler Scheduler/GameTick | ruft Runtime-Systeme kontrolliert auf | Feature-eigene Endlosintervalle als Dauerarchitektur |

Die finalen technischen Namen können sich ändern; die Ownership-Grenzen nicht ohne spätere dokumentierte Architekturentscheidung.

## 5. Gebäude-Ownership

Das Gebäude-System besitzt die Identität und den grundlegenden Runtime-Lifecycle jeder Gebäudeinstanz.

Dazu gehören mindestens:

- stabile Building-ID,
- Definition/Typ,
- Position/Footprint,
- Existenz bzw. Entfernt-Zustand,
- gemeinsame Zugangs-/Interaktionsreferenzen,
- grundlegender Lifecycle-Bezug.

Domänenspezifische Zustände werden nicht zurück in einen riesigen monolithischen BuildingStore gezogen.

Beispiele:

- Baufortschritt gehört Construction,
- lokale Output-Ware gehört BuildingStock,
- Produktionszyklus gehört Production,
- Bewohnerbelegung/Home-Zuordnung gehört Housing/Units.

Das Gebäude-System referenziert diese Zustände, besitzt sie aber nicht mehrfach.

## 6. ConstructionSystem

Construction ist alleiniger Owner des fachlichen Baustellenablaufs.

Verbindlicher Ablauf:

`WAIT_MATERIAL -> WAIT_BUILDER -> BUILDING -> COMPLETE`

Construction besitzt mindestens fachlich:

- benötigte Materialien,
- gelieferte Materialien,
- gültig zugehörige Baustellenbedarfe,
- Status `WAIT_MATERIAL / WAIT_BUILDER / BUILDING / COMPLETE`,
- Baufortschritt,
- gültige Builder-Ankunft als Voraussetzung für Fortschritt.

Construction darf nicht selbst Carrier steuern oder Wege berechnen.

Es meldet Bedarf an Logistics und Builder-Bedarf an das Job-/Workforce-System.

## 7. ProductionSystem

Production besitzt Produktionsregeln und aktive Produktionszyklen.

Es darf:

- Produktionsvoraussetzungen prüfen,
- geeignete Arbeitsanforderung erzeugen,
- reale Rohstoff-/Tierziele über deren Owner referenzieren,
- bei erfolgreichem Produktionsabschluss Output an BuildingStock übergeben.

Es darf **nicht**:

- globale HQ-Ressourcen direkt gutschreiben,
- Carrier direkt umtypisieren/steuern,
- lokale Output-Ware parallel zu BuildingStock speichern,
- MapResources oder MapAnimals kopieren.

Verbindlicher Fluss:

`Production -> BuildingStock -> Logistics -> Unit -> Storage/ResourceStore`

## 8. BuildingStock

BuildingStock ist die einzige wirtschaftliche Wahrheit für lokal fertig produzierte physische Waren an einem Gebäude.

Sichtbare Stapel lesen BuildingStock nur aus.

Pickup verändert BuildingStock über einen definierten Transportvorgang; der Renderer entfernt daraus lediglich die sichtbare Repräsentation.

Es darf keine zweite Warenmenge in Produktionsmodulen oder Sprite-/Stack-Objekten geben.

## 9. ResourceStore / Storage

Der zentrale Lagerbestand des HQ bzw. später weiterer Lager ist ein eigener autoritativer Warenzustand.

Er erhält Ware ausschließlich durch fachlich gültige Übergänge, insbesondere erfolgreiche Delivery.

Construction, Production und UI dürfen globale Bestände nicht direkt manipulieren.

Gold darf technisch im selben Store oder in einem EconomyStore liegen; entscheidend ist, dass Gold als nicht-physischer Wirtschaftswert klar von physischen Transportwaren getrennt bleibt.

## 10. Unit-/Workforce-Domain

Das Unit-System besitzt reale Personen und deren dauerhafte Personenzustände.

Mindestens:

- stabile Unit-ID,
- tatsächliche Weltposition,
- Home-Bindung,
- Spezialisierung/Capabilities,
- Availability,
- Activity,
- aktuelles Assignment bzw. eindeutige Assignment-Referenz,
- gegebenenfalls real getragene Ware.

Die S2D-02-Regel ist technisch zwingend:

> **Ein temporärer Job verändert niemals die dauerhafte Unit-Identität.**

Historische Muster wie `resident -> carrier -> resident` werden daher später entfernt und nicht in die Zielarchitektur übernommen.

## 11. JobEngine

JobEngine besitzt Arbeitsbedarf, nicht Personenidentität und nicht die eigentliche Ausführung einer Unit.

Ein Job beschreibt mindestens fachlich:

- Job-Art,
- realen Bedarf,
- notwendige Capability,
- Quelle/Ziel bzw. fachliche Referenzen,
- Status/Priorität,
- Reservation/Assignment-Bezug,
- Retry-/Backoff-Zustand, soweit für die Jobplanung nötig.

JobEngine darf keine zweite vollständige Unit-State-Machine führen.

## 12. Workforce-/Assignment-Service

Zwischen Jobs und Units liegt ein klarer Assignment-Vertrag.

Zielablauf:

`JobEngine meldet vergabefähigen Bedarf -> Workforce prüft geeignete Units -> Navigation/Reachability wird berücksichtigt -> genau eine Unit wird gebunden -> Unit führt aus -> Ergebnis wird an Job/Domain zurückgemeldet -> Bindung endet`

Dabei gilt:

- genau eine authoritative Assignment-Verknüpfung,
- Unit und Job dürfen nicht voneinander abweichende Zuweisungswahrheiten besitzen,
- Spezialisten-Vorrang und Helper-Resident-Regeln stammen aus S2D-02,
- kein paralleles Assignment einer bereits gebundenen Unit,
- kein stilles Capability-/Type-Mutieren.

Ob der Assignment-Service technisch im Unit-System, beim JobEngine oder als dünner eigener Coordinator umgesetzt wird, bleibt für einen späteren S2D-03-Unterblock offen. Die Ownership-Invariante ist bereits verbindlich.

## 13. LogisticsSystem

Logistics koordiniert physische Warenbewegungen, besitzt aber die Waren nicht selbst als zweiten Bestand.

Es verbindet:

- realen Bedarf,
- Quellbestand,
- Reservation,
- Transportjob,
- geeignete Unit,
- Pickup,
- Delivery,
- Recovery.

Verbindliche wirtschaftliche Übergänge:

### Vor Pickup

`Ware = Quelle`

### Nach Pickup

`Ware = Unit`

### Nach Delivery

`Ware = Ziel`

Logistics darf diese Zustände koordinieren, aber Quellbestand, Unit-Inventar und Zielbestand müssen bei ihren jeweiligen Ownern bleiben.

## 14. Reservationen

Reservationen sind keine zweite Warenkopie.

Sie blockieren eine reale Menge an ihrem aktuellen Owner-Ort für einen konkreten Bedarf.

Die technische Ownership kann nahe am jeweiligen Stock-System oder in einem klaren Logistics-Reservierungsdienst liegen; verboten ist lediglich, dass mehrere Systeme dieselbe Menge unabhängig reservieren.

Eine spätere S2D-03-Entscheidung legt die genaue technische Platzierung fest.

## 15. Housing und Population

Housing koordiniert Wohnraum und Home-Bindungen, darf aber keine zweite Bewohnerliste besitzen.

Reale Personen bleiben im Unit-System.

Population ist ein abgeleiteter Wert:

`Population = Anzahl gültiger realer Bewohner`

Ein UI-/Resource-Counter darf diesen Wert cachen oder anzeigen, aber nicht als unabhängige Gameplay-Wahrheit verwenden.

## 16. Economy / Taxes

Steuererzeugung aus Häusern/Bewohnern ist fachlich ein Economy-Vorgang.

Housing kann die relevanten Bewohner-/Hausinformationen bereitstellen; die Goldmutation erfolgt ausschließlich beim Owner des Goldbestands.

Historische Housing-Timer dürfen langfristig keine direkte zweite Goldlogik enthalten.

## 17. MapResources

MapResources besitzt reale abbaubare/nutzbare Weltressourcen.

Produktionsmodule dürfen:

- geeignete Ziele abfragen,
- gültige Reservations-/Arbeitsbezüge erzeugen,
- über definierte Operationen Ressourcen abbauen/verändern.

Sie dürfen MapResource-Zustände nicht in eigenen Kopien weiterführen.

## 18. MapAnimals

MapAnimals bzw. ein AnimalSystem besitzt alle realen Tiere und deren Weltzustand.

Hunter/Production darf reale Tiere auswählen und über öffentliche Operationen auf sie wirken.

Ein Hunter-spezifischer Fix-/Patch darf langfristig keine eigene Tierwahrheit führen.

## 19. WorkAreaSystem

Arbeitsbereiche werden als eigener fachlicher Zustand betrachtet.

Ein Produktionsgebäude referenziert seinen gültigen WorkArea-Zustand; die tatsächlichen Gebietsgrenzen und Änderungen besitzen einen eindeutigen Owner.

Damit werden UI, Produktion und SaveGame nicht zu parallelen Besitzern derselben Arbeitsbereichsdaten.

## 20. NavigationService

Navigation besitzt die technische Wahrheit über Wegfindung und Reachability-Abfragen, nicht aber über Jobs oder Unit-Aufgaben.

Es stellt mindestens fachlich bereit:

- Erreichbarkeitsprüfung,
- Weganforderung,
- gültige Ziel-/Interaktionspunkte,
- kontrolliertes Fehlerergebnis.

Workforce und Logistics verwenden Navigation, statt eigene A*-Sonderlogik zu führen.

Die S2D-00/02-Regel bleibt zwingend:

- Reachability möglichst vor Vergabe prüfen,
- Fail -> Backoff/Trigger statt heißer Wiederholung,
- kein endloser A*-FAIL-Loop.

A* selbst bleibt zunächst erhalten.

## 21. PathSystem und PathRenderer

Gameplay-Wear und sichtbare Pfaddarstellung werden getrennt.

### PathSystem

Besitzt:

- lokale Wear-Werte,
- zeitliche Abnahme/Zuwachsen,
- Dirty-Bereiche,
- Snapshot-relevanten Pfadzustand.

### PathRenderer / Cache

Besitzt nur:

- Render-Cache,
- Offscreen-/Bake-Repräsentation,
- visuelle Dirty-Updates.

Der Renderer darf aus Pixeln/Stempeln niemals wieder Gameplay-Wear zurückrechnen oder einen zweiten Pfadbestand erzeugen.

## 22. SaveGameService

SaveGame ist kein Runtime-Owner der gespeicherten Domänen.

Zielprinzip:

`Owner.snapshot() -> SaveGame -> Storage`

und beim Laden:

`Storage -> SaveGame validate -> Owner.restore()/reconstruct()`

SaveGame darf:

- Snapshots sammeln,
- Version/Schema prüfen,
- Restore-Reihenfolge koordinieren,
- rekonstruierbare Laufzeitzustände gezielt neu aufbauen lassen.

SaveGame darf nicht:

- Gebäude, Units, Jobs oder Waren als zweite dauerhafte Runtime-Wahrheit weiterführen,
- nach Restore eigene Patch-Zustände gegen die Owner zurückschreiben.

## 23. Central Scheduler / GameTick

Die Simulation besitzt langfristig einen kontrollierten zentralen Scheduler.

Feature-Systeme dürfen unterschiedliche logische Frequenzen besitzen, aber sie werden zentral getaktet bzw. geplant.

Dauerhafte Architektur ist **nicht**:

- eigenes `setInterval` pro Feature,
- konkurrierende unabhängige Runtime-Timer,
- Patch-Timer, die andere Systeme periodisch korrigieren.

Rendering über `requestAnimationFrame` bleibt als Darstellungsloop getrennt von der fachlichen Simulation möglich.

Die genaue Scheduler-Struktur wird in einem späteren S2D-03-Block festgelegt.

## 24. Rendering

Rendering ist Consumer.

Renderer dürfen:

- Gebäude, Units, Tiere, Warenstapel, Pfade und Status visualisieren,
- Render-Caches besitzen,
- Animationen aus Runtime-Zuständen ableiten.

Renderer dürfen nicht:

- Baufortschritt erhöhen,
- Warenmengen buchen,
- Jobs abschließen,
- Unit-Assignments ändern,
- Path-Wear als Gameplay-State besitzen.

## 25. UI

UI liest öffentliche ViewModels/Snapshots und sendet definierte Spielercommands.

Beispiele:

- Gebäude platzieren,
- Produktion pausieren/fortsetzen,
- WorkArea ändern,
- Abriss auslösen.

UI darf keine Domain-State-Felder direkt mutieren und keine eigenen Korrekturintervalle für Gameplay enthalten.

## 26. GuidanceSystem

Guidance besitzt ausschließlich seinen eigenen Hinweisfortschritt.

Gameplay-Systeme veröffentlichen definierte Ereignisse; Guidance reagiert darauf.

Guidance darf keine Gebäude, Units, Jobs oder Waren verändern, nur um einen Tutorialschritt zu erzwingen.

## 27. Inspector

Inspector ist ein separater Developer-Consumer.

Er darf:

- öffentliche Snapshots lesen,
- Events/Traces beobachten,
- über definierte Debug-Commands kontrollierte Änderungen anstoßen.

Er darf nicht:

- direkte interne Arrays/Maps als produktive Schnittstelle verwenden,
- Runtime-Methoden patchen,
- eigene Job-/Economy-/Unit-Logik besitzen,
- im deaktivierten Zustand das Gameplay verändern.

## 28. Zulässige Kernabhängigkeiten

Die fachlichen Hauptflüsse sind:

### Produktion

`Production -> BuildingStock -> Logistics -> JobEngine/Workforce -> Unit -> Storage/ResourceStore`

### Bau

`Placement/Buildings -> Construction -> Logistics(Material) + JobEngine(Builder) -> Workforce -> Unit -> Construction COMPLETE`

### Workforce

`Housing/Units -> FREE Person -> JobEngine Bedarf -> Workforce Eligibility -> Assignment -> Unit Execution -> Completion -> FREE`

### Navigation

`Workforce/Unit/Logistics -> NavigationService -> Path/Reachability-Ergebnis`

### Save

`Domain Owner -> Snapshot -> SaveGame -> Storage`

### Darstellung

`Domain Owner -> Read Model/Event -> Renderer/UI/Inspector`

## 29. Verbotene Abhängigkeitsmuster

Langfristig unzulässig sind insbesondere:

1. UI mutiert direkt Domain-Arrays.
2. Renderer erzeugt Gameplay-State.
3. SaveGame wird zweiter Runtime-Store.
4. Production schreibt direkt globale HQ-Ressourcen.
5. Construction steuert direkt Carrier.
6. JobEngine verändert Unit-Identität oder Spezialisierung.
7. Resident-/Housing-Patch mutiert Unit-Typen.
8. Feature-eigene Intervalle korrigieren periodisch andere Owner.
9. Navigation entscheidet fachliche Jobpriorität.
10. Inspector patcht Produktivlogik.
11. sichtbare Warenstapel besitzen eigene wirtschaftliche Mengen.
12. Population wird unabhängig von realen Bewohnern als Resource hoch-/heruntergezählt.

## 30. Historische Doppel-Owner / Patch-Schichten, die ersetzt werden müssen

Die vorhandenen historischen Systeme werden nicht blind gelöscht, sondern gegen diese Zielgrenzen migriert.

Bekannte Konfliktklassen sind:

- parallele Gebäudezustände wie `Game.buildings` und `Buildings.list`,
- alte und neue Produktionspfade,
- JobEngine plus Wrapper-/Patch-Joblogik,
- Construction plus Builder-/Runtime-Guards,
- Production plus BuildingStock plus Bridge-/Patchlogik,
- SaveGame V2 plus zusätzliche Persistence-Module,
- PathOverlay plus direkter Zugriff auf interne Pfadstrukturen,
- Resident-Workforce-Patch inklusive temporärer Unit-Typmutation,
- Resident-Workforce-Datei mit zusätzlich eingemischter Path-Performance-Logik,
- Housing-/Tax-Patches mit eigenen Intervallen,
- Hunter-Fixes mit eigenem Intervall,
- zahlreiche autonome `setInterval`-Schleifen neben GameTick,
- Renderer-Wrapper und Runtime-Guards, die andere Systeme korrigieren.

Diese Elemente sind **Migrationsquellen**, nicht Zielarchitektur.

## 31. Transitional Guards

Ein Guard/Patch darf in einer Übergangsphase nur bestehen, wenn dokumentiert ist:

1. welcher konkrete Altfehler abgefangen wird,
2. welcher Ziel-Owner den Zustand später übernimmt,
3. welche Ablösung ihn entfernt,
4. unter welcher Testbedingung er gelöscht werden darf.

Ein Guard darf nie stillschweigend zum dauerhaften neuen Owner werden.

## 32. Öffentliche Kommunikationsprinzipien

Zwischen Systemen gelten künftig drei bevorzugte Kommunikationsformen:

### Commands / Services

Für beabsichtigte Mutationen.

### Queries / Snapshots

Für Lesezugriffe.

### Events

Für bereits eingetretene Zustandsänderungen.

Nicht bevorzugt ist dauerhaftes Polling fremder interner Datenstrukturen.

Die konkreten API-/Eventnamen werden später definiert.

## 33. Ownership- und Konsistenzinvarianten S2D-03A

1. Jeder wichtige Gameplay-State besitzt genau einen autoritativen Owner.
2. Consumers dürfen Gameplay-State nicht parallel führen.
3. Rendering, UI, Guidance und Inspector besitzen keine Domain-Business-Logik.
4. SaveGame serialisiert Owner, es ersetzt sie nicht.
5. Jobs besitzen Bedarf; Units besitzen Personen-/Ausführungszustand.
6. Assignment-Zuordnung besitzt genau eine konsistente Wahrheit.
7. Production erzeugt lokale Ware, nicht direkt globale Gutschrift.
8. BuildingStock ist autoritativer lokaler Outputbestand.
9. Pickup/Delivery verschieben reale Ware zwischen Ownern; keine Kopien.
10. Construction ist alleiniger Owner von Baustellenfortschritt.
11. Population wird aus realen Bewohnern abgeleitet.
12. Navigation liefert Wege/Reachability, entscheidet aber keine Wirtschaftslogik.
13. Path-Wear und Path-Rendering sind getrennt.
14. zentrale Simulation ersetzt langfristig Feature-eigene Korrekturintervalle.
15. historische Patches dürfen nur Übergang sein, nicht Ziel-Owner.
16. Domain-Kommunikation erfolgt über definierte Commands, Queries/Snapshots und Events.

## 34. Was S2D-03A bewusst offen lässt

Noch nicht festgelegt werden:

- konkrete Modul-/Klassen-/Dateinamen,
- finale Store-Strukturen,
- technische Eventnamen und Payloads,
- konkrete Command-/Query-APIs,
- exakte Assignment-Ownership zwischen Unit-/Workforce-/Job-Komponenten,
- konkrete Reservation-Datenstruktur,
- technische Transaktions-/Idempotenzmechanik für Pickup/Delivery,
- zentraler Scheduler-Aufbau und Frequenzen,
- SaveGame-Schema und Restore-Reihenfolge,
- Navigation-API und Path-Cache-Details,
- konkrete Migrationsreihenfolge aus Legacy-/Patch-Systemen.

Diese Punkte werden in den folgenden S2D-03-Blöcken geschlossen.

## 35. Abschluss S2D-03A

Die fachlich-technischen Runtime-Owner und Systemgrenzen sind damit als Zielarchitektur festgelegt.

Der Block verändert keine Gameplay-Implementierung.

**S2D-03A – Runtime Ownership & Core System Boundaries: COMPLETE**  
**Implementation changes: 0**  
**Conflict gegenüber S2D-00/S2D-01/S2D-02 FROZEN: 0**  
**Open Blockers: 0**
