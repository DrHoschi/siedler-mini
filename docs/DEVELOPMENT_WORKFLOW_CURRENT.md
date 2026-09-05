# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development branch: `feature/cr-24-construction-foundation`
- Current immutable predecessor: **CR-23 – Person / Resident / Housing Foundation**
- CR-24A – Building Construction State Contract: **PASS / FROZEN / 0 BLOCKER**
- CR-24A frozen branch: `frozen/cr-24a-building-construction-state-contract`
- CR-24B – Deterministic Construction Progress / Transition Contract: **FREEZE GATE / NOT FROZEN**
- CR-24C – Construction Completion Boundary: **NOT STARTED**

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-22 – Building Ownership / Lifecycle Foundation | FROZEN / PASS / 0 BLOCKER | Regression only |
| 2 | CR-23 – Person / Resident / Housing Foundation | COMPLETE / FROZEN | Regression only |
| 3 | CR-24A – Building Construction State Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 4 | CR-24B – Deterministic Construction Progress / Transition Contract | FREEZE GATE / NOT FROZEN | Completion regression only |
| 5 | CR-24C – Construction Completion Boundary | NOT STARTED | Forbidden until CR-24B frozen |

## 3. CR-24B freeze-gate contract

The completion gate must regress CR-24A + CR-24B together and confirm:

- `progress` remains constrained to `0.0 .. 1.0`,
- deterministic mapping remains `0 -> PENDING`, `0 < progress < 1 -> IN_PROGRESS`, `1 -> COMPLETED`,
- progress may stay equal or increase, never decrease,
- direct `PENDING -> COMPLETED` remains rejected,
- `COMPLETED` remains terminal,
- stable `buildingId` is preserved,
- values remain immutable and deterministic,
- CR-24A and all frozen predecessors still pass unchanged.

## 4. Explicit exclusions

The gate must confirm CR-24B still adds no construction material demand/consumption, hammer/action simulation, builders/workforce/profession assignment, automatic work-time progression, detailed named construction phases, production, BuildingStock/storage, transport changes, usability/activation policy, demolition/destruction or rendering/animation/UI logic.

## 5. Next allowed action

Run focused node regression, CI and browser/device preview on this same whole-system branch. Only after **PASS / 0 BLOCKER** may CR-24B receive its immutable frozen marker. CR-24C is planned only afterwards.

## 6. Branch simplification rule

CR-24 continues on one development branch only: `feature/cr-24-construction-foundation`.

A completed sub-block may receive a `frozen/...` branch solely as an immutable marker. Do not create extra temporary, implementation, final or gate branches unless a concrete technical risk requires isolation.

---

**Updated:** 2026-09-05 for CR-24B completion/regression/freeze gate.
