# S2D-02 – UNIT & WORKFORCE MODEL

Status: **V0.1 FROZEN – PASS / 0 BLOCKER**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-02-unit-workforce`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN`  
Freeze-Gate: `S2D-02F – Internal Consistency & Freeze Gate – PASS / 0 BLOCKER`

## 1. Zweck

Dieses Dokument definiert das verbindliche fachliche Unit- und Workforce-Modell des ersten vollständigen Wirtschaftskerns.

Es legt fest:

- welche Unit-Kategorien fachlich existieren,
- was dauerhafte Identität, Spezialisierung, Capability und Assignment bedeutet,
- wie Bewohner leben, arbeiten, warten, heimkehren und wieder frei werden,
- wie Jobs zu geeigneten Personen gelangen,
- wie Spezialisten, Wohnraum und verfügbare Workforce zusammenhängen,
- wie Unterbrechung, Abbruch und Recovery ohne Zombie-Assignments oder Warenverlust funktionieren.

Nicht festgelegt werden technische Klassen, Enums, Stores, konkrete Scheduler-Algorithmen, Tickraten, Timerwerte, Persistenzformate, finaler Content oder Balancewerte. Diese Punkte gehören nachgelagert insbesondere in S2D-03 und S2D-05.

---

# S2D-02A – Unit Types, Identity & Capability Model

## 2. Zentrale Identitätsregel

Eine Unit besitzt eine dauerhafte fachliche Identität.

> **Eine temporäre Aufgabe darf den Unit-Typ bzw. die Identität einer Person nicht verändern.**

Das historische Verhalten

`resident -> type=carrier -> Transport -> type=resident`

ist keine Zielarchitektur.

Stattdessen gilt:

`Person/Identität + Spezialisierung + Capabilities + aktuelles Assignment`

Beispiel:

`Bewohner + CAN_SIMPLE_TRANSPORT + Transport-Assignment`

Die Person bleibt während des gesamten Vorgangs derselbe Bewohner.

## 3. Vier getrennte Ebenen

### 3.1 Identität

Die Identität beschreibt, **was die Unit dauerhaft ist**.

Eine Person besitzt mindestens:

- stabile Unit-ID,
- Zugehörigkeit zur Siedlung,
- gegebenenfalls Home-Bindung.

### 3.2 Spezialisierung / Beruf

Die Spezialisierung beschreibt, für welche fachlichen Arbeiten eine Person vorgesehen oder qualifiziert ist.

Im V1-Kern werden mindestens berücksichtigt:

- allgemeiner Bewohner,
- Carrier/Träger,
- Builder/Bauarbeiter,
- Lumberjack/Holzfäller,
- Quarry Worker/Steinbrucharbeiter,
- Fisher/Fischer,
- Hunter/Jäger.

### 3.3 Capability

Capabilities beschreiben, welche Aufgaben eine Person grundsätzlich ausführen darf.

Fachlich mindestens erforderlich:

- `CAN_MOVE`,
- `CAN_SIMPLE_TRANSPORT`,
- `CAN_BUILD`,
- `CAN_LUMBERJACK`,
- `CAN_QUARRY`,
- `CAN_FISH`,
- `CAN_HUNT`.

Diese Namen sind fachliche Arbeitsbegriffe und keine finalen technischen Enums.

### 3.4 Assignment

Ein Assignment beschreibt, was die Unit **jetzt konkret** tun soll.

Beispiele:

- einfacher Warentransport,
- Bauauftrag,
- Holzfällerarbeit,
- Steinabbau,
- Fischen,
- Jagen.

Assignments sind temporär. Sie verändern weder Identität noch dauerhaft die Spezialisierung.

## 4. Unit-Kategorien

### 4.1 Personen

Alle menschlichen Bewohner und Arbeiter sind Personen der Siedlung.

Gemeinsame fachliche Eigenschaften:

- stabile Identität,
- reale Weltposition,
- Bewegungsfähigkeit,
- Home-Bindung soweit vorgesehen,
- Capability-Set,
- Spezialisierung,
- aktuelles Assignment,
- aktueller Aktivitätszustand.

### 4.2 Tiere

Tiere sind sichtbare bewegliche Units, gehören aber nicht zur Workforce.

Sie besitzen:

- keine Bewohnerrolle,
- kein normales Workforce-Assignment,
- keine berufliche Spezialisierung.

Jäger können reale Tiere als Arbeitsziele verwenden.

## 5. Bewohner

Ein Bewohner ist eine reale Person der Siedlung mit stabiler Identität und grundsätzlich einem Zuhause.

Verbindlich gilt:

- Bewohner entstehen aus Wohnraum gemäß Gebäuderegeln,
- Bewohner bleiben Bewohner, auch wenn sie arbeiten,
- Home-Bindung bleibt von Arbeit getrennt,
- freie Bewohner dürfen zuhause bleiben oder Freizeitverhalten zeigen,
- freie geeignete Bewohner dürfen einfache allgemeine Transporte unterstützen.

`Resident` bedeutet damit nicht „arbeitslos“, sondern „Einwohner der Siedlung“.

## 6. Spezialisten

Spezialisten sind Bewohner mit fachlicher Eignung für bestimmte Arbeiten.

Beispiel:

`Person -> wohnt in Haus X -> Spezialisierung Jäger -> Assignment Jagd`

Nach Abschluss bleibt dieselbe Person:

`Person -> Haus X -> Spezialisierung Jäger -> FREE`

Spezialisierung gehört zur Person und nicht zum aktuellen Gebäudezustand oder Job.

## 7. Capability-Regeln

1. Ein Assignment darf nur an eine Person vergeben werden, die die erforderliche Capability besitzt.
2. Jobs dürfen keine Capability spontan erzeugen.
3. Arbeitskräftemangel darf nicht durch automatische Umqualifizierung kaschiert werden.
4. Allgemeine Bewohner besitzen im V1 die Möglichkeit zur einfachen Transporthilfe.
5. Spezialarbeiten wie Bauen, Holzfällen, Steinabbau, Fischen und Jagen benötigen passende fachliche Capabilities.
6. Eine Capability ist keine aktuelle Tätigkeit.
7. Ein Assignment ist keine dauerhafte Rolle.

## 8. Transporthilfe durch freie Bewohner

Verbindlicher Ablauf:

`freier Bewohner -> CAN_SIMPLE_TRANSPORT -> Transport-Assignment -> Pickup -> Transport -> Delivery -> Assignment Ende -> Bewohner wieder frei`

Dabei gilt:

- Unit-Typ bleibt unverändert,
- Home-Bindung bleibt unverändert,
- keine Carrier-Spezialisierung entsteht durch den Job,
- geeignete Carrier/Spezialisten haben grundsätzlich Vorrang.

## 9. Carrier

Ein Carrier ist eine Person mit definierter Transport-Spezialisierung.

Carrier ist nicht gleichbedeutend mit „jede Unit, die gerade Ware trägt“.

Ein normaler Bewohner kann Ware tragen, ohne Carrier zu werden.

## 10. Builder

Ein Builder ist eine Person mit `CAN_BUILD`.

Verbindlich bleibt:

`Material vollständig -> Builder-Assignment -> Builder läuft zur Baustelle -> Builder erreicht gültigen Baupunkt -> erst dann Baufortschritt`

Ein ungeeigneter Bewohner darf nicht automatisch zum Builder werden.

## 11. Produktionsspezialisten

- Holzfäller benötigen Fähigkeit für Holzfällerarbeit und reale gültige Bäume.
- Steinbrucharbeiter benötigen Fähigkeit für Steinabbau und reale gültige Steinquellen.
- Fischer benötigen Fähigkeit für Fischereiarbeit und gültige Arbeits-/Fischbereiche.
- Jäger benötigen Fähigkeit für Jagd und reale geeignete Tiere.

Allgemeine freie Bewohner ersetzen diese Spezialisten nicht automatisch.

## 12. Mehrere Fähigkeiten

Mehrere Capabilities pro Person sind grundsätzlich möglich, aber:

- sie werden bewusst vergeben,
- nicht opportunistisch während der Jobvergabe,
- dürfen keine unkontrollierten Rollenwechsel verursachen.

Konkrete Kombinationen, Ausbildung und Umschulung bleiben offen.

---

# S2D-02B – Unit Lifecycle, Home, Idle & Work State Machine

## 13. Grundablauf einer Person

Der sichtbare Lebens- und Arbeitsablauf lautet:

`Entstehen -> Zuhause -> Frei -> Idle/Freizeit -> Assignment -> Weg zur Aufgabe -> Ausführung -> Abschluss -> Frei -> Rückkehr/Home/Freizeit`

Zentrale Regel:

> **Eine Person ist nicht deshalb frei, weil sie gerade nicht sichtbar arbeitet. Entscheidend ist, ob sie noch einem gültigen Assignment gehört.**

## 14. Zwei getrennte Zustandsachsen

### 14.1 Availability

Mindestens fachlich relevant:

- `FREE` – für ein neues passendes Assignment verfügbar,
- `ASSIGNED` – bereits einer Aufgabe zugeordnet,
- `UNAVAILABLE` – vorübergehend nicht für normale Arbeit verfügbar.

### 14.2 Activity

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

Activity beschreibt sichtbares Tun; Availability beschreibt Workforce-Verfügbarkeit.

## 15. Entstehung

Beim Erzeugen einer Person gilt:

1. stabile Unit-ID entsteht,
2. Home-Bindung wird gesetzt,
3. Spezialisierung/Capabilities werden gemäß Definition vergeben,
4. zunächst besteht kein Arbeitsassignment,
5. die Person startet in gültigem Home-/Free-Zustand.

## 16. Zuhause und Freizeit

`AT_HOME` bedeutet fachlich:

- kein aktives Arbeitsassignment,
- Person ist zuhause,
- Person ist grundsätzlich frei.

Freie Personen dürfen gelegentlich sichtbar in sinnvoller Nähe ihres Hauses erscheinen, kurz stehen, lokal laufen und zurückkehren.

Freizeitbewegung:

- ist kein Workforce-Assignment,
- erzeugt keine Warenwirkung,
- erzeugt keine Jobreservierung,
- darf reale Bewegung und damit Wear/Trampelpfade verursachen.

Es entsteht keine ziellose weltweite Wanderung.

## 17. Assignment-Annahme

Ein Assignment darf nur angenommen werden, wenn mindestens:

- Person verfügbar ist,
- Capability passt,
- Job weiterhin gültig ist,
- Quelle/Ziel gültig sind,
- fachliche Voraussetzungen bestehen,
- ausreichende Erreichbarkeit vorab geprüft wurde.

Mit erfolgreicher Annahme wechselt Availability von `FREE` zu `ASSIGNED`.

Parallelvergabe derselben Person an mehrere normale Assignments ist unzulässig.

## 18. Assignment über mehrere Phasen

Ein Assignment bleibt über alle zugehörigen Bewegungs- und Arbeitsphasen aktiv.

Beispiel Builder:

`ASSIGNED -> MOVING_TO_TASK -> WORKING -> COMPLETE`

Beispiel Transport:

`ASSIGNED -> MOVING_TO_PICKUP -> PICKING_UP -> MOVING_TO_DELIVERY -> DELIVERING -> COMPLETE`

Zwischenphasen machen die Unit nicht frei.

## 19. Ankunft ist real

Eine Person gilt erst als angekommen, wenn sie den gültigen Interaktions-/Arbeitsbereich tatsächlich erreicht hat.

Dadurch sind ausgeschlossen:

- Bau aus Entfernung,
- Pickup ohne Quelle,
- Delivery ohne Zielkontakt,
- Arbeitswirkung nur aufgrund einer Zuweisung.

## 20. Warten

Eine zugewiesene Person darf kontrolliert warten, wenn die Aufgabe weiterhin gültig ist und eine temporäre Bedingung fehlt.

Warten bedeutet nicht automatisch Assignment-Ende.

Dauerhaft ungültige Bedingungen müssen dagegen zu sauberem Abbruch/Recovery führen.

## 21. Arbeiten

`WORKING` bedeutet, dass die fachliche Wirkung tatsächlich ausgeführt wird.

Nur Personen mit:

- gültigem Assignment,
- erforderlicher Capability,
- gültigem Ziel,
- tatsächlicher Ankunft

dürfen fachliche Arbeitswirkung erzeugen.

## 22. Transport-State-Machine

Verbindlicher Ablauf:

1. Assignment aktiv,
2. `MOVING_TO_PICKUP`,
3. `PICKING_UP`,
4. Ware wechselt Quelle -> Unit,
5. `MOVING_TO_DELIVERY`,
6. `DELIVERING`,
7. Ware wechselt Unit -> Ziel,
8. Assignment endet,
9. Unit wird wieder frei.

Die Unit darf nicht vor erfolgreicher Delivery wieder `FREE` werden.

## 23. Builder-State-Machine

Verbindlich:

1. Baustellenmaterial vollständig,
2. geeigneter Builder frei,
3. Builder erhält Assignment,
4. Builder läuft real zur Baustelle,
5. Builder erreicht gültigen Baupunkt,
6. erst jetzt beginnt Baufortschritt,
7. nach fachlichem Abschluss endet Assignment,
8. Builder wird frei.

## 24. Assignment-Abschluss

Ein Assignment endet erst bei erfüllter fachlicher Erfolgsbedingung.

Beispiele:

- Transport: Ware erfolgreich geliefert,
- Bau: Bauauftrag/-phase abgeschlossen,
- Produktion: definierter Arbeitszyklus vollständig,
- Jagd: vorgesehener gültiger Jagdvorgang abgeschlossen.

Danach:

- Zuordnung endet,
- Identität und Capabilities bleiben unverändert,
- Person wird wieder frei,
- Home, Freizeit oder neues Assignment können folgen.

## 25. Rückkehr nach Hause

Nach Arbeit oder Freizeit kann eine Person real zum Wohnhaus zurückkehren.

`RETURNING_HOME` ist normales Lebensverhalten und kein künstlich verlängerter Arbeitsjob.

Eine freie heimkehrende oder Freizeit ausführende Person darf später für passende Arbeit umgeleitet werden, sofern:

- kein Parallelassignment entsteht,
- keine Teleportation stattfindet,
- neue Aufgabe von der realen Position startet.

## 26. Pause laufender Produktionsarbeit

Pause bedeutet:

- keine neue Produktion starten,
- fertige Ware bleibt bestehen und darf transportiert werden,
- laufender Worker darf nicht in ungültigem Zwischenzustand hängen bleiben.

Ein aktiver Zyklus muss entweder kontrolliert zu sicherem Abschluss gelangen oder an einem definierten sicheren Punkt beendet werden.

---

# S2D-02C – Job Eligibility, Assignment Priority & Workforce Scheduling Rules

## 27. Grundprinzip der Jobvergabe

Fachlicher Ablauf:

`realer Bedarf -> Job gültig? -> Voraussetzungen gültig? -> geeignete erreichbare Personen bestimmen -> Kandidaten priorisieren -> genau eine Person zuweisen -> Assignment -> Ausführung`

Zentrale Regel:

> **Vor der Vergabe prüfen, statt erst nach der Vergabe wiederholt scheitern zu lassen.**

## 28. Job entsteht nur aus realem Bedarf

Ein Job darf nur bestehen, solange sein fachlicher Bedarf besteht.

Beispiele:

- Transport nur bei realer Ware und realem Zielbedarf,
- Builder nur bei vollständig versorgter Baustelle,
- Produktionsarbeit nur bei aktivem gültigem Gebäude und Arbeitsgrundlage,
- Jagd nur bei realem gültigem Tierziel.

Entfällt der Bedarf, darf kein Zombie-Job bestehen bleiben.

## 29. Eignungsprüfung

Eine Person ist nur geeignet, wenn mindestens:

- `FREE`,
- notwendige Capability vorhanden,
- Job fachlich gültig,
- Quelle/Ziel gültig,
- Person/Job nicht anderweitig gebunden,
- Weg grundsätzlich erreichbar,
- erforderliche Reservations-/Bestandsbedingungen erfüllt.

Eignung ist jobbezogen. `FREE` allein bedeutet nicht „für jeden Job geeignet“.

## 30. Spezialisten-Vorrang

Für passende Fachaufgaben gelten Spezialisten als bevorzugte Kandidaten.

Bei einfachen Transporten:

1. geeignete freie Carrier/Spezialisten bevorzugen,
2. wenn keine passende spezialisierte Kapazität verfügbar ist, freie Bewohner mit `CAN_SIMPLE_TRANSPORT` berücksichtigen.

Damit bleibt Bewohnerhilfe sichtbar, ohne spezialisierte Workforce wertlos zu machen.

## 31. Spezialarbeiten ohne beliebigen Fallback

Für:

- Bau,
- Holzfällen,
- Steinabbau,
- Fischerei,
- Jagd

existiert kein automatischer beliebiger Bewohner-Fallback.

Fehlender Spezialist ist ein echter wirtschaftlicher Engpass.

## 32. Auswahl zwischen mehreren geeigneten Personen

Bei mehreren geeigneten Kandidaten soll die Auswahl nachvollziehbar und effizient sein.

Fachlich relevante Kriterien dürfen sein:

- Spezialisierungs-Passung,
- tatsächliche Verfügbarkeit,
- reale Entfernung/Erreichbarkeit,
- bereits begonnene Rückkehr/Freizeit,
- faire Verteilung über Zeit.

Der konkrete Algorithmus bleibt S2D-03 vorbehalten.

## 33. Keine unnötige Präemption

Ein bereits gültig laufendes normales Assignment wird grundsätzlich nicht nur deshalb unterbrochen, weil ein höher priorisierter Job erscheint.

Das vermeidet Thrashing und macht die Simulation verständlich.

Spätere Sonderfälle dürfen kontrollierte Präemption einführen, müssen aber Recovery-Regeln einhalten.

## 34. Reachability vor Assignment

Quelle, Ziel und relevante Interaktionspunkte sollen vor Zuweisung ausreichend auf Erreichbarkeit geprüft werden.

Ein bekanntermaßen unerreichbarer Job darf nicht immer wieder sofort derselben oder einer anderen Unit gegeben werden.

## 35. Backoff statt Fail-Schleife

Bei temporär nicht ausführbarer Arbeit gilt:

`Fehlschlag -> Grund merken -> Job zurückstellen -> Backoff -> erst später oder nach relevantem Welttrigger erneut prüfen`

Ausgeschlossen ist:

`Job -> A*-FAIL -> sofort neu -> A*-FAIL -> sofort neu ...`

Backoff verhindert heiße Workforce-/A*-Schleifen.

Konkrete Zeitwerte und Datenstrukturen bleiben technisch offen.

## 36. Relevante Retry-Trigger

Ein zurückgestellter Job darf sinnvoll neu bewertet werden, wenn sich seine Grundlage geändert haben kann, z. B.:

- Weg-/Blocking-Situation geändert,
- Gebäude/Zugang geändert,
- neue geeignete Person frei geworden,
- neue Ware verfügbar,
- Zielbedarf geändert,
- Rohstoff-/Tierziel geändert.

Ein strukturell ungültiger Job wird nicht endlos wiederbelebt.

## 37. Fairness und Starvation

Ein dauerhaft gültiger, erreichbarer und ausführbarer Job soll bei ausreichender Workforce nicht unbegrenzt verhungern.

Das Zielmodell verlangt Fairness, ohne bereits einen konkreten Aging-/Priority-Algorithmus festzulegen.

## 38. Konstruktion und Transportbedarf

Für Baustellen gilt weiterhin:

`Restbedarf = Soll - geliefert - gültig reserviert/unterwegs`

Nur positiver Restbedarf darf neue Transporte erzeugen.

Bereits vollständig gedeckter Bedarf darf keinen weiteren Carrier binden.

---

# S2D-02D – Specialist Lifecycle, Housing Binding & Workforce Availability

## 39. Workforce besteht aus realen Bewohnern

> **Jede verfügbare Arbeitskraft ist eine reale Person der Siedlung.**

Es gibt keinen zweiten abstrakten Workforce-Pool neben den sichtbaren Bewohnern.

Grundzusammenhang:

`Wohnraum -> reale Bewohner -> Spezialisierungen/Capabilities -> verfügbare Workforce`

Bevölkerung wird aus realen Bewohnern abgeleitet.

## 40. Wohnraum als Grundlage

Verbindliche Baseline:

- kleines Wohnhaus: 2 Bewohner,
- mittleres Wohnhaus: 3 Bewohner.

Wohnraum bestimmt damit die reale Personenzahl und mittelbar die maximal verfügbare Workforce.

Exakte Spawn-/Zuzugsmechaniken und spätere Bevölkerungsentwicklung bleiben offen.

## 41. Spezialist ist dieselbe Person

Ein Spezialist wird nicht als zusätzliches unsichtbares Arbeitsobjekt neben einem Bewohner geführt.

Beispiel:

`Bewohner #17 -> Home Haus #4 -> Spezialisierung Jäger`

Diese Person bleibt dieselbe Person unabhängig davon, ob sie:

- arbeitet,
- wartet,
- Freizeit hat,
- ihr Produktionsgebäude pausiert ist,
- aktuell kein gültiges Ziel besitzt.

## 42. Gebäude besitzt nicht die Person

Ein Produktionsgebäude kann Arbeit erzeugen bzw. einen passenden Spezialisten benötigen, aber es besitzt nicht die Identität dieser Person.

Wird eine Jägerhütte, Fischerhütte oder andere Arbeitsstätte pausiert oder entfernt:

- Person bleibt bestehen,
- Spezialisierung bleibt bestehen,
- Home-Bindung bleibt grundsätzlich bestehen,
- Person kann später wieder geeignete Arbeit übernehmen.

## 43. Home-Bindung

Home-Bindung und Beruf sind getrennt.

Arbeit darf Home nicht überschreiben.

Ein Bewohner kann:

- in Haus A wohnen,
- Jäger sein,
- an Hütte B arbeiten,
- nach Abschluss wieder zu Haus A zurückkehren.

## 44. Workforce-Verfügbarkeit

Eine Person kann fachlich beispielsweise sein:

- frei und geeignet,
- frei aber für konkreten Job ungeeignet,
- assigned,
- unavailable,
- in Recovery.

Für konkrete Jobvergabe zählt erst die Kombination aus:

`Availability + Capability + Jobgültigkeit + Reachability + sonstige Voraussetzungen`

## 45. Spezialistenmangel bleibt sichtbar

Fehlen geeignete Spezialisten, darf die Simulation keinen versteckten Ersatz durch beliebige Bewohner erzeugen.

Der Spieler soll unterscheiden können:

- kein passender Spezialist vorhanden,
- Spezialist vorhanden, aber beschäftigt,
- Spezialist unterwegs,
- Person/Job unerreichbar,
- allgemeine Transporthilfe knapp.

## 46. Hausabriss

Beim Abriss eines Wohnhauses dürfen Bewohner nicht einfach verschwinden.

Verbindlich:

- Unit-ID bleibt erhalten,
- Spezialisierung/Capabilities bleiben erhalten,
- bestehende wirtschaftliche Bindungen werden kontrolliert behandelt,
- alte Home-Bindung darf nicht als ungültiger Dauerverweis bestehen bleiben.

Eine fachliche Übergangslage wie `HOMELESS/RELOCATION_PENDING` bleibt möglich, ohne die genaue V1-Umzugsmechanik bereits festzulegen.

## 47. Umsiedlung

Spätere Umsiedlung darf die Home-Bindung ändern, aber nicht:

- Unit-ID,
- Personidentität,
- bestehende Spezialisierung

willkürlich neu erzeugen.

Die genaue Auswahl eines neuen Hauses und konkrete Umzugslogik bleiben offen.

## 48. Spezialistenherkunft

S2D-02 legt nur fest, dass Spezialisten reale Personen sind.

Noch offen bleiben:

- Startverteilung,
- Ausbildung,
- Rekrutierung,
- Umschulung,
- Kosten,
- Dauer,
- erforderliche Gebäude oder Werkzeuge.

Diese Entscheidungen werden nicht vorzeitig in das Workforce-Grundmodell gezogen.

---

# S2D-02E – Assignment Cancellation, Interruption & Recovery Rules

## 49. Zentrale Recovery-Regel

Jede Unterbrechung muss einen eindeutigen fachlichen Abschluss besitzen.

> **Ein Assignment darf weder halb aktiv bleiben noch Reservierungen, Ware oder Unit-Bindung ohne klaren Owner zurücklassen.**

Grundablauf:

`Ursache erkennen -> fachliche Wirkung stoppen -> Warenort klären -> Reservierung klären -> Assignment beenden oder Recovery fortführen -> Unit erst danach freigeben`

## 50. Assignment-Endzustände

Fachlich mindestens unterscheidbar:

- `COMPLETED`,
- `CANCELLED`,
- `INVALIDATED`,
- `FAILED_RECOVERABLE`,
- `FAILED_FINAL`.

Die Bezeichnungen sind keine finalen technischen Enums.

Auch ein fehlgeschlagenes Assignment muss vollständig bereinigt werden.

## 51. Kein Zombie-Assignment

Unzulässig sind insbesondere Zustände wie:

- Job hält Unit für gebunden, Unit hält sich für frei,
- Unit bleibt `ASSIGNED`, Job existiert nicht mehr,
- Reservation bleibt ohne ausführbares Assignment bestehen,
- Unit trägt Ware ohne gültigen Transport-/Recovery-Kontext,
- Ziel ist gelöscht, Assignment läuft weiter,
- Save/Continue rekonstruiert nur eine Hälfte der Zuordnung.

## 52. Gemeinsamer Abschluss von Job, Assignment und Unit

Bei regulärem oder irregulärem Ende gilt:

1. fachliche Wirkung stoppen/abschließen,
2. Jobstatus passend aktualisieren,
3. Reservationszustand erfüllen, übertragen oder freigeben,
4. realen Warenort eindeutig halten,
5. Assignment-Bindung sauber beenden,
6. Unit erst dann `FREE` setzen oder bewusst im Recovery-Zustand halten.

## 53. Transportabbruch vor Pickup

Vor erfolgreichem Pickup:

- Ware bleibt an der Quelle,
- Reservation wird freigegeben bzw. sauber zurückgeführt,
- Unit trägt keine Ware,
- Assignment endet,
- Unit wird frei,
- fortbestehender Bedarf darf später neu vergeben werden.

## 54. Transportabbruch nach Pickup

Nach Pickup befindet sich die Ware fachlich bei der Unit.

> **Nach Pickup benötigt jede Unterbrechung einen expliziten Waren-Recovery-Pfad.**

Mögliche Fälle:

1. ursprüngliches Ziel bleibt gültig -> Lieferung fortsetzen,
2. ursprüngliches Ziel ungültig, HQ/Lager gültig und erreichbar -> Ware real zurückliefern,
3. temporärer Wegfehler -> Unit bleibt mit Ware in Recovery,
4. kein gültiges Ziel erreichbar -> definierter Ausnahme-/Recovery-Zustand.

Ware darf nicht gleichzeitig auf Unit und erneut im Lager gezählt werden.

## 55. Bedarf verschwindet

### Vor Pickup

- Assignment stornieren,
- Reservation freigeben,
- Ware bleibt Quelle,
- Unit wird frei.

### Nach Pickup

- Ware bleibt Unit,
- ursprünglicher Bedarf kann enden,
- Recovery-Auftrag wird benötigt,
- bevorzugtes V1-Recovery-Ziel ist HQ/Lager, sofern gültig und erreichbar,
- zentrale Verfügbarkeit entsteht erst nach realer Delivery.

## 56. Quelle oder Ziel verschwindet

### Quelle vor Pickup ungültig

- kein Phantom-Pickup,
- Assignment ungültig,
- Reservation bereinigen,
- Unit freigeben,
- Bedarf darf später neu geplant werden.

### Ziel nach Pickup ungültig

- keine Delivery an nicht existentes Ziel,
- Ware bleibt bei Unit,
- Unit bleibt gebunden,
- Recovery zu gültigem Ziel einleiten.

## 57. Baustellenabriss

Vor Pickup:

- Bedarfe ungültig,
- Reservationsfreigabe,
- Waren bleiben an Quelle,
- Units ohne Ware werden freigegeben.

Nach Pickup:

- getragene Baustellenware bleibt real,
- Recovery zu gültigem Lager/HQ.

Bereits an der Baustelle gelieferte Ware ist kein Transportzustand mehr. Rückgewinnung/Verlust beim Abriss bleibt separate Bau-/Balanceentscheidung.

## 58. Produktionspause

Pause:

- erzeugt keine neue Produktion,
- vernichtet keine fertige Ware,
- erlaubt Transport fertiger Ware,
- darf laufenden Worker nicht hart in ungültigem Zwischenzustand löschen.

Aktiver Arbeitszyklus wird sicher abgeschlossen oder an definiertem sicheren Punkt beendet.

## 59. Produktionsgebäude-Abriss

Abriss bedeutet:

- keine neuen Produktionsassignments,
- laufende Worker kontrolliert beenden,
- Workeridentität/Spezialisierung bleibt bestehen,
- lokale fertige Ware darf nicht stillschweigend verschwinden.

Konkrete Bergungs-/Abrissregel bleibt separat offen.

## 60. Wohnhaus-Abriss während Assignment

Hausabriss darf laufende Assignments nicht unkontrolliert zerstören.

Person:

- bleibt existent,
- behält Spezialisierung/Capabilities,
- schließt gültige Arbeit kontrolliert ab oder beendet sie sicher,
- darf danach nicht dauerhaft zu gelöschtem Home zurücklaufen,
- benötigt definierten Home-/Relocation-Übergang.

## 61. Arbeitsziel verschwindet

Wenn Baum, Steinquelle, Fischziel oder Tier ungültig wird:

- keine Wirkung auf Phantomziel,
- kein Phantomoutput,
- Assignment kontrolliert beenden oder fachlich zulässig neu planen,
- Unit nicht am alten Ziel festhalten.

Ob innerhalb desselben Produktionsassignments direkt ein neues Rohstoffziel gewählt wird, bleibt pro Produktionsart offen.

## 62. Weg scheitert nach Zuweisung

Auch nach Vorab-Reachability kann ein Weg später durch Weltänderungen scheitern.

Dann gilt:

- kein sofortiger Endlos-Retry,
- Fehlschlag erfassen,
- ohne Ware Assignment beenden und Job ggf. in Backoff,
- mit Ware Recovery statt Freigabe,
- erneute Pfadsuche nur kontrolliert nach Backoff oder relevantem Trigger.

## 63. Temporärer vs. struktureller Fehler

### Temporär

Beispiele:

- kurzfristig blockierter Weg,
- Ziel noch nicht bereit,
- dynamische Situation.

Folge:

- warten/backoff,
- späterer Retry möglich.

### Strukturell

Beispiele:

- Ziel gelöscht,
- Zugang dauerhaft ungültig,
- Bedarf weggefallen.

Folge:

- Assignment beenden,
- Reservation bereinigen,
- Recovery durchführen,
- Job gegebenenfalls endgültig verwerfen.

## 64. Recovery bindet die Unit

Solange eine Person:

- reale Ware trägt,
- Rücklieferung ausführt,
- einen sicheren Abschluss eines unterbrochenen Arbeitszyklus ausführt,

ist sie nicht für neue normale Assignments verfügbar.

Erst nach Abschluss der Recovery wird sie `FREE`.

## 65. Warenort und Reservation bleiben getrennt

Vor Pickup:

`Ware Quelle + Reservation`

Bei Abbruch:

`Reservation weg -> Ware bleibt Quelle`

Nach Pickup:

`Ware Unit`

Bei Abbruch:

`ursprünglicher Bedarf/Reservation kann enden -> Ware bleibt Unit -> Recovery -> reale Delivery`

## 66. Einmaliger Abschluss

Ein Assignment darf wirtschaftlich nur einmal abgeschlossen werden.

Insbesondere unzulässig:

- doppelte Delivery,
- doppelte Reservationsfreigabe,
- doppelter Jobabschluss,
- doppelte Unit-Freigabe,
- doppelte Baustellenanrechnung.

Technische Idempotenz wird in S2D-03 umgesetzt.

## 67. Save/Continue

Save/Continue muss die dauerhaften Personeneigenschaften und wirtschaftlich kritischen Laufzeitzustände konsistent erhalten oder eindeutig rekonstruieren.

Mindestens relevant:

- Unit-ID,
- Home-Bindung,
- Spezialisierung/Capabilities,
- Assignment-Zuordnung oder rekonstruierbarer Ersatz,
- Availability/Activity soweit für sichtbare Konsistenz nötig,
- getragene Ware,
- Transport-/Recovery-Ziel,
- relevante Reservationsbezüge.

Ein Reload darf insbesondere nicht:

- temporäre Tätigkeit zur dauerhaften Identität machen,
- getragene Ware verdoppeln,
- Unit ohne Jobbindung festhalten,
- Job ohne Unitbindung als vergeben fortsetzen.

---

# S2D-02F – Internal Consistency & Freeze Gate

## 68. Prüfgegenstand

S2D-02A–E wurden gegen folgende eingefrorene Grundlagen geprüft:

- `S2D-00 PROJECT MASTER V0.1 FROZEN`,
- `S2D-01 GAME DESIGN V0.1 FROZEN`.

Prüfschwerpunkte:

- Bewohneridentität,
- Home-Bindung,
- Spezialistenmodell,
- freie Bewohner als Transporthilfe,
- Spezialisten-Vorrang,
- physische Waren-Einmaligkeit,
- Reservation/Pickup/Delivery,
- Builder-Ankunft vor Baufortschritt,
- Reachability vor Jobvergabe,
- Backoff statt A*-Fail-Schleifen,
- Pause/Abriss/Recovery,
- Save/Continue-Konsistenz,
- klare Grenze zu technischen Entscheidungen aus S2D-03.

## 69. Freeze-Ergebnis

Ergebnis der internen Konsistenzprüfung:

- Widersprüche zu S2D-00 FROZEN: **0**
- Widersprüche zu S2D-01 FROZEN: **0**
- interne Widersprüche S2D-02A–E: **0**
- fehlende NOW-Workforce-Kernpunkte: **0**
- unerlaubte Resident-Typmutation: **0**
- doppelte fachliche Workforce-Owner: **0**
- Widersprüche zur Waren-Einmaligkeitsregel: **0**
- Builder-vor-Ankunft-Ausnahmen: **0**
- erlaubte permanente A*-Fail-/Retry-Schleifen: **0**
- vorzeitig festgelegte technische API-/Store-/Enum-Details: **0 Blocker**
- offene Blocker: **0**

**S2D-02F – PASS / 0 BLOCKER**

## 70. Verbindlich eingefrorene Workforce-Prinzipien

Mit V0.1 sind insbesondere eingefroren:

1. Personen besitzen stabile Identität.
2. Bewohner bleiben Bewohner während aller Jobs.
3. Beruf/Spezialisierung, Capability, Assignment und Activity sind getrennte Ebenen.
4. Wohnraum erzeugt reale Bewohner; Bevölkerung ist daraus abgeleitet.
5. Workforce besteht aus realen Personen, nicht aus einem zweiten abstrakten Pool.
6. Freie Bewohner dürfen einfache Transporte unterstützen.
7. Geeignete Spezialisten haben Vorrang.
8. Spezialarbeiten benötigen passende Capabilities.
9. Assignment bindet eine Unit eindeutig bis Erfolg, Abbruch oder Recovery.
10. Builder erzeugt erst nach realer Ankunft Baufortschritt.
11. Pickup und Delivery verändern den realen Warenort.
12. Getragene Ware bleibt bei der Unit, bis eine reale Delivery oder Recovery-Delivery erfolgt.
13. Jobvergabe prüft fachliche Gültigkeit und Erreichbarkeit vor Zuweisung soweit möglich.
14. Unerreichbare/temporär unmögliche Jobs nutzen Backoff statt heißer Retry-Schleifen.
15. Haus-/Arbeitsgebäude-Abriss löscht keine Personidentität.
16. Laufende Assignments werden nicht beliebig wegen höher priorisierter Jobs präemptiert.
17. Recovery bindet Unit und Ware bis zu einem eindeutigen Abschluss.
18. Zombie-Assignments, Doppelreservierungen und doppelte wirtschaftliche Abschlüsse sind unzulässig.
19. Save/Continue muss Identität, Home, Spezialisierung und wirtschaftlich kritische Laufzeitzustände konsistent erhalten oder rekonstruieren.

## 71. Bewusst offen für spätere Dokumente

Nicht durch S2D-02 V0.1 eingefroren sind:

- technische Unit-/Job-/Assignment-Klassen,
- konkrete Enums und Eventnamen,
- konkrete Runtime-Owner/APIs/Stores,
- Scheduler-Datenstruktur und Tickraten,
- numerische Jobprioritäten,
- konkrete Backoff-Zeiten,
- genaue Auswahlformel zwischen mehreren Kandidaten,
- exakte Idle-/Freizeit-Timer und Radien,
- Carrier-Tragmenge,
- konkrete Startpopulation und Spezialistenverteilung,
- Ausbildung/Rekrutierung/Umschulung,
- Umsiedlungsalgorithmus,
- finaler Homeless-Zustand,
- genaue Waren-Recovery-Datenstruktur,
- Abrissrückerstattungen/Bergung,
- konkrete Produktionszyklen und Zielwechsel,
- finale SaveGame-Snapshot-Struktur.

Diese Punkte werden in S2D-03, S2D-05 oder späteren kontrollierten Entscheidungen festgelegt.

## 72. Freeze-Regel

`S2D-02 UNIT & WORKFORCE MODEL V0.1` ist ab diesem Stand **FROZEN**.

Änderungen an den eingefrorenen Workforce-Prinzipien erfolgen künftig nur kontrolliert über `S2D-07 – DECISION & CHANGE LOG`.

## 73. Abschluss

**S2D-02A – COMPLETE**  
**S2D-02B – COMPLETE**  
**S2D-02C – COMPLETE**  
**S2D-02D – COMPLETE**  
**S2D-02E – COMPLETE**  
**S2D-02F – PASS / 0 BLOCKER**  
**S2D-02 UNIT & WORKFORCE MODEL V0.1 – FROZEN**  
**Implementation changes: 0**
