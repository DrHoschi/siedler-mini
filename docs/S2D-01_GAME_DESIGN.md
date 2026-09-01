# S2D-01 – GAME DESIGN

Status: **V0.1 DRAFT – S2D-01A COMPLETE**  
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
