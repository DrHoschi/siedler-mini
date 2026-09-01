# S2D-02B – Unit Lifecycle, Home, Idle & Work State Machine

Status: **COMPLETE – Bestandteil von S2D-02 UNIT & WORKFORCE MODEL V0.1 DRAFT**  
Datum: 2026-09-01  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-02-unit-workforce`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02A COMPLETE`

> Konsolidierungshinweis: Dieser geschlossene Teilblock wird spätestens beim S2D-02 Freeze-Gate in `S2D-02_UNIT_WORKFORCE_MODEL.md` konsolidiert. Er ist kein zusätzliches dauerhaftes Planungsdokument.

## 1. Zweck

S2D-02B definiert den fachlichen Lebens- und Arbeitsablauf einer Person in der Siedlung.

Der Block legt fest:

- wie eine Person in die Simulation eintritt,
- wie Home-Bindung und Zuhause funktionieren,
- welche freien/idle Zustände existieren,
- wie Freizeit außerhalb des Hauses abläuft,
- wie eine Person ein Assignment annimmt,
- wie Weg-, Arbeits-, Transport- und Rückkehrphasen getrennt werden,
- wann eine Person wieder als frei gilt,
- wie Warten, Abbruch und unerreichbare Ziele fachlich behandelt werden.

Nicht festgelegt werden technische Enum-Namen, Tickraten, Timerwerte, konkrete Pathfinding-Algorithmen oder Jobprioritäten.

## 2. Grundprinzip

Eine Person soll im sichtbaren Spiel einen nachvollziehbaren Lebensablauf besitzen:

`Entstehen -> Zuhause -> Frei -> Freizeit/Idle -> Assignment -> Weg zur Aufgabe -> Ausführung -> Abschluss -> Frei -> Rückkehr/Home/Freizeit`

Dabei gilt:

> **Eine Person ist nicht deshalb frei, weil sie gerade nicht animiert arbeitet. Entscheidend ist, ob sie noch einem gültigen Assignment gehört.**

Damit werden Tätigkeit, Bewegung und Assignment nicht miteinander vermischt.

## 3. Zwei getrennte Zustandsachsen

Für die fachliche Betrachtung werden zwei Dinge getrennt:

### 3.1 Availability / Verfügbarkeit

Beschreibt, ob die Person für neue Arbeit grundsätzlich verfügbar ist.

Mindestens:

- `FREE` – darf für ein neues passendes Assignment berücksichtigt werden,
- `ASSIGNED` – gehört bereits zu einer Aufgabe und darf nicht parallel neu vergeben werden,
- `UNAVAILABLE` – vorübergehend nicht für normale Arbeit verfügbar, z. B. während eines späteren Sonderzustands.

### 3.2 Activity / Aktivität

Beschreibt, was die Person sichtbar gerade tut.

Mindestens fachlich relevant:

- `AT_HOME`,
- `IDLE`,
- `LEISURE_WALK`,
- `MOVING_TO_TASK`,
- `WAITING_AT_TASK`,
- `WORKING`,
- `MOVING_TO_PICKUP`,
- `PICKING_UP`,
- `MOVING_TO_DELIVERY`,
- `DELIVERING`,
- `RETURNING_HOME`,
- `WAITING/BLOCKED`.

Diese Namen sind fachliche Begriffe und keine finalen technischen Enums.

## 4. Entstehung einer Person

Wenn durch ein Wohnhaus eine neue Person entsteht, gilt fachlich:

1. stabile Unit-Identität wird erzeugt,
2. Home-Bindung wird auf das zugehörige Wohnhaus gesetzt,
3. Spezialisierung/Capabilities werden gemäß Definition vergeben,
4. es existiert zunächst kein Arbeitsassignment,
5. die Person startet in einem gültigen Home-/Free-Zustand.

Eine neue Person darf nicht ohne Home-Bindung als frei herumstehende Workforce-Unit erzeugt werden, solange keine spätere Sonderregel dies ausdrücklich vorsieht.

## 5. Zuhause / AT_HOME

`AT_HOME` bedeutet:

- die Person gehört keinem aktiven Arbeitsassignment,
- sie befindet sich fachlich zuhause bzw. im Wohnhaus,
- sie ist grundsätzlich frei und kann für geeignete neue Arbeit berücksichtigt werden,
- sie muss nicht dauerhaft als sichtbares Sprite vor dem Haus stehen.

Das Zuhause ist damit sowohl Wohnort als auch möglicher Idle-Ausgangspunkt.

Eine Person kann aus `AT_HOME` direkt ein Assignment erhalten.

## 6. Frei / FREE

`FREE` ist kein sichtbarer Ort, sondern ein Verfügbarkeitszustand.

Eine freie Person kann gleichzeitig:

- zuhause sein,
- vor dem Haus idle stehen,
- sich auf einem kurzen Freizeitweg befinden,
- nach einer erledigten Aufgabe gerade heimkehren, sofern die Rückkehr für neue Arbeit unterbrechbar definiert ist.

Für den V1-Kern wird fachlich festgelegt:

> **Eine Person nach abgeschlossenem Assignment wird wieder frei; eine anschließend gestartete Heimkehr ist normales Lebensverhalten und kein künstlich verlängerter Arbeitsjob.**

Ob eine heimkehrende freie Person sofort für neue Arbeit umgeleitet werden darf, wird in einem späteren Assignment-/Prioritätsblock präzisiert.

## 7. Idle außerhalb des Hauses

Wenn eine freie Person nicht zuhause bleibt, darf sie gelegentlich sichtbar vor bzw. in sinnvoller Nähe ihres Hauses erscheinen.

Idle-Verhalten kann enthalten:

- kurz vor dem Haus stehen,
- kleine lokale Bewegung,
- kurze Wartephase,
- Rückkehr ins Haus.

Es darf keine ziellose weltweite Wanderung entstehen.

Der Freizeitbereich ist grundsätzlich lokal an das Zuhause gebunden.

Die genauen Radien, Zeiten und Zufallswerte werden später festgelegt.

## 8. Freizeitbewegung / LEISURE_WALK

Eine Freizeitbewegung ist **kein Workforce-Assignment**.

Sie darf daher:

- keine Spezialisierung verändern,
- keine Jobreservierung erzeugen,
- keine Ware aufnehmen,
- keine Produktions- oder Bauwirkung auslösen.

Freizeitbewegung erzeugt jedoch echte Bewegung in der Welt und darf daher grundsätzlich zum Trampelpfad-/Wear-System beitragen.

## 9. Assignment-Annahme

Ein neues Assignment darf nur angenommen werden, wenn mindestens gilt:

- Person ist fachlich verfügbar,
- benötigte Capability ist vorhanden,
- Ziel/Quelle sind gültig,
- fachliche Voraussetzungen des Jobs sind noch erfüllt,
- erforderliche Erreichbarkeit ist gegeben bzw. vor Zuweisung ausreichend geprüft.

Mit erfolgreicher Annahme wechselt die Verfügbarkeit von `FREE` zu `ASSIGNED`.

Ab diesem Zeitpunkt darf dieselbe Person nicht parallel einem zweiten normalen Assignment zugewiesen werden.

## 10. Assignment ist über mehrere Aktivitäten hinweg aktiv

Ein Assignment endet nicht, nur weil ein einzelner Bewegungsabschnitt abgeschlossen wurde.

Beispiel Bauarbeiter:

`Assignment Builder -> MOVING_TO_TASK -> Ankunft -> WORKING -> Bauabschnitt/Job abgeschlossen -> Assignment Ende`

Beispiel Transport:

`Assignment Transport -> MOVING_TO_PICKUP -> PICKING_UP -> MOVING_TO_DELIVERY -> DELIVERING -> Assignment Ende`

Während der gesamten Kette bleibt die Person `ASSIGNED`.

## 11. Weg zur Aufgabe / MOVING_TO_TASK

Für normale Arbeitsassignments gilt:

- die Person läuft real zum fachlichen Ziel,
- bloße Zuweisung zählt nicht als Ankunft,
- der Job darf seine Arbeit nicht vor Erreichen des gültigen Arbeits-/Dockingpunkts starten,
- die Person bleibt während des Weges vollständig dem Assignment zugeordnet.

Dies ist insbesondere für Baustellen verbindlich:

`Builder zugewiesen` ist nicht dasselbe wie `Builder angekommen`.

## 12. Ankunft

Eine Person gilt fachlich erst dann als am Ziel angekommen, wenn der für die Aufgabe definierte gültige Ziel-/Interaktionsbereich tatsächlich erreicht wurde.

Erst dann darf die nächste Assignment-Phase beginnen.

Das verhindert:

- Bau aus Entfernung,
- Pickup ohne Quelle zu erreichen,
- Delivery ohne Zielkontakt,
- Produktion, obwohl der Worker nur irgendwo in Gebäudenähe steht.

Die genaue technische Toleranz/Distanz gehört in S2D-03.

## 13. Warten am Ziel / WAITING_AT_TASK

Eine zugewiesene Person kann am Ziel kurz oder länger warten, wenn die Aufgabe noch gültig ist, aber eine unmittelbar notwendige Bedingung temporär fehlt.

Beispiele:

- Übergang zwischen Arbeitsschritten,
- Zielzustand wird gerade abgeschlossen,
- kurzzeitige fachliche Synchronisation mit Gebäude/Job.

Warten bedeutet nicht automatisch Assignment-Ende.

Langfristig ungültige Bedingungen müssen dagegen zu kontrollierter Freigabe/Abbruch führen und dürfen keine permanent festhängende Unit erzeugen.

## 14. Arbeiten / WORKING

`WORKING` bedeutet, dass die fachliche Wirkung der Aufgabe tatsächlich ausgeführt wird.

Beispiele:

- Builder erzeugt Baufortschritt,
- Holzfäller bearbeitet den gewählten Baum,
- Steinbrucharbeiter baut Stein ab,
- Fischer führt Fischereiarbeit aus,
- Jäger führt die Jagdhandlung aus.

Nur eine Unit mit gültigem Assignment, erforderlicher Capability und gültigem Ziel darf diesen Zustand erreichen.

## 15. Produktionsarbeit und Rückkehr zum Gebäude

Bei Produktionsberufen kann ein Arbeitsassignment mehrere räumliche Teilphasen enthalten.

Beispielhaft:

`Produktionsgebäude -> Arbeitsziel suchen -> Worker läuft zum Ziel -> arbeitet -> kehrt zum Produktions-/Outputpunkt zurück -> Output entsteht/übergibt -> Assignment/Zyklus endet`

Welche Ware bereits am Rohstoffziel entsteht und was erst bei Rückkehr als Output gebucht wird, wird pro Produktionsart später präzisiert. Die S2D-01-Regel bleibt unverändert: fertige Ware entsteht im lokalen Produktionsbestand und nicht direkt im HQ.

## 16. Transport-State-Machine

Ein einfacher physischer Warentransport besitzt fachlich mindestens:

1. `ASSIGNED_TRANSPORT`
2. `MOVING_TO_PICKUP`
3. `PICKING_UP`
4. `CARRYING / MOVING_TO_DELIVERY`
5. `DELIVERING`
6. `COMPLETE`

### Pickup

Erst bei erfolgreichem Pickup:

- verlässt die Ware den Quellbestand,
- befindet sie sich fachlich bei der Unit,
- sichtbares Tragen kann beginnen.

### Delivery

Erst bei erfolgreicher Delivery:

- verlässt die Ware die Unit,
- geht in Zielbestand/Baustellenbestand über,
- gilt der Transport fachlich als erfüllt.

Die Unit darf nicht vor Delivery wieder `FREE` werden.

## 17. Ware tragende Unit

Solange eine Person reale Ware trägt:

- bleibt das zugehörige Transport-Assignment aktiv,
- ist sie nicht für einen zweiten normalen Job verfügbar,
- darf die Ware nicht gleichzeitig wieder an der Quelle oder schon am Ziel gezählt werden,
- muss Abbruch/Fehler einen eindeutigen Warenzustand hinterlassen.

Die genaue Fehlerbehandlung bei unterbrochenem Transport wird in einem folgenden S2D-02-/S2D-03-Block festgelegt.

## 18. Builder-State-Machine

Für einen Bauauftrag gilt mindestens:

1. Baustelle besitzt vollständiges Material.
2. geeigneter Builder ist frei.
3. Builder erhält Assignment.
4. Builder bewegt sich zur Baustelle.
5. Builder erreicht gültigen Baupunkt.
6. erst jetzt beginnt sichtbare Bauarbeit/Baufortschritt.
7. bei Abschluss endet das Assignment.
8. Builder wird wieder frei.

Damit bleibt der in S2D-01 definierte Bauablauf zwingend erhalten.

## 19. Assignment-Abschluss

Ein Assignment gilt erst dann als abgeschlossen, wenn seine fachliche Erfolgsbedingung erfüllt ist.

Beispiele:

- Transport: reale Ware erfolgreich geliefert,
- Bau: zugewiesener Bauauftrag/Bauphase ordnungsgemäß abgeschlossen,
- Produktion: definierter Arbeitszyklus und erforderliche Rückkehr/Outputübergabe abgeschlossen,
- Jagd: gültiger Jagdvorgang einschließlich vorgesehenem Ergebnis abgeschlossen.

Nach erfolgreichem Abschluss:

- Job/Assignment-Verknüpfung wird beendet,
- Unit wird `FREE`,
- keine Capability oder Identität wird verändert,
- nächster Lebenszustand kann Home, Idle, Freizeit oder neues Assignment sein.

## 20. Rückkehr nach Hause / RETURNING_HOME

Nach Arbeit oder Freizeit kann die Person zu ihrem Home zurückkehren.

`RETURNING_HOME` ist normales Lebensverhalten.

Für die sichtbare Simulation gilt:

- Person läuft real zum gültigen Zugang ihres Wohnhauses,
- erreicht sie diesen, kann sie in `AT_HOME` wechseln,
- sie verschwindet nicht willkürlich mitten auf der Karte in den Hauszustand.

Die genaue Regel, wann eine Person nach Arbeit sofort heimkehrt oder zunächst frei vor Ort bleibt, wird später balanciert.

## 21. Neue Aufgabe während Rückkehr/Freizeit

Grundsätzlich darf das spätere Workforce-System eine freie Person auch dann für eine passende Aufgabe auswählen, wenn sie gerade Freizeit macht oder nach Hause zurückkehrt.

Dabei gilt:

- vorhandene Freizeitbewegung wird sauber beendet/umgelenkt,
- kein zweites paralleles Assignment entsteht,
- Person teleportiert nicht,
- neue Aufgabe beginnt aus der tatsächlichen aktuellen Position.

Die genaue Auswahl-/Prioritätslogik gehört in den folgenden Workforce-Block.

## 22. Pause eines Produktionsgebäudes

Wenn ein Produktionsgebäude pausiert wird, gilt weiterhin S2D-01:

- keine neue Produktion starten,
- fertige Ware bleibt bestehen,
- fertige Ware darf weiter transportiert werden.

Für einen bereits laufenden Produktionsworker wird in S2D-02B fachlich festgelegt:

> **Pause darf eine Person nicht in einem ungültigen Zwischenzustand festhalten. Ein bereits aktiver Arbeitszyklus muss kontrolliert entweder zu einem sicheren Abschluss gebracht oder an einem definierten sicheren Punkt beendet werden.**

Welche Variante pro Produktionsart gilt, wird später präzisiert; ein sofortiges hartes Löschen des Assignments mitten in einer fachlich wirksamen Aktion ist nicht zulässig.

## 23. Ziel wird ungültig

Ein Assignment kann während der Ausführung seine Grundlage verlieren.

Beispiele:

- Rohstoff wurde bereits anderweitig verbraucht,
- Tier ist nicht mehr gültig/verfügbar,
- Gebäude/Baustelle wurde abgerissen,
- Transportbedarf wurde gültig aufgehoben,
- Zielzustand hat sich geändert.

Dann gilt:

1. keine fachliche Wirkung auf ein ungültiges Ziel ausführen,
2. bestehende Reservierungen/Warenzustände kontrolliert behandeln,
3. Assignment eindeutig beenden oder neu planen,
4. Unit wieder in einen gültigen Free-/Return-Zustand überführen.

Keine Unit darf dauerhaft an einem toten Assignment hängen.

## 24. Unerreichbares Ziel

Wenn ein Ziel vor oder während einer Aufgabe nicht erreichbar ist:

- keine endlose unmittelbare Neuberechnungsschleife,
- keine Arbeit aus Entfernung,
- keine Teleportation,
- kein stilles Erfolgsbuchen.

Vor Zuweisung soll Erreichbarkeit soweit möglich geprüft werden.

Wird ein Weg erst während des Assignments ungültig, muss die Aufgabe kontrolliert blockieren, abbrechen oder später erneut geprüft werden.

Die konkrete Backoff-/Retry-Strategie gehört in S2D-02C/S2D-03.

## 25. Warten vs. Blockiert

Fachlich zu unterscheiden:

### Normales Warten

- Aufgabe bleibt gültig,
- Fortschritt ist plausibel zu erwarten,
- keine Spielerreaktion zwingend nötig.

### Blockiert

- notwendige Voraussetzung ist auf absehbare Zeit nicht erfüllt,
- automatisches Fortsetzen ist aktuell nicht möglich,
- Zustand muss für Diagnose/Spielerfeedback unterscheidbar sein.

Eine Person darf nicht einfach nur `idle` erscheinen, während sie in Wahrheit einem blockierten Assignment gehört.

## 26. Ein normales Assignment pro Person

Für den V1-Kern gilt:

> **Eine Person besitzt höchstens ein aktives normales Workforce-Assignment gleichzeitig.**

Unterphasen dieses Assignments sind keine eigenen parallelen Jobs.

Beispiel Transport:

Pickup, Tragen und Delivery sind Phasen desselben Assignments.

Dies verhindert doppelte Reservierungen, widersprüchliche Ziele und konkurrierende Bewegungsbefehle.

## 27. Sichtbares Verhalten und Simulation müssen übereinstimmen

Der sichtbare Zustand einer Person muss ihren fachlichen Zustand plausibel widerspiegeln.

Beispiele:

- wer Ware trägt, muss fachlich Ware besitzen,
- wer baut, muss am Baupunkt angekommen sein,
- wer im Haus ist, soll nicht gleichzeitig sichtbar an einem Produktionsziel arbeiten,
- wer `FREE` ist, darf nicht heimlich einem zweiten aktiven Job gehören,
- wer einem Assignment zugeordnet ist, darf nicht als allgemeiner Idle-Bewohner erneut ausgewählt werden.

## 28. Home-Bindung bleibt während Arbeit bestehen

Keiner der Arbeitszustände hebt die Home-Bindung auf.

Während

- Transport,
- Bau,
- Produktion,
- Jagd,
- Wegstrecken,
- Warten

bleibt das Wohnhaus derselben Person zugeordnet.

Das Assignment speichert keinen Ersatz-Wohnort.

## 29. Save/Continue

Save/Continue muss den sichtbaren und fachlichen Unit-Zustand konsistent wiederherstellen oder eindeutig rekonstruieren.

Mindestens darf Reload nicht verursachen:

- Assigned Person wird parallel erneut vergeben,
- getragene Ware springt gleichzeitig zurück zur Quelle,
- Builder gilt nach Reload als angekommen, obwohl er es nicht war,
- Home-Bindung geht verloren,
- Rückkehr/Freizeit verwandelt sich in einen falschen Beruf,
- blockiertes totes Assignment bleibt unbegrenzt bestehen.

Welche transienten Wegsegmente neu berechnet werden dürfen, wird in S2D-03 festgelegt.

## 30. Inspector-Anforderungen

Für Diagnose soll der Inspector später getrennt anzeigen können:

- Availability (`FREE`/`ASSIGNED`/sonstiger Sonderzustand),
- Activity,
- Home,
- Assignment-ID/Typ,
- Assignment-Phase,
- aktuelles Ziel,
- gegebenenfalls getragene Ware,
- gegebenenfalls Warte-/Blockadeursache.

Dadurch wird sichtbar, ob beispielsweise eine Person äußerlich idle wirkt, intern aber noch an einem Transportjob hängt.

## 31. S2D-02B Invarianten

1. Availability, Activity, Identität, Spezialisierung und Assignment sind getrennte Konzepte.
2. Eine Person besitzt höchstens ein aktives normales Workforce-Assignment.
3. Ein Assignment bleibt über alle notwendigen Weg-/Arbeitsphasen aktiv.
4. Assignment-Ende erfolgt erst nach fachlicher Erfolgs- oder kontrollierter Abbruchbedingung.
5. Zuweisung ist nicht Ankunft.
6. Arbeit darf erst am gültigen Interaktionspunkt beginnen.
7. Transport endet erst nach realer Delivery.
8. Eine Ware tragende Unit bleibt assigned.
9. Nach Assignment-Ende wird die Person wieder frei, ohne Identitätsänderung.
10. Home-Bindung bleibt während jeder Arbeit erhalten.
11. Freizeit ist kein Workforce-Assignment.
12. Freie Freizeit-/Rückkehrbewegung darf für neue Arbeit kontrolliert unterbrochen werden.
13. Ungültige Ziele dürfen keine fachliche Wirkung mehr erhalten.
14. Unerreichbarkeit darf keine Endlosschleife oder Teleportation erzeugen.
15. Blockiertes Assignment darf nicht als normales Idle kaschiert werden.
16. Pause darf laufende Personen nicht in inkonsistenten Zwischenzuständen hinterlassen.
17. Sichtbarer und fachlicher Unit-Zustand müssen zusammenpassen.
18. Save/Continue darf keine Doppelvergabe oder Zustandsduplikation erzeugen.

## 32. Was S2D-02B bewusst offen lässt

Noch nicht festgelegt werden:

- konkrete State-/Enum-Namen,
- exakte Idle-/Freizeitzeiten,
- genaue Freizeit-Radien,
- genaue Auswahlregel, ob Heimkehr sofort unterbrochen wird,
- Jobprioritäten,
- Auswahl zwischen mehreren geeigneten Personen,
- Spezialisten-vs.-Hilfsbewohner-Zeitfenster,
- konkrete Retry-/Backoff-Zeiten,
- technische Path-Request-Ownership,
- konkrete Assignment-Datenstruktur,
- genaue Produktions-Unterphasen je Gebäudetyp,
- Verhalten einer getragenen Ware bei endgültigem Transportabbruch,
- Bewohnerumzug und Hausabriss,
- Schichtsysteme, Bedürfnisse oder Tageszeiten.

Diese Punkte gehören in die folgenden S2D-02-Blöcke, S2D-03 oder spätere Erweiterungen.

## 33. Abschluss S2D-02B

Der fachliche Personenlebenszyklus von Home/Idle über Assignment, reale Weg- und Arbeitsphasen bis Abschluss und Rückkehr ist damit geschlossen definiert.

**S2D-02B – Unit Lifecycle, Home, Idle & Work State Machine: COMPLETE**  
**Implementation changes: 0**  
**Product scope conflict gegenüber S2D-00/S2D-01 FROZEN: 0**
