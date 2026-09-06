# CR-27C – Delivered Transport -> BuildingStock Settlement

**Parent:** CR-27 – Game-Facing Logistics Integration Foundation  
**Status:** TECHNICAL SPECIFICATION / IMPLEMENTATION START  
**Branch:** `feature/cr-27-game-facing-logistics-integration-foundation`  
**Frozen predecessors:** `frozen/cr-27a-buildingstock-transport-intent-reservation-bridge`, `frozen/cr-27b-workforce-aware-transport-dispatch-integration`

## 1. Purpose

CR-27C closes one successfully delivered CR-27 transport against the frozen game-facing owners.

System boundary:

`confirmed delivered-cargo + frozen CR-27B dispatch + source/target CR-25 BuildingStock -> source remove + target add + CR-27A reservation RELEASED + CR-26 workforce FREE`

CR-27C does not decide whether movement reached the target. Existing transport delivery evidence is authoritative for that fact.

## 2. Required delivery evidence

Settlement requires an immutable `delivered-cargo` evidence record produced by the existing delivery runtime.

The evidence must match the frozen CR-27B dispatch exactly:

- `delivery.jobId === dispatch.job.id`,
- `delivery.unitId === dispatch.workforce.personId`,
- `delivery.unitId === dispatch.executionAssignment.unitId`,
- `delivery.resourceId === dispatch.job.resourceId`,
- `delivery.targetId === dispatch.reservation.targetBuildingId`,
- `delivery.amount === dispatch.reservation.amount`.

CR-27C does not reconstruct source Building or resource type from delivery evidence. Those remain owned by the frozen CR-27A reservation / CR-27B projection.

## 3. Required frozen owner state

Before settlement:

- the CR-27A reservation must still be `ACTIVE`,
- the CR-26 workforce state inside the dispatch must still be `ASSIGNED`,
- its `assignmentId` must equal the dispatch compatibility `assignmentId`,
- source BuildingStock must match reservation source Building and resource type,
- target BuildingStock must match reservation target Building and resource type.

## 4. Atomic settlement result

After all validation succeeds, CR-27C computes immutable successor values through existing frozen contracts only:

1. `nextSourceStock = BuildingStockMutationContract.remove(sourceStock, amount)`,
2. `nextTargetStock = BuildingStockMutationContract.add(targetStock, amount)`,
3. `releasedReservation = BuildingStockTransportReservationContract.release(reservation)`,
4. `releasedWorkforceState = WorkforceAssignmentStateContract.release(assignedWorkforceState)`.

No input object is mutated.

If any validation or any successor calculation fails, CR-27C returns no partial result and all input values remain unchanged.

The resulting transfer invariant is:

`sourceBefore + targetBefore === sourceAfter + targetAfter`

for the transferred resource type, while exactly `reservation.amount` moves from source to target.

## 5. Exactly-once boundary

The authoritative once-token is the frozen owner state:

- settlement requires `reservation.state === ACTIVE`,
- successful settlement returns `reservation.state === RELEASED`,
- settlement requires workforce `ASSIGNED`,
- successful settlement returns workforce `FREE`.

Re-applying settlement using the committed successor owner states is rejected. CR-27C does not introduce a second settlement store or mutable settlement registry.

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

## 7. Planned implementation

Minimum pieces:

- `src/domain/delivered-transport-building-stock-settlement.js`,
- `src/dev/cr-27c-self-test.js`,
- `src/dev/cr-27c-self-test.node.js`,
- control-document synchronization.

No CR-27C browser Verification / Freeze Gate and no whole CR-27 Completion / Regression / Freeze Gate are part of this implementation step.

## 8. Direct test matrix

Direct tests must cover at least:

1. valid delivered transport settles source -> target,
2. wrong delivery `jobId` rejected,
3. wrong delivery `unitId` rejected,
4. wrong delivery `resourceId` rejected,
5. wrong delivery `targetId` rejected,
6. wrong delivery `amount` rejected,
7. non-ACTIVE reservation rejected,
8. workforce state must be ASSIGNED,
9. workforce assignment ID must match dispatch assignment ID,
10. source Building/resource mismatch rejected,
11. target Building/resource mismatch rejected,
12. source underflow rejected,
13. target overflow rejected,
14. successful result releases reservation and workforce,
15. committed successor owner states cannot be settled again,
16. source + target quantity is conserved,
17. all inputs remain byte-for-byte unchanged,
18. no legacy-store/Carrier/path/movement/CR-27-post-scope ownership leaks into the adapter.

## 9. Freeze condition

CR-27C remains **NOT FROZEN** after this implementation step. A dedicated CR-27C browser Verification / Freeze Gate must later pass with **PASS / 0 BLOCKER** before CR-27C can freeze. Only after that may the whole CR-27 Completion / Regression / Freeze Gate be built and executed.
