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
- CR-31B / CR-31C: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**
- Current allowed action: define/authorize CR-31B only. No CR-31B implementation is authorized yet.

## 2. CR-31 repository reconciliation result

The frozen CR-30 repository already contains the navigation/route/traffic foundations that CR-31 must reuse rather than rebuild.

Existing authoritative building blocks include `MapStructure`, `TraversabilityContract`, `BlockedCellSource`, deterministic grid/cost pathfinding, road preference, obstacle-aware routing and the frozen occupancy/reservation/waiting/deadlock/recovery chain.

The integration gap is between the real CR-28–30 world/domain state and the existing traversability consumer boundary. CR-31 introduces no replacement pathfinder or traffic owner.

## 3. CR-31A – World-backed Traversability Source Contract

**COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Implementation:

- `src/transport/world-backed-traversability-source.js`
- `src/dev/cr-31a-self-test.node.js`
- `src/dev/cr-31a-freeze-gate.node.js`

Frozen boundary:

- `MapStructure` remains the spatial boundary,
- `TraversabilityContract` remains the `TRAVERSABLE` / `BLOCKED` semantic contract,
- the source exposes the downstream-compatible `stateAt`, `isTraversable` and `entries` surface,
- real existing Buildings in lifecycle state `EXISTS` are static world occupancy,
- each real Building world position maps deterministically into its containing map cell,
- multiple Buildings in one cell still create one blocked-cell truth,
- retired Buildings do not block,
- Persons do not become static traversability owners,
- outside-map cells remain invalid,
- identical real world/domain state yields identical sorted blocked-cell evidence,
- existing obstacle-aware routing consumes the source unchanged,
- no new reachability search, route algorithm, path cost, Road Preference, Wear, traffic/reservation/deadlock/recovery ownership or movement is part of CR-31A.

Verification evidence:

- automated implementation regression: Actions run `34087031469` = **SUCCESS / PASS / 0 BLOCKER**,
- real browser/device evidence on 2026-09-07: **PASS / 0 BLOCKER**, showing `READY`, correct CR-31A identity, 3 static BLOCKED cells, free cells TRAVERSABLE, preserved CR-30 Population 3 / Gold 3, and 3 Buildings / 3 Persons,
- dedicated Verification / Freeze Gate added as `src/dev/cr-31a-freeze-gate.node.js`,
- first freeze-gate run `34087656611` found only a too-literal source-text assertion for the dynamically rendered blocked-cell count; no domain/predecessor regression failed,
- corrected freeze-gate run `34087731207` on `39b43015721a5de2b4d63b221558431205767037` = **SUCCESS / PASS / 0 BLOCKER**,
- CR-31A frozen at exactly that accepted commit.

## 4. CR-31B / CR-31C

### CR-31B – Deterministic World Reachability Integration

**PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

Candidate boundary from prior reconciliation: consume frozen CR-31A traversability plus existing deterministic routing primitives to answer whether two valid world positions are connected/reachable. No Path/Wear and no movement integration. This boundary must be explicitly confirmed/authorized before implementation.

### CR-31C – Runtime Entity Navigation Validation Integration

**PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

May later validate existing real Person/Carrier positions and targets against the frozen navigation truth while keeping earlier route/movement/traffic owners intact.

## 5. Current next step

CR-31A is frozen. The next allowed step is **CR-31B contract confirmation / explicit authorization only**. Do not implement CR-31B automatically.

## 6. Locked later work

Path/Wear remains after CR-31. SaveGame remains IM-13, UI/Mobile IM-14, Guidance/Inspector IM-15.

## 7. Permanent visible CR / build identity synchronization rule

Every browser/device-verifiable CR/substep must update all applicable visible/build identity surfaces in the same implementation step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — CR-31A Verification / Freeze Gate PASS / 0 BLOCKER; frozen at `39b43015721a5de2b4d63b221558431205767037`. CR-31B remains not implementation-authorized pending explicit confirmation.