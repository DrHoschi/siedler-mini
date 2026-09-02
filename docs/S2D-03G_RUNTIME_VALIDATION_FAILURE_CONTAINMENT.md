# S2D-03G – Runtime Validation, Invariants & Failure Containment Architecture

Status: **COMPLETE – Bestandteil von S2D-03 TECHNICAL ARCHITECTURE V0.1 DRAFT**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-03-technical-architecture`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02 UNIT & WORKFORCE MODEL V0.1 FROZEN` + `S2D-03A/B/C/D/E/F COMPLETE`

> Konsolidierungshinweis: Dieser geschlossene Teilblock wird spätestens beim S2D-03 Freeze-Gate in `S2D-03_TECHNICAL_ARCHITECTURE.md` konsolidiert. Er ist kein zusätzliches dauerhaftes Architektur-Masterdokument.

## 1. Zweck

S2D-03G definiert die technische Zielarchitektur für Runtime-Validierung, Invariantenprüfung, Fehlererkennung, Failure Containment und Diagnose.

Der Block legt fest:

- welche eingefrorenen Regeln technisch prüfbar sein müssen,
- wie lokale Owner-Invarianten und Cross-Owner-Invarianten unterschieden werden,
- wann Validierungen stattfinden,
- wie Fehler klassifiziert und sichtbar gemacht werden,
- wie ein fehlerhafter Ablauf gestoppt oder isoliert wird, ohne fremden State automatisch zu patchen,
- wie Inspector und Diagnostics Runtime-Abweichungen darstellen dürfen,
- wie Save/Continue, Scheduler, Navigation und wirtschaftliche Transaktionen in die Validierung eingebunden werden,
- wie historische „Guard repariert fremden State“-Muster durch explizite Validierung und saubere Recovery ersetzt werden.

Noch nicht festgelegt werden konkrete Assertion-Libraries, Log-Frameworks, UI-Layouts des Inspectors, Telemetrie-Backends, exakte Sampling-Raten oder finale Fehlercode-Namen.

## 2. Zentrale Validierungsregel

> **Validatoren dürfen Inkonsistenzen erkennen, klassifizieren und einen unsicheren Ablauf stoppen – sie dürfen nicht heimlich fremden Gameplay-State zu einer vermeintlich passenden Wahrheit umschreiben.**

Zielbild:

`Owner schützt eigene Invarianten -> Cross-System-Validator prüft Verträge -> Fehler wird klassifiziert -> betroffener Ablauf wird kontrolliert gestoppt/isolierrt -> Diagnostics/Inspector zeigt Ursache -> fachlicher Owner/Recovery-Pfad entscheidet weitere Aktion`

Nicht Zielbild:

`Guard entdeckt Problem -> schreibt fremde Arrays/Flags um -> nächster Guard korrigiert Folgefehler -> Runtime läuft scheinbar weiter`

Damit bleibt S2D-03A bindend: Ownership wird nicht durch Validatoren verwässert.

## 3. Drei Validierungsebenen

### 3.1 Owner-local Validation

Jeder Owner prüft seine eigenen Invarianten bei Mutation und an definierten Kontrollpunkten.

Beispiele:

- BuildingStock verhindert negativen Bestand,
- Unit-System verhindert zwei normale Assignments an derselben Person,
- Construction verhindert Baufortschritt ohne Builder-Ankunft,
- ResourceStore verhindert ungültige Bestandsmutation,
- PathSystem verhindert Wear außerhalb erlaubter Grenzen.

Owner-local Validation ist erste Schutzlinie.

### 3.2 Contract Validation

Prüft einen konkreten Cross-System-Vorgang an seiner Systemgrenze.

Beispiele:

- Pickup nur bei gültiger Quellware + Reservation + Unit-Kontext,
- Delivery nur bei tatsächlich von der Unit getragener Ware + gültigem Ziel,
- Assignment nur wenn Job und Unit gleichzeitig zulässig sind,
- Restore-Verknüpfung nur wenn referenzierte IDs existieren.

Diese Prüfung gehört nahe an den Coordinator bzw. die beteiligten Owner-Operationen.

### 3.3 Global/Cross-Owner Validation

Prüft ausgewählte übergreifende Invarianten, die kein einzelner Owner allein vollständig beurteilen kann.

Beispiele:

- physische Ware existiert wirtschaftlich genau einmal,
- Job ↔ Assignment ↔ Unit-Bindung ist konsistent,
- keine Unit ist `FREE` und gleichzeitig in Recovery,
- keine Baustelle ist `BUILDING`, obwohl Builder-Voraussetzung fehlt,
- referenzierte Gebäude/Units/Ziele existieren,
- Population entspricht den realen Bewohnern,
- keine Zombie-Reservation ohne echten Bedarf/Assignment-Kontext.

Global Validation ist Diagnose-/Schutzschicht, kein zweiter Owner.

## 4. Validation by Construction

Das bevorzugte Ziel ist nicht, schlechte Zustände später zu finden, sondern sie möglichst gar nicht erzeugen zu können.

Dafür gelten:

1. Commands validieren vor Mutation.
2. Owner verändern ihren State nur über definierte Operationen.
3. Cross-System-Transaktionen besitzen klaren Coordinator.
4. Mutable Fremdreferenzen sind verboten.
5. Events werden erst nach gültig abgeschlossener Mutation veröffentlicht.
6. Scheduler ordnet Mutationen in stabile Phasen ein.
7. Restore startet Runtime erst nach Gesamtvalidierung.

Runtime-Validatoren bleiben trotzdem notwendig, um Programmierfehler, Race-/Ordering-Probleme und unerwartete Altbestände sichtbar zu machen.

## 5. Invarianten-Katalog als Architekturartefakt

Jede wichtige eingefrorene Regel soll einer technisch prüfbaren Invariante zugeordnet werden können.

Eine Invariante besitzt fachlich mindestens:

- stabile Kennung,
- Beschreibung,
- beteiligte Owner,
- Schweregrad,
- geeigneten Prüfzeitpunkt,
- Diagnosekontext,
- erlaubte Failure-Containment-Reaktion.

Beispiel konzeptionell:

`INV-GOODS-001 – Physical goods have exactly one authoritative location`

Die endgültigen IDs werden erst bei Implementierung festgelegt; die Idee eines stabilen Katalogs ist verbindlich.

## 6. Kerninvarianten – Waren

Folgende Regeln müssen technisch prüfbar sein:

1. physische Ware besitzt genau einen autoritativen Ort,
2. Bestand darf nicht negativ werden,
3. Reservation darf verfügbare Menge nicht übersteigen,
4. dieselbe Menge darf nicht mehrfach reserviert sein,
5. Pickup entfernt Ware aus Quelle, bevor/indem sie der Unit zugeordnet wird,
6. Delivery entfernt Ware aus Unit-Kontext, bevor/indem sie dem Ziel zugeordnet wird,
7. Unit darf getragene Ware nicht verlieren, nur weil Job/Target ungültig wird,
8. Recovery-Ware darf nicht gleichzeitig im Lager gezählt werden,
9. Baustellen-Restbedarf darf keine Überlieferung erzeugen,
10. wirtschaftliche Completion darf nur einmal wirksam werden.

Ein Verstoß in diesem Bereich ist mindestens hochkritisch, da er SaveGame und Wirtschaft verfälschen kann.

## 7. Kerninvarianten – Units & Workforce

Technisch prüfbar:

1. stabile Unit-ID eindeutig,
2. Personidentität ändert sich nicht aufgrund temporärer Aufgabe,
3. Home-Bindung und Spezialisierung sind getrennt,
4. Capability ist Voraussetzung für Assignment,
5. maximal ein normales Assignment pro Person,
6. `FREE` bedeutet kein aktives normales Assignment,
7. carrying/recovery Unit ist nicht für neues normales Assignment verfügbar,
8. Assignment und sichtbare Activity dürfen sich nicht offensichtlich widersprechen,
9. Arbeitseffekt nur nach gültiger Ankunft,
10. gelöschtes Home darf keine endlose `RETURNING_HOME`-Schleife hinterlassen.

## 8. Kerninvarianten – Jobs & Assignments

Technisch prüfbar:

- Job hat realen Bedarf,
- zugewiesener Job referenziert gültige Assignment-Bindung,
- Assignment referenziert genau eine gültige Unit,
- Unit referenziert dasselbe Assignment,
- Job kann nicht gleichzeitig frei und vergeben sein,
- Backoff-Job wird nicht bei jedem Tick neu vollständig evaluiert,
- strukturell ungültiger Job lebt nicht als endloser temporärer Retry weiter,
- beendetes Assignment hinterlässt keine Reservation/Unit-Bindung ohne Recovery-Kontext,
- keine doppelte Completion/Release.

## 9. Kerninvarianten – Construction

Technisch prüfbar:

- Sollmaterialmenge ist fachlich gültig,
- geliefert + gültig reserviert/unterwegs überschreitet Bedarf nicht unkontrolliert,
- `WAIT_BUILDER` erst nach vollständiger Materialversorgung,
- `BUILDING` nur bei gültig angekommenem Builder,
- Baufortschritt entsteht nur in gültiger Work-Phase,
- abgerissene Baustelle erzeugt keinen neuen Liefer-/Builder-Bedarf,
- gelöschte Baustelle hinterlässt keine Zombie-Assignments.

## 10. Kerninvarianten – Production

Technisch prüfbar:

- keine neue Produktion bei Pause,
- Produktion verwendet nur gültige reale Arbeits-/Rohstoffziele,
- kein Phantomoutput bei verschwundenem Arbeitsziel,
- Output wird genau einmal in BuildingStock überführt,
- Produktion schreibt nicht direkt in HQ-/Globalbestand,
- Output-full Zustand verhindert weitere unzulässige Erzeugung,
- Produktionsworker besitzt passende Capability.

## 11. Kerninvarianten – Navigation

Technisch prüfbar bzw. diagnostizierbar:

- Gameplay-Pfadanfragen laufen ausschließlich über NavigationService,
- strukturell negativ gecachte Anfrage löst nicht pro Tick identisches A* aus,
- Backoff wird respektiert,
- Assignment nutzt gültigen Access-/Pickup-/Delivery-/Build-Punkt,
- Pfadfehler mit getragener Ware führt nicht zu `FREE`, sondern Recovery,
- Navigationsergebnis mit veralteter Revision wird nicht blind weiterverwendet,
- normale Unit-Bewegung invalidiert nicht global die Navigationswelt.

Performance-Invarianten können zusätzlich Schwellenwerte beobachten, ohne Gameplay-State zu verändern.

## 12. Kerninvarianten – Path/Wear

Technisch prüfbar:

- Wear entsteht nur aus realer Bewegung,
- Wear bleibt im zulässigen Wertebereich,
- Renderer/Cache mutiert keinen Wear-State,
- Dirty Region ist transiente Darstellungsinformation,
- Re-Bake verändert keine Gameplay-Wahrheit,
- SaveGame enthält Wear-State, aber keine Pflichtabhängigkeit von Cache-/Canvas-Daten,
- kein dauerhaftes Einzelstempelwachstum als zweite Datenhaltung.

## 13. Kerninvarianten – Save/Continue

Vor Scheduler-Start nach Continue muss mindestens geprüft werden:

1. alle stabilen IDs sind eindeutig,
2. erforderliche Cross-Referenzen sind auflösbar,
3. jede Ware besitzt genau einen Ort,
4. Reservationen sind konsistent,
5. carrying Units besitzen gültigen Transport-/Recovery-Kontext,
6. Assignment-Bindungen stimmen auf Job- und Unit-Seite,
7. keine Unit ist zugleich `FREE` und assigned,
8. Construction-Zustände stimmen mit Material/Builder-Fakten überein,
9. Population ist aus Bewohnern ableitbar,
10. keine persistierten Timer-/Render-/A*-Objekte werden als Runtime-Wahrheit benötigt,
11. Scheduler startet nur einmal,
12. keine bereits als strukturell ungültig erkannte Navigation springt sofort in Hot-Retry.

Bei schwerem Restore-Verstoß darf die Simulation nicht einfach mit inkonsistentem State starten.

## 14. Schweregrade

Validierungsfehler werden fachlich mindestens nach Schwere eingeordnet.

### INFO / DIAGNOSTIC

Auffälligkeit ohne unmittelbare State-Verletzung.

Beispiel: ungewöhnlich viele Navigation-Requests.

### WARNING

Zustand ist noch gültig, deutet aber auf Problem oder ineffizienten Ablauf.

Beispiel: Job wartet ungewöhnlich lange trotz potenzieller Workforce.

### ERROR

Ein lokaler Vorgang kann nicht sicher fortgesetzt werden.

Beispiel: Assignment-Target existiert nicht mehr und Recovery muss greifen.

### CRITICAL / INVARIANT VIOLATION

Autoritative Wahrheit oder Cross-Owner-Konsistenz ist verletzt.

Beispiele:

- Ware doppelt gebucht,
- Unit gleichzeitig zwei Assignments,
- Restore erzeugt widersprüchliche IDs,
- Delivery würde wirtschaftlich zweimal wirken.

Die konkreten technischen Namen bleiben offen.

## 15. Failure Containment statt Auto-Repair

Bei Fehlern gilt bevorzugt:

`fehlerhaften lokalen Ablauf stoppen -> weitere schädliche Mutation verhindern -> betroffenen Kontext markieren -> definierte Recovery nutzen, falls fachlich vorhanden -> Diagnose ausgeben`

Nicht:

`Validator rät einen gewünschten Zustand und schreibt andere Owner passend um`

Beispiele:

- ungültiger Transport vor Pickup -> Assignment abbrechen, Reservation über zuständigen Owner freigeben,
- ungültiger Transport nach Pickup -> Recovery, Unit nicht freigeben,
- ungültiger Job -> Job blockieren/invalidieren,
- inkonsistenter Save -> Scheduler nicht starten,
- Render-Cache defekt -> Cache verwerfen und aus Wear-State neu aufbauen.

Das sind fachlich definierte Owner-/Recovery-Aktionen, keine diagnostischen Hintertür-Patches.

## 16. Fehlerbegrenzung pro Domain

Ein Fehler in einem System soll möglichst nicht die gesamte Simulation weiter korrumpieren.

Beispiele:

- ein ungültiger Job blockiert nicht alle anderen Jobs,
- ein fehlerhafter Pfad-Request stoppt nicht alle Units,
- ein defekter Path-Render-Chunk beeinflusst nicht PathSystem,
- ein einzelnes ungültiges Gebäudeziel wird isoliert,
- ein fehlerhafter Inspector-View verändert kein Gameplay,
- ein Autosave-Fehler verändert nicht den aktuellen Runtime-State.

Die genaue technische Isolierung wird bei Implementierung gewählt.

## 17. Fail Closed bei wirtschaftlich kritischen Übergängen

Bei Übergängen mit Waren-/Bau-/Assignment-Wirkung gilt:

> **Wenn zentrale Voraussetzungen nicht bewiesen gültig sind, darf die wirtschaftliche Mutation nicht stattfinden.**

Beispiele:

- kein Pickup ohne belegbare Quellware,
- keine Delivery ohne belegbare getragene Ware,
- kein Baufortschritt ohne angekommenen Builder,
- kein Produktionsoutput ohne erfolgreich abgeschlossenen Zyklus,
- keine doppelte Completion bei wiederholtem Callback/Event.

Lieber wartet ein Vorgang sichtbar/blockiert, als dass Waren oder Fortschritt erfunden werden.

## 18. Assertions vs. normale Runtime-Fehler

Nicht jede fachliche Ablehnung ist ein Programmfehler.

Normale Zustände:

- kein freier Builder,
- Ware fehlt,
- Ziel temporär unerreichbar,
- Output voll,
- Gebäude pausiert.

Das sind diagnosierbare Gameplay-Zustände und keine Assertions.

Assertions/Invariantenverletzungen sind dagegen Zustände, die gemäß Zielarchitektur niemals entstehen dürften, z. B. doppelte Warenposition oder zwei Assignments derselben Unit.

Diese Trennung verhindert Log-Spam und falsche Alarmierung.

## 19. Validierungszeitpunkte

Validierung darf nicht als permanenter Full-State-Scan in jedem GameTick ausgeführt werden.

Geeignete Kontrollpunkte:

- direkt vor/nach kritischer Owner-Mutation,
- nach Cross-System-Transaktion,
- bei Assignment-Bindung/-Ende,
- bei Pickup/Delivery,
- bei Gebäudelöschung,
- bei Restore vor Scheduler-Start,
- periodisch als Low-Frequency-Diagnose,
- gezielt auf Inspector-Anforderung,
- in automatisierten Tests.

Damit bleibt Validierung performant und ursachennah.

## 20. Dirty-/Affected-Validation

Wo möglich, werden nur betroffene Objekte/IDs geprüft.

Beispiel:

`GoodsDelivered(buildingId, unitId, resourceId)`

muss primär die beteiligten Stocks, Unit und Reservation validieren, nicht den vollständigen Weltbestand jeder Ware.

Globale Sweeps bleiben für Debug-/Test-/Restore-Gates möglich, aber nicht als Hochfrequenz-Normalbetrieb.

## 21. Diagnostics Record

Ein erkannter Fehler soll einen strukturierten Diagnoseeintrag erzeugen können.

Fachlich sinnvolle Felder:

- timestamp / simulation time,
- invariant/error id,
- severity,
- owner/domain,
- betroffene IDs,
- aktueller Phase/Command/Assignment-Kontext,
- reason/failure code,
- relevante read-only Snapshots,
- ob Ablauf gestoppt, blockiert oder Recovery gestartet wurde.

Kein Diagnoseeintrag besitzt Gameplay-Ownership.

## 22. Event-/Command-Trace

Für schwer nachvollziehbare Fehler soll ein begrenzter Trace der letzten relevanten Runtime-Aktionen verfügbar sein.

Beispiele:

- Command accepted/rejected,
- Assignment bound/released,
- Pickup/Delivery,
- Navigation fail/backoff,
- Construction state transition,
- Production completion,
- Restore reconstruction.

Der Trace ist Diagnosezustand und darf begrenzt/ringgepuffert sein. Er wird nicht als zweite Business-Wahrheit benutzt.

## 23. Inspector-Rolle

Der Inspector darf Runtime-Validierung sichtbar machen.

Er darf mindestens anzeigen:

- aktuelle Invariant Violations,
- Severity,
- betroffene Owner/IDs,
- Job-/Assignment-/Unit-Verknüpfung,
- Warenort/Reservation,
- Navigation FailReason/Backoff,
- Save/Restore-Validation,
- Schedulerphase,
- letzte relevante Events/Commands,
- Performancewarnungen.

Der Inspector darf **nicht**:

- bei Anzeige automatisch State korrigieren,
- Unit-Type umschreiben,
- Warenmengen passend setzen,
- Jobs löschen, nur um Warnungen verschwinden zu lassen,
- interne Arrays direkt editieren.

Explizite Debug-Reparaturkommandos dürfen später nur über dieselben kontrollierten Owner-Commands laufen und müssen klar als Entwicklungsoperation erkennbar sein.

## 24. Production Mode vs. Development Mode

Die Architektur darf unterschiedliche Diagnoseintensität erlauben.

Development/Test:

- mehr Assertions,
- detaillierter Trace,
- häufigere Cross-Checks,
- Inspector-Daten.

Production:

- kritische Owner-Checks bleiben,
- teure globale Sweeps können reduziert sein,
- Fehlerbegrenzung bleibt aktiv,
- keine Debug-Reparaturautomatismen.

Die fachlichen Invarianten ändern sich zwischen Modi nicht.

## 25. Scheduler-Integration

Validation arbeitet innerhalb der in S2D-03C definierten Simulationsordnung.

Insbesondere:

- keine eigene unkoordinierte Validation-`setInterval`-Landschaft,
- kritische Checks inline an Transaktionsgrenzen,
- Low-Frequency-Sweeps über zentralen Scheduler,
- Diagnoseevents erst nach klarer Fehlerklassifikation,
- Validator darf keine konkurrierende Simulationsschleife aufbauen.

## 26. Navigation-Performance-Wächter

Da Navigation historisch Hauptproblem war, werden technische Diagnosemetriken vorgesehen:

- Pfadanfragen pro Zeitfenster,
- Cache-Hit/Miss,
- negative Cache-Hits,
- A*-Success/Fail,
- wiederholte gleichwertige Requests,
- Requests pro Job/Assignment,
- Zeitbudget Navigation,
- Backoff-Verletzungen.

Ein Performance-Wächter kann eine Warnung erzeugen, wenn Muster auf eine neue Fail-Schleife hindeuten.

Er darf nicht selbst Jobs oder Units manipulieren.

## 27. Zombie-State Detection

Gezielte Validatoren erkennen mindestens:

- Assignment ohne Job/Unit,
- Unit-Assignment ohne passenden Job,
- Reservation ohne Bedarf/Recovery,
- carrying goods ohne Transport-/Recovery-Kontext,
- Job referenziert gelöschtes Ziel dauerhaft,
- Worker arbeitet an gelöschtem Produktionsziel,
- `RETURNING_HOME` zu nicht existentem Home ohne Relocation-Kontext.

Erkennung führt zur Klassifikation und anschließend zum fachlich zuständigen Recovery-/Invalidation-Pfad.

## 28. No Silent Data Repair

Insbesondere bei SaveGame und Wirtschaft ist stilles „Heilen“ verboten, wenn die korrekte Wahrheit nicht eindeutig ableitbar ist.

Beispiel:

Wenn Snapshot gleichzeitig 1 Holz im HQ und dieselbe konkrete transportierte Einheit bei Unit X behauptet, darf Restore nicht willkürlich eine Seite löschen und normal weiterspielen.

Stattdessen:

- Critical Validation Failure,
- betroffenen Save/Restore stoppen oder klar definierten migrationsspezifischen Repair-Pfad verwenden,
- Diagnose verfügbar machen.

Migration ist eine explizite Versionsoperation, nicht allgemeine Runtime-Autoreparatur.

## 29. Recovery ist Business Logic, nicht Validator-Logik

S2D-02E bleibt bindend.

Validator erkennt z. B.:

`Target disappeared while carrying goods`

Aber die fachliche Reaktion lautet nicht „Validator verschiebt Ware zum HQ“.

Stattdessen:

`Validator/Owner erkennt ungültige Voraussetzung -> Logistics startet definierten Recovery-Kontext -> Unit liefert real zurück`

Damit bleiben Simulation und Diagnose sauber getrennt.

## 30. UI/Guidance und Fehlermeldungen

Nicht jede interne Diagnose gehört in die Spieleroberfläche.

Player-facing Feedback erhält nur fachlich sinnvolle Zustände:

- kein Arbeiter,
- Ziel unerreichbar,
- Baustelle wartet,
- Produktion blockiert.

Interne Invariant-IDs, Stack-/Trace-Details und Cross-Owner-Diagnose gehören primär in Inspector/Logs/Testausgaben.

Die endgültige UI-Ausgestaltung ist S2D-04.

## 31. Automatisierte Tests

Der Invariantenkatalog bildet später direkt eine Testbasis.

Mindestens vorzusehen:

- Unit-Tests für Owner-Invarianten,
- Contract-Tests für Pickup/Delivery/Assignment,
- Restore-Validation-Tests,
- Regressionstest für Navigation-Fail-Loops,
- Tests für Bau ohne Builder,
- Tests gegen Überlieferung,
- Tests für Recovery nach Target-Abriss,
- Tests für Pause/Continue,
- Tests für Path/Wear Save/Restore.

S2D-06 legt die konkrete Validierungs-/Release-Strategie fest.

## 32. Historische Guards und Patches

Bestehende Guards dürfen während Migration vorübergehend helfen, müssen aber klassifiziert werden.

Für jeden Guard ist später zu entscheiden:

- welche Invariante schützt er heute,
- welcher Ziel-Owner übernimmt diese Verantwortung,
- welcher Contract verhindert den Zustand künftig,
- wann kann der Guard gelöscht werden.

Ein Guard ohne dokumentierte Ablösebedingung darf nicht zur permanenten Architektur werden.

## 33. Fehler-Containment bei Rendering und Inspector

Renderer- oder Inspectorfehler dürfen Gameplay nicht beschädigen.

Beispiele:

- Path-Cache fehlerhaft -> Cache verwerfen/rebuild,
- Inspector-Panel crasht -> Gameplay läuft weiter,
- Renderer kann Snapshot nicht darstellen -> Diagnose, aber keine Owner-Mutation.

Umgekehrt darf ein kritischer Gameplay-Invariant-Fehler nicht durch Renderer/Inspector „kosmetisch“ verborgen werden.

## 34. Save-before/after Validation

Vor einem Save kann optional ein günstiger Konsistenzcheck stattfinden, um offensichtlich kaputten State nicht unbemerkt zu persistieren.

Nach Erstellung des Snapshots kann dessen strukturelle Vollständigkeit validiert werden.

Beim Restore ist die vollständige Gate-Validation verbindlich, bevor Simulation startet.

Exakte Performance-/Autosave-Strategie bleibt offen.

## 35. Keine Vollprüfung pro Frame

Verbindliche Performance-Regel:

> **Runtime-Validierung darf nicht zu einem zweiten vollständigen Simulationslauf werden.**

Daher:

- lokale Checks lokal,
- Cross-Checks an Transaktionen,
- betroffene IDs statt Welt-Sweep,
- globale Validierung nur gezielt/low-frequency/test/restore.

## 36. S2D-03G Invarianten

1. Validatoren besitzen keinen Gameplay-State.
2. Validatoren mutieren fremden State nicht direkt.
3. Owner schützen ihre lokalen Invarianten selbst.
4. Cross-System-Verträge werden an ihren Übergängen geprüft.
5. wirtschaftlich kritische Mutationen failen geschlossen.
6. physische Ware bleibt eindeutig lokalisierbar.
7. Job/Assignment/Unit bleiben konsistent.
8. carrying/recovery Units werden nicht normal neu vergeben.
9. Builder-Fortschritt ohne Ankunft ist technisch erkennbar und unzulässig.
10. Navigation-Hot-Retry ist messbar und darf nicht still eskalieren.
11. Restore startet Scheduler nur nach bestandenem Konsistenz-Gate.
12. normales Gameplay-Warten wird nicht als Invariant-Fehler behandelt.
13. Failure Containment verhindert weitere schädliche Mutation.
14. Recovery bleibt beim fachlichen Owner/Coordinator.
15. Inspector zeigt Diagnose, repariert aber nicht automatisch.
16. Rendering-/Inspectorfehler verändern keine Gameplay-Wahrheit.
17. globale Validation läuft nicht pro Frame/Tick vollständig.
18. Guards besitzen nur Übergangsstatus mit geplanter Ablösung.
19. Diagnose-/Trace-Daten sind keine zweite Runtime-Wahrheit.
20. unbekannte kritische Inkonsistenz wird nicht stillschweigend erraten/repariert.

## 37. Bewusst offen nach S2D-03G

Noch offen bleiben insbesondere:

- finale Invariant-/Error-Code-Namen,
- konkrete Logger-/Trace-Implementierung,
- Ringbuffer-Größen,
- Debug-Build-Schalter,
- genaue globale Validation-Frequenz,
- Testframework,
- konkrete Inspector-Panels,
- Crash-/Error-Reporting-Plattform,
- exakte Guard-Migrationsreihenfolge.

Diese Punkte sind für die Architekturregel nicht erforderlich.

## 38. Abgrenzung

S2D-03G entscheidet ausdrücklich nicht:

- konkrete UI des Inspectors,
- finale Spielerfehlermeldungen,
- Balancewerte,
- konkrete Implementierungsdateien,
- Implementierungsreihenfolge,
- neue Gameplay-Funktionen.

## 39. Ergebnis S2D-03G

Mit diesem Block ist festgelegt, wie die eingefrorenen Produkt-, Economy-, Workforce- und Architekturregeln technisch überprüfbar und diagnosierbar bleiben, ohne eine neue Schicht aus automatischen Runtime-Patches aufzubauen.

Die Zielarchitektur lautet:

`klare Owner -> validierte Contracts -> lokale Invarianten -> gezielte Cross-Checks -> Failure Containment -> fachliche Recovery -> Diagnose/Inspector`

statt:

`inkonsistenter State -> Guard-Patch -> nächste Inkonsistenz -> weiterer Guard-Patch`.

S2D-03G – Runtime Validation, Invariants & Failure Containment Architecture: **COMPLETE**  
Implementation Changes: **0**  
Product Scope Conflicts: **0**  
Open Blockers: **0**
