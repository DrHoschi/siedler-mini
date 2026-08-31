# SA-DOC-01A – Vollständige Ist-Inventur des Repositorys

Status: COMPLETE – INVENTORY BASELINE
Datum: 2026-08-31
Repository: `DrHoschi/siedler-mini`
Prüfbranch: `feature/sa-05-resident-workforce`
Prüf-HEAD vor Dokumentationscommit: `a42b3234572c4482494824bbbb139919a7798864`
SA-04 Freeze-Basis: `789eab6cc6084eb001953b85ecbc6a4951ec5bce`
Main-Basis des SA-04-Zweigs: `c4b904fa0609ba4e93d0ae52e3e9401d3b594ecd`

## 1. Zweck und Abgrenzung

SA-DOC-01A ist eine reine Ist-Aufnahme des vorhandenen GitHub-Stands. Es werden keine Gameplay-, SaveGame-, Performance-, Pfad-, UI- oder Architektur-Reparaturen durchgeführt.

Die Klassifikation lautet:

- `ACTIVE-DIRECT` – wird aus `index.html` direkt geladen.
- `ACTIVE-BOOT` – wird dynamisch durch `core/boot-v1.js` geladen.
- `INACTIVE/COMMENTED` – im aktuellen `index.html` ausdrücklich auskommentiert.
- `TOOLING/DEV` – Entwicklungs-, Audit-, Inspector-, Editor- oder Hilfswerkzeug.
- `DATA/ASSET` – fachliche Daten oder Medienbestand.
- `LEGACY-CANDIDATE` – vorhanden, aber im aktuellen Hauptstartpfad nicht als verbindliches Kernmodul nachgewiesen. Dies ist KEINE Löschfreigabe.

## 2. Branch- und Referenzbasis

| Element | Stand | Bewertung |
|---|---|---|
| `main` | SA-04-Basis stammt von `c4b904f...` | bewusst unverändert |
| `feature/sa-04-savegame-v2` | Freeze-Commit `789eab6...` | `PASS / FROZEN` |
| `feature/sa-05-resident-workforce` | Prüf-HEAD `a42b323...` | aktiver Entwicklungs-/Diagnosebranch |
| Vergleich SA-04 → SA-05 | 7 Commits voraus, 0 zurück | sauber linear auf Freeze aufgebaut |
| SA-05-Abweichungen vor DOC-Commit | `core/boot-v1.js`, `core/sa05.resident-workforce.js`, `core/sa05.path-render-diagnostic.js` | begrenzter Scope |

## 3. Repository-Gesamtbestand

Der vorhandene Repository-Audit weist 525 Dateien aus. Der Bestand ist deutlich größer als die bisherigen README-/Masterlisten darstellen.

### 3.1 Top-Level-Bereiche

| Bereich | Rolle | Ist-Bewertung |
|---|---|---|
| `.github/` | Workflows, Bundles, CI, Preview, Datei-Audits | TOOLING/DEV |
| `assets/` | Gebäude, Figuren, Tiere, Items, Ressourcen, Terrain, Pfade, Roads, River, Icons, FX | DATA/ASSET |
| `core/` | Runtime-, Game-, Map-, Unit-, Job-, Production-, Save-, Diagnosemodule | gemischt ACTIVE + LEGACY-CANDIDATE |
| `data/` | Registry-/Gameplaydaten, Maps, Ressourcen, Units, Buildings, Balance | DATA/ASSET |
| `demo/` | Demo-/Versuchsbestand | TOOLING/DEV / separat prüfen |
| `docs/` | alte Spezifikationen, Browser-Scans, SA-04-Doku, Diagnoseausgaben | gemischt aktuell + veraltet |
| `inspector/` | Laufzeit-Inspector, Tabs, Bridges, Diagnosewerkzeuge | ACTIVE-DIRECT + TOOLING/DEV |
| `qa/` | Checklisten/Testplan | TOOLING/DEV, derzeit sehr dünn |
| `tools/` | Editor, Asset-Library, Profiler, Debug-Tools, DOT-Projektvisualisierungen | TOOLING/DEV |
| `ui/` | Start, HUD, Build, Building Menu, Layout, Minimap, Dialoge | ACTIVE-DIRECT + Legacy-Kandidaten |
| Root-Dateien | `index.html`, README, Masterliste, Dateilisten, Paket-/Strukturdokumente | gemischt aktuell/veraltet |

## 4. Reale Startarchitektur

Der aktuelle Startpfad ist zweistufig:

1. `index.html` lädt den älteren Kern direkt in fester Reihenfolge.
2. `core/boot-v1.js` ergänzt danach SA-04/SA-05-Schichten dynamisch und sperrt den Spielstart über User-/Assets-/Registry-/SaveV2-Gates.

Damit ist `index.html` weiterhin die physische Haupt-Ladeliste; `boot-v1.js` ist zugleich ein zweiter, neuerer Runtime-Layer.

## 5. ACTIVE-DIRECT – aus `index.html`

### 5.1 Boot, Registry, Units, Jobs

- `core/event.compat.js`
- `core/boot-v1.js`
- `core/asset.js`
- `core/registry.js`
- `core/unit.directions.js`
- `core/unit.movement.js`
- `core/unit.markers.js`
- `core/game.rules.js`
- `core/production.res-validate.js`
- `core/diag.boot.js`
- `core/warehouse.js`
- `core/adfinder.js`
- `core/adfinder.registry-rules.js`
- `core/game.units.js`
- `core/unit.anim.js`
- `core/unit.anim-resolver.js`
- `core/job.engine.js`
- `core/building.stock.js`
- `core/carrier.runtime.js`

### 5.2 Produktion/Logistik – direkt geladen

- `core/game.production.jobs.js`
- `core/logistics.prio.js`
- `core/territory.js`
- `core/market.js`
- `core/game.production.js`

Hinweis: `index.html` bezeichnet einen Teil davon selbst als „älteres Carrier-/Logistik-Zeug“. Diese Dateien sind trotzdem `ACTIVE-DIRECT`, weil sie real geladen werden. Sie sind damit aktive Legacy-Technik, nicht tote Dateien.

### 5.3 Input, Kamera, Map, Game

- `core/core.input.js`
- `core/game.place.js`
- `ui/ui-place-toast.js`
- `core/camera.js`
- `core/camera.cinematic.js`
- `core/game.buildings.js`
- `core/game.renderer.js`
- `core/map.decorations.js`
- `core/map.resources.js`
- `core/map.animals.js`
- `core/fx.smoke.js`
- `core/game.map.js`
- `core/game.construction.js`
- `core/game.bootstrap.js`
- `core/game.tick.js`
- `core/game.js`

### 5.4 Pfade/Overlays

- `core/path-overlay.js`
- `core/overlay-hooks.js`
- `core/path-traces.overlay.js`
- `core/unit-overlay.js`

Die alte Pfadarchitektur arbeitet mit einzelnen Stamps/Wear und ist aktuell ein bestätigter Performance-Verdachtsbereich. Das ist eine Ist-Feststellung, keine Reparaturentscheidung.

### 5.5 Fachproduktion

- `core/game.production.wood.js`
- `core/game.production.stone.js`
- `core/game.production.fish.js`
- `core/game.production.hunt.js`
- `core/game.workarea.js`

### 5.6 UI

- `ui/ui-start.js`
- `ui/ui-state.js`
- `ui/ui-build-hook.js`
- `ui/ui-events.js`
- `ui/ui-hud.js`
- `ui/ui-build.js`
- `ui/ui-building-menu.js`
- `ui/ui-dialog.js`
- `ui/ui-notify.js`
- `ui/ui-layout.js`
- `ui/ui-minimap.js`

### 5.7 Inspector

Der Inspector ist im Hauptstartpfad aktiv und umfasst den Host, Content, Adapter, Bridges sowie zahlreiche Tabs (Logs, Build, Resources, Paths, Tests, UI, Checker, Editor, Signals, Diagnose, Layer, Audit, Units, Sprite-Test usw.).

Bewertung: `ACTIVE-DIRECT / TOOLING-DEV`.

## 6. ACTIVE-BOOT – dynamisch aus `core/boot-v1.js`

Aktuell werden zusätzlich geladen:

### SA-04 Runtime-/Save-Schichten

- `core/sa04.runtime-guards.js`
- `core/sa04.production-bridge.js`
- `core/sa04.pause-builder-fixes.js`
- `core/sa04.worker-pause-hunter.js`
- `core/sa04.hunter-production-fix.js`
- `core/sa04.hunter-entry-fix.js`
- `core/sa04.resource-piles.js`
- `core/sa04.stock-persistence.js`
- `core/sa04.housing-residents.js`
- `core/sa04.housing-taxes.js`
- `core/sa04.housing-menu.js`
- `core/savegame-v2-uid-guard.js`
- `core/savegame-v2.js`

### SA-05 Test-/Entwicklungsschichten

- `core/sa05.resident-workforce.js`
- `core/sa05.path-render-diagnostic.js`

Damit überlagern bzw. ergänzen SA-04/SA-05 bewusst Teile der älteren Direktmodule. Diese Patch-/Guard-Schichtung ist heute realer Bestandteil der Architektur.

## 7. INACTIVE/COMMENTED im aktuellen `index.html`

Im Startdokument ausdrücklich auskommentiert und damit im normalen Startpfad nicht aktiv:

- `ui/css/ui-layout.css` – ersetzt durch `ui-layout-v0.css`
- `ui/css/ui-hud.css` – ersetzt durch `ui-hud-v5.css`
- `core/core.pfglue.js`
- `core/map-runtime.bridge.js`
- `core/game.build.js`
- `ui/ui-place.js`

Diese Dateien dürfen noch nicht gelöscht werden. Sie sind zunächst `INACTIVE/COMMENTED`.

## 8. Datenbestand

Der aktuelle `data/`-Root enthält mindestens:

- `balance.json`
- `buildings.json`
- `buildings.jsonc`
- `campaign.json`
- `map-test.json`
- `resources.json`
- `unit_markers.json`
- `units.json`
- Unterordner `atlases/`, `characters/`, `maps/`
- `ressourcens.md`

Wichtige Ist-Aussage: JSON und JSONC existieren teilweise parallel; ihre jeweilige Autorität ist in SA-DOC-01A noch nicht vereinheitlicht. Keine Bereinigung durchführen.

## 9. Assetbestand

Der Assetbestand ist groß und heterogen. Vorhanden sind u. a.:

- Tiere: Boar, Deer, Fox, Rabbit Atlases
- Gebäude: HQ, Lumberjack, Quarry, Fisher, Hunter, Houses sowie weitere historische Gebäudevarianten
- Figuren: Carrier, Builder, Fisherman, Hunter, Stonecutter, Woodcutter, Sammelatlanten
- Items: `items_master_sprite` und ältere Items-Sets
- Ressourcenatlanten: Fish, Stone, Wood
- Terrain/Decoration
- Pfadtexturen und Path-Atlas
- Road- und River-Sets
- Icons für Buildings, Resources, Food, Build-Categories und allgemeine UI
- Smoke-FX

Der vorhandene Dateiaudit weist 14 Dateien mit `.PNG`-Großschreibung sowie mehrere extensionlose Readme-/Hilfsdateien aus. Dies ist aktuell nur dokumentiert, nicht repariert.

## 10. Tools/Dev-Bestand

`tools/` enthält u. a.:

- mehrere DOT-Projektvisualisierungen / alte Monolith-Strukturen
- `ai-profiler.js`
- `asset-library.html`
- `debug-collector.js`
- `debug-tools.js`
- `editor.html`
- Unterordner `editor/`
- Unterordner `dot-editor/`

Bewertung: wertvoller Entwicklungsbestand, aber nicht Teil des normalen Spielstarts, sofern nicht separat geöffnet/aufgerufen.

## 11. QA-Bestand

`qa/` enthält:

- `Checklisten.md`
- `Testplan.md`
- einen praktisch leeren `Readme`

Der formale QA-Bestand ist im Verhältnis zum tatsächlichen Runtime-Umfang derzeit deutlich zu klein und nicht als aktuelle Abnahmequelle belastbar.

## 12. Dokumentationsbestand

Vorhanden sind u. a.:

- `README.md` – Stand 2025-09-30 / v1.0.1; für den heutigen Runtime-Stand veraltet
- `Projekt_Masterliste.md` – frühe Minimalstruktur; nicht mehr vollständige Ist-Referenz
- `STRUKTUR_SPICKZETTEL.md/.mmd`
- `docs/CHEATSHEET.md`
- `docs/CODE_STYLE.md`
- `docs/EVENTS_browser_scan.md`
- `docs/INSPECTOR_GUIDE.md`
- alte Lastenheft-Platzhalter/-Dateien
- mehrere `OUT_*` Diagnose-/Graph-Ausgaben
- `docs/SA-04_SAVEGAME_V2.md` – aktuelle, relevante Meilenstein-Dokumentation
- weitere TODO-/Diagnosedokumente

Bewertung: Dokumentation existiert reichlich, ist aber zeitlich und fachlich gemischt. Es fehlt bislang eine aktuelle zentrale Systemreferenz.

## 13. Architektur-/Legacy-Matrix

| System | Aktiver Kern | Ergänzung/Guard | Ist-Risiko |
|---|---|---|---|
| Boot | `index.html` + `boot-v1.js` | SA-04/05 dynamische Module | zwei Ladeebenen, alte Cache-Versionen im Index |
| Save/Continue | alter Game-Unterbau | SaveGame V2 + UID/Runtime Guards | Patch-Schichtung statt einheitlichem Kern |
| Units | `game.units.js`, Unit Helpers | SA-04 Worker Guards, SA-05 Residents | mehrere Rollen-/Workerpfade |
| Jobs/Carrier | `job.engine.js`, `carrier.runtime.js` | Production Bridge/Stock-Persistence | ältere Logistikmodule zusätzlich aktiv |
| Construction | `game.construction.js` | Runtime + Builder Guards | Guard-basierte Reparaturschicht |
| Production | `game.production.js` + Fachmodule | Production Bridge + Hunter Fix | doppelte/alte Produktionswege vorhanden |
| BuildingStock | `building.stock.js` | SA-04 Stock Persistence | Runtime und Persistenz getrennt |
| Housing | Buildings/Units | SA-04 Residents/Taxes/Menu | neue Funktion als Zusatzschicht |
| Paths | `path-overlay.js` + Overlay Hooks | SA-05 Performance/Diagnostic | stempelbasierte Renderarchitektur performancekritisch |
| UI | zahlreiche `ui/*` Direktmodule | Housing Menu/HUD Fixes | Versionen/Generationen gemischt |
| Inspector | umfangreicher aktiver Dev-Layer | Tabs/Bridges | groß, aber nützlich; nicht Produktlogik |

## 14. LEGACY-CANDIDATE – Definition für Folgeaudit

Als Legacy-Kandidat gelten ab jetzt Dateien, die eine der folgenden Bedingungen erfüllen:

1. im Repository vorhanden, aber weder aus `index.html` noch `boot-v1.js` geladen;
2. ausdrücklich durch neuere Variante ersetzt oder auskommentiert;
3. alte Monolith-/Demo-/Diagnosegeneration;
4. alternative JSON/JSONC-/Atlas-Generation ohne nachgewiesene Runtime-Nutzung;
5. alte Dokumentation, die den heutigen Stand nicht beschreibt.

WICHTIG: SA-DOC-01A gibt für KEINEN Legacy-Kandidaten eine Löschfreigabe. Eine Lösch-/Archiventscheidung darf erst nach Referenzsuche erfolgen.

## 15. Bekannte Ist-Probleme aus der laufenden Prüfung

Ohne Reparaturentscheidung werden folgende Punkte als Bestand festgehalten:

- sporadisches Ruckeln bleibt auch bei testweise deaktiviertem Pfad-Rendering teilweise bestehen;
- Pfad-Stamps sind dennoch nachweislich ein erheblicher Renderkosten-Kandidat;
- alte und neue Produktions-/Logistikpfade laufen teilweise parallel;
- SaveGame/Continue funktioniert über zusätzliche SA-04-Schichten statt über einen bereinigten Kern;
- Bewohner/Steuern/Housing sind ebenfalls additive Module;
- `index.html` enthält viele alte Versions-/Cache-Querystrings;
- Dokumentationsstände sind nicht synchron;
- QA-Unterbau ist unzureichend für den heutigen Umfang;
- Assetbestand enthält Varianten, Testdateien, alte Atlanten und uneinheitliche Dateinamen.

## 16. Ergebnis SA-DOC-01A

`SA-DOC-01A = COMPLETE`.

Verbindliche Ist-Aussage:

Das heutige `siedler-mini` ist kein kleiner Vier-Modul-Prototyp mehr, sondern ein historisch gewachsener 2D-Spielstand mit großem Asset-/Tooling-Bestand, einem älteren direkt geladenen Kern und einer neueren SA-04/SA-05-Patch-/Guard-Schicht. Der aktuelle Funktionsstand ist brauchbar und in mehreren Bereichen praktisch getestet, die technische Struktur ist jedoch nicht konsolidiert.

## 17. Nächster Schritt – noch keine Reparatur

Empfohlen: `SA-DOC-01B – Runtime-Abhängigkeits- und Legacy-Matrix`.

Dort wird pro JavaScript-Modul geprüft:

- wer lädt es;
- welche globalen APIs stellt es bereit;
- welche Events hört/emittiert es;
- wer konsumiert diese APIs/Events;
- aktiv / ersetzt / redundant / orphan / dev-only;
- darf später konsolidiert werden oder muss erhalten bleiben.

Erst nach SA-DOC-01B sollte eine konkrete technische Konsolidierungs-/Performance-Reihenfolge festgelegt werden.
