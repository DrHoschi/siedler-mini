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
- CR-30B – Deterministic Housing & Population Integration: **IMPLEMENTED / AUTOMATED + REAL IPAD BROWSER VERIFIED / PASS / 0 BLOCKER / NOT YET FROZEN**
- CR-30C: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**
- Next allowed action: **CR-30B acceptance/freeze only**. Do not implement CR-30C until that freeze is completed and CR-30C is explicitly authorized.

## 2. CR-30A frozen boundary

CR-30B builds only on the frozen CR-30A Home/Housing-capacity contract. CR-30A remains authoritative for immutable housing capacity, one active Home per Person, stable Building/Person identity, and capacity rejection.

Freeze marker: `frozen/cr-30a-home-housing-capacity-contract` @ `f74d6bc1399212650c11196f8f098a419eda6cbf`.

## 3. CR-30B – Deterministic Housing & Population Integration

**IMPLEMENTED / AUTOMATED + REAL IPAD BROWSER VERIFIED / PASS / 0 BLOCKER / NOT YET FROZEN**.

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

Browser/device evidence accepted on 2026-09-06:

- real iPad / Safari screenshot supplied by the user,
- browser tab visibly identifies `Neue Siedler – CR-30B Determi…`,
- visible panel heading identifies `CR-30B – Deterministic Housing & Population Integration`,
- runtime is visibly `READY`,
- status visibly reports `CR-30B ACTIVE`,
- derived Population = 3,
- Home Assignments = 3,
- General Residents from free slots = 0,
- preserved world visibly contains 3 Buildings / 3 Persons,
- no stale CR-30A/CR-29 identity is presented as the current visible build,
- result: **REAL IPAD / SAFARI BROWSER VERIFIED / PASS / 0 BLOCKER**.

The browser miniworld uses two valid Housing contracts with total capacity 3 for the existing 3 visible Persons. The separate Node test proves the free-slot generation path with exactly one generated General Resident.

Explicit non-scope remains:

- no Gold,
- no SaveGame/restore,
- no UI/Inspector feature work,
- no Navigation/Path/Wear changes,
- no BuildingStock, Workforce, Logistics, camera or render ownership changes,
- no change to CR-23A stable identity semantics.

## 4. Current CR-30B gate

Automated verification and real-device browser verification are both PASS / 0 BLOCKER. CR-30B has not yet been frozen solely because the acceptance/freeze marker step is still outstanding.

The sole next allowed action is to freeze CR-30B at the accepted implementation/control-document state. After that freeze, CR-30C may be explicitly authorized as a separate next step. No CR-30C implementation may occur before that authorization.

## 5. CR-30C – Gold Economy Integration

**PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

Gold must remain non-physical and outside BuildingStock/Logistics. No CR-30C implementation is authorized yet.

## 6. Permanent visible CR / build identity synchronization rule

Before a browser/device gate, before declaring a visible substep PASS, and again before a whole-CR Freeze Gate, verify every applicable visible/build identity surface against the current authorized CR/substep. A stale predecessor label is a verification defect.

---

**Updated:** 2026-09-06 — CR-30B automated regression and real iPad/Safari browser evidence are PASS / 0 BLOCKER. The sole next action is CR-30B acceptance/freeze; CR-30C remains locked until explicitly authorized after that freeze.
