# Neue Siedler – Asset Audit Browser

Diese Datei ist ein reines Prüfwerkzeug für den Asset-Audit A–F.

## Empfohlener Ablageort

`tools/asset-audit/index.html`

## Nutzung

1. Datei in den gewünschten Audit-/Entwicklungsbranch legen.
2. Über GitHub Pages oder einen lokalen/static Webserver öffnen.
3. Oben den zu prüfenden Branch eintragen, z. B. `asset-audit`.
4. `Bestand laden` drücken.
5. Assets mit `BEHALTEN / AUSWAHL / LEGACY / ENTFÄLLT` markieren.
6. Notizen ergänzen.
7. Entscheidungen als JSON oder CSV exportieren oder die Ansicht drucken.

Die Audit-Seite verändert keine Dateien im Repository. Markierungen werden nur im Browser-LocalStorage gespeichert.

Wichtig: Ein direktes Öffnen als `file://...` funktioniert je nach Browser, aber für zuverlässiges Laden der GitHub-Inhalte sollte die Seite über HTTP/HTTPS laufen, z. B. GitHub Pages.
