# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development/control branch: `feature/cr-27-game-facing-logistics-integration-foundation`
- Current immutable gameplay baseline: **CR-26 – Workforce Capability & Job Eligibility Foundation**
- CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-27 – Game-Facing Logistics Integration Foundation: **ACTIVE / NOT FROZEN**
- CR-27A – BuildingStock Transport Intent & Reservation Bridge: **PASS / FROZEN / 0 BLOCKER**
- CR-27B – Workforce-Aware Transport Dispatch Integration: **PASS / FROZEN / 0 BLOCKER**
- CR-27C – Delivered Transport -> BuildingStock Settlement: **NEXT ALLOWED / NOT STARTED / NOT FROZEN**

## 2. Frozen CR-27A boundary

CR-27A owns immutable `building-stock-transport-reservation` values with stable `transport-reservation:` IDs, source/target `building:` IDs, `resource-type:` ID, positive amount and `ACTIVE -> RELEASED` lifecycle.

Availability remains:

`physical BuildingStock - sum(ACTIVE reservations for the same source/resource)`

CR-27A device/browser Verification / Freeze Gate passed **PASS / 0 BLOCKER** on 2026-09-06.

Frozen marker:

`frozen/cr-27a-buildingstock-transport-intent-reservation-bridge`

## 3. Frozen CR-27B boundary

CR-27B freezes this dispatch chain:

`ACTIVE CR-27A reservation -> frozen CR-26 CAN_SIMPLE_TRANSPORT eligibility/assignment -> legacy-compatible pending TransportJob projection -> {jobId, unitId} execution assignment -> existing TransportExecutionContract begin`

Authoritative rules:

- reservation remains `ACTIVE` during dispatch,
- `RELEASED` reservation is rejected,
- required workforce capability is always `CAN_SIMPLE_TRANSPORT`,
- Person selection/assignment runs only through frozen CR-26 `WorkforceJobEligibilityContract.selectAndAssign(...)`,
- `CarrierAssignmentService.assign()` is not used,
- selected `personId` is the same stable execution `unitId`,
- legacy `claim:`, `demand:` and `resource:` IDs are compatibility references only,
- no Claim/Demand/ResourceState store is created or mutated,
- TransportJob projection copies source Building, target Building, resource type and amount exactly from CR-27A,
- existing `TransportExecutionContract.begin(...)` is only the execution entry point.

CR-27B device/browser Verification / Freeze Gate passed **PASS / 0 BLOCKER** on 2026-09-06.

Frozen marker:

`frozen/cr-27b-workforce-aware-transport-dispatch-integration`

## 4. Frozen CR-27B exclusions

CR-27B contains no reservation release, BuildingStock settlement, workforce release after completion/cancel, legacy Claim/Demand/ResourceState store ownership, Carrier availability selection, Reachability calculation, new pathfinding/routes/movement algorithms/traffic/deadlock behavior, pickup/delivery execution, priority/scoring/JobEngine queue behavior, production/construction changes, SaveGame/rendering/gameplay UI/Inspector/balancing ownership.

## 5. Branch / Pages rule

- All CR-27A/B/C implementation stays on `feature/cr-27-game-facing-logistics-integration-foundation`.
- Frozen sub-block markers remain immutable markers only.
- GitHub Pages remains pointed at the active CR-27 branch during the whole CR-27 cycle.

## 6. Next allowed action

The next allowed sub-block is **CR-27C – Delivered Transport -> BuildingStock Settlement** on the same CR-27 feature branch. Before implementation, define its exact boundary against frozen CR-27A reservation ownership, frozen CR-27B dispatch/execution entry, CR-25 BuildingStock mutation ownership and the existing transport delivery evidence. Do not yet run the whole CR-27 freeze gate.

---

**Updated:** 2026-09-06 after device/browser CR-27B Verification / Freeze Gate: **PASS / 0 BLOCKER**. CR-27B is **FROZEN**; CR-27C is the next allowed sub-block.
