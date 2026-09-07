# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-30 FROZEN / CR-31 ACTIVE / CR-31A FROZEN / CR-31B FROZEN / CR-31C FREEZE READY  
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

CR-31B consumes frozen CR-31A and the existing deterministic cost-aware pathfinder to answer whether two valid real world positions are connected through traversable cells. No route ownership, Path/Wear, movement, Road Preference, Traffic, Reservation, Deadlock or Recovery behavior is added.

Freeze evidence:

- automated Actions run `34094572739` = **SUCCESS / PASS / 0 BLOCKER**,
- accepted real iPhone/Safari evidence = **PASS / 0 BLOCKER**,
- freeze marker `frozen/cr-31b-deterministic-world-reachability-integration` @ `68ecf9a031d6d63da5dbb7cd24d558f1a1e89391`.

### CR-31C – Runtime Entity Navigation Validation Integration

Status: **IMPLEMENTED / AUTOMATED VERIFIED / REAL BROWSER VERIFIED / PASS / 0 BLOCKER / FREEZE READY / NOT YET FROZEN**.

CR-31C validates existing real runtime Person/Carrier positions and targets against frozen CR-31A/CR-31B navigation truth while preserving route, movement and traffic ownership.

Implementation:

- `src/transport/runtime-entity-navigation-validation-integration.js`
- `src/dev/cr-31c-self-test.node.js`

Behavior:

- real Persons are resolved from `domains.units` and validated from their stored runtime position,
- existing Carrier movement contracts are checked against the real unit position,
- mismatched runtime vs movement position is rejected with `ENTITY_POSITION_MISMATCH`,
- current positions and targets consume frozen CR-31B reachability rather than adding another route/search owner,
- valid current-only positions return `POSITION_VALID`, reachable targets return `TARGET_REACHABLE`,
- CR-31B blocked/disconnected reasons remain authoritative,
- validation creates no TransportJobs and mutates no entity positions.

Automated evidence:

- Actions run `34097331344` = **SUCCESS / PASS / 0 BLOCKER**,
- follow-up Actions run `34097459849` = **SUCCESS / PASS / 0 BLOCKER**.

Accepted real iPhone/Safari evidence on 2026-09-07 = **PASS / 0 BLOCKER** and visibly confirms `READY`, correct CR-31C identity, Person `TARGET_REACHABLE`, Carrier `TARGET_REACHABLE`, `2/2 runtime entities VALID`, preserved CR-31B `REACHABLE`, CR-31A 3 static BLOCKED cells, CR-30 Population 3 / Gold 3, and 3 Buildings / 3 Persons visible.

Visible/build identity is synchronized to CR-31C. The browser miniworld keeps 3 Buildings / 3 Persons, with one existing Person also carrying the Carrier contract for validation evidence.

### Whole CR-31 Completion / Regression / Freeze Gate

Status: **LOCKED** until the CR-31C substep freeze marker is created.

## 4. Current next step

CR-31C has automated and real-device **PASS / 0 BLOCKER** and is **FREEZE READY**. The next permissible action is to create the CR-31C substep freeze on the verified Whole-CR-31 branch state. Only after that freeze may the **CR-31 Completion / Regression / Freeze Gate** begin.

Do not begin Path/Wear, SaveGame, UI/Mobile or Guidance/Inspector work.

---

**Updated:** 2026-09-07 — CR-31C real iPhone/Safari browser evidence accepted PASS / 0 BLOCKER; substep is freeze-ready.