# S2D-03E – Navigation, Reachability & Path Request Architecture

Status: **COMPLETE – Bestandteil von S2D-03 TECHNICAL ARCHITECTURE V0.1 DRAFT**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-03-technical-architecture`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02 UNIT & WORKFORCE MODEL V0.1 FROZEN` + `S2D-03A/B/C/D COMPLETE`

> Konsolidierungshinweis: Dieser geschlossene Teilblock wird spätestens beim S2D-03 Freeze-Gate in `S2D-03_TECHNICAL_ARCHITECTURE.md` konsolidiert. Er ist kein zusätzliches dauerhaftes Architektur-Masterdokument.

## 1. Zweck

S2D-03E definiert die technische Zielarchitektur für Navigation, Reachability-Prüfung und Pfadanfragen.

Der Block legt fest:

- welches System Navigation autoritativ kapselt,
- welche Arten von Reachability-Prüfungen es fachlich gibt,
- wann eine grobe Erreichbarkeitsprüfung genügt,
- wann ein echter Pfad benötigt wird,
- wie Pfadanfragen dedupliziert, gecacht und invalidiert werden,
- wie Jobs und Assignments Navigation benutzen dürfen,
- wie wiederholte identische Fehlanfragen verhindert werden,
- wie Weltänderungen gezielt Navigationsergebnisse entwerten,
- wie Save/Continue mit Navigation umgeht,
- wie Inspector und Performance-Diagnose Navigation beobachten dürfen.

Nicht festgelegt werden die interne A*-Implementierung, konkrete Grid-/Graph-Datenstrukturen, Heap-Strukturen, finale Heuristik, exakte Cache-Größen, Millisekundenwerte oder Worker-Thread-Technik.

## 2. Zentrale Regel

> **Alle Gameplay-Systeme greifen auf Navigation ausschließlich über einen gemeinsamen NavigationService zu.**

Kein Production-, Construction-, Resident-, Hunter-, Logistics- oder Guard-Modul darf eigene unabhängige A*-Aufrufe oder Reachability-Wahrheiten führen.

Zielbild:

`Consumer -> NavigationService -> Reachability/Path Result`

Nicht Zielbild:

`JobEngine -> A*`
`Resident-Patch -> A*`
`Hunter-Patch -> A*`
`Builder-Guard -> A*`
`CarrierRuntime -> A*`

mit jeweils eigenen Retry-Schleifen.

## 3. NavigationService als technischer Owner

Der NavigationService besitzt nicht Units oder Jobs. Er besitzt fachlich-technisch:

- die gültige begehbare Navigationsrepräsentation,
- Zugang zu statischen und relevanten dynamischen Blockern,
- Reachability-Prüfungen,
- Pfadsuche,
- Navigation-Cache,
- Invalidierung von Navigationsergebnissen,
- Deduplizierung gleichwertiger Anfragen,
- Diagnose-/Performance-Metriken.

Unit-Systeme besitzen weiterhin Position und Bewegungszustand. Navigation liefert nur die Information, ob und wie ein Ziel erreichbar ist.

## 4. Drei Ebenen der Navigation

Nicht jede Fragestellung benötigt sofort einen vollständigen A*-Pfad.

### Ebene 1 – Structural Reachability

Billige bzw. grobe Prüfung, ob Quelle und Ziel grundsätzlich im selben begehbaren Zusammenhang liegen können.

Beispiele:

- gleiches zusammenhängendes Navigationsgebiet,
- gültiger Gebäudezugang vorhanden,
- Ziel liegt nicht in eindeutig unzugänglichem Bereich,
- Quell-/Ziel-Dockingpunkt ist nicht strukturell blockiert.

Ergebnis fachlich:

- `REACHABLE_POSSIBLE`,
- `UNREACHABLE_STRUCTURAL`,
- `UNKNOWN / NEEDS_EXACT_CHECK`.

Die konkreten Enum-Namen bleiben offen.

### Ebene 2 – Exact Reachability Check

Prüft für eine konkrete Start-/Zielkombination, ob aktuell ein echter Weg existiert.

Diese Ebene darf intern A* oder einen äquivalenten Algorithmus verwenden.

Sie wird benötigt, bevor eine kostspielige oder bindende Zuweisung erfolgt, wenn Ebene 1 nicht ausreichend beweist, dass der Weg möglich ist.

### Ebene 3 – Actual Path Request

Erzeugt einen konkreten Pfad für eine bereits gültige Bewegungsabsicht einer Unit.

Ein Assignment darf nicht für jede Kandidatenprüfung vollständige Wege für alle Units erzeugen. Kandidatenauswahl und tatsächliche Bewegung werden getrennt behandelt.

## 5. Reachability vor Assignment

S2D-02C bleibt verbindlich:

> Ein Job soll möglichst vor Zuweisung als erreichbar geprüft werden.

Zielablauf:

`Job gültig -> Kandidat capability/availability -> structural reachability -> falls nötig exact reachability -> Kandidat auswählbar -> Assignment -> actual path request`

Damit wird verhindert, dass erst eine Person gebunden wird und anschließend in einer Fail-Schleife festgestellt wird, dass Quelle oder Ziel nicht erreichbar sind.

## 6. Transport-Check

Für Transportjobs muss Navigation mindestens zwei fachliche Strecken berücksichtigen:

1. Unit -> Pickup,
2. Pickup -> Delivery.

Eine Unit darf nicht gebunden werden, wenn bereits eindeutig feststeht, dass die Transportkette strukturell unmöglich ist.

Es ist nicht zwingend notwendig, vor Assignment zwei komplette Pfade dauerhaft zu berechnen und zu speichern. Der NavigationService darf mit Reachability-/Connectivity-Informationen arbeiten.

Nach Pickup wird der tatsächliche Delivery-Pfad aus der realen aktuellen Position berechnet.

## 7. Builder-Check

Für Builderjobs gilt:

`freie geeignete Unit -> gültiger Build-Zugang -> erreichbar -> Assignment -> tatsächlicher Weg -> Arrival -> Baufortschritt`

Ein vollständig versorgtes Gebäude darf nicht bei jedem Tick für jeden Builder erneut A* auslösen, wenn der Build-Zugang strukturell nicht erreichbar ist.

Der Job geht stattdessen in einen diagnosierbaren Block-/Backoff-Zustand.

## 8. Produktions- und Spezialisten-Check

Produktionsjobs verwenden denselben NavigationService.

Beispiele:

- Holzfäller: Unit -> gültiger Baum/Arbeitsort,
- Steinbrucharbeiter: Unit -> gültiger Steinbereich,
- Fischer: Unit -> gültiger Arbeits-/Zugangspunkt,
- Jäger: Unit -> gültiger Annäherungs-/Arbeitsbereich zum realen Tierziel.

Je nach Produktionsart kann zusätzlich der Rückweg zum Gebäude/Outputpunkt relevant sein.

Die fachliche Regel lautet:

> Ein Produktionsziel ist nicht allein deshalb gültig, weil es existiert; die notwendige Arbeitsroute muss ebenfalls ausführbar sein.

## 9. Gebäudezugänge und Dockingpunkte

Navigation arbeitet nicht mit beliebigen Gebäudezentren als implizitem Ziel.

Gebäude stellen definierte Interaktionspunkte bereit, mindestens fachlich:

- Unit Access,
- Pickup,
- Delivery,
- Build Access,
- gegebenenfalls Work/Return Point.

Navigation prüft zu diesen gültigen Punkten.

Das verhindert:

- Wege durch Wände,
- Ziele mitten im Footprint,
- Warenstapel als blockierenden Eingang,
- scheinbar erreichbare Gebäude mit tatsächlich unbrauchbarem Zugang.

## 10. Kein A* pro Job × Unit × Tick

Folgendes Muster ist ausdrücklich verboten:

`für jeden Tick -> für jeden wartenden Job -> für jede freie Unit -> voller A*-Pfad`

Das skaliert schlecht und war bereits Ursache massiver Laufzeitprobleme.

Stattdessen gilt:

1. zuerst fachliche Eligibility,
2. danach billige Connectivity-/Reachability-Filter,
3. danach nur für relevante Kandidaten genauere Prüfung,
4. tatsächlicher Pfad erst für gebundene oder wenige finale Kandidaten.

## 11. Request Deduplizierung

Gleichwertige Navigation-Anfragen sollen innerhalb eines sinnvollen Gültigkeitsfensters zusammengefasst werden.

Fachlich gleichwertige Anfrage kann abhängig von späterem Design definiert werden durch:

- Startregion bzw. Startzelle,
- Ziel-/Interaction-Point,
- Navigation-Mode/Unit-Klasse,
- aktuelle Navigation-Revision.

Wenn mehrere Systeme oder Units dieselbe strukturelle Frage stellen, darf der NavigationService ein gemeinsames Ergebnis wiederverwenden.

Die konkrete Key-Struktur wird später implementiert.

## 12. Positive Cache-Ergebnisse

Erfolgreiche Reachability-/Path-Ergebnisse dürfen gecacht werden, solange die zugrunde liegende Navigationswelt unverändert relevant ist.

Mögliche wiederverwendbare Informationen:

- zwei Regionen sind verbunden,
- Gebäudezugang ist aus Region X erreichbar,
- Quell-/Zielregionen sind verbunden,
- konkreter Pfad für kurze Zeit unverändert nutzbar.

Ein Cache ersetzt nicht die Prüfung dynamischer Unit-Positionen, wenn diese relevant sind.

## 13. Negative Cache-Ergebnisse

Fehlgeschlagene Reachability-Prüfungen sind besonders wichtig zu cachen.

Historisches Problem:

`gleiche ungültige Quelle/Ziel -> erneut A* -> FAIL -> nächster Tick -> erneut A* -> FAIL ...`

Zielverhalten:

`FAIL -> FailReason + NavigationRevision/Scope -> negativer Cache/Backoff -> keine identische Vollsuche bis Invalidierung oder Fälligkeit`

Negative Ergebnisse dürfen nicht global dauerhaft sein. Sie gelten nur solange die zugrunde liegende Welt-/Zielkonstellation unverändert ist.

## 14. Navigation Revision

Der NavigationService besitzt fachlich eine oder mehrere Revisions-/Invalidierungsinformationen.

Wenn relevante Weltänderungen eintreten, werden betroffene Navigationsergebnisse ungültig.

Beispiele:

- Gebäude platziert/entfernt,
- blockierender Footprint geändert,
- Zugang geändert,
- begehbares Terrain geändert,
- später Straße/Brücke verändert Navigation,
- relevante dynamische Barriere ändert strukturelle Erreichbarkeit.

Es ist nicht erforderlich, bei jeder kleinen Weltänderung den kompletten Cache zu löschen.

Ziel ist gezielte Invalidierung nach Bereich/Region/Revision, soweit technisch sinnvoll.

## 15. Invalidierung ist ereignisgetrieben

Navigation reagiert auf definierte Weltänderungs-Events bzw. Owner-Operationen.

Beispiel:

`Building placed -> Nav topology affected -> NavigationService invalidates affected scope`

Nicht Ziel:

`NavigationService scannt permanent alle Gebäude, um herauszufinden, ob sich vielleicht etwas geändert hat.`

## 16. Dynamische Units als Blocker

Normale bewegte Personen sollen im ersten Kern nicht dazu führen, dass für jede kurzzeitige Begegnung die komplette strukturelle Reachability invalidiert wird.

Kurzfristige lokale Kollision/Ausweichbewegung und strukturelle Navigation werden getrennt behandelt.

Die genaue Crowd-/Collision-Lösung bleibt offen.

Verbindlich ist nur:

> Kurzzeitige Unit-Positionen dürfen keine globalen A*-Cache-Stürme erzeugen.

## 17. Path Request Lifecycle

Ein konkreter Pfadrequest besitzt fachlich einen kontrollierten Lebenszyklus:

`REQUESTED -> RESULT/FAIL -> CONSUMED oder INVALIDATED`

Eine Unit darf nicht bei jedem Simulation Step denselben Pfad neu anfordern, solange:

- Ziel unverändert ist,
- vorhandener Pfad gültig ist,
- keine relevante Navigation-Invalidierung eingetreten ist,
- kein konkreter Bewegungsausfall eine Neuberechnung verlangt.

## 18. Repathing

Neuberechnung eines Pfades erfolgt nur bei fachlichem Grund.

Gültige Gründe können sein:

- aktueller Pfad wurde invalidiert,
- Ziel/Interaction-Point hat sich geändert,
- Unit ist deutlich vom Pfad abgewichen,
- Weltänderung betrifft den Pfadbereich,
- temporärer Fehler ist nach Backoff erneut prüfbar.

Nicht gültiger Grund:

- „ein Tick ist vergangen“.

## 19. FailReason

Navigationsergebnisse unterscheiden fachlich Ursachen.

Mindestens sinnvoll unterscheidbar:

- invalid start,
- invalid target,
- structurally disconnected,
- no exact path,
- target removed,
- access invalid,
- request invalidated,
- temporarily blocked/retry later.

Diese Kategorien werden später mit Job-/Assignment-FailReasons abgestimmt.

Die exakten Enum-Namen bleiben offen.

## 20. Navigation und Job-Backoff

Navigation selbst verhindert identische technische Vollsuchen durch Cache/Deduplizierung.

JobEngine/Workforce verhindert zusätzlich fachliche Neuvergabe durch S2D-02C-Backoff.

Beide Ebenen ergänzen sich:

`Navigation FAIL -> technisches Ergebnis -> Job/Assignment FailReason -> fachlicher Backoff`

Nicht zulässig ist, dass Navigation selbst dauerhaft Jobzustände besitzt.

## 21. Backoff-Reaktivierung

Ein unerreichbarer Job darf erneut geprüft werden, wenn mindestens einer dieser Gründe vorliegt:

- Navigation-Revision für relevanten Bereich geändert,
- Quelle/Ziel geändert,
- neue geeignete Unit aus anderer Region verfügbar,
- definierte Backoff-Fälligkeit erreicht,
- Spieler-/Weltaktion hat die Ursache plausibel verändert.

Die erneute Prüfung startet wieder abgestuft und nicht automatisch mit einer vollständigen Massensuche.

## 22. Kandidatenauswahl und Entfernung

Distance-/Cost-Schätzung darf für Kandidatenauswahl genutzt werden, ohne für jeden Kandidaten sofort den kompletten Pfad zu erzeugen.

Mögliche Näherungen:

- Luftlinie/Manhattan-artige Schätzung,
- Regionsdistanz,
- gecachte Verbindungskosten,
- bekannte Pfadlänge aus früherer gültiger Anfrage.

Verbindlich:

> Näherung darf nur zwischen bereits grundsätzlich geeigneten/erreichbaren Kandidaten priorisieren; sie darf Capability oder strukturelle Unmöglichkeit nicht überstimmen.

## 23. Laufende Assignment-Navigation

Nach Assignment ist die Unit für ihre konkrete Bewegungsabsicht verantwortlich und nutzt den NavigationService.

Der JobEngine berechnet nicht parallel denselben Pfad.

Beispiel Transport:

`Assignment bound -> Unit asks path to Pickup -> moves -> Arrival -> Pickup -> asks path to Delivery -> moves -> Arrival -> Delivery`

Bei einem Wegfehler meldet die Unit/Navigation das Ergebnis an Assignment/Coordinator zurück; sie versucht nicht autonom unbegrenzt neu.

## 24. Recovery mit getragener Ware

Wenn eine Unit Ware trägt und der Delivery-Pfad ungültig wird, gilt S2D-02E/S2D-03D.

Navigation liefert nur:

- ursprüngliches Ziel erreichbar/unreachable,
- alternatives Recovery-Ziel erreichbar/unreachable,
- konkreten gültigen Pfad.

Logistics/Assignment entscheidet fachlich, welches Recovery-Ziel gewählt wird.

Navigation darf Ware nicht zurückbuchen oder Unit freigeben.

## 25. Save/Continue

Interne Navigation-Caches, laufende A*-Open-/Closed-Listen und konkrete PathRequest-Objekte sind transient.

Beim Continue:

1. Owner-State wird restauriert,
2. Welt-/Nav-Topologie wird aufgebaut,
3. Navigation-Revision wird neu initialisiert,
4. relevante Assignments/Recovery-Kontexte werden rekonstruiert,
5. erst danach werden neue konkrete Pfade aus der real restaurierten Unit-Position angefordert.

Ein alter Pfad wird nicht blind aus dem SaveGame fortgeführt.

## 26. Navigation und Path/Wear

Navigation und sichtbare Trampelpfade sind getrennte Systeme.

Navigation entscheidet, wo eine Unit laufen kann/soll.

PathSystem erhält tatsächliche Bewegung und erhöht lokale Wear-Werte.

Ein vorhandener Trampelpfad darf später Navigationkosten beeinflussen, falls dies als Gameplayregel beschlossen wird. Aktuell wird diese Kopplung nicht vorweggenommen.

## 27. Navigation und Rendering

Renderer darf:

- aktuelle Unit-Pfade optional für Debug darstellen,
- Reachability-/Interaction-Points visualisieren,
- Diagnoseinformationen zeigen.

Renderer darf nicht:

- Pfade erzeugen,
- Reachability ändern,
- Blocker korrigieren,
- Navigation-Cache manipulieren.

## 28. Inspector

Inspector erhält read-only Navigation-Diagnose.

Mindestens sinnvoll:

- Anzahl PathRequests,
- Cache Hits/Misses,
- positive/negative Cache-Hits,
- Exact-Search-Anzahl,
- Success/Fail-Verhältnis,
- häufigste FailReasons,
- Jobs im Navigation-Backoff,
- aktuelle Navigation-Revision,
- optional betroffene Regionen/Scopes,
- teuerste/auffälligste Requests.

Kontrollierte Debug-Commands dürfen z. B. Cache invalidieren oder einen einzelnen Test-Request auslösen, aber nicht heimlich Gameplay-State korrigieren.

## 29. Performance-Budget-Prinzip

Navigation erhält ein messbares Laufzeitbudget innerhalb des zentralen Schedulers.

Das bedeutet nicht, dass bereits ein Millisekundenwert festgelegt wird.

Verbindlich ist:

- Sucharbeit muss messbar sein,
- Vollsuchen dürfen nicht unbegrenzt pro Step explodieren,
- Requests können bei Bedarf kontrolliert über mehrere Steps verteilt werden,
- Gameplay darf durch Pathfinding-Spikes nicht regelmäßig hängen,
- Debug-Diagnose soll Ursache und Verbraucher sichtbar machen.

## 30. Keine stillen Fallback-Teleports

Wenn Navigation scheitert, darf eine Unit nicht als Komfortmaßnahme einfach zum Ziel teleportiert werden.

Zulässig sind nur klar definierte Debug-Funktionen außerhalb normalen Gameplays.

Im Produktivablauf gilt:

`unreachable -> sichtbarer Block-/Wait-/Recovery-Zustand -> kontrollierte Reaktion`

## 31. Keine Navigation als zweiter Scheduler

NavigationService besitzt keine eigene unabhängige Gameplay-Endlosschleife.

Er wird über den zentralen Scheduler bzw. definierte Requests betrieben.

Async-Technik oder Worker dürfen später intern verwendet werden, müssen aber ihre Resultate kontrolliert in die Scheduler-/Owner-Phasen zurückführen.

## 32. Migrationsregeln für historische Navigation

Historische direkte A*-Nutzung wird schrittweise ersetzt.

Zu migrieren sind insbesondere:

- Carrier-/Job-Pfade mit eigenen Suchaufrufen,
- Resident-Workforce-Pfadlogik,
- Builder-/Guard-Reachability,
- Hunter-spezifische Suchpfade,
- Runtime-Guards mit eigenen Navigationstests,
- wiederholte Fail-Requeues ohne Navigation-Revision/Backoff.

Migrationsregel:

> Erst NavigationService-Vertrag herstellen, dann Verbraucher nacheinander umstellen; nicht alle Pfadmechaniken gleichzeitig neu erfinden.

## 33. Verbindliche S2D-03E-Invarianten

1. Alle Gameplay-Navigation läuft über einen gemeinsamen NavigationService.
2. Kein Feature-Modul besitzt dauerhaft eigene A*-Ownership.
3. Reachability und konkreter Pfad sind getrennte Fragen.
4. Nicht jede Kandidatenprüfung erzeugt einen vollständigen Pfad.
5. Vor Assignment wird Erreichbarkeit soweit sinnvoll geprüft.
6. Actual Path Request erfolgt für konkrete Bewegungsabsicht.
7. Identische/gleichwertige Requests werden dedupliziert bzw. gecacht.
8. Negative Ergebnisse werden kontrolliert wiederverwendet, statt sofort erneut vollständig gesucht.
9. Weltänderungen invalidieren Navigation gezielt.
10. Repathing benötigt einen fachlichen Grund, nicht nur einen neuen Tick.
11. Navigation-Fail führt zu diagnosierbarem Job-/Assignment-Backoff.
12. Ein Fail eines Jobs darf keine globale Navigation blockieren.
13. Kurzlebige Unit-Bewegung erzeugt keine globale Cache-Invalidierungsflut.
14. Getragene Ware bleibt bei Navigation-Fail bei der Unit und folgt Recovery-Regeln.
15. SaveGame speichert keine internen A*- oder PathRequest-Strukturen.
16. Continue berechnet konkrete Pfade aus restauriertem Owner-State neu.
17. Navigation besitzt kein zweites Job-/Unit-/Waren-State-Modell.
18. Renderer/UI/Inspector dürfen Navigation nur über öffentliche Verträge lesen bzw. kontrollierte Commands nutzen.
19. Keine Teleports als produktiver Fehler-Fallback.
20. Navigation-Arbeit ist messbar und budgetierbar.

## 34. Bewusst offen für spätere technische Detailentscheidung

Nicht in S2D-03E festgelegt:

- exakte Navigationsgrid-Auflösung,
- A*-Heuristik,
- Hierarchical Pathfinding,
- Flow Fields,
- NavMesh vs. Grid,
- konkrete Region-/Component-Datenstruktur,
- Cache-Key-Implementierung,
- Cache-Größe/Eviction,
- konkrete Backoff-Zeiten,
- maximale Searches pro Tick,
- Async/Worker-Nutzung,
- lokale Collision Avoidance,
- spätere Straßenkosten/-boni.

Diese Punkte dürfen erst konkretisiert werden, wenn Implementierungsplanung und Messdaten dies verlangen.

## 35. Abschluss S2D-03E

S2D-03E ist abgeschlossen, wenn:

- NavigationService als alleinige Navigationsgrenze definiert ist,
- Reachability vs. Actual Path getrennt ist,
- Assignment-/Transport-/Builder-/Production-Nutzung klar ist,
- Cache-/Deduplizierungs-/Invalidierungsprinzip definiert ist,
- A*-Fail-Storm strukturell verhindert wird,
- Save/Continue-Grenze geklärt ist,
- historische direkte Suchpfade als Migrationsbestand markiert sind,
- keine konkrete A*-Neuentwicklung vorgezogen wurde.

Ergebnis: **S2D-03E COMPLETE / 0 BLOCKER / 0 Gameplay-Codeänderungen.**
