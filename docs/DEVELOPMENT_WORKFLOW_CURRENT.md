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
- CR-27C – Delivered Transport -> BuildingStock Settlement: **IMPLEMENTED / DIRECT TESTS ADDED / NOT FROZEN**

## 2. Frozen CR-27A boundary

CR-27A owns immutable `building-stock-transport-reservation` values with stable `transport-reservation:` IDs, source/target `building:` IDs, `resource-type:` ID, positive amount and `ACTIVE -> RELEASED` lifecycle.

Availability remains:

`physical BuildingStock - sum(ACTIVE reservations for the same source/resource)`

Frozen marker: `frozen/cr-27a-buildingstock-transport-intent-reservation-bridge`.

## 3. Frozen CR-27B boundary

CR-27B freezes this dispatch chain:

`ACTIVE CR-27A reservation -> frozen CR-26 CAN_SIMPLE_TRANSPORT eligibility/assignment -> legacy-compatible pending TransportJob projection -> {jobId, unitId} execution assignment -> existing TransportExecutionContract begin`

CR-26 remains the sole workforce selection/assignment owner; Carrier `AVAILABLE/OCCUPIED` is not a second gameplay truth.

Frozen marker: `frozen/cr-27b-workforce-aware-transport-dispatch-integration`.

## 4. Implemented CR-27C boundary

CR-27C now implements the immutable settlement adapter:

`confirmed delivered-cargo + frozen CR-27B dispatch + current source/target BuildingStock + current ACTIVE reservation + current ASSIGNED workforce -> source remove + target add + reservation RELEASED + workforce FREE`

Authoritative rules:

- delivery evidence must match dispatch `jobId`, selected `unitId/personId`, legacy `resourceId`, target Building and amount,
- source Building and resource type come from frozen CR-27A/CR-27B ownership, not from delivery reconstruction,
- current reservation must still match the dispatch reservation and be `ACTIVE`,
- current workforce must still be the selected Person, be `ASSIGNED` and own the exact dispatch `assignmentId`,
- source/target BuildingStock must match the reservation Building/resource identities,
- stock mutation uses only frozen CR-25 `BuildingStockMutationContract.remove/add`,
- reservation closure uses only frozen CR-27A `release`,
- workforce release uses only frozen CR-26 `WorkforceAssignmentStateContract.release`,
- all validation happens before immutable successor values are calculated,
- failure returns no partial settlement result and mutates no input,
- successful transfer conserves total source + target quantity for the resource type,
- committed successor owner states (`RELEASED` / `FREE`) cannot be settled again.

Implemented files:

- `src/domain/delivered-transport-building-stock-settlement.js`
- `src/dev/cr-27c-self-test.js`
- `src/dev/cr-27c-self-test.node.js`
- `docs/CR27C_DELIVERED_TRANSPORT_BUILDINGSTOCK_SETTLEMENT.md`

## 5. CR-27C strict non-scope

CR-27C does not decide arrival, create delivery evidence, perform pickup/delivery movement, support partial delivery/multiple trips, implement cancel/failure/recovery settlement, redispatch, change TransportJob lifecycle semantics, mutate legacy Claim/Demand/ResourceState stores, use Carrier availability, add pathfinding/routes/movement/traffic/deadlock behavior, add priority/scoring, alter production/construction or add SaveGame/rendering/gameplay UI/Inspector/balancing.

## 6. Direct CR-27C tests added

The direct self-test covers happy-path source->target settlement, all delivery identity/amount mismatch cases, reservation/workforce owner-state validation, source/target identity validation, source underflow, target overflow, release successors, successor-state duplicate prevention, conservation, full input immutability and strict scope guards.

## 7. Branch / Pages rule

- All CR-27A/B/C implementation stays on `feature/cr-27-game-facing-logistics-integration-foundation`.
- Frozen sub-block markers remain immutable markers only.
- GitHub Pages remains pointed at the active CR-27 branch during the whole CR-27 cycle.
- `index.html` remains on the accepted CR-27B page until the dedicated CR-27C browser gate is deliberately exposed.

## 8. Next allowed action

Build the dedicated **CR-27C browser Verification / Freeze Gate** around the new settlement adapter, direct CR-27C tests and frozen predecessor regressions. Do not create a CR-27C frozen marker and do not build the whole CR-27 Completion / Regression / Freeze Gate before browser **PASS / 0 BLOCKER**.

---

**Updated:** 2026-09-06 after CR-27C technical specification, atomic settlement adapter implementation and direct self-test addition. CR-27C remains **NOT FROZEN** pending its browser Verification / Freeze Gate.
