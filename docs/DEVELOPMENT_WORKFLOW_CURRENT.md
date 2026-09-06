# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development/control branch: `feature/cr-27-game-facing-logistics-integration-foundation`
- Current immutable gameplay baseline: **CR-26 – Workforce Capability & Job Eligibility Foundation**
- Frozen baseline branch: `frozen/cr-26-workforce-capability-job-eligibility-foundation`
- Frozen baseline HEAD at CR-27 branch creation: `8b06aa4a14793628c608a7fcf822cb9576bbf5b5`
- CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-27 – Game-Facing Logistics Integration Foundation: **ACTIVE / NOT FROZEN**
- CR-27A – BuildingStock Transport Intent & Reservation Bridge: **IMPLEMENTED / DIRECT TESTS ADDED / NOT FROZEN**

## 2. Accepted CR-27 decomposition

### CR-27A – BuildingStock Transport Intent & Reservation Bridge

Express a transport request from stable source Building to stable target Building for one `resource-type` and positive amount. Availability is derived from the frozen CR-25 BuildingStock owner. A separate transport reservation layer prevents the same source quantity from being simultaneously committed more than once. CR-25 contracts remain unchanged.

### CR-27B – Workforce-Aware Transport Dispatch Integration

Later connect a released CR-27A intent to the existing transport runtime while selecting/assigning a Person only through frozen CR-26 eligibility/assignment ownership with `CAN_SIMPLE_TRANSPORT`.

### CR-27C – Delivered Transport → BuildingStock Settlement

Later settle a confirmed delivery back into frozen CR-25 BuildingStock ownership, prevent phantom/double stock and release the temporary workforce assignment.

## 3. Implemented CR-27A contract

CR-27A now introduces:

- immutable `building-stock-transport-reservation` records,
- stable `transport-reservation:` IDs,
- stable source/target `building:` IDs,
- stable `resource-type:` ID,
- positive safe-integer amount,
- lifecycle `ACTIVE -> RELEASED`,
- deterministic reserved/available amount evaluation,
- deterministic rejection of over-reservation,
- duplicate reservation-ID rejection,
- source/resource isolation,
- release restoring transport availability without changing physical BuildingStock.

Availability invariant:

`availableForNewTransport = physicalBuildingStockQuantity - sum(ACTIVE reservation amounts for the same source Building/resource type)`

## 4. CR-27A strict non-scope

CR-27A does not:

- change `BuildingStockContract` or `BuildingStockMutationContract`,
- physically remove stock from the source Building,
- add stock to the target Building,
- create a `TransportJob`,
- select or assign a Person/Carrier,
- use `CAN_SIMPLE_TRANSPORT`,
- calculate Reachability, route or path,
- move a unit,
- touch traffic/reservation/deadlock runtime,
- introduce job priority/scoring,
- perform pickup/delivery/settlement,
- execute production/construction/work,
- add SaveGame, rendering, UI gameplay, Inspector or balancing ownership.

## 5. Direct tests added

`src/dev/cr-27a-self-test.js` covers:

- valid reservation below available quantity,
- exact remaining quantity,
- rejection above remaining quantity,
- aggregate over-commit rejection,
- source isolation,
- resource-type isolation,
- released reservation freeing availability,
- byte-for-byte unchanged physical BuildingStock,
- input-order-independent availability,
- invalid IDs/amounts,
- duplicate reservation IDs,
- CR-27B/C scope-leakage guard.

Node runner: `src/dev/cr-27a-self-test.node.js`.

## 6. Branch / Pages rule

- All CR-27A/B/C implementation stays on the single branch `feature/cr-27-game-facing-logistics-integration-foundation`.
- Frozen sub-block branches are immutable markers only after PASS / 0 BLOCKER.
- GitHub Pages must point at the active CR-27 development branch for browser gates during CR-27 development; creating a frozen sub-block marker must not move Pages to that marker.

## 7. Next allowed action

Build the dedicated **CR-27A browser Verification / Freeze Gate** around the implemented direct self-test and frozen predecessor regression. Do not begin CR-27B and do not create a CR-27A frozen marker before browser **PASS / 0 BLOCKER**.

---

**Updated:** 2026-09-06 after CR-27A contract/service implementation and direct self-test addition. Status remains **NOT FROZEN** pending browser Verification / Freeze Gate.
