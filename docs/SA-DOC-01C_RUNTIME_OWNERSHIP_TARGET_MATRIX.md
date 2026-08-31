# SA-DOC-01C – Runtime-Ownership-Zielmatrix & Reparaturreihenfolge

Status: **COMPLETE – TARGET ARCHITECTURE BASELINE**  
Datum: 2026-08-31  
Repository: `DrHoschi/siedler-mini`  
Prüfbranch: `feature/sa-05-resident-workforce`  
Freeze-Basis: `feature/sa-04-savegame-v2` / `789eab6cc6084eb001953b85ecbc6a4951ec5bce`

## 1. Zweck

Dieses Dokument legt fest, **welches Runtime-System künftig fachlich und technisch genau einen Hauptbesitzer haben soll**.

Ziel ist nicht, sofort Dateien umzubenennen oder zu löschen, sondern die aktuelle historisch gewachsene Mehrfachverantwortung schrittweise in eine eindeutige Architektur zu überführen.

Grundregel:

> **Ein fachlicher Zustand hat genau einen Owner. Andere Module greifen ausschließlich über definierte API/Event-Schnittstellen darauf zu.**

Damit sollen insbesondere folgende aktuelle Muster verschwinden:

- derselbe Zustand in mehreren Listen/Stores,
- Legacy-Verhalten, das später durch Capture-Listener oder Wrapper wieder korrigiert wird,
- mehrere Module, die dieselben Jobs erzeugen,
- mehrere Module, die Ressourcen verbuchen,
- Polling als Ersatz für fehlende fachliche Events,
- direkte Zugriffe auf interne Maps/Arrays fremder Systeme,
- SaveGame-Patches, die nachträglich zusätzliche Zustände direkt in localStorage injizieren.

## 2. Scope

Im Scope dieser Zielarchitektur:

- Boot / Lifecycle
- Resources
- Buildings
- Units / Workforce
- Jobs
- Construction
- Production
- BuildingStock / Logistics
- MapResources
- Animals / Hunting
- WorkAreas
- Paths
- SaveGame
- Rendering
- Spiel-UI
- Inspector als abhängiges Development-/Debug-Subsystem

Der Inspector wird **mituntersucht und architektonisch berücksichtigt**, aber seine eigentliche Bereinigung/Reparatur erfolgt später in einem separaten Inspector-Arbeitsblock.

## 3. Verbindliche Ownership-Regeln

### O-01 – Single Source of Truth

Jeder persistente Gameplay-State besitzt genau einen autoritativen Store.

### O-02 – Keine Patch-Ownership

SA-04-/SA-05-Patches dürfen langfristig nicht selbst Owner eines Kernzustands werden. Sie sind Übergangsschichten und werden nach erfolgreicher Konsolidierung reduziert oder entfernt.

### O-03 – Events statt Polling, wo fachlich möglich

Polling bleibt nur für technisch begründete Fälle. Fachliche Zustandsübergänge sollen explizite Events/APIs besitzen.

### O-04 – SaveGame liest Owner, rekonstruiert Runtime

SaveGame ist kein zweiter Gameplay-Owner. Es serialisiert autoritative Zustände und rekonstruiert daraus die Runtime.

### O-05 – Rendering besitzt keinen Gameplay-State

Renderer/Overlays dürfen darstellen und Caches besitzen, aber keine fachlich maßgeblichen Ressourcen-, Gebäude-, Unit-, Job- oder Produktionszustände.

### O-06 – UI besitzt keinen Gameplay-State

HUD, Menüs und Inspector lesen über APIs/Events; sie führen keine konkurrierenden Gameplay-Stores.

## 4. Runtime-Ownership-Zielmatrix

| System | Aktuelle Hauptbeteiligte | Ziel-Owner | Künftige Verantwortung | Übergangs-/Legacy-Teile |
|---|---|---|---|---|
| Lifecycle / Start / Continue | `boot-v1.js`, `ui-start.js`, `game.bootstrap.js`, `game.js`, `savegame-v2.js` | **Boot/Lifecycle (`boot-v1.js` bzw. später konsolidierter BootManager)** | genau ein Start-Gate; New/Continue eindeutig unterscheiden; Start erst nach Assets/Registry/Save-Readiness | alte Bootstrap-Resetlogik für Continue entkoppeln |
| Resources / globale Lagerwerte | `game.production.js`, `RegistryValues`, HUD, Bootstrap, Taxes, SaveGame | **ResourceStore innerhalb `Production` oder eigener `Resources`-Service** | `get/add/consume/snapshot/restore`; einziges Modul darf globale Werte mutieren | direkte Bootstrap-/Patch-Schreibzugriffe entfernen |
| Buildings / Instanzen | `Game.buildings`, `Buildings.list`, Construction, Production-Caches, SaveGame | **`Buildings` als alleinige Instanz-Registry** | create/get/list/update/remove; stabile UID; Sprite-/Definition-Verknüpfung | `Game.buildings` nur Alias/Read-Fassade oder später entfernen; SA-04 List-Sync entfällt |
| Units / Workforce | `GameUnits`, Resident-SA05, Worker-Patches, Builderlogik | **`GameUnits`** | alle Units, Rollen, Home-Bindings, aktuelle Aufgabe, Bewegung; Resident/Carrier/Worker als Rollen/States statt konkurrierender Systeme | SA-05 Resident-Wrapper in GameUnits integrieren; lokale Worker-Sonderpfade reduzieren |
| Job Queue | `JobEngine`, CarrierRuntime, Construction, Production, BuildingStock, SA-04 pop-wrapper | **`JobEngine`** | Queue, Prioritäten, Status, cancel/requeue; keine automatische fachfremde Job-Erzeugung aus `cb:build:complete` | alte `type:'build'` Autojobs entfernen; pop-wrapper danach entfallen |
| Job Assignment / Execution | `CarrierRuntime`, `GameUnits` | **`GameUnits` + dünner JobScheduler** | Scheduler wählt Job/Unit; GameUnits führt Bewegung/Task aus | CarrierRuntime auf Scheduler-Funktion reduzieren oder integrieren |
| Construction | `game.construction.js`, SA04 runtime guards, pause-builder-fixes | **`GameConstruction`** | Needs/Delivered/Builder-Anfahrt/Bauphasen/Progress/Completion vollständig in einem Zustandsautomaten | Builder-Wait-Poll und Rücksetz-Patches in Kern übernehmen; alte Dummy-Builder-Visuals trennen |
| Production | `game.production.js`, Wood/Stone/Fish/Hunt, SA04 bridge | **`Production`** | Producer registrieren/ticken; Output fachlich erzeugen; Pause beachten; kein direktes Doppel-Accounting | Capture-Bridge entfernen, sobald Production nativ Stock-Ausgabe unterstützt |
| Producer Stock | `building.stock.js`, Production, SA04 stock persistence | **`BuildingStock`** | Output-Puffer pro Gebäude; Reserve/Pickup/Deliver-Status | Stockable-Liste datengetrieben machen; direkter Zugriff auf interne Maps vermeiden |
| Logistics / Warenfluss | `BuildingStock`, JobEngine, CarrierRuntime, Production | **Logistics-Service auf JobEngine/GameUnits-Basis** | `producer stock -> pickup job -> carrier -> HQ -> global resource credit` | `game.production.jobs.js`, `logistics.prio.js` prüfen und voraussichtlich ablösen |
| Housing / Residents | `sa04.housing-residents.js`, `sa05.resident-workforce.js`, housing-menu/taxes | **GameUnits + Housing-Service** | Kapazität/Resident-Bindung im Housing-Service; Bewohner sind reguläre Units; Freizeit/Arbeitsrolle in GameUnits | SA04/SA05-Layer nach Integration entfernen |
| Taxes / Economy trigger | `sa04.housing-taxes.js`, Production.addResource | **Economy/Housing-Service**, Resource-Mutation nur über ResourceStore | Tax-Timer/Regel gehört Housing/Economy; Goldbuchung nur über Resource-API | Testbalance später fachlich entscheiden |
| MapResources | `map.resources.js`, SaveGame, Production | **`MapResources`** | Rohstoffknoten, Mengen, Abbauzustand, Snapshot/Restore | SaveGame greift nur über offizielle Snapshot-/Restore-API zu |
| Animals | `map.animals.js`, old hunt, hunter fix | **`MapAnimals`** | Tierbestand, Spawn/Consume/Query APIs | direkter `_state.animals` Zugriff aus Hunter-Fix eliminieren; fehlende Query/consume-API ergänzen |
| Hunting | `game.production.hunt.js`, SA04 hunter fix | **Production Hunter Module**, über öffentliche MapAnimals-API | Ziel suchen, konsumieren, Output erzeugen | alten Hunt-Pfad ersetzen; SA04-Hunter-Patch danach entfernen |
| WorkAreas | `game.workarea.js`, Production/Hunter | **`GameWorkArea`** | setzen/lesen/validieren von Arbeitsbereichen | direkte Sonderlogik in Produzenten reduzieren |
| Paths / Wear | `path-overlay.js`, path-traces, runtime guard, SA05 perf/diagnostic | **neues/überarbeitetes `PathSystem`** | fachlicher Wear-State + effiziente Stamp/Aggregat-Erzeugung; eigene Snapshot API | heutige Einzelstempel-pro-Frame-Architektur ersetzen; Diagnose-/Perf-Patches entfernen |
| Path Rendering | `path-overlay.js`, Renderer/Overlay hooks | **Renderer-Submodul / PathRenderCache** | gecachter/dirty-basierter Renderlayer; keine fachliche Ownership | tausende Sprite-Draws pro Frame vermeiden |
| SaveGame | `savegame-v2.js`, uid-guard, runtime-guards, stock-persistence, pause/tax injections | **`SaveGameV2` bzw. später SaveGame-Service** | Snapshot über Owner-APIs; Versionierung; Validate; Restore in definierter Reihenfolge | additive localStorage-Nachbearbeitung in einzelne Patches integrieren und entfernen |
| UID / Identity | Building creation + UID guard | **Buildings** | UID-Erzeugung und Eindeutigkeit bereits beim Create | SaveGame-UID-Guard nur Übergang |
| Main Simulation Tick | `game.tick.js` plus diverse setInterval-Patches | **`GameTick`** | definierte Simulation-Scheduler; Systeme registrieren sich mit Frequenz/Phase | verstreute 50/100/200/500-ms-Intervalle schrittweise zurückführen |
| World Rendering | `game.js`, `game.map.js`, `game.renderer.js`, overlays | **`GameRenderer`/RenderPipeline** | ein RAF; Layer-Reihenfolge; Culling; Render-Caches | Renderer-Wrapping durch Resource-Piles/Pathdiagnostic vermeiden |
| Spiel-UI | diverse `ui/*.js` | **je UI-Bereich eigener View-Controller, State aus Runtime lesen** | Start/HUD/Build/BuildingMenu/Minimap | keine Gameplay-Ownership |
| Inspector | `inspector/*` + Bridges/Tabs | **Inspector als separates Read/Command-Subsystem** | Runtime beobachten, Diagnosen, kontrollierte Debug-Commands über öffentliche APIs | vollständige Inspector-Überarbeitung in separatem Audit-/Repair-Block; keine direkten internen Runtime-Manipulationen als Zielzustand |

## 5. Ziel-Datenflüsse

### 5.1 Produktion / Logistik

Verbindlicher Zielpfad:

`Production Module -> BuildingStock -> Logistics/JobEngine -> GameUnits -> HQ Deliver -> ResourceStore`

Es darf dabei **genau eine** globale Ressourcenbuchung geben: bei erfolgreicher HQ-Lieferung.

Ausnahme: Systeme ohne physischen Warenfluss, z. B. Steuern, dürfen den ResourceStore über dessen öffentliche API direkt buchen.

### 5.2 Construction

Verbindlicher Zielpfad:

`Placement -> GameConstruction Site -> Delivery Jobs -> Material vollständig -> Builder Job -> Builder angekommen -> Build Progress -> Complete`

Kein externes Modul darf Construction nachträglich in eine frühere Phase zurücksetzen müssen.

### 5.3 Bewohner / Workforce

Verbindlicher Zielpfad:

`Housing -> Resident Unit -> Idle/Home -> Workforce Scheduler -> temporäre Arbeitsrolle -> Job -> Rückkehr Home`

`resident`, `carrier`, `builder`, `producer worker` sollen langfristig keine voneinander getrennten Unit-Listen sein, sondern Rollen/Zustände derselben Unit-Runtime.

### 5.4 Save / Continue

Verbindlicher Zielpfad:

`Owner.snapshot() -> SaveGame -> Storage`

und

`Storage -> SaveGame.validate() -> Owner.restore() -> Runtime-Reconstruction -> cb:continue-restored`

Keine nachträglichen unabhängigen localStorage-Rewrites durch Patchmodule.

### 5.5 Paths

Verbindlicher Zielpfad:

`Unit movement event -> PathSystem wear aggregation -> dirty tiles/cache -> Path renderer`

Nicht mehr:

`Unit movement -> tausende persistente Einzelstempel -> alle Stempel in jedem RAF neu zeichnen`.

## 6. Performance-Ownership

Die aktuelle Performance darf nicht nur über Grenzwerte einzelner Module behandelt werden. Ziel ist eine zentrale Scheduling-/Rendering-Verantwortung.

### Simulation

`GameTick` soll langfristig die periodischen Gameplay-Arbeiten bündeln.

Kandidaten zur Integration statt eigener Intervalle:

- Builder arrival / recovery
- Resident leisure/workforce
- Housing/Tax Timer
- Production checks
- Stock pickup scheduling
- Save-Autosave scheduling als eigener klarer Systemtimer

### Rendering

Ein RAF gehört der RenderPipeline.

Pfad-, Ressourcen-, Unit-, Construction- und FX-Layer sollen dort registriert werden, statt `Renderer.draw` gegenseitig zu wrappen.

## 7. Inspector – Zielrolle

Der Inspector wird vollständig untersucht, aber separat repariert.

Zielrolle:

- liest Runtime nur über öffentliche APIs/Snapshots,
- hört definierte Events,
- darf Debug-Commands auslösen,
- darf keine zweite Business-Logik besitzen,
- darf keine produktiven Kernmodule ersetzen oder patchen,
- darf Performance-Messung bereitstellen,
- bleibt optional abschaltbar, ohne dass das Spielverhalten verändert wird.

Für den späteren Inspector-Block sind mindestens zu prüfen:

- doppelte/alte Tab-Dateien im Root und unter `inspector/tabs/`,
- Bridges und Event-Adapter,
- direkte Zugriffe auf interne `_state`-/Map-/Array-Strukturen,
- doppelte Eventlistener,
- Performance-Kosten geöffneter und geschlossener Tabs,
- alte Diagnose-/Audit-Funktionen,
- Editor-/Sprite-/Asset-Testfunktionen,
- klare Trennung Development Tool vs. Game Runtime.

## 8. Reparaturreihenfolge

Die Reihenfolge ist so gewählt, dass zuerst fundamentale Ownership-Mehrdeutigkeiten beseitigt werden und jeweils ein testbarer Stand erhalten bleibt.

### SA-R01 – Performance-Messbasis & Scheduler-Inventur

Ziel:
- alle aktiven `setInterval`, RAF-Wrapper und wiederkehrenden Schleifen erfassen,
- grobe Laufzeitkosten messbar machen,
- keine funktionale Änderung.

Grund: Das aktuelle Ruckeln ist nicht allein durch Path-Rendering erklärt. Vor größerem Umbau brauchen wir eine belastbare Messbasis.

### SA-R02 – JobEngine Ownership bereinigen

Ziel:
- `JobEngine` nur Queue/Priorität/Status,
- alte automatische `type:'build'`-Erzeugung entfernen,
- SA04 `pop()`-Filter danach zurückbauen.

Warum zuerst: Construction und Logistics hängen beide an der Queue. Ein sauberer Job-Kern reduziert Folgekomplexität.

### SA-R03 – Construction konsolidieren

Ziel:
- Builder-Wait und Recovery nativ in `GameConstruction`,
- kein Rücksetzen durch SA04-Guard,
- definierte Events `builder-assigned`, `builder-arrived`, `build-started`, `completed`.

### SA-R04 – Production / BuildingStock / Logistics konsolidieren

Ziel:
- stockfähige Produzenten nativ über BuildingStock,
- kein Capture-Stop durch SA04 Production Bridge,
- Legacy `game.production.jobs.js`/`logistics.prio.js` gezielt deaktivieren oder entfernen, sobald nachgewiesen redundant,
- genau eine HQ-Buchung.

### SA-R05 – Buildings Single Source

Ziel:
- `Buildings` alleinige Instanzliste,
- `Game.buildings` nur kompatible Fassade bzw. schrittweise entfernen,
- UID-Erzeugung in Buildings,
- Restore-Sync-/UID-Patches abbauen.

### SA-R06 – Units / Residents / Workforce konsolidieren

Ziel:
- Bewohner als reguläre GameUnits-Rolle,
- Freizeit-/Home-Logik und Job-Hilfe nativ,
- SA05 Resident-Wrapper abbauen,
- klare Workforce-Regeln.

### SA-R07 – Animals / Hunter konsolidieren

Ziel:
- öffentliche MapAnimals Query-/Consume-API,
- Hunter-Modul darauf umstellen,
- alten Hunt-Pfad und SA04-Hunter-Patch vereinheitlichen.

### SA-R08 – SaveGame V3-Readiness / Owner-Snapshots

Ziel:
- jeder Owner liefert Snapshot/Restore,
- Path/Stock/Pause/Taxes nicht mehr nachträglich in localStorage injizieren,
- SaveGame bleibt kompatibel zu V2, bis Migration explizit getestet ist.

Wichtig: Kein Formatbruch ohne Migrationsstrategie.

### SA-R09 – PathSystem Neuarchitektur

Ziel:
- Wear-State von sichtbaren Einzelstempeln trennen,
- Tile-/Chunk-Aggregation bzw. Cache,
- Dirty-Redraw statt Vollzeichnung aller Stamps pro Frame,
- Viewport-Culling,
- Persistenz über PathSystem Snapshot API.

Der aktuelle PERF-03-Diagnosepfad wird erst entfernt, wenn der neue Pfadrenderer nachweislich performant ist.

### SA-R10 – RenderPipeline konsolidieren

Ziel:
- ein RAF,
- definierte Layer,
- keine mehrfachen `Renderer.draw`-Wrapper,
- Resource Piles / Path / Units / Construction / FX sauber registrieren,
- Culling und Renderbudget.

### SA-R11 – Bootstrap / Lifecycle / Cache-Busting bereinigen

Ziel:
- New/Continue ohne nachträgliche Überschreibungen,
- dynamische Patch-Ladung reduzieren,
- konsistente Versions-/Cache-Strategie,
- Boot-Liste entspricht tatsächlicher Architektur.

### SA-R12 – Spiel-UI Anschlussbereinigung

Ziel:
- HUD/Menüs nur über Owner-APIs,
- keine direkten Legacy-Stores,
- Funktionalität unverändert.

### SA-I01 ff. – Inspector separater Audit-/Repair-Track

Erst nach bzw. parallel zu stabilen Runtime-Schnittstellen:

- Inspector-Bestandsaudit,
- Tab-/Bridge-/Event-Matrix,
- Legacy-/Doppeldateien,
- Performance,
- API-Anpassung an neue Runtime-Owner,
- anschließend Reparatur/Freigabe separat.

## 9. Freeze-/Testregel für Reparaturen

Für jeden SA-Rxx-Block:

1. neuer kleiner Arbeitsstand auf dem vorgesehenen Feature-Branch,
2. nur ein Ownership-Thema gleichzeitig,
3. Browser-Starttest,
4. gezielter Funktionstest,
5. Reload/Continue-Test, wenn persistenter State betroffen ist,
6. Performance-Beobachtung, wenn Tick/Render betroffen ist,
7. erst nach bestätigtem PASS nächster Block,
8. keinen stabilen Freeze-Branch nachträglich weiterentwickeln,
9. kein Merge nach `main` ohne ausdrückliche Freigabe.

## 10. Aktuelle Priorität

Die Zielarchitektur ist mit diesem Dokument festgelegt.

Der **nächste technische Schritt** soll nicht sofort SA-R02 sein, sondern zunächst **SA-R01 – Performance-Messbasis & Scheduler-Inventur**.

Begründung:

- Das Spiel ruckelt weiterhin, obwohl das Pfad-Rendering testweise deaktiviert wurde.
- Der aktuelle Runtime-Stand besitzt neben dem 200-ms-GameTick mehrere unabhängige Intervalle und Render-Wrapper.
- Ein Umbau ohne Messbasis könnte funktionierende Systeme verändern, ohne die tatsächlichen Hotspots zu treffen.

SA-R01 soll deshalb zuerst sämtliche wiederkehrenden Runtime-Arbeiten erfassen und eine minimale Performance-Telemetrie schaffen, ohne Gameplay-Verhalten zu ändern.

## 11. Abschlussstatus SA-DOC-01C

**COMPLETE – TARGET ARCHITECTURE BASELINE**

Mit SA-DOC-01A, 01B und 01C liegen jetzt vor:

- Repository-Istbestand,
- tatsächlicher Runtime-/Legacy-Pfad,
- verbindliche Ziel-Ownership,
- kontrollierte Reparaturreihenfolge,
- separate, aber mitgedachte Inspector-Überarbeitung.

Noch wurde keine Runtime-Reparatur aus dieser Zielmatrix umgesetzt.
