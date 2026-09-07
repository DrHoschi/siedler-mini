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
- CR-31C – Runtime Entity Navigation Validation Integration: **IMPLEMENTED / AUTOMATED VERIFIED / PASS / 0 BLOCKER / BROWSER GATE PENDING / NOT FROZEN**
- Current allowed action: real browser/device verification of CR-31C only. Whole-CR-31 completion/freeze remains locked until CR-31C is accepted and frozen.

## 2. Frozen navigation boundary before CR-31C

CR-31A connects real Building world state to the existing `TRAVERSABLE` / `BLOCKED` truth through `WorldBackedTraversabilitySource`.

CR-31B consumes that frozen truth plus the existing deterministic cost-aware pathfinder to answer deterministic world reachability without creating another pathfinder or route owner.

CR-31B freeze marker: `frozen/cr-31b-deterministic-world-reachability-integration` @ `68ecf9a031d6d63da5dbb7cd24d558f1a1e89391`.

## 3. CR-31C – Runtime Entity Navigation Validation Integration

**IMPLEMENTED / AUTOMATED VERIFIED / PASS / 0 BLOCKER / BROWSER GATE PENDING / NOT FROZEN**.

Implementation:

- `src/transport/runtime-entity-navigation-validation-integration.js`
- `src/dev/cr-31c-self-test.node.js`

Implemented contract:

- validates only already-existing real runtime units from `domains.units`,
- Person validation requires the existing `PersonResidentIdentityContract` identity and reads the unit's real stored position,
- Carrier validation consumes the existing `CarrierMovementContract` plus the carrier identity already attached to the real unit,
- carrier movement currentPosition must match the real runtime entity position; mismatch yields `ENTITY_POSITION_MISMATCH`,
- current positions and optional targets are checked by consuming frozen CR-31B `DeterministicWorldReachabilityIntegration`,
- a valid current position without a target returns `POSITION_VALID`,
- a reachable target returns `TARGET_REACHABLE`,
- frozen CR-31B failure reasons such as `START_BLOCKED`, `TARGET_BLOCKED` and `NO_TRAVERSABLE_CONNECTION` remain authoritative,
- identical runtime/domain/navigation state yields identical validation output,
- validation is read-only: no Person/Carrier position mutation and no TransportJob creation.

Explicit non-scope preserved:

- no new route owner,
- no new pathfinder,
- no Person/Carrier movement execution,
- no Traffic, Reservation, Deadlock or Recovery changes,
- no Road Preference changes,
- no Path/Wear,
- no SaveGame, UI/Mobile or Guidance/Inspector work.

## 4. Browser evidence setup

Visible/build identity is synchronized to `CR-31C – Runtime Entity Navigation Validation Integration`.

The existing visible miniworld remains 3 Buildings / 3 Persons. One of the existing Persons also carries the already-existing Carrier contract so CR-31C can validate both a real Person and a real Carrier without adding another visible runtime entity.

Expected browser evidence:

- runtime `READY`,
- heading `CR-31C – Runtime Entity Navigation Validation Integration`,
- evidence line starts with `CR-31C ACTIVE`,
- Person result `TARGET_REACHABLE`,
- Carrier result `TARGET_REACHABLE`,
- `2/2 runtime entities VALID`,
- CR-31B world reachability remains `REACHABLE`,
- CR-31A 3 static BLOCKED cells preserved,
- CR-30 Population 3 / Gold 3 preserved,
- 3 Buildings / 3 Persons remain visible,
- no stale CR-31B identity presented as current build.

## 5. Automated verification

CI regression chain now runs:

`npm run ci` → CR-24C → CR-28 → reusable CR-31A self-test → CR-31B self-test → CR-31C self-test.

GitHub Actions run `34097331344` on commit `d4d61af7bac5b69f2017fb45136ab187da485dd1` completed **SUCCESS / PASS / 0 BLOCKER**. The `Run CR-31C Regression` step completed successfully and failure diagnostics were skipped.

CR-31C direct automated evidence includes:

- real Person current-position validation,
- real Person target reachability,
- deterministic repeated validation,
- blocked real Person position rejection,
- blocked target rejection,
- real Carrier movement target validation,
- real runtime entity position vs movement-position mismatch rejection,
- unknown runtime unit rejection,
- no TransportJob creation,
- no Person/Carrier position mutation.

## 6. Current gate

The next and only allowed action is **real browser/device verification of CR-31C**. Do not freeze CR-31C and do not begin the whole-CR-31 completion/freeze gate until that evidence is accepted PASS / 0 BLOCKER.

## 7. Locked later work

Path/Wear remains after CR-31. SaveGame remains IM-13, UI/Mobile IM-14, Guidance/Inspector IM-15.

## 8. Permanent visible CR / build identity synchronization rule

Every browser/device-verifiable CR/substep must update all applicable visible/build identity surfaces in the same implementation step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — CR-31C implemented on the existing Whole-CR-31 branch; automated Actions regression PASS / 0 BLOCKER; browser/device gate pending.
