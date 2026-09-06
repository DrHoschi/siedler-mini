# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-30 ACTIVE / CR-30A FROZEN / CR-30B IMPLEMENTED + DIRECT VERIFICATION PASS  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-30-housing-population-gold-integration-foundation`  
**Latest whole-CR freeze:** **CR-29 – Camera & World View Foundation**  
**Latest substep freeze:** **CR-30A – Home & Housing Capacity Contract**

## 1. Frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-29 – Camera & World View Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Whole-CR predecessor marker: `frozen/cr-29-camera-world-view-foundation` @ `560334f6481aef0398b699d21100d0079ea429f1`.

CR-30A substep marker: `frozen/cr-30a-home-housing-capacity-contract` @ `f74d6bc1399212650c11196f8f098a419eda6cbf`.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- **IM-10 – Housing / Population / Gold Integration**,
- later Navigation,
- later Path/Wear,
- IM-13 – SaveGame,
- IM-14 – UI/Mobile,
- IM-15 – Guidance/Inspector.

CR-30 remains the active implementation block for IM-10. Later migration blocks remain locked.

## 3. CR-30 – Housing / Population / Gold Integration Foundation

### CR-30A – Home & Housing Capacity Contract

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen capability: immutable housing capacity on stable Buildings, one immutable Home assignment for an existing stable Person, deterministic capacity/duplicate-home rejection, no Population or Gold.

### CR-30B – Deterministic Housing & Population Integration

Status: **IMPLEMENTED / DIRECT VERIFICATION PASS / 0 BLOCKER / NOT FROZEN**.

Implemented capability:

- deterministic existing-Person ordering by stable Person ID,
- deterministic Housing ordering by stable Building ID,
- valid existing Home assignments preserved,
- existing real Persons consume free Housing before generated residents,
- Population derived only from valid assigned real Persons,
- no independent Population store or mutable counter,
- only genuinely remaining free slots create new real stable Persons,
- generated housing Persons are `GENERAL_RESIDENT` / `HOUSING_FREE_SLOT`, not random specialists,
- no duplicate resident creation on rerun,
- unhoused existing Persons remain real but are not counted as housed Population,
- no Gold.

Evidence:

- `src/domain/deterministic-housing-population-integration.js`,
- `src/dev/cr-30b-self-test.node.js`,
- GitHub Actions run `34059191599`: CR-30B direct regression **PASS / 0 BLOCKER**,
- GitHub Actions run `34059267721` on browser-integrated code HEAD `e0e674ae0b10af8085e27eb0b1d2441521d9743f`: frozen regression + CR-30A + CR-30B = **PASS / 0 BLOCKER**,
- visible/build identity synchronized to CR-30B.

Current gate: **browser/device verification pending**. The deployed browser scenario deliberately has capacity 3 for the 3 existing Persons, so expected evidence is Population 3 / 3 Home Assignments / 0 newly generated General Residents / 3 Buildings / 3 Persons visible.

CR-30B must not be frozen and CR-30C must not begin until this browser gate is accepted at PASS / 0 BLOCKER.

### CR-30C – Gold Economy Integration

Status: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

Target boundary: Gold is owned by a clear economy owner and derived/generated from real valid residents. Gold remains non-physical and is not BuildingStock or Logistics cargo. No restore surcharge/additional restore tax.

### CR-30 Completion / Regression / Freeze Gate

Status: **PLANNED**. A+B+C must be regressed together against frozen CR-29 and relevant predecessor contracts. Whole CR-30 freezes only at **PASS / 0 BLOCKER**.

## 4. Current next step

Perform real browser/device verification of **CR-30B – Deterministic Housing & Population Integration** on the current branch. Verify current CR-30B identity and the expected Population/Home-assignment values while the frozen visual world/camera remains intact.

Do not implement CR-30C yet. No successor CR is implicitly authorized.

---

**Updated:** 2026-09-06 — CR-30B implemented and directly verified PASS / 0 BLOCKER; visible identity synchronized; browser/device gate is the sole next step.
