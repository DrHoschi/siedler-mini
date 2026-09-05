# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development branch: `feature/cr-24-construction-foundation`
- Current immutable predecessor: **CR-23 – Person / Resident / Housing Foundation**
- Frozen predecessor branch: `frozen/cr-23c-housing-capacity-occupancy-foundation`
- Frozen predecessor SHA: `1a3a01c0973cd21c0375c8bc308311a774e30120`
- Current system block: **CR-24 – Construction Foundation**
- CR-24A – Building Construction State Contract: **PASS / FROZEN / 0 BLOCKER**
- CR-24B – Deterministic Construction Progress / Transition Contract: **NEXT / NOT STARTED**
- CR-24C – Construction Completion Boundary: **NOT STARTED**

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-22 – Building Ownership / Lifecycle Foundation | FROZEN / PASS / 0 BLOCKER | Regression only |
| 2 | CR-23 – Person / Resident / Housing Foundation | COMPLETE / FROZEN | Regression only |
| 3 | CR-24A – Building Construction State Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 4 | CR-24B – Deterministic Construction Progress / Transition Contract | NEXT / NOT STARTED | Plan scope before code |
| 5 | CR-24C – Construction Completion Boundary | NOT STARTED | Forbidden until CR-24B frozen |

## 3. Frozen CR-24A contract

CR-24A adds a construction-specific Building state axis:

- `buildingId`: stable `building:` ID,
- `state`: `PENDING`, `IN_PROGRESS`, or `COMPLETED`,
- default state `PENDING`,
- immutable/deterministic contract values.

CR-24A is deliberately separate from CR-22B existential Building lifecycle:

- CR-22B: `EXISTS -> RETIRED`
- CR-24A: `PENDING | IN_PROGRESS | COMPLETED`

A Building may therefore be `EXISTS` and simultaneously `PENDING`, `IN_PROGRESS`, or `COMPLETED` in Construction.

CR-24A defines valid state values only. It does not define allowed Construction transitions or progress.

## 4. Freeze evidence

CR-24A passed the dedicated completion/regression/freeze gate with **PASS / 0 BLOCKER**.

The gate verified:

- CR-23/CR-22 frozen predecessor regression,
- stable `building:` ID,
- exactly `PENDING`, `IN_PROGRESS`, `COMPLETED`,
- strict separation from CR-22 Building lifecycle,
- immutable/deterministic contract values,
- no transition/progress/material/builder/workforce/production/BuildingStock/transport/demolition leakage,
- browser/device preview: PASS / 0 BLOCKER,
- GitHub CI `Run CR-24A completion/freeze gate + CR-23 frozen regression`: SUCCESS.

## 5. Next allowed action

Do not extend or reopen CR-24A.

The next step is **planning CR-24B – Deterministic Construction Progress / Transition Contract** on top of the frozen CR-24A boundary. CR-24B may define controlled transitions/progress, but must not change CR-24A's state vocabulary or merge Construction state into CR-22 Building lifecycle.

Still do not prematurely include:

- construction material demand/consumption,
- builders/workforce/profession assignment,
- production,
- BuildingStock/storage,
- transport execution changes,
- resident/population changes,
- demolition/destruction,
- rendering/animation/UI.

## 6. Source-of-truth / branch rules

- `main` remains historical functional/visual reference only.
- CR-22 and CR-23 remain immutable predecessor baselines.
- CR-24A is now an immutable sub-block baseline.
- CR-24 continues on the whole-system branch `feature/cr-24-construction-foundation` after that branch is advanced to the confirmed CR-24A freeze commit.
- Keep browser/device text, docs, CI naming and actual branch state synchronized.
- Do not conflate Building existential lifecycle with Construction state.

---

**Updated:** 2026-09-05 after formal CR-24A completion/freeze gate. Next allowed step: **CR-24B planning**.
