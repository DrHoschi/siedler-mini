# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development/control branch: `feature/cr-27-game-facing-logistics-integration-foundation`
- Current immutable gameplay baseline: **CR-26 – Workforce Capability & Job Eligibility Foundation**
- CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-27 – Game-Facing Logistics Integration Foundation: **ACTIVE / NOT FROZEN**
- CR-27A – BuildingStock Transport Intent & Reservation Bridge: **PASS / FROZEN / 0 BLOCKER**
- CR-27B – Workforce-Aware Transport Dispatch Integration: **IMPLEMENTED / DIRECT TESTS ADDED / NOT FROZEN**
- CR-27C – Delivered Transport -> BuildingStock Settlement: **NOT STARTED**

## 2. Frozen CR-27A boundary

CR-27A owns immutable `building-stock-transport-reservation` values with stable `transport-reservation:` IDs, source/target `building:` IDs, `resource-type:` ID, positive amount and `ACTIVE -> RELEASED` lifecycle.

Availability remains:

`physical BuildingStock - sum(ACTIVE reservations for the same source/resource)`

CR-27A device/browser Verification / Freeze Gate passed **PASS / 0 BLOCKER** on 2026-09-06.

Frozen marker:

`frozen/cr-27a-buildingstock-transport-intent-reservation-bridge`

## 3. Implemented CR-27B boundary

CR-27B now implements the dispatch adapter:

`ACTIVE CR-27A reservation -> frozen CR-26 CAN_SIMPLE_TRANSPORT eligibility/assignment -> legacy-compatible pending TransportJob projection -> {jobId, unitId} execution assignment -> existing TransportExecutionContract begin`

Authoritative rules:

- reservation must remain `ACTIVE` during dispatch,
- `RELEASED` reservation is rejected,
- required workforce capability is always `CAN_SIMPLE_TRANSPORT`,
- Person selection/assignment runs only through frozen CR-26 `WorkforceJobEligibilityContract.selectAndAssign(...)`,
- `CarrierAssignmentService.assign()` is not used,
- selected `personId` is projected as the same stable execution `unitId`,
- legacy `claim:`, `demand:` and `resource:` IDs are explicit compatibility references only,
- no Claim/Demand/ResourceState store is created or mutated,
- projected TransportJob copies source Building, target Building, resource type and amount exactly from CR-27A,
- existing `TransportExecutionContract.begin(...)` is used only as the execution entry point.

Implemented files:

- `src/domain/workforce-aware-transport-dispatch-integration.js`
- `src/dev/cr-27b-self-test.js`
- `src/dev/cr-27b-self-test.node.js`
- `docs/CR27B_WORKFORCE_AWARE_TRANSPORT_DISPATCH_INTEGRATION.md`

## 4. CR-27B strict non-scope

CR-27B does not:

- release or mutate the CR-27A reservation,
- physically remove source BuildingStock,
- add target BuildingStock,
- settle delivery,
- release workforce assignment after delivery/cancel,
- create/mutate legacy Claim/Demand/ResourceState stores,
- select through Carrier `AVAILABLE/OCCUPIED`,
- calculate Reachability,
- add pathfinding/routes/movement algorithms/traffic/deadlock behavior,
- execute pickup/delivery,
- add job priority/scoring/JobEngine queue behavior,
- alter production/construction,
- add SaveGame/rendering/gameplay UI/Inspector/balancing.

## 5. Direct CR-27B tests added

The direct self-test covers ACTIVE/RELEASED reservation gating, mandatory `CAN_SIMPLE_TRANSPORT`, FREE/ASSIGNED/UNAVAILABLE behavior through CR-26, deterministic candidate order, no-eligible-person behavior, selected Person/execution unit identity, immutable reservation/Profile/state inputs, exact TransportJob projection, compatibility-ID validation, explicit Reachability input behavior and guards against Carrier/legacy-store/CR-27C ownership leakage.

## 6. Branch / Pages rule

- All CR-27A/B/C implementation stays on `feature/cr-27-game-facing-logistics-integration-foundation`.
- Frozen sub-block markers remain immutable markers only.
- GitHub Pages remains pointed at the active CR-27 branch during the whole CR-27 cycle.
- The currently displayed CR-27A page remains unchanged until the dedicated CR-27B browser Verification / Freeze Gate is deliberately exposed.

## 7. Next allowed action

Build the dedicated **CR-27B browser Verification / Freeze Gate** around the implemented direct self-test and frozen predecessor regressions. Do not begin CR-27C and do not create a CR-27B frozen marker before browser **PASS / 0 BLOCKER**.

---

**Updated:** 2026-09-06 after CR-27B technical specification, dispatch adapter implementation and direct self-test addition. CR-27B remains **NOT FROZEN** pending browser Verification / Freeze Gate.
