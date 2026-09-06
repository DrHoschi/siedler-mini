# CR-27A – BuildingStock Transport Intent & Reservation Bridge

**Parent:** CR-27 – Game-Facing Logistics Integration Foundation  
**Status:** PASS / FROZEN / 0 BLOCKER  
**Branch:** `feature/cr-27-game-facing-logistics-integration-foundation`  
**Frozen predecessor:** `frozen/cr-26-workforce-capability-job-eligibility-foundation` @ `8b06aa4a14793628c608a7fcf822cb9576bbf5b5`  
**Frozen marker:** `frozen/cr-27a-buildingstock-transport-intent-reservation-bridge`

## 1. Purpose

CR-27A introduces the game-facing boundary that can state:

> Transport a positive amount of one resource type from Building A to Building B, while reserving only source availability and without yet performing the transport.

The CR-25 BuildingStock remains the authoritative physical stock owner. CR-27A adds a separate transport reservation layer so multiple intents cannot over-commit the same source stock.

## 2. Frozen inputs

CR-27A consumes but does not modify:

- `BuildingStockContract`
- `BuildingStockMutationContract`

CR-26 workforce and the existing transport runtime remain downstream and out of CR-27A scope.

## 3. Frozen data boundary

`BuildingStockTransportReservationContract` defines immutable records with:

- stable `transport-reservation:` ID,
- `sourceBuildingId` – stable `building:` ID,
- `targetBuildingId` – stable `building:` ID,
- `resourceTypeId` – stable `resource-type:` ID,
- `amount` – positive safe integer,
- lifecycle `ACTIVE -> RELEASED`.

Released reservations are immutable successor values; the original ACTIVE input is not mutated.

## 4. Frozen availability invariant

For a given `(sourceBuildingId, resourceTypeId)`:

`availableForNewTransport = physicalBuildingStockQuantity - sum(ACTIVE reserved amounts)`

`BuildingStockTransportReservationService` owns deterministic:

- active reserved amount calculation,
- available amount calculation,
- reservation admission/rejection,
- duplicate reservation-ID rejection,
- source/resource isolation,
- over-reservation rejection.

Reservation/release never changes physical BuildingStock quantity.

## 5. Frozen non-scope

CR-27A contains no:

- TransportJob creation,
- Person/Carrier selection or assignment,
- `CAN_SIMPLE_TRANSPORT` use,
- Reachability calculation,
- route/pathfinding/movement,
- traffic/cell reservation/deadlock processing,
- physical source withdrawal,
- target BuildingStock addition,
- pickup/delivery/settlement,
- priority/scoring,
- production/construction/work execution,
- SaveGame/rendering/gameplay UI/Inspector/balancing ownership.

No existing CR-25, CR-26 or `src/transport/*` contract was semantically modified for CR-27A.

## 6. Implemented files

- `src/domain/building-stock-transport-reservation-contract.js`
- `src/domain/building-stock-transport-reservation-service.js`
- `src/dev/cr-27a-self-test.js`
- `src/dev/cr-27a-self-test.node.js`
- `src/dev/cr-27a-freeze-gate.js`
- `index.html` – CR-27A Browser Verification / Freeze Gate surface

## 7. Verification

Direct tests cover valid/exact-fit reservation, overcommit rejection, source/resource isolation, RELEASED availability recovery, unchanged physical BuildingStock, input-order independence, invalid IDs/amounts, duplicate reservation IDs and CR-27B/C scope leakage.

The device/browser **CR-27A Verification / Freeze Gate** passed on 2026-09-06 with:

`CR-27A BUILDINGSTOCK TRANSPORT INTENT & RESERVATION BRIDGE VERIFICATION / FREEZE GATE: PASS / 0 BLOCKER`

## 8. Freeze result

CR-27A is **PASS / FROZEN / 0 BLOCKER**.

The immutable frozen marker is:

`frozen/cr-27a-buildingstock-transport-intent-reservation-bridge`

The next allowed sub-block is **CR-27B – Workforce-Aware Transport Dispatch Integration** on the existing CR-27 development branch. CR-27A ownership must not be reopened there.