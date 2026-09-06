# CR-27C – Delivered Transport -> BuildingStock Settlement

**Parent:** CR-27 – Game-Facing Logistics Integration Foundation  
**Status:** IMPLEMENTED / DIRECT TESTS ADDED / NOT FROZEN  
**Branch:** `feature/cr-27-game-facing-logistics-integration-foundation`  
**Frozen predecessors:** `frozen/cr-27a-buildingstock-transport-intent-reservation-bridge`, `frozen/cr-27b-workforce-aware-transport-dispatch-integration`

## 1. Purpose

CR-27C closes one successfully delivered CR-27 transport against the frozen game-facing owners.

System boundary:

`confirmed delivered-cargo + frozen CR-27B dispatch + current source/target CR-25 BuildingStock + current CR-27A reservation + current CR-26 workforce state -> source remove + target add + reservation RELEASED + workforce FREE`

CR-27C does not decide whether movement reached the target. Existing transport delivery evidence is authoritative for that fact.

## 2. Required delivery evidence

Settlement requires a `delivered-cargo` evidence record compatible with the existing delivery runtime.

The evidence must match the frozen CR-27B dispatch exactly:

- `delivery.jobId === dispatch.job.id`,
- `delivery.unitId === dispatch.workforce.personId`,
- `delivery.unitId === dispatch.executionAssignment.unitId`,
- `delivery.resourceId === dispatch.job.resourceId`,
- `delivery.targetId === dispatch.reservation.targetBuildingId`,
- `delivery.amount === dispatch.reservation.amount`.

CR-27C does not reconstruct source Building or resource type from delivery evidence. Those remain owned by frozen CR-27A / CR-27B.

## 3. Required current owner state

`DeliveredTransportBuildingStockSettlement.settle(...)` receives the current authoritative owner values separately from the frozen dispatch snapshot.

Before settlement:

- current reservation must match the dispatch reservation identity/data and still be `ACTIVE`,
- current workforce state must match the selected Person and still be `ASSIGNED`,
- current workforce `assignmentId` must equal the dispatch compatibility `assignmentId`,
- source BuildingStock must match reservation source Building and resource type,
- target BuildingStock must match reservation target Building and resource type.

## 4. Implemented atomic settlement result

After all linkage/owner validation succeeds, the adapter computes immutable successor values through existing frozen contracts only:

1. `nextSourceStock = BuildingStockMutationContract.remove(sourceStock, amount)`,
2. `nextTargetStock = BuildingStockMutationContract.add(targetStock, amount)`,
3. `releasedReservation = BuildingStockTransportReservationContract.release(reservation)`,
4. `releasedWorkforceState = WorkforceAssignmentStateContract.release(workforceState)`.

No input object is mutated. The underlying contracts are pure immutable transformations, so if underflow, overflow or another successor calculation rejects, no partial external mutation has occurred and no settlement result is returned.

Transfer invariant:

`sourceBefore + targetBefore === sourceAfter + targetAfter`

for the transferred resource type, with exactly `reservation.amount` moved from source to target.

## 5. Exactly-once owner-state boundary

The authoritative once-token remains the existing owner state:

- settlement requires current reservation `ACTIVE`,
- success returns reservation `RELEASED`,
- settlement requires current workforce `ASSIGNED`,
- success returns workforce `FREE`.

Re-applying settlement using the committed successor owner states is rejected. CR-27C introduces no second settlement store or mutable settlement registry.

## 6. Strict non-scope

CR-27C does not:

- decide arrival or create delivery evidence,
- perform pickup or delivery movement,
- support partial deliveries or multiple trips for one reservation,
- implement cancel/failure/recovery settlement,
- redispatch work,
- change TransportJob lifecycle semantics,
- mutate legacy Claim/Demand/ResourceState stores,
- use Carrier `AVAILABLE/OCCUPIED`,
- add pathfinding/routes/movement/traffic/deadlock behavior,
- add job priority/scoring,
- alter production/construction,
- add SaveGame/rendering/gameplay UI/Inspector/balancing.

## 7. Implemented files

- `src/domain/delivered-transport-building-stock-settlement.js`,
- `src/dev/cr-27c-self-test.js`,
- `src/dev/cr-27c-self-test.node.js`,
- `docs/CR27C_DELIVERED_TRANSPORT_BUILDINGSTOCK_SETTLEMENT.md`.

No CR-27C browser Verification / Freeze Gate and no whole CR-27 Completion / Regression / Freeze Gate were added in this implementation step.

## 8. Direct test matrix

The direct self-test covers:

1. valid delivered transport source -> target settlement,
2. wrong delivery `jobId`,
3. wrong delivery `unitId`,
4. wrong delivery `resourceId`,
5. wrong delivery `targetId`,
6. wrong delivery `amount`,
7. non-ACTIVE current reservation,
8. non-ASSIGNED current workforce,
9. workforce assignment-ID mismatch,
10. source Building/resource mismatch,
11. target Building/resource mismatch,
12. source underflow,
13. target overflow,
14. successful reservation/workforce release,
15. rejection when committed successor owner states are applied again,
16. source + target quantity conservation,
17. byte-for-byte unchanged inputs,
18. ownership/scope leakage guard.

Node runner: `src/dev/cr-27c-self-test.node.js`.

## 9. Freeze condition

CR-27C remains **NOT FROZEN**. The next allowed step is a dedicated CR-27C browser Verification / Freeze Gate. Only browser **PASS / 0 BLOCKER** permits the immutable CR-27C marker. Only after CR-27C freezes may the whole CR-27 Completion / Regression / Freeze Gate be built and executed.
