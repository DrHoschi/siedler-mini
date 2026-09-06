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
- CR-27 – Game-Facing Logistics Integration Foundation: **ACCEPTED / ACTIVE / NOT FROZEN**
- CR-27A – BuildingStock Transport Intent & Reservation Bridge: **TECHNICAL PREPARATION / NOT IMPLEMENTED / NOT FROZEN**

## 2. Accepted CR-27 decomposition

### CR-27A – BuildingStock Transport Intent & Reservation Bridge

Express a transport request from stable source Building to stable target Building for one `resource-type` and positive amount. Availability is derived from the frozen CR-25 BuildingStock owner. A separate transport reservation/intent layer prevents the same source quantity from being simultaneously committed more than once. CR-25 contracts remain unchanged.

### CR-27B – Workforce-Aware Transport Dispatch Integration

Later connect a released CR-27A intent to the existing transport runtime while selecting/assigning a Person only through frozen CR-26 eligibility/assignment ownership with `CAN_SIMPLE_TRANSPORT`.

### CR-27C – Delivered Transport → BuildingStock Settlement

Later settle a confirmed delivery back into frozen CR-25 BuildingStock ownership, prevent phantom/double stock and release the temporary workforce assignment.

## 3. CR-27A strict scope

CR-27A may introduce only:

- stable transport-intent identity,
- stable source Building ID,
- stable target Building ID,
- stable `resource-type` ID,
- positive requested amount,
- explicit intent/reservation lifecycle sufficient to distinguish active reservation from ended reservation,
- deterministic source-stock availability calculation using frozen CR-25 BuildingStock quantity minus other active CR-27A reservations for the same source Building/resource type,
- immutable contract/state transitions,
- direct unit/self tests and browser Verification / Freeze Gate.

CR-27A must not:

- change `BuildingStockContract` or `BuildingStockMutationContract`,
- physically remove stock from the source Building,
- add stock to the target Building,
- create a `TransportJob`,
- select or assign a Person/Carrier,
- calculate Reachability, route or path,
- move a unit,
- touch traffic/reservation/deadlock runtime,
- introduce job priority/scoring,
- execute production/construction/work,
- add SaveGame, rendering, UI gameplay, Inspector or balancing ownership.

## 4. Frozen owners that CR-27A must respect

- CR-25 `BuildingStockContract`: `(buildingId, resourceTypeId, quantity)` is immutable and quantity is non-negative.
- CR-25 `BuildingStockMutationContract`: stock mutation remains owned there; CR-27A does not call it as part of reservation creation.
- CR-26 remains untouched in CR-27A. `CAN_SIMPLE_TRANSPORT` exists but becomes relevant only in CR-27B.
- Existing `src/transport/*` pathfinding/movement/traffic contracts remain untouched in CR-27A.

## 5. Branch / Pages rule

- All CR-27A/B/C implementation stays on the single branch `feature/cr-27-game-facing-logistics-integration-foundation`.
- Frozen sub-block branches are immutable markers only after PASS / 0 BLOCKER.
- GitHub Pages must point at the active CR-27 development branch for browser gates during CR-27 development; creating a frozen sub-block marker must not move Pages to that marker.

## 6. Next allowed action

Define and implement only the CR-27A transport-intent/reservation contract plus direct tests. Then expose the dedicated CR-27A browser Verification / Freeze Gate. Do not begin CR-27B until CR-27A is PASS / FROZEN / 0 BLOCKER.

---

**Updated:** 2026-09-06 after accepted post-CR26 IM ↔ CR reconciliation and creation of the CR-27 feature branch from the frozen CR-26 whole-system marker.
