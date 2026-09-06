# CR-27A – BuildingStock Transport Intent & Reservation Bridge

**Parent:** CR-27 – Game-Facing Logistics Integration Foundation  
**Status:** IMPLEMENTED / DIRECT TESTS ADDED / NOT FROZEN  
**Branch:** `feature/cr-27-game-facing-logistics-integration-foundation`  
**Frozen predecessor:** `frozen/cr-26-workforce-capability-job-eligibility-foundation` @ `8b06aa4a14793628c608a7fcf822cb9576bbf5b5`

## 1. Purpose

CR-27A introduces the game-facing boundary that can state:

> Transport a positive amount of one resource type from Building A to Building B, while reserving only source availability and without yet performing the transport.

The CR-25 BuildingStock remains the authoritative physical stock owner. CR-27A adds a separate transport reservation layer so multiple intents cannot over-commit the same source stock.

## 2. Frozen inputs

CR-27A consumes but does not modify these frozen contracts:

- `BuildingStockContract`
- `BuildingStockMutationContract`

CR-26 workforce and the existing transport runtime remain downstream and out of CR-27A scope.

## 3. Implemented data boundary

`BuildingStockTransportReservationContract` defines immutable records with:

- stable `transport-reservation:` ID,
- `sourceBuildingId` – stable `building:` ID,
- `targetBuildingId` – stable `building:` ID,
- `resourceTypeId` – stable `resource-type:` ID,
- `amount` – positive safe integer,
- lifecycle `ACTIVE -> RELEASED`.

Released reservations are immutable successor values; the original ACTIVE input is not mutated.

## 4. Implemented availability invariant

For a given `(sourceBuildingId, resourceTypeId)`:

`availableForNewTransport = physicalBuildingStockQuantity - sum(ACTIVE reserved amounts)`

`BuildingStockTransportReservationService` provides deterministic:

- active reserved amount calculation,
- available amount calculation,
- reservation admission/rejection,
- duplicate reservation-ID rejection,
- source/resource isolation,
- over-reservation rejection.

A reservation alone never changes physical BuildingStock quantity.

## 5. Strict non-scope

CR-27A does not:

- create a TransportJob,
- select or assign a Person or Carrier,
- use `CAN_SIMPLE_TRANSPORT`,
- calculate Reachability,
- calculate routes/pathfinding,
- move any unit,
- enter traffic/cell reservation/deadlock processing,
- remove physical stock from the source,
- add physical stock to the target,
- perform pickup/delivery/settlement,
- add job priority/scoring,
- alter production or construction,
- add SaveGame, rendering, gameplay UI, Inspector or balancing logic.

No existing CR-25, CR-26 or `src/transport/*` contract was semantically modified for CR-27A.

## 6. Implemented files

- `src/domain/building-stock-transport-reservation-contract.js`
- `src/domain/building-stock-transport-reservation-service.js`
- `src/dev/cr-27a-self-test.js`
- `src/dev/cr-27a-self-test.node.js`

## 7. Direct test matrix

The direct self-test covers:

1. valid reservation below available stock succeeds,
2. exact remaining quantity succeeds,
3. amount above remaining quantity is rejected,
4. two active reservations cannot jointly exceed physical stock,
5. reservations for different source Buildings remain independent,
6. reservations for different resource types remain independent,
7. RELEASED reservation frees its reserved availability,
8. source BuildingStock remains byte-for-byte unchanged by reserve/release operations,
9. input order does not change deterministic availability,
10. invalid stable IDs, zero/negative/non-integer amount are rejected,
11. duplicate reservation IDs are rejected,
12. no result leaks CR-27B/C concerns such as Person, Carrier, TransportJob, route, movement, delivery or settlement.

## 8. Current gate status

Implementation and direct test code are present, but CR-27A is **not frozen yet**.

Next required step:

- build the dedicated browser Verification / Freeze Gate,
- run it on the active CR-27 Pages branch,
- require **PASS / 0 BLOCKER**,
- then synchronize docs and create the immutable CR-27A frozen marker.

Only after that may CR-27B begin on the same CR-27 development branch.
