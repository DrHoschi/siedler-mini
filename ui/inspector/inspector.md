  * Projekt : Neue Siedler
  
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
