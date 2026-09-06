# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-CR branch: `feature/cr-30-housing-population-gold-integration-foundation`
- Frozen whole-CR predecessor: **CR-29 – Camera & World View Foundation** @ `560334f6481aef0398b699d21100d0079ea429f1`
- CR-30 – Housing / Population / Gold Integration Foundation: **ACTIVE / NOT FROZEN**
- CR-30A – Home & Housing Capacity Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `f74d6bc1399212650c11196f8f098a419eda6cbf`
- CR-30B – Deterministic Housing & Population Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `e00fb5bbbde6f7f6e72b81ac77a44f0a263834a5`
- CR-30C – Gold Economy Integration: **ACCEPTED / AUTOMATED + REAL IPAD BROWSER VERIFIED / PASS / 0 BLOCKER / FREEZE PENDING**
- Next allowed action: **CR-30C Acceptance / Freeze only**. Do not execute the whole-CR Completion/Freeze Gate until CR-30C has a freeze marker.

## 2. Frozen CR-30A / CR-30B source truth

CR-30A remains authoritative for Housing capacity and one-Home invariants. CR-30B remains authoritative for deterministic Housing/Population integration and produces the immutable `derived-population` truth from real valid assigned Persons. No independent mutable Population counter/store exists.

CR-30C consumes that derived Population truth but does not replace, duplicate or mutate it.

## 3. CR-30C – Gold Economy Integration

**ACCEPTED / PASS / 0 BLOCKER / FREEZE PENDING**.

Implemented boundary:

- exactly one explicit `GoldEconomyOwner` owns mutable Gold balance,
- Gold state is explicitly `physical: false`,
- Gold income derives only from valid immutable `derived-population`,
- `goldPerResident` is supplied explicitly; no hidden gameplay balance default exists,
- deriving income is pure; settlement mutates only the Gold owner,
- Gold creates no Resource/BuildingStock record,
- Gold creates no Logistics cargo, demand or TransportJob,
- Population receives no Gold/balance field and remains the sole resident truth,
- no SaveGame/restore surcharge or restore behavior exists.

Implementation:

- `src/domain/gold-economy-owner.js`
- `src/dev/cr-30c-self-test.node.js`

Automated evidence:

- GitHub Actions run `34061155533`: frozen regression + CR-30A + CR-30B + CR-30C direct verification = **PASS / 0 BLOCKER**.

Real browser/device evidence accepted on 2026-09-06:

- real iPad / Safari screenshot supplied by the user,
- current page/panel visibly identifies `CR-30C – Gold Economy Integration`,
- runtime visibly `READY`,
- status visibly reports `CR-30C ACTIVE`,
- Population = 3,
- explicit evidence Gold Rate = 1 / Resident,
- Gold Income = 3,
- Gold Balance = 3,
- Gold visibly identified as `NON-PHYSICAL`,
- preserved world visibly contains 3 Buildings / 3 Persons,
- no stale predecessor identity is presented as the current build,
- result: **REAL IPAD / SAFARI BROWSER VERIFIED / PASS / 0 BLOCKER**.

The visible evidence rate `1 Gold / Resident` is only a deterministic arithmetic test value and is not a production gameplay-balance decision.

## 4. Current CR-30C gate

CR-30C has passed automated and real-device verification. The sole remaining action is to create the CR-30C freeze marker on this accepted state.

Only after that marker exists may the separate **CR-30 Completion / Regression / Freeze Gate** be explicitly authorized. That whole-CR gate is not executed as part of CR-30C freeze.

## 5. Permanent visible CR / build identity synchronization rule

Before a browser/device gate, before declaring a visible substep PASS, and again before a whole-CR Freeze Gate, verify every applicable visible/build identity surface against the current authorized CR/substep. A stale predecessor label is a verification defect.

---

**Updated:** 2026-09-06 — CR-30C automated and real iPad/Safari verification accepted at PASS / 0 BLOCKER; CR-30C freeze marker is the sole next action.
