# S2D-01 – GAME DESIGN

Status: **V0.1 FROZEN – PASS / 0 BLOCKER**  
Datum: 2026-09-01  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-01-game-design`  
Verbindliche Basis: `S2D-00 – PROJECT MASTER V0.1 FROZEN`  
Freeze-Gate: `S2D-01E – Internal Consistency & Freeze Gate – PASS / 0 BLOCKER`

## 1. Zweck

Dieses Dokument beschreibt verbindlich das Spielverhalten des ersten vollständigen Wirtschaftskerns aus Sicht des Spielers und der sichtbaren Simulation.

S2D-01 legt fest, **was im Spiel geschieht und was der Spieler beeinflusst**. Nicht festgelegt werden hier technische Owner/APIs/Datenstrukturen, die genaue Unit-/Workforce-State-Machine, konkrete UI-Layouts oder finale Content-/Balancewerte. Diese Punkte gehören nachgelagert in S2D-02, S2D-03, S2D-04 und S2D-05.

## 2. Grundgefühl

Das Spiel soll sich wie eine kleine lebendige Siedlung anfühlen, nicht wie eine Tabellenverwaltung.

Der Spieler entscheidet vor allem:

- was gebaut wird,
- wo gebaut wird,
- welche Produktion aktiv oder pausiert ist,
- wo Arbeitsbereiche liegen,
- welche Engpässe zuerst gelöst werden sollen,
- wie die Siedlung räumlich und wirtschaftlich wächst.

Die Simulation erledigt den operativen Alltag möglichst selbst:

- Bewohner leben in ihren Häusern,
- Arbeiter gehen selbst zu ihrer Arbeit,
- Waren erzeugen automatisch Transportbedarf,
- geeignete Träger übernehmen Transportaufträge,
- Bauarbeiter gehen zu versorgten Baustellen,
- Produzenten arbeiten innerhalb ihrer Bedingungen,
- Tiere bewegen sich selbstständig,
- Trampelpfade entstehen durch tatsächliche Bewegung.

Grundregel:

> **Der Spieler trifft wirtschaftliche und räumliche Entscheidungen; die Figuren führen den operativen Alltag selbstständig aus.**

---

# S2D-01A – Core Gameplay Loop & Player Actions

## 3. Core Gameplay Loop

Der verbindliche Kernablauf lautet:

`Spiel starten -> Siedlung/HQ erfassen -> Bedarf erkennen -> Gebäude wählen -> Platzieren -> Baustelle versorgen -> Bauarbeiter kommt an -> Gebäude wird gebaut -> Bewohner/Arbeiter nutzen es -> Waren entstehen -> Waren werden physisch transportiert -> HQ/Lager erhält Waren -> neue Bau- und Wirtschaftsoptionen werden möglich -> Siedlung erweitern -> Engpass erkennen und lösen -> Loop wiederholen`

Der Loop muss mit dem kleinen V1-Gebäudekern dauerhaft funktionieren und beobachtbar bleiben.

## 4. Spielstart

### 4.1 Neue Sandbox

Eine neue Sandbox startet auf einer definierten Karte.

Zum Start existiert ein HQ als wirtschaftlicher Mittelpunkt und primäres Lager. Die Karte enthält die für den Kern benötigten nutzbaren Flächen, Rohstoffe und Tiere entsprechend der jeweiligen Kartendefinition.

Exakte Startmengen und Balancewerte bleiben offen.

### 4.2 Continue

Bei `Weiterspielen` wird der gespeicherte Siedlungszustand wiederhergestellt. Für den Spieler soll die Welt dort weiterlaufen, wo sie verlassen wurde. Technisch rekonstruierbare Laufzeitdetails dürfen neu aufgebaut werden, solange der sichtbare und wirtschaftliche Zustand konsistent bleibt.

### 4.3 Einführung

Das Guidance-System führt beim ersten Spielen schrittweise in tatsächlich benötigte Aktionen ein. Bereits verstandene Hinweise werden nicht bei jedem Start wiederholt und können später über Hilfe/Einstellungen erneut gestartet werden.

## 5. Spieleraktionen und Automatik

| Bereich | Spieler | Simulation |
|---|---|---|
| Karte | navigiert/zoomt | stellt Weltzustand dar |
| Gebäude | Typ und Standort wählen | Validierung und Runtime-Zustand |
| Baustelle | beobachten, später ggf. priorisieren | Bedarf, Lieferung, Builder, Fortschritt |
| Bewohner | Wohnraum schaffen | Bewohner erzeugen/binden, Freizeit und Assignments |
| Produktion | Gebäude, Arbeitsbereich, Pause | Arbeitsablauf und lokale Warenerzeugung |
| Transport | indirekt über Siedlungsstruktur | Jobs erzeugen, Unit wählen, Pickup/Delivery |
| Lager | Bestand beobachten | reale Warenannahme und Buchung |
| Jagd | Hütte/Arbeitsbereich | Tierziel suchen und Jagd ausführen |
| Wege | Siedlung räumlich planen | Trampelpfade aus realer Nutzung bilden |
| Guidance | Hinweise nutzen/abschalten/neustarten | passende Hinweise ereignisbasiert anbieten |
| Save/Continue | speichern/fortsetzen gemäß UI | konsistenten Zustand sichern/wiederherstellen |

## 6. Wohnen und Bevölkerung

Wohnhäuser stellen Wohnraum bereit und sind die Heimat konkreter Bewohner.

Verbindliche Baseline:

- kleines Wohnhaus: 2 Bewohner,
- mittleres Wohnhaus: 3 Bewohner.

Bewohner bleiben Bewohner und ihrem Zuhause zugeordnet. Bei freien allgemeinen Aufgaben können sie temporär helfen, ohne in einen anderen Unit-Typ umdefiniert zu werden.

## 7. Produktion

Ein Produktionsgebäude:

1. prüft seine Arbeitsbedingungen,
2. benötigt gegebenenfalls einen passenden Arbeiter,
3. arbeitet mit realen Rohstoffen/Tieren/Arbeitsbereichen, sofern vorgesehen,
4. erzeugt Ware zuerst lokal am Gebäude,
5. meldet daraus Transportbedarf,
6. wartet nicht auf manuelles Verschieben durch den Spieler.

Eine produzierte Ware zählt noch nicht zum zentral verfügbaren Bestand, solange sie nicht erfolgreich zum HQ bzw. später zu einem geeigneten Lager transportiert wurde.

## 8. Transport

Transportaufträge entstehen automatisch nur bei gültiger Quelle, gültigem Ziel, realer Ware, realem Bedarf und Erreichbarkeit.

Der sichtbare Ablauf lautet:

`Ware liegt lokal -> Transportauftrag -> geeignete Unit läuft zur Quelle -> nimmt reale Ware auf -> trägt sie sichtbar -> erreicht Ziel -> liefert ab -> erst jetzt zentrale Gutschrift`

Freie Bewohner dürfen einfache allgemeine Transporte unterstützen. Geeignete feste Spezialisten haben Vorrang.

## 9. HQ

Das HQ ist im V1-Kern:

- Startgebäude,
- wirtschaftlicher Mittelpunkt,
- Hauptlager,
- zentrale Warenannahme,
- Hauptquelle für zentral eingelagerte Baumaterialien.

Ein separates Lagerhaus gehört noch nicht zum ersten vollständigen Kern.

---

# S2D-01B – Economy Rules & Resource Flow

## 10. Einmaligkeitsregel für physische Waren

> **Eine reale Wareneinheit darf zu jedem Zeitpunkt genau einen fachlichen Ort/Zustand besitzen.**

Beispiel:

`Rohstoffquelle -> Produktionsbestand -> reserviert -> von Unit getragen -> HQ/Lager -> reserviert -> von Unit getragen -> Baustelle -> verbaut`

Sie darf niemals gleichzeitig als unabhängiger HQ-Zähler, sichtbarer Stapel und Carrier-Inventar existieren.

## 11. Warenklassen

### 11.1 Physische Waren

Im V1-Kern:

- Holz,
- Stein,
- Fisch,
- Fleisch,
- Fell.

### 11.2 Wirtschaftswert

Gold ist ein Wirtschaftswert und keine normale physisch zu transportierende Ware.

### 11.3 Abgeleiteter Wert

Bevölkerung ist keine Ware und kein Lagerbestand. Sie wird aus den real vorhandenen Bewohnern abgeleitet.

## 12. Fachliche Warenorte

Eine physische Ware kann sich im Kern befinden in:

1. Welt/Rohstoffquelle,
2. Produktionsbestand,
3. reserviertem Quellbestand,
4. Transport bei einer Unit,
5. HQ-/Lagerbestand,
6. reserviertem Lagerbestand,
7. Baustellenbestand,
8. verbraucht/verbaut.

Spätere Produktionsketten dürfen zusätzliche Input-/Zwischenlager besitzen, müssen aber dieselbe Einmaligkeitsregel einhalten.

## 13. Reservierung

Eine Reservierung bedeutet:

- Ware existiert weiterhin am aktuellen Ort,
- sie ist für einen konkreten Bedarf blockiert,
- andere Aufträge dürfen dieselbe Menge nicht erneut beanspruchen.

Erst beim tatsächlichen Pickup wechselt die Ware von der Quelle zur Unit.

Bei gültigem Abbruch wird die Reservierung kontrolliert freigegeben. Ware darf weder verschwinden noch dupliziert werden.

## 14. Lokaler Produktionsbestand

Fertige Produktionsware wird zuerst lokal am Gebäude gebucht.

Beispiel:

`Holzfäller arbeitet -> 1 Holz fertig -> 1 Holz liegt fachlich bei der Holzfällerhütte`

Erst erfolgreicher Transport verändert ihren Ort.

Produktionsgebäude besitzen begrenzte lokale Ausgangsbestände. Ist die Kapazität erreicht, kann die weitere Produktion warten.

## 15. Sichtbare Warenplätze und Stapel

Physische Waren sollen an geeigneten Gebäuden und Lagerpunkten sichtbar sein.

Die sichtbaren Objekte sind **Darstellung des fachlichen Bestands und kein zweiter Warenbestand**.

Für die Darstellung gilt:

- geordnete Grundstruktur,
- leichte kontrollierte Positions-/Rotationsabweichungen,
- keine völlig chaotische Verteilung,
- klare Lesbarkeit der Ware,
- Pickup entfernt sichtbar Ware,
- Delivery fügt sichtbar Ware hinzu.

Eine klassische kleine Stapelgröße von ungefähr sechs sichtbaren Einheiten pro Ablagegruppe kann als Darstellungsreferenz untersucht werden, ist aber kein finaler Wert.

Bei größeren Beständen dürfen mehrere Stapelpositionen gefüllt werden. Sehr große Mengen dürfen später technisch zusammengefasst oder gebacken werden, solange der sichtbare Füllstand glaubwürdig bleibt.

## 16. HQ-Bestand

Nach erfolgreicher Lieferung an das HQ wird eine physische Ware zentral verfügbar.

Das HQ darf fachlich mehr Ware halten, als auf einer einzelnen kleinen Ablagefläche dargestellt werden kann. Die sichtbaren Lagerbereiche reagieren trotzdem nachvollziehbar auf den realen Bestand.

## 17. Baustellenversorgung

Eine Baustelle besitzt pro Ware Soll-, Reservierungs- und Lieferzustand.

Verbindliche Regel:

`Restbedarf = Soll - geliefert - gültig reserviert/unterwegs`

Nur positiver Restbedarf darf neue Transporte auslösen.

Ablauf:

1. Baustelle meldet Bedarf.
2. geeigneter verfügbarer Lagerbestand wird reserviert,
3. Transporteur holt genau diese Ware ab,
4. Ware befindet sich während des Wegs bei der Unit,
5. erfolgreiche Lieferung überträgt sie in den Baustellenbestand,
6. erst der Bauprozess verbraucht/verbaut die Materialien.

Es dürfen keine weiteren Lieferungen zu einer bereits vollständig versorgten Baustelle entstehen.

## 18. Economy-Invarianten

1. Eine physische Wareneinheit existiert fachlich genau einmal.
2. Reservieren ist nicht verbrauchen.
3. Pickup überträgt Ware von Quelle auf Unit.
4. Delivery überträgt Ware von Unit auf Ziel.
5. Zentrale Verfügbarkeit entsteht erst nach erfolgreicher Einlagerung.
6. Reservierte Menge darf nicht erneut vergeben werden.
7. Baustellen dürfen nicht über ihren realen Restbedarf hinaus beliefert werden.
8. Sichtbare Stapel sind Repräsentation, kein zweiter Store.
9. Save/Continue muss Ort, Menge und relevante Reservierungs-/Transportzustände konsistent wiederherstellen oder eindeutig rekonstruieren.
10. Fehler/Abbruch dürfen Waren weder duplizieren noch vernichten.

## 19. Weltressourcen und Darstellung

Die Welt darf schrittweise um Bäume, Steinquellen, Pilze, Blumen, weitere Vegetation, Wildtiere und spätere Naturressourcen erweitert werden.

S2D-05 entscheidet, was Gameplay-Ressource und was reine Dekoration ist.

Texturen, gebackene Darstellungen und Caches dürfen für langsam veränderliche oder große visuelle Mengen genutzt werden, beispielsweise Trampelpfade, Vegetation und große Warenstapel. Die Grafik darf niemals einen zweiten Gameplay-State erzeugen.

---

# S2D-01C – Buildings, Production & Construction Behavior

## 20. Gemeinsame Gebäudegrundregeln

Jedes Gebäude besitzt fachlich mindestens:

- klar definierte Funktion,
- blockierende Grundfläche,
- mindestens einen gültigen Unit-Zugang,
- gegebenenfalls Pickup-/Delivery-Bereich,
- gegebenenfalls sichtbare Lagerflächen,
- klaren Betriebszustand,
- sichtbares Feedback,
- auswählbare Spielerinformationen und erlaubte Aktionen.

Gebäude sind keine rein dekorativen Bilder. Form, Footprint, Zugänge, Laufwege und Warenplätze müssen zum Gameplay passen.

## 21. Gebäudezustände

Für normale platzierbare Gebäude gilt fachlich mindestens:

`PLACEMENT -> CONSTRUCTION_WAIT_MATERIAL -> CONSTRUCTION_WAIT_BUILDER -> CONSTRUCTION_BUILDING -> ACTIVE`

Je nach Gebäudetyp können zusätzlich auftreten:

- `PAUSED`,
- `BLOCKED`,
- `NO_WORKER`,
- `NO_RESOURCE`,
- `OUTPUT_FULL`,
- `DEMOLISHING/REMOVED`.

Die technischen Enum-Namen werden erst in S2D-03 festgelegt.

## 22. Platzierung und räumliche Gültigkeit

Platzierung muss mindestens berücksichtigen:

- freie Grundfläche,
- keine Überlappung mit blockierenden Gebäuden,
- zulässiges Terrain,
- nutzbaren Unit-Zugang,
- Raum für zwingend benötigte Arbeits-/Ablagebereiche.

Ein Gebäude darf nicht so platziert werden, dass sein einziger Zugang unpassierbar ist.

## 23. Unit Access, Pickup, Delivery und Storage

Fachlich werden unterschieden:

- **Unit Access** – Betreten/Arbeiten,
- **Pickup** – Warenaufnahme,
- **Delivery** – Warenanlieferung,
- **Visible Storage Area** – sichtbare Bestandsdarstellung.

Diese Bereiche dürfen bei kleinen Gebäuden zusammenfallen, müssen aber so gedacht werden, dass Stapel keine Eingänge blockieren und Units nicht scheinbar durch Wände laufen.

## 24. Baustellenverhalten

Nach Platzierung entsteht eine reale Baustelle mit Gebäudetyp, Standort, Footprint, Zugang, Materialbedarf, geliefertem Material, reserviertem/unterwegs befindlichem Material und sichtbarem Bauzustand.

Solange Material fehlt: `CONSTRUCTION_WAIT_MATERIAL`.

Sobald Material vollständig ist: `CONSTRUCTION_WAIT_BUILDER`.

Ein Bauarbeiter muss die Baustelle tatsächlich erreichen. Bloße Zuweisung oder bloße Existenz eines Builders darf keinen Baufortschritt erzeugen.

Erst nach tatsächlicher Ankunft: `CONSTRUCTION_BUILDING`.

Nach Fertigstellung:

- Materialien gelten als verbaut,
- Baustellenzustand endet,
- fertiges Gebäude wird aktiv,
- normale Zugänge/Lagerflächen/Funktionen werden aktiv.

## 25. Abriss

Grundlegender Abriss gehört zum Kern.

Beim Abriss:

- startet das Gebäude keine neue normale Produktion,
- entstehen keine neuen nicht zwingenden Jobs dafür,
- Waren und Bewohner dürfen nicht stillschweigend verschwinden,
- die Fläche wird nach Abschluss wieder baubar/begehbar.

Rückerstattung, Abrissdauer und Bewohner-Umsiedlung bleiben spätere Detailentscheidungen; Bewohnerbehandlung gehört in S2D-02.

## 26. Die sieben Kerngebäude

### 26.1 HQ / Rathaus

Funktion:

- Startgebäude,
- wirtschaftlicher Mittelpunkt,
- primäres V1-Lager,
- Hauptziel produzierter Waren,
- Hauptquelle zentral eingelagerter Baumaterialien.

Benötigt mindestens:

- klaren Unit-/Logistikzugang,
- Delivery-/Pickup-Bereich,
- sichtbare Lagerflächen für physische Waren.

### 26.2 Kleines Wohnhaus

- Wohnraum für 2 Bewohner,
- dauerhafte Home-Bindung,
- Bewohner verlassen/erreichen das Haus über einen definierten Zugang,
- kein normaler Produktionslagerplatz,
- erzeugt nach späterer Steuerregel Gold als Wirtschaftswert.

### 26.3 Mittleres Wohnhaus

Wie kleines Wohnhaus, aber Wohnraum für 3 Bewohner.

### 26.4 Holzfällerhütte

Erzeugt Holz aus real nutzbaren Bäumen im Arbeitsbereich.

Ablauf:

`Worker -> gültiger Baum -> Weg/Arbeit -> Rückkehr/Output -> lokaler Holzbestand -> Logistik -> HQ`

Benötigt Worker-Zugang, Pickup-Bereich und sichtbare Holzablage.

### 26.5 Steinbruch

Erzeugt Stein aus real nutzbaren Stein-/Rohstoffquellen.

Ablauf:

`Worker -> gültige Steinquelle -> Abbau -> lokaler Steinbestand -> Logistik -> HQ`

Benötigt Worker-Zugang, Pickup und sichtbare Steinablage.

### 26.6 Fischerhütte

Erzeugt Fisch aus einem gültigen fischbaren Bereich.

Ablauf:

`Fischer -> gültiger Arbeits-/Fischpunkt -> Fischfang -> Rückkehr/Output -> lokaler Fischbestand -> Logistik -> HQ`

Gebäudezugang darf nicht im Wasser oder in unpassierbarer Fläche liegen.

### 26.7 Jägerhütte

Erzeugt Fleisch und Fell aus real vorhandenen geeigneten Wildtieren.

Ablauf:

`Jäger -> geeignetes reales Tier -> Weg/Jagd -> Tier wird fachlich konsumiert -> Rückkehr/Output -> Fleisch/Fell lokal -> Logistik -> HQ`

Es gibt keine parallele abstrakte Jagdproduktion neben dem realen Tierbestand.

## 27. Gemeinsames Produktionsverhalten

Holzfäller, Steinbruch, Fischer und Jäger folgen denselben Regeln:

1. fertig gebaut und nicht pausiert,
2. geeigneter Worker verfügbar/zugeordnet,
3. Arbeitsbedingungen gültig,
4. reales Ziel/gültige Quelle vorhanden, sofern erforderlich,
5. sichtbarer Arbeitsablauf,
6. Ergebnis wird lokal gebucht,
7. lokaler Bestand sichtbar repräsentierbar,
8. Logistik transportiert zum HQ,
9. erst HQ-Lieferung macht Ware zentral verfügbar.

Produktionsgebäude dürfen globale Ressourcen nicht direkt erhöhen.

## 28. Pause

Für Produktionsgebäude bedeutet `PAUSED` mindestens:

- keine neue Produktionsaufgabe,
- keine neue Rohstoff-/Tierarbeit,
- vorhandene fertige Ware bleibt erhalten,
- vorhandene Ware darf weiterhin abgeholt werden,
- Transportjobs für fertige Ware dürfen weiterlaufen,
- Pausenstatus ist sichtbar.

Das Verhalten eines Workers, der beim Pausieren bereits unterwegs oder mitten in einer Tätigkeit ist, wird in S2D-02 festgelegt.

## 29. Lagerflächen pro Gebäude

Ohne finale Slotzahlen gilt:

- HQ: mehrere sichtbare Lagergruppen,
- Holzfäller: Holz-Ausgangsbereich,
- Steinbruch: Stein-Ausgangsbereich,
- Fischer: Fisch-Ausgangsbereich,
- Jäger: Fleisch- und Fell-Ausgangsbereiche,
- Wohnhäuser: kein normaler Produktionslagerplatz,
- Baustellen: sichtbarer Materialbereitstellungsbereich.

Ablageflächen dürfen Eingänge, Dockingpunkte oder Laufkorridore nicht blockieren.

## 30. Render-/Überdeckungsanforderung

Für alle Kerngebäude gilt:

- Unit vor/hinter Gebäude muss plausibel erscheinen,
- Unit darf nicht durch massiven Footprint laufen,
- Zugang muss optisch zur Bewegung passen,
- Warenstapel müssen korrekt in die Tiefenwirkung eingebunden werden,
- Arbeitsanimationen dürfen nicht scheinbar durch Wände stattfinden.

Die technische Lösung über Y-Sort, Layer, Footprint-Masken oder andere Verfahren gehört in S2D-03.

---

# S2D-01D – Economy Progression, Shortages & Player Feedback

## 31. Progressionsprinzip

Der V1-Sandbox-Kern besitzt keine starre Kampagnenprogression. Fortschritt entsteht organisch aus Ausbau und Stabilisierung der Siedlung.

Typischer Rhythmus:

`Grundversorgung herstellen -> Engpass erkennen -> Ursache verstehen -> gezielt ausbauen/umplanen -> Wirtschaft stabilisieren -> größere Siedlung erzeugt neue Engpässe -> erneut reagieren`

Eine größere Siedlung ist nicht automatisch eine bessere Siedlung. Schlechte Platzierung oder zu schnelles Wachstum kann ihre Leistung verschlechtern.

## 32. Kernabhängigkeiten

Der Wirtschaftskern beruht auf fünf verbundenen Bereichen:

1. Wohnraum und Bewohner,
2. Arbeitskräfte,
3. Rohstoffzugang,
4. Produktion und lokale Bestände,
5. Transport und zentrale Lagerung.

Ein Ausbau eines Bereichs kann einen anderen zum neuen Engpass machen.

Beispiel:

`mehr Holzfäller -> mehr lokales Holz -> Transport reicht nicht -> Stapel wachsen -> weitere Produktion bringt kaum Nutzen, bis Logistik verbessert wird`

## 33. Engpasskategorien

### 33.1 Wohnraum

Zu wenig Wohnraum bzw. Bewohner begrenzen verfügbare Arbeitskräfte.

### 33.2 Arbeitskräfte

Zu unterscheiden sind mindestens:

- kein geeigneter Spezialist vorhanden,
- Spezialist vorhanden, aber beschäftigt,
- allgemeine Transporthilfe knapp.

Arbeitskräftemangel darf nicht als Rohstoffmangel dargestellt werden.

### 33.3 Rohstoff

Produktionsgebäude findet keine geeignete nutzbare Quelle bzw. kein geeignetes Tier im Arbeitsbereich.

### 33.4 Produktionskapazität

Von einer Ware wird langfristig weniger erzeugt als benötigt. Der Spieler muss unterscheiden können zwischen fehlender Produktion, zu kleiner Produktion und blockierter Produktion.

### 33.5 Lokaler Lagerengpass

Ausgangsbestand ist voll. Produktion wartet, obwohl grundsätzlich Rohstoff und Worker vorhanden wären. Das ist primär ein Logistiksignal.

### 33.6 Transportengpass

Typische Hinweise:

- viele Waren liegen lokal,
- viele Transporte sind offen/unterwegs,
- Baustellen warten trotz zentral vorhandenem Material,
- Transporteure laufen lange Wege,
- stark genutzte Trampelpfade zeigen dominante Verkehrsströme.

### 33.7 Baustellenengpass

Eine Baustelle kann warten, weil:

- Material zentral fehlt,
- Material reserviert ist,
- Material unterwegs ist,
- Transport zu langsam ist,
- Material vollständig ist, aber kein Builder verfügbar ist,
- Builder unterwegs ist,
- Zugang/Ziel nicht erreichbar ist.

Diese Ursachen müssen fachlich unterscheidbar bleiben.

### 33.8 Erreichbarkeit

Ein wirtschaftlich sinnvolles Ziel kann räumlich nicht erreichbar sein. Dieser Zustand darf keine endlose erfolglose Auftragsschleife erzeugen.

### 33.9 Pause

`PAUSED` ist kein Fehler und kein echter Engpass, sondern ein bewusster Spielerzustand.

## 34. Spielerrelevante Betriebsursachen

Für Produktionsgebäude sind mindestens folgende fachliche Zustandskonzepte erforderlich:

- `PAUSED`,
- `WAITING_FOR_WORKER`,
- `WORKER_EN_ROUTE`,
- `NO_RESOURCE`,
- `WORKING`,
- `OUTPUT_AVAILABLE`,
- `OUTPUT_FULL`,
- `UNREACHABLE`.

Diese Begriffe sind keine vorweggenommenen technischen Enums.

Nicht jede Ruhephase ist ein Fehler. Worker unterwegs, Transport bereits beauftragt oder Material reserviert/unterwegs sind normale Wartezustände.

Ursache und Folge dürfen nicht verwechselt werden. Eine verständliche Hauptursache muss für den Spieler erkennbar sein.

## 35. Spielerfeedback – drei Ebenen

### Ebene 1 – Welt selbst

Möglichst viel soll direkt sichtbar sein:

- Bewohner/Arbeiter bewegen sich,
- Baustellenmaterial liegt sichtbar,
- Bauarbeiter arbeitet sichtbar,
- Produktionsanimation läuft,
- Ausgangsstapel füllt/leert sich,
- Träger holen Waren ab,
- HQ-Lager füllt/leert sich,
- Tiere bewegen sich und werden gejagt,
- Trampelpfade zeigen Verkehrsströme.

### Ebene 2 – dezentes Statussignal

Wenn die Welt allein nicht reicht, darf ein Gebäude einen kleinen klaren Hinweis zeigen, z. B. Pause, kein Arbeiter, kein Rohstoff, Ausgangslager voll oder nicht erreichbar.

### Ebene 3 – ausgewähltes Gebäude

Bei Auswahl muss die Ursache genauer nachvollziehbar sein. Die konkrete UI-Struktur wird in S2D-04 gestaltet.

## 36. Mindestinformationen ausgewählter Gebäude

### Alle Gebäude

Mindestens:

- Gebäudetyp/Name,
- aktueller Hauptzustand,
- verständliche Blockade-/Warteursache, falls vorhanden,
- erlaubte Spieleraktionen.

### Baustelle

Zusätzlich:

- benötigte Materialien,
- gelieferte Mengen,
- fehlende Mengen,
- reserviert/unterwegs sinnvoll erkennbar,
- wartet auf Material / wartet auf Builder / im Bau,
- Baufortschritt.

### Produktionsgebäude

Zusätzlich:

- aktiv/pausiert,
- Workerstatus,
- Arbeitsbereich/Ressourcensituation,
- lokaler Ausgangsbestand,
- Ausgangslager voll ja/nein,
- bei Jäger getrennte Mengen für Fleisch/Fell.

### Wohnhaus

Zusätzlich:

- Bewohnerzahl/Belegung,
- Wohnstatus,
- später gegebenenfalls steuerrelevante Information.

### HQ

Zusätzlich:

- zentrale Bestände,
- verfügbarer gegenüber reserviertem Bestand verständlich unterscheidbar,
- zentrale wirtschaftliche Übersicht als Einstiegspunkt.

## 37. Globale Wirtschaftsinformation

Im Kern fachlich relevant sind mindestens:

- zentrale physische Warenbestände,
- Gold,
- Bevölkerung,
- sinnvollerweise verständliche Anzeige verfügbarer/gebundener Arbeitskräfte oder einer daraus abgeleiteten Knappheit.

Lokale, noch nicht eingelagerte Ware darf nicht als zentral verfügbar erscheinen.

Beispiel: 10 Holz bei Holzfällern + 5 Holz im HQ bedeutet nicht automatisch 15 zentral verfügbar.

## 38. Sichtbare Lager als Diagnoseinstrument

Sichtbare Warenstapel sind zugleich Wirtschaftsinformation.

Beispiele:

- großer Holzstapel am Holzfäller + wenig Holz im HQ -> Transportproblem wahrscheinlich,
- leere Ablage + Worker arbeitet -> Produktion läuft, Transport hält Schritt,
- leere Ablage + kein Worker -> Workforceproblem,
- volle Baustellenablage + kein Baufortschritt -> Builderproblem,
- stark gefülltes HQ -> zentraler Vorrat sichtbar vorhanden.

## 39. Wohnraum, Workforce und Wachstum

Wohnhäuser sind nicht nur Goldgeneratoren.

Mehr Wohnraum führt zu mehr Bewohnern und grundsätzlich mehr Arbeitskräftepotenzial. Gleichzeitig erzeugt eine größere Siedlung mehr Produktions-, Transport- und Bauarbeit.

Zielzusammenhang:

`Wachstum -> mehr Bewohner -> mehr mögliche Arbeit -> gleichzeitig mehr wirtschaftlicher Bedarf -> neue Engpässe`

Die genaue Workforce-Zuteilung gehört in S2D-02.

## 40. Spezialisten und allgemeine Hilfsarbeit

Spezialisierte Arbeiten bleiben Spezialisten vorbehalten, soweit der Master dies verlangt.

Freie Bewohner können im Kern einfache Transporte unterstützen.

Ein Spezialistenmangel darf nicht durch beliebige automatische Rollenwechsel unsichtbar gemacht werden.

## 41. Gleichzeitige Baustellen

Mehrere parallele Baustellen dürfen reale Folgen erzeugen:

- konkurrierender Materialbedarf,
- mehr Reservierungen,
- höhere Transportlast,
- höhere Nachfrage nach Bauarbeitern.

Damit entsteht ohne komplexes Prioritätsmenü die Entscheidung, viele Projekte parallel zu starten oder wichtige Vorhaben erst abzuschließen.

Komplexe frei konfigurierbare Prioritäten bleiben LATER.

## 42. Räumliche Planung als Wirtschaftsentscheidung

Entfernungen zwischen Wohnhäusern, Produktionsgebäuden, Rohstoffgebieten, HQ und Baustellen verändern reale Lauf- und Transportzeiten.

Kurze sinnvolle Wege verbessern die tatsächliche Leistung, ohne abstrakte Effizienzboni zu benötigen.

Trampelpfade machen Verkehrsbelastung sichtbar.

## 43. Rohstofferschöpfung und Jagd

Wenn reale Rohstoffquellen im Arbeitsbereich verbraucht oder ungeeignet werden, darf ein Standort an Leistung verlieren oder warten.

Beim Jäger ist die Ressource mobil. Produktivität darf dadurch schwanken.

Der Spieler muss unterscheiden können zwischen:

- geeignetem Arbeitsgebiet,
- aktuell keiner nutzbaren Ressource/keinem Tier,
- Worker nicht verfügbar,
- Ausgangslager voll,
- Transportstau.

Es gibt keine unsichtbare Ersatzproduktion zur künstlichen Stabilisierung der Rate.

## 44. Kein Micromanagement-Zwang

Das System soll weitgehend automatisch und stabil laufen, wenn die Siedlung vernünftig aufgebaut ist.

Spielerintervention ist vor allem sinnvoll bei:

- Wachstum,
- echten Engpässen,
- erschöpften/ungünstigen Arbeitsbereichen,
- bewusstem Pausieren,
- räumlicher Umplanung,
- später einfachen Prioritätsentscheidungen.

## 45. Information, Warnung und Fehler

Spielerfeedback unterscheidet:

- **Information** – normaler Zustand, keine Reaktion nötig,
- **Engpass/Warnung** – Simulation funktioniert, aber Spieler kann sinnvoll verbessern,
- **Fehler/ungültiger Zustand** – etwas kann fachlich nicht weiterlaufen, z. B. dauerhaft nicht erreichbar.

Diese Bedeutungen dürfen später visuell nicht dieselbe Alarmstärke bekommen.

## 46. Guidance bei ersten Engpässen

Das Guidance-System darf wichtige Zusammenhänge beim ersten Auftreten erklären, z. B.:

- voller Produktionsstapel -> Ware wartet auf Transport,
- Baustelle mit vollständigem Material -> Builder muss ankommen,
- Arbeitskräftemangel -> Zusammenhang Wohnraum/Bewohner/Arbeit,
- Rohstoffmangel -> Arbeitsbereich,
- Erreichbarkeitsfehler -> Zugang/Lage problematisch.

Wiederkehrende Engpässe werden nicht ständig erneut kommentiert.

## 47. Sandbox-Erfolg

Der erste vollständige Sandbox-Kern benötigt keine feste Siegbedingung.

Motivation entsteht aus:

- funktionierende Kreisläufe aufbauen,
- sichtbare Siedlung wachsen sehen,
- Bestände aufbauen,
- Engpässe beseitigen,
- Arbeitswege beobachten,
- Welt beleben,
- effizienter und größer werden.

Szenarien, Ziele und Sieg-/Niederlagebedingungen bleiben LATER.

## 48. Mindestanforderungen an wirtschaftliche Lesbarkeit

Ein Spieler muss ohne Developer Inspector nachvollziehen können:

1. ob ein Gebäude arbeitet,
2. wenn nicht: warum nicht,
3. ob Ware produziert wurde,
4. wo diese Ware liegt,
5. ob Ware transportiert wird,
6. ob eine Baustelle Material braucht,
7. ob Material reserviert/unterwegs ist,
8. ob die Baustelle nur noch auf einen Builder wartet,
9. ob Wohnraum/Arbeitskräfte knapp sind,
10. ob Rohstoff, Produktion oder Logistik den Engpass verursacht.

Der Inspector darf tiefere Diagnosen liefern, aber keine Information ersetzen, die der normale Spieler zum Verstehen benötigt.

## 49. Game-Design-Invarianten für Engpässe

1. Ein Engpass hat eine reale Ursache in der Simulation.
2. Ursache und Folge werden im Feedback nicht verwechselt.
3. Lokale Ware ist nicht automatisch zentral verfügbar.
4. Voller lokaler Bestand bedeutet nicht automatisch Rohstoffmangel.
5. Vollständiges Material bedeutet noch nicht Baubeginn; Builder muss ankommen.
6. Ein zugewiesener, aber noch laufender Worker ist nicht dasselbe wie kein Worker.
7. Pause ist ein bewusster Zustand und kein Fehler.
8. Unerreichbarkeit darf keine Endlosschleife erzeugen.
9. Kritische Zusammenhänge sollen möglichst zuerst in der Welt sichtbar sein.
10. Detail-UI erklärt die Welt; sie ersetzt sie nicht.
11. Wachstum darf neue reale Engpässe erzeugen.
12. Lösungen dürfen kein permanentes Micromanagement verlangen.

---

# S2D-01E – Internal Consistency & Freeze Gate

## 50. Prüfgegenstand

Geprüft wurden die Inhalte aus S2D-01A bis S2D-01D gegen `S2D-00 PROJECT MASTER V0.1 FROZEN`.

Prüfkriterien:

- Scope-Widersprüche,
- fehlende NOW-Punkte aus dem Master,
- unzulässige LATER/OUT-Vorziehungen,
- versehentlich vorgezogene Workforce-Details,
- versehentlich vorgezogene technische Architekturentscheidungen,
- versehentlich vorgezogene konkrete UI-Entscheidungen,
- Widersprüche zwischen Gameplay Loop, Warenfluss, Gebäudeverhalten und Engpasslogik.

## 51. Ergebnis

- Widersprüche zum eingefrorenen S2D-00 Scope: **0**
- fehlende NOW-Kernpunkte: **0**
- unerlaubt vorgezogene LATER/OUT-Funktionen: **0**
- Workforce-Detailentscheidungen, die S2D-02 blockieren würden: **0**
- technische Detailentscheidungen, die S2D-03 vorwegnehmen: **0**
- konkrete UI-Layoutentscheidungen, die S2D-04 vorwegnehmen: **0**
- Content-/Balancefestlegungen, die S2D-05 unzulässig vorwegnehmen: **0**
- interne Widersprüche zwischen S2D-01A/B/C/D: **0**
- offene Blocker: **0**

## 52. Bewusst offen und nachgelagert

Nicht Teil des Freeze von S2D-01 sind insbesondere:

- genaue Worker-/Resident-State-Machine,
- Jobprioritäten und Assignmentregeln,
- Pauseverhalten laufender Worker,
- Bewohnerbehandlung bei Wohnhausabriss,
- Startanzahl und Typen von Arbeitern,
- finale Bau-/Produktionszeiten,
- finale Kosten und Erträge,
- lokale/HQ-Lagerkapazitäten,
- exakte Stapelgröße und Slotkoordinaten,
- konkrete Reservierungsdatenstruktur,
- technische Owner/APIs/Enums,
- Y-Sort/Layer/Footprint-/Collision-Implementierung,
- finale Path-Wear-Technik,
- konkrete UI-Anordnung, Icons und mobile Verdichtung,
- genaue Tierarten, Vegetations-/Ressourcenliste und Nachwuchsregeln,
- separates Lagerhaus,
- direkte Producer-to-Consumer-Logistik,
- komplexe Prioritäten,
- Szenarien, Kampagne, Militär und Territory.

Diese Punkte bleiben in den vorgesehenen Folgedokumenten offen und sind kein Freeze-Blocker.

## 53. Freeze

**S2D-01 GAME DESIGN V0.1 ist FROZEN.**

Der Freeze bindet:

- Core Gameplay Loop,
- Grenze Spielerentscheidung vs. Simulation,
- fachlichen Warenfluss,
- Einmaligkeits-/Reservierungsregeln,
- sichtbare Waren-/Lagerlogik,
- Bauablauf,
- fachliches Verhalten der sieben Kerngebäude,
- Pause-Grundverhalten,
- Sandbox-Progression,
- Engpasskategorien,
- notwendige wirtschaftliche Lesbarkeit,
- grundlegende Spielerfeedback-Prinzipien.

Änderungen an diesen eingefrorenen Game-Design-Grundsätzen müssen später über `S2D-07 – DECISION & CHANGE LOG` geführt werden.

**S2D-01A – COMPLETE**  
**S2D-01B – COMPLETE**  
**S2D-01C – COMPLETE**  
**S2D-01D – COMPLETE**  
**S2D-01E – PASS / 0 BLOCKER**  
**S2D-01 GAME DESIGN V0.1 – FROZEN**  
**Implementation changes: 0**
