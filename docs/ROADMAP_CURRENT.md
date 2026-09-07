# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-30 FROZEN / CR-31 ACTIVE / CR-31A FROZEN  
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

Frozen CR-30 already contains MapStructure, Traversability, deterministic routing, Road Preference, obstacle-aware routing and the traffic/reservation/deadlock/recovery chain. CR-31 therefore integrates the real world with those owners rather than rebuilding them.

### CR-31A – World-backed Traversability Source Contract

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen capability:

- `WorldBackedTraversabilitySource` projects real existing Building world positions into their containing `MapStructure` cells,
- existing Buildings in lifecycle state `EXISTS` produce static `BLOCKED` cells,
- retired Buildings do not block,
- free cells remain `TRAVERSABLE`,
- Persons do not become static traversal owners,
- outside-map cells remain invalid,
- output is deterministic and downstream-compatible with existing obstacle-aware routing through `stateAt` / `isTraversable`,
- no new routing algorithm, reachability algorithm, Road Preference, Wear, traffic, reservation or movement behavior is owned by CR-31A.

Verification/freeze evidence:

- implementation regression `34087031469` = **SUCCESS / PASS / 0 BLOCKER**,
- real browser/device evidence accepted on 2026-09-07 = **PASS / 0 BLOCKER**,
- dedicated Verification / Freeze Gate run `34087731207` on `39b43015721a5de2b4d63b221558431205767037` = **SUCCESS / PASS / 0 BLOCKER**,
- freeze marker: `frozen/cr-31a-world-backed-traversability-source-contract`.

### CR-31B – Deterministic World Reachability Integration

Status: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

Candidate boundary: consume frozen CR-31A plus existing deterministic routing primitives to answer whether two valid world positions are connected/reachable. No Path/Wear or movement integration yet. Explicit authorization is required before implementation.

### CR-31C – Runtime Entity Navigation Validation Integration

Status: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

May validate existing real Person/Carrier positions and targets against the frozen navigation truth while keeping earlier route/movement/traffic owners intact.

## 4. Current next step

CR-31A is frozen. The next allowed step is to confirm and explicitly authorize **CR-31B – Deterministic World Reachability Integration**. CR-31B implementation must not begin automatically.

---

**Updated:** 2026-09-07 — CR-31A Verification / Freeze Gate PASS / 0 BLOCKER and substep frozen; CR-31B remains locked pending explicit authorization.