# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-30 ACTIVE / CR-30A FROZEN / CR-30B FROZEN / CR-30C AUTHORIZED  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-30-housing-population-gold-integration-foundation`  
**Latest whole-CR freeze:** **CR-29 – Camera & World View Foundation**  
**Latest substep freeze:** **CR-30B – Deterministic Housing & Population Integration**

## 1. Frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-29 – Camera & World View Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Whole-CR predecessor marker: `frozen/cr-29-camera-world-view-foundation` @ `560334f6481aef0398b699d21100d0079ea429f1`.

CR-30A substep marker: `frozen/cr-30a-home-housing-capacity-contract` @ `f74d6bc1399212650c11196f8f098a419eda6cbf`.

CR-30B substep marker: `frozen/cr-30b-deterministic-housing-population-integration` @ `e00fb5bbbde6f7f6e72b81ac77a44f0a263834a5`.

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

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen capability:

- deterministic Person/Housing ordering by stable IDs,
- valid existing Home assignments preserved,
- existing real Persons consume Housing before generated residents,
- Population derived only from valid assigned real Persons,
- no independent mutable Population counter/store,
- only real free slots may create new real stable Persons,
- generated Persons are `GENERAL_RESIDENT` / `HOUSING_FREE_SLOT`, not random specialists,
- repeated integration creates no duplicate residents,
- no Gold.

Evidence:

- GitHub Actions run `34059191599`: direct CR-30B regression **PASS / 0 BLOCKER**,
- GitHub Actions run `34059267721` on browser-integrated code HEAD `e0e674ae0b10af8085e27eb0b1d2441521d9743f`: frozen regression + CR-30A + CR-30B = **PASS / 0 BLOCKER**,
- real iPad/Safari evidence: CR-30B visible identity correct, runtime READY, Population 3, Home Assignments 3, General Residents from free slots 0, 3 Buildings / 3 Persons preserved = **PASS / 0 BLOCKER**,
- freeze marker: `frozen/cr-30b-deterministic-housing-population-integration` @ `e00fb5bbbde6f7f6e72b81ac77a44f0a263834a5`.

### CR-30C – Gold Economy Integration

Status: **AUTHORIZED / ACTIVE / NOT FROZEN**.

Allowed capability increment:

- define one clear Gold/economy owner,
- derive or generate Gold deterministically from real valid residents only,
- use frozen CR-30A/CR-30B housing/population truth as the source,
- Gold remains explicitly non-physical,
- Gold is not BuildingStock,
- Gold is not Logistics cargo or transport demand,
- no second Population truth,
- no restore surcharge/additional restore tax.

Not yet allowed: SaveGame/restore implementation, UI/Inspector features, Navigation/Path/Wear changes, or unrelated ownership changes.

### CR-30 Completion / Regression / Freeze Gate

Status: **PLANNED / NOT YET AUTHORIZED FOR EXECUTION**.

A+B+C must be regressed together against frozen CR-29 and relevant predecessor contracts after CR-30C itself is complete. Whole CR-30 freezes only at **PASS / 0 BLOCKER**.

## 4. Current next step

Inspect the current runtime/economy ownership boundary on `feature/cr-30-housing-population-gold-integration-foundation` and implement **CR-30C – Gold Economy Integration** only, building strictly on frozen CR-30A and CR-30B.

If the browser page is used as evidence, synchronize all visible/build identity surfaces to CR-30C before acceptance. Do not execute the whole-CR freeze gate yet.

No successor CR is implicitly authorized.

---

**Updated:** 2026-09-06 — CR-30B accepted and frozen after automated and real iPad/Safari PASS / 0 BLOCKER; CR-30C explicitly authorized as the sole next implementation substep.
