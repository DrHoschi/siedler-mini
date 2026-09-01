# S2D-02C – Job Eligibility, Assignment Priority & Workforce Scheduling Rules

Status: **COMPLETE – Bestandteil von S2D-02 UNIT & WORKFORCE MODEL V0.1 DRAFT**  
Datum: 2026-09-01  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-02-unit-workforce`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02A/B COMPLETE`

> Konsolidierungshinweis: Dieser geschlossene Teilblock wird spätestens beim S2D-02 Freeze-Gate in `S2D-02_UNIT_WORKFORCE_MODEL.md` konsolidiert. Er ist kein zusätzliches dauerhaftes Planungsdokument.

## 1. Zweck

S2D-02C definiert fachlich, wie vorhandener Arbeitsbedarf zu geeigneten Personen gelangt.

Der Block legt fest:

- wann ein Job überhaupt vergabefähig ist,
- wann eine Person für einen Job geeignet ist,
- wie Spezialisten und allgemeine Hilfsbewohner priorisiert werden,
- wie zwischen mehreren geeigneten Personen ausgewählt wird,
- wann ein Job wartet statt ständig neu gesucht zu werden,
- wie fehlende Erreichbarkeit und temporäre Fehlschläge behandelt werden,
- wie Retry/Backoff verhindert, dass dieselbe ungültige Aufgabe permanent A* oder Workforce-Suche auslöst.

Nicht festgelegt werden konkrete Tickraten, Millisekundenwerte, Datenstrukturen, Heap-/Queue-Technik, A*-Implementierung oder finale numerische Prioritätswerte.

## 2. Grundprinzip

Die Workforce-Zuordnung folgt fachlich:

`realer Bedarf -> Job gültig? -> Voraussetzungen gültig? -> erreichbare geeignete Personen bestimmen -> Kandidaten priorisieren -> genau eine Person reservieren/zuweisen -> Assignment -> Ausführung`

Die zentrale Regel lautet:

> **Ein Job soll möglichst vor der Zuweisung als ausführbar geprüft werden, statt erst eine Person zu binden und anschließend in einer wiederholten Fail-Schleife festzustellen, dass Quelle oder Ziel nicht erreichbar sind.**

## 3. Job als Arbeitsbedarf

Ein Job entsteht nur aus einem realen Bedarf der Simulation.

Beispiele:

- produzierte Ware wartet auf Transport,
- Baustelle benötigt Material,
- vollständig versorgte Baustelle benötigt Builder,
- Produktionsgebäude benötigt einen passenden Arbeitszyklus,
- Jäger benötigt ein reales geeignetes Tierziel.

Ein Job darf nicht allein deshalb weiterexistieren, weil er historisch einmal erzeugt wurde. Seine fachlichen Voraussetzungen müssen weiterhin gültig sein.

## 4. Vergabefähigkeit eines Jobs

Ein Job ist nur vergabefähig, wenn mindestens gilt:

1. Bedarf existiert noch.
2. Quelle/Ziel bzw. Arbeitsobjekt existieren und sind fachlich gültig.
3. benötigte Ware/Ressource ist tatsächlich verfügbar oder korrekt reserviert.
4. der Job ist nicht bereits erfolgreich einem anderen aktiven Assignment zugeordnet.
5. benötigte Capability ist eindeutig bestimmbar.
6. erforderliche Interaktionspunkte sind gültig.
7. eine grundsätzlich sinnvolle Erreichbarkeit ist gegeben oder prüfbar.
8. Job befindet sich nicht in einem aktiven Backoff-/Cooldown-Zustand.

Fällt eine Grundvoraussetzung weg, wird der Job nicht immer wieder blind neu angeboten.

## 5. Eignung einer Person

Eine Person ist für einen konkreten Job nur geeignet, wenn mindestens gilt:

- Availability ist `FREE`,
- notwendige Capability vorhanden,
- kein anderes aktives Assignment,
- Person befindet sich in einem gültigen Lebenszustand,
- aktuelle Position erlaubt grundsätzlich den Weg zur ersten Jobstation,
- Jobquelle/-ziel sind für diese Person erreichbar,
- keine fachliche Sperre verhindert die Aufgabe,
- die Person trägt keine fremde Ware aus einem anderen Vorgang,
- erforderliche Spezialisierungsregeln werden eingehalten.

Eine bloße Nähe zum Job ersetzt keine Capability-Prüfung.

## 6. Spezialist vor Hilfsbewohner

Für Aufgaben mit passendem Spezialisten gilt grundsätzlich:

`geeigneter freier Spezialist -> vor allgemeinem Hilfsbewohner`

Für einfache Warentransporte bedeutet dies:

1. geeignete freie Carrier/Träger bevorzugen,
2. erst wenn keine sinnvoll verfügbare Carrier-Lösung vorhanden ist, dürfen freie allgemeine Bewohner mit `CAN_SIMPLE_TRANSPORT` unterstützen.

Damit bleibt der in S2D-00/S2D-01 gewünschte Bewohner-Hilfseffekt erhalten, ohne die eigentliche Carrier-Rolle bedeutungslos zu machen.

## 7. Spezialarbeiten

Für Bau, Holzfällen, Steinabbau, Fischen und Jagen gilt:

- nur Personen mit passender Capability dürfen Kandidaten sein,
- allgemeiner Bewohner ohne Capability ist kein Fallback,
- Arbeitskräftemangel bleibt sichtbar und darf nicht durch automatische Umqualifizierung kaschiert werden.

## 8. Auswahl zwischen mehreren geeigneten Personen

Wenn mehrere geeignete Personen vorhanden sind, soll die Auswahl nachvollziehbar und effizient sein.

Fachlich zu berücksichtigen sind mindestens:

- passende Spezialisierung,
- tatsächliche Verfügbarkeit,
- Entfernung zur ersten Jobstation,
- Erreichbarkeit,
- aktuelle Position statt Home-Position allein,
- unnötige Umwege vermeiden,
- nicht immer dieselbe Person bevorzugen, wenn dadurch andere dauerhaft ungenutzt bleiben.

Die genaue technische Bewertungsfunktion und numerische Gewichtung werden später festgelegt.

## 9. Nähe ist wichtig, aber nicht allein entscheidend

Die nächstgelegene Unit ist nicht automatisch die beste Kandidatin.

Beispiele:

- naher Bewohner ohne benötigte Capability ist ungeeignet,
- etwas weiter entfernter Carrier ist für Transport grundsätzlich vorzuziehen,
- naher Builder mit unerreichbarem Pfad ist kein Kandidat,
- weiter entfernter, aber erreichbarerer Worker kann die bessere Wahl sein.

Auswahl bedeutet daher mindestens:

`Eignung zuerst -> danach sinnvolle Kosten/Nähe vergleichen`

## 10. Keine parallele Doppelvergabe

Sobald eine Person verbindlich einem Job zugewiesen wird:

- wird sie `ASSIGNED`,
- darf sie nicht gleichzeitig für einen zweiten normalen Job berücksichtigt werden,
- gehört der Job nicht parallel zu einer zweiten Person,
- notwendige Reservierungen gehören eindeutig zu diesem Vorgang.

Job und Assignment müssen dieselbe Zuordnung widerspiegeln.

## 11. Reservierung bei Transport

Vor bzw. mit der verbindlichen Zuweisung eines Transportjobs muss die zu transportierende Menge eindeutig reserviert sein.

Damit gilt:

- dieselbe Ware darf nicht mehreren Transporteuren versprochen werden,
- dieselbe Baustellen-Restmenge darf nicht mehrfach bedient werden,
- bei Abbruch wird die Reservierung kontrolliert freigegeben oder neu bewertet.

Die konkreten technischen Reservierungsobjekte gehören in S2D-03.

## 12. Baustellenmaterial

Für Materialtransport zur Baustelle gilt weiterhin:

`Restbedarf = Soll - geliefert - gültig reserviert/unterwegs`

Nur positiver Restbedarf darf einen neuen Transportjob erzeugen.

Wenn durch bereits aktive Transporte der Restbedarf gedeckt ist, darf kein weiterer Carrier oder Hilfsbewohner dafür zugewiesen werden.

## 13. Builder-Zuordnung

Ein Builder-Job darf erst vergabefähig werden, wenn:

- alle erforderlichen Materialien tatsächlich an der Baustelle vorhanden sind,
- Baustelle noch nicht fertig ist,
- gültiger Bauzugang existiert,
- geeigneter Builder die Baustelle erreichen kann.

Nach Zuweisung bleibt die Baustelle `WAIT_BUILDER/BUILDER_EN_ROUTE`, bis der Builder tatsächlich angekommen ist.

## 14. Produktionsworker-Zuordnung

Ein Produktionsarbeitsjob darf nur angeboten werden, wenn das Gebäude fachlich einen neuen Arbeitszyklus beginnen darf.

Mindestens:

- Gebäude fertig,
- nicht pausiert,
- Ausgangssituation erlaubt Produktion,
- benötigtes reales Arbeitsziel/Ressource existiert,
- lokaler Ausgangsbestand blockiert den Zyklus nicht,
- passende Person ist erreichbar/einsetzbar.

Ein pausiertes oder outputvolles Gebäude darf nicht permanent Workforce-Suche auslösen.

## 15. Jobpriorität – fachliche Ebenen

Der V1-Kern benötigt eine nachvollziehbare Grundpriorisierung, aber noch kein komplexes Spieler-Micromanagement.

Fachlich können Jobs mindestens nach ihrer Bedeutung unterschieden werden:

- laufende/gebundene kritische Vorgänge sauber abschließen,
- bereits reservierte reale Transporte ausführen,
- Baustellenversorgung/Bauarbeit,
- Produktions- und normale Logistikaufgaben,
- allgemeine Hilfsarbeit,
- Freizeit ist keine Arbeit und konkurriert nicht als Job.

Die exakte Reihenfolge zwischen einzelnen produktiven Jobtypen und numerische Werte werden erst im technischen/Balance-Kontext finalisiert.

## 16. Bestehendes Assignment nicht leichtfertig verdrängen

Eine bereits zugewiesene Person soll nicht bei jedem neu auftauchenden Job umpriorisiert werden.

Grundregel:

> **Ein gültiges laufendes Assignment wird grundsätzlich zu Ende geführt, sofern kein definierter Abbruchgrund vorliegt.**

Damit werden ständiges Umkehren, Path-Neuberechnen und nie abgeschlossene Jobs vermieden.

Spätere echte Notfall-/Prioritätsmechaniken können bewusst ergänzt werden, gehören aber nicht zum V1-Kern.

## 17. Freizeit und Rückkehr sind unterbrechbar

Da Freizeit und normale Heimkehr nach abgeschlossenem Job keine Workforce-Assignments sind, darf eine `FREE` Person dabei für eine passende neue Aufgabe ausgewählt werden.

Dann gilt:

- Freizeit-/Home-Route kontrolliert beenden,
- tatsächliche aktuelle Position als Start verwenden,
- kein Teleport,
- genau ein neues Assignment erzeugen.

## 18. Kein geeigneter Worker vorhanden

Wenn für einen gültigen Job momentan keine geeignete freie Person verfügbar ist:

- Job bleibt wartend,
- Gebäude/Baustelle zeigt fachlich den passenden Engpass,
- es wird nicht künstlich eine ungeeignete Person qualifiziert,
- Workforce-System darf später erneut prüfen, wenn sich relevante Verfügbarkeit ändert.

Ein Mangel an Workforce ist ein legitimer Simulationszustand und kein technischer Fehler.

## 19. Ereignisorientierte erneute Prüfung

Ein wartender Job soll bevorzugt dann erneut berücksichtigt werden, wenn sich etwas Relevantes geändert hat.

Beispiele:

- Person wird frei,
- neues Wohnhaus erzeugt Bewohner,
- Spezialist wird verfügbar,
- Baustellenmaterial ist vollständig,
- neue Ware entsteht,
- Reservierung wird freigegeben,
- Ziel/Quelle wird wieder gültig,
- Navigation/Topologie ändert sich.

Zusätzliche periodische Sicherheitsprüfungen sind technisch möglich, aber permanente Vollsuchen jedes einzelnen wartenden Jobs sind nicht Zielarchitektur.

## 20. Erreichbarkeit vor Assignment

Vor verbindlicher Vergabe sollen relevante Wegabschnitte ausreichend auf Erreichbarkeit geprüft werden.

Bei Transport mindestens:

- Unit -> Pickup,
- Pickup -> Delivery bzw. fachlich gesicherte Verbindung Quelle/Ziel.

Bei Builder:

- Unit -> gültiger Baupunkt.

Bei Produktionsarbeit:

- Worker -> erforderlicher Arbeits-/Ressourcenpunkt,
- soweit für den Zyklus erforderlich auch Rückkehr zum Output-/Gebäudepunkt.

Die technische Optimierung darf hierfür Reachability-Caches, Komponentenprüfungen oder andere Verfahren nutzen. S2D-02C legt nur die fachliche Anforderung fest.

## 21. Unerreichbarer Job

Ist ein Job aktuell nicht erreichbar:

- keine Person wird blind wiederholt dorthin geschickt,
- Job erhält einen wartenden/blocked Zustand,
- Ursache bleibt diagnostizierbar,
- Job darf andere Jobs nicht blockieren,
- erneute Prüfung erfolgt erst nach sinnvollem Trigger oder Backoff.

Damit wird der bekannte historische A*-FAIL-Sturm ausdrücklich ausgeschlossen.

## 22. Temporärer Fehlschlag

Nicht jeder fehlgeschlagene Versuch bedeutet dauerhaft unerreichbar.

Mögliche temporäre Gründe:

- Ziel wurde gerade verändert,
- Ressource verschwand,
- Reservierung wurde ungültig,
- andere Unit hat den Bedarf bereits erfüllt,
- Gebäudezustand wechselte,
- kurzfristige Navigationsänderung.

Ein solcher Job wird kontrolliert neu bewertet, nicht sofort in einer engen Schleife erneut gestartet.

## 23. Backoff-Grundregel

Wenn dieselbe Aufgabe bzw. dieselbe Quelle-Ziel-Kombination wiederholt nicht ausführbar ist, muss die Wiederprüfung gedrosselt werden.

Fachlich gilt:

`Fehlschlag -> Grund speichern -> Job zurückstellen -> Backoff -> erst später/bei relevantem Ereignis neu bewerten`

Backoff darf die Ursache nicht verstecken und keinen gültigen Bedarf löschen.

Die genaue Zeitstaffelung gehört in S2D-03.

## 24. Backoff ist jobbezogen, nicht globale Starre

Ein problematischer Job darf nicht das gesamte Workforce-System ausbremsen.

Während Job A im Backoff wartet, dürfen Jobs B, C und D normal vergeben und ausgeführt werden.

Damit bleibt die funktionierende Wirtschaft trotz einzelner ungültiger Ziele aktiv.

## 25. Fail-Reason muss unterscheidbar bleiben

Für Diagnose und Spielerfeedback müssen mindestens fachlich unterscheidbar bleiben:

- `NO_ELIGIBLE_WORKER`,
- `NO_FREE_WORKER`,
- `SOURCE_INVALID`,
- `TARGET_INVALID`,
- `SOURCE_UNREACHABLE`,
- `TARGET_UNREACHABLE`,
- `NEED_ALREADY_SATISFIED`,
- `RESERVATION_INVALID`,
- `PAUSED`,
- `OUTPUT_FULL`.

Dies sind fachliche Gründe, keine finalen technischen Enum-Namen.

## 26. Job wird während Assignment ungültig

Wird ein bereits zugewiesener Job ungültig:

1. fachliche Wirkung sofort gegen den neuen Zustand prüfen,
2. keine falsche Pickup-/Delivery-/Bauwirkung mehr ausführen,
3. Waren-/Reservierungszustand konsistent auflösen,
4. Assignment kontrolliert beenden oder sicheren Abschluss durchführen,
5. Person wieder freigeben,
6. Job nur dann neu erzeugen/aktivieren, wenn echter Bedarf weiterhin existiert.

Kein automatisches sofortiges Reassign derselben ungültigen Aufgabe ohne Neubewertung.

## 27. Vermeidung von Job-Flattern

Das System soll vermeiden:

`Job entsteht -> Assignment -> Abbruch -> Job entsteht sofort erneut -> dieselbe Unit -> Abbruch -> ...`

Dagegen gelten:

- Jobvoraussetzungen vor Vergabe,
- eindeutige Reservierungen,
- Reachability-Prüfung,
- Fail-Reason,
- Backoff,
- ereignisorientierte Wiederaktivierung.

## 28. Fairness und Starvation

Niedriger priorisierte gültige Jobs dürfen nicht dauerhaft verhungern, nur weil immer neue ähnliche Jobs entstehen.

Die spätere technische Auswahl muss daher eine Form kontrollierter Fairness berücksichtigen, z. B. Alter/Wartezeit oder Rotation.

S2D-02C legt noch keinen Algorithmus fest, aber die fachliche Anforderung:

> **Ein dauerhaft gültiger, ausführbarer Job soll bei ausreichender Workforce irgendwann bedient werden.**

## 29. Räumliche Effizienz ohne Micromanagement

Die automatische Auswahl soll die reale Siedlungsstruktur sinnvoll nutzen.

Kurze Wege sollen tendenziell bevorzugt werden, damit gute Gebäudeplatzierung wirtschaftlich wirkt.

Der Spieler muss dafür keine einzelnen Unit-Routen definieren.

Die Workforce darf aber nicht nur nach Entfernung arbeiten und dabei Spezialisierung, Erreichbarkeit oder bereits bestehende Bindungen ignorieren.

## 30. Carrier vs. Hilfsbewohner – Beispiel

Situation:

- 1 freier Carrier 20 Einheiten entfernt,
- 1 freier allgemeiner Bewohner 5 Einheiten entfernt,
- einfacher Holztransport wartet.

Grundregel: Carrier besitzt fachlichen Vorrang.

Die spätere konkrete Auswahl darf dennoch Effizienz berücksichtigen, solange die Spezialistenpriorität nicht vollständig wirkungslos wird. Ob extreme Distanzunterschiede einen Hilfsbewohner sinnvoll vorziehen dürfen, bleibt eine spätere Balance-/Scheduling-Detailentscheidung.

Damit wird in S2D-02C bewusst keine starre numerische Schwelle erfunden.

## 31. Keine Vollsuche pro Unit und Job in hoher Frequenz

Aus den bekannten Performanceproblemen folgt als fachlich-technische Randbedingung:

- Workforce-Zuordnung darf nicht dauerhaft jedes freie Individuum gegen jeden wartenden Job mit vollständigem Pathfinding prüfen,
- wiederholte identische Reachability-Prüfungen sollen später gecacht/gebündelt werden,
- Änderungen sollen gezielt neue Prüfungen auslösen,
- Backoff begrenzt erfolglose Wiederholungen.

Die konkrete Architektur hierfür gehört in S2D-03.

## 32. Save/Continue

Nach Reload müssen wartende Bedarfe, relevante Reservierungen und aktive Assignments konsistent fortgesetzt oder eindeutig rekonstruiert werden.

Insbesondere darf ein Reload nicht:

- dieselbe Ware doppelt reservieren,
- bereits erfüllte Jobs erneut aktivieren,
- eine Unit gleichzeitig zwei Jobs zuweisen,
- alte Backoff-/Fail-Zustände unbegrenzt als tote Sperre erhalten.

Welche Runtime-Zustände gespeichert und welche rekonstruiert werden, entscheidet S2D-03.

## 33. Inspector-/Diagnoseanforderung

Der spätere Inspector soll für Jobs mindestens sichtbar machen können:

- Job-ID/Typ,
- Quelle/Ziel,
- erforderliche Capability,
- Bedarf/Menge,
- reservierte Unit,
- Assignment-Status,
- wartend/assigned/blocked/backoff,
- letzter Fail-Reason,
- Anzahl/Verlauf relevanter Fehlschläge,
- nächster erlaubter Retry bzw. Triggergrund,
- Reachability-Status soweit verfügbar.

Damit lassen sich wiederkehrende Fail-Loops erkennen, ohne Gameplay-Code zu patchen.

## 34. S2D-02C Invarianten

1. Nur realer, weiterhin gültiger Bedarf erzeugt vergabefähige Jobs.
2. Capability und Verfügbarkeit werden vor Assignment geprüft.
3. Spezialisten haben in ihrem Aufgabenbereich grundsätzlich Vorrang.
4. Allgemeine Bewohner helfen im V1 nur bei dafür vorgesehenen einfachen Aufgaben.
5. Eine Person besitzt höchstens ein normales aktives Assignment.
6. Ein Job besitzt höchstens eine aktive ausführende Person, sofern der Jobtyp nicht später ausdrücklich Mehrfacharbeit vorsieht.
7. Waren-/Bedarfsreservierungen verhindern Doppelvergabe.
8. Reachability wird soweit sinnvoll vor Zuweisung geprüft.
9. Unerreichbare Jobs erzeugen keine permanenten A*-Fail-Schleifen.
10. Wiederholte Fehlschläge führen zu Backoff bzw. ereignisorientierter Neubewertung.
11. Backoff eines Jobs blockiert keine anderen Jobs.
12. Laufende gültige Assignments werden grundsätzlich nicht ständig verdrängt.
13. Freizeit/Home-Rückkehr freier Personen darf für neue Arbeit unterbrochen werden.
14. Fachlicher Workforce-Mangel bleibt sichtbar und wird nicht durch Umtypisierung kaschiert.
15. Ein dauerhaft gültiger und ausführbarer Job darf bei ausreichender Workforce nicht dauerhaft verhungern.
16. Job- und Assignment-Zustand müssen konsistent dieselbe Zuordnung abbilden.

## 35. Was S2D-02C bewusst offen lässt

Noch nicht festgelegt werden:

- exakte numerische Jobprioritäten,
- konkreter Fairness-/Aging-Algorithmus,
- konkrete Distanzgewichtung,
- genaue Carrier-vs.-Helper-Distanzschwellen,
- Tickrate des Schedulers,
- konkrete Backoff-Zeiten/Exponentialschemata,
- konkrete Reachability-Caches,
- technische Job-Queue-Datenstruktur,
- genaue Mehrfachworker-Regeln für spätere Gebäude,
- Spieler-Prioritätsregler,
- genaue Startanzahl/Spezialistenentstehung.

Diese Punkte gehören in S2D-03, S2D-05 bzw. spätere Erweiterungen.

## 36. Abschluss S2D-02C

Eignung, Grundpriorität, automatische Auswahl, Rückstellung, Reachability und Backoff des Workforce-Systems sind damit fachlich definiert.

**S2D-02C – Job Eligibility, Assignment Priority & Workforce Scheduling Rules: COMPLETE**  
**Implementation changes: 0**  
**Product scope conflict gegenüber S2D-00/S2D-01 FROZEN: 0**
