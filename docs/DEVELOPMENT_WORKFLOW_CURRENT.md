# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development/control branch: `feature/cr-25-buildingstock-production-foundation`
- Current immutable gameplay baseline: **CR-24 – Construction Foundation**
- CR-24A – Building Construction State Contract: **PASS / FROZEN / 0 BLOCKER**
- CR-24B – Deterministic Construction Progress / Transition Contract: **PASS / FROZEN / 0 BLOCKER**
- CR-24C – Construction Completion Boundary: **PASS / FROZEN / 0 BLOCKER**
- CR-24 – Construction Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Current system block: **CR-25 – BuildingStock / Production Foundation**
- Current sub-block: **CR-25A – BuildingStock Contract**
- CR-25A status: **IMPLEMENTED / NOT FROZEN**

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-22 – Building Ownership / Lifecycle Foundation | COMPLETE / FROZEN | Regression only |
| 2 | CR-23 – Person / Resident / Housing Foundation | COMPLETE / FROZEN | Regression only |
| 3 | CR-24 – Construction Foundation | COMPLETE / FROZEN / PASS / 0 BLOCKER | Regression only |
| 4 | CR-25A – BuildingStock Contract | IMPLEMENTED / NOT FROZEN | Focused verification / freeze gate only |
| 5 | CR-25B – Deterministic BuildingStock Mutation | PLANNED | Do not start before CR-25A acceptance/freeze |
| 6 | CR-25C – Production -> BuildingStock Contract | PLANNED | Do not start before CR-25B |

## 3. CR-25A contract boundary

CR-25A introduces exactly one immutable descriptive stock-entry value:

- `kind: building-stock`
- stable `buildingId` of kind `building:`
- stable `resourceTypeId` of kind `resource-type:`
- `quantity`: non-negative safe integer
- default quantity `0`

One value represents one Building + one ResourceType stock entry.

CR-25A does not introduce mutation, storage capacity, aggregation ownership, production execution, workforce or transport behavior.

## 4. Explicit exclusions

CR-25A contains no:

- add/deposit/remove/withdraw behavior,
- reservation/consumption mutation,
- storage capacity or slots,
- production recipes or input/output execution,
- production timing,
- profession/workforce assignment,
- transport generation/execution,
- construction material consumption,
- rendering/animation/UI/Inspector/balancing.

## 5. Next allowed action

Run focused CR-25A verification against the new contract and regress the frozen predecessor baseline. Only after **PASS / 0 BLOCKER** may CR-25A receive an immutable frozen marker.

Do not start CR-25B while CR-25A is still `IMPLEMENTED / NOT FROZEN`.

## 6. Branch simplification rule

CR-25 continues on the single development branch `feature/cr-25-buildingstock-production-foundation`.

A completed sub-block may receive a `frozen/...` branch solely as an immutable marker. Do not create extra temporary, implementation, final or gate branches unless a concrete technical risk requires isolation.

---

**Updated:** 2026-09-05 after CR-25A BuildingStock Contract implementation. Current next activity: **CR-25A focused verification / freeze gate**.
