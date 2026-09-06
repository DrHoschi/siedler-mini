# CR-27A – BuildingStock Transport Intent & Reservation Bridge

**Parent:** CR-27 – Game-Facing Logistics Integration Foundation  
**Status:** TECHNICAL PREPARATION / NOT IMPLEMENTED / NOT FROZEN  
**Branch:** `feature/cr-27-game-facing-logistics-integration-foundation`  
**Frozen predecessor:** `frozen/cr-26-workforce-capability-job-eligibility-foundation` @ `8b06aa4a14793628c608a7fcf822cb9576bbf5b5`

## 1. Purpose

CR-27A introduces the game-facing boundary that can state:

> Transport a positive amount of one resource type from Building A to Building B, while reserving only source availability and without yet performing the transport.

The CR-25 BuildingStock remains the authoritative physical stock owner. CR-27A adds a separate transport-intent/reservation layer so multiple intents cannot over-commit the same source stock.

## 2. Frozen inputs

CR-27A consumes but does not modify these frozen contracts:

- `BuildingStockContract`
  - stable `building:` owner
  - stable `resource-type:`
  - non-negative physical `quantity`
- `BuildingStockMutationContract`
  - remains the only existing CR-25 stock mutation boundary
  - must not be invoked merely to reserve transport availability

CR-26 workforce and the existing transport runtime are deliberately downstream and out of CR-27A scope.

## 3. Required CR-27A data boundary

A transport intent/reservation must contain at least:

- stable intent/reservation ID with its own stable ID kind,
- `sourceBuildingId` – stable `building:` ID,
- `targetBuildingId` – stable `building:` ID,
- `resourceTypeId` – stable `resource-type:` ID,
- `amount` – positive safe integer,
- explicit lifecycle/state sufficient to distinguish an active reservation from an ended reservation.

Source and target must not be silently rewritten. The contract is immutable.

## 4. Availability invariant

For a given `(sourceBuildingId, resourceTypeId)`:

`availableForNewTransport = physicalBuildingStockQuantity - sum(activeReservedAmounts)`

Required invariants:

- available quantity must never become negative,
- creation/activation of a reservation greater than available quantity is rejected deterministically,
- multiple active reservations are accumulated independent of input ordering,
- a reservation belonging to another source Building or resource type does not reduce this availability,
- an ended reservation no longer blocks availability,
- reservation alone never changes physical BuildingStock quantity.

## 5. Strict non-scope

CR-27A must not:

- create a TransportJob,
- select or assign a Person or Carrier,
- use `CAN_SIMPLE_TRANSPORT` yet,
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

## 6. Planned implementation shape

Keep the implementation isolated from the mature transport runtime, preferably under `src/domain/`, because this sub-block is still a game-facing stock ownership/reservation contract rather than transport execution.

Minimum pieces:

- immutable transport-intent/reservation contract,
- deterministic reservation availability evaluator/service,
- direct Node/self-test,
- dedicated browser Verification / Freeze Gate,
- CR-27A documentation/status synchronization.

No existing CR-25, CR-26 or `src/transport/*` file should require semantic modification for CR-27A.

## 7. Minimum test matrix

The CR-27A gate must cover at least:

1. valid reservation below available stock succeeds,
2. exact remaining quantity succeeds,
3. amount above remaining quantity is rejected,
4. two active reservations cannot jointly exceed physical stock,
5. reservations for different source Buildings remain independent,
6. reservations for different resource types remain independent,
7. ended reservation frees its reserved availability,
8. source BuildingStock remains byte-for-byte unchanged by reserve/release operations,
9. input order does not change deterministic availability/result,
10. invalid stable IDs, zero/negative/non-integer amount are rejected,
11. no result leaks CR-27B/C concerns such as `personId`, `carrier`, `transportJob`, `route`, `movement`, `delivery` or stock settlement.

## 8. Freeze condition

CR-27A may become **PASS / FROZEN / 0 BLOCKER** only after:

- direct tests pass,
- browser Verification / Freeze Gate reports PASS / 0 BLOCKER,
- scope-leakage check passes,
- control docs are synchronized,
- immutable `frozen/cr-27a-...` marker is created from the accepted state.

Only then may CR-27B begin on the same CR-27 development branch.
