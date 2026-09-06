# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-CR branch: `feature/cr-30-housing-population-gold-integration-foundation`
- Frozen whole-CR predecessor: **CR-29 – Camera & World View Foundation** @ `560334f6481aef0398b699d21100d0079ea429f1`
- CR-30 – Housing / Population / Gold Integration Foundation: **ACTIVE / NOT YET WHOLE-CR FROZEN**
- CR-30A – Home & Housing Capacity Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `f74d6bc1399212650c11196f8f098a419eda6cbf`
- CR-30B – Deterministic Housing & Population Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `e00fb5bbbde6f7f6e72b81ac77a44f0a263834a5`
- CR-30C – Gold Economy Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-30C freeze marker: `frozen/cr-30c-gold-economy-integration`
- CR-30C frozen commit: `7248b7ad0cc20b60f5919a422a261ab7cd2221d8`
- Current authorized action: **CR-30 Completion / Regression / Freeze Gate** only.

## 2. Frozen CR-30A / CR-30B / CR-30C boundary

CR-30A remains authoritative for Housing capacity and one-Home invariants. CR-30B remains authoritative for deterministic Housing/Population integration and the immutable `derived-population` truth from valid real housed Persons. CR-30C remains authoritative for one non-physical Gold owner consuming only that derived Population truth.

No independent mutable Population counter/store exists. Gold is not Resource/BuildingStock state, not Logistics cargo and not a TransportJob.

## 3. CR-30C – Gold Economy Integration

**COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen capability:

- exactly one explicit `GoldEconomyOwner` owns mutable Gold balance,
- Gold state is explicitly `physical: false`,
- Gold income derives only from valid immutable `derived-population`,
- `goldPerResident` is supplied explicitly; no hidden gameplay balance default exists,
- deriving income is pure; settlement mutates only the Gold owner,
- Gold creates no Resource/BuildingStock record,
- Gold creates no Logistics cargo, demand or TransportJob,
- Population receives no Gold/balance field and remains the sole resident truth,
- no SaveGame/restore surcharge or restore behavior exists.

Verification evidence:

- GitHub Actions run `34061155533`: frozen regression + CR-30A + CR-30B + CR-30C direct verification = **PASS / 0 BLOCKER**,
- real iPad/Safari browser evidence on 2026-09-06: CR-30C identity correct, runtime READY, Population 3, explicit evidence Gold Rate 1/Resident, Gold Income 3, Gold Balance 3, NON-PHYSICAL, preserved 3 Buildings / 3 Persons = **PASS / 0 BLOCKER**.

Freeze decision:

- marker: `frozen/cr-30c-gold-economy-integration`
- commit: `7248b7ad0cc20b60f5919a422a261ab7cd2221d8`
- CR-30C is closed against further unapproved modification.

The visible evidence rate `1 Gold / Resident` remains only a deterministic arithmetic test value, not a production balancing decision.

## 4. CR-30 Completion / Regression / Freeze Gate

**AUTHORIZED / ACTIVE / WHOLE-CR FREEZE NOT YET DECIDED**.

The next and only allowed action is to regress CR-30A + CR-30B + CR-30C together against frozen CR-29 and all relevant frozen predecessor contracts.

Required gate conditions:

- all CR-30A/B/C direct contracts remain PASS,
- frozen CR-29 world/camera presentation remains intact,
- Housing capacity and one-Home invariants remain intact,
- Population remains derived only from real valid housed Persons,
- no duplicate/second Population truth exists,
- Gold remains one non-physical economy truth outside BuildingStock and Logistics,
- visible/build identity surfaces used for the whole-CR gate must identify the current CR-30 completion/freeze state and contain no stale substep identity,
- result must be **PASS / 0 BLOCKER** before whole CR-30 may be frozen.

No successor CR is implicitly authorized by a successful CR-30 freeze.

## 5. Permanent visible CR / build identity synchronization rule

Before a browser/device gate, before declaring a visible substep PASS, and again before a whole-CR Freeze Gate, verify every applicable visible/build identity surface against the current authorized CR/substep/gate. A stale predecessor label is a verification defect.

---

**Updated:** 2026-09-06 — CR-30C accepted and frozen at `7248b7ad0cc20b60f5919a422a261ab7cd2221d8`; the separate CR-30 Completion / Regression / Freeze Gate is now explicitly authorized as the sole next action.
