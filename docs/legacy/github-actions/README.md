# Legacy GitHub Actions – CI-00

Stand: 2026-09-02

Im Rahmen von **CI-00 – GitHub Actions Consolidation & Baseline** wurden überlappende, veraltete oder unnötig häufig laufende Workflows aus `.github/workflows/` entfernt. Die vollständigen historischen Inhalte bleiben über die Git-Historie erhalten.

## Entfernte Workflows

- `asset-fix.yml` – einmaliges/manuelles Asset-Normalisierungswerkzeug; kein Bestandteil der laufenden CI.
- `build-split-monolith.yml` – durch `code-bundle.yml` / neuen `Code Snapshot` ersetzt.
- `danger.yml` – unvollständig bzw. ohne belastbare Projektkonfiguration; entfernt.
- `export-filelist.yml` – lief auf praktisch jedem Push und erzeugte unnötige Actions-Last; entfernt.
- `filelist.yml` – alter Filelist-Erzeuger; für die aktuelle CI nicht erforderlich.
- `monolith.yml` – redundanter Monolith-Exporter; durch den konsolidierten Snapshot-Workflow ersetzt.
- `preview.yml` – automatisches PR-Deployment in die gemeinsame Pages-Umgebung entfernt; ersetzt durch kontrolliertes `pages.yml`.

## Aktive Workflows nach CI-00

1. `ci.yml` – dependency-freies Syntax- und Struktur-Gate. Läuft auf relevanten Codeänderungen und PRs gegen `main`.
2. `pages.yml` – Stable-Deployment von `main`; Feature-Stände nur bewusst über `workflow_dispatch`.
3. `code-bundle.yml` – konsolidierter Code-Snapshot mit ZIP, Monolith und SHA-256-Manifest; auf `main` und manuell.

## Kosten-/Privat-Strategie

Die Workflows sind bewusst sparsam aufgebaut: keine täglichen Schedules, keine unnötigen npm-Installationen, kurze Timeouts, `concurrency` mit Abbruch veralteter Runs und kurze Artifact-Retention. Dadurch bleibt die Struktur auch dann sinnvoll, wenn das Repository später privat geschaltet wird.

## Nächster Ausbau

Die CI-Baseline prüft Repository-Syntax und Struktur. Fachliche Contract-/Regressionstests (z. B. CR-02 Ressourceninvarianten und CR-03A deterministisches Matching) werden als eigener nächster Test-Layer ergänzt, sobald die jeweiligen Test-Hooks verbindlich vorliegen.
