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
- CR-31B – Deterministic World Reachability Integration: **IMPLEMENTED / AUTOMATED VERIFICATION PENDING FINAL CI / BROWSER GATE PENDING / NOT FROZEN**
- CR-31C: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**
- Current allowed action: CR-31B verification only. CR-31C remains locked.

## 2. CR-31A frozen boundary

CR-31A connects real Building world state to the existing `TRAVERSABLE` / `BLOCKED` truth through `WorldBackedTraversabilitySource`. `MapStructure`, existing routing, Road Preference, traffic/reservation/deadlock/recovery and movement ownership remain unchanged.

Freeze evidence: Actions run `34087731207` on `39b43015721a5de2b4d63b221558431205767037` = **SUCCESS / PASS / 0 BLOCKER**, plus accepted real browser/device evidence.

## 3. CR-31B – Deterministic World Reachability Integration

**IMPLEMENTED / VERIFICATION IN PROGRESS / NOT FROZEN**.

Implementation:

- `src/transport/deterministic-world-reachability-integration.js`
- `src/dev/cr-31b-self-test.node.js`

Implemented contract:

- accepts two finite real world positions,
- deterministically projects both positions into their containing `MapStructure` cells using the map origin and cell size,
- rejects world positions outside the map,
- consumes the frozen CR-31A traversability source as the authoritative blocked/free truth,
- returns `START_BLOCKED` or `TARGET_BLOCKED` without inventing another occupancy owner,
- positions in the same traversable cell are reachable,
- for distinct traversable cells, reuses the existing `DeterministicCostAwarePathfinder` only as the already-frozen deterministic search primitive,
- exposes only a reachability result (`REACHABLE` / `NO_TRAVERSABLE_CONNECTION` plus blocked endpoint reasons), not a new route owner,
- identical world/map/traversability state yields identical reachability output,
- does not create jobs or mutate world/domain state.

Explicit non-scope:

- no new pathfinder,
- no Road Preference changes,
- no Path/Wear,
- no Person/Carrier movement,
- no Traffic, Reservation, Deadlock or Recovery changes,
- no CR-31C runtime entity validation.

Browser evidence setup:

- visible/build identity synchronized to `CR-31B – Deterministic World Reachability Integration`,
- `RuntimeConfig.build = CR-31B-DETERMINISTIC-WORLD-REACHABILITY-INTEGRATION`,
- browser miniworld preserves the CR-31A 3 static blocked Building cells and CR-30 Population 3 / Gold 3,
- deterministic evidence query: world `(0.25,0.25)` → `(7.25,5.25)` must display `REACHABLE`,
- existing 3 Buildings / 3 Persons remain visible.

## 4. Verification gate

CI now runs the frozen CR-31A Verification / Freeze Gate before `src/dev/cr-31b-self-test.node.js`.

Required CR-31B automated evidence:

- reachable world positions across obstacles,
- deterministic repeated result,
- same-cell reachability,
- blocked start and blocked target rejection,
- fully disconnected traversability returns `NO_TRAVERSABLE_CONNECTION`,
- outside-map world position rejection,
- no TransportJob creation.

After automated PASS / 0 BLOCKER, real browser/device verification is required before any CR-31B freeze. CR-31C remains locked throughout.

## 5. Locked later work

CR-31C remains planned only. Path/Wear remains after CR-31. SaveGame remains IM-13, UI/Mobile IM-14, Guidance/Inspector IM-15.

## 6. Permanent visible CR / build identity synchronization rule

Every browser/device-verifiable CR/substep must update all applicable visible/build identity surfaces in the same implementation step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — CR-31B implementation completed on the existing Whole-CR-31 branch; automated verification is the current gate and CR-31C remains locked.
