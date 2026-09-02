# S2D-05C – Goods, World Resources & Animal Content Definitions

Status: **COMPLETE – Bestandteil von S2D-05 CONTENT CATALOG V0.1 DRAFT**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-05-content-catalog`  
Verbindliche Basis: S2D-00/01/02/03/04 FROZEN + S2D-05A/B COMPLETE

> Konsolidierungshinweis: Dieser geschlossene Teilblock wird spätestens beim S2D-05 Freeze-Gate in `docs/S2D-05_CONTENT_CATALOG.md` konsolidiert und anschließend als temporäres Teilblockdokument entfernt.

## 1. Zweck

S2D-05C legt die fachliche Contentbedeutung fest für:

- die fünf physischen V1-Waren Holz, Stein, Fisch, Fleisch und Fell,
- die realen Weltressourcen Bäume, Steinquellen und Fischvorkommen,
- die vier vorhandenen Tierarten Reh/Hirsch, Wildschwein, Hase/Kaninchen und Fuchs,
- Ressourcenabbau und Erschöpfung,
- Regeneration/Neubildung als Contentregel,
- Jagdrelevanz und Beuteverträge,
- die Trennung zwischen festem Contentverhalten und späteren Balancewerten.

Es wird kein Gameplay-Code verändert und keine finale Spawn-, Yield-, Respawn- oder Produktionsrate eingefroren.

## 2. Zentrale Regel

> **Waren sind transportierbare Wirtschaftsgüter; Weltressourcen und Tiere sind reale Quellen/Ziele der Simulation und dürfen nicht als versteckte zweite Warenbestände behandelt werden.**

Das bedeutet:

- Holz ist eine Ware; ein Baum ist keine Holz-Ware im Lager.
- Stein ist eine Ware; eine Steinquelle ist keine HQ-Steinmenge.
- Fisch ist eine Ware; ein Fischvorkommen ist kein zentraler Fischbestand.
- Fleisch/Fell sind Waren; ein Tier ist nicht bereits Fleisch/Fell im Wirtschaftssystem.

Erst eine fachlich erfolgreiche Arbeits-/Produktionshandlung wandelt bzw. erzeugt daraus lokale Outputware am Produktionsgebäude.

## 3. Gemeinsames Warenmodell

Die fünf V1-Waren sind:

| ID | Spielername | Art | Hauptquelle V1 | normal transportierbar |
|---|---|---|---|---|
| `wood` | Holz | physische Ware | Holzfäller/Bäume | ja |
| `stone` | Stein | physische Ware | Steinbruch/Steinquelle | ja |
| `fish` | Fisch | physische Ware | Fischer/Fischvorkommen | ja |
| `meat` | Fleisch | physische Ware | Jäger/reales Tier | ja |
| `pelt` | Fell | physische Ware | Jäger/reales Tier | ja |

Für alle gilt die bereits eingefrorene Einmaligkeitsregel:

`eine reale Warenmenge -> genau ein autoritativer wirtschaftlicher Ort`

Mögliche Orte im V1 sind insbesondere:

- lokaler BuildingStock,
- reserviert am gleichen physischen Ort,
- getragen von einer Unit,
- HQ-/Storagebestand,
- Baustellenbestand bei Holz/Stein,
- verbraucht/verbaut.

Reservation ist keine zusätzliche Warenmenge.

## 4. Holz

### 4.1 Fachliche Bedeutung

Holz ist:

- physische Ware,
- V1-Baumaterial,
- Output der Holzfällerhütte,
- lokal lagerbar,
- physisch transportierbar,
- im HQ zentral verfügbar nach realer Lieferung.

### 4.2 Quelle

Holz entsteht im V1 aus realen Baumressourcen der Karte.

Zielablauf:

`realer Baum -> gültiges Holzfällerziel -> Holzfäller erreicht Ziel -> Arbeit -> Baumzustand wird fachlich verbraucht/verändert -> Holz entsteht lokal an der Holzfällerhütte -> Transport -> HQ`

Ein Baum darf nicht allein durch Job-Erzeugung oder Pfadplanung verschwinden.

### 4.3 Yield

Die exakte Holzmenge pro gefälltem Baum bleibt **BALANCE**.

S2D-05C friert nur ein:

> Ein erfolgreicher Holzfäller-Arbeitsabschluss muss mit einer realen Veränderung der Baumressource und einem eindeutig gebuchten lokalen Holzoutput verbunden sein.

## 5. Stein

Stein ist:

- physische Ware,
- V1-Baumaterial,
- Output des Steinbruchs,
- lokal lagerbar,
- physisch transportierbar,
- im HQ zentral verfügbar nach Lieferung.

Quelle ist eine reale Steinressource/Steinquelle im Arbeitsbereich.

Zielablauf:

`reale Steinquelle -> gültiges Ziel -> Steinmetz erreicht/arbeitet -> Ressourcenmenge/-zustand sinkt -> Stein entsteht lokal -> Transport -> HQ`

Exakte Yield-/Vorratswerte bleiben **BALANCE**.

## 6. Fisch

Fisch ist:

- physische Ware,
- Nahrungsware im V1,
- Output der Fischerhütte,
- lokal lagerbar,
- physisch transportierbar.

Quelle ist ein reales autoritatives Fischvorkommen/Fisch-Arbeitsziel im Wasserbereich.

Zielablauf:

`gültiges Fischvorkommen -> Fischer erreicht gültigen Arbeits-/Interaktionspunkt -> Fangarbeit -> Vorkommen wird fachlich beansprucht -> Fisch entsteht lokal -> Transport -> HQ`

Ein Fischvorkommen ist kein sichtbarer Fischstapel und kein zweiter ResourceStore.

## 7. Fleisch

Fleisch ist:

- physische Nahrungsware,
- Jägeroutput,
- lokal an der Jägerhütte lagerbar,
- physisch transportierbar.

Es entsteht nur aus einer erfolgreich abgeschlossenen Jagd auf ein gültiges reales Tierziel.

Die exakte Fleischmenge je Tierart bleibt **BALANCE/CONTENT DETAIL**.

## 8. Fell

Fell ist:

- physische Ware,
- zweiter möglicher Jägeroutput,
- getrennt von Fleisch zu zählen,
- lokal lagerbar,
- physisch transportierbar.

Fleisch und Fell dürfen nicht als gekoppelte Einheitsware behandelt werden. Ein Jagdereignis kann abhängig von Tierart später unterschiedliche Mengen oder auch nur einen der Outputs liefern.

Die konkrete Tier->Beute-Matrix wird in Abschnitt 19 eingegrenzt, aber Mengen bleiben offen.

---

# 9. Weltressourcen – gemeinsames Modell

Weltressourcen sind autoritative Kartenobjekte bzw. Ressourcen-Nodes.

V1-Typen:

1. Baum,
2. Steinquelle,
3. Fischvorkommen.

Jede Ressource benötigt fachlich mindestens:

- stabile Identität innerhalb des aktuellen Weltzustands,
- Typ,
- reale Position,
- aktiv/verfügbar bzw. erschöpft/nicht verfügbar,
- gegebenenfalls verbleibenden Vorrat oder Lebens-/Wachstumszustand,
- gültige Interaktionsmöglichkeit,
- Save/Continue-fähigen autoritativen Zustand.

Technische Feldnamen bleiben offen.

## 10. Ressourcenziel und Reservation

Eine Produktionsunit darf nur ein reales aktuell gültiges Ziel bearbeiten.

Falls exklusive Zielreservation nötig ist, dient sie ausschließlich dazu, Doppelarbeit auf demselben Ziel zu verhindern.

Sie erzeugt keine zweite Ressource.

Mindestens muss verhindert werden:

- zwei Worker verbrauchen denselben bereits entfernten Baum,
- mehrfacher Output aus derselben bereits erschöpften Steinquelle,
- wiederholter Fang aus einem bereits ungültigen Fischziel durch stale Jobs.

## 11. Ressourcenverbrauch – allgemeine Regel

> **Output darf nur entstehen, wenn die zugehörige Weltquelle fachlich erfolgreich beansprucht wurde.**

Der genaue Commit-Zeitpunkt zwischen Weltressourcen-Owner und ProductionSystem wird technisch später festgelegt, muss aber atomar/rollback-sicher genug sein, um Doppeloutput oder verlorene Ressource zu verhindern.

Nicht zulässig:

- Quelle entfernen, Output scheitert und ist dauerhaft verloren ohne definierte Recovery,
- Output erzeugen, Quelle bleibt unverändert und kann unbegrenzt erneut benutzt werden,
- Quelle nur visuell ausblenden, während sie fachlich weiter verfügbar bleibt.

---

# 12. Bäume

## 12.1 Vorhandener Bestand

Der heutige MapResources-Unterbau besitzt bereits reale `tree`-Nodes und einen vorbereiteten `stage`-Wert für Bäume. Die konkrete aktuelle Stage-Nutzung wird durch S2D-05C nicht als fertiges Wachstumssystem angenommen.

## 12.2 V1-Verhalten

Bäume sind im V1 reale, endliche Holzquellen.

Ein erfolgreich gefällter Baum:

- ist danach nicht mehr als voll nutzbarer Baum verfügbar,
- darf nicht erneut als gültiges Holzfällerziel dienen,
- verändert die sichtbare Welt entsprechend,
- kann später über eine Regenerationsregel neu entstehen.

## 12.3 Wachstum/Regeneration

Für den V1-Kern wird **natürliche Baumregeneration als Zielregel vorgesehen**, damit eine lange Sandbox nicht zwangsläufig durch kompletten Holzverlust endet.

Verbindlich ist nur:

- Regeneration ist langsam gegenüber Produktion,
- sie geschieht über MapResources/Weltregeln, nicht durch den Holzfäller selbst,
- neu entstandene Bäume sind echte neue/erneuerte Weltressourcen,
- es gibt keine sofortige Ersetzung direkt nach dem Fällen,
- Wachstum kann bei Bedarf sichtbare Stufen verwenden.

Noch **BALANCE/IMPLEMENTATION DETAIL**:

- Regenerationszeit,
- Wahrscheinlichkeit,
- Mindestabstände,
- maximale Baumdichte,
- Zahl der Wachstumsstufen,
- ob aus Stumpf nachgewachsen oder separat neu gespawnt wird.

Ein Förster ist vorhandener LATER-Content und wird nicht benötigt, um die V1-Baumregeneration grundsätzlich zu ermöglichen.

---

# 13. Steinquellen

Steinquellen sind reale endliche Ressourcen.

Verbindlich:

- jede Quelle besitzt einen fachlich begrenzbaren Vorrat,
- erfolgreiche Steinproduktion reduziert diesen Vorrat bzw. verbraucht die Quelle,
- eine erschöpfte Quelle ist kein gültiges Arbeitsziel mehr,
- die sichtbare Welt muss Erschöpfung/Entfernung nachvollziehbar widerspiegeln.

## 13.1 Steinregeneration

Für den V1-Kern wird **keine schnelle natürliche Steinregeneration als Pflicht** eingeführt.

Stein darf sich wirtschaftlich deutlich endlicher anfühlen als Fisch oder Waldnachwuchs.

Damit bleibt offen, welche langfristige Sandbox-Lösung später gewählt wird, z. B.:

- sehr langsame natürliche Neubildung,
- ausreichend große Startvorkommen,
- spätere neue Kartengebiete,
- spätere Minen/Steinproduktion.

S2D-05C friert keine dieser LATER-Lösungen ein.

Für den ersten vollständigen Kern genügt: vorhandene Karte muss ausreichend Stein für sinnvolles Spielen enthalten; konkrete Menge ist **BALANCE/MAP CONTENT**.

---

# 14. Fischvorkommen

Fischvorkommen sind reale autoritative Arbeitsziele im Wasser.

Sie dürfen visuell als Fischaktivität/Fischspot erscheinen, sind aber kein fertiger Warenbestand.

## 14.1 Verbrauch

Erfolgreiches Fischen reduziert Verfügbarkeit/Vorrat eines Fischvorkommens oder setzt es vorübergehend in einen nicht nutzbaren Zustand.

Ein erschöpftes/ruhendes Fischziel darf nicht sofort unbegrenzt weiter Output liefern.

## 14.2 Regeneration

Für Fisch wird **Regeneration als V1-Zielregel festgelegt**.

Grund:

- Fisch ist eine erneuerbare Nahrungsquelle,
- die Sandbox soll nicht allein durch einen einmal leergefischten Kartenstart dauerhaft unbrauchbar werden,
- WorkArea-Wahl und zeitweilige Erschöpfung sollen trotzdem relevant bleiben.

Verbindlich:

- Regeneration benötigt Zeit,
- erschöpfte Spots dürfen temporär unbrauchbar sein,
- Regeneration gehört dem MapResources-System,
- kein Fischer erzeugt Fischspots selbst.

Regenerationsrate, Kapazität pro Spot und Spawn-/Clusterregeln bleiben **BALANCE**.

---

# 15. Regenerationsübersicht V1

| Weltquelle | erneuerbar im Zielbild | V1-Regel |
|---|---|---|
| Baum | ja | langsame natürliche Regeneration vorgesehen |
| Steinquelle | nicht zwingend/keine schnelle Regeneration | endliche Quelle; langfristige Erweiterung später |
| Fischvorkommen | ja | zeitliche Regeneration vorgesehen |
| Tiere | ja | Population/Respawn-Regel nötig, siehe unten |

Diese Tabelle legt Verhaltenstypen fest, keine Zahlen.

---

# 16. Tiere – gemeinsames Modell

Vorhandene Tierarten:

- Reh/Hirsch (`deer`),
- Wildschwein (`boar`),
- Hase/Kaninchen (`rabbit`),
- Fuchs (`fox`).

Tiere sind reale bewegliche Welt-Units des MapAnimals-Owners.

Sie besitzen mindestens:

- reale Identität im Weltzustand,
- Tierart,
- reale Position,
- lebendig/entfernt bzw. entsprechenden Lifecycle,
- Bewegung,
- Terrain-/Weltregeln,
- Jagdbarkeit gemäß Contentdefinition,
- Save/Continue-relevanten Zustand oder deterministisch zulässige Rekonstruktion nach den späteren Save-Regeln.

Sie gehören nicht zur menschlichen Workforce.

## 17. Tierbewegung und Lebensraum

V1-Ziel:

- Tiere bewegen sich sichtbar selbstständig,
- laufen nicht beliebig durch ungültiges Gelände/Wasser,
- Wald-/Naturbereiche dürfen als bevorzugte Aufenthaltsbereiche dienen,
- Tiere bleiben Teil der lebendigen beobachtbaren Siedlungswelt.

Exakte Geschwindigkeiten, Retarget-Distanzen, Spawnabstände und Artenlimits bleiben **BALANCE**.

Die aktuellen Runtime-Werte dienen nur als Baseline/Testwerte.

## 18. Jagdvertrag

Zielablauf:

`reales jagdbares Tier -> Jäger erhält gültiges Ziel -> Jäger erreicht Jagd-/Interaktionssituation -> Jagd wird erfolgreich abgeschlossen -> Tier wird fachlich entfernt/getötet -> Beute entsteht lokal an der Jägerhütte -> Transport -> HQ`

Verbindlich:

1. Kein Fleisch/Fell ohne reales gültiges Tierziel.
2. Ein bereits entferntes/getötetes Tier darf keinen zweiten Jagdoutput erzeugen.
3. Zwei Jäger dürfen nicht unabhängig dieselbe Tierinstanz erfolgreich verwerten.
4. Tierentfernung und Beuteerzeugung müssen fachlich konsistent gekoppelt sein.
5. Jagdbeute entsteht nicht direkt im HQ.
6. Kein abstrakter unsichtbarer Tierpool ersetzt MapAnimals.

---

# 19. Tierarten und V1-Jagdrelevanz

S2D-05C legt die grundsätzliche Contentrolle fest, ohne finale Mengen zu bestimmen.

## 19.1 Reh/Hirsch

V1-Status: **JAGDBAR / CORE**.

Plausibler V1-Beutevertrag:
- Fleisch: ja,
- Fell: ja.

Exakte Mengen: **BALANCE**.

## 19.2 Wildschwein

V1-Status: **JAGDBAR / CORE**.

Beutevertrag:
- Fleisch: ja,
- Fell: optional/geringer als bei Reh; endgültige Fellregel bleibt Content-Balanceentscheidung.

Für die V1-Systemfunktion genügt mindestens Fleisch als echter Jagdoutput.

## 19.3 Hase/Kaninchen

V1-Status: **JAGDBAR / CORE**, sofern auf der Karte vorhanden.

Beutevertrag:
- Fleisch: ja,
- Fell: möglich.

Kleine Tierart soll tendenziell geringere Beute als große Tiere liefern; konkrete Mengen werden nicht eingefroren.

## 19.4 Fuchs

V1-Status: **WELTTIER KEEP; JAGDBEUTE DEFERRED**.

Der Fuchs bleibt als sichtbares Tier Teil der V1-Weltbasis. Ob er im ersten spielbaren Kern regulär Jagdziel für Fleisch/Fell ist, wird noch nicht zwingend festgelegt.

Begründung:
- Sein Asset/Runtime-Unterbau ist vorhanden,
- für die Kernfunktion Jagd reichen bereits Reh, Wildschwein und Kaninchen,
- wir vermeiden eine unnötig frühe Beute-/Balancingentscheidung.

Damit gilt:

> Nicht jedes sichtbare Tier muss automatisch eine produktive Ressource sein.

---

# 20. Tierpopulation und Regeneration

Da Jagd Tiere dauerhaft aus der Welt entfernt, benötigt die Sandbox eine kontrollierte Populationserneuerung.

V1-Zielregel:

- jagdbare Tierarten können sich über Zeit regenerieren/neu spawnen,
- Population bleibt begrenzt,
- Respawn ist nicht unmittelbar nach dem Abschuss,
- Spawn berücksichtigt gültiges Terrain/Lebensraum,
- kein Spawn direkt als Reaktion auf den Jägerjob an derselben Stelle,
- die Welt kann zeitweise lokal „leer gejagt“ sein,
- WorkArea-Wahl bleibt dadurch spielerisch relevant.

Die heutige `maxPerType`-Konfiguration ist nur Baseline und wird nicht als finale Populationsbalance eingefroren.

Noch **BALANCE/IMPLEMENTATION DETAIL**:

- Respawnzeit,
- Populationsmaximum je Art,
- Mindestpopulation,
- Spawnkandidaten,
- Entfernung zu Gebäuden/HQ,
- Waldpräferenz,
- eventuelle Reproduktionslogik statt einfachem Respawn.

---

# 21. Kein automatischer Ressourcenausgleich

Die Regeneration darf Engpässe nicht sofort unsichtbar reparieren.

Verbindlich:

- zu stark genutzter Wald kann vorübergehend zu wenig Bäume bieten,
- Fischbereich kann zeitweise erschöpft sein,
- Jagdgebiet kann lokal leer sein,
- Steinquelle kann endgültig erschöpft sein.

Der Spieler soll darauf durch räumliche Entscheidungen und WorkArea-Anpassung reagieren können.

Regeneration dient Langzeitspielbarkeit, nicht der Abschaffung von Wirtschaftsplanung.

---

# 22. Save/Continue

Persistenz muss mindestens sicherstellen, dass nach Continue keine verbrauchten Weltressourcen oder gejagten Tiere einfach wieder vollständig erscheinen und dadurch Wirtschaft dupliziert wird.

Ziel:

- verbrauchte/aktive Ressourcenstände werden autoritativ gespeichert oder eindeutig reproduzierbar rekonstruiert,
- Regenerationszustände/Fälligkeiten nutzen Simulationszeit, keine Wall-Clock-Timerhandles,
- Tierpopulation wird so wiederhergestellt/restrukturiert, dass bereits in Ware umgewandelte Tiere nicht zusätzlich erneut existieren,
- lokale/HQ-Waren bleiben gemäß S2D-03D getrennt von Weltquellen.

Die genaue Snapshotstruktur bleibt technische Implementierungsentscheidung.

---

# 23. Spielerfeedback

Spielerrelevant und später in UI/Welt darstellbar:

- `Keine geeigneten Bäume im Arbeitsbereich`,
- `Steinvorkommen erschöpft`,
- `Fischvorkommen derzeit erschöpft`,
- `Kein jagdbares Tier im Arbeitsbereich`.

Nicht im normalen Spieler-UI:

- Node IDs,
- Spawn RNG,
- Respawn-Timestamps,
- interne Population-Caches,
- A*-Fehlercodes.

Die Welt selbst soll durch fehlende/neu wachsende Ressourcen und sichtbare Tiere einen großen Teil des Feedbacks liefern.

---

# 24. Feste Contentregeln vs. Balance

## 24.1 Fachlich fest

- fünf physische V1-Waren,
- Bäume als reale Holzquelle,
- Steinquellen als reale Steinquelle,
- Fischvorkommen als reale Fischquelle,
- Tiere als reale Jagdziele/lebende Weltobjekte,
- Reh, Wildschwein und Kaninchen grundsätzlich jagdbar,
- Fuchs als sichtbares Welttier; Jagdbeute noch deferred,
- Ressourcenverbrauch muss reale Quelle verändern,
- keine Quelle darf mehrfach aus demselben verbrauchten Zustand Output erzeugen,
- Baumregeneration vorgesehen,
- Fischregeneration vorgesehen,
- Stein keine schnelle Pflichtregeneration,
- Tierpopulation regeneriert kontrolliert,
- Jagdoutput entsteht lokal an der Jägerhütte,
- Save/Continue darf verbrauchte Quellen nicht duplizieren.

## 24.2 Balanceparameter

- Startanzahl Bäume/Steine/Fischspots,
- Ressourcenvorrat pro Node,
- Yield pro Arbeitsvorgang,
- Baumwachstumszeit,
- Fischregeneration,
- Tierrespawn,
- Tierpopulationsgrößen,
- Jagdbeute je Tier,
- Jagddauer,
- Resource-Clusterverteilung,
- WorkArea-Radien,
- lokale Stockkapazitäten.

## 24.3 Implementation/Visual Detail

- genaue Node-Datenstruktur,
- Stage-Feld/Enums,
- Wachstumsgrafiken,
- Respawnalgorithmus,
- RNG/Seed-Details,
- Atlas-Frames,
- Resource-LOD,
- Y-Sort-Details,
- genaue Interaktionspunkte.

---

# 25. S2D-05C-Invarianten

1. Holz, Stein, Fisch, Fleisch und Fell bleiben physische Waren.
2. Weltressourcen sind keine Warenbestände.
3. Tiere sind keine vorgebuchten Fleisch-/Fellmengen.
4. Produktion aus Weltressourcen benötigt reales gültiges Ziel.
5. Output entsteht erst nach erfolgreicher Arbeitsaktion.
6. Verbrauch der Quelle und Output müssen fachlich konsistent gekoppelt sein.
7. Derselbe verbrauchte Baum erzeugt keinen zweiten Output.
8. Eine erschöpfte Steinquelle ist kein gültiges Ziel.
9. Ein erschöpftes Fischvorkommen kann nicht unbegrenzt weiter liefern.
10. Bäume dürfen langsam regenerieren.
11. Fischvorkommen regenerieren zeitlich.
12. Stein besitzt keine schnelle verpflichtende V1-Regeneration.
13. Reh/Hirsch ist jagdbar.
14. Wildschwein ist jagdbar.
15. Hase/Kaninchen ist jagdbar.
16. Fuchs bleibt Welttier; produktive Jagdbeute ist noch deferred.
17. Ein gejagtes Tier darf nur einmal verwertet werden.
18. Fleisch und Fell sind getrennte physische Outputs.
19. Tierpopulation darf kontrolliert regenerieren.
20. Regeneration repariert Engpässe nicht sofort.
21. WorkArea-Wahl bleibt relevant.
22. Ressourcen-/Tierregeneration läuft in Simulationszeit/Schedulerarchitektur.
23. Save/Continue darf keine verbrauchten Ressourcen/Tiere duplizieren.
24. Sichtbare Ressourcen/Tiere repräsentieren den echten Weltzustand.
25. Spawn-/Yield-/Respawnzahlen bleiben Balanceparameter.
26. S2D-05C führt keine Epoche-2-Waren oder mehrstufige Produktionskette ein.
27. S2D-05C verändert keinen Gameplay-/Runtime-/UI-Code.

# 26. Abschlussstatus S2D-05C

- Warenmodell: **PASS**
- Weltressourcenmodell: **PASS**
- Verbrauch/Erschöpfung: **PASS**
- Regenerationsarten: **PASS**
- Tierartenbasis: **PASS**
- Jagdvertrag: **PASS**
- Tierpopulationsregeneration: **PASS**
- Save/Continue-Bindung: **PASS**
- Balance vs. feste Regeln getrennt: **PASS**
- Widersprüche zu S2D-00/01/02/03/04/05A/B: **0**
- Gameplay-/Runtime-/UI-Codeänderungen: **0**
- offene S2D-05C-Blocker: **0**

**S2D-05C – Goods, World Resources & Animal Content Definitions: COMPLETE / 0 BLOCKER**
