# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-30 ACTIVE / CR-30A FROZEN / CR-30B FROZEN / CR-30C IMPLEMENTED + VERIFICATION ACTIVE  
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

Status: **IMPLEMENTED / DIRECT VERIFICATION ACTIVE / NOT FROZEN**.

Implemented capability increment:

- one explicit `GoldEconomyOwner` is the sole mutable Gold-balance owner,
- Gold is explicitly non-physical,
- Gold income consumes only frozen CR-30B `derived-population`,
- an explicit `goldPerResident` rate is required; CR-30C introduces no hidden production balance constant,
- pure income derivation and balance mutation are separated,
- Gold is not placed in Resource/BuildingStock state,
- Gold is not Logistics cargo and creates no Transport job,
- Population is not mutated and no second Population truth is introduced,
- no restore surcharge or SaveGame/restore behavior is introduced.

Implementation/evidence files:

- `src/domain/gold-economy-owner.js`,
- `src/dev/cr-30c-self-test.node.js`,
- CI regression includes CR-30C after the frozen predecessor gates,
- browser/build identity is synchronized to CR-30C.

Browser evidence scenario intentionally uses explicit evidence rate `1 Gold / Resident` with frozen Population 3. Expected visible values are Gold Income 3 / Gold Balance 3 / NON-PHYSICAL while 3 Buildings / 3 Persons remain preserved. This evidence rate is not a gameplay balance decision.

Not allowed yet: SaveGame/restore, UI/Inspector features, Navigation/Path/Wear changes, physical Gold stock/cargo, or unrelated ownership changes.

### CR-30 Completion / Regression / Freeze Gate

Status: **PLANNED / NOT YET AUTHORIZED FOR EXECUTION**.

A+B+C may be regressed as a whole only after CR-30C itself is accepted/frozen. Whole CR-30 freezes only at **PASS / 0 BLOCKER**. No successor CR is implicitly authorized.

## 4. Current next step

Complete CR-30C automated verification and real browser/device verification only. Confirm current CR-30C identity, Population 3, Gold Rate 1/Resident, Gold Income 3, Gold Balance 3, NON-PHYSICAL, and preserved 3 Buildings / 3 Persons.

Do not execute the whole-CR Completion/Freeze Gate yet.

---

**Updated:** 2026-09-06 — CR-30C implemented as a separate non-physical Gold economy owner consuming only frozen derived Population; direct/browser verification is the sole active gate.
