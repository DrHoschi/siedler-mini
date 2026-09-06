# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-27B implemented / browser gate pending  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-27-game-facing-logistics-integration-foundation`  
**Frozen gameplay baseline:** **CR-26 – Workforce Capability & Job Eligibility Foundation**

## 1. Current frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-27A – BuildingStock Transport Intent & Reservation Bridge: **PASS / FROZEN / 0 BLOCKER**.

CR-27A frozen marker:

`frozen/cr-27a-buildingstock-transport-intent-reservation-bridge`

## 2. Current system block

# CR-27 – Game-Facing Logistics Integration Foundation

System chain:

`CR-25 BuildingStock -> CR-27A Reservation -> CR-26 Workforce -> existing transport runtime -> CR-27C Settlement -> CR-25 BuildingStock`

### CR-27A – BuildingStock Transport Intent & Reservation Bridge

**PASS / FROZEN / 0 BLOCKER**

The ACTIVE reservation remains the authoritative protection against double-disposition until later settlement/closure.

### CR-27B – Workforce-Aware Transport Dispatch Integration

**IMPLEMENTED / DIRECT TESTS ADDED / NOT FROZEN**

Implemented dispatch chain:

`ACTIVE reservation -> CAN_SIMPLE_TRANSPORT eligibility -> CR-26 assignment -> legacy-compatible pending TransportJob projection -> execution assignment using the same unit/person identity -> TransportExecutionContract.begin`

Key ownership rules:

- frozen CR-26 is the sole workforce availability/selection/assignment owner,
- `CarrierAssignmentService.assign()` is not used,
- Carrier `AVAILABLE/OCCUPIED` is not a second gameplay truth,
- selected `personId` is reused as execution `unitId`,
- compatibility `claim:`, `demand:` and `resource:` references exist only in the projected legacy TransportJob contract,
- no legacy Claim/Demand/ResourceState store is created or mutated,
- CR-27A reservation remains ACTIVE and unchanged,
- source/target BuildingStock is not mutated.

Direct self-test and Node runner are present. Dedicated browser Verification / Freeze Gate is still pending.

### CR-27C – Delivered Transport -> BuildingStock Settlement

**NOT STARTED**. May begin only after CR-27B is **PASS / FROZEN / 0 BLOCKER**.

CR-27C will later own confirmed-delivery settlement, controlled BuildingStock transfer, reservation closure and temporary workforce release; none of those behaviors belong to CR-27B.

After A/B/C, run a whole **CR-27 Completion / Regression / Freeze Gate**.

## 3. CR-27B current gate boundary

The upcoming CR-27B browser gate must regress frozen CR-27A and CR-26 together with the new adapter and verify at least:

- ACTIVE required / RELEASED rejected,
- mandatory `CAN_SIMPLE_TRANSPORT`,
- CR-26 FREE/ASSIGNED/UNAVAILABLE semantics remain authoritative,
- deterministic Person selection independent of candidate order,
- no eligible Person means no dispatch,
- selected Person identity equals execution unit identity,
- frozen reservation/Profile/input state remain unchanged,
- TransportJob projection copies source/target/resource/amount exactly,
- compatibility IDs validate without creating legacy stores,
- no CarrierAssignmentService selection,
- no physical BuildingStock mutation, delivery settlement, reservation release or workforce release.

Only browser **PASS / 0 BLOCKER** permits the immutable CR-27B marker.

## 4. CR-27 global non-scope

No new pathfinding, route algorithm, traffic algorithm, traffic reservation semantics, deadlock logic, Carrier AI, production timing, construction work, job prioritization/scoring, graphics, Inspector, balancing or SaveGame ownership.

## 5. Branch / gate policy

- One CR-27 development branch: `feature/cr-27-game-facing-logistics-integration-foundation`.
- A/B/C proceed sequentially on that branch.
- Each sub-block gets direct tests and a browser Verification / Freeze Gate.
- Frozen sub-block markers do not become the Pages development source.
- Pages remains on the active CR-27 branch during the whole CR-27 cycle.
- Whole CR-27 becomes FROZEN only after final combined regression/invariant/scope gate passes.

---

**Updated:** 2026-09-06 after CR-27B technical specification, dispatch adapter implementation and direct test addition. Next step: dedicated CR-27B browser Verification / Freeze Gate.
