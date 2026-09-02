# S2D-05E – V1 Balance Parameter Catalog & Tuning Boundaries

Status: **COMPLETE / 0 BLOCKER**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-05-content-catalog`  
Verbindliche Basis: S2D-00 bis S2D-04 FROZEN + S2D-05A/B/C/D COMPLETE

## 1. Zweck

S2D-05E legt vollständig fest, **welche fachlichen Parameter des V1-Wirtschaftskerns später gebalanced werden müssen**, wie sie voneinander abhängen und welche Testziele beim Tuning gelten.

Dieser Block legt ausdrücklich **keine finalen Zahlenwerte** fest.

Historisch vorhandene Werte in `data/buildings.json`, `data/units.json`, `core/map.resources.js`, `core/map.animals.js`, `data/balance.json` und ähnlichen Dateien sind Baseline-/Testwerte und keine automatische V1-Balancefreigabe.

## 2. Zentrale Balance-Regel

> **Balance darf das bestätigte Spielmodell abstimmen, aber keine fachlichen Regeln aus S2D-00 bis S2D-05D umgehen.**

Beispiele:
- Ein kürzerer Bauzeitwert darf niemals erlauben, vor Builder-Ankunft zu bauen.
- Ein Produktionsmultiplikator darf niemals Output direkt ins HQ teleportieren.
- Ein hoher Goldwert darf Gold nicht zu einer physischen Transportware machen.
- Eine niedrige lokale Lagerkapazität darf keine Waren duplizieren oder vernichten.

## 3. Parameterklassen

### 3.1 CONTENT FIXED

Nicht normal zu balancen, weil fachlich bereits fest:
- sieben V1-Gebäudetypen,
- fünf physische V1-Waren,
- Gold als nicht-physischer Wirtschaftswert,
- Population aus realen Bewohnern,
- kleines Haus = Baseline 2 Bewohner,
- mittleres Haus = Baseline 3 Bewohner,
- Produktionsoutputs je Gebäudeart,
- Spezialisten-/Capability-Anforderung,
- reale WorkArea-/Weltzielbindung,
- realer Warentransport,
- Material vollständig + Builder angekommen vor Baufortschritt.

### 3.2 TUNABLE BALANCE

Werte, die bewusst kalibriert werden dürfen:
- Kosten,
- Zeiten,
- Kapazitäten,
- Mengen/Erträge,
- Radien,
- Populationen,
- Regeneration,
- Goldraten,
- Startbestände,
- Prioritätsgewichte, sofern spielerisch und nicht architekturkritisch.

### 3.3 TECHNICAL / NOT BALANCE

Keine Balanceparameter:
- Tickrate als technische Scheduler-Frage,
- Render-FPS,
- A*-Cachegrößen,
- Autosaveintervall,
- UI-Pixelmaße,
- Debug-Intervalle,
- Atlas-FPS, sofern nur visuell,
- Retry-Backoff-Implementierungsdetails, soweit nicht spielerisch relevant.

Die historische `data/balance.json` mischt derzeit z. B. `tickRate`, `autosaveInterval` und Schwierigkeits-Produktionsmultiplikatoren. Diese Datei ist deshalb keine verbindliche Zielstruktur für das spätere V1-Balancing.

---

# 4. Baukostenparameter

Für jedes regulär baubare V1-Gebäude:
- Holzbedarf,
- Steinbedarf.

Betroffene Gebäude:
- kleines Wohnhaus,
- mittleres Wohnhaus,
- Holzfällerhütte,
- Steinbruch,
- Fischerhütte,
- Jägerhütte.

HQ-Kosten bleiben gesondert, da HQ im normalen V1-New-Game-Pfad Startgebäude ist.

## 4.1 Abhängigkeiten

Baukosten beeinflussen direkt:
- Ausbaugeschwindigkeit,
- benötigte Holz-/Steinproduktion,
- Carrierbelastung,
- Baustellenwartezeiten,
- Bedarf an Wohnraum/Workforce,
- wahrgenommenes Tempo der ersten 10–30 Spielminuten.

## 4.2 Tuning-Ziel

Der Spieler soll früh mehrere sinnvolle Gebäude bauen können, aber nicht so schnell, dass Holz/Steinproduktion und Transport irrelevant werden.

Baukosten dürfen keinen Deadlock erzeugen, bei dem die zum Ausbau benötigte Produktion nicht mehr mit realistisch erreichbaren Startressourcen aufgebaut werden kann.

---

# 5. Startbestand / Startwirtschaft

Zu balancen:
- Start-Holz,
- Start-Stein,
- Start-Gold,
- gegebenenfalls Startbewohner/Startwohnraum entsprechend finalem New-Game-Setup,
- initiale Spezialistenverteilung,
- initiale Carrieranzahl,
- initiale Builderanzahl.

## Abhängigkeiten

Startbestände müssen mindestens ermöglichen:
- erste Wohnraumerweiterung,
- Aufbau der Grundproduktion,
- erste sinnvolle Baustelle,
- Beobachtung des Warenflusses ohne sofortigen Softlock.

## Testziel

Ein neuer Spieler soll ohne Spezialwissen einen funktionierenden ersten Produktions-/Baukreislauf erreichen können.

---

# 6. Bauzeitparameter

Zu balancen:
- Baufortschrittsdauer je Gebäudetyp,
- gegebenenfalls Baufortschritt pro Builder-Arbeitseinheit,
- Anzahl sichtbarer Bauphasen nur dann, wenn sie gameplayrelevant ist.

Nicht verhandelbar:
- Zeit beginnt erst nach vollständiger physischer Materiallieferung und realer Builder-Ankunft.

## Abhängigkeiten

Bauzeit steht im Verhältnis zu:
- Materiallieferzeit,
- Builder-Verfügbarkeit,
- Weglänge,
- Anzahl paralleler Baustellen,
- Gebäudegröße/-Bedeutung.

## Testziel

Materiallogistik und Builderweg sollen sichtbar relevant sein; die reine Fortschrittsphase darf weder bedeutungslos kurz noch störend lang sein.

---

# 7. Produktionszeitparameter

Je Produktionsgebäude:
- Holzfäller-Zyklus,
- Steinbruch-Zyklus,
- Fischer-Zyklus,
- Jäger-/Jagdzyklus bzw. Arbeitsdauer.

## Abhängigkeiten

Produktionsrate hängt zusätzlich ab von:
- Worker-Verfügbarkeit,
- Weg zum Weltziel,
- WorkArea,
- Ressourcenverfügbarkeit,
- lokalem Outputstock,
- Carrierabholung.

Deshalb darf nicht nur die nackte Zykluszeit isoliert optimiert werden.

## Testziel

Der Spieler soll unterscheiden können, ob ein Engpass aus Produktion, Rohstoffzugang, Workforce oder Transport entsteht.

---

# 8. Lokale Lagerkapazitäten

Zu balancen pro Produktionsgebäude/Ware:
- maximale lokale Holzmenge,
- maximale lokale Steinmenge,
- maximale lokale Fischmenge,
- maximale lokale Fleischmenge,
- maximale lokale Fellmenge.

Optional:
- gemeinsame vs. getrennte Jägerkapazität für Fleisch/Fell.

## Abhängigkeiten

Kapazität beeinflusst:
- wie schnell Transportstau sichtbar wird,
- wie empfindlich Produktion auf Carrierknappheit reagiert,
- wie viele sichtbare Warenstapel entstehen,
- wie viel Puffer die Wirtschaft besitzt.

## Testziel

Lokale Stocks sollen genug Puffer bieten, dass Transport nicht bei jedem einzelnen Stück sofort kritisch wird, aber klein genug bleiben, dass schlechte Logistik sichtbar blockiert.

---

# 9. HQ-/Storage-Kapazität

Zu entscheiden/zu balancen:
- ob HQ im V1 faktisch unbegrenzt bleibt oder eine hohe endliche Kapazität besitzt,
- gegebenenfalls Kapazität je Ware oder gemeinsam.

Für den ersten Kern darf eine künstlich niedrige HQ-Kapazität nicht unnötig zusätzliche Lager-Mikrosteuerung erzwingen.

## Testziel

HQ-Kapazität soll den Wirtschaftskern nicht dominieren, solange separates Lagerhaus LATER ist.

---

# 10. WorkArea-Parameter

Zu balancen:
- Holzfäller-Radius,
- Steinbruch-Radius,
- Fischer-Radius,
- Jäger-Radius.

Optional später:
- Mindest-/Maximalradius,
- Änderungskosten, falls überhaupt eingeführt.

## Abhängigkeiten

WorkArea beeinflusst:
- Ressourcenzugang,
- Worker-Weglängen,
- Navigation,
- Ressourcendruck,
- benötigte Anzahl Produktionsgebäude.

## Testziel

WorkAreas sollen eine echte räumliche Entscheidung bleiben: groß genug für praktikables Spielen, klein genug, dass Gebäudeplatzierung und Ressourcennähe Bedeutung haben.

---

# 11. Workforce-Parameter

Zu balancen:
- Anzahl Carrier im Startzustand,
- Anzahl Builder,
- Anzahl/Verteilung spezialisierter Worker,
- maximale gleichzeitig aktive Worker je Gebäude,
- Verfügbarkeit allgemeiner Bewohner für Hilfstransport,
- Prioritätsgewicht Carrier vs. Resident Helper.

Nicht balancierbar wegzunehmen:
- Spezialistenvorrang bei Transport,
- kein beliebiger Resident-Fallback für Facharbeit,
- Resident bleibt Resident.

## Testziel

Workforce soll knapp genug sein, um Siedlungsplanung relevant zu machen, aber nicht so knapp, dass die Basissimulation regelmäßig stillsteht.

---

# 12. Bewegung und Transport

Zu balancen:
- Unit-Bewegungsgeschwindigkeiten,
- Transportkapazität pro Carrier/Resident Helper,
- Pickup-/Delivery-Arbeitsdauer, falls spielerisch sichtbar,
- gegebenenfalls Belastungs-/Tragegeschwindigkeit später.

## Abhängigkeiten

Transportleistung entsteht aus:

`Anzahl Transportkräfte × Tragkapazität × Bewegungsgeschwindigkeit × reale Weglänge × Job-/Warteanteile`

Nicht nur Carriergeschwindigkeit isoliert betrachten.

## Testziel

Weglänge soll spürbar sein. Gleichzeitig darf eine normal kompakte V1-Siedlung nicht durch Transport permanent kollabieren.

---

# 13. Baumressourcen

Zu balancen:
- initiale Baumdichte,
- Yield je nutzbarem Baum bzw. Ressourcenknoten,
- Abbau-/Arbeitsdauer,
- Wachstums-/Regenerationsdauer,
- Mindest-/Zielbestand für natürliche Regeneration,
- räumliche Spawn-/Wachstumsregeln.

## Abhängigkeiten

Holz ist zugleich:
- häufiges Baumaterial,
- erster wichtiger Produktionsoutput,
- Treiber für Expansion.

Zu schnelle Regeneration macht Platzierungs-/Ressourcenplanung irrelevant. Zu langsame/fehlende Regeneration kann den Sandbox-Kern langfristig blockieren.

## Testziel

Holz soll lokal erschöpfbar und räumlich relevant sein, aber auf geeigneten Karten langfristig regenerierbar bleiben.

---

# 14. Steinressourcen

Zu balancen:
- initiale Steindichte,
- Yield je Steinquelle,
- Abbau-/Arbeitsdauer,
- Grad der Endlichkeit.

S2D-05C setzt keine schnelle natürliche Steinregeneration voraus.

## Testziel

Stein soll stärker als Holz eine endliche räumliche Ressource darstellen, ohne den kleinen V1-Sandboxkern zu früh hart zu beenden.

---

# 15. Fischressourcen

Zu balancen:
- Anzahl/Dichte Fischziele,
- Yield/Verfügbarkeit,
- Regenerationsgeschwindigkeit,
- lokale Erholungs-/Respawnlogik,
- Arbeitsdauer des Fischers.

## Testziel

Fischerei soll langfristig funktionieren, aber übermäßige Nutzung eines kleinen Bereichs soll temporär spürbar sein können.

---

# 16. Tierpopulationen

Für Reh/Hirsch, Wildschwein, Hase/Kaninchen und Fuchs:
- Startpopulation,
- Max-/Zielpopulation,
- Bewegungs-/Revierparameter soweit gameplayrelevant,
- Reproduktions-/Respawnrate,
- Spawnverteilung,
- Mindestabstände/geeignete Habitate.

Historische `maxPerType`-Werte sind nur Testbaseline.

## Testziel

Die Karte soll lebendig wirken und Jagd soll langfristig möglich bleiben, ohne dass Tiere nach jedem Abschuss sofort sichtbar ersetzt werden.

---

# 17. Jagd-/Beuteparameter

Für jagdbare Arten zu balancen:
- Fleisch-Yield,
- Fell-Yield,
- Erfolgs-/Arbeitsdauer, sofern nicht deterministisch,
- Cooldown/Suchaufwand,
- eventuell unterschiedliche wirtschaftliche Bedeutung je Tierart.

S2D-05C bindet Reh/Hirsch, Wildschwein und Hase/Kaninchen grundsätzlich als jagdbar. Fuchs bleibt mindestens sichtbare Tierwelt; seine produktive Beuterolle bleibt gesondert freizugeben.

## Testziel

Jagd darf nicht automatisch die stärkste Nahrungs-/Wertquelle werden, soll aber als sichtbare alternative Produktionsform sinnvoll bleiben.

---

# 18. Housing-/Population-Parameter

Fachlich fix:
- kleines Haus: 2 Bewohner,
- mittleres Haus: 3 Bewohner.

Noch zu balancen:
- Baukosten beider Häuser,
- gegebenenfalls Verzögerung bis neue Bewohner aktiv werden,
- Startbelegung,
- spätere Umsiedlungs-/Wohnraumrestriktionen, falls V1 nötig.

Nicht als Balancewert behandeln:
- Population als eigener künstlicher Counter.

## Testziel

Mehr Wohnraum soll nachvollziehbar mehr reale Workforce ermöglichen, ohne sofort jede andere Wirtschaftsentscheidung zu ersetzen.

---

# 19. Spezialistenverteilung

Zu balancen bzw. als Start-/Contentregel später festzulegen:
- wie viele Carrier,
- wie viele Builder,
- wie viele Holzfäller,
- wie viele Steinmetze,
- wie viele Fischer,
- wie viele Jäger

initial verfügbar sind bzw. wie sie aus Bewohnern bereitgestellt werden.

Ausbildung/Umschulung ist noch nicht beschlossen und darf nicht stillschweigend über Balanceparameter eingeführt werden.

## Testziel

Der Spieler muss alle Kernketten grundsätzlich betreiben können, Spezialistenmangel soll aber als verständlicher Engpass auftreten können.

---

# 20. Gold-/Steuerparameter

Zu balancen:
- Goldbeitrag pro Bewohner,
- Takt/Intervall oder kontinuierliche Rate,
- gegebenenfalls Unterschiede nach Hausart später,
- Startgold,
- zukünftige Goldausgaben erst wenn fachlich definiert.

Historischer Testwert:
- `1 Gold / Bewohner / 10 Sekunden`

ist ausdrücklich **keine finale V1-Balance**.

## Abhängigkeiten

Goldeinkommen hängt direkt von realer Population/Wohnraum ab.

Gold darf nicht so schnell wachsen, dass es bedeutungslos wird, aber auch nicht künstlich knapp sein, solange der V1-Kern noch kaum definierte Goldausgaben besitzt.

## Testziel

Für V1 zunächst transparente, nachvollziehbare Einnahme. Eine komplexe Finanzwirtschaft wird nicht vorgezogen.

---

# 21. Produktions-/Schwierigkeitsmultiplikatoren

Die historische `data/balance.json` enthält `productionMultiplier` für easy/normal/hard.

Für V1 wird noch **nicht** festgelegt, dass Schwierigkeitsgrade über einen pauschalen Produktionsmultiplikator funktionieren.

Grundregel:

> Globale Multiplikatoren dürfen nicht die Lesbarkeit der physischen Simulation zerstören.

Falls Schwierigkeitsgrade später verwendet werden, müssen sie gezielt geprüft werden gegen:
- Produktionszeit,
- Resource Yield,
- Startbestand,
- Baukosten,
- Workforce,
- Goldrate.

Ein einziger Multiplikator für alles ist nicht automatisch Zielmodell.

---

# 22. Scheduler-/Autosave-Werte sind keine Economy-Balance

Historisch in `data/balance.json`:
- `tickRate`,
- `autosaveInterval`.

Diese Werte werden künftig fachlich getrennt:
- SimulationScheduler-Konfiguration gehört zur Technik/Performance,
- Autosave gehört zu SaveGame/UX,
- Economy-Balance gehört in den Content-/Balancebereich.

S2D-05E verändert diese Dateien noch nicht.

---

# 23. Engpass-Balance

Ein funktionierender V1-Kern soll mehrere mögliche Engpassarten erzeugen können:

1. Rohstoff fehlt,
2. Produktionsworker fehlt,
3. WorkArea ungünstig,
4. lokaler Output voll,
5. Carrier fehlen/Wege lang,
6. Baumaterial fehlt,
7. Builder fehlt,
8. Wohnraum/Workforce knapp.

Kein einzelner Engpasstyp soll in praktisch jeder normalen Spielsituation dominieren.

## Testziel

Bei einer gesunden Siedlung müssen unterschiedliche Spielerentscheidungen unterschiedliche Engpässe lösen können.

---

# 24. Zeitachsen-Balance

Später separat messen:
- Zeit bis erstes neues Haus,
- Zeit bis erste Produktionshütte,
- Zeit bis erster lokaler Output,
- Zeit bis erste reale HQ-Lieferung,
- Zeit bis erste vollständig versorgte Baustelle,
- Zeit bis Builder-Ankunft,
- Zeit bis erstes fertig gebautes Folgegebäude,
- Zeit bis erkennbare Logistikknappheit,
- Zeit bis Ressourcenregeneration relevant wird.

Keine Zielsekunden in S2D-05E.

Die Messpunkte dienen dazu, das Spieltempo als Gesamtsystem zu beurteilen.

---

# 25. V1-Balance-Testprofile

## 25.1 Early Settlement

Prüft:
- Startbestände,
- erstes Haus,
- erste Rohstoffproduktion,
- erste Baustelle,
- grundlegende Workforce.

PASS-Ziel:
- kein Deadlock,
- klare nächste Entscheidung,
- sichtbare Wirtschaft beginnt schnell genug.

## 25.2 Stable Small Settlement

Prüft eine Siedlung mit mehreren Produktionsgebäuden und Häusern.

PASS-Ziel:
- Wirtschaft kann stabil laufen,
- kein unvermeidbarer Transportkollaps,
- Engpässe entstehen verständlich und lösbar.

## 25.3 Logistics Stress

Hoher lokaler Output und mehrere Baustellen.

PASS-Ziel:
- Carrierknappheit wird sichtbar,
- lokale Stocks puffern begrenzt,
- keine Überlieferung/Duplikation,
- Resident Helper unterstützt ohne Spezialistenmodell zu zerstören.

## 25.4 Workforce Stress

Mehr Arbeitsbedarf als Spezialisten.

PASS-Ziel:
- fehlende Spezialisten sichtbar,
- keine automatische illegale Umqualifizierung,
- allgemeine Bewohner helfen nur bei erlaubtem Transport.

## 25.5 Resource Pressure

Rohstoffe in einem Gebiet werden stark genutzt.

PASS-Ziel:
- Bäume/Fisch reagieren auf Nutzung und Regeneration,
- Stein bleibt stärker endlich,
- Spieler erkennt räumliche Konsequenz.

## 25.6 Hunting Sustainability

Längerer Jägerbetrieb.

PASS-Ziel:
- Tierbestand kann lokal sinken,
- Jagd stoppt/wartet bei fehlenden Zielen,
- Population erholt sich kontrolliert,
- keine sofortige Ersatzspawn-Schleife.

## 25.7 Long Sandbox

Länger laufende Siedlung.

PASS-Ziel:
- kein unendliches Ressourcenwachstum ohne räumliche/transportliche Grenzen,
- kein unvermeidbarer vollständiger Ressourcenstillstand,
- Gold/Population wachsen nachvollziehbar,
- Save/Continue verändert Balancezustand nicht.

---

# 26. Messgrößen für spätere Tuningläufe

Spielerisch relevante Metriken:
- produzierte Ware je Zeitraum,
- gelieferte Ware je Zeitraum,
- durchschnittlicher lokaler Stock,
- Zeit Ware wartet auf Pickup,
- durchschnittliche Transportdistanz,
- Carrier-Auslastung,
- Anteil Resident-Helper-Transporte,
- Worker-Leerlauf,
- Baustellenwartezeit Material,
- Baustellenwartezeit Builder,
- Bauzeit nach Builder-Ankunft,
- Anzahl aktive/erschöpfte Weltressourcen,
- Tierpopulation je Art,
- Population/Wohnraum,
- Goldzuwachs.

Diese Metriken gehören später in Inspector/Simulationstests und nicht dauerhaft in den Spieler-HUD.

---

# 27. Tuning-Reihenfolge

Balancewerte sollen nicht gleichzeitig wild verändert werden.

Empfohlene Reihenfolge:

1. Startzustand und Softlock-Freiheit,
2. Baukosten + Bauzeiten,
3. Rohstoff-Yields + Produktionszeiten,
4. lokale Stockkapazitäten,
5. Carrierleistung + Bewegung,
6. Workforce-/Spezialistenverteilung,
7. WorkArea-Radien,
8. Ressourcenregeneration,
9. Tierpopulation + Jagdbeute,
10. Goldrate,
11. erst danach optionale Schwierigkeitsvarianten.

Nach jedem Block Regression gegen die übrigen Kernabläufe.

---

# 28. Tuning-Grenzen / Anti-Patterns

Nicht zulässig:
- Balancefehler durch zusätzliche Runtime-Patches kaschieren,
- Carrier künstlich teleportieren, weil Transport zu langsam ist,
- Produktion ins HQ buchen, weil lokale Stocks zu klein sind,
- Builder-Gate umgehen, weil Bau zu lange dauert,
- unendlich Ressourcen nachspawnen, weil Startdichte falsch ist,
- Einwohner als Carrier umtypisieren, weil Workforce knapp ist,
- globale Produktionsmultiplikatoren als Ersatz für Kettenbalancing,
- technische Tickrate erhöhen, um Economy schneller erscheinen zu lassen.

Balanceproblem -> Parameter/Contentursache analysieren -> gezielt einstellen -> Regression.

---

# 29. Parameter-Ownership für spätere Implementierung

Balancewerte sollen langfristig zentral und datengetrieben konfigurierbar sein, aber fachlich beim zuständigen Content-/Domainbereich bleiben.

Beispiele:
- BuildingDefinition: Kosten, Wohnkapazität, Stockkapazität, WorkArea-Baseline,
- ProductionDefinition: Zyklus/Outputregeln,
- WorldResourceDefinition: Yield/Regeneration,
- AnimalDefinition: Population/Regeneration/Beute,
- UnitDefinition: Speed/Capacity/Capability-Baseline,
- EconomyDefinition: Goldrate,
- NewGame/ScenarioDefinition: Startbestand/Startpopulation.

Eine einzige riesige globale `balance.json`, die fachfremde technische Parameter mitmischt, ist nicht zwingend das Ziel.

Konkretes Datenschema bleibt Implementierungsdetail.

---

# 30. S2D-05E-Invarianten

1. S2D-05E friert keine finalen Balancezahlen ein.
2. Bestehende Zahlen sind nur Test-/Baselinewerte.
3. Balance darf keine eingefrorene Fachregel umgehen.
4. Baukosten bestehen im V1 aus Holz/Stein, Mengen bleiben tunable.
5. Bauzeit beginnt erst nach Builder-Ankunft.
6. Produktion bleibt lokaler Output vor Transport.
7. Produktionszeit ist nur ein Teil der realen Outputrate.
8. lokale Stocks sind begrenzt, genaue Kapazität tunable.
9. HQ-Kapazität darf V1 nicht unnötig dominieren.
10. WorkArea-Radien bleiben tunable.
11. Spezialistenbedarf bleibt fachlich fest.
12. Resident Helper bleibt nur einfacher Transportfallback.
13. Bewegung/Carrierleistung werden als zusammenhängendes Logistiksystem getuned.
14. Bäume sind lokal erschöpfbar und regenerierbar.
15. Stein ist stärker endlich und nicht schnell regenerierend.
16. Fisch regeneriert kontrolliert.
17. Tierpopulation regeneriert kontrolliert, nicht sofort.
18. Jagdbeute bleibt tunable je Tierart.
19. Population bleibt aus realen Bewohnern abgeleitet.
20. Gold bleibt nicht-physischer Wirtschaftswert.
21. historische Goldrate ist kein Freeze-Wert.
22. technische Tickrate ist keine Economy-Balance.
23. Autosaveintervall ist keine Economy-Balance.
24. globale Difficulty-Multiplikatoren sind nicht automatisch Zielmodell.
25. Engpässe müssen vielfältig und spielerisch verständlich bleiben.
26. Tuning erfolgt schrittweise mit Regression.
27. Inspector/Simulation darf Metriken messen, Spieler-HUD bleibt verständlich.
28. Balance darf keine neue fachliche Contentfunktion einführen.
29. LATER-Produktionsketten werden nicht über Balanceparameter aktiviert.
30. S2D-05E verändert keinen Gameplay-/Runtime-/UI-Code.

# 31. Abschlussstatus

- Baukostenparameter katalogisiert: **PASS**
- Startwirtschaft katalogisiert: **PASS**
- Bau-/Produktionszeiten katalogisiert: **PASS**
- lokale/HQ-Kapazitäten katalogisiert: **PASS**
- WorkArea-/Workforceparameter katalogisiert: **PASS**
- Transportparameter katalogisiert: **PASS**
- Baum-/Stein-/Fischparameter katalogisiert: **PASS**
- Tierpopulation/Jagdbeute katalogisiert: **PASS**
- Housing/Population katalogisiert: **PASS**
- Gold/Steuern katalogisiert: **PASS**
- technische Werte von Economy-Balance getrennt: **PASS**
- Abhängigkeiten definiert: **PASS**
- Tuning-Testprofile definiert: **PASS**
- Tuning-Reihenfolge definiert: **PASS**
- finale Balancezahlen eingefroren: **0**
- Gameplay-/Runtime-/UI-Codeänderungen: **0**
- offene S2D-05E-Blocker: **0**

**S2D-05E – V1 Balance Parameter Catalog & Tuning Boundaries: COMPLETE / 0 BLOCKER**

Dieses Dokument ist beim S2D-05-Freeze in `docs/S2D-05_CONTENT_CATALOG.md` zu konsolidieren und danach als temporäres Teilblockdokument zu entfernen.
