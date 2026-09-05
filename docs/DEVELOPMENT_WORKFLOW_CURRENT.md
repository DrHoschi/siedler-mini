# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development/control branch: `feature/cr-24-construction-foundation`
- Current immutable gameplay baseline: **CR-24 – Construction Foundation**
- CR-24A – Building Construction State Contract: **PASS / FROZEN / 0 BLOCKER**
- CR-24A frozen branch: `frozen/cr-24a-building-construction-state-contract`
- CR-24B – Deterministic Construction Progress / Transition Contract: **PASS / FROZEN / 0 BLOCKER**
- CR-24B frozen branch: `frozen/cr-24b-deterministic-construction-progress-transition-contract`
- CR-24C – Construction Completion Boundary: **PASS / FROZEN / 0 BLOCKER**
- CR-24C frozen branch: `frozen/cr-24c-construction-completion-boundary`
- CR-24C frozen SHA: `c3986fbd810b1150d10d0945ed2f27c77c3eaa63`
- CR-24 – Construction Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-22 – Building Ownership / Lifecycle Foundation | COMPLETE / FROZEN | Regression only |
| 2 | CR-23 – Person / Resident / Housing Foundation | COMPLETE / FROZEN | Regression only |
| 3 | CR-24A – Building Construction State Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 4 | CR-24B – Deterministic Construction Progress / Transition Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 5 | CR-24C – Construction Completion Boundary | PASS / FROZEN / 0 BLOCKER | Regression only |
| 6 | CR-24 – Construction Foundation | COMPLETE / FROZEN / PASS / 0 BLOCKER | Regression only |
| 7 | Next system block | PLANNING ONLY | Define BuildingStock / Production Foundation boundary |

## 3. CR-24 frozen contract

CR-24A -> CR-24B -> CR-24C jointly establish:

- a construction-specific state contract separate from Building lifecycle,
- only `PENDING`, `IN_PROGRESS`, `COMPLETED`,
- deterministic progress in `0.0 .. 1.0`,
- `PENDING` at `0.0`, `IN_PROGRESS` strictly between `0.0` and `1.0`, `COMPLETED` at `1.0`,
- forward-only progression with no `PENDING -> COMPLETED` skip,
- terminal `COMPLETED`,
- stable `buildingId`, immutable contract values,
- `constructionComplete` derived as true only for `COMPLETED` with `progress = 1.0`.

The CR-24 completion boundary is descriptive only. It does not automatically activate another gameplay system.

## 4. Explicit frozen exclusions

CR-24 contains no material consumption, builder/hammer/work-time behavior, detailed construction phases, production, resident/housing activation, profession/workforce assignment, BuildingStock/storage, transport generation/execution, demolition/destruction, rendering/animation or UI behavior.

These exclusions are part of the frozen boundary and must not be silently added during later work.

## 5. Next allowed action

Do **not** begin CR-25 code yet.

The next action is planning against `docs/ROADMAP_CURRENT.md`: inspect the existing IM-08/product requirements and define the next minimal system block for **BuildingStock / Production Foundation**. Its exact CR title and A/B/C decomposition must be explicitly accepted before implementation.

## 6. Branch simplification rule

Use one development branch per system block.

A completed sub-block or whole block may receive a `frozen/...` branch solely as an immutable marker. Do not create extra temporary, implementation, final or gate branches unless a concrete technical risk requires isolation.

For the next system block, create one new development branch only after its planning boundary has been accepted, using the current accepted frozen gameplay baseline as predecessor.

---

**Updated:** 2026-09-05 after CR-24A/B/C formal freeze and CR-24 Construction Foundation system-block closure. Next permitted activity: **BuildingStock / Production Foundation planning (IM-08)**.
