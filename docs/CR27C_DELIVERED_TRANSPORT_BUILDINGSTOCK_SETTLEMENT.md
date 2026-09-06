# CR-27C – Delivered Transport -> BuildingStock Settlement

**Parent:** CR-27 – Game-Facing Logistics Integration Foundation  
**Status:** IMPLEMENTED / BROWSER FREEZE GATE EXPOSED / AWAITING DEVICE PASS / NOT FROZEN  
**Branch:** `feature/cr-27-game-facing-logistics-integration-foundation`  
**Frozen predecessors:** `frozen/cr-27a-buildingstock-transport-intent-reservation-bridge`, `frozen/cr-27b-workforce-aware-transport-dispatch-integration`

## 1. Purpose

CR-27C closes one successfully delivered CR-27 transport against the frozen game-facing owners.

System boundary:

`confirmed delivered-cargo + frozen CR-27B dispatch + current source/target CR-25 BuildingStock + current CR-27A reservation + current CR-26 workforce state -> source remove + target add + reservation RELEASED + workforce FREE`

Existing transport delivery evidence is authoritative for successful delivery; CR-27C does not decide arrival.

## 2. Required delivery and owner linkage

Settlement requires delivery evidence matching the frozen CR-27B dispatch exactly by `jobId`, selected `unitId/personId`, compatibility `resourceId`, target Building and amount.

The current reservation must match the dispatch reservation and remain `ACTIVE`. The current workforce state must match the selected Person, remain `ASSIGNED`, and own the exact dispatch `assignmentId`. Source/target BuildingStock must match the reservation source/target Building and resource type.

## 3. Atomic immutable settlement

Only after complete validation are successor values computed through frozen owners:

1. `BuildingStockMutationContract.remove(sourceStock, amount)`,
2. `BuildingStockMutationContract.add(targetStock, amount)`,
3. `BuildingStockTransportReservationContract.release(reservation)`,
4. `WorkforceAssignmentStateContract.release(workforceState)`.

No input object is mutated. Underflow, overflow or any linkage/state failure returns no settlement result. Successful settlement conserves `source + target` quantity and moves exactly the reservation amount.

Committed successor owner states (`RELEASED` / `FREE`) cannot be settled again.

## 4. Strict non-scope

CR-27C does not decide arrival, create delivery evidence, perform pickup/delivery movement, support partial/multi-trip delivery, implement cancel/failure/recovery settlement, redispatch, redesign TransportJob lifecycle, mutate legacy Claim/Demand/ResourceState stores, use Carrier availability, add pathfinding/routes/movement/traffic/deadlock behavior, add priority/scoring, alter production/construction, or add SaveGame/rendering/gameplay UI/Inspector/balancing.

## 5. Implemented files

- `src/domain/delivered-transport-building-stock-settlement.js`
- `src/dev/cr-27c-self-test.js`
- `src/dev/cr-27c-self-test.node.js`
- `src/dev/cr-27c-freeze-gate.js`
- `docs/CR27C_DELIVERED_TRANSPORT_BUILDINGSTOCK_SETTLEMENT.md`
- `index.html` exposes the CR-27C browser gate.

## 6. Direct test matrix

The direct self-test covers valid settlement, all delivery identity/amount mismatches, reservation/workforce owner-state validation, source/target identity validation, source underflow, target overflow, release successors, duplicate prevention via committed successor owner state, quantity conservation, byte-for-byte input immutability and strict ownership/scope guards.

## 7. Browser Verification / Freeze Gate

`src/dev/cr-27c-freeze-gate.js` regresses frozen CR-27B (and therefore CR-27A), all direct CR-27C tests and additional end-to-end settlement invariants.

It verifies:

- confirmed delivery settles exact source -> target quantity,
- reservation becomes `RELEASED`, workforce becomes `FREE`,
- total BuildingStock quantity is conserved,
- delivery linkage cannot be bypassed,
- owner-state, source underflow and target overflow guards cannot be bypassed,
- committed successor states reject another settlement,
- all inputs remain unchanged,
- no post-scope transport/legacy-store/Carrier ownership leaks into settlement.

Required browser/device result:

`CR-27C DELIVERED TRANSPORT → BUILDINGSTOCK SETTLEMENT VERIFICATION / FREEZE GATE: PASS / 0 BLOCKER`

## 8. Freeze condition

CR-27C remains **NOT FROZEN** until the dedicated browser Verification / Freeze Gate passes with **PASS / 0 BLOCKER**, control documents are synchronized and the immutable CR-27C marker is created.

Only after CR-27C freezes may the whole CR-27 Completion / Regression / Freeze Gate be built and executed.
