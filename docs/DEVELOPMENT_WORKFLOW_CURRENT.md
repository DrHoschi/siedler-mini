# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-CR branch: `feature/cr-30-housing-population-gold-integration-foundation`
- Frozen whole-CR predecessor: **CR-29 – Camera & World View Foundation**
- Frozen whole-CR predecessor marker: `frozen/cr-29-camera-world-view-foundation`
- Frozen whole-CR predecessor commit: `560334f6481aef0398b699d21100d0079ea429f1`
- CR-30 – Housing / Population / Gold Integration Foundation: **ACTIVE / NOT FROZEN**
- CR-30A – Home & Housing Capacity Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-30A freeze marker: `frozen/cr-30a-home-housing-capacity-contract`
- CR-30A frozen commit: `f74d6bc1399212650c11196f8f098a419eda6cbf`
- CR-30B – Deterministic Housing & Population Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-30B freeze marker: `frozen/cr-30b-deterministic-housing-population-integration`
- CR-30B frozen commit: `e00fb5bbbde6f7f6e72b81ac77a44f0a263834a5`
- Current authorized substep: **CR-30C – Gold Economy Integration**
- Next allowed action: inspect the current economy/runtime ownership boundary and implement **CR-30C only** on this same whole-CR branch. No CR-30 Completion/Freeze Gate yet.

## 2. CR-30A frozen boundary

CR-30A remains authoritative for immutable housing capacity, one active Home per Person, stable Building/Person identity, and deterministic capacity rejection.

Freeze marker: `frozen/cr-30a-home-housing-capacity-contract` @ `f74d6bc1399212650c11196f8f098a419eda6cbf`.

## 3. CR-30B – Deterministic Housing & Population Integration

**COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen capability:

- existing real Persons are processed deterministically in stable `personId` order,
- valid Housing is processed deterministically in stable `buildingId` order,
- existing valid Home assignments are preserved,
- existing real Persons consume free Housing before generated residents,
- Population is derived exclusively from valid assigned real Persons,
- no independent mutable Population store/counter exists,
- only genuinely remaining free housing slots may create new real Persons,
- generated housing Persons are explicitly `GENERAL_RESIDENT` with origin `HOUSING_FREE_SLOT`,
- no random specialist/workforce identity is generated,
- repeated integration does not create duplicate residents,
- unhoused existing Persons remain real Persons but do not count as housed Population,
- no Gold ownership/state was introduced.

Implementation:

- `src/domain/deterministic-housing-population-integration.js`
- `src/dev/cr-30b-self-test.node.js`

Verification evidence:

- GitHub Actions run `34059191599`: direct CR-30B regression = **PASS / 0 BLOCKER**,
- GitHub Actions run `34059267721` on browser-integrated code HEAD `e0e674ae0b10af8085e27eb0b1d2441521d9743f`: `npm run ci` + CR-24C + CR-28 + CR-29 + frozen CR-30A test + CR-30B direct test = **PASS / 0 BLOCKER**,
- real iPad/Safari browser evidence supplied 2026-09-06: CR-30B title/heading/status visible, runtime READY, Population 3, Home Assignments 3, General Residents from free slots 0, preserved 3 Buildings / 3 Persons, no stale predecessor identity = **PASS / 0 BLOCKER**.

Freeze decision:

- marker: `frozen/cr-30b-deterministic-housing-population-integration`
- commit: `e00fb5bbbde6f7f6e72b81ac77a44f0a263834a5`
- CR-30B is closed against further unapproved modification.

## 4. CR-30C – Gold Economy Integration

**AUTHORIZED / ACTIVE / NOT FROZEN**.

Allowed scope:

- build strictly on frozen CR-30A + CR-30B resident/home/population truth,
- introduce one clear Gold/economy ownership boundary,
- derive or generate Gold only from real valid residents according to one deterministic policy,
- Gold must remain explicitly non-physical,
- Gold must not be inserted into BuildingStock,
- Gold must not become Logistics cargo or transport demand,
- no second Population truth may be introduced,
- no hidden restore surcharge or restore-specific additional tax may be added.

Explicit non-scope:

- no SaveGame/restore implementation,
- no UI/Inspector feature work,
- no Navigation/Path/Wear changes,
- no BuildingStock/Workforce/Logistics ownership change beyond the explicit separation that Gold is not physical stock/cargo,
- no change to CR-23A identity semantics,
- no whole-CR freeze until CR-30C itself is implemented and verified.

If the browser/test page is used as CR-30C evidence, every visible/build identity surface must be synchronized to **CR-30C – Gold Economy Integration** before browser acceptance.

## 5. CR-30 Completion / Regression / Freeze Gate

**PLANNED / NOT YET AUTHORIZED FOR EXECUTION**.

Only after CR-30C is complete may CR-30A+B+C be regressed together against frozen CR-29 and all relevant predecessor contracts. Whole CR-30 freezes only at **PASS / 0 BLOCKER**. No successor CR is implicitly authorized by that freeze.

## 6. Permanent visible CR / build identity synchronization rule

Before a browser/device gate, before declaring a visible substep PASS, and again before a whole-CR Freeze Gate, verify every applicable visible/build identity surface against the current authorized CR/substep. A stale predecessor label is a verification defect.

---

**Updated:** 2026-09-06 — CR-30B accepted and frozen at `e00fb5bbbde6f7f6e72b81ac77a44f0a263834a5` after automated and real iPad/Safari PASS / 0 BLOCKER; CR-30C is now explicitly authorized as the sole active implementation substep.
