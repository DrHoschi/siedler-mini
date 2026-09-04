# Pre-CR22 – Branch Extraction Summary

Status: **EXTRACTION RECORDED – LEGACY CODE NOT REINTEGRATED**  
Datum: 2026-09-04  
Arbeitsbranch: `maintenance/pre-cr22-repository-cleanup`

## Zweck

Dieses Dokument sichert die fachlich bzw. infrastrukturell noch relevanten Erkenntnisse aus drei historischen Sonderbranches, bevor diese im Rahmen des Pre-CR22 Repository Cleanup entfernt werden dürfen.

Wichtig: Die alten Implementierungen werden **nicht** in die neue modulare CR-Architektur übernommen. Gesichert werden nur Referenz-/Planungs-/Evidence-Aspekte, die für spätere Entwicklung oder Verifikation nützlich bleiben können.

## 1. feature/im-00-baseline-safety-harness

Vergleich gegen `frozen/cr-21-reservation-controlled-traffic-execution-foundation`: **diverged**, 5 einzigartige Commits.

Gesicherte Erkenntnisse:
- Historischer Altstand wurde als reproduzierbare Referenz vermessen, nicht als Zielarchitektur freigegeben.
- Gerätebaseline bestätigte New Game, Continue, Produktion/Pause, HQ-Ressourcen-Credit und Ressourcenpersistenz im damals getesteten Umfang.
- Bekannte Altstand-Abweichung: Pfade wurden nicht gezeichnet; Rendering-Diagnostic startete deaktiviert.
- Quantitative Baseline zeigte starke Navigation-Failrate und GameUnits als dominanten GameTick-Kostenanteil; diese Werte sind historische Evidence, keine aktuelle Zielvorgabe.
- Timer-/Performance-Harness war rein beobachtend.

Nicht übernehmen:
- `core/im00.runtime-baseline.js`
- Änderungen an altem `core/boot-v1.js`

Quelle/Referenzbranch bleibt bis zur bestätigten Branch-Löschung nachvollziehbar: `feature/im-00-baseline-safety-harness`.

## 2. feature/im-01-owner-contracts

Vergleich gegen CR-21-Freeze: **diverged**, 24 einzigartige Commits.

Gesicherte fachliche Prinzipien:
- Read-Fassade, Command-Grenze und Domain-Event-Fassade waren als Ownership-/Integrationsgrenzen vorgesehen.
- Integrationsreihenfolge wurde ausdrücklich sequenziell behandelt, um Race-Bedingungen bei dynamischer Script-Ladung zu vermeiden.
- Der alte IM-01-Ansatz ist Referenz für Ownership-/API-Grenzen, aber keine Implementierungsbasis für die modulare CR-Linie.

Nicht übernehmen:
- `core/runtime.read-api.js`
- `core/runtime.command-api.js`
- `core/runtime.domain-events.js`
- `core/im01.contract-gate.js`
- zugehörige Änderungen an altem `core/boot-v1.js`

Die aktuelle Roadmap darf die fachliche Idee von klaren Owner-/Read-/Write-/Event-Grenzen berücksichtigen, ohne alten Monolith-Code zu integrieren.

## 3. infra/ci-00-actions-baseline

Vergleich gegen CR-21-Freeze: **diverged**, 19 einzigartige Commits.

Gesicherte Infrastruktur-Evidence:
- CI-00 enthielt einen absichtlich fehlerhaften Negativ-Fixture-Lauf, um zu beweisen, dass die CI tatsächlich rot wird; der Fixture wurde danach wieder entfernt.
- Historische Infrastructure-Änderungen betrafen u. a. `.github/workflows/ci.yml`, `code-bundle.yml`, `pages.yml`, `tools/ci-check.mjs` und `tools/verify-structure.js`.
- Diese Branch-Infrastruktur wird nicht blind übernommen. Maßgeblich ist die aktuelle CI auf der modularen Cleanup-Linie.
- GitHub Pages/Browser-Testfähigkeit bleibt als notwendige Projektfunktion erhalten; `gh-pages` wurde im Pre-CR22 Cleanup wiederhergestellt.

## 4. Ergebnis / Löschfreigabe

Nach dieser Extraktion können die drei Branches fachlich als **ARCHIVE/EXTRACT THEN DELETE – EXTRACTION COMPLETE** behandelt werden, sofern vor der tatsächlichen Löschung keine neue, noch nicht berücksichtigte Unique-Content-Evidence auftaucht:

- `feature/im-00-baseline-safety-harness`
- `feature/im-01-owner-contracts`
- `infra/ci-00-actions-baseline`

Die Extraktion ist ausdrücklich **kein Merge** und **keine Reaktivierung** der alten Architektur.
