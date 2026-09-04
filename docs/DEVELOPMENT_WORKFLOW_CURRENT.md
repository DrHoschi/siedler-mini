# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Read this file plus the actual branch/HEAD, current gates, `docs/ROADMAP_CURRENT.md` and CI before every write.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main`
- Current development branch: `maintenance/pre-cr22-repository-cleanup`
- Current active action: **Pre-CR22 Roadmap / Integration Audit + Repository Cleanup**
- Current roadmap: `docs/ROADMAP_CURRENT.md`
- Frozen historical planning reference: `docs/S2D-06_ROADMAP_VALIDATION.md`
- Frozen gameplay baseline: **CR-21 – Reservation-Controlled Traffic Execution Foundation**
- CR-21 frozen SHA: `4cb7261dc2325767070177a68f951df69b7523fd`
- Dedicated rollback branch: `frozen/cr-21-reservation-controlled-traffic-execution-foundation`
- Pre-CR22 file/architecture cleanup gate: **PASS / 0 BLOCKER**, GitHub Actions run `33909908758` / run #4787
- `main` remains intentionally unchanged as historical old-game reference.
- CR-22 remains LOCKED until the roadmap/integration audit, branch cleanup and final cleanup verification are fully PASS / 0 BLOCKER.

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-21 – Reservation-Controlled Traffic Execution Foundation | FROZEN / PASS / 0 BLOCKER | Regression only |
| 2 | Pre-CR22 file / architecture cleanup | PASS / 0 BLOCKER | Frozen for cleanup; do not reintroduce monolith |
| 3 | Pre-CR22 documentation cleanup | PASS / 0 BLOCKER | Keep current README / Legacy separation |
| 4 | IM ↔ CR roadmap reconciliation | IMPLEMENTED / AUDIT ACTIVE | Verify current capability mapping and use it for branch/content classification |
| 5 | Pre-CR22 branch unique-content classification | ACTIVE / PENDING | Compare old CR/IM/SA/S2D/patch/infrastructure branches; do not delete unknown/diverged work |
| 6 | Pre-CR22 branch deletion/reduction | LOCKED until classification proves safety | Delete only branches classified SAFE DELETE – CONTAINED or explicitly archived first |
| 7 | Pre-CR22 final cleanup / roadmap integration gate | LOCKED until branch audit/reduction complete | Run final regression/CI/browser-device verification |
| 8 | CR-22 | LOCKED | Create only from the recorded cleaned baseline after final PASS / 0 BLOCKER |

## 3. Frozen CR-21 contract

CR-21 remains immutable and establishes the one-cell reservation-controlled traffic execution chain:

`Next-Cell Intent → REQUESTED Reservation → frozen CR-19 Arbitration → GRANTED / WAITING → exactly one reserved-cell entry → CONSUMED → CR-20 Blocking release → readiness for a later next intent`

The cleanup and roadmap audit may not alter this behavior.

## 4. Current roadmap reconciliation

`docs/ROADMAP_CURRENT.md` is the current bridge between the old frozen IM roadmap and the real CR implementation.

Rules:

- `S2D-06_ROADMAP_VALIDATION.md` remains a frozen historical/product-migration reference and is not silently rewritten.
- IM numbers describe capability/migration areas; CR numbers describe actual modular system blocks.
- IM and CR are not 1:1.
- Old IM branches are not automatically treated as integrated.
- CR-00…CR-21 have strongly advanced runtime/resources/logistics/navigation/traffic foundations, but major product areas remain open: buildings, persons/housing/workforce, construction, production/BuildingStock, economy, path wear, SaveGame, UI, Inspector and V1 end-to-end integration.
- Future CRs continue the modular implementation and must state which open IM capability objectives they advance.
- Exact future CR titles are defined one whole CR at a time after the cleanup gate; do not invent or freeze a long CR-number list prematurely.

## 5. File / architecture cleanup – verified

On `maintenance/pre-cr22-repository-cleanup`:

- the historical root monolith directories `core/`, `data/`, `demo/`, `qa/`, `schemas/` and `ui/` no longer carry their old runtime contents in the modular baseline,
- each former legacy runtime directory contains only a `LEGACY_REMOVED.md` marker explaining that history remains available through Git and `main`,
- the active runtime remains exclusively under `src/`,
- visual/art assets under `assets/` were preserved,
- generated root snapshots `filelist-audit.txt`, `filelist.json` and `filelist.txt` were removed,
- old root structure documents were relocated to `docs/legacy/`,
- the root README now describes the modular baseline and no longer defines the old Inspector/monolith architecture as current.

GitHub Actions run `33909908758` / run #4787 completed:

`Run Pre-CR22 file/architecture cleanup gate + CR-21 frozen regression`

with **PASS / 0 BLOCKER**.

## 6. Branch cleanup – classification before deletion

The repository had more than 100 historical branches before cleanup classification.

No branch may now be deleted solely because it is old or appears superseded.

Every historical branch must be classified as one of:

- **KEEP** – current/frozen/deployment/reference/infrastructure purpose,
- **SAFE DELETE – CONTAINED** – no unique work outside retained history,
- **ARCHIVE/EXTRACT THEN DELETE** – useful unique content must first be preserved in the cleaned line or explicit legacy archive,
- **REVIEW REQUIRED** – divergent/unknown content; deletion prohibited until resolved.

Already verified as fully contained in the CR-21 frozen line (`behind_by: 0` when compared to `frozen/cr-21-reservation-controlled-traffic-execution-foundation`):

- `feature/cr-01a-stable-ids-world-store`,
- `feature/cr-16c-deadlock-resolution-policy-temp`,
- `feature/cr-20c-reservation-lifecycle-traffic-integration`,
- `Assets`.

Not safe to delete blindly:

- `DrHoschi-patch-1` is diverged and has unique history.
- old IM branches are not the active architecture and can be diverged from the CR line; their useful planning/evidence must be checked before deletion.
- remaining patch, S2D, SA and infrastructure branches require the same unique-content check.

Branches that must be retained during this transition:

- `main` – historical old-game reference,
- `gh-pages` – deployment,
- `frozen/cr-21-reservation-controlled-traffic-execution-foundation` – current verified rollback point,
- `maintenance/pre-cr22-repository-cleanup` – active cleanup/audit branch.

## 7. Inspector / visual diagnostics direction

The Inspector remains a later runtime-analysis and balancing facility, not a gameplay owner and not a prerequisite for the immediate core systems.

As integrated systems are added, prepare them so the Inspector can later consume public snapshots/events and show:

- buildings, units/residents/workers,
- jobs/assignments/reservations,
- resources/BuildingStocks/construction,
- navigation/routes/occupancy/wait/deadlock/reservation state,
- scheduler/tick/render/performance metrics,
- event trace,
- SaveGame diagnostics,
- balancing parameters and long-running simulation statistics,
- visual overlays and automated invariant/gate results.

Automated tests remain executable test/gate code. The Inspector may expose their results, evidence, controlled scenarios and visual diagnostics. Disabling the Inspector must never change gameplay.

## 8. Cleanup / roadmap integration verification requirements

Before CR-22 may start, all of the following must be true:

1. CR-21 freeze regression remains PASS / 0 BLOCKER.
2. Active modular runtime is still `src/main.js` + `src/**`.
3. Historical monolith runtime is not present in the cleaned modular baseline.
4. Assets remain present and protected from destructive cleanup.
5. Misleading root documentation is removed or clearly relocated to `docs/legacy/`.
6. Current README describes the modular architecture, not the old Inspector/monolith architecture.
7. `docs/ROADMAP_CURRENT.md` reconciles IM objectives with actual CR implementation and identifies open capability areas.
8. Historical branches are fully classified for unique content before deletion.
9. Useful unique branch content is preserved or explicitly archived before its source branch is deleted.
10. Obsolete branch set is reduced to a small justified set of active/frozen/reference/infrastructure branches.
11. Cleanup regression/CI is green.
12. Browser/device/visual status is synchronized with the cleaned baseline.
13. Resulting cleaned commit is recorded as the baseline from which the CR-22 whole-system branch is created.
14. Only after all of the above: **Pre-CR22 Repository Cleanup / Roadmap Integration Gate = PASS / 0 BLOCKER**.

File/architecture requirements are already verified. Roadmap reconciliation is now implemented. Branch classification/reduction and the final integrated gate remain open; therefore CR-22 remains locked.

## 9. Source-of-truth / branch rules

Before every write verify repository, target branch, actual HEAD, active action, frozen predecessor, scope, tests and CI. Keep current modular work off `main` until the planned running-game integration point.

For future CRs use one branch per overall CR; A/B/C normally run sequentially on that same branch. Additional branches require a concrete risk justification.

## 10. Known process traps

- Do not infer current state from chat history.
- Do not reopen CR-21 while cleaning/auditing the repository.
- Do not delete assets as part of legacy cleanup.
- Do not delete a branch before integration/unique-content status is known.
- Do not equate old IM branch existence with current implementation completeness.
- Do not mark cleanup complete while branch classification/reduction is still pending.
- Do not start CR-22 before the final cleanup/roadmap integration gate is PASS / 0 BLOCKER.
- Do not turn the future Inspector into a second gameplay owner or patch layer.
- Keep browser/device text synchronized with the actual cleanup state.

---

**Updated:** 2026-09-04 after creation of the current IM ↔ CR roadmap reconciliation. File/architecture cleanup is PASS / 0 BLOCKER. Branch unique-content classification/reduction is the next required work before the final Pre-CR22 gate.