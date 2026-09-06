# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-27B frozen / CR-27C next  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-27-game-facing-logistics-integration-foundation`  
**Frozen gameplay baseline:** **CR-26 – Workforce Capability & Job Eligibility Foundation**

## 1. Current frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-27A – BuildingStock Transport Intent & Reservation Bridge: **PASS / FROZEN / 0 BLOCKER**.

CR-27B – Workforce-Aware Transport Dispatch Integration: **PASS / FROZEN / 0 BLOCKER**.

Frozen markers:

- `frozen/cr-27a-buildingstock-transport-intent-reservation-bridge`
- `frozen/cr-27b-workforce-aware-transport-dispatch-integration`

## 2. Current system block

# CR-27 – Game-Facing Logistics Integration Foundation

System chain:

`CR-25 BuildingStock -> CR-27A Reservation -> CR-26 Workforce -> CR-27B Dispatch -> existing transport runtime -> CR-27C Settlement -> CR-25 BuildingStock`

### CR-27A – BuildingStock Transport Intent & Reservation Bridge

**PASS / FROZEN / 0 BLOCKER**

The ACTIVE reservation remains the authoritative protection against double-disposition until later settlement/closure.

### CR-27B – Workforce-Aware Transport Dispatch Integration

**PASS / FROZEN / 0 BLOCKER**

Frozen dispatch chain:

`ACTIVE reservation -> CAN_SIMPLE_TRANSPORT eligibility -> CR-26 assignment -> legacy-compatible pending TransportJob projection -> execution assignment using the same unit/person identity -> TransportExecutionContract.begin`

Frozen ownership rules:

- CR-26 is the sole workforce availability/selection/assignment owner,
- `CarrierAssignmentService.assign()` is not used,
- Carrier `AVAILABLE/OCCUPIED` is not a second gameplay truth,
- selected `personId` is reused as execution `unitId`,
- compatibility `claim:`, `demand:` and `resource:` references exist only in the projected legacy TransportJob contract,
- no legacy Claim/Demand/ResourceState store is created or mutated,
- CR-27A reservation remains ACTIVE and unchanged,
- source/target BuildingStock is not mutated.

The dedicated CR-27B device/browser Verification / Freeze Gate passed **PASS / 0 BLOCKER** on 2026-09-06.

### CR-27C – Delivered Transport -> BuildingStock Settlement

**NEXT ALLOWED / NOT STARTED / NOT FROZEN**.

Before implementation, define its exact settlement boundary against frozen CR-27A, frozen CR-27B, CR-25 BuildingStock mutation ownership and existing transport delivery evidence.

The intended system responsibility remains: only a confirmed delivered transport may cause controlled source -> target BuildingStock transfer, reservation closure and controlled temporary workforce release. Exact lifecycle/evidence semantics must be inspected live before implementation.

After CR-27C passes its own gate, run a whole **CR-27 Completion / Regression / Freeze Gate**.

## 3. CR-27 global non-scope

No new pathfinding, route algorithm, traffic algorithm, traffic reservation semantics, deadlock logic, Carrier AI, production timing, construction work, job prioritization/scoring, graphics, Inspector, balancing or SaveGame ownership.

## 4. Branch / gate policy

- One CR-27 development branch: `feature/cr-27-game-facing-logistics-integration-foundation`.
- A/B/C proceed sequentially on that branch.
- Each sub-block gets direct tests and a browser Verification / Freeze Gate.
- Frozen sub-block markers do not become the Pages development source.
- Pages remains on the active CR-27 branch during the whole CR-27 cycle.
- Whole CR-27 becomes FROZEN only after final combined regression/invariant/scope gate passes.

## 5. Next required activity

Define the exact **CR-27C – Delivered Transport -> BuildingStock Settlement** boundary from the live repository. Do not implement settlement until the delivery evidence, CR-25 mutation contract, CR-27A release semantics and CR-26 workforce-release contract have been inspected together.

---

**Updated:** 2026-09-06 after CR-27B device/browser Verification / Freeze Gate: **PASS / 0 BLOCKER**. CR-27B is FROZEN; CR-27C is next.
