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
- CR-24B – Deterministic Construction Progress / Transition Contract: **PASS / FROZEN / 0 BLOCKER**
- CR-24B frozen branch: `frozen/cr-24b-deterministic-construction-progress-transition-contract`
- CR-24C – Construction Completion Boundary: **FREEZE GATE / NOT FROZEN**

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-22 – Building Ownership / Lifecycle Foundation | FROZEN / PASS / 0 BLOCKER | Regression only |
| 2 | CR-23 – Person / Resident / Housing Foundation | COMPLETE / FROZEN | Regression only |
| 3 | CR-24A – Building Construction State Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 4 | CR-24B – Deterministic Construction Progress / Transition Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 5 | CR-24C – Construction Completion Boundary | FREEZE GATE / NOT FROZEN | Completion regression only |

## 3. CR-24C freeze-gate contract

The completion gate must regress CR-24A -> CR-24B -> CR-24C together and confirm:

- `constructionComplete = false` for `PENDING`,
- `constructionComplete = false` for `IN_PROGRESS`,
- `constructionComplete = true` only for `COMPLETED` with `progress = 1.0`,
- stable `buildingId` is preserved,
- the result remains deterministic and immutable,
- completion remains derived rather than independently stored,
- CR-24A, CR-24B and all frozen predecessors still pass unchanged.

## 4. Explicit exclusions

The gate must confirm CR-24C still adds no usability activation, production, resident/housing activation, workforce/profession assignment, BuildingStock/storage, transport generation/execution, material/builders/work-time behavior, demolition/destruction or rendering/animation/UI logic.

## 5. Next allowed action

Run focused node regression, CI and browser/device preview on this same whole-system branch. Only after **PASS / 0 BLOCKER** may CR-24C receive its immutable frozen marker. After that, close CR-24 – Construction Foundation as a complete system block and synchronize `ROADMAP_CURRENT.md` plus this workflow before choosing the next CR.

## 6. Branch simplification rule

CR-24 continues on one development branch only: `feature/cr-24-construction-foundation`.

A completed sub-block may receive a `frozen/...` branch solely as an immutable marker. Do not create extra temporary, implementation, final or gate branches unless a concrete technical risk requires isolation.

---

**Updated:** 2026-09-05 for CR-24C completion/regression/freeze gate.
