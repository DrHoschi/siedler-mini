# S2D-02E – Assignment Cancellation, Interruption & Recovery Rules

Status: **COMPLETE – Bestandteil von S2D-02 UNIT & WORKFORCE MODEL V0.1 DRAFT**  
Datum: 2026-09-01  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-02-unit-workforce`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02A/B/C/D COMPLETE`

> Konsolidierungshinweis: Dieser geschlossene Teilblock wird spätestens beim S2D-02 Freeze-Gate in `S2D-02_UNIT_WORKFORCE_MODEL.md` konsolidiert. Er ist kein zusätzliches dauerhaftes Planungsdokument.

## 1. Zweck

S2D-02E definiert fachlich, wie laufende Assignments kontrolliert beendet, unterbrochen oder wiederhergestellt werden, wenn ihre Voraussetzungen während der Ausführung wegfallen.

Der Block legt fest:

- was bei ungültig werdenden Jobs geschieht,
- wie Unit und Assignment voneinander sauber freigegeben werden,
- wie Warenreservierungen behandelt werden,
- wie bereits aufgenommene Waren behandelt werden,
- was bei Pause, Abriss oder verschwundenen Zielen gilt,
- wie Wegfehler nach erfolgreicher Zuweisung behandelt werden,
- wie Zombie-Assignments, festhängende Units, Doppelreservierungen und Warenverlust verhindert werden,
- welche Zustände bei Save/Continue eindeutig erhalten oder rekonstruierbar sein müssen.

Nicht festgelegt werden konkrete Exception-Klassen, technische Eventnamen, Retry-Timerwerte, Datenstrukturen oder Persistenzformate.

## 2. Zentrale Grundregel

Jede Unterbrechung muss einen eindeutigen fachlichen Abschluss besitzen.

> **Ein Assignment darf weder halb aktiv bleiben noch seine Reservierungen, Ware oder Unit-Bindung ohne klaren Owner zurücklassen.**

Für jeden Abbruch gilt daher sinngemäß:

`Ursache erkennen -> fachliche Wirkung stoppen -> Warenzustand klären -> Reservierungen klären -> Assignment beenden/neu planen -> Unit freigeben oder Recovery fortsetzen`

## 3. Assignment-Endzustände

Ein Assignment kann fachlich mindestens in einem der folgenden Ergebnisse enden:

- `COMPLETED` – regulär erfolgreich abgeschlossen,
- `CANCELLED` – bewusst bzw. aufgrund geänderter Spielbedingungen beendet,
- `INVALIDATED` – fachliche Grundlage ist weggefallen,
- `FAILED_RECOVERABLE` – Ausführung aktuell nicht möglich, späterer neuer Versuch zulässig,
- `FAILED_FINAL` – konkrete Assignment-Ausführung kann nicht sinnvoll fortgesetzt werden.

Diese Begriffe sind fachliche Kategorien und keine finalen technischen Enums.

Wichtig ist: Auch ein fehlgeschlagenes Assignment muss vollständig abgeschlossen und seine Nebenzustände bereinigt werden.

## 4. Kein Zombie-Assignment

Ein Zombie-Assignment ist fachlich ein Zustand, bei dem mindestens eines gilt:

- Job betrachtet sich noch als vergeben, aber die Unit nicht,
- Unit betrachtet sich noch als `ASSIGNED`, aber der Job existiert nicht mehr,
- Reservierung bleibt bestehen, obwohl kein ausführbares Assignment mehr existiert,
- Unit trägt Ware, aber kein gültiger Transportkontext existiert,
- Ziel/Quelle ist verschwunden, aber Assignment läuft weiter,
- Save/Continue stellt nur eine Hälfte der Zuordnung wieder her.

Solche Zustände sind im Zielmodell unzulässig.

## 5. Grundsatz: Job, Assignment und Unit müssen gemeinsam konsistent enden

Bei regulärem oder irregulärem Ende gilt:

1. fachliche Wirkung des Assignments wird beendet,
2. Jobstatus wird passend aktualisiert,
3. Reservationen werden entweder erfüllt, übertragen oder freigegeben,
4. Unit trägt danach nur dann weiter Ware, wenn dafür ein gültiger Recovery-Kontext existiert,
5. Assignment-Bindung der Unit endet,
6. Unit wird entweder `FREE` oder befindet sich bewusst in einem definierten Recovery-Zustand.

Es darf keine Reihenfolge geben, bei der die Unit bereits wieder für neue Arbeit freigegeben wird, während alte wirtschaftliche Bindungen noch aktiv sind.

## 6. Abbruch vor Pickup

Ein Transportassignment kann beendet werden, bevor die Unit die Ware aufgenommen hat.

Dann gilt:

- Ware bleibt vollständig im Quellbestand,
- vorhandene Reservation wird freigegeben oder an einen neu erzeugten gültigen Bedarf zurückgeführt,
- Unit trägt keine Ware,
- Assignment endet sauber,
- Unit wird wieder frei,
- derselbe Bedarf darf später neu vergeben werden, wenn er weiterhin existiert.

Insbesondere darf ein abgebrochener Transport vor Pickup keinen Warenverlust erzeugen.

## 7. Abbruch nach Pickup

Nach erfolgreichem Pickup befindet sich die Ware fachlich bei der Unit.

Ein Abbruch darf diese Ware nicht einfach zurück in den Quellbestand buchen, wenn die Unit sie physisch bereits trägt.

Es gilt:

> **Nach Pickup benötigt jede Unterbrechung einen expliziten Waren-Recovery-Pfad.**

Mögliche fachliche Recovery-Ziele im V1-Kern sind:

1. ursprüngliches Ziel bleibt gültig -> Lieferung dorthin fortsetzen,
2. ursprüngliches Ziel ungültig, aber HQ/Lager erreichbar -> Ware kontrolliert zum gültigen Lager zurückführen,
3. temporärer Wegfehler -> Assignment/Transport bleibt in Recovery, ohne Ware zu duplizieren,
4. kein gültiges Ziel erreichbar -> definierter Ausnahmezustand, bis ein sicherer Recovery-Pfad möglich ist.

Die Ware darf niemals gleichzeitig bei der Unit und erneut im Lager/Quellbestand gezählt werden.

## 8. Transportbedarf verschwindet vor Pickup

Wenn ein Bedarf vor Pickup entfällt, etwa weil:

- Baustelle abgerissen wurde,
- Bedarf anderweitig gedeckt wurde,
- Zielzustand sich geändert hat,

wird das Assignment storniert und die Quellreservierung freigegeben.

Die Unit wird wieder frei.

Es entsteht kein Pickup mehr nur deshalb, weil die Unit bereits unterwegs war.

## 9. Transportbedarf verschwindet nach Pickup

Wenn der ursprüngliche Bedarf erst nach Pickup entfällt, besitzt die Unit weiterhin reale Ware.

Dann gilt:

- Ware bleibt bei der Unit,
- ursprüngliche Bedarfsreservierung gilt fachlich als nicht mehr erfüllbar,
- die Ware erhält einen Recovery-Auftrag,
- bevorzugtes V1-Ziel ist ein gültiges zentrales Lager/HQ, sofern erreichbar und aufnahmefähig,
- erst bei tatsächlicher Recovery-Delivery wechselt die Ware wieder in einen Lagerbestand.

Das verhindert sowohl Warenverlust als auch das künstliche Teleportieren zurück ins Lager.

## 10. Quelle verschwindet vor Pickup

Wenn die Quelle vor Pickup ungültig wird, etwa durch Abriss oder Bestandsänderung:

- Assignment wird ungültig,
- Reservation wird verworfen/freigegeben,
- Unit nimmt keine Phantomware auf,
- Unit wird freigegeben,
- Job/Bedarf darf später mit einer anderen gültigen Quelle neu geplant werden.

## 11. Ziel verschwindet vor Delivery

Wenn ein Ziel verschwindet, während die Unit bereits Ware trägt:

- Delivery an das nicht mehr existente Ziel ist verboten,
- Ware bleibt bei der Unit,
- Assignment wechselt fachlich in Recovery,
- ein gültiges Ersatzlager wird gesucht bzw. später erneut geprüft,
- Unit bleibt gebunden, solange sie reale Ware im Recovery-Kontext trägt.

Die Person darf in diesem Zustand nicht als `FREE` für einen neuen normalen Job erscheinen.

## 12. Baustelle wird abgerissen

### Vor Pickup

- offene Bedarfe werden ungültig,
- zugehörige Reservierungen werden freigegeben,
- noch nicht abgeholte Waren bleiben an der Quelle,
- zugewiesene Units ohne Ware werden sauber freigegeben.

### Nach Pickup

- getragene Baustellenware wird nicht vernichtet,
- sie wird nach Recovery-Regel zu einem gültigen Lager zurückgeführt,
- erst dort ist sie wieder zentral verfügbar.

### Bereits gelieferte Baustellenware

Bereits an der Baustelle befindliche Ware ist nicht mehr Teil eines Transportassignments.

Wie Abriss mit diesem Baustellenbestand wirtschaftlich umgeht – Rückgewinnung, Verlust oder Teilrückerstattung – ist eine separate Bau-/Balanceentscheidung und wird nicht durch die Transport-Recovery-Regel vorweggenommen.

## 13. Produktionsgebäude wird pausiert

Pause eines Produktionsgebäudes beendet keine bereits produzierte Ware und keine zulässigen Transportaufträge für fertige Ware.

Für laufende Produktionsassignments gilt gemäß S2D-02B:

- kein hartes Löschen mitten in einer fachlich wirksamen Aktion,
- aktiver Zyklus wird entweder sicher abgeschlossen oder an definiertem sicheren Punkt beendet,
- danach startet kein neuer Produktionszyklus,
- Worker wird sauber freigegeben bzw. kehrt in normalen Zustand zurück.

Transport von bereits fertigem Output darf weiterlaufen.

## 14. Produktionsgebäude wird abgerissen

Abriss ist stärker als Pause.

Für neue Assignments gilt:

- keine neue Produktion,
- keine neue normale Arbeiterzuweisung,
- keine neue nicht notwendige Logistik für das abzureißende Gebäude.

Für laufende Worker-Assignments gilt:

- sie werden kontrolliert beendet,
- Workeridentität/Spezialisierung bleibt erhalten,
- Unit wird danach frei bzw. kehrt nach Hause zurück.

Für lokale fertige Waren gilt:

- sie dürfen nicht stillschweigend verschwinden,
- konkrete Bergungs-/Abrissregel wird separat festgelegt,
- solange diese Regel nicht definiert ist, darf Implementierung keine implizite Vernichtung als Normalfall annehmen.

## 15. Wohnhaus wird abgerissen

Ein Hausabriss darf keine Bewohner-Assignments unkontrolliert zerstören.

Für Bewohner gilt:

- Unit bleibt existent,
- Spezialisierung/Capabilities bleiben erhalten,
- laufendes gültiges Assignment kann kontrolliert abgeschlossen oder sicher beendet werden,
- Home-Bindung muss anschließend in einen definierten Übergangszustand wechseln,
- Bewohner darf nicht mit Verweis auf das gelöschte Haus dauerhaft `RETURNING_HOME` bleiben.

Die eigentliche Umsiedlungs-/Homeless-Regel folgt S2D-02D.

## 16. Arbeitsziel verschwindet während Produktionsarbeit

Beispiele:

- Baum wurde bereits anderweitig gefällt,
- Steinquelle ist erschöpft,
- Tier ist verschwunden/ungültig,
- Fischziel ist nicht mehr nutzbar.

Dann gilt:

1. keine Wirkung auf ein nicht mehr gültiges Ziel,
2. kein Phantomoutput,
3. Assignment wird kontrolliert beendet oder innerhalb desselben Produktionskontexts neu geplant, falls das fachlich zulässig ist,
4. Unit bleibt nicht dauerhaft am alten Ziel hängen,
5. späterer neuer Job darf andere gültige Ziele berücksichtigen.

Ob innerhalb eines Assignments direkt ein Ersatz-Rohstoffziel gewählt werden darf, wird pro Produktionsart später entschieden.

## 17. Weg scheitert nach erfolgreicher Zuweisung

Auch nach einer Vorab-Reachability-Prüfung kann ein Weg später scheitern, etwa weil sich die Welt geändert hat.

Dann gilt:

- kein sofortiger Endlos-Retry,
- konkrete Wegursache wird dem Assignment/Job als Fehlschlag zugerechnet,
- ohne getragene Ware kann Assignment beendet und Job in Backoff gesetzt werden,
- mit getragener Ware wechselt die Unit in Recovery statt einfach freigegeben zu werden,
- erneute Pfadsuche erfolgt nur kontrolliert nach Backoff oder relevantem Welttrigger.

Damit wird die frühere A*-Fail-Schleife ausdrücklich auch für Laufzeitänderungen verhindert.

## 18. Temporärer vs. dauerhafter Fehler

Fachlich wird unterschieden:

### Temporär

Beispiele:

- kurzfristig blockierter Weg,
- Zielzustand noch nicht bereit,
- vorübergehend kein gültiger Pfad wegen dynamischer Situation.

Folge:

- kontrolliertes Warten/Backoff,
- späterer Retry möglich.

### Strukturell/dauerhaft

Beispiele:

- Ziel gelöscht,
- Zugang dauerhaft ungültig,
- Bedarf existiert nicht mehr.

Folge:

- Assignment beenden,
- Reservierungen bereinigen,
- Recovery durchführen,
- gegebenenfalls Job endgültig verwerfen.

Ein struktureller Fehler darf nicht als temporärer Retry unbegrenzt weiterleben.

## 19. Unit darf bei Recovery nicht doppelt vergeben werden

Solange eine Unit:

- reale Ware trägt,
- eine Rücklieferung ausführt,
- einen sicheren Abschluss eines unterbrochenen Arbeitszyklus ausführt,

ist sie für neue normale Assignments nicht verfügbar.

Erst nach fachlichem Abschluss der Recovery wird sie wieder `FREE`.

## 20. Warenreservierung und tatsächlicher Warenort

Reservierung und Warenort bleiben auch bei Fehlern getrennt.

### Vor Pickup

Ware bleibt Quelle + Reservation.

Bei Abbruch:

`Reservation weg -> Ware bleibt Quelle`

### Nach Pickup

Ware ist Unit.

Bei Abbruch:

`Reservation/ursprünglicher Bedarf kann enden -> Ware bleibt Unit -> Recovery -> neues gültiges Ziel`

Es ist unzulässig, die Reservation einfach zu löschen und gleichzeitig so zu tun, als wäre die Ware wieder im Lager.

## 21. Doppelabschluss verhindern

Ein Assignment darf wirtschaftlich nur einmal abgeschlossen werden.

Insbesondere darf bei verspäteten Events/Callbacks nicht folgendes passieren:

- Delivery wird zweimal gebucht,
- Reservation wird zweimal freigegeben,
- Job wird zweimal als komplett markiert,
- Unit wird mehrfach gleichzeitig freigegeben,
- Baustellenmaterial wird doppelt angerechnet.

Die technische Idempotenz wird in S2D-03 festgelegt; S2D-02E verlangt fachlich eindeutige Einmaligkeit.

## 22. Unterbrechung durch neuen höher priorisierten Job

Der V1-Kern sieht keine beliebige Präemption laufender normaler Arbeitsassignments nur wegen eines höher priorisierten Jobs vor.

Grundregel:

> **Ein bereits gültig laufendes Assignment wird normalerweise zu einem sicheren Abschluss geführt, statt die Unit ständig zwischen Aufgaben umzuschalten.**

Spätere Spezialfälle dürfen kontrollierte Präemption einführen, müssen dann aber dieselben Recovery-Regeln erfüllen.

Damit bleibt die Simulation ruhig und verständlich und vermeidet Thrashing.

## 23. Pause/Spielstop vs. fachlicher Abbruch

Ein globaler Spiel-Pausezustand bzw. Nicht-Ticken der Simulation ist kein Assignment-Abbruch.

Beim Fortsetzen bleiben gültige Assignments bestehen.

Nur wenn ihre fachlichen Voraussetzungen während Restore/Validierung ungültig sind, greifen Invalidierungs-/Recovery-Regeln.

## 24. Save/Continue während laufendem Assignment

Save/Continue darf keinen uneindeutigen Zwischenzustand erzeugen.

Fachlich muss nach Restore mindestens eindeutig sein:

- welche Unit welchem Assignment zugeordnet war oder ob dieses rekonstruiert wird,
- ob Ware noch an Quelle, bei Unit oder am Ziel liegt,
- welche Reservation weiterhin gültig ist,
- ob Ziel/Quelle weiterhin existiert,
- ob Assignment fortgesetzt, rekonstruiert oder kontrolliert invalidiert wird.

Besonders kritisch:

`Unit trägt Ware`

Dieser Zustand darf nach Reload weder zu doppelter Ware noch zu verlorener Ware führen.

Die konkrete Persistenzstrategie gehört in S2D-03.

## 25. Recovery nach Save/Continue

Wenn ein gespeichertes Assignment nach Restore nicht mehr fachlich konsistent rekonstruiert werden kann, gilt:

- kein stilles Weiterlaufen mit Teilzuständen,
- Zustand wird validiert,
- Ware/Reservation/Unit werden anhand ihrer autoritativen Zustände geklärt,
- Assignment wird entweder konsistent fortgesetzt oder kontrolliert beendet,
- Unit wird erst danach wieder frei.

SaveGame darf nicht durch „best effort“ neue Waren oder neue Workerrollen erfinden.

## 26. Freigabe einer Unit

Eine Unit darf erst dann wieder `FREE` werden, wenn:

- kein aktives Assignment mehr gebunden ist,
- keine für das Assignment gehaltene Ware mehr ungeklärt bei ihr liegt,
- keine exklusive Reservation mehr über diese Unit läuft,
- kein definierter Recovery-Schritt mehr offen ist.

Danach kann die Unit:

- ein neues Assignment erhalten,
- nach Hause zurückkehren,
- Freizeit/Idle aufnehmen.

## 27. Fehlerfeedback für den Spieler

Nicht jeder interne Recovery-Fall benötigt eine sichtbare Fehlermeldung.

Spielerrelevant sind vor allem strukturelle Ursachen wie:

- Gebäude/Ziel nicht erreichbar,
- Baustelle ungültig,
- Produktionsstandort ohne erreichbare Arbeitsziele,
- Ware kann nicht sinnvoll zugestellt werden.

Kurzfristige interne Recovery-Schritte dürfen unauffällig bleiben, sofern die Wirtschaft korrekt weiterläuft.

Der Developer Inspector soll dagegen Recovery-/Abbruchgründe detailliert zeigen können.

## 28. Inspector-/Diagnoseanforderung

Für ein Assignment sollte der spätere Inspector mindestens nachvollziehbar machen können:

- Assignment-ID/Jobbezug,
- Unit-ID,
- Assignment-Phase,
- Quelle/Ziel,
- Ware/Menge falls relevant,
- Reservierungszustand,
- letzter Abbruch-/Fehlergrund,
- Backoff/Recovery aktiv ja/nein,
- fachlicher Endstatus.

Für die Unit zusätzlich:

- trägt Ware ja/nein,
- Recovery-Ziel,
- weiterhin `ASSIGNED` oder wieder `FREE`.

## 29. S2D-02E Invarianten

1. Jedes Assignment besitzt einen eindeutigen fachlichen Endzustand.
2. Kein Job darf aktiv bleiben, wenn seine Unit-Bindung bereits beendet ist, und umgekehrt.
3. Abbruch vor Pickup verliert keine Ware.
4. Nach Pickup bleibt Ware bei der Unit, bis sie real an ein gültiges Ziel geliefert wurde.
5. Getragene Ware darf bei Abbruch nicht teleportiert oder doppelt gebucht werden.
6. Wegfall eines Bedarfs nach Pickup erzeugt Recovery, nicht Warenvernichtung.
7. Eine Unit mit ungeklärter/getragener Ware bleibt für neue normale Jobs gebunden.
8. Reservierungen werden bei Abbruch eindeutig erfüllt, übertragen oder freigegeben.
9. Ziel-/Quellverlust darf keine Zombie-Assignments erzeugen.
10. Wegfehler nach Zuweisung dürfen keine heiße Retry-/A*-Fail-Schleife erzeugen.
11. Strukturelle Fehler werden nicht unbegrenzt als temporär behandelt.
12. Laufende Assignments werden nicht beliebig für neue Prioritäten präemptiert.
13. Pause der Simulation ist kein fachlicher Assignment-Abbruch.
14. Save/Continue muss Warenort, Unit-Bindung und Reservation konsistent erhalten oder kontrolliert rekonstruieren.
15. Ein Assignment darf wirtschaftlich nur einmal abgeschlossen werden.
16. Unit wird erst frei, wenn alle assignmentbezogenen wirtschaftlichen Bindungen geklärt sind.

## 30. Was S2D-02E bewusst offen lässt

Noch nicht festgelegt werden:

- konkrete Retry-/Backoff-Zeiten,
- konkrete Recovery-Routenalgorithmen,
- alternative Lagerauswahl bei mehreren Lagern,
- Verhalten bei tatsächlich voller Lagerkapazität,
- Abwurf/temporäres Bodenlager von Waren,
- genaue Rückgewinnung bereits gelieferter Baustellenmaterialien bei Abriss,
- Rückgewinnung lokaler Produktionsware beim Gebäudeabriss,
- konkrete technische Assignment-/Reservation-Ownership,
- Idempotenzmechanismen/Transaktionsmodell,
- Persistenzschema,
- technische Events und Fehlercodes.

Diese Punkte gehören in S2D-03, S2D-05 oder spätere Erweiterungsblöcke.

## 31. Abschluss S2D-02E

Die fachlichen Abbruch-, Unterbrechungs- und Recovery-Regeln für Workforce-Assignments sind damit geschlossen definiert.

**S2D-02E – Assignment Cancellation, Interruption & Recovery Rules: COMPLETE**  
**Implementation changes: 0**  
**Product scope conflict gegenüber S2D-00/S2D-01 FROZEN: 0**
