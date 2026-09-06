# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-30 COMPLETION GATE PASS / 0 BLOCKER / WHOLE-CR FREEZE READY  
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

Later migration blocks remain locked until the whole CR-30 freeze marker is created.

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

Status: **PASS / 0 BLOCKER — AUTOMATED + REAL BROWSER/DEVICE EVIDENCE ACCEPTED — WHOLE-CR FREEZE READY**.

Automated whole-gate evidence:

- `src/dev/cr-30-freeze-gate.node.js` covers frozen CR-29 + CR-30A + CR-30B + CR-30C,
- GitHub Actions run `34061733270` on `67bf665b9cf0acf94c0ec1f70ca01a39322fefb5` = **SUCCESS / PASS / 0 BLOCKER**,
- CI chain includes baseline + CR-24C + CR-28 + CR-30 whole gate,
- visible/build source identity is synchronized to `CR-30 Completion / Regression / Freeze Gate` and `CR-30-COMPLETION-FREEZE-GATE`.

Real iPad/Safari evidence accepted on 2026-09-06:

- current heading: `CR-30 Completion / Regression / Freeze Gate`,
- runtime: `READY`,
- visible status: `CR-30 COMPLETION GATE ACTIVE — A+B+C`,
- Population 3,
- 3 Home Assignments,
- Gold Income 3,
- Gold Balance 3,
- NON-PHYSICAL,
- 3 Buildings / 3 Persons visible,
- no stale CR-30A/B/C substep identity presented as current.

Gate decision: **PASS / 0 BLOCKER**. Whole CR-30 is now freeze-ready.

## 4. Current next step

Create the whole-CR freeze marker for **CR-30 – Housing / Population / Gold Integration Foundation** from the accepted completion-gate baseline. Do not introduce functionality during the freeze action. Navigation, Path/Wear, SaveGame, UI/Mobile and Inspector remain locked, and no successor CR is implicitly authorized by the freeze.

---

**Updated:** 2026-09-06 — automated CR-30 whole-block gate plus real iPad/Safari completion-gate evidence accepted at PASS / 0 BLOCKER; whole CR-30 is freeze-ready.