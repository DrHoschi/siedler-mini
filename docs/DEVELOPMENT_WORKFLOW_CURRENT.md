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
- CR-25B status: **NEXT / NOT IMPLEMENTED**

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-22 – Building Ownership / Lifecycle Foundation | COMPLETE / FROZEN | Regression only |
| 2 | CR-23 – Person / Resident / Housing Foundation | COMPLETE / FROZEN | Regression only |
| 3 | CR-24 – Construction Foundation | COMPLETE / FROZEN / PASS / 0 BLOCKER | Regression only |
| 4 | CR-25A – BuildingStock Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 5 | CR-25B – Deterministic BuildingStock Mutation | NEXT / NOT IMPLEMENTED | May begin on current CR-25 branch |
| 6 | CR-25C – Production -> BuildingStock Contract | PLANNED | Do not start before CR-25B |

## 3. Frozen CR-25A contract boundary

CR-25A owns exactly one immutable descriptive stock-entry value:

- `kind: building-stock`
- stable `buildingId` of kind `building:`
- stable `resourceTypeId` of kind `resource-type:`
- `quantity`: non-negative safe integer
- default quantity `0`

One value represents one Building + one ResourceType stock entry.

CR-25A introduces no mutation, storage capacity, aggregation ownership, production execution, workforce or transport behavior.

## 4. CR-25B allowed boundary

CR-25B may add controlled deterministic stock mutation on top of the frozen CR-25A value contract:

- addition/deposit of quantity,
- removal/withdrawal of quantity,
- deterministic rejection of invalid mutation,
- no negative resulting stock and no over-withdrawal.

CR-25B must not add production recipes/execution, capacity/slots, workforce, transport, construction material integration, SaveGame ownership, rendering/UI or balancing.

## 5. Next allowed action

Begin **CR-25B – Deterministic BuildingStock Mutation** on the existing development branch `feature/cr-25-buildingstock-production-foundation`.

Do not create a separate CR-25B working branch. CR-25C remains blocked until CR-25B is implemented, verified and frozen.

## 6. Branch simplification rule

CR-25 continues on the single development branch `feature/cr-25-buildingstock-production-foundation`.

A completed sub-block may receive a `frozen/...` branch solely as an immutable marker. Do not create extra temporary, implementation, final or gate branches unless a concrete technical risk requires isolation.

---

**Updated:** 2026-09-05 after device/browser CR-25A Verification / Freeze Gate: **PASS / 0 BLOCKER**. Current next activity: **CR-25B – Deterministic BuildingStock Mutation**.
