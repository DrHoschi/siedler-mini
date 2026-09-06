# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-30 ACTIVE / CR-30A FROZEN / CR-30B FROZEN / CR-30C FROZEN / WHOLE-CR GATE AUTHORIZED  
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

CR-30 remains the active whole system block until its completion/freeze gate passes. Later migration blocks remain locked.

## 3. CR-30 – Housing / Population / Gold Integration Foundation

### CR-30A – Home & Housing Capacity Contract
Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

### CR-30B – Deterministic Housing & Population Integration
Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Population remains the immutable derived truth from valid real housed Persons. No mutable Population counter/store exists.

### CR-30C – Gold Economy Integration
Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen capability:

- one explicit `GoldEconomyOwner` is the sole mutable Gold-balance owner,
- Gold is explicitly non-physical,
- Gold income consumes only frozen CR-30B `derived-population`,
- `goldPerResident` is explicit and not a hidden gameplay default,
- pure income derivation and balance mutation are separated,
- Gold is not Resource/BuildingStock state,
- Gold is not Logistics cargo and creates no TransportJob,
- Population is not mutated and no second Population truth exists,
- no restore surcharge or SaveGame/restore behavior exists.

Evidence:

- GitHub Actions run `34061155533`: frozen predecessor regression + CR-30A/B + CR-30C = **PASS / 0 BLOCKER**,
- real iPad/Safari evidence on 2026-09-06: CR-30C identity correct, runtime READY, Population 3, evidence Gold Rate 1/Resident, Gold Income 3, Gold Balance 3, NON-PHYSICAL, 3 Buildings / 3 Persons preserved = **PASS / 0 BLOCKER**,
- freeze marker: `frozen/cr-30c-gold-economy-integration` @ `7248b7ad0cc20b60f5919a422a261ab7cd2221d8`.

The visible `1 Gold / Resident` rate is an evidence/test value only, not a production balancing decision.

### CR-30 Completion / Regression / Freeze Gate

Status: **AUTHORIZED / ACTIVE / WHOLE-CR NOT YET FROZEN**.

The gate must regress CR-30A + CR-30B + CR-30C together against frozen CR-29 and relevant predecessor contracts. It must verify that Housing/Home, derived Population and non-physical Gold coexist without changing BuildingStock, Workforce, Logistics, camera/render ownership or introducing a second Population truth.

Visible/build identity surfaces used for the gate must identify the CR-30 completion/freeze state and contain no stale CR-30A/B/C substep identity.

Whole CR-30 may freeze only at **PASS / 0 BLOCKER**. No successor CR is implicitly authorized.

## 4. Current next step

Execute **CR-30 Completion / Regression / Freeze Gate** only. Regress A+B+C as one system block against frozen CR-29 and relevant predecessor contracts. Do not start Navigation, Path/Wear, SaveGame, UI/Mobile or Inspector work.

---

**Updated:** 2026-09-06 — CR-30C frozen at `7248b7ad0cc20b60f5919a422a261ab7cd2221d8`; CR-30 Completion / Regression / Freeze Gate is explicitly authorized as the sole next action.
