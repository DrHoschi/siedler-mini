# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-27A/B/C frozen / whole CR-27 gate next  
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

**ACTIVE / NOT FROZEN** pending the whole-system gate.

Integrated chain:

`CR-25 BuildingStock -> CR-27A ACTIVE Reservation -> CR-26 CAN_SIMPLE_TRANSPORT Workforce -> CR-27B Dispatch -> existing transport delivery evidence -> CR-27C Settlement -> CR-25 BuildingStock + CR-27A RELEASED + CR-26 FREE`

### CR-27A

**PASS / FROZEN / 0 BLOCKER** — protects source availability without physical stock mutation.

### CR-27B

**PASS / FROZEN / 0 BLOCKER** — dispatches only through CR-26 workforce authority and enters the existing transport execution foundation without Carrier availability becoming a second gameplay truth.

### CR-27C

**PASS / FROZEN / 0 BLOCKER** — accepts confirmed delivery evidence and immutably settles exact source -> target BuildingStock quantity, closes the reservation and releases workforce.

CR-27C device/browser Verification / Freeze Gate passed **PASS / 0 BLOCKER** on 2026-09-06.

## 3. Whole CR-27 Completion / Regression / Freeze Gate

This is now the next allowed step.

The combined gate must at minimum:

- regress frozen CR-27A, CR-27B and CR-27C gates together,
- run one coherent end-to-end owner chain from physical source BuildingStock through reservation and workforce dispatch to confirmed delivery settlement,
- verify reservation protects availability before settlement,
- verify the selected Person is CR-26-authorized and reused as execution `unitId`,
- verify the reservation remains ACTIVE and physical stock unchanged during reservation/dispatch,
- verify only confirmed linked delivery can settle,
- verify exact source decrement and target increment,
- verify reservation becomes RELEASED and workforce becomes FREE only on successful settlement,
- verify total quantity conservation and input immutability,
- verify failed linkage/owner-state/underflow/overflow cases cannot produce partial settlement,
- verify Carrier AVAILABLE/OCCUPIED and legacy Claim/Demand/ResourceState stores do not become gameplay owners,
- verify no new pathfinding/route/movement/traffic/deadlock/priority/production/construction/SaveGame/rendering/Inspector/balancing ownership leaked into CR-27.

Only whole-system browser/device **PASS / 0 BLOCKER** permits the immutable whole CR-27 marker.

## 4. CR-27 global non-scope

No new pathfinding, route algorithm, traffic algorithm, traffic reservation semantics, deadlock logic, Carrier AI, production timing, construction work, job prioritization/scoring, graphics, Inspector, balancing or SaveGame ownership.

## 5. Branch / gate policy

- Whole CR-27 gate is built on `feature/cr-27-game-facing-logistics-integration-foundation`.
- Frozen A/B/C markers remain immutable.
- Pages remains pointed at the active CR-27 branch for the combined browser gate.
- CR-27 becomes FROZEN only after combined browser/device PASS / 0 BLOCKER and final control-document synchronization.

---

**Updated:** 2026-09-06 after CR-27C device/browser PASS / 0 BLOCKER. CR-27A/B/C are frozen; next step is the whole CR-27 Completion / Regression / Freeze Gate.
