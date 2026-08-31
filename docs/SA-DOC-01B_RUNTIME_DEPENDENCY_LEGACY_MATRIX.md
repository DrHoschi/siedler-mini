# SA-DOC-01B – Runtime-Abhängigkeits- und Legacy-Matrix

Status: **COMPLETE – RUNTIME BASELINE**  
Datum: 2026-08-31  
Repository: `DrHoschi/siedler-mini`  
Prüfbranch: `feature/sa-05-resident-workforce`  
Ausgangskopf vor diesem Dokument: `a42b3234572c4482494824bbbb139919a7798864`  
Freeze-Basis: `feature/sa-04-savegame-v2` / `789eab6cc6084eb001953b85ecbc6a4951ec5bce`

## 1. Scope

SA-DOC-01B untersucht ausschließlich den **Spiel-Runtime-Pfad**.

Im Scope:

- `index.html`
- Boot/Lifecycle
- Assets/Registry
- Input/Kamera
- Map/World/Renderer
- Units/Movement/Animation
- Job-/Carrier-Runtime
- Construction
- Production/BuildingStock
- WorkArea
- Paths/Overlays
- SaveGame V2
- SA-04-Kompatibilitäts- und Reparaturschichten
- SA-05 Resident-Workforce und aktuelle Pfad-Diagnose
- spielbezogene UI-Module

Explizit **nicht** im Scope:

- Inspector selbst
- Inspector-Tabs
- Inspector-Bridges
- Inspector-Tools
- Editor-/DOT-/Asset-Entwicklertools

Der Inspector wird später als eigener Audit-/Reparaturblock behandelt.

## 2. Klassifikation

| Status | Bedeutung |
|---|---|
| `ACTIVE-DIRECT` | direkt aus `index.html` geladen und Teil des aktuellen Spielstarts |
| `ACTIVE-BOOT` | dynamisch durch `core/boot-v1.js` nachgeladen |
| `ACTIVE-DIAGNOSTIC` | absichtlich temporäre Diagnose-/Messschicht |
| `INACTIVE-COMMENTED` | im `index.html` vorhanden, aber auskommentiert |
| `NOT-LOADED` | Datei vorhanden, im aktuellen Spielstart nicht geladen |
| `LEGACY-ACTIVE` | wird noch aktiv geladen, enthält aber nachweislich ältere/überholte Verantwortlichkeit |
| `LEGACY-CANDIDATE` | nicht geladen bzw. durch neueren Pfad ersetzt; noch nicht löschen |
| `AUTHORITATIVE` | aktuell fachlich maßgeblicher Zustand/Store/API |
| `PATCH-LAYER` | korrigiert oder überschreibt Verhalten eines älteren aktiven Moduls |

## 3. Tatsächlicher Startpfad

Der reale Start besteht aus zwei Ebenen.

### Ebene A – statische Direktladung aus `index.html`

`index.html` lädt den historischen Kern in fester Reihenfolge. Dazu gehören unter anderem:

1. Event-Kompatibilität
2. `boot-v1.js`
3. Asset/Registry
4. Unit-Helfer
5. Regeln/Validation
6. Warehouse/Pathfinding
7. `game.units.js`
8. `job.engine.js`
9. `building.stock.js`
10. `carrier.runtime.js`
11. ältere Produktions-/Logistikmodule
12. Input/Placement/Kamera
13. Buildings/Renderer/MapResources/Animals/Map
14. Construction/Bootstrap/Tick/Game
15. Path-/Overlay-System
16. Produktionsmodule Wood/Stone/Fish/Hunt
17. WorkArea
18. spielbezogene UI

### Ebene B – dynamische Ergänzung aus `boot-v1.js`

`boot-v1.js` lädt zusätzlich:

- `sa04.runtime-guards.js`
- `sa04.production-bridge.js`
- `sa04.pause-builder-fixes.js`
- `sa04.worker-pause-hunter.js`
- `sa04.hunter-production-fix.js`
- `sa04.hunter-entry-fix.js`
- `sa04.resource-piles.js`
- `sa04.stock-persistence.js`
- `sa04.housing-residents.js`
- `sa04.housing-taxes.js`
- `sa04.housing-menu.js`
- `sa05.resident-workforce.js`
- `sa05.path-render-diagnostic.js`
- `savegame-v2-uid-guard.js`
- `savegame-v2.js`

**Architekturfolge:** Der aktuelle funktionierende Stand ist kein sauberer Ersatz des alten Kerns, sondern ein alter aktiver Kern plus mehrere spätere Korrektur-/Kompatibilitätsschichten.

## 4. Verbindliche Runtime-Matrix – Kern

| Modul | Load | Verantwortung / globale API | wesentliche Events / Nutzer | Bewertung |
|---|---|---|---|---|
| `core/event.compat.js` | ACTIVE-DIRECT | Event-Kompatibilität für ältere Namensformen | mappt Legacy-Ereignisse | Übergangsschicht; später prüfen |
| `core/boot-v1.js` | ACTIVE-DIRECT | `BootState`; Start-Gate für Assets/Registry/SaveV2/User-Start | hört `req:game:start`, `req:game:continue`, `cb:assets-ready`, `cb:registry:ready`, `cb:savegame:v2:ready`; emittiert `cb:game:start` | **AUTHORITATIVE Lifecycle-Gate**, enthält aber dynamische Patch-Ladung |
| `core/asset.js` | ACTIVE-DIRECT | `Assets` / Atlas-/Sprite-Laden | `cb:assets-ready` | Kern |
| `core/registry.js` | ACTIVE-DIRECT | zentrale Registry / `RegistryValues`-Umfeld | `cb:registry:ready` | Kern |
| `core/unit.directions.js` | ACTIVE-DIRECT | Richtungshelper | von Animation/Movement genutzt | Support |
| `core/unit.movement.js` | ACTIVE-DIRECT | Bewegungs-/Richtungshelper | von Units und SA-05 Freizeitbewegung benutzt | Support |
| `core/unit.markers.js` | ACTIVE-DIRECT | Marker/Carry-/Tool-Visualisierung | nutzt Unit-Zustände | Support |
| `core/game.rules.js` | ACTIVE-DIRECT | Walkability/Blocker/Placement/AutoHQ-Regeln | von Pathfinding/Placement/Game genutzt | Kernregelwerk |
| `core/production.res-validate.js` | ACTIVE-DIRECT | Ressourcenvalidierung/Kompatibilität | Ressourcensystem | prüfen bei Konsolidierung |
| `core/diag.boot.js` | ACTIVE-DIRECT | Boot-Diagnose | Debug/Logging | Development Runtime; später separat entscheiden |
| `core/warehouse.js` | ACTIVE-DIRECT | Warehouse-/Logistik-Grundlage | von Produktions-/Logistikpfaden referenzierbar | aktive Alt-/Supportschicht |
| `core/adfinder.js` | ACTIVE-DIRECT | A*-Pathfinding | von `GameUnits` Navigation verwendet | Kern |
| `core/adfinder.registry-rules.js` | ACTIVE-DIRECT | Pathfinding-Regeln aus Registry/GameRules | AdFinder | Support |
| `core/game.units.js` | ACTIVE-DIRECT | `GameUnits`: Unit-Liste, HQ-Position, Spawn, Jobannahme, Bewegung, Task-Abarbeitung | emittiert u.a. `cb:hq:pos`, `cb:units:changed`, `cb:units:snapshot`, `cb:build:deliver`, `cb:job:done`; hört Unit-Requests | **AUTHORITATIVE Unit-Runtime**, historisch carrier-zentriert |
| `core/unit.anim.js` | ACTIVE-DIRECT | Unit-Animationsauswahl | Renderer/Map | Support |
| `core/unit.anim-resolver.js` | ACTIVE-DIRECT | Auflösung Animationszustand → Spriteframe | Renderer/Map | Support |
| `core/job.engine.js` | ACTIVE-DIRECT | `JobEngine`: zentrale Queue `add/pop/hasJobs/getQueue` | hört `cb:build:complete`; erzeugt alte `type:'build'` Jobs | **LEGACY-ACTIVE Teilverantwortung**; Queue selbst weiter zentral |
| `core/building.stock.js` | ACTIVE-DIRECT | `BuildingStock`: physischer Outputpuffer je Gebäude; erzeugt Carry-Jobs | hört `cb:job:done`; emittiert `cb:stock:change`; nutzt `Production.enqueueCarryJobFromBuilding` | aktueller physischer Warenpfad, aber ältere Stockable-Liste ohne Hunter |
| `core/carrier.runtime.js` | ACTIVE-DIRECT | `CarrierRuntime`: nimmt Jobs aus Queue und weist sie freien Units zu | hört `cb:game:start`; tick via GameTick; optional `cb:unit:step` | Kern-Zuweisung; Carry-Limit 4 |
| `core/game.production.jobs.js` | ACTIVE-DIRECT | älterer Produktions-/Job-Bridge-Pfad | reagiert auf Produktionsoutput | **LEGACY-ACTIVE / Doppelpfad-Risiko** |
| `core/logistics.prio.js` | ACTIVE-DIRECT | ältere Logistikpriorität | Job-/Logistikpfad | Legacy-Kandidat, aber aktiv geladen |
| `core/territory.js` | ACTIVE-DIRECT | Territory-Grundlage | Spielsystem | derzeit Nebenrolle |
| `core/market.js` | ACTIVE-DIRECT | Market-Grundlage | Spielsystem | derzeit Nebenrolle |
| `core/game.production.js` | ACTIVE-DIRECT | `Production`: globaler Ressourcenstore, Modulregistrierung, Carry-Job-Erzeugung, Production-Tick | hört `cb:build:complete`, `cb:workarea:set`, `cb:prod:output`, `cb:job:done`; emittiert `cb:res:change` | **LEGACY-ACTIVE + weiterhin benötigte API**; Outputpfad wird durch SA-04 umgebogen |
| `core/core.input.js` | ACTIVE-DIRECT | Input-Hooks | Kamera/Placement/Game | Kern-Support |
| `core/game.place.js` | ACTIVE-DIRECT | Gebäudeplatzierung | Build-/Construction-/GameEvents | Kern |
| `ui/ui-place-toast.js` | ACTIVE-DIRECT | Placement-Feedback | UI | UI-Support |
| `core/camera.js` | ACTIVE-DIRECT | einzige aktive Hauptkamera | Input/Renderer | Kern |
| `core/camera.cinematic.js` | ACTIVE-DIRECT | Overview/FlyToHQ | hört HQ-/Input-/Startzustände | Zusatzfunktion |
| `core/game.buildings.js` | ACTIVE-DIRECT | `Buildings`-Liste/Sprites/Growth | Game/Construction/Renderer | zentrale Gebäude-Runtime; nach Continue durch SA-04 mit `Game.buildings` synchronisiert |
| `core/game.renderer.js` | ACTIVE-DIRECT | Rendering-Grundlage | GameMap/Buildings/Overlays | Kern |
| `core/map.decorations.js` | ACTIVE-DIRECT | Deko/Vegetation | MapRenderer | Kern Map |
| `core/map.resources.js` | ACTIVE-DIRECT | `MapResources` / abbaufähige Rohstoffknoten | Production/SaveGame | **AUTHORITATIVE MapResource-State** |
| `core/map.animals.js` | ACTIVE-DIRECT | `MapAnimals` / Tiere | tick via GameTick; Hunter | Kern Jagdbasis |
| `core/fx.smoke.js` | ACTIVE-DIRECT | Smoke FX | Renderer | optionales FX-System |
| `core/game.map.js` | ACTIVE-DIRECT | Map laden/rendern, World Layer | emittiert Map-ready; nutzt Renderer/Assets/Units/Overlays | Kern |
| `core/game.construction.js` | ACTIVE-DIRECT | `GameConstruction`: Baustellenstate, Lieferungen, Bauphasen, Builder-Logik, Completion | hört `cb:build:deliver`; emittiert `cb:build:construct:start`, `cb:build:complete`; tick via GameTick | **LEGACY-ACTIVE Kern**, Verhalten durch SA-04 korrigiert |
| `core/game.bootstrap.js` | ACTIVE-DIRECT | Initialer Game-/Ressourcen-Setup | Start | Legacy-New-Game-Unterbau; Continue wird von SaveV2 übersteuert |
| `core/game.tick.js` | ACTIVE-DIRECT | `GameTick`, 200-ms-Hauptsimulationstakt | hört `cb:game:start`; tickt CarrierRuntime, GameUnits, Buildings, MapAnimals, Construction, Production | **AUTHORITATIVE Simulationstakt**, daneben existieren weitere Intervalle |
| `core/game.js` | ACTIVE-DIRECT | `Game` Hauptzustand und RAF-/World-Steuerung | Start/Map/Game | Kern, historisch gewachsen |
| `core/path-overlay.js` | ACTIVE-DIRECT | `PathOverlayInstance` / `PathOverlay`; Wear + Einzelstempel + World-Draw | hört `cb:unit:move`, `cb:unit:step`, `cb:map:ready`; wird pro Renderframe gezeichnet | **PERFORMANCE-HOTSPOT / Architekturumbau nötig** |
| `core/overlay-hooks.js` | ACTIVE-DIRECT | Overlay-Hook-System | Renderer/Overlay | Support |
| `core/path-traces.overlay.js` | ACTIVE-DIRECT | zusätzlicher Pfad-/Trace-Overlaypfad | Overlay | auf Redundanz mit PathOverlay prüfen |
| `core/unit-overlay.js` | ACTIVE-DIRECT | Unit-Zeichnung im Overlay | `GameUnits` + Animation | aktiv |
| `core/game.production.wood.js` | ACTIVE-DIRECT | Holzproduktion | emittiert `cb:prod:output`; registriert sich an `Production` | aktiv, Output wird SA-04-seitig geroutet |
| `core/game.production.stone.js` | ACTIVE-DIRECT | Steinproduktion | wie oben | aktiv |
| `core/game.production.fish.js` | ACTIVE-DIRECT | Fischproduktion | wie oben | aktiv |
| `core/game.production.hunt.js` | ACTIVE-DIRECT | alter Jagdpfad | `cb:prod:output` vorgesehen | **LEGACY-ACTIVE, funktional durch SA-04 Hunter-Fix ersetzt/überlagert** |
| `core/game.workarea.js` | ACTIVE-DIRECT | Arbeitsbereiche | `cb:workarea:set` und Abfragen durch Produktion/Hunter | Kern-Support |

## 5. Spiel-UI im Runtime-Pfad

| Modul | Load | Rolle | Bewertung |
|---|---|---|---|
| `ui/ui-start.js` | ACTIVE-DIRECT | Neues Spiel / Continue / Reset / Startpanel | wichtig; Start nur Request-Ebene, SaveV2-Entscheid in Boot |
| `ui/ui-state.js` | ACTIVE-DIRECT | UI-Zustand | Support |
| `ui/ui-build-hook.js` | ACTIVE-DIRECT | Build-UI ↔ Game Placement | aktiv |
| `ui/ui-events.js` | ACTIVE-DIRECT | UI-Eventbrücke | aktiv |
| `ui/ui-hud.js` | ACTIVE-DIRECT | Ressourcen-HUD | liest aktuellen `RegistryValues`-Store; SA-04-Fix bestätigt |
| `ui/ui-build.js` | ACTIVE-DIRECT | BuildDock/Gebäudeauswahl | aktiv |
| `ui/ui-building-menu.js` | ACTIVE-DIRECT | Gebäude-Menü | aktiv; SA-04 Housing-Menü erweitert Verhalten |
| `ui/ui-dialog.js` | ACTIVE-DIRECT | Dialoge | aktiv |
| `ui/ui-notify.js` | ACTIVE-DIRECT | Meldungen | aktiv |
| `ui/ui-layout.js` | ACTIVE-DIRECT | Layout | aktiv |
| `ui/ui-minimap.js` | ACTIVE-DIRECT | Minimap | aktiv |

Inspector-UI ist **nicht Teil dieser Matrix**.

## 6. SA-04 Runtime-/Patch-Layer

| Modul | Load | Eingriff | Abhängigkeit / Risiko | Bewertung |
|---|---|---|---|---|
| `sa04.runtime-guards.js` | ACTIVE-BOOT / PATCH-LAYER | synchronisiert `Buildings.list` ↔ `Game.buildings`; hängt Pfade additiv an Save; Builder-Wait; Delivery-Clamp; wrappt `JobEngine.pop()` | 100-ms Builder-Poll; 50-ms einmaliger Wrapper-Poll; direkter Zugriff auf interne PathOverlay-Felder und localStorage | fachlich nötig, strukturell Übergangslösung |
| `sa04.production-bridge.js` | ACTIVE-BOOT / PATCH-LAYER | Capture-Listener stoppt stockfähigen `cb:prod:output` vor Legacy-Handlern und routet nach `BuildingStock`; verwirft alte `type:'build'` Jobs; rehydriert Produzenten | wrappt ebenfalls `JobEngine.pop()`; abhängig von Event-Reihenfolge | **klarer Konsolidierungskandidat** |
| `sa04.pause-builder-fixes.js` | ACTIVE-BOOT / PATCH-LAYER | Pause-Persistenz + Builder-Recovery/Entrance-Fix | korrigiert Construction/Worker-Zustand nachträglich | nötig bis Construction-Neuordnung |
| `sa04.worker-pause-hunter.js` | ACTIVE-BOOT / PATCH-LAYER | Produktionsworker-Pause + Hunter-Worker-Rehydrate | ergänzt `GameUnits`-Workerverhalten | Übergangslösung |
| `sa04.hunter-production-fix.js` | ACTIVE-BOOT / PATCH-LAYER | funktionierender Hunter-Produktionspfad auf `MapAnimals._state.animals` | ersetzt faktisch altes `game.production.hunt.js` | alter Hunt-Pfad später entfernen/ersetzen |
| `sa04.hunter-entry-fix.js` | ACTIVE-BOOT / PATCH-LAYER | Hunter Entry/Hide bei Pause | UI/Worker-State | klein, später integrieren |
| `sa04.resource-piles.js` | ACTIVE-BOOT / PATCH-LAYER | Ressourcenstapel an Baustellen/Produktionslagern; wrappt Renderer/Construction-Darstellung | weiterer Render-Wrapper | Performance/Ownership später prüfen |
| `sa04.stock-persistence.js` | ACTIVE-BOOT / PATCH-LAYER | speichert/restauriert BuildingStock additiv | SaveV2 + BuildingStock interne Maps | später in SaveGame V3 integrieren |
| `sa04.housing-residents.js` | ACTIVE-BOOT | erzeugt `u.villager` aus Housing-Spawn-Daten und bindet ans Wohnhaus | `GameUnits`, `Registry`, Buildings | fachlich neuer aktiver Kern, derzeit SA-04-Dateiname |
| `sa04.housing-taxes.js` | ACTIVE-BOOT | Goldsteuer-Timer, Persistenz | HousingResidents + Production.addResource + SaveV2 | Testbalance; Timerarchitektur später zentralisieren |
| `sa04.housing-menu.js` | ACTIVE-BOOT | Housing-spezifische Menüanzeige | ui-building-menu/Housing/Taxes | UI-Erweiterung |
| `savegame-v2-uid-guard.js` | ACTIVE-BOOT / PATCH-LAYER | schützt neue Building-UIDs nach Restore | `Game.buildings` Proxy/List-Sync | bekannte Architekturgrenze |
| `savegame-v2.js` | ACTIVE-BOOT | `SaveGameV2`; Core-Snapshot/Continue/Autosave | `Game`, `RegistryValues`, Buildings, MapResources, GameUnits; Events `cb:savegame:v2:*` | **AUTHORITATIVE Save/Continue** |

## 7. SA-05 Runtime

| Modul | Load | Funktion | Bewertung |
|---|---|---|---|
| `sa05.resident-workforce.js` | ACTIVE-BOOT | Bewohner helfen bei Deliver/Carry, kehren nach Hause zurück, Freizeitverhalten; wrappt `GameUnits.needsJob/assignJob` | funktional PASS; 200-ms eigener Poll; langfristig in Unit-/Workforce-System integrieren |
| `sa05.path-render-diagnostic.js` | ACTIVE-DIAGNOSTIC | schaltet nur PathOverlay-Zeichnung aus; Wear/Stamps bleiben aktiv | **nur Diagnose**, nicht Produktarchitektur |

Aktueller Testbefund: komplettes Abschalten des Path-Renderings verbessert das Ruckeln nur teilweise. Path-Rendering ist damit ein Performance-Faktor, aber **nicht als alleinige Ursache bewiesen**.

## 8. Nachweisbare Parallel-/Legacy-Verantwortungen

### 8.1 JobEngine

Problem:

- `job.engine.js` hört noch `cb:build:complete` und erzeugt drei `type:'build'`-Jobs für Nicht-HQ-Gebäude.
- Diese Jobs entsprechen nicht mehr dem aktuellen realen Construction-Workflow.
- `sa04.production-bridge.js` wrappt `JobEngine.pop()` und verwirft diese Jobs später wieder.
- `sa04.runtime-guards.js` wrappt dieselbe `pop()`-API zusätzlich, um überzählige `deliver`-Jobs zu verwerfen.

**Befund:** zentrale Queue sinnvoll; automatische Legacy-Baujoberzeugung nicht mehr sinnvoll. Zwei Wrapper auf derselben API sind technische Schuld.

### 8.2 Produktion

Problem:

- `game.production.js` behandelt `cb:prod:output` ursprünglich als sofortige globale Ressourcengutschrift plus Carry-Job.
- `BuildingStock` verfolgt hingegen den physischen Warenfluss: Output bleibt am Gebäude, Carrier holt ab, Ressource wird erst bei HQ-Lieferung gezählt.
- `sa04.production-bridge.js` muss deshalb den Output per Capture-Listener stoppen, bevor der alte Production-Handler ihn doppelt verbucht.
- `game.production.jobs.js` ist parallel weiterhin geladen.

**Befund:** Production besitzt aktuell noch mehrere historisch überlagerte Verantwortungen. Der funktionierende Pfad ist SA-04 Bridge → BuildingStock → Production Carry API → JobEngine → Carrier → HQ Accounting.

### 8.3 Construction

Problem:

- `game.construction.js` enthält einen eigenständigen älteren Zustandsautomaten, der nach Materialvollständigkeit den Baubeginn selbst anstößt.
- SA-04 setzt dieses Signal wieder auf „warte auf reale Builder“ zurück.
- Anschließend prüft ein 100-ms-Interval, ob ein echter `u.builder` im Status `working` angekommen ist.

**Befund:** der gewünschte Zustand ist funktional erreicht, aber auf zwei Modulen verteilt. Bauzustand und Builder-Workflow müssen später in einen Besitzer zusammengeführt werden.

### 8.4 Buildings

Problem:

- `Game.buildings` und `Buildings.list` existieren parallel.
- Nach Continue musste SA-04 beide explizit auf dieselbe Array-Referenz synchronisieren.

**Befund:** doppeltes State-Ownership. Langfristig darf es nur eine autoritative Gebäudeliste geben.

### 8.5 Pfade

Problem:

- `PathOverlayInstance` hält Wear und viele visuelle Einzelstempel.
- Stamps werden im World-Layer wiederholt gezeichnet.
- SA-04 greift direkt auf `_wear` und `_stamps` zu, um Pfade separat an denselben localStorage-Snapshot anzuhängen.
- `path-traces.overlay.js` existiert zusätzlich als weiterer aktiver Pfad-/Trace-Layer.
- SA-05 musste Rendering bereits diagnostisch abschalten.

**Befund:** Pfade sind sowohl State-, Save- als auch Rendering-technisch nicht sauber gekapselt. Redesign als gecachter/chunkbasierter Pfad-Layer ist plausibel, wird aber erst in einem Reparaturblock entschieden.

### 8.6 Simulationstakte / Polling

Aktiv nachgewiesen:

- `GameTick`: 200 ms
- SA-04 Builder-Wait: 100 ms
- SA-05 ResidentWorkforce: 200 ms
- mehrere einmalige Wrapper-/Install-Polls mit 50/100 ms bis Ziel-API vorhanden
- SaveGame Autosave: 30 s plus `visibilitychange`/`pagehide`
- Renderer/Map läuft zusätzlich framebasiert

**Befund:** nicht jeder Poll ist automatisch problematisch, aber die Runtime hat keinen zentralen Scheduler. Für Performanceanalyse müssen framebasierte Arbeit und Intervall-Arbeit getrennt gemessen werden.

## 9. Vorhandene, im aktuellen Spielstart nicht geladene Dateien

Diese Dateien sind **nicht automatisch löschbar**. Sie sind zunächst `LEGACY-CANDIDATE` oder Tool-/Altbestand.

| Datei | aktueller Nachweis |
|---|---|
| `core/savegame.js` | vorhanden, nicht aus `index.html`/Boot geladen; durch SaveGame V2 fachlich ersetzt |
| `core/worker.production.js` | vorhanden, nicht geladen; aktuelle Produktionsworker laufen über andere Pfade/SA-04 |
| `core/core.map.old.js` | vorhanden, nicht geladen; klarer Altbestand-Kandidat |
| `core/game.build.js` | vorhanden; Einbindung in `index.html` auskommentiert |
| `core/core.pfglue.js` | Einbindung auskommentiert |
| `core/map-runtime.bridge.js` | Einbindung auskommentiert |
| `core/registry.type-aliases.js` | vorhanden, im aktuellen Hauptstart nicht direkt geladen |
| `core/render.shim.js` | vorhanden, im aktuellen Hauptstart nicht direkt geladen |
| `core/entities.registry.js` | vorhanden, im aktuellen Hauptstart nicht direkt geladen |
| `core/core.entities.js` | vorhanden, im aktuellen Hauptstart nicht direkt geladen |
| `core/eventbus.js` | vorhanden, aktuelle Runtime nutzt überwiegend DOM CustomEvents |
| `core/input.bridge.js` | vorhanden, Hauptpfad nutzt `core.input.js` |
| `core/layout.js` | vorhanden; UI nutzt `ui/ui-layout.js` |
| `core/placement.js` | vorhanden; Hauptpfad nutzt `game.place.js` |
| `core/ui-build.data-bridge.js` | vorhanden, nicht als Hauptpfad nachgewiesen |
| `core/icons-map.js` | vorhanden, kein zentraler Hauptstart-Nachweis |
| `core/overlay.fps.js` | vorhanden, nicht im Hauptstart geladen |

Vor einer Löschung ist ein eigener Referenz-/Search-Check nötig.

## 10. Daten-/State-Ownership – aktueller Ist-Zustand

| Fachbereich | aktueller autoritativer Zustand | Parallel-/Legacy-Zustand |
|---|---|---|
| Ressourcen | `window.RegistryValues` über `Production.addResource` | Bootstrap/alte Produktionspfade können Werte setzen; SaveV2 restauriert danach |
| Gebäude | praktisch `Buildings.list` = `Game.buildings` nach SA-04 Sync | zwei Namen/Owner bleiben vorhanden |
| Units | interne Liste von `GameUnits`, gespiegelt auf `Game.units` und `window.__units` | Spiegelungen für Legacy-Renderer/Tools |
| Jobs | interne Queue von `JobEngine` | Jobtypen/-erzeuger historisch gemischt |
| Produktionslager | `BuildingStock` | altes direktes Production-Accounting noch im geladenen Code |
| Map-Rohstoffe | `MapResources.state` | keine zweite autoritative Quelle im aktuellen Pfad nachgewiesen |
| Tiere | `MapAnimals._state` | alter Hunter erwartete nicht existente API; SA-04 greift direkt auf State zu |
| Baustellen | Building-Felder (`needs`, `delivered`, `buildPhase`, `buildStage`, `buildElapsed`, …) | State-Transitions zwischen Construction und SA-04 verteilt |
| Pfade | `PathOverlayInstance._wear` + `_stamps` | Save-Persistenz außerhalb des Path-Moduls |
| SaveGame | `SaveGameV2` + additive SA-04 Persistenzmodule | altes `savegame.js` nicht geladen |
| Housing | Gebäude + `u.villager` mit Home-UID | SA-04/SA-05 teilen Spawn, Steuer, Menü und Workforce auf mehrere Dateien |

## 11. Performance-relevante Runtime-Kandidaten

Priorität ist **noch keine Reparaturreihenfolge**, sondern nur technische Risikoklassifikation.

### Hoch

1. `path-overlay.js`
   - viele Einzelstempel
   - framebasiertes Draw
   - Wear-Decay
   - zusätzlicher Save-Serialize-Pfad
   - Diagnose brachte leichte, aber keine vollständige Verbesserung

2. `game.map.js` / Renderer-Kette
   - framebasierter Hauptdraw
   - Map, Buildings, Units, Decorations, Resources, Animals, FX und Overlays laufen zusammen
   - muss später mit echter Zeitmessung profiliert werden

3. parallele Overlay-/Render-Wrapper
   - PathOverlay
   - path-traces
   - unit-overlay
   - resource-piles Renderer-Wrap

### Mittel

4. `GameUnits.tick()` + A*-Navigation bei vielen Units
5. `MapAnimals.tick()`
6. Construction + mehrere Gebäude-/Unit-Scans
7. ResidentWorkforce-Poll
8. Housing-/Tax-Timer

### Sporadische Spike-Kandidaten

9. 30-s-Autosave mit synchronem `JSON.stringify` + `localStorage.setItem`
10. direkt anschließendes additives Path-/Stock-/Tax-Snapshot-Schreiben
11. größere A*-Berechnungen bei neuer Jobzuweisung

## 12. Wichtigste Architekturblocker vor weiterer Funktionsentwicklung

### BLOCKER-A – kein eindeutiger Besitzer für Job-/Build-Workflow

Queue, Baujoberzeugung, Construction und SA-04-Filter überlagern sich.

### BLOCKER-B – Produktion besitzt noch alten und neuen Warenfluss gleichzeitig

Der neue physische Warenfluss funktioniert, weil die SA-04 Bridge den alten Pfad zur Laufzeit stoppt.

### BLOCKER-C – doppeltes Gebäude-State-Ownership

`Game.buildings` vs. `Buildings.list`.

### BLOCKER-D – Pfadsystem ist State + Renderer + Save-Hack zugleich

Performance- und Ownership-Risiko.

### BLOCKER-E – zu viele Runtime-Patches auf privaten Interna

Mehrere SA-04-Dateien greifen direkt auf `_state`, `_wear`, `_stamps`, interne Maps oder wrapbare globale Funktionen zu.

### BLOCKER-F – kein zentraler Runtime-Scheduler/Profiler

200-ms-GameTick, mehrere Zusatzintervalle und RAF laufen nebeneinander; sporadische Ruckler lassen sich ohne Messpunkte nur schwer sauber zuordnen.

## 13. Was bereits stabil/fachlich bestätigt ist

Diese Matrix ersetzt nicht die SA-04-Abnahme. Der eingefrorene SA-04-Stand bleibt die fachliche Referenz für Save/Continue.

Bestätigte funktionierende Bereiche im aktuellen Entwicklungsstrang:

- Continue restauriert Gebäude und Ressourcen
- Pfade werden gespeichert/restauriert
- Pausezustände werden gespeichert/restauriert
- Baustellen warten auf echte Builder
- Überlieferungen werden gestoppt
- Produktionswaren werden physisch über Gebäude-Lager → Carrier → HQ transportiert
- Produktionsworker-Pause funktioniert für die getesteten Produzenten
- Wohnhäuser erzeugen Bewohner gemäß Kapazität
- Bewohnerzahl bleibt nach Continue erhalten
- Housing-Steuern/Gold bleiben über Continue konsistent
- SA-05 Bewohner arbeiten als zusätzliche Trägerhelfer und kehren danach nach Hause zurück

Performance bleibt **OPEN**.

## 14. Legacy-Entscheidungen – noch NICHT ausführen

SA-DOC-01B trifft ausdrücklich noch keine Lösch-/Umbauentscheidung.

Vorläufige Kandidaten für spätere Konsolidierung:

1. automatische `type:'build'`-Erzeugung aus `job.engine.js`
2. direkter `cb:prod:output`-Accounting-Pfad aus `game.production.js`
3. `game.production.jobs.js`
4. altes `game.production.hunt.js`
5. doppelte Buildings-Listen
6. `path-traces.overlay.js` vs. `path-overlay.js`
7. nicht geladene Altdateien wie `savegame.js`, `worker.production.js`, `core.map.old.js`
8. SA-04 Wrapper nach Integration in ihre eigentlichen Owner-Module

Keine dieser Dateien/Funktionen wird in SA-DOC-01B verändert oder gelöscht.

## 15. Ergebnis SA-DOC-01B

**SA-DOC-01B = COMPLETE – RUNTIME BASELINE**

Der aktuelle Stand ist funktional weiterentwickelbar, aber architektonisch stark geschichtet. Der wichtigste Befund ist nicht ein einzelnes defektes Modul, sondern das Muster:

> Ein historischer aktiver Kern bleibt geladen und spätere SA-04/SA-05-Schichten korrigieren ihn über Events, Capture-Listener, Wrapper, Polling und direkten Zugriff auf interne Zustände.

Damit ist jetzt erstmals nachvollziehbar, welche Runtime-Verantwortungen wirklich aktiv sind und wo Legacy-Verhalten nur noch durch Patch-Layer kontrolliert wird.

## 16. Empfohlener nächster Dokumentationsschritt

`SA-DOC-01C – Runtime-Ownership-Zielmatrix & Reparaturreihenfolge`

Dabei noch keine große Reparatur durchführen. Für jeden Fachbereich wird **genau ein zukünftiger Owner** festgelegt:

- Lifecycle/Boot
- Resources
- Buildings
- Units/Workforce
- Jobs
- Construction
- Production/Stock/Logistics
- MapResources/Animals
- Paths
- SaveGame
- Rendering

Anschließend wird daraus die kontrollierte technische Reparaturreihenfolge gebildet. Der Inspector bleibt weiterhin außerhalb dieses Blocks.
