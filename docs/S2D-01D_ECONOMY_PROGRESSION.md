# S2D-01D – Economy Progression, Shortages & Player Feedback

Status: **COMPLETE – Bestandteil von S2D-01 GAME DESIGN V0.1 DRAFT**  
Datum: 2026-09-01  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-01-game-design`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` sowie S2D-01A/B/C

> Konsolidierungshinweis: Dieser geschlossene Teilblock wird beim anschließenden S2D-01 Freeze-Gate in das gemeinsame `S2D-01_GAME_DESIGN.md` konsolidiert. Er eröffnet kein zusätzliches dauerhaftes Planungsdokument.

## 1. Zweck

S2D-01D beschreibt, wie sich der bereits definierte Wirtschaftskern während einer Spielsitzung für den Spieler entwickelt und wie wirtschaftliche Probleme verständlich werden.

Der Block legt fachlich fest:

- welche Arten von Engpässen der Kern erzeugt,
- wie Wohnraum, Arbeitskräfte, Rohstoffe, Produktion, lokale Lager und Transport aufeinander wirken,
- wann Gebäude normal arbeiten, warten oder blockiert sind,
- welche Informationen der Spieler erkennen können muss,
- wie daraus sinnvolle Entscheidungen entstehen,
- wie Fortschritt im Sandbox-Kern ohne künstliche Questkette entsteht.

Nicht Teil dieses Blocks sind technische State-Enumnamen, konkrete UI-Layouts, endgültige Balancewerte oder exakte Jobprioritäten.

## 2. Progressionsprinzip

Der V1-Sandbox-Kern besitzt keine starre Kampagnenprogression. Fortschritt entsteht organisch aus dem Ausbau und der Stabilisierung der eigenen Siedlung.

Der typische wirtschaftliche Rhythmus lautet:

`Grundversorgung herstellen -> ersten Engpass erkennen -> Ursache verstehen -> gezielt ausbauen/umplanen -> Wirtschaft stabilisiert sich -> größere Siedlung erzeugt neue Engpässe -> erneut reagieren`

Der Spieler soll dadurch nicht einfach immer nur „mehr Gebäude“ setzen, sondern Beziehungen zwischen Siedlungsgröße, Arbeitskräften, Produktion und Logistik verstehen.

## 3. Kernabhängigkeiten

Der erste vollständige Wirtschaftskern beruht auf fünf voneinander abhängigen Bereichen:

1. **Wohnraum und Bewohner** – bestimmen die verfügbare Bevölkerung.
2. **Arbeitskräfte** – bestimmen, welche Arbeiten tatsächlich ausgeführt werden können.
3. **Rohstoffzugang** – bestimmt, ob Produktionsgebäude geeignete Quellen/Tiere erreichen.
4. **Produktion und lokale Bestände** – erzeugen physische Waren an realen Orten.
5. **Transport und zentrale Lagerung** – machen lokale Waren im HQ zentral verfügbar und versorgen Baustellen.

Ein Ausbau eines Bereichs kann einen anderen zum neuen Engpass machen.

Beispiel:

`mehr Holzfäller -> mehr Holzproduktion -> lokale Holzstapel wachsen -> Transport reicht nicht mehr -> zusätzliche Produktion bringt kaum Nutzen, bis Logistik verbessert wird`

Genau diese Ursache-Wirkungs-Ketten sind erwünschtes Gameplay.

## 4. Frühe Spielsitzung

Die frühe Sandbox soll verständliche, kleine Entscheidungen erzeugen.

Typischer Ablauf:

1. HQ und Startbestand ansehen.
2. ersten Wohnraum schaffen bzw. vorhandenen Wohnraum nutzen.
3. erste Produktionsgebäude für grundlegende Waren aufbauen.
4. beobachten, wie Arbeiter ihre Gebäude erreichen und produzieren.
5. beobachten, wie fertige Waren lokal liegen.
6. sehen, wie Träger sie zum HQ transportieren.
7. neue Baustellen erzeugen Materialbedarf.
8. erkennen, ob Material, Arbeiter oder Transport der aktuelle Engpass ist.

Dieser Ablauf ist eine Gameplay-Zielrichtung, keine verbindliche Tutorial-Zwangsreihenfolge.

## 5. Wirtschaftlicher Fortschritt

Fortschritt bedeutet im Kern nicht primär eine abstrakte Levelzahl, sondern zunehmende Leistungsfähigkeit der realen Siedlung.

Der Spieler erreicht Fortschritt durch:

- mehr bzw. geeigneteren Wohnraum,
- mehr verfügbare Bewohner,
- ausreichende Spezialisten,
- bessere Lage von Produktionsgebäuden,
- geeignete Arbeitsbereiche,
- stabile Rohstoffversorgung,
- ausreichend freie Transportkapazität,
- sinnvolle Entfernungen,
- ausreichend zentrale Warenbestände,
- kontrollierte Zahl gleichzeitiger Baustellen.

Eine größere Siedlung ist damit nicht automatisch eine bessere Siedlung. Schlechte Platzierung oder zu schnelles Wachstum kann ihre Leistung verschlechtern.

## 6. Engpasskategorien

### 6.1 Wohnraumengpass

Merkmal:

- zu wenig Wohnraum bzw. zu wenige Bewohner für den gewünschten Ausbau.

Folge:

- Arbeitskräfte werden knapp,
- allgemeine Hilfsaufgaben können unbesetzt bleiben,
- neue Produktionsgebäude erhöhen die tatsächliche Leistung möglicherweise nicht.

Mögliche Spielerreaktion:

- weiteres Wohnhaus bauen,
- Expansion verlangsamen,
- unnötige parallele Vorhaben reduzieren.

### 6.2 Arbeitskräfteengpass

Merkmal:

- Gebäude oder Aufgaben warten auf einen geeigneten Arbeiter.

Zu unterscheiden sind mindestens:

- kein geeigneter Spezialist verfügbar,
- Spezialist vorhanden, aber bereits beschäftigt,
- allgemeine Transporthilfe knapp.

Ein Arbeitskräfteengpass darf nicht fälschlich als Rohstoffmangel angezeigt werden.

### 6.3 Rohstoffengpass

Merkmal:

- Produktionsgebäude hat keinen geeigneten nutzbaren Rohstoff bzw. kein geeignetes Tier im gültigen Arbeitsbereich.

Beispiele:

- Holzfäller findet keinen geeigneten Baum,
- Steinbruch findet keine nutzbare Steinquelle,
- Fischer hat keinen gültigen Fischbereich,
- Jäger findet kein geeignetes Wildtier.

Mögliche Spielerreaktion:

- Arbeitsbereich ändern,
- anderes Gebäude günstiger platzieren,
- später erschöpfte/ungeeignete Standorte ersetzen.

### 6.4 Produktionsengpass

Merkmal:

- von einer benötigten Ware wird langfristig weniger erzeugt als verbraucht bzw. benötigt.

Der Spieler soll unterscheiden können zwischen:

- Produktion existiert gar nicht,
- Produktion ist zu klein,
- Produktion wäre ausreichend, ist aber durch einen anderen Engpass blockiert.

Mehr Produktionsgebäude sind nur dann eine sinnvolle Lösung, wenn tatsächlich Produktionskapazität fehlt.

### 6.5 Lokaler Lagerengpass

Merkmal:

- der Ausgangsbestand eines Produktionsgebäudes erreicht seine Kapazität.

Folge:

- Gebäude kann keine weitere fertige Ware sinnvoll ablegen und wartet.

Das ist primär ein Logistiksignal und nicht automatisch ein Produktionsproblem.

Der sichtbare Warenstapel soll diesen Zustand unterstützen: Ein voller Lagerplatz vermittelt dem Spieler bereits ohne Detailfenster, dass Ware vorhanden ist, aber nicht schnell genug verschwindet.

### 6.6 Transportengpass

Merkmale können sein:

- viele Waren liegen an Produktionsgebäuden,
- viele offene/unterwegs befindliche Transporte,
- Baustellen warten trotz vorhandenem zentralem Material lange,
- wenige Transporteure legen sehr lange Wege zurück,
- stark genutzte Trampelpfade zeigen dominante Verkehrsströme.

Mögliche Spielerreaktion:

- Siedlungsstruktur kompakter planen,
- später Transportkapazität erhöhen,
- nicht zu viele Baustellen gleichzeitig eröffnen,
- Produktionsstandorte günstiger zum HQ bzw. späteren Lagern wählen.

### 6.7 Baustellenengpass

Eine Baustelle kann aus verschiedenen Gründen warten:

- Material fehlt zentral,
- Material existiert, ist aber für andere Bedarfe reserviert,
- Material ist unterwegs,
- Lieferung kommt wegen Transportengpass langsam,
- Material ist vollständig, aber kein Bauarbeiter verfügbar,
- Bauarbeiter ist zugewiesen, aber noch unterwegs,
- Zugang/Ziel ist nicht erreichbar.

Diese Ursachen müssen fachlich unterscheidbar bleiben.

### 6.8 Erreichbarkeitsengpass

Ein Ziel kann wirtschaftlich sinnvoll, aber räumlich nicht erreichbar sein.

Das System darf daraus keine endlose erfolglose Auftragsschleife erzeugen.

Für den Spieler bedeutet dieser Zustand:

- die betroffene Aktion wartet/blockiert,
- die Ursache muss als Erreichbarkeitsproblem erkennbar werden,
- andere funktionierende Teile der Wirtschaft laufen weiter.

### 6.9 Pause

`PAUSED` ist kein automatischer Fehler und kein Engpass im eigentlichen Sinn.

Der Zustand wurde bewusst durch den Spieler ausgelöst und muss daher klar von `BLOCKED`, `NO_WORKER`, `NO_RESOURCE` oder `OUTPUT_FULL` unterscheidbar sein.

## 7. Gebäudebetrieb – fachliche Statuslogik

Ein Produktionsgebäude gilt aus Spielersicht als **normal arbeitend**, wenn es grundsätzlich betriebsbereit ist und sein aktueller Arbeitszyklus sinnvoll fortschreiten kann.

Es kann dagegen sinnvoll warten oder blockiert sein, wenn eine notwendige Voraussetzung fehlt.

Für den Spieler relevante Ursachen sind mindestens:

- `PAUSED` – bewusst pausiert,
- `WAITING_FOR_WORKER` – kein geeigneter Worker verfügbar,
- `WORKER_EN_ROUTE` – geeigneter Worker kommt,
- `NO_RESOURCE` – keine gültige Arbeitsquelle,
- `WORKING` – Arbeit läuft,
- `OUTPUT_AVAILABLE` – fertige Ware liegt lokal,
- `OUTPUT_FULL` – lokaler Ausgangsbestand verhindert weitere Produktion,
- `UNREACHABLE` – erforderliches Ziel kann nicht erreicht werden.

Diese Begriffe sind fachliche Anzeigenamen/Statuskonzepte; technische Enum-Namen werden erst in S2D-03 festgelegt.

## 8. Warten ist nicht immer ein Fehler

Nicht jede Ruhephase eines Gebäudes benötigt eine Warnung.

Beispiele für normales Warten:

- Worker ist gerade unterwegs,
- Transporteur wurde bereits beauftragt,
- ein Produktionszyklus befindet sich zwischen sichtbaren Arbeitsschritten,
- Baustellenmaterial ist bereits reserviert und unterwegs.

Warnungen sollen erst dann Aufmerksamkeit erzeugen, wenn der Spieler sinnvoll reagieren kann oder ein Zustand ungewöhnlich lange/strukturell besteht.

Dadurch vermeiden wir ein Spiel voller ständig blinkender Symbole.

## 9. Primäre und sekundäre Ursache

Wenn mehrere Bedingungen gleichzeitig ungünstig sind, muss fachlich eine verständliche Hauptursache dargestellt werden können.

Beispiel:

Ein Holzfäller besitzt kein Holz im Ausgangslager, aber auch keinen Arbeiter. Für den Spieler ist `kein Arbeiter` zunächst die relevante Ursache; `kein Output` ist nur Folge davon.

Oder:

Das Ausgangslager ist voll und zusätzlich ist gerade kein freier Carrier da. `Ausgangslager voll / Transportstau` ist die zentrale Ursache für den Produktionsstillstand.

Die exakte technische Priorisierung der Statusursachen wird später festgelegt. S2D-01D verlangt nur, dass Ursache und Folge nicht miteinander verwechselt werden.

## 10. Spielerfeedback – Drei Ebenen

Wirtschaftsinformationen sollen auf drei Ebenen funktionieren.

### Ebene 1 – Welt selbst

Der Spieler erkennt möglichst viel direkt:

- Bewohner/Arbeiter bewegen sich,
- Baustellenmaterial liegt sichtbar dort,
- Bauarbeiter arbeitet sichtbar,
- Produktionsanimation läuft,
- Ausgangsstapel füllt sich,
- Träger holen Waren ab,
- HQ-Lager füllt/leert sich,
- Tiere bewegen sich und werden gejagt,
- Trampelpfade zeigen häufig genutzte Routen.

### Ebene 2 – dezentes Statussignal

Wenn die Welt allein nicht reicht, darf ein Gebäude einen kleinen klaren Statushinweis zeigen.

Beispiele:

- Pause,
- kein Arbeiter,
- kein Rohstoff,
- Ausgangslager voll,
- nicht erreichbar.

Diese Hinweise sollen nicht dauerhaft unnötig die Karte überdecken.

### Ebene 3 – ausgewähltes Gebäude

Bei Auswahl muss der Spieler die Ursache genauer nachvollziehen können.

Welche genaue UI-Struktur dafür verwendet wird, wird in S2D-04 gestaltet.

## 11. Mindestinformationen eines ausgewählten Gebäudes

Für jedes Gebäude müssen nur die fachlich relevanten Informationen erscheinen.

### Für alle Gebäude

Mindestens:

- Gebäudetyp/Name,
- aktueller Hauptzustand,
- gegebenenfalls verständliche Blockade-/Warteursache,
- erlaubte Spieleraktionen.

### Baustelle

Zusätzlich mindestens:

- benötigte Materialien,
- bereits gelieferte Mengen,
- noch fehlende Mengen,
- sinnvoll erkennbar: reserviert/unterwegs,
- Zustand `wartet auf Material`, `wartet auf Bauarbeiter` oder `im Bau`,
- Baufortschritt während der Bauphase.

### Produktionsgebäude

Zusätzlich mindestens:

- aktiv/pausiert,
- Workerstatus,
- Arbeitsbereich bzw. Ressourcensituation,
- lokaler Ausgangsbestand,
- Ausgangslager voll ja/nein,
- bei mehreren Outputs jeweilige Menge, z. B. Fleisch/Fell.

### Wohnhaus

Zusätzlich mindestens:

- Bewohnerzahl/Belegung,
- grundsätzlich erkennbarer Wohnstatus,
- später gegebenenfalls steuerrelevante Information.

### HQ

Zusätzlich mindestens:

- zentrale Bestände,
- verfügbarer gegenüber gegebenenfalls reserviertem Bestand verständlich unterscheidbar,
- zentrale wirtschaftliche Übersicht als Einstiegspunkt.

Die konkrete Verdichtung für Smartphone wird in S2D-04 festgelegt.

## 12. Globale Wirtschaftsinformation

Der Spieler braucht neben Gebäudedetails eine kompakte Sicht auf die wichtigsten Siedlungswerte.

Im Kern fachlich relevant sind mindestens:

- zentrale physische Warenbestände,
- Gold,
- Bevölkerung,
- sinnvollerweise verfügbare/gebundene Arbeitskräfte oder eine daraus abgeleitete verständliche Knappheitsanzeige.

Die globale Anzeige darf nicht den Eindruck erzeugen, dass lokal produzierte, noch nicht eingelagerte Ware bereits zentral verfügbar ist.

Wenn beispielsweise 10 Holz bei Holzfällern liegen und 5 Holz im HQ sind, darf eine zentrale `verfügbar`-Anzeige nicht einfach 15 ausgeben.

Eine zusätzliche Gesamt-/Unterwegs-/Lokal-Analyse kann später im Detailfenster oder Inspector angeboten werden.

## 13. Sichtbare Lager als Diagnoseinstrument

Die in S2D-01B festgelegten sichtbaren Warenstapel sind nicht nur Dekoration, sondern unterstützen die wirtschaftliche Lesbarkeit.

Beispiele:

- großer Holzstapel am Holzfäller + wenig Holz im HQ -> Transportproblem wahrscheinlich,
- leere Holzfällerablage + Arbeiter arbeitet -> Produktion läuft, Transport hält Schritt,
- leere Holzfällerablage + kein Arbeiter -> Workforceproblem,
- volle Baustellenablage + kein Baufortschritt -> Builderproblem,
- stark gefülltes HQ -> zentraler Vorrat sichtbar vorhanden.

Die Simulation soll dadurch teilweise „lesbar“ sein, ohne dass der Spieler permanent Zahlenfenster öffnen muss.

## 14. Wohnraum und Arbeitskräfte als Wachstumsbremse

Wohnhäuser sollen nicht nur Goldgeneratoren sein.

Mehr Wohnraum führt zu mehr Bewohnern und damit grundsätzlich zu größerem Arbeitskräftepotenzial.

Gleichzeitig erzeugt eine größere Siedlung mehr Arbeit:

- mehr Produktion,
- mehr Transporte,
- mehr Baustellen,
- längere Wege.

Dadurch soll der Spieler einen natürlichen Zusammenhang erleben:

`Wachstum -> mehr Bewohner -> mehr mögliche Arbeit -> gleichzeitig mehr wirtschaftlicher Bedarf -> neue Engpässe`

Die genaue Workforce-Zuteilung gehört in S2D-02.

## 15. Spezialisten und allgemeine Hilfsarbeit

Spezialisierte Arbeiten bleiben grundsätzlich Spezialisten vorbehalten, soweit im Master festgelegt.

Freie Bewohner können im Kern einfache Transportaufgaben unterstützen.

Für die Spielerwahrnehmung bedeutet das:

- ein Mangel an spezialisierten Arbeitern kann bestimmte Gebäude blockieren,
- freie Bewohner können Transportdruck teilweise abfangen,
- Bewohner werden dabei nicht zu dauerhaft umdefinierten Carriern,
- ein Spezialistenmangel darf nicht durch beliebige automatische Rollenwechsel unsichtbar gemacht werden.

## 16. Gleichzeitige Baustellen

Der Spieler darf mehrere Baustellen anlegen, soweit der spätere Bau-/Platzierungsrahmen dies erlaubt.

Viele parallele Baustellen haben jedoch reale wirtschaftliche Folgen:

- konkurrierender Materialbedarf,
- mehr Reservierungen,
- höhere Transportlast,
- größere Nachfrage nach Bauarbeitern.

Der Kern soll deshalb schon ohne komplizierte Prioritätsmenüs ein verständliches Entscheidungsproblem erzeugen:

`Baue ich viele Dinge gleichzeitig oder schließe ich erst wichtige Vorhaben ab?`

Komplexe frei konfigurierbare Bauprioritäten bleiben LATER; eine einfache nachvollziehbare Grundpriorisierung wird später in S2D-02/S2D-03 festgelegt.

## 17. Räumliche Planung als Wirtschaftsentscheidung

Gebäudeplatzierung beeinflusst nicht nur Optik.

Entfernungen zwischen:

- Wohnhäusern,
- Produktionsgebäuden,
- Rohstoffgebieten,
- HQ,
- Baustellen

verändern reale Lauf- und Transportzeiten.

Dadurch entsteht eine zentrale Spielerentscheidung:

> Kurze, sinnvolle Wege steigern die tatsächliche Leistung der Siedlung, ohne dass abstrakte Effizienzboni notwendig sind.

Trampelpfade machen diese Belastung zusätzlich sichtbar.

## 18. Rohstofferschöpfung und Standortqualität

Wenn reale Rohstoffquellen im Arbeitsbereich verbraucht oder ungeeignet werden, darf ein Produktionsstandort an Leistung verlieren oder vollständig warten.

Der Spieler soll erkennen können, dass nicht das Gebäude „kaputt“ ist, sondern sein Arbeitsbereich nicht mehr genügend nutzbare Ziele bietet.

Mögliche Reaktionen:

- Arbeitsbereich verschieben,
- neues Produktionsgebäude an besserem Standort errichten,
- später zusätzliche regenerative/landwirtschaftliche Systeme nutzen.

Ob und wie einzelne natürliche Ressourcen nachwachsen, wird in S2D-05 bzw. späterem Content-Design entschieden.

## 19. Jagd als dynamischer Engpass

Beim Jäger ist die Ressource mobil.

Dadurch kann die Produktivität schwanken, obwohl das Gebäude unverändert steht.

Der Spieler soll unterscheiden können zwischen:

- grundsätzlich geeignetem Jagdgebiet,
- aktuell keinem geeigneten Tier im Bereich,
- Jäger nicht verfügbar,
- Ausgangslager voll,
- Transportstau.

Es darf keine unsichtbare Ersatzproduktion geben, nur damit die Produktionsrate konstant bleibt.

## 20. Keine künstliche Daueroptimierung

Der Spieler soll nicht gezwungen werden, ständig Gebäudeparameter nachzuregeln.

Das System soll weitgehend automatisch und stabil laufen, wenn die Siedlung vernünftig aufgebaut ist.

Spielerintervention ist vor allem sinnvoll bei:

- Wachstum,
- echten Engpässen,
- erschöpften/ungünstigen Arbeitsbereichen,
- bewusstem Pausieren,
- räumlicher Umplanung,
- später einfachen Prioritätsentscheidungen.

Damit bleibt das Spiel beobachtbar und gemütlich statt zu einem Micromanagement-Spiel zu werden.

## 21. Fehler, Warnung und Information unterscheiden

Spielerfeedback soll drei Bedeutungen auseinanderhalten:

- **Information:** normaler Zustand, keine Reaktion nötig.
- **Engpass/Warnung:** Simulation funktioniert, aber der Spieler kann sinnvoll verbessern.
- **Fehler/ungültiger Zustand:** etwas kann fachlich nicht weiterlaufen, z. B. Ziel dauerhaft nicht erreichbar.

Diese Bedeutungen sollen später visuell nicht dieselbe Alarmstärke bekommen.

## 22. Guidance bei ersten Engpässen

Das Guidance-System darf wichtige Zusammenhänge beim ersten Auftreten erklären.

Beispiele:

- erster voller Produktionsstapel -> „Die Ware wartet auf Transport.“
- erste Baustelle mit vollständigem Material -> „Jetzt muss ein Bauarbeiter ankommen.“
- erster Arbeitskräftemangel -> Zusammenhang Wohnraum/Bewohner/Arbeit erklären,
- erster Rohstoffmangel -> Arbeitsbereich erklären,
- erster Erreichbarkeitsfehler -> erklären, dass Zugang/Lage problematisch ist.

Die Guidance soll dabei nicht jeden wiederkehrenden Engpass erneut kommentieren.

## 23. Sandbox-Erfolg ohne formale Siegbedingung

Der erste vollständige Sandbox-Kern benötigt keine feste Siegbedingung.

Die unmittelbare Motivation entsteht aus:

- funktionierende Kreisläufe aufbauen,
- wachsende sichtbare Siedlung,
- Bestände aufbauen,
- Engpässe beseitigen,
- Arbeitswege beobachten,
- Welt beleben,
- effizienter und größer werden.

Szenarien, Ziele und Sieg-/Niederlagebedingungen bleiben LATER.

## 24. Mindestanforderungen an wirtschaftliche Lesbarkeit

Ein Spieler muss im Kern ohne Developer Inspector nachvollziehen können:

1. ob ein Gebäude arbeitet,
2. wenn nicht: warum nicht,
3. ob Ware produziert wurde,
4. wo diese Ware gerade liegt,
5. ob Ware transportiert wird,
6. ob eine Baustelle noch Material braucht,
7. ob das Material bereits unterwegs/reserviert ist,
8. ob die Baustelle nur noch auf einen Bauarbeiter wartet,
9. ob Wohnraum bzw. Arbeitskräfte knapp sind,
10. ob Rohstoff, Produktion oder Logistik den Engpass verursacht.

Der Inspector darf später tiefere Diagnosen liefern, aber keine Information ersetzen, die der normale Spieler zum Verstehen des Spiels benötigt.

## 25. Game-Design-Invarianten für Engpässe

1. Ein Engpass muss eine reale Ursache in der Simulation haben.
2. Ursache und Folge dürfen im Feedback nicht verwechselt werden.
3. Lokale Ware ist nicht automatisch zentral verfügbar.
4. Voller lokaler Bestand bedeutet nicht automatisch Rohstoffmangel.
5. Material vollständig bedeutet noch nicht Baubeginn; Builder muss ankommen.
6. Ein zugewiesener, aber noch laufender Worker ist nicht dasselbe wie `kein Worker`.
7. Pause ist ein bewusster Zustand und kein Fehler.
8. Unerreichbarkeit darf keine Endlosschleife erzeugen.
9. Der Spieler soll kritische Zusammenhänge möglichst zuerst in der Welt sehen können.
10. Detail-UI erklärt die Welt; sie ersetzt sie nicht.
11. Wachstum darf neue reale Engpässe erzeugen.
12. Das Spiel soll Lösungen anbieten, ohne permanentes Micromanagement zu verlangen.

## 26. Was S2D-01D bewusst offen lässt

Noch nicht festgelegt werden:

- finale Startressourcen,
- endgültige Baukosten und Produktionsraten,
- exakte lokale/HQ-Lagerkapazitäten,
- konkrete Schwellenwerte für Warnungen,
- genaue Job-/Transportprioritäten,
- genaue Worker-Zuteilung,
- exakte globale HUD-Anordnung,
- konkrete Gebäude-Detailansicht,
- finale Icons/Farben/Animationen,
- konkrete technische Status-Enumnamen,
- Ressourcennachwuchsregeln,
- direkte Producer-to-Consumer-Ketten,
- separates Lagerhaus,
- komplexe Spielerprioritäten,
- Szenarioziele/Siegbedingungen.

Diese Punkte gehören in S2D-02, S2D-03, S2D-04, S2D-05 oder spätere Game-Design-Erweiterungen.

## 27. Abschluss S2D-01D

Die wirtschaftliche Entwicklung, die zentralen Engpassarten und die notwendige Spielerlesbarkeit des V1-Kerns sind damit fachlich definiert.

**S2D-01D – Economy Progression, Shortages & Player Feedback: COMPLETE**  
**Implementation changes: 0**  
**Product scope conflict gegenüber S2D-00 V0.1 FROZEN: 0**
