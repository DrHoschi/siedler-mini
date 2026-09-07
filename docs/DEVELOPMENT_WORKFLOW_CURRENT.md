# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-CR branch: `feature/cr-31-navigation-integration-foundation`
- Frozen whole-CR predecessor: **CR-30 – Housing / Population / Gold Integration Foundation** @ `2e9208614a5cfd80abc47e39ccf236b80315ace8`
- CR-31 – Navigation Integration Foundation: **ACTIVE / NOT FROZEN**
- CR-31A – World-backed Traversability Source Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `39b43015721a5de2b4d63b221558431205767037`
- CR-31B – Deterministic World Reachability Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `68ecf9a031d6d63da5dbb7cd24d558f1a1e89391`
- CR-31C – Runtime Entity Navigation Validation Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-31C freeze marker: `frozen/cr-31c-runtime-entity-navigation-validation-integration`
- CR-31C frozen commit: `2886839edddcf636fc347a0e25d1e9b40ff16d85`
- Current allowed action: **CR-31 Completion / Regression / Freeze Gate** only. No Path/Wear or later migration block may begin before whole CR-31 is frozen.

## 2. Frozen navigation boundary

CR-31A connects real Building world state to the existing `TRAVERSABLE` / `BLOCKED` truth through `WorldBackedTraversabilitySource`.

CR-31B consumes that frozen truth plus the existing deterministic cost-aware pathfinder to answer deterministic world reachability without creating another pathfinder or route owner.

CR-31C validates existing real runtime Person/Carrier positions and targets against the frozen CR-31A/CR-31B navigation truth while preserving route, movement and traffic ownership.

## 3. CR-31C frozen evidence

Frozen implementation:

- `src/transport/runtime-entity-navigation-validation-integration.js`
- `src/dev/cr-31c-self-test.node.js`

Frozen contract:

- validates only already-existing real runtime units from `domains.units`,
- Person validation reads the unit's real stored position,
- Carrier validation consumes the existing `CarrierMovementContract`,
- carrier movement currentPosition must match the real runtime entity position; mismatch yields `ENTITY_POSITION_MISMATCH`,
- current positions and optional targets consume frozen CR-31B `DeterministicWorldReachabilityIntegration`,
- valid current-only positions return `POSITION_VALID`, reachable targets return `TARGET_REACHABLE`,
- frozen CR-31B failure reasons remain authoritative,
- validation is deterministic and read-only,
- no Person/Carrier position mutation and no TransportJob creation,
- no route/pathfinder/Traffic/Reservation/Deadlock/Recovery/Road Preference/Path-Wear ownership changes.

Automated evidence:

- Actions run `34097331344` = **SUCCESS / PASS / 0 BLOCKER**,
- follow-up Actions run `34097459849` = **SUCCESS / PASS / 0 BLOCKER**.

Accepted real iPhone/Safari evidence on 2026-09-07 = **PASS / 0 BLOCKER** and visibly confirmed:

- runtime `READY`,
- correct CR-31C identity,
- Person `TARGET_REACHABLE`,
- Carrier `TARGET_REACHABLE`,
- `2/2 runtime entities VALID`,
- CR-31B world reachability `REACHABLE`,
- CR-31A `3 static BLOCKED cells`,
- CR-30 `Population 3 / Gold 3`,
- `3 Buildings / 3 Persons` visible.

Freeze marker `frozen/cr-31c-runtime-entity-navigation-validation-integration` points exactly to `2886839edddcf636fc347a0e25d1e9b40ff16d85`. Therefore CR-31C is **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

## 4. Whole CR-31 Completion / Regression / Freeze Gate

Now **UNLOCKED / NOT YET EXECUTED**.

The gate may only regress the complete CR-31A + CR-31B + CR-31C navigation integration against the frozen CR-30 predecessor, verify current visible/build identity consistency, and freeze the whole CR-31 only on **PASS / 0 BLOCKER**. It must not add new navigation behavior.

## 5. Locked later work

Path/Wear remains after CR-31. SaveGame remains IM-13, UI/Mobile IM-14, Guidance/Inspector IM-15. None is authorized before the whole CR-31 freeze.

## 6. Permanent visible CR / build identity synchronization rule

Every browser/device-verifiable CR/substep must update all applicable visible/build identity surfaces in the same implementation step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — CR-31C substep frozen at `2886839edddcf636fc347a0e25d1e9b40ff16d85`; CR-31 Completion / Regression / Freeze Gate is now the sole next action.