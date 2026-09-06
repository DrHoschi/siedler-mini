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
- CR-27B – Workforce-Aware Transport Dispatch Integration: **IMPLEMENTED / BROWSER FREEZE GATE EXPOSED / AWAITING DEVICE PASS / NOT FROZEN**
- CR-27C – Delivered Transport -> BuildingStock Settlement: **NOT STARTED**

## 2. Frozen CR-27A boundary

CR-27A owns immutable `building-stock-transport-reservation` values with stable `transport-reservation:` IDs, source/target `building:` IDs, `resource-type:` ID, positive amount and `ACTIVE -> RELEASED` lifecycle.

Availability remains:

`physical BuildingStock - sum(ACTIVE reservations for the same source/resource)`

CR-27A device/browser Verification / Freeze Gate passed **PASS / 0 BLOCKER** on 2026-09-06.

Frozen marker:

`frozen/cr-27a-buildingstock-transport-intent-reservation-bridge`

## 3. Implemented CR-27B boundary

CR-27B dispatch chain:

`ACTIVE CR-27A reservation -> frozen CR-26 CAN_SIMPLE_TRANSPORT eligibility/assignment -> legacy-compatible pending TransportJob projection -> {jobId, unitId} execution assignment -> existing TransportExecutionContract begin`

Authoritative rules:

- reservation must remain `ACTIVE` during dispatch,
- `RELEASED` reservation is rejected,
- required workforce capability is always `CAN_SIMPLE_TRANSPORT`,
- Person selection/assignment runs only through frozen CR-26 `WorkforceJobEligibilityContract.selectAndAssign(...)`,
- `CarrierAssignmentService.assign()` is not used,
- selected `personId` is projected as the same stable execution `unitId`,
- legacy `claim:`, `demand:` and `resource:` IDs are explicit compatibility references only,
- no Claim/Demand/ResourceState store is created or mutated,
- projected TransportJob copies source Building, target Building, resource type and amount exactly from CR-27A,
- existing `TransportExecutionContract.begin(...)` is used only as the execution entry point.

## 4. CR-27B browser Verification / Freeze Gate

The dedicated gate is exposed through `index.html` and `src/dev/cr-27b-freeze-gate.js`.

It regresses frozen CR-27A, all direct CR-27B tests and additionally verifies:

- ACTIVE reservation -> deterministic CR-26 selection -> ASSIGNED -> execution entry,
- selected Person identity equals execution `unitId`,
- exact TransportJob projection from CR-27A,
- RELEASED reservation rejection,
- missing capability / already-assigned / failed Reachability cannot bypass CR-26,
- reservation remains ACTIVE and unchanged,
- no CarrierAssignmentService, legacy-store or CR-27C settlement ownership leaks into the boundary.

Required device result:

`CR-27B WORKFORCE-AWARE TRANSPORT DISPATCH INTEGRATION VERIFICATION / FREEZE GATE: PASS / 0 BLOCKER`

## 5. CR-27B strict non-scope

CR-27B does not release/mutate CR-27A reservation, mutate BuildingStock, settle delivery, release workforce after completion/cancel, create/mutate legacy Claim/Demand/ResourceState stores, select through Carrier `AVAILABLE/OCCUPIED`, calculate Reachability, add pathfinding/routes/movement algorithms/traffic/deadlock behavior, execute pickup/delivery, add priority/scoring/JobEngine queue behavior, alter production/construction or add SaveGame/rendering/gameplay UI/Inspector/balancing.

## 6. Branch / Pages rule

- All CR-27A/B/C implementation stays on `feature/cr-27-game-facing-logistics-integration-foundation`.
- Frozen sub-block markers remain immutable markers only.
- GitHub Pages remains pointed at the active CR-27 branch during the whole CR-27 cycle.

## 7. Next allowed action

Run the dedicated CR-27B browser Verification / Freeze Gate on device. Do not begin CR-27C and do not create a CR-27B frozen marker before browser **PASS / 0 BLOCKER**.

---

**Updated:** 2026-09-06 after exposing the CR-27B browser Verification / Freeze Gate. CR-27B remains **NOT FROZEN** pending device/browser PASS / 0 BLOCKER.
