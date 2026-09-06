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

CR-27C device/browser Verification / Freeze Gate passed **PASS / 0 BLOCKER** on 2026-09-06.

## 3. Frozen CR-27C invariants

- delivery evidence exactly matches dispatch job, selected Person/unit, compatibility resource, target and amount,
- source Building/resource type remain owned by frozen CR-27A/27B,
- current reservation must match dispatch and be `ACTIVE`,
- current workforce must match the selected Person, be `ASSIGNED` and own the dispatch `assignmentId`,
- source/target BuildingStock match reservation Building/resource identities,
- stock mutation uses frozen CR-25 remove/add,
- reservation closure uses frozen CR-27A release,
- workforce release uses frozen CR-26 release,
- failure returns no partial settlement result and mutates no input,
- source underflow / target overflow reject,
- successful transfer conserves total quantity,
- committed `RELEASED` / `FREE` successor states reject another settlement.

## 4. CR-27 global non-scope remains frozen

No new pathfinding, route algorithm, traffic algorithm, traffic reservation semantics, deadlock logic, Carrier AI, production timing, construction work, job prioritization/scoring, graphics, Inspector, balancing or SaveGame ownership.

## 5. Branch / Pages rule

- All CR-27 work remains on `feature/cr-27-game-facing-logistics-integration-foundation` until the whole CR-27 freeze.
- Frozen sub-block markers are immutable markers only.
- GitHub Pages remains pointed at the active CR-27 branch for the whole-system browser gate.

## 6. Next allowed action

Build the combined **CR-27 – Game-Facing Logistics Integration Foundation Completion / Regression / Freeze Gate** on this same branch. It must regress frozen CR-27A + CR-27B + CR-27C together and verify the integrated owner chain, invariants and global non-scope. Do not mark whole CR-27 frozen until the combined browser/device gate passes **PASS / 0 BLOCKER**.

---

**Updated:** 2026-09-06 after device/browser CR-27C Verification / Freeze Gate: **PASS / 0 BLOCKER**. CR-27C is FROZEN; whole CR-27 Completion / Regression / Freeze Gate is next.
