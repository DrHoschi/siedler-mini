# SA-R01A – Scheduler-/Timer-Inventur

Status: **COMPLETE – STATIC CADENCE BASELINE**  
Datum: 2026-08-31  
Repository: `DrHoschi/siedler-mini`  
Prüfbranch: `feature/sa-05-resident-workforce`  
Freeze-Basis: `feature/sa-04-savegame-v2` / `789eab6cc6084eb001953b85ecbc6a4951ec5bce`

## 1. Ziel und Abgrenzung

SA-R01A inventarisiert die aktuell vorhandenen Scheduler-, Timer-, Polling- und Render-Schleifen des laufenden Projekts, ohne eine einzige Frequenz oder Funktion zu verändern.

Erfasst werden:

- `requestAnimationFrame`
- dauerhafte `setInterval`-Loops
- zeitlich begrenzte Installations-/Wrapper-Polls
- wiederkehrende UI-Polls
- Autosave-Timer
- ereignisgesteuerte `setTimeout`-Delays
- Inspector-Timer, soweit sie im normalen Start geladen werden

Wichtig: Diese Phase ist eine **statische Cadence-Messung aus dem Quellcode**. Sie dokumentiert, welche Schleife mit welcher Sollfrequenz gestartet wird. Sie misst noch **nicht** die tatsächliche Ausführungsdauer pro Callback auf einem Gerät. Dafür ist ein nachfolgender Instrumentierungsblock erforderlich.

## 2. Hauptbefund

Die Spielruntime besitzt derzeit **keinen zentralen Scheduler**.

Neben dem framebasierten Renderloop existieren mehrere voneinander unabhängige Intervalle mit 20 Hz, 8 Hz, 5 Hz, 4 Hz, 2 Hz und 1/30 Hz. Einige davon durchlaufen wiederholt Unit-, Building-, Animal- oder UI-Listen.

Das bedeutet: Selbst wenn das Pfad-Rendering deaktiviert wird, bleiben mehrere unabhängige periodische Arbeitsquellen aktiv. Damit passt der beobachtete sporadische Stutter zu einer Architektur mit konkurrierenden Main-Thread-Spitzen, ohne dass SA-R01A bereits einen einzelnen Verursacher beweist.

## 3. Dauerhafte Gameplay-Scheduler

| Modul | Mechanismus | Cadence | Startbedingung | Arbeit | Einordnung |
|---|---|---:|---|---|---|
| `core/game.js` | `requestAnimationFrame(loop)` | Display-Refresh, typ. bis ~60 Hz | nach `Game.init()` | kompletter World-/Game-Render | **Haupt-Renderloop** |
| `core/game.tick.js` | `setInterval(runTick, 200)` | 5 Hz | `cb:game:start` | CarrierRuntime, GameUnits, Buildings growth, MapAnimals, Construction, Production | **Haupt-Simulationstick** |
| `core/sa04.pause-builder-fixes.js` | `setInterval(..., 50)` | 20 Hz | sofort beim Laden | `guardStonePause()` + `guardBuilders()`, scannt Buildings/Units | **hochfrequenter Patch-Poll** |
| `core/sa04.runtime-guards.js` | `setInterval(..., 100)` | 10 Hz | sofort | nur wartende Baustellen; sucht angekommenen Builder | dauerhafter Patch-Poll |
| `core/sa05.resident-workforce.js` | `setInterval(..., 200)` | 5 Hz | sofort | Patch-Verifikation + Villager-Scan + Freizeitbewegung | zusätzlicher Unit-Tick neben GameTick |
| `core/sa04.hunter-production-fix.js` | `setInterval(..., 250)` | 4 Hz | sofort | scannt fertige Hunter, Tiere/Arbeitsbereich; 4,5-s Produktionszyklus | separater Produktionsscheduler |
| `core/sa04.housing-taxes.js` | `setInterval(tick, 250)` | 4 Hz | sofort; fachlich erst nach `cb:game:start` aktiv | scannt Häuser, prüft 10-s-Steuertermine | separater Economy-Poll |
| `core/sa04.housing-menu.js` | `setInterval(update, 500)` | 2 Hz | sofort | DOM-Lookups und Housing-Menü-Refresh | läuft auch ohne notwendige fachliche Änderung |
| `ui/ui-minimap.js` | Overlay `setInterval` | 8 Hz Default (`fps:8`, ca. 125 ms) | wenn Minimap aktiv/nicht minimiert | Base-Signatur prüfen, Units/Buildings/Resources + Viewport rendern | eigenständiger UI-Renderloop |
| `ui/ui-minimap.js` | AutoHide `setInterval` | 4 Hz Default (`250 ms`) | nach Minimap-Init | Build-/Inspector-Open-State prüfen | UI-Poll |
| `core/savegame-v2.js` | `setInterval` | alle 30 s | nach Spielstart | Snapshot bauen, JSON stringify, localStorage schreiben | **sporadischer synchroner Main-Thread-Spike möglich** |

## 4. Framegebundene Renderarbeit

### 4.1 `core/game.js`

`game.js` startet einen permanenten `requestAnimationFrame(loop)` und plant am Ende jedes Frames den nächsten RAF. Dieser ist der zentrale visuelle Loop.

Folge: Alles, was über Renderer-Hooks oder Wrapping an diesen Pfad gekoppelt ist, kann bis zur Displayfrequenz ausgeführt werden.

### 4.2 PathOverlay

`core/path-overlay.js` wird im aktuellen Start geladen und seine Draw-Arbeit hängt am Renderpfad. Der historische Pfadrenderer iteriert sichtbare Stamps pro Frame.

SA-05 PERF-02 reduziert diesen Aufwand durch Stamp-Cap/Halo-Abschaltung/Decay-Throttling.

SA-05 PERF-03 (`sa05.path-render-diagnostic.js`) schaltet aktuell den eigentlichen Path-Draw testweise aus. Pfaddaten/Stamps/Wear werden weiter gepflegt.

Damit ist der Path-Draw im aktuellen Diagnosezustand nicht mehr die volle historische Last, die restlichen Scheduler laufen jedoch unverändert weiter.

### 4.3 PathTraces

`core/path-traces.overlay.js` besitzt keinen permanenten eigenen Tick für das Zeichnen. Nach erfolgreicher Registrierung wird `draw()` über `OverlayHooks` im Renderpfad ausgeführt. Das Registrierungsintervall ist nur temporär.

## 5. Dauerhafte fachliche Loops im Detail

### 5.1 GameTick – 200 ms

`GameTick` ist bereits ein brauchbarer zentraler Simulationsanker. Pro Tick werden nacheinander ausgeführt:

1. optional `JobEngine.tick`
2. `CarrierRuntime.tick`
3. `GameUnits.tick`
4. `Buildings.tickGrowth`
5. `MapAnimals.tick`
6. `GameConstruction.tick`
7. `Production.tick`

Architekturproblem: Mehrere neuere Systeme laufen **zusätzlich** außerhalb dieses Ticks in eigenen Intervallen.

### 5.2 Pause-/Builder-Guard – 50 ms

`sa04.pause-builder-fixes.js` läuft mit 20 Hz und führt zwei Guards aus.

- Steinbruch-Pause/Worker-Rückkehr
- Builder-Recovery für vollständig versorgte Baustellen

`guardBuilders()` holt die komplette Unit-Liste und iteriert Gebäude; für passende Baustellen wird zusätzlich über Units gefiltert.

Dies ist der derzeit höchstfrequente dauerhaft aktive SA-Patch-Poll.

### 5.3 Runtime-Guard Builder Arrival – 100 ms

`sa04.runtime-guards.js` besitzt zusätzlich einen 10-Hz-Poll, der wartende Baustellen durchläuft und in der Unit-Liste nach einem zugeordneten `u.builder` mit `phase==='working'` sucht.

Damit existieren für Builder/Construction derzeit mindestens zwei separate Patch-Polls neben dem 5-Hz-Construction-Tick.

### 5.4 Resident Workforce – 200 ms

SA-05 besitzt einen eigenen 5-Hz-Loop parallel zu `GameUnits.tick`.

Er:

- stellt Job-Patch und Path-Perf-Patch sicher,
- holt die Unit-Liste,
- filtert Villager,
- setzt Bewohner nach Hilfsjobs zurück,
- bewegt Idle-Residents.

Die vorherige 50-ms-Version wurde bereits auf 200 ms reduziert; dies beseitigte das beobachtete Ruckeln nicht eindeutig.

### 5.5 Hunter – 250 ms

Der Hunter-Fix pollt mit 4 Hz. Der fachliche Jagdzyklus beträgt 4500 ms, die Ausführung wird aber alle 250 ms geprüft.

### 5.6 Housing Taxes – 250 ms

Der Steuerzyklus beträgt 10 Sekunden, wird jedoch mit 4 Hz geprüft. Pro Poll werden die Gebäude durchlaufen und fertige Housing-Buildings geprüft.

### 5.7 Housing Menu – 500 ms

Das Housing-Menü aktualisiert mit 2 Hz und führt DOM-Abfragen aus. Der Loop wird unabhängig davon angelegt, ob gerade ein Housing-Menü offen ist; `update()` kehrt nur früh zurück, wenn das Panel nicht existiert.

### 5.8 Minimap – 8 Hz + 4 Hz

Die Minimap besitzt zwei eigene Intervalle:

- Default 8-Hz-Overlay-Render
- Default 250-ms-AutoHide-Fallback

Der Overlay-Render sammelt je Update u. a. Units, Buildings und MapResources und zeichnet das Minimap-Canvas.

## 6. Autosave – 30 Sekunden

`savegame-v2.js` startet nach Spielstart einen 30-Sekunden-Autosave.

Der Save erfolgt synchron auf dem Main Thread:

1. Snapshot erzeugen
2. Ressourcen klonen
3. Buildings serialisieren
4. Units serialisieren
5. MapResource-Nodes klonen
6. JSON.stringify
7. `localStorage.setItem`
8. `cb:savegame:v2:saved`

An diesem Save-Event hängen weitere SA-04-Injektionen, die denselben Snapshot/LocalStorage erneut lesen und schreiben, unter anderem Path-State, Pause, Stock und Housing Taxes.

Bewertung für SA-R01A: **starker Kandidat für einen periodischen kurzen Hitch**, aber noch nicht gemessen. Er erklärt nicht automatisch dauerhaftes Ruckeln.

## 7. Temporäre Installations-/Wrapper-Polls

Diese Intervalle sind grundsätzlich nur kurz aktiv und werden nach erfolgreicher Installation beendet.

| Modul | Cadence | Ende | Zweck |
|---|---:|---|---|
| `sa04.runtime-guards.js` JobEngine-Wrapper | 50 ms | sobald `JobEngine.pop` erfolgreich gewrappt | Delivery-Filter installieren |
| `sa04.production-bridge.js` JobEngine-Wrapper | 100 ms | sobald Legacy-Build-Filter installiert | `type:'build'`-Filter installieren |
| `sa05.path-render-diagnostic.js` | 50 ms | sobald `PathOverlayInstance` gefunden/gewrappt | PERF-03 Draw-Schalter installieren |
| `path-traces.overlay.js` Registrierung | 200 ms, max. ca. 20 Versuche | OverlayHooks verfügbar oder Timeout | Trace-Layer registrieren |
| diverse Inspector-Tabs | häufig 200-ms-Late-Registration | Inspector-API verfügbar oder Timeout | Tab-Registrierung |

Diese Polls sind nach normal erfolgreichem Start nicht als dauerhafte Last zu behandeln. Falls eine Abhängigkeit nie verfügbar wird, muss der jeweilige Max-/Stop-Pfad separat geprüft werden.

## 8. Ereignisgesteuerte Delays (`setTimeout`)

Mehrere Module verwenden kurze einmalige Delays zur Rehydrierung oder UI-Synchronisierung. Diese sind keine permanenten Scheduler, können aber beim Start/Continue/Build Event-Bursts erzeugen.

Beispiele:

- `sa04.housing-residents.js`: 50 ms nach Continue, 250 ms nach Game Start
- `sa04.housing-taxes.js`: 300 ms nach Start, 0 ms nach Build Complete, 80 ms nach Continue
- `sa04.housing-menu.js`: 190 ms nach Auswahl
- `sa05.resident-workforce.js`: 50/100/120 ms für Path-Patch, Cache/Continue-Normalisierung
- `game.construction.js`: einzelne visuelle Delays, z. B. HQ-Reveal
- `camera.cinematic.js`: RAF-/zeitbasierte Cinematic-Sequenz

Diese Delays werden in R01A nicht als permanente Last summiert.

## 9. Inspector – mituntersucht, separate Reparatur bleibt bestehen

Der Inspector ist Teil der geladenen Gesamtarchitektur und wird deshalb in der Scheduler-Betrachtung nicht ignoriert.

Bisher nachgewiesene Inspector-Scheduler:

### Layer-Tab

- 200-ms-Late-Registration-Poll, nur bis Registrierung/Timeout
- nach Mount: 1000-ms-Auto-Refresh
- der Refresh-Timer wird beim Inspector-Close beendet

### UI/Kamera-Tab

- optionaler Live-Modus: `setInterval(refreshOnce, 100)` = 10 Hz
- nur aktiv, wenn Live eingeschaltet ist

### Signals-Tab

- Replay benutzt ein Intervall von `max(60, 240/speed)` ms
- nur aktiv, wenn Replay gestartet wurde
- unabhängig davon hookt das Signals-Modul `EventTarget.addEventListener` und `dispatchEvent`; dies ist **keine Timerlast**, kann aber bei vielen Events zusätzlichen synchronen Overhead verursachen

### Weitere Inspector-Tabs

Die Code-Suche weist weitere `setInterval`-Verwendungen in Audit-, Checker-, SpriteTest- und anderen Tabs aus. Diese gehören in den späteren detaillierten Inspector-Block `SA-I01`. Für die Spiel-Performance-Baseline werden sie nur dann als dauerhafte Last gewertet, wenn nachgewiesen ist, dass der jeweilige Timer auch bei geschlossenem/nicht gemountetem Tab aktiv bleibt.

Damit ist der Inspector **nicht aus der Untersuchung ausgeschlossen**, seine interne Bereinigung wird aber weiterhin separat durchgeführt.

## 10. Nicht aktive Timer-Dateien

Folgende Dateien enthalten Timer/Intervalle, sind im aktuellen Hauptstartpfad aber nicht geladen und erzeugen deshalb im aktuellen Spiel keine Laufzeitlast:

- `core/savegame.js` – alter SaveGame-Pfad
- `core/worker.production.js` – alter Worker-Production-Pfad
- `ui/ui-bridge.js` – im aktuellen `index.html` nicht als Hauptpfad nachgewiesen
- verschiedene Tools/Editor-/Playground-Dateien

Sie bleiben Legacy-/Tooling-Kandidaten und dürfen nicht mit aktiver Runtime-Last verwechselt werden.

## 11. Scheduler-Cluster

Die aktuelle Runtime lässt sich in folgende konkurrierende Taktgruppen aufteilen:

### Framegruppe

- Game RAF / Renderer
- Renderer-Hooks/Overlays
- ggf. Camera Cinematic RAF

### 20-Hz-Gruppe

- SA-04 Pause-/Builder-Guard

### 10-Hz-Gruppe

- SA-04 Builder-Arrival-Poll
- Inspector UI-Live nur bei Aktivierung

### 8-Hz-Gruppe

- Minimap Overlay

### 5-Hz-Gruppe

- zentraler GameTick
- SA-05 Resident Workforce

### 4-Hz-Gruppe

- Hunter Production Poll
- Housing Taxes Poll
- Minimap AutoHide Poll

### 2-Hz-Gruppe

- Housing Menu Update

### Langintervall

- Autosave 30 s

## 12. Architekturbeobachtungen

### R01A-OBS-01 – Simulation ist fragmentiert

Ein Teil der Simulation liegt bereits im zentralen 200-ms-GameTick, neuere Fixes haben jedoch weitere unabhängige Intervalle daneben aufgebaut.

### R01A-OBS-02 – Construction/Builder wird mehrfach periodisch geprüft

Construction selbst läuft über GameTick. Zusätzlich laufen mindestens:

- 20-Hz Builder-Recovery in `pause-builder-fixes`
- 10-Hz Builder-Arrival in `runtime-guards`

Dies ist eine klare Ownership-/Scheduler-Doppelung.

### R01A-OBS-03 – Economy-Zyklen werden viel häufiger gepollt als fachlich nötig

- Tax: fachlich 10 s, Poll 250 ms
- Hunter: fachlich 4,5 s, Poll 250 ms

Das ist nicht automatisch ein Performanceproblem bei kleinen Listen, zeigt aber fehlende zentrale Zeitplanung.

### R01A-OBS-04 – Unit-Logik läuft in zwei 5-Hz-Systemen

`GameUnits.tick` läuft über GameTick, während Resident-Leisure/Recovery parallel über einen eigenen 200-ms-Loop läuft.

### R01A-OBS-05 – UI besitzt eigene Render-/Polling-Loops

Minimap und Housing-Menü laufen unabhängig vom Haupt-Render- bzw. Event-System.

### R01A-OBS-06 – Autosave kann periodische Main-Thread-Spitzen erzeugen

Aufgrund synchroner Snapshot-/JSON-/localStorage-Arbeit und additiver Save-Injektionen ist der 30-Sekunden-Autosave ein besonders plausibler Kandidat für sporadische einzelne Hitches.

### R01A-OBS-07 – Pfadrendering war nicht die einzige aktive Last

PERF-03 deaktiviert nur den Path-Draw. Die oben inventarisierten Simulation-, UI-, Save- und Patch-Scheduler laufen weiterhin.

## 13. Was SA-R01A bewusst noch NICHT behauptet

SA-R01A beweist nicht:

- welcher Callback tatsächlich wie viele Millisekunden benötigt,
- ob ein bestimmter Timer den beobachteten Stutter allein verursacht,
- wie stark Garbage Collection beteiligt ist,
- ob A* bei einzelnen Jobs besonders teuer ist,
- wie groß der Autosave-Snapshot im konkreten Langzeittest ist,
- welche FPS/Frame-Time-Spikes auf dem iPhone tatsächlich auftreten.

Dafür ist echte Laufzeitinstrumentierung erforderlich.

## 14. Ergebnis

SA-R01A = **COMPLETE – STATIC CADENCE BASELINE**.

Es wurden keine Laufzeitdateien geändert.

Die aktuelle Runtime besitzt mehrere voneinander unabhängige Scheduler. Die wichtigsten Messkandidaten für die nächste Phase sind:

1. RAF Frame-Time
2. `GameTick` Gesamtdauer und Unterblöcke
3. 50-ms Pause-/Builder-Guard
4. 100-ms Builder-Arrival-Guard
5. Resident-Loop
6. Minimap-Render
7. Autosave-Dauer/Bytes inklusive nachgeschalteter Save-Injektionen
8. Path stamp generation auch bei deaktiviertem Path-Draw
9. A*/GameUnits-Spitzen pro Job/Unit
10. Inspector Event-Hook-Overhead bei geschlossenem Inspector

## 15. Nächster empfohlener Schritt

**SA-R01B – Laufzeitinstrumentierung / Frame-Time- und Callback-Dauermessung**

Noch keine Optimierung. Stattdessen werden die oben identifizierten Hauptpfade minimal instrumentiert und ihre Dauer erfasst, damit die anschließende Reparatur nicht auf Vermutungen basiert.
