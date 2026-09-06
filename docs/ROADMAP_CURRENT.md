# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-30 WHOLE-GATE AUTOMATED PASS / BROWSER GATE PENDING / NOT FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-30-housing-population-gold-integration-foundation`  
**Latest whole-CR freeze:** **CR-29 – Camera & World View Foundation**  
**Latest substep freeze:** **CR-30C – Gold Economy Integration**

## 1. Frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-29 – Camera & World View Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-30A marker: `frozen/cr-30a-home-housing-capacity-contract` @ `f74d6bc1399212650c11196f8f098a419eda6cbf`.  
CR-30B marker: `frozen/cr-30b-deterministic-housing-population-integration` @ `e00fb5bbbde6f7f6e72b81ac77a44f0a263834a5`.  
CR-30C marker: `frozen/cr-30c-gold-economy-integration` @ `7248b7ad0cc20b60f5919a422a261ab7cd2221d8`.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- **IM-10 – Housing / Population / Gold Integration**,
- later Navigation,
- later Path/Wear,
- IM-13 – SaveGame,
- IM-14 – UI/Mobile,
- IM-15 – Guidance/Inspector.

CR-30 remains the active whole system block until its whole freeze completes. Later migration blocks remain locked.

## 3. CR-30 – Housing / Population / Gold Integration Foundation

CR-30A, CR-30B and CR-30C are each **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

The combined contract remains:

- Housing capacity and one-Home invariants are preserved,
- Population is derived only from real valid housed Persons,
- no independent mutable Population truth exists,
- exactly one Gold economy owner consumes that derived Population,
- Gold is explicitly non-physical and is not Resource/BuildingStock or Logistics cargo,
- frozen CR-29 world/camera presentation remains intact.

### CR-30 Completion / Regression / Freeze Gate

Status: **AUTOMATED PASS / 0 BLOCKER — REAL BROWSER/DEVICE GATE PENDING — WHOLE CR-30 NOT FROZEN**.

Automated whole-gate evidence:

- `src/dev/cr-30-freeze-gate.node.js` covers frozen CR-29 + CR-30A + CR-30B + CR-30C,
- GitHub Actions run `34061733270` on `67bf665b9cf0acf94c0ec1f70ca01a39322fefb5` = **SUCCESS / PASS / 0 BLOCKER**,
- CI chain includes baseline + CR-24C + CR-28 + CR-30 whole gate,
- visible/build source identity is synchronized to `CR-30 Completion / Regression / Freeze Gate` and `CR-30-COMPLETION-FREEZE-GATE`.

Remaining final gate:

- verify the deployed page on the real browser/device,
- current title/heading/status must identify the CR-30 Completion / Regression / Freeze Gate,
- runtime READY,
- Population 3,
- 3 Home Assignments,
- Gold Income 3,
- Gold Balance 3,
- NON-PHYSICAL,
- preserved 3 Buildings / 3 Persons,
- no stale CR-30A/B/C identity presented as current.

Only after browser/device **PASS / 0 BLOCKER** may whole CR-30 receive its freeze marker. No successor CR is implicitly authorized.

## 4. Current next step

Perform real browser/device verification of the deployed **CR-30 Completion / Regression / Freeze Gate** only. Do not start Navigation, Path/Wear, SaveGame, UI/Mobile or Inspector work.

---

**Updated:** 2026-09-06 — automated CR-30 whole-block gate passed; browser/device verification is the sole remaining blocker before whole CR-30 freeze.
