# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-30 FROZEN / CR-31 ACTIVE / CR-31A FROZEN / CR-31B IMPLEMENTED – VERIFICATION ACTIVE  
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

Status: **IMPLEMENTED / VERIFICATION ACTIVE / NOT FROZEN**.

CR-31B consumes frozen CR-31A and the existing deterministic cost-aware pathfinder to answer whether two valid real world positions are connected through traversable cells. World positions are deterministically mapped to cells. Blocked endpoints and disconnected regions produce explicit non-reachable results. No route ownership, Path/Wear, movement, Road Preference, Traffic, Reservation, Deadlock or Recovery behavior is added.

Implementation:

- `src/transport/deterministic-world-reachability-integration.js`
- `src/dev/cr-31b-self-test.node.js`

Visible/build identity is synchronized to CR-31B. Automated regression must pass before browser/device acceptance; CR-31B is not frozen yet.

### CR-31C – Runtime Entity Navigation Validation Integration

Status: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

May later validate existing real Person/Carrier positions and targets against frozen navigation truth while keeping route/movement/traffic owners intact.

## 4. Current next step

Complete automated regression for **CR-31B – Deterministic World Reachability Integration**. On PASS / 0 BLOCKER, perform real browser/device verification showing correct CR-31B identity, runtime READY, deterministic world reachability `REACHABLE`, preserved CR-31A blocked-cell evidence, preserved CR-30 Population 3 / Gold 3, and 3 Buildings / 3 Persons. Do not freeze CR-31B or authorize CR-31C before those gates pass.

---

**Updated:** 2026-09-07 — CR-31B implementation complete; verification active; CR-31C locked.
