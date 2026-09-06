# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-27 whole-system freeze gate exposed / device PASS pending  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-27-game-facing-logistics-integration-foundation`  
**Frozen gameplay baseline:** **CR-26 – Workforce Capability & Job Eligibility Foundation**

## 1. Current frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-27A – BuildingStock Transport Intent & Reservation Bridge: **PASS / FROZEN / 0 BLOCKER**.

CR-27B – Workforce-Aware Transport Dispatch Integration: **PASS / FROZEN / 0 BLOCKER**.

CR-27C – Delivered Transport -> BuildingStock Settlement: **PASS / FROZEN / 0 BLOCKER**.

Frozen markers:

- `frozen/cr-27a-buildingstock-transport-intent-reservation-bridge`
- `frozen/cr-27b-workforce-aware-transport-dispatch-integration`
- `frozen/cr-27c-delivered-transport-buildingstock-settlement`

## 2. Current system block

# CR-27 – Game-Facing Logistics Integration Foundation

**A/B/C FROZEN / WHOLE-SYSTEM BROWSER FREEZE GATE EXPOSED / AWAITING DEVICE PASS / NOT FROZEN**

Integrated chain:

`CR-25 BuildingStock -> CR-27A ACTIVE Reservation -> CR-26 CAN_SIMPLE_TRANSPORT Workforce -> CR-27B Dispatch -> existing transport delivery evidence -> CR-27C Settlement -> CR-25 BuildingStock + CR-27A RELEASED + CR-26 FREE`

## 3. Whole CR-27 Completion / Regression / Freeze Gate

The combined gate is implemented in `src/dev/cr-27-freeze-gate.js` and exposed through `index.html`.

It regresses the frozen A/B/C gates and additionally verifies one coherent end-to-end owner chain:

- physical source BuildingStock exists before reservation,
- CR-27A reservation reduces game-facing availability without physical stock mutation,
- CR-26 alone authorizes/selects the transport worker,
- CR-27B reuses selected Person as execution `unitId`,
- reservation remains ACTIVE and physical source/target stock remains unchanged through dispatch,
- only correctly linked confirmed delivery can settle,
- CR-27C moves exactly the reserved quantity source -> target,
- total quantity is conserved,
- reservation becomes RELEASED and workforce becomes FREE only after success,
- failed linkage/owner-state/underflow cases produce no partial owner state,
- no Carrier AVAILABLE/OCCUPIED or legacy Claim/Demand/ResourceState gameplay ownership appears,
- no new pathfinding/route/movement/traffic/deadlock/priority/production/construction/SaveGame/rendering/Inspector/balancing ownership leaks into CR-27.

Required browser/device result:

`CR-27 GAME-FACING LOGISTICS INTEGRATION FOUNDATION COMPLETION / REGRESSION / FREEZE GATE: PASS / 0 BLOCKER`

Only that result permits the immutable whole CR-27 marker and post-CR27 IM ↔ CR reconciliation.

## 4. Branch / gate policy

- Whole CR-27 gate is on `feature/cr-27-game-facing-logistics-integration-foundation`.
- Frozen A/B/C markers remain immutable.
- Pages remains pointed at the active CR-27 branch.
- No next CR is named or started before whole CR-27 PASS / FROZEN / 0 BLOCKER and a new live-repo IM ↔ CR reconciliation.

---

**Updated:** 2026-09-06 after exposing the whole CR-27 Completion / Regression / Freeze Gate. Device/browser verification is now the only allowed next action.
