# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Completed whole-CR branch: `feature/cr-31-navigation-integration-foundation`
- Frozen whole-CR predecessor: **CR-30 – Housing / Population / Gold Integration Foundation** @ `2e9208614a5cfd80abc47e39ccf236b80315ace8`
- CR-31 – Navigation Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-31 whole freeze marker: `frozen/cr-31-navigation-integration-foundation`
- CR-31 whole frozen commit: `f4fba712cd88dc83e616c0c4f360a2a016e5dff2`
- CR-31A – World-backed Traversability Source Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `39b43015721a5de2b4d63b221558431205767037`
- CR-31B – Deterministic World Reachability Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `68ecf9a031d6d63da5dbb7cd24d558f1a1e89391`
- CR-31C – Runtime Entity Navigation Validation Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `2886839edddcf636fc347a0e25d1e9b40ff16d85`
- Current allowed action: determine and explicitly authorize the next post-navigation system block. No implementation has begun after CR-31.

## 2. Frozen CR-31 navigation boundary

CR-31A connects real Building world state to the existing `TRAVERSABLE` / `BLOCKED` truth through `WorldBackedTraversabilitySource`.

CR-31B consumes that frozen truth plus the existing deterministic cost-aware pathfinder to answer deterministic world reachability without creating another pathfinder or route owner.

CR-31C validates existing real runtime Person/Carrier positions and targets against the frozen CR-31A/CR-31B navigation truth while preserving route, movement and traffic ownership.

The whole frozen CR-31 boundary therefore provides real world-backed static traversability, deterministic reachability and runtime entity navigation validation while preserving all earlier routing/traffic ownership.

## 3. Whole CR-31 Completion / Regression / Freeze Gate

The whole gate regressed the complete CR-31A + CR-31B + CR-31C navigation integration against the frozen CR-30 functional predecessor line and verified current visible/build identity consistency.

Automated evidence:

- dedicated gate: `src/dev/cr-31-freeze-gate.node.js`,
- CI chain: `npm run ci` → reusable frozen predecessor regressions → CR-31A → CR-31B → CR-31C → CR-31 whole identity/evidence gate,
- GitHub Actions run `34100391182` on commit `f4fba712cd88dc83e616c0c4f360a2a016e5dff2` = **SUCCESS / PASS / 0 BLOCKER**,
- step `Run CR-31 Completion Regression Freeze Gate` = **SUCCESS**,
- failure diagnostics skipped.

Accepted real iPhone/Safari evidence on 2026-09-07 = **PASS / 0 BLOCKER** and visibly confirmed:

- runtime `READY`,
- heading `CR-31 – Navigation Integration Foundation – Completion / Regression / Freeze Gate`,
- evidence line `CR-31 COMPLETION GATE — CR-31A + CR-31B + CR-31C`,
- Person `TARGET_REACHABLE`,
- Carrier `TARGET_REACHABLE`,
- `2/2 runtime entities VALID`,
- CR-31B world reachability `REACHABLE`,
- CR-31A `3 static BLOCKED cells`,
- frozen CR-30 `Population 3 / Gold 3`,
- `3 Buildings / 3 Persons` visible,
- no stale CR-31C active identity presented as current build.

Freeze marker `frozen/cr-31-navigation-integration-foundation` points exactly to `f4fba712cd88dc83e616c0c4f360a2a016e5dff2`. Therefore CR-31 as a whole is **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

## 4. Locked/non-scope preserved by CR-31

CR-31 introduced no new route owner, no second pathfinder, no new movement execution, no Traffic/Reservation/Deadlock/Recovery ownership changes, no Road Preference changes and no Path/Wear behavior.

SaveGame remains IM-13, UI/Mobile IM-14 and Guidance/Inspector IM-15.

## 5. Next-system boundary

The binding migration order places **Path/Wear** after Navigation. It is no longer blocked by CR-31, but no concrete next CR is implementation-authorized merely by this freeze. The next action must first define the exact post-navigation Path/Wear system boundary and CR structure against this frozen CR-31 baseline.

## 6. Permanent visible CR / build identity synchronization rule

Every browser/device-verifiable CR/substep must update all applicable visible/build identity surfaces in the same implementation step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — whole CR-31 Completion / Regression / Freeze Gate automated and real iPhone/Safari evidence PASS / 0 BLOCKER; CR-31 frozen at `f4fba712cd88dc83e616c0c4f360a2a016e5dff2`.