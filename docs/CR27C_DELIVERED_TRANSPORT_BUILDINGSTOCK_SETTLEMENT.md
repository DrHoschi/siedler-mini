# CR-27C – Delivered Transport -> BuildingStock Settlement

**Parent:** CR-27 – Game-Facing Logistics Integration Foundation  
**Status:** PASS / FROZEN / 0 BLOCKER  
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

## 5. Frozen implementation files

- `src/domain/delivered-transport-building-stock-settlement.js`
- `src/dev/cr-27c-self-test.js`
- `src/dev/cr-27c-self-test.node.js`
- `src/dev/cr-27c-freeze-gate.js`
- `docs/CR27C_DELIVERED_TRANSPORT_BUILDINGSTOCK_SETTLEMENT.md`
- `index.html` exposes the accepted CR-27C browser gate.

## 6. Verification

The direct self-test covers valid settlement, all delivery identity/amount mismatches, reservation/workforce owner-state validation, source/target identity validation, source underflow, target overflow, release successors, duplicate prevention via committed successor owner state, quantity conservation, byte-for-byte input immutability and strict ownership/scope guards.

`src/dev/cr-27c-freeze-gate.js` additionally regresses frozen CR-27B (and therefore CR-27A) and the integrated settlement boundary.

Device/browser result accepted on 2026-09-06:

`CR-27C DELIVERED TRANSPORT → BUILDINGSTOCK SETTLEMENT VERIFICATION / FREEZE GATE: PASS / 0 BLOCKER`

## 7. Freeze result

CR-27C is **PASS / FROZEN / 0 BLOCKER**.

Immutable marker:

`frozen/cr-27c-delivered-transport-buildingstock-settlement`

Only after this sub-block freeze may the whole **CR-27 Completion / Regression / Freeze Gate** be built and executed. CR-27 as a whole remains ACTIVE / NOT FROZEN until that combined gate passes.
