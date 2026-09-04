# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Read this file plus the actual branch/HEAD, current gates, `docs/ROADMAP_CURRENT.md` and CI before every write.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main`
- Current development branch: `maintenance/pre-cr22-repository-cleanup`
- Current active action: **Pre-CR22 Repository Cleanup / Roadmap Integration Gate – FINALIZATION**
- Current roadmap: `docs/ROADMAP_CURRENT.md`
- Frozen gameplay baseline: **CR-21 – Reservation-Controlled Traffic Execution Foundation**
- CR-21 frozen SHA: `4cb7261dc2325767070177a68f951df69b7523fd`
- Dedicated rollback branch: `frozen/cr-21-reservation-controlled-traffic-execution-foundation`
- `main` remains intentionally unchanged only as **historical functional and visual old-game reference**. It is not development basis, architecture basis, code source or integration target.
- Target relative to old `main`: **functional parity or better, not code parity**.
- Branch cleanup target: exactly `main`, `gh-pages`, CR-21 rollback and current maintenance branch.
- Browser/device verification: **PASS**, manually confirmed on iPad/Safari on 2026-09-04.
- Integrated candidate CI: GitHub Actions run `33919957496` / run #4800 = **SUCCESS**.
- Final documentation/browser synchronization is being committed and must receive one final green CI before the cleaned baseline is frozen for CR-22.

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-21 – Reservation-Controlled Traffic Execution Foundation | FROZEN / PASS / 0 BLOCKER | Regression only |
| 2 | Pre-CR22 file / architecture cleanup | PASS / 0 BLOCKER | Keep frozen cleanup boundary |
| 3 | Pre-CR22 documentation cleanup | PASS / 0 BLOCKER | Keep README / Legacy separation |
| 4 | IM ↔ CR roadmap reconciliation | PASS / 0 BLOCKER | `ROADMAP_CURRENT.md` is current bridge |
| 5 | Pre-CR22 branch classification / reduction | PASS / 0 BLOCKER | Retain only justified four-branch set |
| 6 | Pre-CR22 browser / device verification | PASS / 0 BLOCKER | Final status synchronized |
| 7 | Pre-CR22 final cleanup / roadmap integration gate | FINAL CI PENDING | Freeze cleaned baseline after final green CI |
| 8 | CR-22 | LOCKED UNTIL BASELINE FREEZE | Create only from recorded cleaned baseline |

## 3. Frozen CR-21 contract

CR-21 remains immutable and establishes:

`Next-Cell Intent → REQUESTED Reservation → frozen CR-19 Arbitration → GRANTED / WAITING → exactly one reserved-cell entry → CONSUMED → CR-20 Blocking release → readiness for a later next intent`

Cleanup may not alter this behavior.

## 4. File / architecture cleanup – PASS / 0 BLOCKER

On `maintenance/pre-cr22-repository-cleanup`:

- historical root monolith directories `core/`, `data/`, `demo/`, `qa/`, `schemas/`, `ui/` contain only `LEGACY_REMOVED.md`,
- active runtime is under `src/`,
- visual assets under `assets/` are preserved,
- generated root filelist snapshots are removed,
- historical structure documents are under `docs/legacy/`,
- README describes the modular baseline.

The file/architecture cleanup gate passed with GitHub Actions run `33909908758` / run #4787.

## 5. Roadmap reconciliation – PASS / 0 BLOCKER

`docs/ROADMAP_CURRENT.md` is the current bridge between historical IM capability planning and actual CR implementation.

Binding rules:

- IM and CR are not 1:1.
- Old IM branches are not automatically integrated.
- CR-00…CR-21 establish major runtime/resources/logistics/navigation/traffic foundations.
- Open product areas remain buildings, persons/housing/workforce, construction, production/BuildingStock, economy, path wear, SaveGame, UI, Inspector and V1 end-to-end integration.
- Exact future CR titles are defined one whole CR at a time after this cleanup gate.
- Old `main` behavior is product reference only; desired functions are reimplemented through the modular architecture.

## 6. Branch cleanup – PASS / 0 BLOCKER

Historical branches were classified before deletion as KEEP, SAFE DELETE – CONTAINED, ARCHIVE/EXTRACT THEN DELETE or REVIEW REQUIRED.

Useful unique content from divergent IM/CI branches was reviewed and captured in `docs/legacy/pre-cr22/BRANCH_EXTRACTION_SUMMARY.md`. The final deletion plan is recorded in `docs/legacy/pre-cr22/FINAL_BRANCH_DELETION_LIST.md`.

Live remote verification on 2026-09-04 confirmed exactly four justified branches remain:

- `main` – historical functional/visual reference only,
- `gh-pages` – deployment/browser-device surface,
- `frozen/cr-21-reservation-controlled-traffic-execution-foundation` – rollback point,
- `maintenance/pre-cr22-repository-cleanup` – active cleanup/finalization branch.

Therefore **Pre-CR22 branch classification / reduction = PASS / 0 BLOCKER**.

## 7. Browser / device verification – PASS / 0 BLOCKER

On 2026-09-04 the deployed Pre-CR22 Final Cleanup Gate was opened and manually confirmed on the real iPad/Safari target surface. The page rendered correctly, runtime status showed READY and the synchronized cleanup status was visible without layout or deployment blocker.

This closes the manual browser/device requirement.

## 8. Final Pre-CR22 verification requirements

Completed:

1. CR-21 regression PASS / 0 BLOCKER.
2. Modular runtime remains `src/**`.
3. Historical monolith is absent from cleaned modular baseline.
4. Assets remain preserved.
5. Legacy docs remain clearly separated.
6. README remains aligned to modular architecture.
7. `ROADMAP_CURRENT.md` remains current.
8. Branch classification/reduction PASS with exactly the justified retained set.
9. Extracted unique historical evidence archived.
10. Integrated cleanup candidate CI green: run #4800 / `33919957496` SUCCESS.
11. Browser/device status synchronized and manually confirmed PASS.
12. Old `main` remains reference only; the new game remains a clean modular rebuild targeting functional parity or better, never legacy-code parity.

Remaining finalization step:

13. This final synchronized documentation/browser commit receives green CI.
14. Its exact commit SHA is frozen on a dedicated cleaned-baseline branch and becomes the only permitted parent for the next CR whole-system branch.
15. Then: **Pre-CR22 Repository Cleanup / Roadmap Integration Gate = PASS / 0 BLOCKER** and CR-22 is unlocked.

## 9. Source-of-truth / branch rules

Before every write verify repository, target branch, actual HEAD, active action, frozen predecessor, scope, tests and CI. Keep modular work off `main` until an explicit repository-level transition is separately decided.

For future CRs use one branch per overall CR; A/B/C normally run sequentially on that same branch. Extra branches require a concrete risk justification.

## 10. Known process traps

- Do not infer current state from chat history.
- Do not reopen CR-21 during cleanup.
- Do not delete assets as legacy cleanup.
- Do not equate old IM branches with current implementation completeness.
- Do not start CR-22 before the cleaned baseline is frozen after final green CI.
- Do not turn Inspector into a second gameplay owner.
- Do not use old `main` code/architecture as implementation target.
- Keep browser/device text synchronized with actual gate state.

---

**Updated:** 2026-09-04 after manual browser/device PASS and integrated CI success. Final synchronized commit is awaiting its last CI run; after that exact SHA is frozen as the Pre-CR22 cleaned baseline.
