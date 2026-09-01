# S2D-00 – PROJECT MASTER

Status: **V0.1 DRAFT**  
Datum: 2026-09-01  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/sa-05-resident-workforce`  
Planungsbasis: S2D-00A Project Reconstruction & Design Audit + S2D-00B Product Scope & Open Decision Register  
Technische Referenzbasis: SA-DOC-01A / SA-DOC-01B / SA-DOC-01C / SA-R01A  

## 1. Zweck

Dieses Dokument ist die verbindliche oberste Produkt- und Entwicklungsgrundlage für den Neuaufbau des bestehenden 2D-Siedler-Spiels.

Das Ziel ist **kein vollständiger Neubeginn ohne Rücksicht auf den vorhandenen Stand**. Bewährte und bereits funktionierende Mechaniken, Assets, Daten und Spiellogiken werden weiterverwendet, soweit sie zum neuen Zielbild passen. Historisch gewachsene Patch-Schichten, doppelte Zustandsbesitzer und technische Altlasten werden dagegen schrittweise durch klare Runtime-Systeme ersetzt.

Die zentrale Vorgabe lautet:

> **Schneller zu einem stabilen, vollständigen, gut testbaren Wirtschaftsspiel kommen – mit klarer Architektur, hoher Wiederverwendung und möglichst wenig manueller Wiederholungsarbeit.**

## 2. Produktvision

Das Spiel ist eine kompakte, moderne 2D-Aufbau- und Wirtschaftssimulation mit dem beobachtbaren Charme klassischer Siedler-Spiele.

Es soll insbesondere überzeugen durch:

- sichtbare Waren- und Transportwege,
- Bewohner mit eigenen Häusern und sichtbarem Tagesverhalten,
- echte physische Produktions- und Lieferketten,
- verständliche Bau- und Produktionsabläufe,
- lebendige Tiere und Arbeitswege,
- automatisch entstehende Trampelpfade,
- wenig unnötiges Micromanagement,
- klare und angenehme Bedienung auf Smartphone, Tablet und Desktop,
- ein unaufdringliches Einführungs- und Hilfesystem,
- eine technische Struktur, die sich dauerhaft weiterentwickeln lässt.

Das Spiel orientiert sich im Gefühl an `Die Siedler II / III / IV`, ist aber kein Nachbau. Eigene Bedienlogik, eigene Inhalte, eigene Kartenmechaniken und spätere Erweiterungen sind ausdrücklich vorgesehen.

## 3. Entwicklungsprinzipien

### P-01 – Wirtschaft zuerst

Der erste vollständige Meilenstein ist ein **kleiner, aber geschlossener Wirtschaftskern**.

Priorität hat:

`HQ -> Häuser -> Bewohner -> Produktion -> lokale Lager -> Transport -> HQ -> Bau -> Expansion`

Militär, Kampagne, komplexe Gebietsmechanik und große Zusatzsysteme kommen erst nach einem stabilen Wirtschaftskern.

### P-02 – Sichtbare Simulation

Waren, Bewohner, Arbeiter und Transporte sollen nicht nur Zahlen sein. Relevante Abläufe sollen sichtbar und nachvollziehbar stattfinden.

### P-03 – Mobile First

Smartphone ist eine vollwertige Zielplattform.

Touch-Bedienung, Buttons, Zoom, Auswahl, Menüs und Informationsdichte werden von Anfang an dafür ausgelegt.

Tablet und Desktop dürfen zusätzlichen Platz nutzen, dürfen aber keine grundsätzlich andere Spielmechanik erfordern.

### P-04 – Ein Zustand, ein Owner

Jeder wichtige Gameplay-Zustand besitzt genau einen autoritativen Owner.

Keine dauerhafte Patch-Ownership, keine parallelen Stores für denselben Zustand und keine versteckte zweite Business-Logik in UI, SaveGame oder Inspector.

### P-05 – Wiederverwendung vor Neuerfindung

Vorhandene funktionierende Assets, Sprites, Daten und Mechaniken werden übernommen und bei Bedarf angepasst.

Asset-, Sprite-, Atlas-, JSON- und ähnliche Entwicklungswerkzeuge gehören langfristig auf die gemeinsame externe **Dev-Tool-Seite** und nicht in den Game-Inspector.

### P-06 – Kleine geschlossene Entwicklungsblöcke

Jeder Implementierungsblock muss einen klaren Zweck, klare Owner, einen testbaren Abschluss und ein definiertes Rückfallverhalten besitzen.

Blindes Nachpatchen wird vermieden.

## 4. Verbindlicher V1-Wirtschaftskern

### 4.1 Welt

Für den ersten vollständigen Stand werden **definierte Karten** verwendet.

Vorhandene Terrain-, Wasser-, Rohstoff- und Tiermechaniken werden weiterverwendet, soweit sie technisch geeignet sind.

Ein Zufallskartengenerator, Inselwelten und komplexe Weltgeneration sind spätere Erweiterungen.

### 4.2 Hauptquartier

Das HQ ist im ersten Kern:

- Startgebäude,
- zentrale Anlieferstelle,
- primäres Lager,
- wirtschaftlicher Mittelpunkt der Siedlung.

Ein separates Lagerhaus ist später möglich, aber nicht notwendig, bevor der Kern stabil funktioniert.

### 4.3 Gebäude-Basis

Die aktuell vorhandenen aktiven Gebäude bilden den ersten Content-Kern:

- Rathaus / HQ,
- Holzfällerhütte,
- Steinbruch,
- Fischerhütte,
- Jägerhütte,
- kleines Wohnhaus,
- mittleres Wohnhaus.

Neue Gebäude und Produktionsketten werden erst nach Stabilisierung dieses Grundsystems schrittweise ergänzt.

### 4.4 Ressourcen und Wirtschaftswerte

Physische Waren:

- Holz,
- Stein,
- Fisch,
- Fleisch,
- Fell.

Wirtschaftswert:

- Gold.

Bevölkerung ist **keine transportierbare Ware**, sondern ein aus den tatsächlichen Bewohnern abgeleiteter Simulationswert.

### 4.5 Produktion

Verbindlicher Warenfluss:

`Produktionsgebäude -> lokaler Produktionsbestand -> Transportauftrag -> physischer Träger -> HQ/Lager -> globale Gutschrift`

Es gibt nur eine globale Warenbuchung: nach erfolgreicher Lieferung an das Ziel-Lager.

Produktionsgebäude dürfen pausiert werden.

### 4.6 Logistik

Waren werden physisch transportiert.

Transportaufträge dürfen nur entstehen, wenn:

- reale Ware verfügbar ist,
- ein realer Bedarf besteht,
- Quelle und Ziel gültig sind,
- Quelle und Ziel erreichbar sind.

Überlieferungen über den tatsächlichen Bedarf hinaus sind zu verhindern.

### 4.7 Bauwesen

Verbindlicher Bauzustand:

`WAIT_MATERIAL -> WAIT_BUILDER -> BUILDING -> COMPLETE`

Ein Gebäude darf erst gebaut werden, wenn:

1. die erforderlichen Materialien vollständig geliefert wurden,
2. ein geeigneter Bauarbeiter tatsächlich angekommen ist.

Eine Baustelle darf keine weiteren Waren anfordern, wenn ihr Restbedarf bereits gedeckt ist.

Grundlegender Abriss gehört zum Kern. Detailregeln für Rückerstattung werden später festgelegt.

### 4.8 Häuser und Bewohner

Bewohner gehören dauerhaft zu einem Wohnhaus.

Bestehende Baseline:

- kleines Wohnhaus: 2 Bewohner,
- mittleres Wohnhaus: 3 Bewohner.

Freie Bewohner bleiben Bewohner. Ihre Identität wird nicht mehr dauerhaft oder temporär in einen anderen Unit-Typ umgeschrieben.

Stattdessen erhalten sie bei Bedarf eine zeitlich begrenzte Aufgabe bzw. Assignment.

Zielablauf:

`Zuhause/Frei -> temporäre Aufgabe -> Weg zur Aufgabe -> Arbeit -> Frei -> Rückkehr/Freizeit`

Im Leerlauf dürfen Bewohner:

- im Haus bleiben,
- gelegentlich herauskommen,
- sich sinnvoll in der Nähe bewegen,
- später wieder nach Hause zurückkehren.

### 4.9 Workforce

Spezialisten bleiben möglich und sinnvoll, z. B.:

- feste Träger,
- Bauarbeiter,
- Holzfäller,
- Steinmetze,
- Fischer,
- Jäger.

Freie Bewohner dürfen im ersten Kern insbesondere **einfache allgemeine Transporte** übernehmen.

Spezialisten haben Vorrang, wenn eine passende Fachkraft verfügbar ist.

Ungeeignete oder nicht erreichbare Aufgaben müssen abgelehnt bzw. mit Backoff behandelt werden. Endlose Neuberechnungs- oder Fail-Schleifen sind nicht zulässig.

## 5. Tiere und Jagd

Tiere sind sichtbare Einheiten der Welt.

Der Jäger arbeitet mit real vorhandenen Tieren im Arbeitsgebiet.

Die genaue Artenliste und spätere Tiermechaniken gehören in S2D-05 – Content Catalog.

## 6. Navigation und Wege

### 6.1 Navigation

A* wird zunächst beibehalten.

Eine grundlegende Neuentwicklung des Pathfinders ist nicht Teil des ersten Architekturumbaus.

Verbindlich sind dagegen:

- gültige Gebäudezugänge und Dockingpunkte,
- Reachability-Prüfung vor Jobvergabe,
- kontrollierter Backoff bei temporär nicht möglichen Wegen,
- keine endlosen A*-FAIL-Schleifen,
- klare Zuständigkeit über einen NavigationService.

### 6.2 Automatische Trampelpfade

Trampelpfade bleiben ein charakteristisches Gameplay- und Darstellungsmerkmal.

Die bisherige Logik, bei jeder Bewegung immer neue einzelne Stempel dauerhaft anzusammeln und diese ständig vollständig neu zu rendern, ist **nicht Zielarchitektur**.

Ziel ist ein aggregiertes Wear-System:

`Unit-Bewegung -> lokale Abnutzungs-/Wear-Werte -> Dirty-Bereiche -> periodische visuelle Aktualisierung`

Dabei soll räumlich zusammengefasst werden. Bewegung in bereits stark genutzter Nähe erzeugt keinen neuen unabhängigen Dauerstempel, sondern verstärkt einen vorhandenen Bereich nur kontrolliert.

Für die Darstellung ist ein gecachtes bzw. gebackenes Verfahren ausdrücklich vorgesehen, z. B.:

- Offscreen-Canvas oder Render-Texture pro Kartenbereich,
- periodisches Einbacken transparenter Footprint-/Noise-Masken,
- Dirty-Tile-Updates statt kompletter Neuzeichnung,
- langsames Abklingen der Wear-Werte,
- periodisches Re-Bake für sichtbares Zuwachsen.

Die endgültige technische Variante wird in S2D-03 festgelegt. Das Produktziel lautet: **organische, weich entstehende und wieder zuwachsende Trampelpfade ohne tausende permanente Einzelobjekte.**

Vom Spieler bewusst gebaute oder aufgewertete Straßen sind ein separates späteres System.

## 7. Spielmodus und Progression

Der erste vollständige Spielmodus ist **Sandbox**.

Ziel ist zunächst ein stabiler Spielablauf ohne künstlichen Kampagnenzwang.

Später vorgesehen:

- Szenarien,
- definierte Ziele,
- Sieg-/Niederlagebedingungen,
- Kampagne,
- weitere Wirtschafts- und Fortschrittssysteme.

## 8. Nicht im ersten Wirtschaftskern

Folgende Punkte werden bewusst nicht in den ersten vollständigen Kern gezogen:

- komplexes Territory-/Grenzsystem,
- militärische Gebietseroberung,
- Militärsystem,
- Kampagne,
- große Epochenstruktur,
- Zufallskartengenerator,
- komplexes Straßenausbausystem,
- umfangreiche Berufswerkzeuge,
- große zusätzliche Produktionsketten.

Diese Punkte sind nicht grundsätzlich verworfen, sondern auf spätere Phasen verschoben.

## 9. UI, Tooltips und Einführung

### 9.1 Mobile UX

Die Bedienoberfläche wird in S2D-04 vollständig neu strukturiert.

Dabei gelten:

- ausreichend große Touch-Ziele,
- kompakter Ressourcen-HUD,
- verständliche Bauauswahl,
- klares Gebäudemenü,
- leichtes Zoom/Pan/Select,
- Informationen nur dann, wenn sie benötigt werden,
- gleiche Spielmechanik auf Smartphone, Tablet und Desktop.

### 9.2 Guidance-System

Tooltip- und Tutorial-Verhalten wird von Anfang an als eigenes **Guidance-System** berücksichtigt.

Es ist kein Satz dauerhaft eingeblendeter Hilfetexte.

Hinweise besitzen stabile IDs und einen gespeicherten Zustand, z. B.:

- ungesehen,
- gezeigt,
- abgeschlossen.

Beispiele:

- erster Hausbau,
- erster Bewohner,
- erste Produktion,
- erste Ware im lokalen Lager,
- erster Transport,
- erste Baustelle,
- Pause eines Gebäudes,
- erster Engpass.

Nach erfolgreicher Einführung werden solche Hinweise nicht ständig wiederholt.

Der Spieler kann die Einführung später über Hilfe/Einstellungen erneut starten.

Das Guidance-System reagiert auf öffentliche Gameplay-Events und besitzt keine eigene Gameplay-Logik.

## 10. Developer Inspector

Der Inspector bleibt Teil des Projekts, wird aber deutlich fokussierter.

Seine Zielrolle ist **Runtime-Analyse und kontrollierte Simulation**, nicht Asset-Produktion und nicht Gameplay-Patching.

### 10.1 Kernfunktionen

Der zukünftige schlanke Inspector soll mindestens ermöglichen:

- Runtime-Gesamtübersicht,
- Gebäudezustände,
- Units/Bewohner/Worker,
- aktive und wartende Jobs,
- lokale BuildingStocks,
- globale Ressourcen,
- Bauzustände,
- Navigation und Reachability,
- aktuelle Pfad-/Wear-Statistik,
- Scheduler-/Tick-Laufzeiten,
- Render-/Performance-Werte,
- Event-Trace,
- SaveGame-Snapshot-/Restore-Diagnose,
- kontrollierte Debug-Commands,
- ausgewählte Simulationsparameter während der Entwicklung ansehen und setzen.

Der Inspector darf das Spielverhalten im deaktivierten Zustand nicht verändern.

Er liest über öffentliche APIs/Snapshots und führt Änderungen nur über definierte Debug-Commands aus.

### 10.2 Nicht mehr Aufgabe des Inspectors

Folgende Funktionen gehören auf die gemeinsame externe Dev-Tool-Seite:

- Sprite-Erstellung und -Bearbeitung,
- Sprite-Atlas-Erstellung,
- Asset-Parametrierung,
- JSON-Erzeugung und -Validierung,
- allgemeine Content-Editoren,
- wiederverwendbare Asset-Entwicklungswerkzeuge.

Dadurch kann der Inspector klein und simulationsnah bleiben.

## 11. Gemeinsame Dev-Tool-Seite

Für wiederverwendbare Entwicklungswerkzeuge wird die bereits vorhandene separate Dev-Tool-Umgebung genutzt und weiter ausgebaut.

Die Game-Projekte sollen ihre Content-Produktion künftig möglichst nicht jeweils selbst neu implementieren.

Langfristig sollen dort gemeinsame Werkzeuge liegen für:

- Sprites,
- Sprite-Atlanten,
- Texturen,
- Asset-Parameter,
- JSON-Dateien,
- Definitionen,
- Validierung,
- Vorschau/Test,
- Export in die jeweiligen Projekte.

Das Siedler-Spiel definiert nur noch die Datenformate und Import-/Runtime-Anforderungen, die es selbst benötigt.

## 12. Technische Zielarchitektur

Verbindliches Ownership-Ziel:

| Bereich | Ziel-Owner |
|---|---|
| Lifecycle | BootManager / Lifecycle |
| Globale Ressourcen | ResourceStore |
| Gebäude | BuildingStore / Buildings |
| Units & Resident State | GameUnits / UnitStore |
| Housing | HousingService |
| Jobs | JobEngine |
| Assignment | JobScheduler / WorkforceScheduler |
| Construction | ConstructionSystem |
| Production | ProductionSystem |
| Lokale Waren | BuildingStock |
| Transport | LogisticsSystem |
| Navigation | NavigationService |
| Rohstoffe auf Karte | MapResources |
| Tiere | MapAnimals |
| Arbeitsbereiche | WorkAreaSystem |
| Trampelpfade/Wear | PathSystem |
| Rendering | zentrale RenderPipeline |
| Save/Continue | SaveGameService |
| Guidance | GuidanceSystem |
| Inspector | separates Developer Read/Command Subsystem |
| Simulationsplanung | zentraler GameTick/SystemScheduler |

Die exakten Dateinamen können sich ändern. Die Ownership-Regel ist verbindlich.

## 13. Zentrale Datenflüsse

### Produktion

`ProductionSystem -> BuildingStock -> Logistics -> JobEngine -> Unit -> HQ -> ResourceStore`

### Bau

`Placement -> ConstructionSite -> Materialbedarf -> Logistics -> Material vollständig -> Builder Job -> Builder angekommen -> Baufortschritt -> Complete`

### Workforce

`Housing -> Resident -> WorkforceScheduler -> Assignment -> Job -> Aufgabe -> Frei/Rückkehr`

### Save/Continue

`Owner.snapshot() -> SaveGameService -> Storage`

und

`Storage -> Validate -> Owner.restore() -> Runtime Reconstruction`

### Wege

`Unit movement -> PathSystem Wear Aggregation -> Dirty Region -> Path Render Cache/Bake`

### Guidance

`Gameplay Event -> GuidanceSystem -> Rule/Progress Check -> optionaler Hinweis -> gespeicherter Guidance-State`

## 14. Performance-Grundsätze

Performance wird nicht mehr hauptsächlich durch nachträgliche Schutz-Patches behandelt.

Ziel:

- ein zentraler Simulationsscheduler,
- ein RAF für die RenderPipeline,
- Event-getriebene Zustandswechsel statt unnötigem Polling,
- Navigation nur bei realem Bedarf,
- Jobvalidierung vor Wegsuche,
- Dirty-/Cache-Systeme für teure Visualisierungen,
- SaveGame über definierte Snapshot-Owner,
- Inspector-Messwerte zur direkten Laufzeitanalyse.

## 15. Save/Continue

Save/Continue bleibt Kernfunktion.

Persistiert oder eindeutig rekonstruierbar sein müssen mindestens:

- Gebäude,
- globale Ressourcen,
- lokale Produktionsbestände,
- Bewohner und Home-Bindings,
- relevante Worker-/Assignment-Zustände,
- Baustellen und Lieferstände,
- Pause-Zustände,
- Tiere/Rohstoffe, soweit persistent erforderlich,
- Trampelpfad-/Wear-Zustand,
- Steuer-/Economy-Zustände,
- Guidance-Fortschritt.

SaveGame ist niemals ein zweiter Gameplay-Owner.

## 16. Dokumentstruktur

Die neue verbindliche Dokumentation besteht aus:

- `S2D-00 – PROJECT MASTER`
- `S2D-01 – GAME DESIGN`
- `S2D-02 – UNIT & WORKFORCE MODEL`
- `S2D-03 – TECHNICAL ARCHITECTURE`
- `S2D-04 – UI / MOBILE UX`
- `S2D-05 – CONTENT CATALOG`
- `S2D-06 – ROADMAP & VALIDATION`
- `S2D-07 – DECISION & CHANGE LOG`

Historische SA-Dokumente bleiben technische Quellen und Nachweise, sind aber nicht mehr der oberste Produktscope.

## 17. Entwicklungsbeschleunigung

Da bereits ein großer funktionaler Bestand existiert, soll der Umbau nicht wie ein vollständig neues Projekt behandelt werden.

Grundsatz für jeden kommenden Block:

1. aktuellen Runtime-Bestand automatisiert prüfen,
2. vorhandene passende Funktion übernehmen,
3. Legacy-/Patchanteile identifizieren,
4. genau einen Ziel-Owner herstellen,
5. automatische Checks/Diagnosen ergänzen,
6. Browser-/Runtime-Test möglichst automatisieren,
7. nur die für echtes Spielgefühl nötigen manuellen Tests beim Nutzer lassen.

Die öffentliche bzw. direkt zugängliche Repository-Struktur und GitHub-Integration sollen genutzt werden, um Codeprüfung, Branchkontrolle, Dokumentation und möglichst viele Regressionstests zu automatisieren.

## 18. Branch- und Freeze-Regeln

Verbindlich:

- SA-04 Freeze bleibt unverändert: `feature/sa-04-savegame-v2` / `789eab6cc6084eb001953b85ecbc6a4951ec5bce`.
- Aktueller Planungs-/Entwicklungsbranch: `feature/sa-05-resident-workforce`.
- `main` wird nicht ohne ausdrückliche Freigabe verändert.
- Vor jedem Implementierungsblock: Branch + HEAD prüfen.
- Nach jedem Implementierungsblock: Branch + geänderte Dateien prüfen.

## 19. Status des Masters

Dieser Stand ist `V0.1 DRAFT`.

Er legt Produktziel, Scope, Architekturgrundsätze und Systemgrenzen fest, ersetzt aber noch nicht die Detailentscheidungen der nachfolgenden S2D-Dokumente.

Noch nicht in diesem Dokument festzulegen sind insbesondere:

- genaue Worker-State-Machine,
- exakte Job-Prioritäten,
- konkrete Datenmodelle/APIs,
- finale UI-Struktur,
- endgültige Balancewerte,
- genaue Content-Erweiterungen,
- endgültiges Path-Wear-/Bake-Verfahren,
- konkrete Inspector-UI.

Diese Entscheidungen werden bewusst in den zuständigen Folgedokumenten getroffen.

## 20. Abschluss S2D-00C

S2D-00A hat den realen Projektstand und die Altlasten rekonstruiert.

S2D-00B hat den Produktscope in NOW / LATER / OUT getrennt.

S2D-00C führt beides in diesem Master zusammen.

**S2D-00C – Project Master Assembly: COMPLETE**  
**S2D-00 – PROJECT MASTER V0.1: DRAFT**
