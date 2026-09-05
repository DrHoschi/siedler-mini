# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development branch: `feature/cr-23-person-resident-housing-foundation`
- Current immutable predecessor: **CR-22 – Building Ownership / Lifecycle Foundation**
- Frozen predecessor branch: `frozen/cr-22c-building-registration-world-ownership-integration`
- Frozen predecessor SHA: `d507bf0797b8b4be4090cbca0d74cf20760500b5`
- Current system block: **CR-23 – Person / Resident / Housing Foundation**
- CR-23A status: **PASS / FROZEN / 0 BLOCKER**
- CR-23B status: **PASS / FROZEN / 0 BLOCKER**
- Current sub-block: **CR-23C – Housing Capacity & Occupancy Foundation**
- CR-23C status: **IMPLEMENTED – NOT FROZEN**

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-22 – Building Ownership / Lifecycle Foundation | FROZEN / PASS / 0 BLOCKER | Regression only |
| 2 | CR-23A – Person / Resident Identity Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 3 | CR-23B – Resident ↔ Home Assignment Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 4 | CR-23C – Housing Capacity & Occupancy Foundation | IMPLEMENTED / NOT FROZEN | Test and review only |

## 3. Frozen predecessor contracts

CR-23A keeps stable Person / Resident identity on the existing `unit:` ID basis.

CR-23B keeps the explicit Person → Home Building relationship with `UNASSIGNED` / `ASSIGNED` and a single `homeBuildingId` source of truth.

## 4. Current CR-23C contract

CR-23C adds only Housing Capacity and deterministic Occupancy projection:

- `buildingId`: stable `building:` ID,
- `capacity`: integer >= 0,
- `capacity = 0` means no housing slots are offered by this contract,
- `occupancy` is derived only from CR-23B `ASSIGNED` Home references for the same Building,
- no independent resident list or mutable occupancy counter,
- `availableSlots = capacity - occupancy`,
- `withinCapacity = occupancy <= capacity`,
- exact capacity is allowed; overflow is deterministically rejected,
- immutable and deterministic contract/summary values.

CR-23C explicitly does **not** add:

- concrete housing building type names or content mapping,
- automatic resident creation,
- Household / parents / children / family simulation,
- BirthTimer / population growth / regeneration,
- age / gender / names,
- profession / workforce / jobs,
- tools / clothing,
- production / BuildingStock / storage,
- construction,
- transport,
- movement / position / route,
- UI / rendering.

## 5. Next allowed action

Do not extend CR-23C further.

First verify CR-23C through focused node test, browser/device preview and CI regression against frozen CR-23B/CR-23A/CR-22. Then run a dedicated CR-23C completion/freeze gate. Only after **PASS / 0 BLOCKER** may CR-23 as a whole be considered for its final completion/freeze gate.

## 6. Source-of-truth / branch rules

- `main` is historical functional/visual reference only.
- CR-22, CR-23A and CR-23B remain immutable predecessor baselines.
- CR-23 continues on the same whole-system feature branch.
- Keep browser/device text, docs, CI naming and actual branch state synchronized.
- Do not silently expand CR-23C into population growth, family simulation or workforce behavior.

---

**Updated:** 2026-09-05 after CR-23C implementation.
