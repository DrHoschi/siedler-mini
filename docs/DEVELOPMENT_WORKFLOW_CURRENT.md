# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development branch: `feature/cr-24-construction-foundation`
- Current immutable predecessor: **CR-23 – Person / Resident / Housing Foundation**
- Frozen predecessor branch: `frozen/cr-23c-housing-capacity-occupancy-foundation`
- CR-24A – Building Construction State Contract: **PASS / FROZEN / 0 BLOCKER**
- CR-24A frozen branch: `frozen/cr-24a-building-construction-state-contract`
- CR-24B – Deterministic Construction Progress / Transition Contract: **IMPLEMENTED / NOT FROZEN**
- CR-24C – Construction Completion Boundary: **NOT STARTED**

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-22 – Building Ownership / Lifecycle Foundation | FROZEN / PASS / 0 BLOCKER | Regression only |
| 2 | CR-23 – Person / Resident / Housing Foundation | COMPLETE / FROZEN | Regression only |
| 3 | CR-24A – Building Construction State Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 4 | CR-24B – Deterministic Construction Progress / Transition Contract | IMPLEMENTED / NOT FROZEN | Test and review only |
| 5 | CR-24C – Construction Completion Boundary | NOT STARTED | Forbidden until CR-24B frozen |

## 3. Frozen CR-24A contract

CR-24A owns only the Construction state vocabulary for a stable Building:

- `PENDING`
- `IN_PROGRESS`
- `COMPLETED`

This remains strictly separate from CR-22 Building lifecycle `EXISTS -> RETIRED`.

## 4. CR-24B contract

CR-24B adds only deterministic Construction progress / transition validation:

- `progress` is constrained to `0.0 .. 1.0`,
- `progress = 0` -> `PENDING`,
- `0 < progress < 1` -> `IN_PROGRESS`,
- `progress = 1` -> `COMPLETED`,
- progress may stay equal or increase, never decrease,
- direct `PENDING -> COMPLETED` is rejected,
- `COMPLETED` is terminal,
- stable `buildingId` is preserved,
- values remain immutable and deterministic.

CR-24B decides only whether a requested progress/transition is valid. It does not decide why progress occurs.

## 5. Explicit exclusions

CR-24B adds no:

- construction material demand/consumption,
- hammer/action simulation,
- builders/workforce/profession assignment,
- automatic work-time or elapsed-time progression,
- detailed named construction phases,
- production,
- BuildingStock/storage,
- transport changes,
- usability/activation policy,
- demolition/destruction,
- rendering/animation/UI.

## 6. Next allowed action

Do not begin CR-24C yet.

First verify CR-24B with focused node tests, browser/device preview and CI regression against frozen CR-24A plus frozen predecessors. Then run the CR-24B completion/regression/freeze gate on the same whole-system branch workflow. Only after **PASS / 0 BLOCKER** may CR-24B be frozen and CR-24C planned.

## 7. Branch simplification rule

CR-24 continues on one development branch only:

- `feature/cr-24-construction-foundation`

A completed sub-block may receive a `frozen/...` branch solely as an immutable marker. Do not create extra temporary, implementation, final or gate branches unless a concrete technical risk requires isolation.

## 8. Source-of-truth rules

- `main` remains historical functional/visual reference only.
- CR-22, CR-23 and frozen CR-24A remain immutable.
- Keep browser/device text, docs, CI naming and actual branch state synchronized.
- Do not conflate Building existential lifecycle with Construction state.

---

**Updated:** 2026-09-05 after CR-24B implementation. Current allowed action: **CR-24B verification only**.
