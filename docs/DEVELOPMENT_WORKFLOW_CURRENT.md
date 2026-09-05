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
- CR-24C – Construction Completion Boundary: **IMPLEMENTED / NOT FROZEN**

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-22 – Building Ownership / Lifecycle Foundation | FROZEN / PASS / 0 BLOCKER | Regression only |
| 2 | CR-23 – Person / Resident / Housing Foundation | COMPLETE / FROZEN | Regression only |
| 3 | CR-24A – Building Construction State Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 4 | CR-24B – Deterministic Construction Progress / Transition Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 5 | CR-24C – Construction Completion Boundary | IMPLEMENTED / NOT FROZEN | Test and review only |

## 3. CR-24C contract

CR-24C exposes only a deterministic completion boundary derived from the existing CR-24B construction contract:

- stable `buildingId`,
- `constructionComplete = false` for `PENDING`,
- `constructionComplete = false` for `IN_PROGRESS`,
- `constructionComplete = true` only for `COMPLETED` with `progress = 1.0`,
- immutable/deterministic derived result,
- no independent stored completion truth.

## 4. Explicit exclusions

CR-24C does not activate or add production, resident/housing usability, workforce/profession assignment, BuildingStock/storage, transport generation/execution, materials/builders/work-time logic, demolition/destruction or rendering/animation/UI behavior.

## 5. Next allowed action

Verify CR-24C with focused node tests, browser/device preview and CI regression against frozen CR-24B plus all predecessor gates. Then run the CR-24C completion/regression/freeze gate on this same development branch. Only after **PASS / 0 BLOCKER** may CR-24C be frozen and CR-24 as a whole be considered for completion.

## 6. Branch simplification rule

CR-24 continues on one development branch only: `feature/cr-24-construction-foundation`.

A completed sub-block may receive a `frozen/...` branch solely as an immutable marker. Do not create extra temporary, implementation, final or gate branches unless a concrete technical risk requires isolation.

---

**Updated:** 2026-09-05 after CR-24C implementation.
