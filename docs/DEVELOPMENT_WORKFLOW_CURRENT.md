# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development/control branch: `feature/cr-25-buildingstock-production-foundation`
- Current immutable gameplay baseline: **CR-25A – BuildingStock Contract**
- CR-24 – Construction Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Current system block: **CR-25 – BuildingStock / Production Foundation**
- CR-25A – BuildingStock Contract: **PASS / FROZEN / 0 BLOCKER**
- Current sub-block: **CR-25B – Deterministic BuildingStock Mutation**
- CR-25B status: **IMPLEMENTED / NOT FROZEN**

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-22 – Building Ownership / Lifecycle Foundation | COMPLETE / FROZEN | Regression only |
| 2 | CR-23 – Person / Resident / Housing Foundation | COMPLETE / FROZEN | Regression only |
| 3 | CR-24 – Construction Foundation | COMPLETE / FROZEN / PASS / 0 BLOCKER | Regression only |
| 4 | CR-25A – BuildingStock Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 5 | CR-25B – Deterministic BuildingStock Mutation | IMPLEMENTED / NOT FROZEN | Focused verification / freeze gate only |
| 6 | CR-25C – Production -> BuildingStock Contract | PLANNED | Do not start before CR-25B freeze |

## 3. Frozen CR-25A contract boundary

CR-25A owns exactly one immutable descriptive stock-entry value:

- `kind: building-stock`
- stable `buildingId` of kind `building:`
- stable `resourceTypeId` of kind `resource-type:`
- `quantity`: non-negative safe integer
- default quantity `0`

One value represents one Building + one ResourceType stock entry.

## 4. CR-25B implemented boundary

CR-25B adds only deterministic value mutation on top of CR-25A:

- `add(current, amount)` returns a new immutable BuildingStock value,
- `remove(current, amount)` returns a new immutable BuildingStock value,
- mutation amount must be a positive safe integer,
- Building and ResourceType identity remain unchanged,
- over-withdrawal is rejected,
- negative stock cannot be produced,
- Safe-Integer overflow is rejected,
- the input value is never mutated.

## 5. Explicit exclusions

CR-25B contains no:

- storage capacity or slots,
- production recipes/input-output execution/timing,
- workforce/profession assignment,
- transport generation/execution,
- construction material consumption,
- reservation policy,
- SaveGame ownership,
- rendering/animation/UI/Inspector/balancing.

## 6. Next allowed action

Run focused **CR-25B Verification / Freeze Gate** against frozen CR-25A and the new mutation contract.

Only after **PASS / 0 BLOCKER** may CR-25B receive an immutable frozen marker and CR-25C become the next permitted implementation step.

Do not start CR-25C while CR-25B is `IMPLEMENTED / NOT FROZEN`.

## 7. Branch simplification rule

CR-25 continues on the single development branch `feature/cr-25-buildingstock-production-foundation`.

A completed sub-block may receive a `frozen/...` branch solely as an immutable marker. Do not create extra temporary, implementation, final or gate branches unless a concrete technical risk requires isolation.

---

**Updated:** 2026-09-05 after CR-25B implementation. Current next activity: **CR-25B focused verification / freeze gate**.
