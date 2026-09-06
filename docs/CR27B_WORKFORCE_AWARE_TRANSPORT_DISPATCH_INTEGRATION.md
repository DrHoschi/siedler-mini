# CR-27B – Workforce-Aware Transport Dispatch Integration

**Parent:** CR-27 – Game-Facing Logistics Integration Foundation  
**Status:** PASS / FROZEN / 0 BLOCKER  
**Branch:** `feature/cr-27-game-facing-logistics-integration-foundation`  
**Frozen predecessor:** `frozen/cr-27a-buildingstock-transport-intent-reservation-bridge`

## 1. Purpose

CR-27B connects one frozen CR-27A BuildingStock transport reservation to the already existing transport execution foundation while keeping frozen CR-26 as the only authoritative workforce eligibility/assignment owner.

System boundary:

`ACTIVE CR-27A Reservation -> CR-26 CAN_SIMPLE_TRANSPORT Eligibility/Assignment -> legacy-compatible TransportJob projection -> {jobId, unitId} execution assignment -> existing TransportExecutionContract`

CR-27B is a dispatch adapter. It does not settle BuildingStock and it does not introduce a second workforce availability model.

## 2. Frozen inputs

### CR-27A

The input reservation must be a valid immutable `building-stock-transport-reservation` and must still be `ACTIVE`.

`RELEASED` is rejected because a released reservation no longer protects source availability.

### CR-26

Workforce selection and assignment runs only through `WorkforceJobEligibilityContract.selectAndAssign(...)` using:

- required capability `CAN_SIMPLE_TRANSPORT`,
- frozen `FREE / ASSIGNED / UNAVAILABLE` state,
- explicit Preconditions input,
- optional explicit Reachability result input.

CR-27B does not select a Person through Carrier state or any second availability source.

## 3. Frozen legacy transport compatibility boundary

`WorkforceAwareTransportDispatchIntegration.dispatch(...)` accepts stable compatibility `transport-job:`, `claim:`, `demand:`, `resource:` and workforce `assignment:` IDs and creates an immutable legacy-compatible `TransportJobContract` whose game-facing fields are copied exactly from CR-27A:

- `definitionId = reservation.resourceTypeId`,
- `sourceLocation = { kind: 'owner', refId: reservation.sourceBuildingId }`,
- `targetId = reservation.targetBuildingId`,
- `amount = reservation.amount`,
- `status = PENDING`.

Those compatibility references do not become gameplay owners and no legacy Claim, Demand or ResourceState store is created or mutated.

## 4. Frozen workforce / execution projection

After frozen CR-26 selects and assigns the Person, CR-27B projects:

`{ jobId: transportJob.id, unitId: selected personId }`

The same stable `unit:` identity is passed into `TransportExecutionContract.begin(...)`, producing the existing `TO_PICKUP` execution entry state.

`CarrierAssignmentService.assign()` is not used.

## 5. Frozen invariants

- input reservation is ACTIVE before dispatch,
- reservation remains byte-for-byte unchanged and ACTIVE after dispatch,
- required capability is always `CAN_SIMPLE_TRANSPORT`,
- only frozen CR-26 decides which Person is eligible and selected,
- no eligible Person returns `null`,
- selected `personId` equals execution `unitId`,
- CR-26 assigned state owns the dispatch assignment ID,
- transport projection copies source/target/resource type/amount exactly from CR-27A,
- compatibility IDs are stable and do not mutate legacy stores,
- Profile and input Assignment State values remain immutable,
- no Carrier `AVAILABLE/OCCUPIED` state participates in selection.

## 6. Strict non-scope

CR-27B does not release/mutate CR-27A reservation, mutate BuildingStock, settle delivery, release workforce after delivery/cancel, create/mutate legacy Claim/Demand/ResourceState stores, call `CarrierAssignmentService.assign()`, calculate Reachability, add pathfinding/routes/movement algorithms/traffic/deadlock logic, perform pickup/delivery execution, add priority/scoring/JobEngine queue behavior, alter production/construction or add SaveGame/rendering/gameplay UI/Inspector/balancing.

## 7. Frozen implementation files

- `src/domain/workforce-aware-transport-dispatch-integration.js`
- `src/dev/cr-27b-self-test.js`
- `src/dev/cr-27b-self-test.node.js`
- `src/dev/cr-27b-freeze-gate.js`
- `docs/CR27B_WORKFORCE_AWARE_TRANSPORT_DISPATCH_INTEGRATION.md`
- `index.html` exposes the accepted CR-27B browser gate.

## 8. Verification

The direct self-test covers ACTIVE/RELEASED gating, mandatory `CAN_SIMPLE_TRANSPORT`, ASSIGNED/UNAVAILABLE exclusion, deterministic selection, no-eligible-person behavior, selected Person/execution unit identity, immutable reservation/Profile/input state, exact TransportJob projection, compatibility-ID validation, explicit Reachability input and ownership-leakage guards.

The dedicated browser gate also regresses frozen CR-27A and verifies the integrated dispatch entry end-to-end.

Device/browser result accepted on 2026-09-06:

`CR-27B WORKFORCE-AWARE TRANSPORT DISPATCH INTEGRATION VERIFICATION / FREEZE GATE: PASS / 0 BLOCKER`

## 9. Freeze result

CR-27B is **PASS / FROZEN / 0 BLOCKER**. Its immutable marker is `frozen/cr-27b-workforce-aware-transport-dispatch-integration`.

Only CR-27C may extend the CR-27 chain from this point, and only within its separately defined settlement boundary.
