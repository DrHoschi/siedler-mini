# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-CR branch: `feature/cr-31-navigation-integration-foundation`
- Frozen whole-CR predecessor: **CR-30 – Housing / Population / Gold Integration Foundation** @ `2e9208614a5cfd80abc47e39ccf236b80315ace8`
- CR-31 – Navigation Integration Foundation: **ACTIVE / NOT FROZEN**
- CR-31A – World-backed Traversability Source Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-31A freeze marker: `frozen/cr-31a-world-backed-traversability-source-contract`
- CR-31A frozen commit: `39b43015721a5de2b4d63b221558431205767037`
- CR-31B – Deterministic World Reachability Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-31B freeze marker: `frozen/cr-31b-deterministic-world-reachability-integration`
- CR-31B frozen commit: `68ecf9a031d6d63da5dbb7cd24d558f1a1e89391`
- CR-31C – Runtime Entity Navigation Validation Integration: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**
- Current allowed action: explicit confirmation/authorization of CR-31C only. No CR-31C implementation before that authorization.

## 2. CR-31A frozen boundary

CR-31A connects real Building world state to the existing `TRAVERSABLE` / `BLOCKED` truth through `WorldBackedTraversabilitySource`. `MapStructure`, existing routing, Road Preference, traffic/reservation/deadlock/recovery and movement ownership remain unchanged.

Freeze evidence: Actions run `34087731207` on `39b43015721a5de2b4d63b221558431205767037` = **SUCCESS / PASS / 0 BLOCKER**, plus accepted real browser/device evidence.

## 3. CR-31B frozen boundary

CR-31B consumes frozen CR-31A and the existing deterministic cost-aware pathfinder to answer whether two valid real world positions are connected through traversable cells. It does not create a second pathfinder or route owner.

Frozen implementation:

- `src/transport/deterministic-world-reachability-integration.js`
- `src/dev/cr-31b-self-test.node.js`

Frozen contract:

- finite real world positions map deterministically to containing `MapStructure` cells,
- positions outside the map are rejected,
- frozen CR-31A traversability remains authoritative,
- blocked endpoints return explicit `START_BLOCKED` / `TARGET_BLOCKED`,
- same traversable cell is reachable,
- distinct traversable cells reuse the existing `DeterministicCostAwarePathfinder`,
- reachable/disconnected results are deterministic,
- no new route ownership, Path/Wear, movement, Road Preference, Traffic, Reservation, Deadlock or Recovery behavior is introduced,
- world/domain state and TransportJobs are not mutated or created.

Automated freeze evidence: Actions run `34094572739` on `6ec205a93102614eb29f3c98150a7da61958b47b` completed **SUCCESS / PASS / 0 BLOCKER**.

Accepted real iPhone/Safari evidence on 2026-09-07 showed:

- correct `CR-31B – Deterministic World Reachability Integration` identity,
- runtime `READY`,
- world `(0.25,0.25)` → `(7.25,5.25)` = `REACHABLE`,
- CR-31A 3 static BLOCKED cells preserved,
- CR-30 Population 3 / Gold 3 preserved,
- 3 Buildings / 3 Persons visible.

Freeze marker `frozen/cr-31b-deterministic-world-reachability-integration` now points to `68ecf9a031d6d63da5dbb7cd24d558f1a1e89391`. Therefore CR-31B is **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

## 4. CR-31C – Runtime Entity Navigation Validation Integration

**PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

CR-31C may later validate existing real Person/Carrier positions and targets against the frozen CR-31A/CR-31B navigation truth while preserving existing route, movement and traffic owners. Its implementation requires explicit authorization first.

## 5. Locked later work

Path/Wear remains after CR-31. SaveGame remains IM-13, UI/Mobile IM-14, Guidance/Inspector IM-15.

## 6. Permanent visible CR / build identity synchronization rule

Every browser/device-verifiable CR/substep must update all applicable visible/build identity surfaces in the same implementation step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — CR-31B frozen at `68ecf9a031d6d63da5dbb7cd24d558f1a1e89391`; CR-31C remains planned and requires explicit authorization before implementation.
