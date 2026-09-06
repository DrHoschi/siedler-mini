# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-30 ACTIVE / CR-30A FROZEN / CR-30B FROZEN / CR-30C ACCEPTED + FREEZE PENDING  
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

### CR-30B – Deterministic Housing & Population Integration

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Population remains the immutable derived truth from valid real housed Persons. No mutable Population counter/store exists.

### CR-30C – Gold Economy Integration

Status: **ACCEPTED / AUTOMATED + REAL IPAD BROWSER VERIFIED / PASS / 0 BLOCKER / FREEZE PENDING**.

Accepted capability:

- one explicit `GoldEconomyOwner` is the sole mutable Gold-balance owner,
- Gold is explicitly non-physical,
- Gold income consumes only frozen CR-30B `derived-population`,
- an explicit `goldPerResident` rate is required; no hidden gameplay balance constant exists,
- pure income derivation and balance mutation are separated,
- Gold is not Resource/BuildingStock state,
- Gold is not Logistics cargo and creates no TransportJob,
- Population is not mutated and no second Population truth exists,
- no restore surcharge or SaveGame/restore behavior exists.

Evidence:

- `src/domain/gold-economy-owner.js`,
- `src/dev/cr-30c-self-test.node.js`,
- GitHub Actions run `34061155533`: frozen predecessor regression + CR-30A/B + CR-30C = **PASS / 0 BLOCKER**,
- real iPad/Safari evidence on 2026-09-06: current CR-30C identity, runtime READY, Population 3, explicit evidence Gold Rate 1/Resident, Gold Income 3, Gold Balance 3, NON-PHYSICAL, 3 Buildings / 3 Persons preserved = **PASS / 0 BLOCKER**.

The visible `1 Gold / Resident` rate is an evidence/test value only, not a production balancing decision.

### CR-30 Completion / Regression / Freeze Gate

Status: **PLANNED / NOT YET AUTHORIZED FOR EXECUTION**.

A+B+C may be regressed as a whole only after the CR-30C freeze marker exists. Whole CR-30 freezes only at **PASS / 0 BLOCKER**. No successor CR is implicitly authorized.

## 4. Current next step

Create the CR-30C freeze marker on the accepted PASS / 0 BLOCKER state. Only after that marker exists may the separate **CR-30 Completion / Regression / Freeze Gate** be explicitly authorized.

Do not execute the whole-CR gate as part of CR-30C freeze.

---

**Updated:** 2026-09-06 — CR-30C automated and real iPad/Safari verification accepted PASS / 0 BLOCKER; CR-30C freeze marker is the sole next action.
