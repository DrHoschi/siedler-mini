# CR-27B – Workforce-Aware Transport Dispatch Integration

**Parent:** CR-27 – Game-Facing Logistics Integration Foundation  
**Status:** TECHNICAL SPECIFICATION / IMPLEMENTATION START  
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

Workforce selection and assignment must run only through `WorkforceJobEligibilityContract.selectAndAssign(...)` using:

- required capability `CAN_SIMPLE_TRANSPORT`,
- frozen `FREE / ASSIGNED / UNAVAILABLE` state,
- explicit Preconditions input,
- optional explicit Reachability result input.

CR-27B must not select a Person through Carrier state or any second availability source.

## 3. Legacy transport compatibility boundary

The existing `TransportJobContract` requires stable compatibility references:

- `transport-job:` ID,
- `claim:` ID,
- `demand:` ID,
- `resource:` ID.

CR-27B may receive these stable IDs as explicit projection references and create an immutable legacy-compatible `TransportJobContract` value whose game-facing fields are derived exactly from CR-27A:

- `definitionId = reservation.resourceTypeId`,
- `sourceLocation = { kind: 'owner', refId: reservation.sourceBuildingId }`,
- `targetId = reservation.targetBuildingId`,
- `amount = reservation.amount`,
- `status = PENDING`.

These compatibility references do **not** become gameplay owners. CR-27B must not create or mutate legacy Claim, Demand or ResourceState stores.

## 4. Workforce / execution projection

After CR-26 selects and assigns the Person, CR-27B creates an immutable execution assignment projection:

`{ jobId: transportJob.id, unitId: selected personId }`

The same stable `unit:` identity is used by the existing transport execution foundation.

`CarrierAssignmentService.assign()` is forbidden in CR-27B because it independently selects by `CarrierContract AVAILABLE/OCCUPIED` and would bypass frozen CR-26 ownership.

CR-27B may begin the existing `TransportExecutionContract` from the projected pending job and execution assignment.

## 5. Required invariants

- input reservation is ACTIVE before dispatch,
- reservation remains byte-for-byte unchanged and ACTIVE after dispatch,
- required capability is always `CAN_SIMPLE_TRANSPORT`,
- only frozen CR-26 decides which Person is eligible and selected,
- no eligible Person returns no dispatch result rather than inventing a Carrier,
- selected `personId` equals execution `unitId`,
- CR-26 assigned state owns the dispatch assignment ID,
- transport projection copies source/target/resource type/amount exactly from CR-27A,
- projection compatibility IDs are stable and do not mutate legacy stores,
- Profile and input Assignment State values remain immutable,
- no Carrier `AVAILABLE/OCCUPIED` state participates in selection.

## 6. Strict non-scope

CR-27B must not:

- release or otherwise mutate CR-27A reservation state,
- remove physical source BuildingStock,
- add target BuildingStock,
- settle a delivery,
- release workforce after delivery/cancel,
- create or mutate legacy Claim/Demand/ResourceState stores,
- call `CarrierAssignmentService.assign()`,
- calculate Reachability,
- add pathfinding, routes, movement algorithms, traffic, reservations or deadlock logic,
- perform pickup/delivery execution,
- add priority/scoring/JobEngine queue behavior,
- alter production/construction,
- add SaveGame/rendering/gameplay UI/Inspector/balancing.

Those completion/settlement concerns remain CR-27C or later.

## 7. Planned implementation

Minimum pieces:

- `src/domain/workforce-aware-transport-dispatch-integration.js`,
- direct self-test,
- Node runner,
- control-document synchronization.

No CR-27B browser Verification / Freeze Gate is part of this implementation step.

## 8. Direct test matrix

The direct tests must cover at least:

1. valid ACTIVE reservation dispatches through CR-26,
2. RELEASED reservation is rejected,
3. `CAN_SIMPLE_TRANSPORT` is mandatory,
4. ASSIGNED and UNAVAILABLE candidates are excluded by CR-26,
5. deterministic selected Person remains stable under candidate order changes,
6. no eligible Person returns `null`,
7. selected `personId === executionAssignment.unitId === execution.unitId`,
8. reservation remains unchanged and ACTIVE,
9. Profile/input workforce state remain unchanged,
10. TransportJob projection copies source/target/resource/amount exactly,
11. invalid compatibility IDs are rejected,
12. no CarrierAssignmentService/Carrier availability state is introduced,
13. no legacy Claim/Demand/ResourceState mutation surface is introduced,
14. no CR-27C settlement/release behavior leaks into the result.

## 9. Freeze condition

CR-27B remains **NOT FROZEN** after this implementation step. A dedicated browser Verification / Freeze Gate must be built and pass with **PASS / 0 BLOCKER** before an immutable CR-27B marker may be created and before CR-27C begins.
