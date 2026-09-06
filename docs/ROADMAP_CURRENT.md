# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-30 FROZEN / CR-31 AUTHORIZED / CR-31A ACTIVE  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-31-navigation-integration-foundation`  
**Latest whole-CR freeze:** **CR-30 – Housing / Population / Gold Integration Foundation**  
**Latest whole-CR freeze marker:** `frozen/cr-30-housing-population-gold-integration-foundation` @ `2e9208614a5cfd80abc47e39ccf236b80315ace8`

## 1. Frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-29 – Camera & World View Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-30 – Housing / Population / Gold Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `2e9208614a5cfd80abc47e39ccf236b80315ace8`.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- **Navigation – now represented by CR-31**, 
- later Path/Wear,
- IM-13 – SaveGame,
- IM-14 – UI/Mobile,
- IM-15 – Guidance/Inspector.

## 3. CR-31 – Navigation Integration Foundation

Status: **AUTHORIZED / ACTIVE / NOT FROZEN**.

Repository reconciliation on frozen CR-30 confirms that Navigation is primarily an integration task, not a rebuild. Existing frozen components already include:

- `MapStructure`,
- `TraversabilityContract`,
- `BlockedCellSource`,
- route contract and deterministic grid/cost-aware pathfinding,
- Road Preference / traversal-cost routing,
- obstacle-aware routing,
- occupancy/reservation/waiting/arbitration/deadlock/recovery/reroute traffic contracts.

Therefore CR-31 must not create duplicate navigation, routing or traffic truths.

### CR-31A – World-backed Traversability Source Contract

Status: **AUTHORIZED / ACTIVE / NOT IMPLEMENTED**.

Boundary:

- real CR-28–30 world state may feed static traversability,
- `MapStructure` remains the spatial boundary,
- `TraversabilityContract` remains the semantic `TRAVERSABLE` / `BLOCKED` contract,
- downstream compatibility with `BlockedCellSource` is preserved,
- same real world state must yield the same static traversability result,
- no reachability search,
- no route calculation,
- no path costs / Road Preference / Wear changes,
- no occupancy/reservation/deadlock/recovery changes,
- no Person/Carrier movement changes,
- no SaveGame, UI/Mobile or Inspector work.

### CR-31B – Deterministic World Reachability Integration

Status: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

May consume frozen CR-31A plus existing deterministic routing primitives to answer whether two valid world positions are connected/reachable. No Path/Wear or movement integration yet.

### CR-31C – Runtime Entity Navigation Validation Integration

Status: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

May validate existing real Person/Carrier positions and targets against the frozen navigation truth while keeping earlier route/movement/traffic owners intact.

## 4. Current next step

Implement **CR-31A – World-backed Traversability Source Contract** only on `feature/cr-31-navigation-integration-foundation`. Visible/build CR identity must be synchronized in the same implementation step before browser verification. CR-31B/C and all later migration blocks remain locked.

---

**Updated:** 2026-09-06 — CR-31 authorized directly from frozen CR-30; existing navigation/route/traffic ownership reconciled; CR-31A fixed as the world-backed traversability integration boundary.