# S2D-01 – GAME DESIGN

Status: **V0.1 DRAFT – S2D-01A/B COMPLETE**  
Datum: 2026-09-01  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-01-game-design`  
Verbindliche Basis: `S2D-00 – PROJECT MASTER V0.1 FROZEN`

## 1. Zweck

Dieses Dokument beschreibt das Spiel aus Sicht des Spielers und der sichtbaren Simulation.

S2D-01 legt fest, **was im Spiel geschieht und was der Spieler beeinflusst**. Technische Owner, APIs, Datenstrukturen und Implementierungsdetails werden in S2D-03 behandelt; die genaue Unit-/Workforce-State-Machine in S2D-02; UI-Layouts und Touch-Details in S2D-04.

## 2. Grundgefühl

Das Spiel soll sich wie eine kleine lebendige Siedlung anfühlen, nicht wie eine Tabellenverwaltung.

Der Spieler entscheidet vor allem:

- **was** gebaut wird,
- **wo** gebaut wird,
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

Der Spieler soll **organisieren und beobachten**, nicht jede Figur einzeln steuern.

## 3. Core Gameplay Loop

Der verbindliche Kernablauf lautet:

`Spiel starten -> Siedlung/HQ erfassen -> Bedarf erkennen -> Gebäude wählen -> Platzieren -> Baustelle versorgen -> Bauarbeiter baut -> Gebäude nimmt Betrieb auf -> Bewohner/Arbeiter nutzen es -> Waren entstehen -> Waren werden physisch transportiert -> HQ/Lager erhält Waren -> neue Bau- und Wirtschaftsoptionen werden möglich -> Siedlung erweitern -> Engpässe erkennen und lösen -> Loop wiederholen`

Der Loop muss bereits mit dem kleinen V1-Gebäudekern dauerhaft funktionieren und beobachtbar bleiben.

## 4. Spielstart

### 4.1 Neue Sandbox

Eine neue Sandbox startet auf einer definierten Karte.

Zum Start existiert ein HQ als wirtschaftlicher Mittelpunkt und primäres Lager. Die Karte enthält die für den Kern benötigten nutzbaren Flächen, Rohstoffe und Tiere entsprechend der jeweiligen Kartendefinition.

Die exakten Startmengen und Balancewerte werden später festgelegt.

### 4.2 Continue

Bei `Weiterspielen` wird der gespeicherte Siedlungszustand wiederhergestellt. Für den Spieler soll die Welt dort weiterlaufen, wo sie verlassen wurde; technisch rekonstruierbare Laufzeitdetails dürfen neu aufgebaut werden, solange der sichtbare und wirtschaftliche Zustand konsistent bleibt.

### 4.3 Einführung

Beim ersten Spielen führt das Guidance-System schrittweise in die jeweils tatsächlich benötigte Aktion ein. Es soll nicht alle Regeln vorab erklären.

Beispiel:

`Haus bauen -> Bewohner erscheinen/verfügbar werden -> Produktionsgebäude bauen -> lokale Ware entsteht -> Transport beobachten -> Ware erreicht HQ`

Bereits verstandene Hinweise werden nicht bei jedem Start wiederholt.

## 5. Bauen

### Spieler entscheidet

Der Spieler:

- öffnet die Bauauswahl,
- wählt einen Gebäudetyp,
- sieht eine verständliche Platzierungsvorschau,
- wählt einen gültigen Standort,
- bestätigt die Platzierung,
- kann eine Baustelle bzw. ein Gebäude auswählen,
- kann ein Gebäude grundsätzlich abreißen.

### Simulation erledigt

Nach gültiger Platzierung:

1. entsteht eine Baustelle,
2. ihr realer Materialbedarf wird ermittelt,
3. benötigte Waren werden als Transportbedarf bereitgestellt,
4. geeignete Transporteure liefern nur die noch benötigten Mengen,
5. nach vollständiger Materialversorgung wird ein geeigneter Bauarbeiter benötigt,
6. der Bau beginnt erst, wenn dieser tatsächlich angekommen ist,
7. der Baufortschritt wird sichtbar,
8. nach Fertigstellung wird das Gebäude in seinen normalen Betriebszustand überführt.

Der Spieler weist im normalen Kernspiel **keinen einzelnen Träger und keinen einzelnen Bauarbeiter manuell** zu.

## 6. Wohnen und Bevölkerung

Wohnhäuser stellen Wohnraum bereit und sind die Heimat konkreter Bewohner.

Verbindliche Ausgangsbasis:

- kleines Wohnhaus: 2 Bewohner,
- mittleres Wohnhaus: 3 Bewohner.

Bewohner bleiben als Personen ihrem Zuhause zugeordnet.

Wenn keine Aufgabe anliegt, dürfen sie im Haus bleiben, herauskommen, sich sinnvoll in der Umgebung bewegen und wieder zurückkehren.

Wenn eine passende allgemeine Aufgabe benötigt wird, kann ein freier Bewohner temporär helfen. Seine Identität als Bewohner bleibt erhalten.

Die genaue Vergabe, Rollenlogik und State-Machine wird in S2D-02 festgelegt.

## 7. Produktion

### Spieler entscheidet

Der Spieler entscheidet durch Gebäudeauswahl und Platzierung, **welche Produktionsmöglichkeiten** die Siedlung erhält.

Bei Gebäuden mit Arbeitsgebiet kann er den relevanten Arbeitsbereich bestimmen bzw. verändern.

Er kann Produktion pausieren und wieder fortsetzen.

Spätere Prioritäts- und Komfortfunktionen dürfen ergänzt werden, sollen aber kein unnötiges Micromanagement erzeugen.

### Simulation erledigt

Ein Produktionsgebäude:

1. prüft seine Arbeitsbedingungen,
2. benötigt gegebenenfalls einen passenden Arbeiter,
3. arbeitet mit realen Rohstoffen/Tieren/Arbeitsbereichen, sofern für den Gebäudetyp vorgesehen,
4. erzeugt seine Ware zunächst **lokal am Produktionsgebäude**,
5. meldet daraus Transportbedarf,
6. wartet nicht darauf, dass der Spieler die Ware manuell verschiebt.

Eine produzierte Ware zählt noch nicht zum zentral verfügbaren Bestand, solange sie nicht erfolgreich zum HQ bzw. später zu einem geeigneten Lager transportiert wurde.

## 8. Transport und Lagerung

### Spieler entscheidet

Im normalen Kernspiel gibt der Spieler keine einzelnen Transportwege und keine einzelnen Transportaufträge von Hand vor.

Er beeinflusst Logistik indirekt durch:

- Gebäudeplatzierung,
- Produktionsentscheidungen,
- Pausen,
- spätere einfache Prioritäten,
- räumliche Struktur der Siedlung.

### Simulation erledigt

Die Simulation erkennt reale Transportbedarfe.

Ein Transport darf nur vergeben werden, wenn Quelle, Ziel, Ware, Menge und Erreichbarkeit gültig sind.

Der sichtbare Ablauf lautet:

`Ware liegt lokal -> Transportauftrag -> geeignete Unit läuft zur Quelle -> nimmt reale Ware auf -> trägt sie sichtbar -> erreicht Ziel -> liefert ab -> erst jetzt zentrale Gutschrift`

Ein Auftrag darf nicht immer wieder erfolglos neu gesucht werden, wenn sein Ziel nicht erreichbar ist.

Freie Bewohner dürfen einfache allgemeine Transporte unterstützen. Geeignete feste Spezialisten haben dabei Vorrang.

## 9. HQ und zentraler Bestand

Das HQ ist im V1-Kern Startpunkt, Hauptlager und zentrale Warenannahme.

Für den Spieler bedeutet das:

- angelieferte Waren werden dort zentral verfügbar,
- Bau- und Wirtschaftsmöglichkeiten greifen auf diesen verfügbaren Bestand nach den später festgelegten Regeln zurück,
- das HQ ist ein wichtiger sichtbarer Logistikpunkt,
- Engpässe durch lange oder schlechte Transportwege sollen beobachtbar werden.

Ein separates Lagerhaus ist nicht Teil dieses ersten Kernloops und wird später behandelt.

## 10. Bestehende Produktionsbereiche im Kern

Der erste Gameplay-Loop muss mit folgenden bereits festgelegten Gebäuden funktionieren:

- HQ/Rathaus,
- kleines Wohnhaus,
- mittleres Wohnhaus,
- Holzfällerhütte,
- Steinbruch,
- Fischerhütte,
- Jägerhütte.

Damit müssen mindestens die bereits festgelegten physischen Waren Holz, Stein, Fisch, Fleisch und Fell sichtbar in der Wirtschaft funktionieren.

Gold ist ein Wirtschaftswert und keine physisch getragene Standardware. Bevölkerung ist ein Simulationswert aus den tatsächlichen Bewohnern.

## 11. Arbeitsbereiche

Produktionsgebäude, deren Tätigkeit räumlich gebunden ist, besitzen einen verständlichen Arbeitsbereich.

Der Spieler soll erkennen können:

- wo ein Gebäude arbeitet,
- ob dort geeignete Ressourcen/Tiere vorhanden sind,
- ob der Bereich ungünstig oder erschöpft ist.

Die Simulation wählt innerhalb des gültigen Arbeitsbereichs geeignete Ziele selbstständig.

Der Spieler steuert nicht jeden einzelnen Baum, Stein, Fisch oder jedes Tier manuell an.

## 12. Pause und Betriebszustände

Der Spieler kann ein geeignetes Produktionsgebäude pausieren und wieder aktivieren.

Pause bedeutet im Game Design mindestens:

- keine neue normale Produktion beginnen,
- vorhandene Waren und bereits abgeschlossene Produktion nicht verlieren,
- bestehende Weltzustände konsistent lassen.

Das genaue Verhalten bereits laufender Worker-Assignments beim Pausieren wird in S2D-02 festgelegt.

## 13. Engpässe als zentrales Spielprinzip

Das Spiel soll Probleme nicht hauptsächlich durch abstrakte Fehlermeldungen erzeugen, sondern durch nachvollziehbare wirtschaftliche Situationen.

Typische Engpässe:

- zu wenig Wohnraum,
- zu wenige freie Arbeitskräfte,
- fehlende Rohstoffe im Arbeitsbereich,
- zu wenig Produktion einer Ware,
- Waren liegen lokal, werden aber nicht schnell genug transportiert,
- zu lange Wege,
- Baustellen konkurrieren um Material oder Arbeitskräfte,
- Produktion ist pausiert,
- ein Ziel ist nicht erreichbar.

Der Spieler soll Ursache und Wirkung möglichst in der Welt erkennen können. UI und Guidance dürfen dabei erklären und warnen, aber nicht die Simulation ersetzen.

## 14. Trampelpfade als sichtbares Feedback

Bewegung von Bewohnern und Arbeitern verändert die Welt sichtbar.

Häufig genutzte Wege werden allmählich erkennbar. Wenig oder nicht mehr genutzte Spuren können langsam wieder zuwachsen.

Der Spieler baut diese Trampelpfade im V1-Kern nicht einzeln. Sie sind **visuelles Feedback der tatsächlichen Verkehrsströme** und helfen dadurch auch beim Erkennen schlechter oder stark belasteter Siedlungswege.

Bewusst gebaute Straßen bleiben ein späteres, separates Gameplay-System.

## 15. Tiere und Jagd

Tiere bewegen sich sichtbar in der Welt.

Die Jägerhütte arbeitet nicht mit einer rein abstrakten Fleischproduktion, sondern mit real vorhandenen geeigneten Tieren im Arbeitsbereich.

Der Spieler bestimmt den Standort bzw. Arbeitsbereich; die Simulation übernimmt die konkrete Zielsuche und Jagdausführung.

Welche Tierarten im ersten Content-Set jagdbar sind, wird in S2D-05 festgelegt.

## 16. Steuern und Gold

Wohnhäuser/Bewohner erzeugen nach den später festgelegten Wirtschaftsregeln Gold.

Der Spieler muss dafür nicht regelmäßig manuell kassieren.

Die bisherige Testgröße ist **kein finaler Balancewert**.

Gold dient im Game Design als Wirtschaftswert; seine konkreten Verwendungen, Kosten und Balance werden in späteren S2D-01-/S2D-05-Blöcken festgelegt und dürfen nicht aus alten Testwerten abgeleitet werden.

## 17. Spieleraktionen vs. Automatik – verbindliche Grenze

| Bereich | Spieler | Simulation |
|---|---|---|
| Karte ansehen | navigiert/zoomt | stellt Weltzustand dar |
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

Grundregel:

> **Der Spieler trifft wirtschaftliche und räumliche Entscheidungen; die Figuren führen den operativen Alltag selbstständig aus.**

## 18. Was S2D-01A bewusst noch nicht festlegt

Nicht Teil dieses Blocks sind:

- exakte Worker-State-Machine,
- genaue Jobprioritäten,
- Anzahl fester Träger/Bauarbeiter pro Startzustand,
- endgültige Bau- und Produktionszeiten,
- endgültige Gebäudekosten,
- finale Steuerwerte,
- genaue Gold-Verwendungen,
- konkrete UI-Anordnung,
- technische APIs und Dateistruktur,
- endgültige Path-Wear-Technik,
- Kampagne, Militär oder Territory.

Diese Punkte werden nur dort entschieden, wo sie für das jeweilige Folgedokument notwendig sind.

## 19. Abschluss S2D-01A

Der Kernloop und die Grenze zwischen Spielerentscheidung und Simulationsautomatik sind damit definiert.

**S2D-01A – Core Gameplay Loop & Player Actions: COMPLETE**  
**Implementation changes: 0**  
**Product scope changes gegenüber S2D-00 V0.1 FROZEN: 0**

---

# S2D-01B – Economy Rules & Resource Flow

## 20. Grundregel: Eine physische Ware existiert genau einmal

Die Wirtschaft folgt für physische Waren einer verbindlichen Grundregel:

> **Eine reale Wareneinheit darf zu jedem Zeitpunkt genau einen fachlichen Ort/Zustand besitzen.**

Eine Einheit Holz kann beispielsweise sein:

`Baum/Rohstoffquelle -> produziert -> lokaler Ausgangsbestand -> reserviert -> von Unit getragen -> Lagerplatz/HQ -> für Baustelle reserviert -> von Unit getragen -> Baustelle -> verbaut`

Sie darf dabei niemals gleichzeitig im HQ-Zähler, auf einem sichtbaren Stapel und im Inventar eines Trägers als drei unabhängige Einheiten existieren.

## 21. Warenklassen

### 21.1 Physische Waren

Im aktuellen V1-Kern:

- Holz,
- Stein,
- Fisch,
- Fleisch,
- Fell.

Diese Waren besitzen einen realen wirtschaftlichen Ort und werden bei Transport sichtbar bewegt.

### 21.2 Wirtschaftswerte

Gold ist ein Wirtschaftswert und keine normale physisch zu tragende Ware.

Gold kann daher über definierte Wirtschaftsereignisse gebucht werden, ohne dass eine Goldkiste durch die Welt getragen werden muss.

### 21.3 Abgeleitete Werte

Bevölkerung ist keine Ware und kein Lagerbestand. Sie wird aus den tatsächlich vorhandenen Bewohnern abgeleitet.

## 22. Fachliche Warenorte

Eine physische Ware kann sich im Kern an folgenden Orten befinden:

1. **Welt/Rohstoffquelle** – noch nicht gewonnener Rohstoff bzw. reale Quelle.
2. **Produktionsbestand** – fertig erzeugte Ware am Produktionsgebäude.
3. **Reservierter Quellbestand** – Ware ist noch an der Quelle, aber bereits einem gültigen Transportbedarf zugeordnet.
4. **Transport** – Ware wird tatsächlich von einer Unit getragen.
5. **HQ-/Lagerbestand** – Ware wurde erfolgreich eingelagert und ist zentral verfügbar.
6. **Reservierter Lagerbestand** – eingelagerte Ware ist bereits einem konkreten Bedarf zugeordnet und darf nicht gleichzeitig erneut vergeben werden.
7. **Baustellenbestand** – Ware wurde real an einer Baustelle angeliefert.
8. **Verbraucht/verbaut** – Ware ist aus dem verfügbaren Wirtschaftskreislauf entfernt.

Spätere Produktionsketten dürfen zusätzliche Input-/Zwischenlager besitzen. Sie müssen dieselbe Einmaligkeitsregel einhalten.

## 23. Verfügbarkeit und Reservierung

### 23.1 Frei verfügbar

Eine Ware ist nur frei verfügbar, wenn sie sich in einem dafür vorgesehenen Bestand befindet und nicht bereits reserviert ist.

### 23.2 Reserviert ist nicht verbraucht

Eine Reservierung bedeutet:

- die Ware existiert weiterhin an ihrem aktuellen Ort,
- sie ist für einen konkreten Bedarf blockiert,
- andere Aufträge dürfen dieselbe Menge nicht erneut beanspruchen.

Erst bei tatsächlichem Pickup wechselt die Ware von der Quelle zur tragenden Unit.

### 23.3 Abbruch/Freigabe

Kann ein Auftrag nicht ausgeführt werden oder wird er gültig abgebrochen, muss die Reservierung kontrolliert freigegeben werden. Die Ware darf weder verschwinden noch dupliziert werden.

## 24. Produktion -> lokaler Bestand

Eine Produktion schreibt ihre fertige Ware zuerst in den lokalen Produktionsbestand des Gebäudes.

Beispiel:

`Holzfäller arbeitet -> 1 Holz fertig -> 1 Holz liegt fachlich bei der Holzfällerhütte`

Erst ein erfolgreicher Transport verändert den Ort dieser Ware.

Das Produktionsgebäude darf einen begrenzten lokalen Bestand besitzen. Ist dessen Kapazität erreicht, kann dies die weitere Produktion blockieren. Die konkreten Kapazitäten werden später im Content Catalog festgelegt.

## 25. Sichtbare Warenplätze und Stapel

Die physische Wirtschaft soll nicht nur über Zahlen sichtbar sein. Warenbestände dürfen an geeigneten Gebäuden und Lagerpunkten **als echte sichtbare Warenobjekte bzw. Stapel dargestellt werden**.

### 25.1 Fachlicher Bestand vs. Darstellung

Die sichtbaren Objekte sind eine Darstellung des fachlichen Bestands und **kein zweiter Warenbestand**.

Beispiel:

`HQ-Bestand Holz = 37`

kann visuell als mehrere Holzstapel dargestellt werden. Diese Darstellung erzeugt keine zusätzlichen 37 Einheiten und besitzt keine eigene Wirtschaftsbuchhaltung.

### 25.2 Lagerflächen

HQ, Produktionsgebäude und spätere Lagergebäude dürfen definierte sichtbare Lagerflächen besitzen.

Statt unbegrenzt alles auf exakt einen Punkt zu stapeln, sollen Waren auf mehreren passenden Ablagepositionen verteilt erscheinen.

Für das gewünschte lebendige Bild gilt:

- geordnete Grundstruktur,
- leichte kontrollierte Positions-/Rotationsabweichungen,
- keine völlig chaotische Verteilung,
- Ware bleibt klar als Stapel/Bestand lesbar,
- Pickup entfernt sichtbar Ware,
- Delivery fügt sichtbar Ware hinzu.

Eine klassische kleine Stapelgröße wie ungefähr sechs sichtbare Einheiten pro Ablagegruppe kann als **Darstellungsreferenz** untersucht werden, ist aber noch kein finaler Balance- oder Technikwert.

### 25.3 Große Bestände

Bei größeren Beständen darf die sichtbare Lagerfläche wachsen bzw. mehrere Stapelpositionen füllen. Nicht zwingend jede intern gespeicherte Einheit muss bei sehr großen Mengen dauerhaft als separates Renderobjekt existieren.

Das spätere technische Design darf daher sichtbare Gruppen, Instancing, Spritesheets, Caches oder andere effiziente Repräsentationen verwenden, solange für den Spieler glaubhaft bleibt:

`Bestand kommt an -> Lagerplatz füllt sich` und `Bestand wird abgeholt -> Lagerplatz leert sich`.

Die konkrete Render-/LOD-/Stack-Technik gehört in S2D-03.

## 26. HQ-Bestand

Nach erfolgreicher Lieferung an das HQ wird eine physische Ware zentral verfügbar.

Der HQ-Bestand ist fachlich die eingelagerte Menge. Die sichtbaren Lagerplätze um bzw. am HQ repräsentieren diesen Bestand.

Das HQ darf intern mehr Ware halten, als auf einer einzelnen kleinen Ablagefläche dargestellt werden kann. Die Darstellung soll trotzdem nachvollziehbar auf den Füllstand reagieren.

Der V1-Kern benötigt noch kein separates Lagergebäude. Das Wirtschaftssystem wird aber so gedacht, dass spätere Lagerplätze/Lagerhäuser dieselben Warenregeln verwenden können.

## 27. Bauentnahme und Baustellenversorgung

Eine Baustelle besitzt einen realen Soll-, Reservierungs- und Lieferzustand pro benötigter Ware.

Für eine Ware gilt sinngemäß:

`Restbedarf = Soll - bereits geliefert - gültig reserviert/unterwegs`

Nur positiver Restbedarf darf neue Transporte auslösen.

Ablauf:

1. Baustelle meldet Bedarf.
2. Geeigneter verfügbarer Lagerbestand wird reserviert.
3. Transporteur holt genau diese reservierte Ware ab.
4. Ware befindet sich während des Wegs bei der Unit.
5. Bei erfolgreicher Lieferung wechselt sie in den Baustellenbestand.
6. Erst der Bauprozess verbraucht/verbaut die angelieferten Materialien nach den später festgelegten Bauphasenregeln.

Damit darf insbesondere kein Träger weiter Material zu einer bereits vollständig versorgten Baustelle bringen.

## 28. Produktionsware als Quelle für andere Bedarfe

Im V1-Kern wird fertige Produktionsware grundsätzlich zunächst zum HQ transportiert und dort zentral verfügbar.

Direkte Producer-to-Consumer-Ketten können später ergänzt werden, wenn sie spielerisch sinnvoll sind. Sie dürfen aber nicht als Sonderweg die zentrale Einmaligkeits-/Reservierungslogik umgehen.

## 29. Engpässe und volle Lager

Wirtschaftliche Engpässe sollen sichtbar und verständlich sein.

Mögliche Zustände:

- Produktionslager voll -> Produktion wartet,
- keine Transportkapazität -> Waren sammeln sich sichtbar,
- HQ/Lager stark gefüllt -> Lagerflächen füllen sich,
- benötigte Ware reserviert -> für andere Baustelle momentan nicht frei,
- Baustelle wartet auf Material,
- Ware unterwegs,
- Ziel nicht erreichbar -> Auftrag wird nicht endlos neu erzeugt,
- später: Lagerkapazität tatsächlich ausgeschöpft.

Die konkrete maximale HQ-/Lagerkapazität wird noch nicht in S2D-01B festgelegt.

## 30. Gold

Gold wird getrennt von physischen Waren behandelt.

Wohnhäuser/Bewohner können Gold nach einer später festgelegten Steuerregel erzeugen.

Gold:

- benötigt keinen Carrier,
- benötigt keinen sichtbaren Lagerstapel im V1-Kern,
- wird über die zentrale Wirtschaft gebucht,
- darf später für Bau, Unterhalt, Freischaltungen oder andere Systeme genutzt werden.

Die konkreten Verwendungen und Zahlenwerte bleiben offen, bis das zugehörige Game-Design-/Content-Thema bearbeitet wird.

## 31. Weltressourcen, Vegetation und Tiere

Die Welt soll schrittweise sichtbar reichhaltiger werden, ohne den Minispiel-Charakter zu verlieren.

Grundsätzlich können zur Welt gehören:

- Bäume,
- Steine/Rohstoffvorkommen,
- Pilze,
- Blumen und andere Vegetation,
- Wildtiere,
- weitere dekorative oder später nutzbare Naturressourcen.

Dabei wird zwischen **wirtschaftlich relevanten Weltobjekten** und **rein dekorativer Vegetation** unterschieden. Welche Objekte im V1 tatsächlich Gameplay-Ressourcen sind, wird in S2D-05 festgelegt.

Jagd bleibt physisch nachvollziehbar: reale Tiere können zu realen Erträgen wie Nahrung/Fleisch und Fell führen.

## 32. Visuelle Weltordnung und Überdeckung

Die sichtbare Simulation muss räumlich glaubwürdig bleiben.

Figuren dürfen nicht scheinbar durch massive Gebäude laufen, nur weil Renderreihenfolge und Navigation unterschiedliche Annahmen verwenden.

Für das Game Design gilt:

- Gebäude besitzen eine tatsächlich blockierende Grundfläche,
- begehbare Zugänge liegen an definierten Stellen,
- Units bewegen sich nicht durch gesperrte Gebäudeflächen,
- bei 2D-Überdeckung muss die Zeichenreihenfolge glaubwürdig Vorder-/Hintereinander darstellen,
- Warenstapel dürfen Zugänge und Laufwege nicht optisch oder logisch unbrauchbar machen.

Die konkrete Collision-/Footprint-/Y-Sort-/Layer-Technik wird in S2D-03 festgelegt.

## 33. Texturen und visuelle Repräsentationen

Texturen, gebackene Darstellungen und Caches dürfen überall dort eingesetzt werden, wo sie viele einzelne Renderobjekte effizient ersetzen können, ohne die sichtbare Simulation zu verfälschen.

Bereits naheliegende Einsatzbereiche sind:

- Path-Wear/Trampelpfade,
- größere Boden-/Vegetationsdarstellungen,
- große sichtbare Warenmengen bzw. zusammengefasste Stapel,
- andere wiederkehrende statische oder langsam veränderliche Weltinformationen.

Die Entscheidung, **was fachlich ein echtes Simulationsobjekt bleibt und was nur visuell gebacken/zusammengefasst wird**, erfolgt pro System in S2D-03. Wirtschaftliche Warenmengen dürfen dabei nie durch eine reine Grafik zum zweiten State werden.

## 34. Economy-Invarianten

Für alle späteren Implementierungen gelten folgende fachliche Regeln:

1. Eine physische Wareneinheit existiert fachlich genau einmal.
2. Reservieren ist nicht dasselbe wie verbrauchen.
3. Pickup entfernt Ware aus dem Quellbestand und überträgt sie an die Unit.
4. Delivery entfernt Ware von der Unit und überträgt sie an das Ziel.
5. Zentrale Verfügbarkeit entsteht erst nach erfolgreicher Einlagerung.
6. Eine reservierte Menge darf nicht erneut vergeben werden.
7. Baustellen dürfen nicht über ihren realen Restbedarf hinaus beliefert werden.
8. Sichtbare Warenstapel sind Repräsentationen des fachlichen Bestands, kein zweiter Store.
9. Save/Continue muss Ort, Menge und relevante Reservierungs-/Transportzustände konsistent wiederherstellen oder eindeutig rekonstruieren.
10. Fehler/Abbruch dürfen Waren weder duplizieren noch vernichten.

## 35. Was S2D-01B bewusst offen lässt

Noch nicht festgelegt werden:

- finale Lagerkapazitäten,
- exakte sichtbare Stapelgröße,
- Zahl und Position der Lager-Slots pro Gebäude,
- endgültige Baukosten,
- Produktionsraten,
- Carrier-Tragmenge,
- konkrete Reservierungsdatenstruktur,
- konkrete Transportprioritäten,
- technische Darstellung großer Stapel,
- finales Layer-/Y-Sort-Verfahren,
- konkrete zusätzliche Naturressourcen,
- separates Lagerhaus und dessen Freischaltung,
- direkte Producer-to-Consumer-Logistik,
- finale Gold-Verwendungen und Balance.

Diese Punkte werden in S2D-02, S2D-03, S2D-05 bzw. späteren Game-Design-Blöcken dort entschieden, wo sie fachlich hingehören.

## 36. Abschluss S2D-01B

Der fachliche Wirtschaftsfluss ist damit geschlossen definiert, ohne technische Implementierung vorwegzunehmen.

**S2D-01B – Economy Rules & Resource Flow: COMPLETE**  
**Implementation changes: 0**  
**Product scope conflict gegenüber S2D-00 V0.1 FROZEN: 0**
