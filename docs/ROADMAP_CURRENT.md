# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-30 FROZEN / CR-31 ACTIVE / CR-31A FROZEN / CR-31B VERIFIED – FREEZE READY  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-31-navigation-integration-foundation`  
**Latest whole-CR freeze:** **CR-30 – Housing / Population / Gold Integration Foundation**  
**Latest substep freeze:** **CR-31A – World-backed Traversability Source Contract**  
**CR-31A freeze marker:** `frozen/cr-31a-world-backed-traversability-source-contract` @ `39b43015721a5de2b4d63b221558431205767037`

## 1. Frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-29 – Camera & World View Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-30 – Housing / Population / Gold Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `2e9208614a5cfd80abc47e39ccf236b80315ace8`.  
CR-31A – World-backed Traversability Source Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `39b43015721a5de2b4d63b221558431205767037`.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- **Navigation – represented by CR-31**,
- later Path/Wear,
- IM-13 – SaveGame,
- IM-14 – UI/Mobile,
- IM-15 – Guidance/Inspector.

## 3. CR-31 – Navigation Integration Foundation

Status: **ACTIVE / NOT FROZEN**.

### CR-31A – World-backed Traversability Source Contract

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Real existing Buildings own static blocked-cell evidence through the frozen world-backed traversability adapter; free cells remain traversable. Existing navigation/traffic owners were not rebuilt.

### CR-31B – Deterministic World Reachability Integration

Status: **IMPLEMENTED / AUTOMATED PASS / REAL IPHONE BROWSER PASS / 0 BLOCKER / FREEZE READY / NOT YET FROZEN**.

CR-31B consumes frozen CR-31A and the existing deterministic cost-aware pathfinder to answer whether two valid real world positions are connected through traversable cells. World positions are deterministically mapped to cells. Blocked endpoints and disconnected regions produce explicit non-reachable results. No route ownership, Path/Wear, movement, Road Preference, Traffic, Reservation, Deadlock or Recovery behavior is added.

Implementation:

- `src/transport/deterministic-world-reachability-integration.js`
- `src/dev/cr-31b-self-test.node.js`

Automated evidence: Actions run `34094572739` on `6ec205a93102614eb29f3c98150a7da61958b47b` = **SUCCESS / PASS / 0 BLOCKER**.

Accepted real iPhone/Safari evidence on 2026-09-07 shows:

- correct `CR-31B – Deterministic World Reachability Integration` identity,
- runtime `READY`,
- world `(0.25,0.25)` → `(7.25,5.25)` = `REACHABLE`,
- CR-31A 3 static BLOCKED cells preserved,
- CR-30 Population 3 / Gold 3 preserved,
- 3 Buildings / 3 Persons visible.

### CR-31C – Runtime Entity Navigation Validation Integration

Status: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

May later validate existing real Person/Carrier positions and targets against frozen navigation truth while keeping route/movement/traffic owners intact.

## 4. Current next step

The only allowed action is to freeze **CR-31B – Deterministic World Reachability Integration** at its verified branch state and create its substep freeze marker. Do not implement or authorize CR-31C until CR-31B is explicitly frozen. Whole CR-31 remains active/not frozen.

---

**Updated:** 2026-09-07 — CR-31B automated regression and real iPhone/Safari verification PASS / 0 BLOCKER; freeze-ready; CR-31C locked.
