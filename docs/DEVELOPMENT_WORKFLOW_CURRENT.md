# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development/control branch: `feature/cr-25-buildingstock-production-foundation`
- Current immutable gameplay baseline: **CR-25B – Deterministic BuildingStock Mutation**
- CR-24 – Construction Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Current system block: **CR-25 – BuildingStock / Production Foundation**
- CR-25A – BuildingStock Contract: **PASS / FROZEN / 0 BLOCKER**
- CR-25B – Deterministic BuildingStock Mutation: **PASS / FROZEN / 0 BLOCKER**
- Current sub-block: **CR-25C – Production -> BuildingStock Contract**
- CR-25C status: **NEXT / NOT IMPLEMENTED**

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-22 – Building Ownership / Lifecycle Foundation | COMPLETE / FROZEN | Regression only |
| 2 | CR-23 – Person / Resident / Housing Foundation | COMPLETE / FROZEN | Regression only |
| 3 | CR-24 – Construction Foundation | COMPLETE / FROZEN / PASS / 0 BLOCKER | Regression only |
| 4 | CR-25A – BuildingStock Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 5 | CR-25B – Deterministic BuildingStock Mutation | PASS / FROZEN / 0 BLOCKER | Regression only |
| 6 | CR-25C – Production -> BuildingStock Contract | NEXT / NOT IMPLEMENTED | May begin on current CR-25 branch |

## 3. Frozen CR-25A / CR-25B boundary

CR-25A owns exactly one immutable descriptive stock-entry value:

- `kind: building-stock`
- stable `buildingId` of kind `building:`
- stable `resourceTypeId` of kind `resource-type:`
- `quantity`: non-negative safe integer
- default quantity `0`

CR-25B adds only deterministic value mutation on top of CR-25A:

- `add(current, amount)` returns a new immutable BuildingStock value,
- `remove(current, amount)` returns a new immutable BuildingStock value,
- mutation amount must be a positive safe integer,
- Building and ResourceType identity remain unchanged,
- over-withdrawal is rejected,
- negative stock cannot be produced,
- Safe-Integer overflow is rejected,
- the input value is never mutated.

## 4. CR-25C allowed boundary

CR-25C may add the minimal deterministic Production -> BuildingStock contract on top of frozen CR-25A/B:

- defined production input quantities,
- defined production output quantities,
- deterministic consumption of required local input stock,
- deterministic addition of produced output stock,
- rejection when required local input stock is insufficient.

CR-25C must not add production timing/ticks, workforce/profession assignment, storage capacity/slots, transport execution, construction material integration, SaveGame ownership, rendering/UI or balancing.

## 5. Next allowed action

Begin **CR-25C – Production -> BuildingStock Contract** on the existing development branch `feature/cr-25-buildingstock-production-foundation`.

Do not create a separate CR-25C working branch. CR-25 remains active until CR-25C is implemented, verified and frozen and the whole CR-25 system-block completion/regression gate has passed.

## 6. Branch simplification rule

CR-25 continues on the single development branch `feature/cr-25-buildingstock-production-foundation`.

A completed sub-block may receive a `frozen/...` branch solely as an immutable marker. Do not create extra temporary, implementation, final or gate branches unless a concrete technical risk requires isolation.

---

**Updated:** 2026-09-05 after device/browser CR-25B Verification / Freeze Gate: **PASS / 0 BLOCKER**. Current next activity: **CR-25C – Production -> BuildingStock Contract**.
