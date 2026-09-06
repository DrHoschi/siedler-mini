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
- CR-27B – Workforce-Aware Transport Dispatch Integration: **PASS / FROZEN / 0 BLOCKER**
- CR-27C – Delivered Transport -> BuildingStock Settlement: **IMPLEMENTED / BROWSER FREEZE GATE EXPOSED / AWAITING DEVICE PASS / NOT FROZEN**

## 2. Frozen predecessors

CR-27A freezes the ACTIVE/RELEASED BuildingStock transport reservation boundary and source availability protection.

Frozen marker: `frozen/cr-27a-buildingstock-transport-intent-reservation-bridge`.

CR-27B freezes the dispatch chain:

`ACTIVE CR-27A reservation -> frozen CR-26 CAN_SIMPLE_TRANSPORT eligibility/assignment -> legacy-compatible pending TransportJob projection -> {jobId, unitId} execution assignment -> existing TransportExecutionContract begin`

Frozen marker: `frozen/cr-27b-workforce-aware-transport-dispatch-integration`.

## 3. Implemented CR-27C boundary

CR-27C settlement chain:

`confirmed delivered-cargo + frozen CR-27B dispatch + current source/target CR-25 BuildingStock + current ACTIVE reservation + current ASSIGNED workforce -> source remove + target add + reservation RELEASED + workforce FREE`

Authoritative rules:

- delivery evidence must exactly match dispatch job, selected Person/unit, compatibility resource, target and amount,
- source Building/resource type remain owned by frozen CR-27A/27B,
- current reservation must match the dispatch reservation and remain `ACTIVE`,
- current workforce must match the selected Person, remain `ASSIGNED`, and own the exact dispatch `assignmentId`,
- source/target BuildingStock must match reservation Building/resource identities,
- stock mutation uses only frozen CR-25 `BuildingStockMutationContract.remove/add`,
- reservation closure uses only frozen CR-27A `release`,
- workforce release uses only frozen CR-26 `WorkforceAssignmentStateContract.release`,
- all validation precedes immutable successor calculation,
- failure returns no partial settlement result and mutates no input,
- successful transfer conserves total source + target quantity,
- committed `RELEASED` / `FREE` successor states reject another settlement.

## 4. CR-27C browser Verification / Freeze Gate

The dedicated gate is exposed through `index.html` and `src/dev/cr-27c-freeze-gate.js`.

It regresses frozen CR-27B (including CR-27A), all direct CR-27C tests and additionally verifies:

- confirmed delivery settles exact source -> target quantity,
- reservation becomes `RELEASED`, workforce becomes `FREE`,
- total BuildingStock quantity is conserved,
- delivery identity/resource/target/amount linkage cannot be bypassed,
- owner-state, source-underflow and target-overflow guards cannot be bypassed,
- committed successor owner states prevent another settlement,
- all inputs remain byte-for-byte unchanged,
- no post-scope Carrier/legacy-store/path/movement/SaveGame ownership leaks into settlement.

Required device result:

`CR-27C DELIVERED TRANSPORT → BUILDINGSTOCK SETTLEMENT VERIFICATION / FREEZE GATE: PASS / 0 BLOCKER`

## 5. CR-27C strict non-scope

CR-27C does not decide arrival, create delivery evidence, perform pickup/delivery movement, support partial/multi-trip delivery, implement cancel/failure/recovery settlement, redispatch, redesign TransportJob lifecycle, mutate legacy Claim/Demand/ResourceState stores, use Carrier availability, add pathfinding/routes/movement/traffic/deadlock behavior, add priority/scoring, alter production/construction or add SaveGame/rendering/gameplay UI/Inspector/balancing.

## 6. Branch / Pages rule

- All CR-27A/B/C implementation stays on `feature/cr-27-game-facing-logistics-integration-foundation`.
- Frozen sub-block markers remain immutable markers only.
- GitHub Pages remains pointed at the active CR-27 branch during the whole CR-27 cycle.

## 7. Next allowed action

Run the dedicated **CR-27C browser Verification / Freeze Gate** on device. Do not create the CR-27C frozen marker and do not build the whole CR-27 Completion / Regression / Freeze Gate before browser **PASS / 0 BLOCKER**.

---

**Updated:** 2026-09-06 after exposing the CR-27C browser Verification / Freeze Gate. CR-27C remains **NOT FROZEN** pending device/browser PASS / 0 BLOCKER.
