# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Read this file plus the actual branch/HEAD, current gates and CI before every write.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main`
- Current development branch: `maintenance/pre-cr22-repository-cleanup`
- Current active action: **Pre-CR22 Repository Cleanup**
- Frozen baseline: **CR-21 – Reservation-Controlled Traffic Execution Foundation**
- CR-21 frozen SHA: `4cb7261dc2325767070177a68f951df69b7523fd`
- Dedicated rollback branch: `frozen/cr-21-reservation-controlled-traffic-execution-foundation`
- Pre-CR22 file/architecture cleanup gate: **PASS / 0 BLOCKER**, GitHub Actions run `33909908758` / run #4787
- `main` remains intentionally unchanged as historical old-game reference.
- CR-22 remains LOCKED until the cleanup verification is fully PASS / 0 BLOCKER.

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-21 – Reservation-Controlled Traffic Execution Foundation | FROZEN / PASS / 0 BLOCKER | Regression only |
| 2 | Pre-CR22 file / architecture cleanup | PASS / 0 BLOCKER | Frozen for cleanup; do not reintroduce monolith |
| 3 | Pre-CR22 documentation cleanup | PASS / 0 BLOCKER | Keep current README / Legacy separation |
| 4 | Pre-CR22 branch cleanup | ACTIVE / PENDING | Classify and remove obsolete branches safely |
| 5 | Pre-CR22 cleanup verification gate | LOCKED until branch cleanup complete | Run final cleanup gate only after all cleanup dimensions pass |
| 6 | CR-22 | LOCKED | Do not start before cleanup PASS / 0 BLOCKER |

## 3. Frozen CR-21 contract

CR-21 remains immutable and establishes the one-cell reservation-controlled traffic execution chain:

`Next-Cell Intent → REQUESTED Reservation → frozen CR-19 Arbitration → GRANTED / WAITING → exactly one reserved-cell entry → CONSUMED → CR-20 Blocking release → readiness for a later next intent`

The cleanup may not alter this behavior.

## 4. File / architecture cleanup – verified

On `maintenance/pre-cr22-repository-cleanup`:

- the historical root monolith directories `core/`, `data/`, `demo/`, `qa/`, `schemas/` and `ui/` no longer carry their old runtime contents in the modular baseline,
- each former legacy runtime directory contains only a `LEGACY_REMOVED.md` marker explaining that history remains available through Git and `main`,
- the active runtime remains exclusively under `src/`,
- visual/art assets under `assets/` were preserved,
- generated root snapshots `filelist-audit.txt`, `filelist.json` and `filelist.txt` were removed,
- old root structure documents were relocated to `docs/legacy/`,
- the root README now describes the modular baseline and no longer defines the old Inspector/monolith architecture as current.

GitHub Actions run `33909908758` / run #4787 completed the explicit step:

`Run Pre-CR22 file/architecture cleanup gate + CR-21 frozen regression`

with **PASS / 0 BLOCKER**.

## 5. Branch cleanup – current evidence

The repository had more than 100 historical branches before cleanup classification.

Verified as fully contained in the CR-21 frozen line (`behind_by: 0` when compared to `frozen/cr-21-reservation-controlled-traffic-execution-foundation`):

- `feature/cr-01a-stable-ids-world-store` – early CR-line representative,
- `feature/cr-16c-deadlock-resolution-policy-temp` – temporary CR branch,
- `feature/cr-20c-reservation-lifecycle-traffic-integration` – previous frozen-system branch,
- `Assets` – asset branch content is contained in the current frozen line.

This evidence confirms that old CR-line and temp branches can be candidates for removal once the branch-ref deletion operation is available.

Not safe to delete blindly:

- `DrHoschi-patch-1` is **diverged** and has at least one commit not contained in CR-21 (`behind_by: 1`).
- Other patch, S2D, SA, IM and infrastructure branches require the same unique-content check before deletion.

Branches that must be retained:

- `main` – historical old-game reference,
- `gh-pages` – deployment,
- `frozen/cr-21-reservation-controlled-traffic-execution-foundation` – current verified rollback point,
- `maintenance/pre-cr22-repository-cleanup` – active cleanup branch until completion.

## 6. Cleanup verification requirements

Before CR-22 may start, all of the following must be true:

1. CR-21 freeze regression remains PASS / 0 BLOCKER.
2. Active modular runtime is still `src/main.js` + `src/**`.
3. Historical monolith runtime is not present in the cleaned modular baseline.
4. Assets remain present and protected from destructive cleanup.
5. Misleading root documentation is removed or clearly relocated to `docs/legacy/`.
6. Current README describes the modular architecture, not the old Inspector/monolith architecture.
7. Obsolete branch set is reduced to a small justified set of active/frozen/special branches.
8. Cleanup CI and browser/device status are synchronized.
9. Only after all of the above: **Pre-CR22 Repository Cleanup = PASS / 0 BLOCKER**.

Requirements 1–6 are currently verified. Requirement 7 remains open; therefore the final cleanup gate remains locked and CR-22 remains locked.

## 7. Source-of-truth / branch rules

Before every write verify repository, target branch, actual HEAD, active action, frozen predecessor, scope, tests and CI. Keep current modular work off `main` until the planned running-game integration point.

For future CRs use one branch per overall CR; A/B/C normally run sequentially on that same branch. Additional branches require a concrete risk justification.

## 8. Known process traps

- Do not infer current state from chat history.
- Do not reopen CR-21 while cleaning the repository.
- Do not delete assets as part of legacy cleanup.
- Do not delete special branches without first checking whether they contain unique material.
- Do not mark cleanup complete while branch cleanup is still pending.
- Do not start CR-22 before the final cleanup gate is PASS / 0 BLOCKER.
- Keep browser/device text synchronized with the actual cleanup state.

---

**Updated:** 2026-09-04 after Pre-CR22 file/architecture cleanup PASS / 0 BLOCKER. Branch cleanup remains the only open cleanup dimension before the final cleanup gate.
