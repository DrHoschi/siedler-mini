# S2D-05 – CONTENT CATALOG

Status: **V0.1 FROZEN – PASS / 0 BLOCKER**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-05-content-catalog`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02 UNIT & WORKFORCE MODEL V0.1 FROZEN` + `S2D-03 TECHNICAL ARCHITECTURE V0.1 FROZEN` + `S2D-04 UI / MOBILE UX V0.1 FROZEN`  
Freeze-Gate: **S2D-05G – Internal Consistency & Content Freeze Gate – PASS / 0 BLOCKER**

## 1. Zweck

S2D-05 definiert den verbindlichen Content des ersten vollständigen 2D-Wirtschaftskerns. Es trennt vorhandene Repository-Inhalte von tatsächlich freigegebenem V1-Content, beschreibt die sieben Kerngebäude, fünf physischen Waren, Weltressourcen, Tiere, Bewohner/Spezialisten, Gold/Steuern, den New-Game-Workforce-Bootstrap sowie den später zu balancierenden Parameterraum.

S2D-05 friert fachliche Contentregeln ein, aber bewusst **keine finalen Balancezahlen und kein technisches JSON-/Runtime-Schema**.

Zentrale Regel:

> **Vorhanden im Repository ist nicht gleich freigegeben für V1. Eine Contentdefinition beschreibt fachliche Bedeutung, nicht eine zweite Runtime-Wahrheit.**

---

# S2D-05A – Existing Content Inventory & V1 Content Baseline

## 2. Klassifikation

- **KEEP** – gehört direkt zum V1-Kern.
- **ADAPT** – V1-relevant, aber an S2D-02/03/04 bzw. neue Definitionen anzupassen.
- **LATER** – brauchbarer Zukunftscontent, nicht Teil des ersten Wirtschaftskerns.
- **OUT** – keine produktive V1-Wahrheit; historische/Testdateien dürfen bis kontrolliertem Cleanup bestehen bleiben.

## 3. V1-Gebäudekern

| ID | Name | Funktion |
|---|---|---|
| `b.hq` | Rathaus | Start-HQ, Hauptlager, zentrale Anlieferstelle |
| `b.house_small` | Kleines Wohnhaus | Wohnraum, Baseline 2 Bewohner |
| `b.house_middle` | Mittleres Wohnhaus | Wohnraum, Baseline 3 Bewohner |
| `b.lumberjack` | Holzfällerhütte | Holzproduktion |
| `b.quarry` | Steinbruch | Steinproduktion |
| `b.fisher` | Fischerhütte | Fischproduktion |
| `b.hunter` | Jägerhütte | Fleisch- und Fellproduktion aus realen Tieren |

Weitere vorhandene Gebäude-/Assetideen wie Depot, Farm, Windmühle, Bäckerei, Schmied, Wachturm, Militär- und Epoche-2-Inhalte bleiben **LATER**.

## 4. V1-Waren und Wirtschaftswerte

Physische Waren:
- Holz,
- Stein,
- Fisch,
- Fleisch,
- Fell.

Sonderwerte:
- Gold = nicht-physischer Wirtschaftswert,
- Bevölkerung = aus realen Bewohnern abgeleiteter Wert, keine Ware.

## 5. V1-Personenrollen

Fachlich relevant:
- allgemeiner Bewohner,
- Carrier/Träger,
- Builder/Bauarbeiter,
- Holzfäller,
- Steinmetz/Steinbrucharbeiter,
- Fischer,
- Jäger.

Spezialisierung, Capability, Identität und aktuelles Assignment bleiben getrennte Ebenen gemäß S2D-02.

## 6. V1-Weltcontent

Weltressourcen:
- Bäume,
- Steinquellen,
- Fischvorkommen/-ziele.

Tierbasis:
- Reh/Hirsch,
- Wildschwein,
- Hase/Kaninchen,
- Fuchs.

Geeignete vorhandene Sprites, Atlanten, Icons und Goods-Grafiken werden bevorzugt wiederverwendet. Assetnormalisierung erfolgt später kontrolliert, vorzugsweise über die gemeinsame Halle-Demo-Dev-Tool-Umgebung.

**S2D-05A: COMPLETE / 0 BLOCKER**

---

# S2D-05B – Building & Production Content Definitions

## 7. Gemeinsames Building-Definition-Modell

Ein V1-Gebäude muss fachlich mindestens beschreiben können:
- stabile Building-ID,
- Spielername und Funktion,
- Footprint/Placementbezug,
- gültige Zugangs-/Interaktionspunkte,
- Baukostenprofil,
- Bau-/Visualprofil,
- Worker-/Capability-Anforderung, falls relevant,
- WorkArea-Profil, falls relevant,
- Produktionsdefinition, falls relevant,
- lokalen Stock, falls relevant,
- Housing- oder HQ-/Storageprofil, falls relevant,
- player-facing ableitbare Zustände,
- Trennung zwischen festen Regeln und Balanceparametern.

Konkrete JSON-Feldnamen bleiben Implementierungsdetail.

## 8. Baukosten und Construction

V1-Baumaterialarten:
- Holz,
- Stein.

Fisch, Fleisch und Fell sind keine normalen V1-Baumaterialien. Gold wird nicht als allgemeiner zusätzlicher Baupreis eingeführt.

Exakte Mengen je Gebäude bleiben Balance.

Verbindlicher Baufluss:

`Baustelle -> physische Materiallieferung -> Materialien vollständig -> geeigneter Builder zugewiesen -> Builder erreicht realen Baupunkt -> erst dann Baufortschritt -> Fertigstellung`

Keine Bauwirkung allein durch Materialvollständigkeit oder Assignment.

## 9. Construction-/Visualzustände

Fachlich erforderlich:
1. Placement Preview – UI-only, keine Runtime-Baustelle.
2. Construction Site / Material Phase.
3. Ready for Builder.
4. Under Construction – erst nach echter Builder-Ankunft.
5. Completed / Live.
6. Paused – nur für fachlich pausierbare Produktion.
7. Blocked/Waiting – aus echter Runtime-Wahrheit abgeleitet, keine zweite State-Wahrheit.

Vorhandene Baustellen-/Gebäudeassets dürfen wiederverwendet werden; genaue Frames/Schwellen bleiben Visual-/Balanceparameter.

## 10. Gebäudeprofile

### Rathaus/HQ
- Startgebäude, kein normales Produktionsgebäude.
- Hauptlager und zentrale physische Anlieferstelle.
- Nimmt Holz, Stein, Fisch, Fleisch und Fell nach realer Lieferung auf.
- Gold wird dort nicht als physische Ware gelagert.
- Population wird dort nicht gelagert.
- Keine Produktions-WorkArea.
- HQ-Baukosten sind für den normalen New-Game-Start nicht spielentscheidend; späterer HQ-Neubau ist eigener Scope.

### Kleines Wohnhaus
- Kapazität: 2 Bewohner.
- Keine Produktionsinputs/-outputs.
- Kein BuildingStock.
- Keine WorkArea.
- Goldbeitrag entsteht über reale Bewohner, nicht als Goldware.

### Mittleres Wohnhaus
- Kapazität: 3 Bewohner.
- Sonst dieselbe fachliche Housingrolle wie kleines Wohnhaus.

### Holzfällerhütte
- Weltinput: realer Baum.
- Output: Holz.
- Benötigt Holzfäller-Capability.
- WorkArea Pflicht.
- Output zunächst lokaler BuildingStock.
- Pause stoppt neue Produktion; vorhandenes Holz bleibt transportierbar.

### Steinbruch
- Weltinput: reale Steinquelle.
- Output: Stein.
- Benötigt Stonecutter-/Quarry-Capability.
- WorkArea Pflicht.
- Lokaler Steinbestand vor Transport.

### Fischerhütte
- Weltinput: reales Fischziel/-vorkommen im gültigen Wasserbereich.
- Output: Fisch.
- Benötigt Fisher-Capability.
- WorkArea Pflicht.
- Lokaler Fischbestand vor Transport.

### Jägerhütte
- Weltinput: reales gültiges Tier.
- Outputs: Fleisch und Fell als getrennte Waren.
- Benötigt Hunter-Capability.
- WorkArea Pflicht.
- Keine abstrakte unsichtbare Tierressource.

## 11. Gemeinsame Produktionsregel

Für Holzfäller, Steinbruch, Fischer und Jäger gilt:

`reales Ziel -> geeigneter Spezialist -> reale Anreise/Interaktion -> erfolgreicher Arbeitsabschluss -> lokaler Output -> realer Carriertransport -> HQ`

Verbindlich:
- Assignment allein erzeugt keinen Output.
- Produktion schreibt nie direkt ins HQ.
- Lokaler Outputstock ist begrenzbar.
- Sichtbare Warenstapel stellen echten Stock dar und erzeugen keine zweite Menge.
- Fehlender Worker, fehlendes Weltziel oder voller Outputstock sind normale verständliche Wirtschaftsengpässe.
- Keine mehrstufige Produktions-Wareninputkette im ersten Kern.

**S2D-05B: COMPLETE / 0 BLOCKER**

---

# S2D-05C – Goods, World Resources & Animal Content Definitions

## 12. Warenmodell

Für jede physische Ware gilt:

> **Eine reale Warenmenge besitzt genau einen autoritativen wirtschaftlichen Ort.**

Mögliche Zustände/Orte umfassen insbesondere:
- lokal im BuildingStock,
- am gleichen Ort reserviert,
- physisch von einer Unit getragen,
- im HQ verfügbar,
- bei Holz/Stein physisch an Baustelle geliefert,
- verbraucht/verbaut.

Reservation ist keine zusätzliche Warenmenge.

## 13. Waren

### Holz
- physische Ware,
- Baumaterial,
- entsteht aus realen Bäumen durch Holzfällerarbeit.

### Stein
- physische Ware,
- Baumaterial,
- entsteht aus realen Steinquellen.

### Fisch
- physische Nahrungsware,
- entsteht aus realen Fischvorkommen/-zielen.

### Fleisch
- physische Nahrungsware,
- entsteht aus erfolgreicher Jagd.

### Fell
- physische Ware,
- getrennt von Fleisch zu zählen,
- konkrete spätere Nutzung außerhalb des Kerntransports nicht vorgezogen.

## 14. Gemeinsames Weltressourcenmodell

Bäume, Steinquellen und Fischvorkommen sind reale autoritative Weltobjekte/-Nodes und keine versteckten Warenlager.

Sie benötigen fachlich:
- Identität im Weltzustand,
- Typ,
- Position,
- verfügbar/erschöpft bzw. Lebens-/Wachstumszustand,
- gültige Interaktion,
- Save/Continue-fähigen Zustand.

Output darf nur entstehen, wenn die zugehörige Quelle erfolgreich beansprucht wurde. Doppelverwertung desselben verbrauchten Ziels ist unzulässig.

## 15. Bäume

- reale endliche Holzquellen,
- gefällter Baum darf nicht erneut als voll gültiges Ziel dienen,
- sichtbare Welt reagiert auf Fällung,
- langsame natürliche Regeneration ist V1-Zielregel,
- Regeneration gehört dem Weltressourcen-System, nicht dem Holzfäller,
- kein sofortiger Ersatz nach Fällung.

Regenerationszeit, Dichte, Wachstumsstufen und Yield bleiben Balance.

## 16. Steinquellen

- reale begrenzte Ressourcen,
- erfolgreicher Abbau reduziert Vorrat bzw. verbraucht Quelle,
- erschöpfte Quelle ist kein gültiges Ziel,
- keine schnelle natürliche Steinregeneration als V1-Pflicht.

Langfristige Lösungen wie sehr langsame Neubildung, größere Vorkommen oder spätere Minen bleiben späterem Scope vorbehalten.

## 17. Fischvorkommen

- reale Wasser-Arbeitsziele,
- erfolgreicher Fang reduziert Verfügbarkeit/Vorrat oder setzt Ziel temporär in Ruhephase,
- zeitliche Regeneration ist V1-Zielregel,
- Fischer erzeugt keine Fischspots selbst.

## 18. Tiere

Tiere sind reale bewegliche World-Units, keine Workforce und keine fertigen Fleisch-/Fellbestände.

Tierarten:
- Reh/Hirsch,
- Wildschwein,
- Hase/Kaninchen,
- Fuchs.

V1-Ziel:
- sichtbare eigenständige Bewegung,
- gültige Terrainregeln,
- kontrollierte Population/Regeneration,
- Jagd nur auf real existierende gültige Ziele.

Jagdbar im V1 grundsätzlich:
- Reh/Hirsch,
- Wildschwein,
- Hase/Kaninchen.

Fuchs bleibt sicher sichtbare Tierwelt; seine produktive Beuterolle ist nicht verpflichtend eingefroren.

Jagdablauf:

`reales Tier -> gültige Jagdzuweisung -> Jäger erreicht/arbeitet -> Tier wird fachlich entfernt -> Beute entsteht lokal an Jägerhütte`

Beutemengen und genaue Tierpopulationen bleiben Balance.

**S2D-05C: COMPLETE / 0 BLOCKER**

---

# S2D-05D – Population, Housing, Specialist & Economy Content Definitions

## 19. Bevölkerung

> **Bevölkerung ist die Anzahl real existierender Bewohner-Personen der Siedlung und niemals ein unabhängiger Resource-Zähler.**

Grundzusammenhang:

`Wohnraum/Startunterkunft -> reale Personen -> Spezialisierungen/Capabilities -> verfügbare Workforce`

Jede Person besitzt stabile Identität, Home-Bindung, reale Position bzw. Home-State, Spezialisierung, Capabilities, Availability/Activity und höchstens ein normales aktuelles Assignment.

## 20. Housing

- kleines Wohnhaus = Kapazität 2,
- mittleres Wohnhaus = Kapazität 3.

Kapazität, tatsächliche Belegung und Gesamtpopulation sind getrennte Größen. Tatsächliche Belegung wird aus realen Home-Bindungen bestimmt.

Hausabriss löscht keine Person. Identität, Spezialisierung und Capabilities bleiben erhalten; Home-Bindung geht kontrolliert in Relocation/Homeless-Übergang, bis gültiger Wohnraum gefunden wird.

## 21. Spezialisten

Jeder Spezialist ist dieselbe reale Person, die zugleich Bewohner der Siedlung ist.

V1-Spezialisierungen:
- Carrier,
- Builder,
- Lumberjack,
- Stonecutter,
- Fisher,
- Hunter.

Arbeitsstätte besitzt die Person nicht. Pause/Abriss eines Arbeitsplatzes löscht weder Person noch Spezialisierung.

## 22. Allgemeine Bewohner und Transporthilfe

Allgemeine Bewohner besitzen mindestens:
- Bewegungsfähigkeit,
- Home-Bindung,
- einfache Transportfähigkeit.

Sie dürfen bei Bedarf einfache Warenbewegungen unterstützen:

`freier Bewohner -> Transport-Assignment -> Pickup -> realer Transport -> Delivery -> wieder frei`

Dabei bleibt die Person Bewohner. `resident -> type=carrier -> resident` ist OUT.

Echte Carrier haben bei einfachen Transporten grundsätzlich Vorrang.

Kein automatischer allgemeiner Bewohner-Fallback für:
- Bauen,
- Holzfällen,
- Steinabbau,
- Fischen,
- Jagen.

## 23. Gold/Steuern

Gold ist nicht physisch transportierbar. Es gehört dem Economy-/Gold-Owner.

V1-Grundquelle:

`reale gültige Bewohner -> Steuer-/Economy-Regel -> Goldzuwachs`

Kein Goldwarenstapel, kein Carriertransport, keine normale Goods-Reservation.

Historischer Testwert `1 Gold/Bewohner/10 Sekunden` bleibt reine Test-/Balancebaseline.

Goldfortschritt nutzt autoritative Simulationszeit. Pause stoppt wirtschaftlichen Zeitfortschritt.

Continue stellt Gold aus Economy-State wieder her und darf keine zusätzliche Steuerzahlung nur durch Restore-Events auslösen.

**S2D-05D: COMPLETE / 0 BLOCKER**

---

# S2D-05E – V1 Balance Parameter Catalog & Tuning Boundaries

## 24. Balanceklassen

### CONTENT FIXED
Nicht wegzubalancieren:
- sieben V1-Gebäude,
- fünf physische V1-Waren,
- Gold nicht physisch,
- Population aus realen Personen,
- Housing-Kapazitäten 2/3,
- Outputarten der vier Produktionen,
- Spezialisten-/Capability-Anforderungen,
- reale WorkArea-/Weltzielbindung,
- realer Transport,
- Builder-Ankunft vor Baufortschritt.

### TUNABLE BALANCE
Zu kalibrieren:
- Baukosten,
- Startbestände,
- Bauzeiten,
- Produktionszeiten,
- lokale Stockkapazitäten,
- HQ-Kapazität,
- WorkArea-Radien,
- Workforce-Verteilung,
- Unitgeschwindigkeiten/Tragkapazitäten,
- Weltressourcenerträge und Regeneration,
- Tierpopulationen/Respawn,
- Jagdbeute,
- Goldrate,
- Gründer-/Startrostergrößen,
- player-facing Prioritätsgewichte, sofern sie keine Architekturregel umgehen.

### TECHNICAL / NOT BALANCE
Keine Economy-Balanceparameter:
- Scheduler-Tickrate,
- Render-FPS,
- Autosaveintervall,
- Navigation-/A*-Cachegrößen,
- technische Backoff-Implementierung,
- Debugintervalle,
- UI-Pixelmaße,
- rein visuelle Atlas-FPS.

Historische `data/balance.json` ist daher keine automatische Zielstruktur.

## 25. Wichtige Parameterabhängigkeiten

Balance wird nicht isoliert pro Zahl betrachtet.

Beispiele:

Transportleistung hängt ab von:
`Transportkräfte × Tragkapazität × Bewegungsgeschwindigkeit × Weglänge × Job-/Warteanteil`

Reale Produktionsleistung hängt ab von:
`Spezialist + Weg zum Weltziel + Ressourcenverfügbarkeit + Arbeitszeit + lokaler Stock + Abtransport`

Bauzeit hängt ab von:
`Materialkosten + Lieferzeit + Builder-Verfügbarkeit + Builderweg + eigentliche Baufortschrittsdauer`

Holzwirtschaft hängt ab von:
`Startdichte + Yield + Produktionsbedarf + Baukosten + Regeneration + Transport`

Jagd hängt ab von:
`Tierbestand + Bewegung/Erreichbarkeit + Respawn/Reproduktion + Suchaufwand + Beute + Transport`

## 26. Tuning-Testprofile

Später verbindlich als Balanceprüfungen zu verwenden:
- **Early Settlement** – Start bis erste funktionierende Grundproduktion/Wohnraumerweiterung.
- **Stable Small Settlement** – mehrere Kernproduktionen laufen dauerhaft.
- **Logistics Stress** – lokale Stocks und mehrere Transporte erzeugen Engpässe ohne Systemkollaps.
- **Workforce Stress** – mehrere Gebäude konkurrieren nachvollziehbar um Fachkräfte.
- **Resource Pressure** – lokale Weltressourcen werden knapp/erschöpfen temporär.
- **Hunting Sustainability** – Tierwelt bleibt langfristig jagdbar, ohne Sofortrespawn.
- **Long Sandbox** – längerer Betrieb ohne unvermeidbaren frühen Ressourcen-/Workforce-Softlock.

Finale Zahlen werden erst durch Messung und Regression freigegeben.

**S2D-05E: COMPLETE / 0 BLOCKER**

---

# S2D-05F – V1 Specialist Availability & Start Roster

## 27. Bootstrap-Problem und Lösung

Ohne Startworker entstünde ein Zirkelschluss:

`kein Wohnhaus -> keine Bewohner -> kein Builder -> kein Wohnhaus`

Zusätzlich wären Produktionsgebäude ohne Ausbildungssystem möglicherweise unbetreibbar.

Verbindliche V1-Lösung:

> **New Game startet mit einer kleinen realen Gründergruppe am HQ, die alle zwingend benötigten Fach-Capabilities des ersten Wirtschaftskerns abdeckt.**

## 28. Gründergruppe

Gründer sind reale Personen:
- stabile Unit-ID,
- reale Weltposition,
- Spezialisierung/Capabilities,
- normale Availability/Activity,
- Teil der echten Bevölkerung.

HQ dient im Startzustand als **temporäre Gründerunterkunft**, nicht als normales unbegrenztes Wohnhaus.

Gründer benötigen gültige Home-Bindungen und können später kontrolliert in reguläre Wohnhäuser umziehen, ohne Identitätswechsel oder Doppelspawn.

## 29. Mindest-Capability-Abdeckung

New Game muss mindestens prinzipiell verfügbar machen:
- Transport,
- Bauen,
- Holzfällen,
- Steinabbau,
- Fischen,
- Jagen.

Mindestens benötigt die Gründergruppe Capability-Abdeckung für:
- echten Carrier,
- Builder,
- Lumberjack,
- Stonecutter/Quarry,
- Fisher,
- Hunter.

Exakte Personenzahlen bleiben Balance. Mehrfachfähigkeiten sind grundsätzlich möglich, die bevorzugte Baseline sind aber verständlich sichtbare unterschiedliche Spezialisten statt „eine Person kann alles“.

## 30. Neue Wohnhausbewohner

Neue Bewohner aus Wohnhäusern sind im V1 standardmäßig **allgemeine Bewohner** mit:
- Home-Bindung,
- Bewegungsfähigkeit,
- einfacher Transportfähigkeit.

Wohnhäuser erzeugen nicht zufällig professionelle Spezialisten.

Ausbildung/Umschulung, Rekrutierung, Werkzeugbedarf, Skills oder Berufsentwicklung bleiben **LATER**.

## 31. Housing mit Gründern

Bei Fertigstellung regulären Wohnraums gilt fachlich:
1. neue Wohnkapazität entsteht,
2. noch am HQ wohnende Gründer dürfen regulär umziehen,
3. verbleibende freie Plätze dürfen mit neuen allgemeinen Bewohnern besetzt werden,
4. Gesamtpopulation ergibt sich aus realen Personen und Home-Bindungen.

Hauskapazität 2/3 darf nicht blind zusätzlich zur Gründerbevölkerung gezählt werden.

## 32. Mehr Arbeitsstätten als Spezialisten

Besitzt der Spieler mehr Arbeitsstätten eines Typs als passende Fachkräfte, entstehen keine unsichtbaren Worker. Nicht bediente Gebäude warten verständlich auf Fachkraft.

Spezialistenknappheit ist damit ein echter V1-Engpass.

## 33. New Game vs. Continue

New Game initialisiert Gründergruppe und Startressourcen gemäß späterer Balance.

Continue:
- erzeugt **keine** neue Gründergruppe,
- restauriert Personen, Capabilities und Home-Bindungen aus Save-State,
- leitet Population daraus ab,
- legt niemals den New-Game-Starterzustand über den Restore.

**S2D-05F: COMPLETE / 0 BLOCKER**

---

# S2D-05G – Internal Consistency & Content Freeze Gate

## 34. Prüfumfang

Geprüft wurden S2D-05A bis F gegen:
- S2D-00 PROJECT MASTER,
- S2D-01 GAME DESIGN,
- S2D-02 UNIT & WORKFORCE MODEL,
- S2D-03 TECHNICAL ARCHITECTURE,
- S2D-04 UI / MOBILE UX.

Außerdem geprüft:
- doppelte Content-Wahrheiten,
- widersprüchliche Warenorte,
- Population vs. Resource-Modell,
- Housing vs. Gründer-Bootstrap,
- Specialist/Capability/Assignment-Trennung,
- Construction-Gate,
- Production/BuildingStock/Transportfluss,
- Weltressourcen/Tierverbrauch,
- Regeneration,
- Save/Continue,
- UI-/Inspector-Grenzen,
- Balance vs. technische Parameter,
- LATER/OUT-Abgrenzung,
- ungewollte neue Features.

## 35. Freeze-Ergebnis

- Widersprüche zu S2D-00: **0**
- Widersprüche zu S2D-01: **0**
- Widersprüche zu S2D-02: **0**
- Widersprüche zu S2D-03: **0**
- Widersprüche zu S2D-04: **0**
- doppelte autoritative Waren-/Populationwahrheiten: **0**
- offene V1-Gebäudedefinitionen: **0**
- offene V1-Warenarten: **0**
- offene V1-Weltressourcenklassen: **0**
- offene zwingende Workforce-Bootstrapfrage: **0**
- offene Construction-/Production-Contentkonflikte: **0**
- offene Save/Continue-Contentkonflikte: **0**
- unkontrolliert vorgezogene LATER-Inhalte: **0**
- final eingefrorene Balancezahlen: **0**
- Gameplay-/Runtime-/UI-Codeänderungen durch S2D-05: **0**
- offene S2D-05-Blocker: **0**

## 36. Verbindliche S2D-05-Invarianten

1. V1 besitzt genau sieben Kerngebäudetypen.
2. HQ ist Startgebäude/Hauptlager, kein normales Produktionsgebäude.
3. Kleine/mittlere Häuser besitzen Kapazität 2/3.
4. Bevölkerung wird ausschließlich aus realen Personen abgeleitet.
5. Spezialisten sind reale Bewohner/Personen, keine zusätzliche Workforce-Wahrheit.
6. Temporäre Arbeit ändert niemals Personenidentität.
7. Allgemeine Bewohner dürfen einfache Transporte unterstützen.
8. Echte Carrier haben bei Transport grundsätzlich Vorrang.
9. Facharbeit benötigt passende Capability.
10. Holz, Stein, Fisch, Fleisch und Fell sind physische Waren.
11. Gold ist nicht physisch transportierbar.
12. Bäume, Steinquellen, Fischvorkommen und Tiere sind reale Weltquellen/-ziele.
13. Weltquelle und erzeugte Ware sind unterschiedliche fachliche Dinge.
14. Ein verbrauchtes Weltziel darf keinen Doppeloutput erzeugen.
15. Holz regeneriert langsam natürlich; konkrete Rate bleibt Balance.
16. Fisch regeneriert zeitlich; konkrete Rate bleibt Balance.
17. Stein ist im V1 deutlich endlicher und benötigt keine schnelle Regeneration.
18. Tiere regenerieren/populieren kontrolliert; kein sichtbarer Sofortersatz nach Jagd.
19. Reh/Hirsch, Wildschwein und Hase/Kaninchen sind grundsätzlich jagdbar.
20. Fuchs bleibt Tierwelt; produktive Beuterolle nicht zwingend.
21. Produktion erzeugt Output zuerst im lokalen BuildingStock.
22. HQ-Gutschrift erfolgt erst nach realem Transport und Delivery.
23. Pause stoppt neue Produktion, nicht Abtransport fertiger Ware.
24. Baufortschritt startet erst nach Materialvollständigkeit und realer Builder-Ankunft.
25. Sichtbare Goods-Stapel sind Darstellung echten Stocks, keine zweite Menge.
26. New Game besitzt reale Gründer mit Mindest-Capability-Abdeckung.
27. HQ ist nur temporäre Gründerunterkunft, kein beliebiges Housing.
28. Wohnhäuser erzeugen standardmäßig allgemeine Bewohner, keine zufälligen Spezialisten.
29. Gründerumzug verändert keine Identität und erzeugt keine Doppelpopulation.
30. Continue erzeugt keine New-Game-Gründer oder Standardzustände über Save-State.
31. Ausbildung/Umschulung bleibt LATER.
32. Mehrstufige Produktionsketten bleiben LATER.
33. Depot/Lagerhaus, Straßenbau, Militär, Kampagne und komplexe Epoch-Progression bleiben LATER.
34. Balanceparameter dürfen fachliche Regeln nicht umgehen.
35. Technische Scheduler-/Render-/Autosave-/A*-Parameter sind keine Economy-Balancewerte.
36. Geeignete vorhandene Assets werden bevorzugt wiederverwendet.
37. Asset-/JSON-Entwicklung gehört primär in die gemeinsame Dev-Tool-Umgebung, nicht in den Runtime-Inspector.
38. Änderungen am eingefrorenen S2D-05 erfolgen nur über S2D-07 bzw. eine explizite spätere Revision.

## 37. Bewusst offene Punkte nach Freeze

Diese Punkte blockieren den Content-Freeze nicht:
- exakte Baukosten,
- Startbestände,
- exakte Gründer-/Carrier-/Builderzahlen,
- exakte Produktions- und Bauzeiten,
- WorkArea-Radien,
- lokale/HQ-Kapazitäten,
- Resource-Yields und Regenerationsraten,
- Tierpopulationen und Jagdbeute,
- Goldrate,
- Bewegungs-/Tragegeschwindigkeiten,
- spätere Ausbildung/Umschulung,
- spätere Gold-Ausgabenseite,
- spätere mehrstufige Produktionsketten,
- genaue JSON-Feldnamen,
- genaue Sprite-/Atlasnormalisierung.

Diese Punkte sind entweder ausdrücklich Balance, Implementierungsdetail oder LATER-Scope.

# 38. Freeze-Status

- S2D-05A: **COMPLETE**
- S2D-05B: **COMPLETE**
- S2D-05C: **COMPLETE**
- S2D-05D: **COMPLETE**
- S2D-05E: **COMPLETE**
- S2D-05F: **COMPLETE**
- S2D-05G: **PASS / 0 BLOCKER**

# S2D-05 – CONTENT CATALOG V0.1 FROZEN – PASS / 0 BLOCKER

Änderungen an dieser eingefrorenen Contentbasis erfolgen nur über `S2D-07 – DECISION & CHANGE LOG` oder eine ausdrücklich freigegebene spätere Revision.
