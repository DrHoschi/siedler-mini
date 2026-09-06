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
- CR-27 – Game-Facing Logistics Integration Foundation: **A/B/C FROZEN / WHOLE-SYSTEM BROWSER FREEZE GATE EXPOSED / AWAITING DEVICE PASS / NOT FROZEN**
- CR-27A – BuildingStock Transport Intent & Reservation Bridge: **PASS / FROZEN / 0 BLOCKER**
- CR-27B – Workforce-Aware Transport Dispatch Integration: **PASS / FROZEN / 0 BLOCKER**
- CR-27C – Delivered Transport -> BuildingStock Settlement: **PASS / FROZEN / 0 BLOCKER**

## 2. Frozen CR-27 chain

CR-27A freezes the ACTIVE/RELEASED BuildingStock transport reservation boundary and source availability protection.

Frozen marker: `frozen/cr-27a-buildingstock-transport-intent-reservation-bridge`.

CR-27B freezes the dispatch chain:

`ACTIVE CR-27A reservation -> frozen CR-26 CAN_SIMPLE_TRANSPORT eligibility/assignment -> legacy-compatible pending TransportJob projection -> {jobId, unitId} execution assignment -> existing TransportExecutionContract begin`

Frozen marker: `frozen/cr-27b-workforce-aware-transport-dispatch-integration`.

CR-27C freezes the settlement chain:

`confirmed delivered-cargo + frozen CR-27B dispatch + current source/target CR-25 BuildingStock + current ACTIVE reservation + current ASSIGNED workforce -> source remove + target add + reservation RELEASED + workforce FREE`

Frozen marker: `frozen/cr-27c-delivered-transport-buildingstock-settlement`.

## 3. Whole CR-27 Completion / Regression / Freeze Gate

The combined gate is now exposed through `index.html` and `src/dev/cr-27-freeze-gate.js`.

It regresses frozen CR-27A + CR-27B + CR-27C and adds a coherent owner-chain verification:

`CR-25 BuildingStock -> CR-27A reservation protection -> CR-26 workforce authority -> CR-27B dispatch -> confirmed delivery evidence -> CR-27C settlement -> CR-25 successor stock + RELEASED reservation + FREE workforce`

The gate additionally verifies:

- reservation reduces game-facing available source amount before settlement without mutating physical stock,
- deterministic CR-26-selected Person is reused as execution `unitId`,
- reservation stays ACTIVE and physical stock unchanged through reservation/dispatch,
- only correctly linked confirmed delivery settles,
- exact source decrement / target increment and total quantity conservation,
- successful settlement alone returns RELEASED reservation + FREE workforce,
- failure paths produce no partial owner state,
- Carrier AVAILABLE/OCCUPIED and legacy Claim/Demand/ResourceState stores do not become gameplay owners,
- CR-27 global non-scope remains intact.

Required device/browser result:

`CR-27 GAME-FACING LOGISTICS INTEGRATION FOUNDATION COMPLETION / REGRESSION / FREEZE GATE: PASS / 0 BLOCKER`

## 4. CR-27 global non-scope

No new pathfinding, route algorithm, movement algorithm, traffic algorithm, traffic reservation semantics, deadlock logic, Carrier AI, production timing, construction work, job prioritization/scoring, graphics, Inspector, balancing or SaveGame ownership.

## 5. Branch / Pages rule

- Whole CR-27 gate remains on `feature/cr-27-game-facing-logistics-integration-foundation`.
- Frozen A/B/C markers remain immutable markers only.
- GitHub Pages remains pointed at the active CR-27 branch for this combined browser gate.

## 6. Next allowed action

Run the combined CR-27 browser/device gate. Do not create a whole CR-27 frozen marker and do not begin any next CR until the combined gate passes **PASS / 0 BLOCKER** and final control documents are synchronized.

---

**Updated:** 2026-09-06 after exposing the whole CR-27 Completion / Regression / Freeze Gate. CR-27 remains NOT FROZEN pending device/browser PASS / 0 BLOCKER.
