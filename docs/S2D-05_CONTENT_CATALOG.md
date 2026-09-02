# S2D-05 – CONTENT CATALOG

Status: **V0.1 DRAFT – S2D-05A COMPLETE**  
Datum: 2026-09-02  
Repository: `DrHoschi/siedler-mini`  
Arbeitsbranch: `feature/s2d-05-content-catalog`  
Verbindliche Basis: `S2D-00 PROJECT MASTER V0.1 FROZEN` + `S2D-01 GAME DESIGN V0.1 FROZEN` + `S2D-02 UNIT & WORKFORCE MODEL V0.1 FROZEN` + `S2D-03 TECHNICAL ARCHITECTURE V0.1 FROZEN` + `S2D-04 UI / MOBILE UX V0.1 FROZEN`

# S2D-05A – Existing Content Inventory & V1 Content Baseline

## 1. Zweck

S2D-05A erfasst den tatsächlich vorhandenen Content-Bestand des Repositories und trennt ihn vom verbindlichen Inhalt des ersten vollständigen Wirtschaftskerns.

Dieser Block beantwortet:

- Welche Gebäude sind derzeit tatsächlich als aktive Definitionen vorhanden?
- Welche Waren/Wirtschaftswerte sind aktiv definiert?
- Welche Personen-/Berufsdefinitionen existieren bereits?
- Welche Tiere und Weltressourcen existieren bereits?
- Welche zugehörigen Sprites/Atlanten/Icons sind bereits vorhanden?
- Was wird für V1 unverändert übernommen?
- Was bleibt grundsätzlich brauchbar, benötigt aber fachliche oder technische Anpassung?
- Was gehört erst in spätere Ausbaustufen?
- Was gehört aus dem Zielbild heraus bzw. darf nicht als produktiver V1-Content behandelt werden?

Es wird **kein Gameplay-Code, keine Asset-Datei und keine Balance verändert**.

## 2. Klassifikationsschema

### KEEP

Vorhandener Content gehört direkt zum eingefrorenen V1-Wirtschaftskern und kann grundsätzlich weiterverwendet werden.

KEEP bedeutet nicht automatisch, dass seine heutige Runtime-Implementierung unverändert bleiben muss. S2D-03 kann weiterhin technische Migration verlangen.

### ADAPT

Vorhandener Content gehört fachlich zum V1-Kern, benötigt aber Bereinigung, Neuverdrahtung, neue Definitionseigenschaften, Asset-Normalisierung oder Anpassung an S2D-00 bis S2D-04.

### LATER

Content ist grundsätzlich brauchbar oder interessant, gehört aber nicht in den ersten vollständigen Wirtschaftskern.

Er bleibt erhalten und wird erst in einer späteren Produkt-/Content-Stufe aktiviert oder vollständig spezifiziert.

### OUT

Content oder Definition ist für das aktuelle Zielbild keine produktive Wahrheit und soll nicht in den V1-Kern einfließen.

OUT bedeutet nicht zwingend sofort löschen. Historische Dateien dürfen bis zu einem kontrollierten Cleanup erhalten bleiben.

## 3. Zentrale Regel

> **Vorhanden im Repository ist nicht gleich freigegeben für V1.**

Die V1-Baseline wird ausschließlich aus dem eingefrorenen S2D-00 bis S2D-04-Zielbild abgeleitet.

Historische Kategorien, spätere Epochen, Testassets, Aliasdefinitionen und Vorabideen dürfen nicht allein durch ihre Existenz in den produktiven Kern rutschen.

---

# 4. Gebäude – vorhandener aktiver Definitionsbestand

`data/buildings.json` enthält aktuell genau sieben aktivierte Gebäudeinstanztypen.

| ID | Name | heutige Kategorie | Kernfunktion | S2D-05A |
|---|---|---|---|---|
| `b.hq` | Rathaus | admin | Start-HQ, Hauptlager, zentrale Anlieferstelle | KEEP |
| `b.lumberjack` | Holzfällerhütte | resource | Holzproduktion | KEEP |
| `b.quarry` | Steinbruch | resource | Steinproduktion | KEEP |
| `b.fisher` | Fischerhütte | food | Fischproduktion | KEEP |
| `b.hunter` | Jägerhütte | resource | Fleisch + Fell aus realen Tieren | KEEP |
| `b.house_small` | Kleines Wohnhaus | housing | Wohnraum, aktuell 2 Bewohner | KEEP |
| `b.house_middle` | Mittleres Wohnhaus | housing | Wohnraum, aktuell 3 Bewohner | KEEP |

Damit stimmt der aktive Gebäude-Definitionsbestand exakt mit dem bereits eingefrorenen V1-Content-Kern aus S2D-00/01 überein.

## 4.1 Rathaus / HQ

Vorhanden:

- `b.hq`,
- 3x3 Footprint,
- definierter Entrance,
- Baukosten in Holz/Stein,
- eigener Atlas `hq_building_atlas`,
- Place/Live/Reserve Frames,
- Marker für Entry/Chimney/Tool/Carry.

Klassifikation: **KEEP**, mit folgenden späteren ADAPT-Punkten auf Definitions-/Runtime-Ebene:

- HQ bleibt Startgebäude und wird im V1 nicht als normales mehrfach baubares Standardgebäude vorausgesetzt.
- ResourceStore-/Storage-Ownership muss der S2D-03-Zielarchitektur entsprechen.
- UI-/Baukatalogverhalten folgt S2D-04, nicht historischen Kategorien.

## 4.2 Holzfällerhütte

Vorhanden:

- Produktion `wood x1`,
- Arbeitsbereich Kreis, Radius aktuell 4 Tiles,
- eigener Gebäudeatlas,
- definierte Marker und Entrance,
- Produktionszyklus als historischer Wert.

Klassifikation: **KEEP**.

ADAPT später nur dort, wo Runtime/Definition an das eingefrorene Produktions-, Worker-, WorkArea- und BuildingStock-Modell angepasst werden muss.

## 4.3 Steinbruch

Vorhanden:

- Produktion `stone x1`,
- Arbeitsbereich Radius aktuell 4 Tiles,
- eigener Gebäudeatlas,
- definierter Entrance/Marker.

Klassifikation: **KEEP**.

## 4.4 Fischerhütte

Vorhanden:

- Produktion `fish x1`,
- Arbeitsbereich Radius aktuell 4.5 Tiles,
- eigener Gebäudeatlas,
- definierter Entrance/Marker.

Klassifikation: **KEEP**.

## 4.5 Jägerhütte

Vorhanden:

- Produktion `meat x1` + `pelt x1`,
- Arbeitsbereich Radius aktuell 8 Tiles,
- eigener Gebäudeatlas,
- definierter Entrance/Marker.

Klassifikation: **KEEP**.

Fachliche Bindung:

> Die Jägerhütte arbeitet im Zielmodell mit real existierenden Tier-Units; kein abstrakter unsichtbarer Tierbestand wird eingeführt.

## 4.6 Kleines Wohnhaus

Vorhanden:

- `u.villager x2`,
- eigener Gebäudeatlas,
- definierter Entrance/Marker.

Klassifikation: **KEEP**.

Die Menge 2 ist die bestätigte V1-Baseline.

## 4.7 Mittleres Wohnhaus

Vorhanden:

- `u.villager x3`,
- eigener Gebäudeatlas,
- definierter Entrance/Marker.

Klassifikation: **KEEP**.

Die Menge 3 ist die bestätigte V1-Baseline.

---

# 5. Historische Gebäude-/Katalogkategorien

`data/buildings.json` enthält zusätzlich Kategorien, obwohl aktuell nicht alle produktive Gebäude enthalten:

- Alles,
- Verwaltung,
- Rohstoffe,
- Nahrung,
- Hütten,
- Straßen/Lager,
- Verteidigung,
- Decoration,
- Wege/Pfade.

Für die V1-UI ist diese historische Kategorienliste **ADAPT**.

S2D-04C hat für den kleinen V1-Kern bewusst nur eine sehr einfache Spielergruppierung vorgesehen:

- Wohnen,
- Produktion.

Das Rathaus ist Startgebäude und kein regulärer Standard-Katalogeintrag.

Historische leere Kategorien wie Militär, Straßen/Lager, Decoration und Wege/Pfade werden für V1 nicht als leere Menüpunkte gezeigt.

Klassifikation der Kategorieideen:

- Wohnen / housing → **KEEP/ADAPT** auf neue UI-Gruppierung.
- Produktion / resource + food → **ADAPT** zu klarer V1-Spielergruppe.
- Verwaltung → **ADAPT**, HQ außerhalb normalen Baukatalogs.
- Straßen/Lager → **LATER**.
- Verteidigung → **LATER**.
- Wege/Pfade als baubare Straßen → **LATER**; automatische Trampelpfade bleiben NOW als Simulation.
- Decoration → **LATER**.

---

# 6. Gebäudeassets – vorhandener Bestand

Im Gebäude-Assetbaum existieren direkt nutzbare bzw. referenzierte V1-Dateien für:

- Rathaus/HQ,
- Holzfäller,
- Steinbruch,
- Fischer,
- Jäger,
- kleines Wohnhaus,
- mittleres Wohnhaus,
- Baustellenphasen.

Beispiele des vorhandenen Bestands:

- `assets/buildings/hq/hq-sprite.png`
- `assets/buildings/lumberjack/lumberjack-sprite.png`
- `assets/buildings/quarry/quarry-sprite.png`
- `assets/buildings/fishman/fischer_wood1.png`
- `assets/buildings/hunter/hunter-sprite.png`
- `assets/buildings/house/house-small-sprite.png`
- `assets/buildings/house/house-middle-sprite.png`
- `assets/buildings/building_place/baustelle_0.png`
- `assets/buildings/building_place/baustelle_1.png`
- `assets/buildings/building_place/baustelle_2.png`

Klassifikation: **KEEP**, mit möglicher **ADAPT**-Normalisierung der Asset-/Atlasstruktur in späteren Implementierungs-/Dev-Tool-Blöcken.

## 6.1 Vorhandene spätere Gebäudeassets

Zusätzlich existieren bereits Einzelassets für spätere Gebäudeideen, u. a.:

- Bäcker,
- Depot/Lager,
- Farm,
- Schmied,
- Wachturm,
- Windmühle.

Diese Assets werden **nicht gelöscht**, aber für den ersten Wirtschaftskern als **LATER** klassifiziert.

Sie sind keine Freigabe dafür, ihre Produktionsketten jetzt vorzuziehen.

---

# 7. Ressourcen / Waren / Wirtschaftswerte – aktive Definitionen

`data/resources.json` enthält aktuell:

| ID | Name | fachliche Art | S2D-05A |
|---|---|---|---|
| `wood` | Holz | physische Ware | KEEP |
| `stone` | Stein | physische Ware | KEEP |
| `fish` | Fisch | physische Ware | KEEP |
| `meat` | Fleisch | physische Ware | KEEP |
| `pelt` | Fell | physische Ware | KEEP |
| `gold` | Gold | Wirtschaftswert, nicht normale Transportware | ADAPT |
| `population` | Bevölkerung | abgeleiteter Wert, keine Ware | ADAPT |

## 7.1 Physische V1-Waren

Verbindlicher V1-Warenkern:

- Holz,
- Stein,
- Fisch,
- Fleisch,
- Fell.

Diese fünf Definitionen sind **KEEP**.

Ihre zukünftige Definition muss die S2D-01/03-Warenortregeln respektieren:

`lokal -> reserviert -> Unit trägt -> Zielbestand`

Keine Ware darf gleichzeitig als lokaler Bestand, Carrier-Inventar und HQ-Bestand doppelt existieren.

## 7.2 Gold

Gold existiert historisch in derselben Resource-Datei.

Fachlich ist Gold im eingefrorenen Zielbild **kein normal transportierbarer Gegenstand**, sondern Wirtschaftswert.

Daher:

- Inhalt Gold: **KEEP**,
- heutige gemeinsame Resource-Einordnung: **ADAPT**.

Später soll Gold über den zuständigen Economy-/Gold-Owner geführt werden.

## 7.3 Population

Population existiert historisch als Resource-Definition mit Icon.

Fachlich ist Bevölkerung aber:

`Population = Anzahl gültiger realer Bewohner`

Daher:

- Anzeige/Icon: **KEEP**,
- Population als eigenständige wirtschaftliche Resource-Wahrheit: **OUT**,
- Definition/Read-Model auf abgeleiteten Wert umstellen: **ADAPT**.

---

# 8. Bereits vorgedachter Zukunftsressourcen-Content

Im Repository existiert zusätzlich eine historische Ressourcenplanung (`data/ressourcens.md`) mit späteren Gütern wie beispielsweise:

- Bretter,
- Ziegel,
- weitere Epoche-2-Ressourcen.

Diese Inhalte sind **LATER**.

Sie werden in S2D-05A nicht in `data/resources.json` übernommen und erhalten noch keine V1-Balance-/Produktionsfreigabe.

---

# 9. Personen / Units – V1-Baseline

`data/units.json` enthält sowohl für den Kern relevante E1-Definitionen als auch Zukunfts-/Aliasdefinitionen.

Für V1 benötigt das eingefrorene Workforce-Modell fachlich folgende Personenrollen:

| vorhandene Definition | Name | V1-Funktion | S2D-05A |
|---|---|---|---|
| `u.villager` | Dorfbewohner | Bewohner; freie Person; einfache Transporthilfe möglich | ADAPT |
| `u.carrier` | Träger | Transportspezialist | KEEP/ADAPT |
| `u.builder` | Bauarbeiter | Bauspezialist | KEEP/ADAPT |
| `u.woodcutter` | Holzfäller | Holzfällerspezialist | KEEP/ADAPT |
| `u.stonecutter` | Steinmetz | Steinproduktion | KEEP/ADAPT |
| `u.fisherman` | Fischer | Fischproduktion | KEEP/ADAPT |
| `u.hunter` | Jäger | Jagd / Fleisch + Fell | KEEP/ADAPT |

ADAPT ist bei nahezu allen Personenrollen nötig, weil S2D-02 die dauerhafte Personenidentität von Spezialisierung, Capability und aktuellem Assignment trennt.

## 9.1 Dorfbewohner

Historische Definition:

- `u.villager`,
- Rolle `worker.pool`,
- verwendet aktuell Carrier-Grafik/Atlas als Platzhalter-/Wiederverwendung.

Klassifikation: **ADAPT**.

Fachlich verbindlich:

- bleibt Bewohner,
- besitzt Home-Bindung,
- kann einfache Transporthilfe übernehmen,
- wird dabei nicht in `u.carrier` umtypisiert,
- kehrt nach Aufgabenabschluss in Free/Home/Freizeit zurück.

## 9.2 Träger

`u.carrier` ist als echte Transport-Spezialisierung vorhanden.

Klassifikation: **KEEP/ADAPT**.

KEEP für Rolle und vorhandenen Asset-Unterbau, ADAPT für das neue Assignment-/Capability-Modell.

## 9.3 Bauarbeiter

`u.builder` besitzt eigenen Builder-Atlas.

Klassifikation: **KEEP/ADAPT**.

Builder bleibt echte Spezialisierung/Capability. Baufortschritt beginnt erst nach realer Ankunft.

## 9.4 Holzfäller

`u.woodcutter` mit Aliasen zu Lumberjack und eigenem Sprite-Atlas ist vorhanden.

Klassifikation: **KEEP/ADAPT**.

Die Aliaslage soll später normalisiert werden; im fachlichen Content soll eine stabile kanonische Identität existieren.

## 9.5 Steinmetz

`u.stonecutter` mit Aliasen ist vorhanden und besitzt eigenen Sprite-/Atlas-Unterbau.

Klassifikation: **KEEP/ADAPT**.

## 9.6 Fischer

`u.fisherman` ist als Aliasdefinition mit eigenem Sprite-/Atlas-Unterbau vorhanden.

Klassifikation: **KEEP/ADAPT**.

## 9.7 Jäger

`u.hunter` ist vorhanden; zusätzlich existiert ein eigener Hunter-Character-Assetbestand.

Klassifikation: **KEEP/ADAPT**.

Die Unit-Definition verwendet historisch noch teilweise Carrier-Unterbau, während eigene Hunter-Assets bereits vorhanden sind. Das wird später normalisiert, ohne die Jagdmechanik neu zu erfinden.

---

# 10. Weitere vorhandene Unit-/Berufsideen

`data/units.json` enthält zusätzlich Rollen außerhalb des V1-Kerns, darunter bereits sichtbare Definitionen für:

- Förster,
- Späher,
- Bäcker,
- Köhler,
- Bauer,
- Müller,
- Bergmann,
- Schmelzer,
- weitere spätere Produktions-/Verarbeitungsrollen im historischen Datenbestand.

Klassifikation: **LATER**.

Sonderfall Förster:

- fachlich interessant für nachhaltige Holzversorgung,
- aber nicht Teil des eingefrorenen kleinen Wirtschaftskerns,
- daher **LATER**, nicht automatisch NOW nur weil die Definition `epoche: 1` trägt.

Sonderfall Späher:

- gehört zu späterer Exploration/Fog-of-War,
- daher **LATER**.

Die vorhandene Epoche-Zahl ist keine höhere Autorität als der eingefrorene Produkt-Scope.

---

# 11. Character-Assets

Der Character-Assetbaum enthält bereits:

- Builder Sprite Atlas,
- Carrier Sprite + Carrier Atlas,
- Fisherman Sprite + Atlas,
- Hunter Sprite/Definition,
- Stonecutter Sprite + Atlas,
- Woodcutter Sprite Atlas,
- einen größeren `characters_sprite_highend.png`-/Atlasbestand,
- Test-/Musterdateien für Carrier.

## 11.1 V1-produktive Assetbasis

Klassifikation grundsätzlich **KEEP/ADAPT** für:

- Builder,
- Carrier,
- Fisherman,
- Hunter,
- Stonecutter,
- Woodcutter.

## 11.2 Platzhalter-/Aliasnutzung

Mehrere heutige Unit-Definitionen greifen noch auf `carrier.png` / `carrier_atlas` zurück.

Das ist als historischer Wiederverwendungs-/Platzhalterzustand **ADAPT**.

V1 verlangt keine sofort komplett neue Figurenkunst. Vorhandene Assets sollen weiterverwendet werden, aber fachlich eindeutige Rollen dürfen langfristig nicht nur durch zufällige Alias-/Fallback-Verdrahtung bestimmt werden.

## 11.3 Test-/Musterassets

Dateien wie Carrier-Test-/Musterdefinitionen sind **OUT** als produktive Runtime-Wahrheit, dürfen aber als Dev-Referenz erhalten bleiben bzw. später in die gemeinsame Halle-Demo-Dev-Tool-Struktur überführt werden.

---

# 12. Tiere – vorhandener Runtime- und Assetbestand

Der aktuelle Animal-Unterbau kennt vier Tierarten:

- `deer` – Hirsch/Reh,
- `fox` – Fuchs,
- `boar` – Wildschwein,
- `rabbit` – Hase/Kaninchen.

Für alle vier existieren Sprite-Assets; für boar, deer, fox und rabbit sind Sprite-Atlanten vorhanden.

Klassifikation:

| Tier | vorhanden | V1 |
|---|---|---|
| deer | Runtime + Atlas | KEEP |
| boar | Runtime + Atlas | KEEP |
| rabbit | Runtime + Atlas | KEEP |
| fox | Runtime + Atlas | KEEP |

S2D-05A friert damit **nicht** bereits Jagdbeute, Spawnraten, Tierwerte oder Balance je Tier ein.

Verbindlich ist lediglich:

- Tiere sind sichtbare reale Welt-Units,
- der Jäger arbeitet mit realen geeigneten Tieren,
- keine abstrakte unsichtbare Tierressource.

Welche Tierart welche Jagdprodukte liefert, wird in einem späteren S2D-05-Detailblock festgelegt.

---

# 13. Weltressourcen – vorhandener Kern

Der bestehende `MapResources`-Unterbau arbeitet bereits mit:

- Trees / Bäumen,
- Stones / Steinen,
- Fish / Fischzielen.

Diese drei Weltressourcen sind für den V1-Kern **KEEP/ADAPT**.

## 13.1 Bäume

Benötigt durch Holzfäller.

Klassifikation: **KEEP**.

Spätere Baumarten/Epochenvarianten dürfen als Asset-/Content-Erweiterung folgen, sind aber nicht erforderlich, um den Kern zu schließen.

## 13.2 Steinquellen

Benötigt durch Steinbruch/Steinmetz.

Klassifikation: **KEEP**.

## 13.3 Fischziele

Benötigt durch Fischer.

Klassifikation: **KEEP**.

Die technische Zielsuche/Reachability wird gemäß S2D-03 angepasst; die Content-Idee selbst bleibt bestehen.

---

# 14. Item-/Goods-Assets

Im Assetbestand existiert bereits ein Items-/Goods-Unterbau mit:

- `items.PNG`,
- `items_master_sprite.PNG`,
- `items_master_sprite.json`,
- `items.js`.

Klassifikation: **ADAPT**.

Der vorhandene Master-Spritebestand ist wertvoll für Wiederverwendung. Für V1 müssen daraus mindestens die fünf physischen Kernwaren eindeutig und stabil adressierbar sein:

- Holz,
- Stein,
- Fisch,
- Fleisch,
- Fell.

Gold/Population-Icons bleiben UI-Assets, sind aber keine physisch transportierten Goods-Sprites.

Asset-Erstellung/-Bearbeitung gehört perspektivisch in die gemeinsame Halle-Demo-Dev-Tool-Umgebung, nicht in den produktiven Game-Inspector.

---

# 15. Ressourcen-/UI-Icons

Für alle aktuell aktiven Resource-Einträge sind Iconpfade vorgesehen:

- wood,
- stone,
- fish,
- meat,
- pelt,
- gold,
- population.

Klassifikation: **KEEP** als vorhandene UI-Assetbasis.

Fachliche Anzeige folgt S2D-04:

- permanenter Smartphone-HUD: Holz, Stein, Gold, Bevölkerung,
- Fisch/Fleisch/Fell schnell über Wirtschaftsübersicht erreichbar,
- vollständige Warenzustände in Economy Overview/Context Panels.

---

# 16. Terrain-/Weltassets

Im Repository existieren bereits grundlegende Welt-/Terrainassets wie unter anderem:

- Grass,
- Dirt,
- weitere Map-/Texture-Verzeichnisse.

Klassifikation für den vorhandenen festen V1-Kartenunterbau: **KEEP/ADAPT**.

Eine neue prozedurale Weltgeneration wird für V1 nicht aus diesen Assets abgeleitet.

---

# 17. Maps und Kampagnenbestand

Im Datenbestand existieren:

- `data/map-test.json`,
- `data/maps/`,
- `data/campaign.json`.

Produktentscheidung:

- definierte/feste Karte zuerst → **KEEP/ADAPT** für vorhandene Mapdaten,
- Sandbox zuerst → **KEEP** als V1-Spielmodusziel,
- Kampagne → **LATER**.

Campaign-Datei existiert also, ist aber keine V1-Pflicht.

---

# 18. V1 Content Baseline – verbindlicher Minimalumfang

Der erste vollständige Wirtschaftskern benötigt mindestens folgenden Content:

## 18.1 Gebäude

1. Rathaus/HQ
2. Kleines Wohnhaus
3. Mittleres Wohnhaus
4. Holzfällerhütte
5. Steinbruch
6. Fischerhütte
7. Jägerhütte

## 18.2 Physische Waren

1. Holz
2. Stein
3. Fisch
4. Fleisch
5. Fell

## 18.3 Nicht-physische/abgeleitete Werte

1. Gold
2. Bevölkerung

## 18.4 Personenrollen

1. Bewohner
2. Träger
3. Bauarbeiter
4. Holzfäller
5. Steinmetz
6. Fischer
7. Jäger

## 18.5 Weltressourcen

1. Bäume
2. Steinquellen
3. Fischziele

## 18.6 Tiere

Vorhandene Tierbasis:

1. Reh/Hirsch
2. Wildschwein
3. Hase/Kaninchen
4. Fuchs

Die endgültige V1-Jagd-Relevanz je Tier wird später innerhalb S2D-05 konkretisiert.

## 18.7 Welt-/UI-Grundassets

- feste Map/Terrainbasis,
- Gebäude-Sprites/-Atlanten,
- Character-Sprites/-Atlanten,
- Goods/Item-Sprites,
- Resource-Icons,
- Animal-Sprites/-Atlanten,
- Baustellenvisualisierung.

---

# 19. V1 OUT – ausdrücklich nicht aus bestehendem Content vorziehen

Für den ersten vollständigen Wirtschaftskern nicht produktiv einführen:

- Depot/Lagerhaus als neues eigenständiges V1-System,
- Farm/Getreidekette,
- Mühle/Mehl,
- Bäckerei/Brot,
- Schmied,
- Bergbau/Erz/Kohle,
- Schmelzer/Metallketten,
- Köhler,
- Wachturm/Militär,
- Späher/Fog-of-War,
- komplexe Kampagne,
- baubare Straßen/Wege,
- Dekorationssystem als Kernfeature,
- komplexe Epoch-Progression.

Diese Punkte sind **LATER**, sofern sie nicht als rein historische Testdateien später als OUT bereinigt werden.

---

# 20. Definitionen vs. Assets

Eine wichtige Trennung für alle nächsten Content-Blöcke:

### Definition vorhanden, Asset nur Platzhalter

→ Content kann fachlich KEEP/ADAPT sein; Asset bleibt ADAPT.

### Asset vorhanden, keine produktive V1-Definition

→ Asset bleibt LATER und wird nicht automatisch aktiviert.

### Historische Test-/Musterdatei

→ OUT als produktive Wahrheit, eventuell KEEP als Dev-Referenz außerhalb Runtime.

### Aktive Definition + passendes Asset + V1-Scope

→ KEEP, mit technischen ADAPT-Punkten nur dort, wo S2D-02/03 Migration verlangt.

---

# 21. Keine Balance-Freigabe durch S2D-05A

Vorhandene Werte wie:

- Baukosten,
- Produktionszyklen,
- Unit-Geschwindigkeiten,
- WorkArea-Radien,
- Tier-Maximalzahlen,
- Lagerkapazitäten,
- Gold-/Steuer-Testraten

werden durch S2D-05A **nicht** als finale V1-Balance eingefroren.

Sie gelten als vorhandene Baseline/Testwerte und werden erst in einem dafür vorgesehenen Content-/Balance-Block bewertet.

---

# 22. Asset-Wiederverwendungsregel

> **Vorhandene geeignete Sprites, Atlanten, Icons und Goods-Grafiken werden bevorzugt weiterverwendet statt neu erstellt.**

Anpassungen sollen möglichst über die gemeinsame Halle-Demo-Dev-Tool-Umgebung erfolgen.

Der produktive Game-Inspector bleibt Runtime-/Simulation-/Diagnosewerkzeug und wird nicht wieder zum allgemeinen Sprite-/Atlas-/JSON-Editor.

---

# 23. S2D-05A-Invarianten

1. Vorhandener Repository-Content ist nicht automatisch V1-Scope.
2. Die sieben aktiven Gebäudedefinitionen bilden exakt den V1-Gebäudekern.
3. HQ bleibt Startgebäude/Hauptlager.
4. Ein separates Lagerhaus wird nicht in V1 vorgezogen.
5. Holz, Stein, Fisch, Fleisch und Fell bleiben physische Waren.
6. Gold bleibt Wirtschaftswert und keine normale Transportware.
7. Population wird aus realen Bewohnern abgeleitet.
8. Kleine/mittlere Häuser behalten die bestätigte Baseline 2/3 Bewohner.
9. Bewohner bleiben Personen und werden bei Hilfstransport nicht zu Carrier umtypisiert.
10. Carrier, Builder, Holzfäller, Steinmetz, Fischer und Jäger bleiben relevante Spezialisten.
11. Alias-/Fallback-Definitionen werden nicht als neue fachliche Rollen interpretiert.
12. Tiere bleiben reale Welt-Units.
13. Jäger nutzt reale Tiere.
14. Bäume, Steinquellen und Fischziele bleiben reale Arbeitsziele.
15. Vorhandene V1-Gebäudeassets werden wiederverwendet.
16. Vorhandene V1-Character-Assets werden bevorzugt wiederverwendet.
17. Test-/Musterassets sind keine Runtime-Wahrheit.
18. Epoche-2- und spätere Produktionsketten bleiben LATER.
19. Kampagne bleibt LATER; Sandbox/feste Karte zuerst.
20. Bestehende Balancewerte werden noch nicht final eingefroren.
21. Assetvorhandensein allein aktiviert kein Feature.
22. UI-/Content-Kategorien müssen zum eingefrorenen S2D-04-Modell passen.
23. Keine Contententscheidung in S2D-05A darf S2D-00 bis S2D-04 widersprechen.
24. S2D-05A verändert keinen Gameplay-/Runtime-/UI-Code.

# 24. Abschlussstatus S2D-05A

- Gebäudeinventur: **PASS**
- Resource-/Wareninventur: **PASS**
- Unit-/Workforce-Contentinventur: **PASS**
- Tierinventur: **PASS**
- Weltressourceninventur: **PASS**
- Asset-Baseline: **PASS**
- V1 vs. Future Content getrennt: **PASS**
- Widersprüche zu S2D-00/01/02/03/04: **0**
- Gameplay-/Runtime-/UI-Codeänderungen: **0**
- offene S2D-05A-Blocker: **0**

**S2D-05A – Existing Content Inventory & V1 Content Baseline: COMPLETE / 0 BLOCKER**

S2D-05 bleibt **V0.1 DRAFT** bis die weiteren Content-Regeln, fachlichen Definitionen und das gemeinsame Freeze-Gate abgeschlossen sind.
