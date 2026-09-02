# S2D-05 – CONTENT CATALOG

Status: **V0.1 DRAFT – S2D-05A/B COMPLETE**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-05-content-catalog`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02 UNIT & WORKFORCE MODEL V0.1 FROZEN` + `S2D-03 TECHNICAL ARCHITECTURE V0.1 FROZEN` + `S2D-04 UI / MOBILE UX V0.1 FROZEN`

# S2D-05A – Existing Content Inventory & V1 Content Baseline

## 1. Zweck und Ergebnis

S2D-05A erfasst den vorhandenen Content und trennt ihn vom V1-Kern. Vorhanden im Repository ist nicht automatisch für V1 freigegeben.

Klassifikation:
- **KEEP** – gehört direkt zum V1-Kern.
- **ADAPT** – V1-relevant, aber an Zielmodell/Definitionen anzupassen.
- **LATER** – sinnvoller Zukunftscontent, nicht für den ersten Wirtschaftskern.
- **OUT** – keine produktive V1-Wahrheit; historische/Test-Inhalte dürfen bis Cleanup bestehen bleiben.

## 2. V1-Baseline aus S2D-05A

### 2.1 Gebäude

| ID | Name | V1 | Kernfunktion |
|---|---|---|---|
| `b.hq` | Rathaus | KEEP | Start-HQ, Hauptlager, zentrale Anlieferstelle |
| `b.lumberjack` | Holzfällerhütte | KEEP | Holzproduktion |
| `b.quarry` | Steinbruch | KEEP | Steinproduktion |
| `b.fisher` | Fischerhütte | KEEP | Fischproduktion |
| `b.hunter` | Jägerhütte | KEEP | Fleisch + Fell aus realen Tieren |
| `b.house_small` | Kleines Wohnhaus | KEEP | Wohnraum für bestätigte Baseline 2 Bewohner |
| `b.house_middle` | Mittleres Wohnhaus | KEEP | Wohnraum für bestätigte Baseline 3 Bewohner |

### 2.2 Waren und Wirtschaftswerte

Physische V1-Waren:
- Holz,
- Stein,
- Fisch,
- Fleisch,
- Fell.

Sonderwerte:
- Gold = Wirtschaftswert, keine normale Transportware.
- Bevölkerung = aus realen Bewohnern abgeleiteter Wert, keine Ware.

### 2.3 Personenrollen

V1-relevant:
- Bewohner,
- Träger,
- Bauarbeiter,
- Holzfäller,
- Steinmetz,
- Fischer,
- Jäger.

Die vorhandenen Unit-Definitionen werden bei Bedarf an das S2D-02-Modell `Identität + Capabilities + aktuelles Assignment` angepasst. Temporäre Hilfsarbeit ändert niemals die Personenidentität.

### 2.4 Weltressourcen und Tiere

V1-Weltressourcen:
- Bäume,
- Steinquellen,
- Fischziele.

Vorhandene Tierbasis:
- Reh/Hirsch,
- Wildschwein,
- Hase/Kaninchen,
- Fuchs.

Welche Tierarten im V1 konkret jagd-/beuterelevant sind, wird erst in einem passenden Content-Unterblock verbindlich festgelegt.

### 2.5 Assets

Für alle sieben V1-Gebäude, Baustellen, Kerncharaktere, Goods/Items, Resource-Icons und Tiere existiert bereits verwertbarer Asset-Unterbau. Geeignete vorhandene Sprites/Atlanten/Icons werden bevorzugt wiederverwendet; Normalisierung erfolgt später kontrolliert, möglichst über die gemeinsame Halle-Demo-Dev-Tool-Umgebung.

Vorhandene spätere Inhalte wie Depot, Farm, Windmühle, Bäckerei, Schmied, Wachturm, Epoche-2-Berufe und weitere Produktionsketten bleiben **LATER**.

### 2.6 S2D-05A Balance-Regel

Vorhandene Werte wie Baukosten, Produktionszyklen, Geschwindigkeiten, WorkArea-Radien, Tierlimits, Lagerkapazitäten und Steuer-Testraten sind nur Baseline/Testwerte und wurden in S2D-05A nicht als finale Balance eingefroren.

**S2D-05A – Existing Content Inventory & V1 Content Baseline: COMPLETE / 0 BLOCKER**

---

# S2D-05B – Building & Production Content Definitions

## 3. Zweck

S2D-05B legt für die sieben V1-Gebäude die fachlich verbindliche Contentbedeutung fest, ohne die technische Implementierung oder unnötig frühe Balancezahlen einzufrieren.

Der Block beantwortet für jedes Gebäude:
- Welche Funktion erfüllt es im Wirtschaftskern?
- Welche Inputs und Outputs besitzt es fachlich?
- Welche Baukostenarten sind zulässig?
- Welcher Worker-/Bewohnerbezug besteht?
- Wird ein WorkArea benötigt?
- Welche Art lokalen Bestands besitzt das Gebäude?
- Welche Bau-/Betriebs-/Visualzustände muss der Content unterstützen?
- Welche Werte sind feste Produktregeln und welche bleiben Balanceparameter?

## 4. Zentrale Contentregel

> **Eine Contentdefinition beschreibt fachliche Bedeutung und zulässige Beziehungen; sie darf keine zweite Runtime-Wahrheit erzeugen.**

Beispiele:
- `produces wood` beschreibt, was ein Holzfäller erzeugen darf; die reale Menge gehört zur Laufzeit dem BuildingStock/Transport/HQ entsprechend S2D-03.
- `residentCapacity = 2` beschreibt die V1-Wohnkapazität des kleinen Hauses; die reale Bevölkerung wird aus realen Personen abgeleitet.
- `requires builder` beschreibt die Bauvoraussetzung; der Content darf keinen Baufortschritt vor echter Builder-Ankunft erzeugen.

## 5. Gemeinsames Building-Definition-Modell

Jedes V1-Gebäude soll fachlich mindestens folgende Definitionsbereiche besitzen bzw. aus stabilen Definitionen ableiten können:

1. stabile Building-ID,
2. Spielername,
3. Content-Gruppe/Funktion,
4. Platzierungs-/Footprintinformation,
5. gültige Zugangs-/Interaktionspunkte,
6. Baukosten als Warenanforderungen,
7. Bau-/Visualprofil,
8. Worker-/Capability-Anforderung, falls relevant,
9. WorkArea-Profil, falls relevant,
10. Produktionsdefinition, falls relevant,
11. lokales Stockprofil, falls relevant,
12. Wohnprofil, falls relevant,
13. HQ-/Storageprofil, falls relevant,
14. UI-relevante fachliche Zustände,
15. Balanceparameter getrennt von festen Regeln.

Technische Feldnamen bleiben der Implementierung vorbehalten. S2D-05B friert die Semantik ein, nicht ein bestimmtes JSON-Schema.

## 6. Gemeinsame Baukostenregel

Für den V1-Gebäudekern werden Baukosten ausschließlich aus den bereits vorhandenen physischen Baumaterialien gebildet:

- Holz,
- Stein.

Fisch, Fleisch und Fell sind im V1 keine normalen Baumaterialien. Gold wird in S2D-05B nicht als zusätzlicher Standard-Baupreis eingeführt.

Die exakten Mengen je Gebäude bleiben zunächst Balanceparameter. Die heutigen Werte in `data/buildings.json` sind Test-/Baselinewerte und dürfen später bewusst übernommen oder verändert werden.

Verbindlich bleibt dagegen:

`Baustelle -> benötigte Waren -> physische Lieferung -> Material vollständig -> Builder physisch angekommen -> Baufortschritt`

## 7. Gemeinsames Construction-/Visual-Profil

Alle regulär errichtbaren V1-Gebäude benötigen fachlich folgende Zustandsdarstellung:

1. **Placement Preview** – rein visuelle UI-Vorschau, noch kein Gebäudezustand.
2. **Construction Site / Material Phase** – Baustelle existiert, Waren fehlen oder sind unterwegs.
3. **Ready for Builder** – Materialien physisch vollständig, Bauarbeiter fehlt/ist unterwegs.
4. **Under Construction** – Bauarbeiter ist tatsächlich angekommen; Fortschritt läuft.
5. **Completed / Live** – fertiges Gebäude.
6. **Paused** – nur dort, wo die fachliche Funktion pausierbar ist; kein universeller Gebäudezustand für Wohnhäuser/HQ.
7. **Blocked/Waiting Feedback** – UI-/Renderableitung aus realem Owner-Zustand, keine eigene Contentwahrheit.

Die vorhandenen Baustellenbilder können wiederverwendet werden. Die Anzahl sichtbarer Bauphasen/Frames und deren Fortschrittsschwellen bleiben Visual-/Balanceparameter.

Das historische `reserve`-Frame darf nicht automatisch als fachlich eigenständiger Waren-/Reservierungszustand interpretiert werden.

## 8. Zugangs- und Interaktionspunkte

Alle Gebäude benötigen mindestens einen fachlich gültigen Unit-Zugang. Je nach Funktion können zusätzlich getrennte Punkte sinnvoll sein:
- Unit Entrance,
- Pickup,
- Delivery,
- Build Access,
- Work Departure/Return.

Vorhandene Entrance-/Markerdaten werden bevorzugt übernommen, aber in der technischen Migration auf das S2D-03E-NavigationService-Modell normalisiert.

Verbindlich:
- Worker, Builder und Carrier arbeiten nicht aus beliebiger Gebäudezentrum-Koordinate.
- Ein Gebäude muss für die benötigte Interaktion einen gültigen erreichbaren Zugang anbieten.

---

# 9. Rathaus / HQ (`b.hq`)

## 9.1 Fachliche Funktion

Das Rathaus ist im ersten Wirtschaftskern:
- Startgebäude,
- Hauptlager,
- zentrale physische Anlieferstelle,
- wirtschaftlicher Bezugspunkt der Siedlung.

Es ist kein normales Produktionsgebäude und im V1 kein regulär mehrfach baubares Kataloggebäude.

## 9.2 Inputs/Outputs

Produktionsinput: **keiner**.  
Produktionsoutput: **keiner**.

Das HQ empfängt physische Waren durch reale Transporte. Eine Ware zählt erst nach tatsächlicher Lieferung als im HQ verfügbar.

Gold wird nicht als physische Lieferware des HQ definiert. Bevölkerung wird dort nicht gelagert.

## 9.3 Baukosten

Für den normalen New-Game-Pfad wird das HQ als Startgebäude vorausgesetzt. Seine vorhandene Holz-/Stein-Kostendefinition bleibt als historische/optionale Contentbasis erhalten, ist aber für den ersten Startablauf kein zwingender Spieler-Baupreis.

Falls spätere Modi einen HQ-Neubau erlauben, wird dessen Kostenmodell separat freigegeben.

## 9.4 Worker/WorkArea

- kein Produktionsworker,
- keine Produktions-WorkArea,
- Carrier nutzen definierte Delivery-/Pickup-/Access-Punkte.

## 9.5 Stock

HQ besitzt zentralen physischen Storage für:
- Holz,
- Stein,
- Fisch,
- Fleisch,
- Fell.

Kapazitätsgrenzen sind **BALANCE/DEFERRED**. S2D-05B führt keine neue harte HQ-Kapazität ein.

## 9.6 Visualzustände

NOW erforderlich:
- Start/Completed-Live,
- sichtbare Waren-/Lagerdarstellung soweit sinnvoll,
- Delivery-/Pickup-Aktivität über reale Units/Goods.

Baustellenzustände des HQ sind nur erforderlich, wenn ein Spielmodus HQ-Bau tatsächlich nutzt; nicht Teil des normalen V1-New-Game-Flows.

---

# 10. Kleines Wohnhaus (`b.house_small`)

## 10.1 Fachliche Funktion

- Wohnort realer Bewohner,
- stabile Home-Bindung,
- Baseline-Wohnkapazität: **2 Bewohner**,
- Beitrag zur Gold-/Steuerwirtschaft über Bewohner.

## 10.2 Inputs/Outputs

Keine Produktionsinputs und keine physischen Produktionsoutputs.

Gold entsteht nicht als lokaler Warenstapel. Die genaue Steuer-/Goldrate bleibt Balanceparameter.

## 10.3 Baukosten

Kostenarten: Holz + Stein.  
Exakte Mengen: **BALANCE**.

## 10.4 Worker/WorkArea

- kein Arbeitsplatz,
- kein Produktionsworker,
- keine WorkArea.

Bewohner können gemäß S2D-02 von ihrem Zuhause aus für geeignete Aufgaben verfügbar werden. Das Wohnhaus weist ihnen aber keine einzelnen Jobs zu.

## 10.5 Stock

Kein BuildingStock für Produktionswaren.

## 10.6 Visualzustände

- Construction Site,
- Ready for Builder,
- Under Construction,
- Completed/Occupied.

Optional sichtbares Bewohnerleben/Ein-/Ausgehen ist Unit-/Lifestyle-Darstellung, kein eigener Hausbestand.

---

# 11. Mittleres Wohnhaus (`b.house_middle`)

Entspricht fachlich dem kleinen Wohnhaus mit folgenden Unterschieden:
- Baseline-Wohnkapazität: **3 Bewohner**,
- eigene Gebäudedefinition/eigenes Asset,
- eigene Baukosten-Balance möglich.

Kostenarten: Holz + Stein.  
Exakte Mengen: **BALANCE**.

Keine Produktion, kein BuildingStock, keine WorkArea, kein Arbeitsplatz.

Die Existenz zweier Wohnhaustypen darf später unterschiedliche Baukosten/Flächen-/Wohnraum-Effizienz ermöglichen, ohne für S2D-05B bereits eine optimale Balance festzulegen.

---

# 12. Holzfällerhütte (`b.lumberjack`)

## 12.1 Fachliche Funktion

Erzeugt Holz aus realen Baumressourcen im zugewiesenen Arbeitsbereich.

## 12.2 Produktionsvertrag

Input: **reale Baumressource als Weltziel**, keine physische Inputware aus dem HQ.  
Output: **Holz** als physische Ware.

Produktionsfluss:

`geeigneter Baum -> Holzfäller erreicht/arbeitet -> Produktion abgeschlossen -> Holz in lokalem BuildingStock -> Transportbedarf -> Carrier nimmt auf -> HQ-Lieferung`

Kein direkter ResourceStore/HQ-Credit bei Produktionsabschluss.

## 12.3 Worker

Benötigt einen geeigneten Holzfäller-Spezialisten bzw. eine Person mit entsprechender Capability. Freie Bewohner dürfen im V1 nicht automatisch professionelle Holzfällerarbeit übernehmen, sofern sie diese Capability nicht besitzen.

Anzahl gleichzeitig benötigter/zulässiger Produktionsworker: **BALANCE**, V1-Baseline zunächst ein aktiver Spezialist pro Hütte.

## 12.4 WorkArea

**Pflicht.**

Die WorkArea begrenzt die zulässigen Baumziele. Der aktuelle Radius von 4 Tiles bleibt Baseline, nicht Freeze-Wert.

Kein geeignetes Baumziel ist ein normaler Produktions-Wartezustand und muss player-facing erklärbar sein.

## 12.5 Lokaler Output

Lokaler Stocktyp: Holz.  
Kapazität: **BALANCE**.

Der lokale Stock muss begrenzt sein können, damit sichtbare Transportengpässe entstehen. Die exakte Zahl wird nicht in S2D-05B eingefroren.

## 12.6 Pause

Produktion ist pausierbar. Bereits fertig produziertes Holz bleibt im lokalen Stock und weiterhin transportierbar.

---

# 13. Steinbruch (`b.quarry`)

## 13.1 Fachliche Funktion

Erzeugt Stein aus realen Steinressourcen im Arbeitsbereich.

## 13.2 Produktionsvertrag

Input: **reale Steinquelle als Weltziel**.  
Output: **Stein** als physische Ware.

`geeignete Steinquelle -> Steinmetz erreicht/arbeitet -> Stein in lokalem BuildingStock -> realer Transport -> HQ`

## 13.3 Worker

Benötigt Steinmetz-/Stonecutter-Capability.  
V1-Baseline: ein aktiver Spezialist; genaue Parallelität bleibt **BALANCE**.

## 13.4 WorkArea

**Pflicht.**

Aktueller Radius 4 Tiles = Baseline/Testwert. Geeignete reale Steinziele müssen innerhalb des gültigen Arbeitsbereichs liegen.

## 13.5 Lokaler Output

Lokaler Stock: Stein.  
Kapazität: **BALANCE**.

Pause stoppt neue Produktion, nicht den Abtransport fertiger Ware.

---

# 14. Fischerhütte (`b.fisher`)

## 14.1 Fachliche Funktion

Erzeugt Fisch über reale/authoritative Fisch-Arbeitsziele der Karte.

## 14.2 Produktionsvertrag

Input: **geeignetes Fisch-/Gewässerarbeitsziel**, keine physische Inputware.  
Output: **Fisch** als physische Ware.

`gültiges Fischziel -> Fischer erreicht/arbeitet -> Fisch in lokalem BuildingStock -> Transport -> HQ`

## 14.3 Worker

Benötigt Fischer-Capability.  
V1-Baseline: ein aktiver Spezialist; genaue Parallelität **BALANCE**.

## 14.4 WorkArea

**Pflicht.**

Aktueller Radius 4,5 Tiles = Baseline/Testwert. Die WorkArea darf nur fachlich gültige Fischziele berücksichtigen.

## 14.5 Lokaler Output

Lokaler Stock: Fisch.  
Kapazität: **BALANCE**.

Pause- und Transportregel wie bei anderen Produktionsgebäuden.

---

# 15. Jägerhütte (`b.hunter`)

## 15.1 Fachliche Funktion

Der Jäger arbeitet mit real existierenden Tier-Units im Arbeitsbereich und erzeugt daraus die V1-Waren Fleisch und Fell.

## 15.2 Produktionsvertrag

Input: **gültiges reales jagdbares Tierziel**, keine abstrakte Tierressource und keine physische HQ-Inputware.  
Outputs:
- Fleisch,
- Fell.

Die beiden Outputs sind getrennte physische Waren und getrennte Stockmengen.

Die heutige Baseline `1 Fleisch + 1 Fell` pro Produktionsvorgang wird **nicht** als finale Beuteformel eingefroren. Welche Tierart welche Menge/Art liefert, wird in einem Tier-/Ressourcen-Contentblock spezifiziert.

## 15.3 Worker

Benötigt Jäger-Capability.  
V1-Baseline: ein aktiver Spezialist; Parallelität **BALANCE**.

## 15.4 WorkArea

**Pflicht.**

Aktueller Radius 8 Tiles = Baseline/Testwert.

Nur reale gültige Tier-Units innerhalb der fachlich zulässigen WorkArea dürfen als Jagdziel dienen. Kein Tierziel vorhanden ist normaler Wartezustand, kein technischer Fehler.

## 15.5 Lokaler Output

Lokaler Stock führt mindestens getrennt:
- Fleisch,
- Fell.

Kapazitäten können je Ware oder als geeignete Gesamtregel modelliert werden; exakte Entscheidung/Zahlen bleiben **BALANCE/IMPLEMENTATION DETAIL**, solange die Warenmengen eindeutig bleiben.

Pause stoppt neue Jagd/Produktion. Bereits vorhandene Beute bleibt transportierbar.

---

# 16. Gemeinsames Produktionsgebäude-Profil

Für Holzfäller, Steinbruch, Fischer und Jäger gelten verbindlich:

1. Produktion benötigt einen geeigneten realen Spezialisten/Capability.
2. Assignment allein erzeugt keinen Output.
3. Der Worker muss den fachlich erforderlichen Ort tatsächlich erreichen.
4. WorkArea ist Teil der Contentfunktion.
5. Weltziel muss real und gültig sein.
6. Produktionsabschluss erzeugt Ware ausschließlich im lokalen BuildingStock.
7. Lokaler Stock und HQ-Stock sind getrennte physische Orte.
8. Carriertransport ist real und sichtbar.
9. HQ wird erst nach tatsächlicher Lieferung erhöht.
10. Produktionspause stoppt neue Produktion.
11. Fertiger lokaler Stock bleibt trotz Pause abholbar.
12. Outputkapazität ist begrenzbar; genaue Zahl bleibt Balance.
13. Voller Outputstock erzeugt einen normalen Transport-/Produktionsengpass.
14. Fehlender Worker erzeugt einen normalen Personalengpass.
15. Fehlendes Weltziel erzeugt einen normalen Ressourcen-/WorkArea-Wartezustand.
16. Unreachable/invalid targets werden nicht endlos pro Tick neu probiert; technische Behandlung folgt S2D-03.

## 17. Input-Kategorien – wichtige Trennung

S2D-05B unterscheidet drei fachliche Arten von Input:

### 17.1 Bauinput
Physische Waren für eine Baustelle:
- Holz,
- Stein.

### 17.2 Produktions-Weltinput
Reales Weltziel, das nicht als Ware vom HQ angeliefert wird:
- Baum,
- Steinquelle,
- Fischziel,
- jagdbares Tier.

### 17.3 Produktions-Wareninput
Physische Inputware aus einer anderen Produktionskette.

Für die vier aktuellen V1-Produktionsgebäude gilt:

> **Keines benötigt im V1 eine physische Produktions-Wareninputkette.**

Damit bleibt der erste Wirtschaftskern bewusst verständlich. Mehrstufige Ketten wie Getreide -> Mehl -> Brot bleiben LATER.

---

# 18. Local Stock / sichtbare Waren

## 18.1 Fachliche Regel

Jedes V1-Produktionsgebäude besitzt einen lokalen Outputbestand für seine erzeugten physischen Waren.

Dieser Bestand ist authoritative BuildingStock und kann visuell durch reale Warenstapel repräsentiert werden.

> **Die sichtbare Stapelgrafik ist niemals eine zweite Mengenwahrheit.**

## 18.2 Kapazität

Eine begrenzte lokale Kapazität gehört fachlich zum Ziel, weil sie:
- Transportbedarf sichtbar macht,
- Logistikengpässe erzeugt,
- verhindert, dass Gebäude unbegrenzt unsichtbar produzieren.

Die konkrete Kapazität pro Gebäude/Ware bleibt Balanceparameter.

Die Darstellung darf mehrere sichtbare Warenobjekte zeigen und leicht organisch/ungeordnet wirken, solange die Anzahl aus dem echten Stock abgeleitet wird und keine zusätzlichen Waren erzeugt.

---

# 19. Worker-Bedarf vs. Bewohneridentität

Die Contentdefinition eines Produktionsgebäudes darf eine erforderliche Spezialisierung/Capability nennen, aber keine Personenidentität umschreiben.

Beispiel:

`Holzfällerhütte requires lumberjack capability`

nicht:

`set resident type = lumberjack while assigned`.

Ein Spezialist bleibt dieselbe Person mit Home-Bindung. Arbeitsplatz, Spezialisierung und aktuelles Assignment sind getrennte Beziehungen gemäß S2D-02.

---

# 20. Gebäudezustände – fachlich vs. abgeleitet

## 20.1 Fachlich persistente/authoritative Zustände

Je nach Owner gehören hierzu beispielsweise:
- Baustelle vs. fertig,
- gelieferte Baumaterialien,
- Baufortschritt,
- Produktionspause,
- lokaler Stock,
- Wohnbelegung/Home-Bindungen über zuständige Owner.

## 20.2 Abgeleitete Spielerzustände

Nicht als zweite Content-/Runtimevariable speichern, wenn aus Wahrheit ableitbar:
- „Wartet auf Träger“,
- „Bauarbeiter unterwegs“,
- „Keine geeigneten Bäume“,
- „Ausgangslager voll“,
- „Produziert“,
- „Arbeiter unterwegs“.

Diese Zustände werden aus Ownerdaten/Assignments/Navigation/Stocks abgeleitet und entsprechend S2D-04 angezeigt.

---

# 21. Balanceparameter vs. feste Regeln

## 21.1 In S2D-05B fachlich fest

- sieben V1-Gebäudetypen,
- HQ-Funktion als Start-HQ/Hauptlager,
- kleine/mittlere Häuser mit Baseline 2/3 Bewohnern,
- vier Produktionsgebäude und ihre Outputarten,
- Produktionsgebäude benötigen passende Spezialisten/Capabilities,
- Produktionsgebäude nutzen WorkAreas,
- Weltressourcen/Tiere sind reale Arbeitsziele,
- Holz/Stein als V1-Baumaterialarten,
- lokale Produktion vor realem Transport,
- keine direkte Produktionsgutschrift ins HQ,
- Pause stoppt neue Produktion, nicht Abtransport fertiger Ware,
- Construction benötigt Materialvollständigkeit + reale Builder-Ankunft,
- sichtbare Waren sind Darstellung echten Stocks.

## 21.2 Noch BALANCE

- exakte Baukostenmengen,
- Produktionsdauer/Zykluszeit,
- lokale Stockkapazität,
- WorkArea-Radien,
- Workeranzahl/Parallelität oberhalb der V1-Baseline,
- Bewegungs-/Arbeitsgeschwindigkeiten,
- Jagdbeute je Tier,
- Tierdichte/Respawn,
- Gold-/Steuerrate,
- HQ-Lagerkapazität,
- Baustellendauer,
- sichtbare Stapelgrenzen/Visual-Aggregation.

## 21.3 Noch IMPLEMENTATION/VISUAL DETAIL

- konkrete JSON-Feldnamen,
- genaue Markerstruktur,
- Atlas-/Frame-Namen nach Normalisierung,
- Zahl und Schwellen sichtbarer Bauphasen,
- Animations-FPS,
- genaue Dockingpunkt-Geometrie,
- Pixel-/Spritegrößen,
- genaue Stack-Anordnung.

---

# 22. V1 Building Content Matrix

| Gebäude | Bauwaren | Produktions-Weltinput | Output | Worker | WorkArea | lokaler Outputstock | Wohnraum |
|---|---|---|---|---|---|---|---|
| Rathaus | Startgebäude; historische Holz/Stein-Kosten nicht V1-Startpreis | – | – | – | nein | zentraler HQ-Storage, kein Producer-Stock | nein |
| Kleines Wohnhaus | Holz + Stein | – | – | – | nein | nein | 2 |
| Mittleres Wohnhaus | Holz + Stein | – | – | – | nein | nein | 3 |
| Holzfäller | Holz/ggf. Stein gemäß späterer Balance; aktuelle Baseline nur Holz | Baum | Holz | Holzfäller | ja | Holz | nein |
| Steinbruch | Holz + Stein | Steinquelle | Stein | Steinmetz | ja | Stein | nein |
| Fischer | Holz/ggf. Stein gemäß späterer Balance; aktuelle Baseline nur Holz | Fischziel | Fisch | Fischer | ja | Fisch | nein |
| Jäger | Holz + Stein | reales jagdbares Tier | Fleisch + Fell | Jäger | ja | Fleisch + Fell | nein |

Hinweis zur Matrix: S2D-05B friert als gemeinsame V1-Baukostengüter Holz und Stein ein, aber nicht die exakte Kombination je Gebäude. Wo die heutige Definition nur Holz nutzt, darf dies bei der späteren Balanceprüfung unverändert bleiben.

---

# 23. S2D-05B-Invarianten

1. Es bleiben genau sieben Gebäude im ersten Wirtschaftskern.
2. HQ ist Startgebäude/Hauptlager und kein normales Produktionsgebäude.
3. Kleine und mittlere Häuser haben die bestätigte Baseline 2 bzw. 3 Bewohner.
4. Wohnhäuser besitzen keine Produktions-WorkArea.
5. Wohnhäuser erzeugen keine physische Goldware.
6. Holzfäller erzeugt Holz.
7. Steinbruch erzeugt Stein.
8. Fischer erzeugt Fisch.
9. Jäger erzeugt Fleisch und Fell als getrennte Waren.
10. Produktionsgebäude verwenden reale Weltziele.
11. Jäger verwendet reale Tier-Units.
12. Keines der vier V1-Produktionsgebäude benötigt eine vorgelagerte physische Produktionsware.
13. Produktion benötigt geeignete Worker-Capability.
14. Assignment allein erzeugt keinen Output.
15. Output entsteht zunächst lokal im BuildingStock.
16. Produktion schreibt nie direkt ins HQ.
17. Carriertransport ist physisch und sichtbar.
18. HQ-Credit erfolgt erst bei realer Lieferung.
19. Lokale Outputkapazität ist begrenzbar.
20. Sichtbare Warenstapel sind keine zweite Stockwahrheit.
21. Pause stoppt neue Produktion, nicht Transport vorhandener Ware.
22. Holz und Stein sind die V1-Baumaterialarten.
23. Baukostenmengen bleiben Balanceparameter.
24. Baufortschritt beginnt erst nach vollständiger Materiallieferung und echter Builder-Ankunft.
25. WorkArea-Radien bleiben Balanceparameter.
26. Produktionszyklen bleiben Balanceparameter.
27. Jagdbeute je Tier bleibt für späteren Contentblock offen.
28. Technische JSON-/Runtime-Struktur wird durch S2D-05B nicht vorgezogen.
29. Contentdefinitionen ändern keine Unit-Identität.
30. Spielerstatus wie „wartet auf Träger“ wird aus echter Runtime-Wahrheit abgeleitet.
31. Bestehende geeignete V1-Assets bleiben bevorzugte Basis.
32. S2D-05B führt keine LATER-Gebäude oder mehrstufige Produktionskette ein.
33. S2D-05B verändert keinen Gameplay-/Runtime-/UI-Code.

# 24. Abschlussstatus S2D-05B

- sieben Gebäude fachlich definiert: **PASS**
- Inputs/Outputs getrennt: **PASS**
- Baukostenarten vs. Balancewerte getrennt: **PASS**
- Worker-/Capability-Bedarf definiert: **PASS**
- WorkArea-Nutzung definiert: **PASS**
- lokale Outputstocks definiert: **PASS**
- Construction-/Visualzustände definiert: **PASS**
- HQ-/Housing-Sonderrollen definiert: **PASS**
- Balanceparameter explizit offen gehalten: **PASS**
- Widersprüche zu S2D-00/01/02/03/04: **0**
- Gameplay-/Runtime-/UI-Codeänderungen: **0**
- offene S2D-05B-Blocker: **0**

**S2D-05B – Building & Production Content Definitions: COMPLETE / 0 BLOCKER**

S2D-05 bleibt **V0.1 DRAFT** bis die übrigen Content-Unterblöcke und das gemeinsame Freeze-Gate abgeschlossen sind.
