# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-CR branch: `feature/cr-31-navigation-integration-foundation`
- Frozen whole-CR predecessor: **CR-30 – Housing / Population / Gold Integration Foundation**
- CR-30 freeze marker: `frozen/cr-30-housing-population-gold-integration-foundation`
- CR-30 frozen commit: `2e9208614a5cfd80abc47e39ccf236b80315ace8`
- CR-31 – Navigation Integration Foundation: **AUTHORIZED / ACTIVE / NOT FROZEN**
- CR-31A – World-backed Traversability Source Contract: **AUTHORIZED / ACTIVE / NOT IMPLEMENTED**
- CR-31B / CR-31C: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**
- Current allowed action: implement and verify CR-31A only.

## 2. CR-31 repository reconciliation result

The frozen CR-30 repository already contains the navigation/route/traffic foundations that CR-31 must reuse rather than rebuild.

Existing authoritative building blocks include:

- `src/world/map-structure.js` — stable grid/map boundary,
- `src/transport/traversability-contract.js` — existing `TRAVERSABLE` / `BLOCKED` contract,
- `src/transport/blocked-cell-source.js` — current mutable traversability source keyed by real map cells,
- `src/transport/route-contract.js`,
- `src/transport/deterministic-grid-pathfinder.js`,
- `src/transport/deterministic-cost-aware-pathfinder.js`,
- `src/transport/road-preference-cost-policy.js`,
- `src/transport/road-preferred-routing-integration.js`,
- `src/transport/obstacle-aware-routing-integration.js`,
- occupancy, reservation, waiting, arbitration, deadlock, recovery and reroute contracts/integrations already frozen from the earlier traffic CR line.

The key finding is that CR-31 must not introduce another navigation truth, another pathfinder or another traffic owner. The missing integration boundary is between the real CR-28–30 world state and the already-existing `BlockedCellSource` / `TraversabilityContract` navigation truth.

## 3. CR-31 – Navigation Integration Foundation

Leitfrage:

> Wie wird die reale, bereits sichtbare Welt kontrolliert an die vorhandene eingefrorene Navigations-/Traversability-Kette angebunden, ohne Pathfinding, Road Preference, Traffic oder Movement neu zu erfinden?

### CR-31A – World-backed Traversability Source Contract

**AUTHORIZED / ACTIVE / NOT IMPLEMENTED**.

CR-31A must establish one world-backed adapter/source contract that exposes static world navigability through the already-existing traversability semantics.

Required boundary:

- `MapStructure` remains the spatial map boundary,
- `TraversabilityContract` remains the semantic `TRAVERSABLE` / `BLOCKED` contract,
- existing `BlockedCellSource` compatibility remains the downstream consumption boundary,
- real frozen world entities/static world occupancy may be translated into traversability,
- identical real world state must produce identical traversability results,
- cells outside the map remain invalid/outside navigation space,
- CR-31A must not add reachability search,
- CR-31A must not compute routes,
- CR-31A must not add path costs, road preference or wear,
- CR-31A must not alter occupancy/reservation/deadlock/recovery traffic ownership,
- CR-31A must not move Persons or Carriers,
- no SaveGame, UI/Mobile or Inspector work.

CR-31A is therefore an integration/ownership step, not a new navigation algorithm.

### CR-31B – Deterministic World Reachability Integration

**PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

May later consume frozen CR-31A traversability and existing deterministic routing primitives to answer whether two valid world positions are connected/reachable. It must not yet alter movement or introduce Path/Wear.

### CR-31C – Runtime Entity Navigation Validation Integration

**PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

May later allow real runtime Persons/Carriers to validate existing positions/targets against the frozen navigation truth. Existing route/movement/traffic owners remain authoritative.

## 4. Locked later work

Path/Wear remains after CR-31. SaveGame remains IM-13, UI/Mobile IM-14, Guidance/Inspector IM-15. None are authorized by starting CR-31.

## 5. Permanent visible CR / build identity synchronization rule

Every browser/device-verifiable CR/substep must update all applicable visible/build identity surfaces in the same implementation step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-06 — CR-31 authorized from frozen CR-30 @ `2e9208614a5cfd80abc47e39ccf236b80315ace8`; repository reconciliation confirms existing navigation/pathfinding/traffic foundations and fixes CR-31A as World-backed Traversability Source Contract.