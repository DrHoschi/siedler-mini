# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-30 FROZEN / CR-31 ACTIVE / CR-31A FROZEN / CR-31B FROZEN / CR-31C FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-31-navigation-integration-foundation`  
**Latest whole-CR freeze:** **CR-30 – Housing / Population / Gold Integration Foundation**  
**Latest substep freeze:** **CR-31C – Runtime Entity Navigation Validation Integration**  
**CR-31C freeze marker:** `frozen/cr-31c-runtime-entity-navigation-validation-integration` @ `2886839edddcf636fc347a0e25d1e9b40ff16d85`

## 1. Frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-29 – Camera & World View Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-30 – Housing / Population / Gold Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `2e9208614a5cfd80abc47e39ccf236b80315ace8`.  
CR-31A – World-backed Traversability Source Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `39b43015721a5de2b4d63b221558431205767037`.  
CR-31B – Deterministic World Reachability Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `68ecf9a031d6d63da5dbb7cd24d558f1a1e89391`.  
CR-31C – Runtime Entity Navigation Validation Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `2886839edddcf636fc347a0e25d1e9b40ff16d85`.

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

### CR-31B – Deterministic World Reachability Integration

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

### CR-31C – Runtime Entity Navigation Validation Integration

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Freeze evidence:

- automated Actions runs `34097331344` and `34097459849` = **SUCCESS / PASS / 0 BLOCKER**,
- accepted real iPhone/Safari evidence = **PASS / 0 BLOCKER**,
- freeze marker `frozen/cr-31c-runtime-entity-navigation-validation-integration` @ `2886839edddcf636fc347a0e25d1e9b40ff16d85`.

CR-31C validates real Person/Carrier positions and targets against frozen CR-31A/CR-31B navigation truth without adding movement, route ownership, a second pathfinder, Traffic/Reservation/Deadlock/Recovery behavior, Road Preference changes or Path/Wear.

### Whole CR-31 Completion / Regression / Freeze Gate

Status: **UNLOCKED / NOT YET EXECUTED**.

This gate may only regress CR-31A + CR-31B + CR-31C together against the frozen CR-30 predecessor, verify visible/build identity consistency and freeze whole CR-31 only on **PASS / 0 BLOCKER**. No new feature implementation is permitted in the gate.

## 4. Current next step

The next and only allowed action is the **CR-31 Completion / Regression / Freeze Gate**. Path/Wear remains locked until the whole CR-31 marker exists.

Do not begin SaveGame, UI/Mobile or Guidance/Inspector work.

---

**Updated:** 2026-09-07 — CR-31C substep frozen; whole CR-31 completion/regression/freeze gate now unlocked.