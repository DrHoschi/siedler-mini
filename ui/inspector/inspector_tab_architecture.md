# Neue Siedler – Inspector: Core → Tabs (Mermaid-Übersicht)

> Architekturübersicht der Inspector-Integration mit allen Tabs und zentralen Ereignissen/Datenflüssen.

```mermaid
flowchart TB
  %% =========================================
  %% Inspector Core und Tabs
  %% =========================================
  subgraph CORE[Inspector Overlay / Core]
    IC[("Inspector Core API\n__INSPECTOR_CORE__.api / window.Inspector")]
  end

  subgraph TABS[Inspector Tabs]
    TLogs[Tab: Logs]
    TBuild[Tab: Build]
    TPaths[Tab: Paths]
    TRes[Tab: Resources]
    TUI[Tab: UI]
    TDiag[Tab: Diagnose]
    TTests[Tab: Tests]
  end

  IC -->|"mount('logs', fn)"| TLogs
  IC -->|"mount('build', fn)"| TBuild
  IC -->|"mount('paths', fn)"| TPaths
  IC -->|"mount('resources', fn)"| TRes
  IC -->|"mount('ui', fn)"| TUI
  IC -->|"mount('diag', fn)"| TDiag
  IC -->|"mount('tests', fn)"| TTests

  IC <-.-> |"cb:insp:tab:change\n(Aktivierung/Wechsel)"| TABS

  %% =========================================
  %% Event-Bus / Fenster
  %% =========================================
  EVB[(window\n(EventBus))]

  %% =========================================
  %% Engine / Systeme
  %% =========================================
  subgraph ENG[Engine / Systeme]
    Game[Game/Core]
    HUD[HUD]
    Assets[Assets]
    MapR[MapRuntime]
    PathO[PathOverlay/Heatmap]
    CBLog[CBLog]
    EventScan[EventScan]
  end

  subgraph DATA[Registry / Werte]
    Registry[Registry (Daten+Meta)]
    ResVals[RegistryValues\n(Live-Ressourcen-Mirror)]
  end

  %% =========================================
  %% Datenquellen & Abhängigkeiten
  %% =========================================
  Registry --- ResVals
  Registry -.-> |"snapshot()"| TDiag
  ResVals  -.-> |"Live-Werte"| TRes

  Assets -.-> |"stats()"| TDiag
  MapR   -.-> |"info()"| TDiag
  CBLog  -.-> |"buffer/history/tap"| TLogs

  %% =========================================
  %% Ressourcen-Tab: Ereignisse
  %% =========================================
  TRes --> |"req:res:snapshot"| EVB
  EVB  --> |"cb:res:snapshot {resources}"| TRes
  TRes --> |"cb:res:change {id,old,value}"| EVB
  TRes --> |"cb:res:set {id,value}"| EVB
  EVB  --> |"cb:res:reset"| TRes

  %% =========================================
  %% Build-Tab: Ereignisse
  %% =========================================
  EVB --> |"cb:registry:ready / cb:registry:snapshot"| TBuild
  TBuild --> |"req:buildmenu:show"| EVB

  %% =========================================
  %% Paths-Tab: Ereignisse
  %% =========================================
  TPaths --> |"cb:path:overlay:on/off"| EVB
  TPaths --> |"cb:path:heatmap:on/off"| EVB
  TPaths --> |"cb:overlay-heat-reset"| EVB
  EVB    --> |"cb:path:trace {from,to,len?,id?}"| TPaths

  %% =========================================
  %% UI-Tab: Ereignisse
  %% =========================================
  TUI --> |"req:build:open/close/toggle"| EVB
  TUI --> |"req:res:snapshot"| EVB

  %% =========================================
  %% Diagnose-Tab: Ereignisse
  %% =========================================
  TDiag --> |"req:registry:snapshot"| EVB
  TDiag --> |"req:res:snapshot"| EVB
  EVB   --> |"cb:game:tick {fps,dt}"| TDiag

  %% =========================================
  %% Tests-Tab: Aktionen
  %% =========================================
  TTests --> |"eventscan: run()"| EventScan
  TTests --> |"cb:tests:eventscan:start/done"| EVB
  TTests --> |"engine: ping/reset"| Game
  TTests --> |"hud: reload/init"| HUD
  TTests --> |"assets: reloadAll/loadAll"| Assets

  %% =========================================
  %% Sichtbarkeit / Overlay-Toggle (CSS-Logik)
  %% =========================================
  classDef gray fill:#2b2b30,stroke:#666,color:#eee;
  classDef core fill:#3a404a,stroke:#999,color:#fff;
  classDef tab  fill:#eceef2,stroke:#222,color:#111;
  class CORE core
  class TABS tab
  class EVB gray
  class ENG gray
  class DATA gray
```

## Legende
- **Core → Tabs (mount)**: Jeder Tab registriert sich beim Inspector-Core mit `mount(tabId, onShow)`.
- **EventBus (window)**: Lose Kopplung über `CustomEvent`s (`cb:*`/`req:*`). Pfeile beschriften den Ereignis-Typ.
- **Registry/ResVals**: Definitionsdaten & Live-Ressourcen; der Ressourcen-Tab merged beides.
- **Diagnose**: zieht Snapshots aus Registry/Assets/MapRuntime und konsumiert `cb:game:tick`.
- **Tests**: ruft `EventScan.run()` auf und bietet Engine-/HUD-/Assets-Aktionen.
- **Logs**: liest `CBLog` (buffer/history) und tappt neue Einträge live.

> Sichtbarkeit: Der Inspector wird per CSS sichtbar, wenn `body.is-inspector` (oder `body.inspector-open`) gesetzt ist.
