# Pre-CR22 – Final Branch Deletion List

Status: **DELETION LIST PREPARED – MANUAL REMOTE DELETE REQUIRED**  
Datum: 2026-09-04  
Arbeitsbranch: `maintenance/pre-cr22-repository-cleanup`

## Keep – nicht löschen

Diese vier Branches bilden nach dem Cleanup den beabsichtigten Mindestbestand:

- `main` – historische funktionale/visuelle Altspiel-Referenz; keine Entwicklungsbasis
- `gh-pages` – Browser-/Device-Deployment-Branch; im Cleanup wiederhergestellt
- `frozen/cr-21-reservation-controlled-traffic-execution-foundation` – verbindlicher Gameplay-Rollback/Frozen-Baseline-Branch
- `maintenance/pre-cr22-repository-cleanup` – aktueller Cleanup-/Integrationsbranch

## SAFE DELETE – CONTAINED / superseded by frozen CR lineage

Die folgende CR-Branch-Historie wird nicht mehr als eigener Remote-Branch benötigt. Der relevante modulare Entwicklungsstand ist in der CR-21-Frozen-Linie enthalten und zusätzlich durch den dedizierten Frozen-Branch gesichert.

- `feature/cr-00-clean-runtime-foundation`
- `feature/cr-01-freeze-gate`
- `feature/cr-01a-stable-ids-world-store`
- `feature/cr-01b-world-map-structure`
- `feature/cr-01c-core-domain-stores`
- `feature/cr-02-freeze-gate`
- `feature/cr-02a-resource-state-contract`
- `feature/cr-02b-resource-reservation-claims`
- `feature/cr-02c-resource-demand-contract`
- `feature/cr-03-freeze-gate`
- `feature/cr-03b-reservation-assignment`
- `feature/cr-03c-assignment-consistency`
- `feature/cr-04-freeze-gate`
- `feature/cr-05-freeze-gate`
- `feature/cr-06-freeze-gate`
- `feature/cr-07-freeze-gate`
- `feature/cr-08-freeze-gate`
- `feature/cr-09-freeze-gate`
- `feature/cr-10-freeze-gate`
- `feature/cr-11-freeze-gate`
- `feature/cr-12-freeze-gate`
- `feature/cr-13-freeze-gate`
- `feature/cr-14-freeze-gate`
- `feature/cr-15-freeze-gate`
- `feature/cr-16-freeze-gate`
- `feature/cr-17-freeze-gate`
- `feature/cr-18-freeze-gate`
- `feature/cr-19-freeze-gate`
- `feature/cr-19a-cell-reservation-contract`
- `feature/cr-19b-deterministic-reservation-arbitration`
- `feature/cr-19c-reservation-movement-integration`
- `feature/cr-20a-reservation-lifecycle-state-contract`
- `feature/cr-20b-deterministic-reservation-expiry`
- `feature/cr-20c-reservation-lifecycle-traffic-integration`
- `feature/cr-21a-next-cell-reservation-intent-contract`
- `feature/cr-21b-deterministic-reservation-execution-cycle`
- `feature/cr-21b-deterministic-reservation-execution-cycle-freeze`
- `feature/cr-21c-reservation-controlled-step-movement-integration`

Zusätzliche bereits als contained bzw. nicht mehr eigenständig erforderlich bewertete Branches:

- `Assets`
- `DrHoschi-patch-3`
- `feature/s2d-05-content-catalog`
- `feature/s2d-06-roadmap-validation`
- `feature/sa-04-savegame-v2`

## ARCHIVE/EXTRACT THEN DELETE – EXTRACTION COMPLETE

Die Unique-Content-Prüfung ergab Divergenz. Die noch nützlichen fachlichen/infrastrukturellen Erkenntnisse wurden in `docs/legacy/pre-cr22/BRANCH_EXTRACTION_SUMMARY.md` gesichert; alter Monolith-/Legacy-Code wird nicht reintegriert.

Danach löschbar:

- `feature/im-00-baseline-safety-harness`
- `feature/im-01-owner-contracts`
- `infra/ci-00-actions-baseline`

## Zielzustand nach manueller Löschung

Erwarteter Remote-Branchbestand:

1. `main`
2. `gh-pages`
3. `frozen/cr-21-reservation-controlled-traffic-execution-foundation`
4. `maintenance/pre-cr22-repository-cleanup`

Nach der Löschung muss der Branchbestand live erneut enumeriert werden. Erst wenn genau der beabsichtigte Bestand vorhanden ist, folgen Cleanup-Regression, CI, Browser-/Device-Status-Synchronisierung und das finale Pre-CR22 Cleanup / Roadmap Integration Gate.

CR-22 bleibt bis zu diesem finalen PASS / 0 BLOCKER gesperrt.
