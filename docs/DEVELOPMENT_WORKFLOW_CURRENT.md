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
- `main` remains intentionally unchanged as historical old-game reference.
- CR-22 remains LOCKED until the cleanup verification is fully PASS / 0 BLOCKER.

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-21 – Reservation-Controlled Traffic Execution Foundation | FROZEN / PASS / 0 BLOCKER | Regression only |
| 2 | Pre-CR22 file / architecture cleanup | IMPLEMENTED | Verify modular baseline and legacy separation |
| 3 | Pre-CR22 documentation cleanup | IMPLEMENTED | Verify current README and legacy relocation |
| 4 | Pre-CR22 branch cleanup | ACTIVE / PENDING | Classify and remove obsolete branches safely |
| 5 | Pre-CR22 cleanup verification gate | LOCKED until branch cleanup complete | Run final cleanup gate only after all cleanup dimensions pass |
| 6 | CR-22 | LOCKED | Do not start before cleanup PASS / 0 BLOCKER |

## 3. Frozen CR-21 contract

CR-21 remains immutable and establishes the one-cell reservation-controlled traffic execution chain:

`Next-Cell Intent → REQUESTED Reservation → frozen CR-19 Arbitration → GRANTED / WAITING → exactly one reserved-cell entry → CONSUMED → CR-20 Blocking release → readiness for a later next intent`

The cleanup may not alter this behavior.

## 4. File / architecture cleanup already performed

On `maintenance/pre-cr22-repository-cleanup`:

- the historical root monolith directories `core/`, `data/`, `demo/`, `qa/`, `schemas/` and `ui/` no longer carry their old runtime contents in the modular baseline,
- each former legacy runtime directory contains only a `LEGACY_REMOVED.md` marker explaining that history remains available through Git and `main`,
- the active runtime remains exclusively under `src/`,
- visual/art assets under `assets/` were preserved,
- generated root snapshots `filelist-audit.txt`, `filelist.json` and `filelist.txt` were removed,
- old root structure documents were relocated to `docs/legacy/`,
- the root README was replaced with a current modular-baseline README.

This cleanup must not be declared final until its dedicated verification passes.

## 5. Branch cleanup rules

The repository currently contains many historical CR-A/B/C, freeze, patch, temp, migration/design and infrastructure branches.

Branch cleanup must:

- keep `main`,
- keep `gh-pages` because it serves deployment,
- keep `frozen/cr-21-reservation-controlled-traffic-execution-foundation` as the current rollback point,
- keep `maintenance/pre-cr22-repository-cleanup` while cleanup is active,
- preserve a branch only when it has a concrete special purpose or unique content not safely represented elsewhere,
- remove obsolete CR-A/B/C, old freeze, patch and temp branches once containment or obsolescence is verified,
- inspect special branches such as `Assets`, old S2D/SA/IM and infrastructure branches before deletion rather than deleting them blindly.

## 6. Cleanup verification requirements

Before CR-22 may start, all of the following must be true:

1. CR-21 freeze regression remains PASS / 0 BLOCKER.
2. Active modular runtime is still `src/main.js` + `src/**`.
3. Historical monolith runtime is not present in the cleaned modular baseline.
4. Assets remain present and unchanged by destructive cleanup.
5. Misleading root documentation is removed or clearly relocated to `docs/legacy/`.
6. Current README describes the modular architecture, not the old Inspector/monolith architecture.
7. Obsolete branch set is reduced to a small justified set of active/frozen/special branches.
8. Cleanup CI and browser/device status are synchronized.
9. Only after all of the above: **Pre-CR22 Repository Cleanup = PASS / 0 BLOCKER**.

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

**Updated:** 2026-09-04 during the mandatory Pre-CR22 repository cleanup. File/architecture and root-document cleanup are implemented; branch cleanup remains active/pending.
