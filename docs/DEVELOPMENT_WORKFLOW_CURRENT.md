# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Read this file plus the actual branch/HEAD, current gates, `docs/ROADMAP_CURRENT.md` and CI before every write.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main`
- Current development branch: `maintenance/pre-cr22-repository-cleanup`
- Current active action: **Pre-CR22 Final Cleanup / Roadmap Integration Gate**
- Current roadmap: `docs/ROADMAP_CURRENT.md`
- Frozen gameplay baseline: **CR-21 – Reservation-Controlled Traffic Execution Foundation**
- CR-21 frozen SHA: `4cb7261dc2325767070177a68f951df69b7523fd`
- Dedicated rollback branch: `frozen/cr-21-reservation-controlled-traffic-execution-foundation`
- `main` remains intentionally unchanged only as **historical functional and visual old-game reference**. It is not development basis, architecture basis, code source or integration target.
- Target relative to old `main`: **functional parity or better, not code parity**.
- CR-22 remains LOCKED until final regression/CI plus browser/device verification are PASS / 0 BLOCKER.

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-21 – Reservation-Controlled Traffic Execution Foundation | FROZEN / PASS / 0 BLOCKER | Regression only |
| 2 | Pre-CR22 file / architecture cleanup | PASS / 0 BLOCKER | Keep frozen cleanup boundary |
| 3 | Pre-CR22 documentation cleanup | PASS / 0 BLOCKER | Keep README / Legacy separation |
| 4 | IM ↔ CR roadmap reconciliation | PASS / 0 BLOCKER | Use `ROADMAP_CURRENT.md` as current bridge |
| 5 | Pre-CR22 branch classification / reduction | PASS / 0 BLOCKER | Retain only justified four-branch set |
| 6 | Pre-CR22 final cleanup / roadmap integration gate | ACTIVE / CI + DEVICE PENDING | Run integrated regression, CI and browser/device verification |
| 7 | CR-22 | LOCKED | Create only from recorded cleaned baseline after final PASS / 0 BLOCKER |

## 3. Frozen CR-21 contract

CR-21 remains immutable and establishes:

`Next-Cell Intent → REQUESTED Reservation → frozen CR-19 Arbitration → GRANTED / WAITING → exactly one reserved-cell entry → CONSUMED → CR-20 Blocking release → readiness for a later next intent`

Cleanup may not alter this behavior.

## 4. File / architecture cleanup – verified

On `maintenance/pre-cr22-repository-cleanup`:

- historical root monolith directories `core/`, `data/`, `demo/`, `qa/`, `schemas/`, `ui/` contain only `LEGACY_REMOVED.md`,
- active runtime is under `src/`,
- visual assets under `assets/` are preserved,
- generated root filelist snapshots are removed,
- historical structure documents are under `docs/legacy/`,
- README describes the modular baseline.

The file/architecture cleanup gate previously passed with GitHub Actions run `33909908758` / run #4787.

## 5. Roadmap reconciliation – verified

`docs/ROADMAP_CURRENT.md` is the current bridge between historical IM capability planning and actual CR implementation.

Rules:

- IM and CR are not 1:1.
- Old IM branches are not automatically integrated.
- CR-00…CR-21 establish major runtime/resources/logistics/navigation/traffic foundations.
- Open product areas remain buildings, persons/housing/workforce, construction, production/BuildingStock, economy, path wear, SaveGame, UI, Inspector and V1 end-to-end integration.
- Exact future CR titles are defined one whole CR at a time after the cleanup gate.
- Old `main` behavior is product reference only; desired functions are reimplemented through the modular architecture.

## 6. Branch cleanup – PASS / 0 BLOCKER

Historical branches were classified before deletion using:

- **KEEP**
- **SAFE DELETE – CONTAINED**
- **ARCHIVE/EXTRACT THEN DELETE**
- **REVIEW REQUIRED**

Useful unique content from divergent IM/CI branches was reviewed and captured in `docs/legacy/pre-cr22/BRANCH_EXTRACTION_SUMMARY.md`. The final deletion plan is recorded in `docs/legacy/pre-cr22/FINAL_BRANCH_DELETION_LIST.md`.

Live remote verification on 2026-09-04 confirmed the repository is reduced to exactly four justified branches:

- `main` – historical functional/visual reference only,
- `gh-pages` – deployment/browser-device surface,
- `frozen/cr-21-reservation-controlled-traffic-execution-foundation` – rollback point,
- `maintenance/pre-cr22-repository-cleanup` – active final cleanup branch.

Therefore **Pre-CR22 branch classification / reduction = PASS / 0 BLOCKER**.

## 7. Inspector / diagnostics direction

Inspector remains a later diagnostics, simulation and balancing facility. It is never a gameplay owner. Automated tests remain executable gate code; Inspector may later expose public snapshots/events, evidence and metrics without changing gameplay.

## 8. Final Pre-CR22 verification requirements

Before CR-22 may start, all must be true:

1. CR-21 regression PASS / 0 BLOCKER.
2. Modular runtime remains `src/**`.
3. Historical monolith is absent from cleaned modular baseline.
4. Assets remain preserved.
5. Legacy docs remain clearly separated.
6. README remains aligned to modular architecture.
7. `ROADMAP_CURRENT.md` remains current.
8. Branch classification/reduction remains PASS with exactly the justified retained set.
9. Extracted unique historical evidence remains archived.
10. Cleanup regression/CI is green.
11. Browser/device status is synchronized and manually confirmed.
12. Resulting cleaned commit is recorded as the CR-22 parent baseline.
13. Old `main` remains reference only; the new game remains a clean modular rebuild targeting functional parity or better, never legacy-code parity.
14. Only then: **Pre-CR22 Repository Cleanup / Roadmap Integration Gate = PASS / 0 BLOCKER**.

## 9. Source-of-truth / branch rules

Before every write verify repository, target branch, actual HEAD, active action, frozen predecessor, scope, tests and CI. Keep modular work off `main` until an explicit repository-level transition is separately decided.

For future CRs use one branch per overall CR; A/B/C normally run sequentially on that same branch. Extra branches require a concrete risk justification.

## 10. Known process traps

- Do not infer current state from chat history.
- Do not reopen CR-21 during cleanup.
- Do not delete assets as legacy cleanup.
- Do not equate old IM branches with current implementation completeness.
- Do not start CR-22 before final cleanup gate PASS / 0 BLOCKER.
- Do not turn Inspector into a second gameplay owner.
- Do not use old `main` code/architecture as implementation target.
- Keep browser/device text synchronized with actual gate state.

---

**Updated:** 2026-09-04 after live confirmation of the four-branch target state. Branch cleanup is PASS / 0 BLOCKER. Final integrated regression/CI and browser/device verification are now the only remaining Pre-CR22 steps.
