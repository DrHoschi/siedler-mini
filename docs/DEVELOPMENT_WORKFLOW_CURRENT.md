# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development branch: `feature/cr-24-construction-foundation`
- Current immutable gameplay baseline: **CR-23 – Person / Resident / Housing Foundation**
- Frozen baseline branch: `frozen/cr-23c-housing-capacity-occupancy-foundation`
- Frozen baseline SHA: `1a3a01c0973cd21c0375c8bc308311a774e30120`
- CR-23 overall status: **PASS / COMPLETE / FROZEN / 0 BLOCKER**
- Current system block: **CR-24 – Construction Foundation**
- Current sub-block: **CR-24A – Building Construction State Contract**
- CR-24A status: **IMPLEMENTED / NOT FROZEN**

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-22 – Building Ownership / Lifecycle Foundation | FROZEN / PASS / 0 BLOCKER | Regression only |
| 2 | CR-23 – Person / Resident / Housing Foundation | COMPLETE / FROZEN | Regression only |
| 3 | CR-24A – Building Construction State Contract | IMPLEMENTED / NOT FROZEN | Test and review only |
| 4 | CR-24B – Deterministic Construction Progress / Transition Contract | NOT STARTED | Forbidden until CR-24A frozen |
| 5 | CR-24C – Construction Completion Boundary | NOT STARTED | Forbidden until CR-24B frozen |

## 3. CR-24A contract

CR-24A adds a construction-specific Building state axis:

- `buildingId`: stable `building:` ID,
- `state`: `PENDING`, `IN_PROGRESS`, or `COMPLETED`,
- default state `PENDING`,
- immutable/deterministic contract values.

CR-24A is deliberately separate from CR-22B existential Building lifecycle:

- CR-22B: `EXISTS -> RETIRED`
- CR-24A: `PENDING | IN_PROGRESS | COMPLETED`

A Building may therefore be `EXISTS` and simultaneously `PENDING`, `IN_PROGRESS`, or `COMPLETED` in Construction.

CR-24A defines valid state values only. It does not yet define allowed Construction transitions.

## 4. Explicit exclusions

CR-24A adds no:

- automatic Construction transitions,
- progress percentage,
- detailed named build phases,
- construction material demand or consumption,
- builders / workforce / profession assignment,
- production,
- BuildingStock/storage,
- transport changes,
- usability/activation policy,
- demolition/destruction,
- rendering/animation/UI.

## 5. Next allowed action

Do not begin CR-24B yet.

First verify CR-24A with focused node test, browser/device preview and CI regression against the frozen CR-23/CR-22 baseline. Then run a dedicated CR-24A completion/regression/freeze gate. Only after **PASS / 0 BLOCKER** may CR-24A be frozen and CR-24B planned/implemented.

## 6. Source-of-truth / branch rules

- `main` remains historical functional/visual reference only.
- `frozen/cr-23c-housing-capacity-occupancy-foundation` remains the immutable predecessor baseline.
- CR-24 continues on the whole-system branch `feature/cr-24-construction-foundation`.
- Do not modify frozen CR-22 or CR-23 contracts.
- Keep browser/device text, docs, CI naming and actual branch state synchronized.
- Do not conflate Building existential lifecycle with Construction state.

---

**Updated:** 2026-09-05 after CR-24A implementation.
