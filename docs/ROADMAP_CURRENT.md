# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-30 FROZEN / CR-31 ACTIVE / CR-31A FROZEN / CR-31B FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-31-navigation-integration-foundation`  
**Latest whole-CR freeze:** **CR-30 – Housing / Population / Gold Integration Foundation**  
**Latest substep freeze:** **CR-31B – Deterministic World Reachability Integration**  
**CR-31B freeze marker:** `frozen/cr-31b-deterministic-world-reachability-integration` @ `68ecf9a031d6d63da5dbb7cd24d558f1a1e89391`

## 1. Frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-29 – Camera & World View Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-30 – Housing / Population / Gold Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `2e9208614a5cfd80abc47e39ccf236b80315ace8`.  
CR-31A – World-backed Traversability Source Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `39b43015721a5de2b4d63b221558431205767037`.  
CR-31B – Deterministic World Reachability Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `68ecf9a031d6d63da5dbb7cd24d558f1a1e89391`.

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

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-31B consumes frozen CR-31A and the existing deterministic cost-aware pathfinder to answer whether two valid real world positions are connected through traversable cells. World positions are deterministically mapped to cells. Blocked endpoints and disconnected regions produce explicit non-reachable results. No route ownership, Path/Wear, movement, Road Preference, Traffic, Reservation, Deadlock or Recovery behavior is added.

Freeze evidence:

- automated Actions run `34094572739` = **SUCCESS / PASS / 0 BLOCKER**,
- accepted real iPhone/Safari evidence = **PASS / 0 BLOCKER**,
- freeze marker `frozen/cr-31b-deterministic-world-reachability-integration` @ `68ecf9a031d6d63da5dbb7cd24d558f1a1e89391`.

### CR-31C – Runtime Entity Navigation Validation Integration

Status: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

May later validate existing real Person/Carrier positions and targets against frozen CR-31A/CR-31B navigation truth while keeping route/movement/traffic owners intact.

## 4. Current next step

CR-31B is frozen. The next permissible action is only the explicit confirmation/authorization of **CR-31C – Runtime Entity Navigation Validation Integration**. Do not implement CR-31C until that authorization is given. Whole CR-31 remains active/not frozen until A+B+C and the whole-CR completion/regression/freeze gate pass.

---

**Updated:** 2026-09-07 — CR-31B frozen at `68ecf9a031d6d63da5dbb7cd24d558f1a1e89391`; CR-31C remains planned and not implementation-authorized.
