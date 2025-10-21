
  🧩 Inspector – Gesamtstruktur & Dateirollen
  
  * Projekt : Neue Siedler
  * Codes + Inspektor-Vorgaben + Lastenheft


  -----------------------------------------------------------------------
  | Ebene | Datei | Zweck / Funktion | Schnittstellen / Events | Status 
  |:------|:------|:----------------|:---------------------|:--------------|
  | Core-API-Anbindung | ui/inspector/inspector.api-bridge.js | Stellt eine einheitliche Bridge bereit → definiert window.InspectorAPI.{open,close,toggle}; erkennt ältere window.Inspector.*- oder event-basierte Varianten | Lauscht auf `cb:insp:open | closeund feuert ggf.cb:insp:toggle`. Keine UI. |
  | Basis-Overlay / Fenster | ui/ui-inspector.js | Hauptmodul des Inspector-Fensters (Overlay). Steuert Tabs (Logs, Tests, Ressourcen, Pfade, Editor). Öffnen/Schließen über Button unten rechts. | `cb:insp:open | close |
  | Hooks (Live-Datenanzeigen) | ui/inspector/inspector-hooks.js | Kleine Overlays (z. B. Tür-/Entrance-Vorschau). Reagieren direkt auf cb:place:preview und zeigen Text / Debug-Infos. | Listener auf cb:place:preview | ✅ aktiv (siehe dein Monolith) |
  | Tabs – Logs | ui/inspector/inspector.tab.logs.js (oder innerhalb ui-inspector.js integriert) | Zeigt Logmeldungen (✅ ⚠ ❌ ℹ) mit Filter & Export. | cb:insp:export:logs | integriert |
  | Tabs – Tests | ui/inspector/inspector.tests.js | Test-Suite (Engine-Ping, Carrier, Pfad, Tür usw.) + neu: Event-Scan-Sektion. | kann beliebige Tests über GameTests.* anstoßen und CBLog nutzen | ✅ du hast aktuellste Version (v18.15.0) |
  | Tabs – Ressourcen | ui/inspector/inspector.tab.resources.js | Zeigt aktuelle Ressourcen, ermöglicht + / – / Reset. | arbeitet mit `cb:res:snapshot | change` | 
  | Tabs – Pfade | ui/inspector/inspector.tab.paths.js | Steuert Pfad-Overlay & Heatmap. | sendet `cb:path:overlay:on | off, cb:path:heatmap:on
  | Tabs – Editor | ui/inspector/inspector.tab.editor.js | Zugriff auf Map/Level-Editor; Laden/Speichern/Export. | cb:editor:* | später aktiv |
  | Event-Scan API (neu) | ui/inspector/events.scan.js | Zentrale Hilfsbibliothek für alle Tabs, die Skripte im Browser nach cb:/req:/emit: durchsuchen. | keine externen Events; liefert Promise + MD-Ergebnis (EventScan.run()). | ✅ eingebunden |
  | Tabs – Events (optional) | ui/inspector/inspector.tab.events.js | Anzeige-Tab, nutzt EventScan nur für Lesen/Export; kann optional bleiben. | intern – keine neuen Events | optional / reduzierbar |


  graph TD
    A[index.html] --> B[ui/ui-inspector.js]
    B --> C[inspector.api-bridge.js]
    B --> D[inspector.tests.js]
    B --> E[inspector.tab.logs.js]
    B --> F[inspector.tab.resources.js]
    B --> G[inspector.tab.paths.js]
    B --> H[inspector.tab.editor.js]
    D --> I[events.scan.js]
    D -->|cb:insp:export:logs/json| B
    B -->|cb:path:overlay:on/off| core_path_overlay
    B -->|cb:editor:*| core_editor
    core_path_overlay --> B
    core_registry --> B
    subgraph LiveHooks
      K[inspector-hooks.js]
    end
    core_build -->|cb:place:preview| K
    


  
    assets/inspector/
      inspector.css
      inspector.core.js
      inspector.logs.js
      inspector.build.js
      inspector.paths.js
      inspector.tests.js


    ui/inspector/events.scan.js
    Version : v1.0.0 (2025-10-21)
    Zweck   : Browserseitiger Event-Scanner (cb:/req:/emit:) als wiederverwendbare API
    Exports : window.EventScan = { run(), toMD(rows), lastMD, download(md?) }
    ui/inspector/inspector-hooks.js ??? kommentieren
    ui/inspector/inspector.api-bridge.js
    Inspector API Bridge
    Version: v1.0.0
    Zweck: Stellt die Lastenheft-API (InspectorAPI.open/close/toggle) bereit, falls der geladene Inspector sie (noch) nicht exportiert.
    Regel:  1) Wenn InspectorAPI bereits existiert → nichts tun.
            2) Wenn es eine alte API gibt (window.Inspector.*) → darauf adaptieren.
            3) Wenn es nur Event-basierte Varianten gibt → Events abfeuern.
            4) Als allerletzter Fallback: versuche sichtbares Overlay zu togglen.


    ui/inspector/inspector.paths.js
    Inspector Pfade
    ui/inspector/inspector.resources.js
    Inspector Ressourcen
    ui/inspector/inspector.tab.events.js
    Browser-Scanner (cb:/req:/emit:)
    – Ergebnis als Tabelle + "Download MD"
    ui/inspector/inspector.tests.js
    - Kleine, nützliche Testhelfer mit Logs
    - + NEU: Sektion "Events" (Browser-Scan via EventScan-API)
    ui/inspector/overlay.hooks.js
    Zweck:    Nur ein leichter „Sicherheitsgurt“, der bei Bedarf ein kleines Fallback-Modal zeigt – und es automatisch wieder entfernt, sobald der echte Inspector läuft.
    Version:  v1.4
