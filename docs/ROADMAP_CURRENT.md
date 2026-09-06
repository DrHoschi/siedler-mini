# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-27C browser freeze gate exposed / device PASS pending  
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

`CR-25 BuildingStock -> CR-27A Reservation -> CR-26 Workforce -> CR-27B Dispatch -> existing transport delivery evidence -> CR-27C Settlement -> CR-25 BuildingStock`

### CR-27A – BuildingStock Transport Intent & Reservation Bridge

**PASS / FROZEN / 0 BLOCKER**

### CR-27B – Workforce-Aware Transport Dispatch Integration

**PASS / FROZEN / 0 BLOCKER**

### CR-27C – Delivered Transport -> BuildingStock Settlement

**IMPLEMENTED / BROWSER FREEZE GATE EXPOSED / AWAITING DEVICE PASS / NOT FROZEN**

Settlement boundary:

`confirmed delivered-cargo + frozen CR-27B dispatch + current source/target BuildingStock + current ACTIVE reservation + current ASSIGNED workforce -> source remove + target add + reservation RELEASED + workforce FREE`

Key ownership/invariant rules:

- delivery evidence must match dispatch job, selected Person/unit, compatibility resource, target and amount,
- source Building/resource type remain owned by frozen CR-27A/27B,
- CR-25 owns stock mutation,
- CR-27A owns reservation closure,
- CR-26 owns workforce release,
- failure returns no partial settlement result,
- source underflow and target overflow reject,
- successful transfer conserves total quantity,
- committed `RELEASED` / `FREE` successor owner states prevent another settlement.

The dedicated browser Verification / Freeze Gate is exposed through `index.html` and `src/dev/cr-27c-freeze-gate.js`.

## 3. CR-27C current gate boundary

The browser gate regresses frozen CR-27B (including CR-27A) and all direct CR-27C tests together with additional end-to-end checks for:

- exact source -> target transfer from confirmed delivery,
- reservation `RELEASED` + workforce `FREE` success state,
- quantity conservation,
- delivery linkage integrity,
- ACTIVE/ASSIGNED owner-state authority,
- source underflow and target overflow rejection,
- duplicate prevention through committed successor owner states,
- input immutability,
- no post-scope Carrier/legacy-store/path/movement/SaveGame ownership leakage.

Required browser/device result:

`CR-27C DELIVERED TRANSPORT → BUILDINGSTOCK SETTLEMENT VERIFICATION / FREEZE GATE: PASS / 0 BLOCKER`

Only that browser **PASS / 0 BLOCKER** permits the immutable CR-27C marker.

## 4. After CR-27C

Only after CR-27C is **PASS / FROZEN / 0 BLOCKER** may the whole **CR-27 Completion / Regression / Freeze Gate** be built. That whole-system gate is not yet implemented.

## 5. CR-27 global non-scope

No new pathfinding, route algorithm, traffic algorithm, traffic reservation semantics, deadlock logic, Carrier AI, production timing, construction work, job prioritization/scoring, graphics, Inspector, balancing or SaveGame ownership.

## 6. Branch / gate policy

- One CR-27 development branch: `feature/cr-27-game-facing-logistics-integration-foundation`.
- A/B/C proceed sequentially on that branch.
- Each sub-block gets direct tests and a browser Verification / Freeze Gate.
- Frozen sub-block markers do not become the Pages development source.
- Pages remains on the active CR-27 branch during the whole CR-27 cycle.
- Whole CR-27 becomes FROZEN only after the final combined regression/invariant/scope gate passes.

---

**Updated:** 2026-09-06 after exposing the CR-27C browser Verification / Freeze Gate. Next step: device/browser verification; CR-27C remains NOT FROZEN until PASS / 0 BLOCKER.
