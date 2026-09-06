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
- CR-30B – Deterministic Housing & Population Integration: **IMPLEMENTED / DIRECT VERIFICATION PASS / 0 BLOCKER / NOT FROZEN**
- CR-30C: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**
- Next allowed action: browser/device verification of **CR-30B only**. Do not implement CR-30C yet.

## 2. CR-30A frozen boundary

CR-30B builds only on the frozen CR-30A Home/Housing-capacity contract. CR-30A remains authoritative for immutable housing capacity, one active Home per Person, stable Building/Person identity, and capacity rejection.

Freeze marker: `frozen/cr-30a-home-housing-capacity-contract` @ `f74d6bc1399212650c11196f8f098a419eda6cbf`.

## 3. CR-30B – Deterministic Housing & Population Integration

**IMPLEMENTED / DIRECT VERIFICATION PASS / 0 BLOCKER / NOT FROZEN**.

Implemented boundary:

- existing real Persons are processed deterministically in stable `personId` order,
- valid housing is processed deterministically in stable `buildingId` order,
- existing valid Home assignments are preserved,
- unassigned existing real Persons fill genuinely free housing slots before any new resident is created,
- Population is an immutable derived result from valid assigned real Persons; no Population store/counter was added,
- only remaining real free housing slots may create new Persons,
- generated Persons are created in the real Unit store with stable Person identity before they count toward Population,
- generated housing residents are explicitly `GENERAL_RESIDENT` with origin `HOUSING_FREE_SLOT`,
- no random specialist/workforce identity is created,
- rerunning an already-full valid integration creates no duplicate residents,
- existing Persons that cannot be housed remain real Persons but do not count as housed Population,
- no Gold ownership/state is introduced.

Implementation:

- `src/domain/deterministic-housing-population-integration.js`
- `src/dev/cr-30b-self-test.node.js`

Automated verification:

- GitHub Actions run `34059191599`: first direct CR-30B regression = **PASS / 0 BLOCKER**,
- GitHub Actions run `34059267721` on browser-integrated code HEAD `e0e674ae0b10af8085e27eb0b1d2441521d9743f`: existing `npm run ci` + CR-24C + CR-28 + whole CR-29 + frozen CR-30A test + CR-30B direct test = **PASS / 0 BLOCKER**.

Visible/build identity synchronization for CR-30B is implemented:

- page/document title,
- visible heading and explanatory copy,
- accessibility label,
- runtime/test status,
- cache-busting identifiers,
- console identity,
- `RuntimeConfig.build = CR-30B-DETERMINISTIC-HOUSING-POPULATION-INTEGRATION`.

The browser miniworld uses two valid Housing contracts with total capacity 3 for the existing 3 visible Persons. Therefore browser evidence should show Population 3, 3 Home Assignments, 0 generated General Residents, while the preserved 3 Buildings / 3 Persons visual world remains unchanged. The separate Node test proves the free-slot generation path with exactly one generated General Resident.

Explicit non-scope remains:

- no Gold,
- no SaveGame/restore,
- no UI/Inspector feature work,
- no Navigation/Path/Wear changes,
- no BuildingStock, Workforce, Logistics, camera or render ownership changes,
- no change to CR-23A stable identity semantics.

## 4. Current CR-30B gate

CR-30B is not frozen yet. The next allowed step is real browser/device verification of the deployed CR-30B page. Required visible evidence:

- current page/heading/status identify **CR-30B**,
- status reports derived Population 3,
- status reports 3 Home Assignments,
- status reports 0 General Residents generated in this full-capacity browser scenario,
- 3 Buildings / 3 Persons remain visibly preserved,
- no stale predecessor identity is presented as the current build.

Only after browser PASS / 0 BLOCKER may CR-30B be accepted/frozen and CR-30C explicitly authorized.

## 5. CR-30C – Gold Economy Integration

**PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

Gold must remain non-physical and outside BuildingStock/Logistics. No CR-30C implementation is authorized yet.

## 6. Permanent visible CR / build identity synchronization rule

Before a browser/device gate, before declaring a visible substep PASS, and again before a whole-CR Freeze Gate, verify every applicable visible/build identity surface against the current authorized CR/substep. A stale predecessor label is a verification defect.

---

**Updated:** 2026-09-06 — CR-30B implemented, integrated into the browser evidence page, and directly regressed at PASS / 0 BLOCKER. Browser/device verification is now the sole next gate; CR-30C remains locked.
