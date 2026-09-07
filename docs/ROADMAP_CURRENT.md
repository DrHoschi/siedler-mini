# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-31 FROZEN / CR-32 COMPLETE / PASS / 0 BLOCKER / FINAL FREEZE PENDING  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-32-path-wear-integration-foundation`  
**Latest whole-CR freeze:** **CR-31 – Navigation Integration Foundation**  
**CR-31 freeze marker:** `frozen/cr-31-navigation-integration-foundation` @ `f4fba712cd88dc83e616c0c4f360a2a016e5dff2`

## 1. Frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-29 – Camera & World View Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-30 – Housing / Population / Gold Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `2e9208614a5cfd80abc47e39ccf236b80315ace8`.  
CR-31 – Navigation Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `f4fba712cd88dc83e616c0c4f360a2a016e5dff2`.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- Navigation – represented by CR-31,
- **Path / Wear – represented by CR-32**,
- IM-13 – SaveGame,
- IM-14 – UI/Mobile,
- IM-15 – Guidance/Inspector.

## 3. CR-32 – Path / Wear Integration Foundation

Status: **COMPLETE / PASS / 0 BLOCKER / FINAL FREEZE PENDING**.

### CR-32A – World-backed Path Classification Contract

Status: **FROZEN / PASS / 0 BLOCKER** @ `7576c3db15ffa8b17d0477eda9981a5d853a3c22`.

Freeze marker: `frozen/cr-32a-world-backed-path-classification-contract`.

### CR-32B – Deterministic Path Usage / Wear Accumulation Integration

Status: **FROZEN / PASS / 0 BLOCKER** @ `684198a852366f59bfb3469ae9d24c1a7901abb7`.

Freeze marker: `frozen/cr-32b-deterministic-path-usage-wear-accumulation-integration`.

### CR-32C – Wear-aware Traversal Cost Integration

Status: **PASS / 0 BLOCKER / FINAL FREEZE PENDING**.

Binding rule:

- `wearCostPerUnit = 0.01`,
- `effectiveTraversalCost = baseTraversalCost + (wearUnits × 0.01)`,
- frozen base costs remain `NEUTRAL = 1.0`, `PATH = 0.75`, `ROAD = 0.5`,
- wear 0 reproduces previous routing exactly,
- PATH/ROAD receive deterministic wear surcharge,
- NEUTRAL remains unchanged,
- existing `DeterministicCostAwarePathfinder` and route ownership remain unchanged,
- CR-32C reads CR-32B wear but never mutates it.

## 4. CR-32 completion gate evidence

- complete CR-31 regression: PASS,
- CR-32A regression: PASS,
- CR-32B regression: PASS,
- CR-32C regression: PASS,
- CI Clean Runtime + CR Regression including CR-32C: PASS,
- whole branch is linearly based on frozen CR-31,
- real iPhone evidence: CR-32C PASS, PATH `0.75 → 0.76`, ROAD `0.50 → 0.51`, NEUTRAL unchanged,
- visible identity consistent,
- **0 BLOCKER**.

## 5. Current next step

The next and only allowed action is to place the final freeze markers for **CR-32C** and **CR-32 – Path / Wear Integration Foundation** on the final passing completion-gate commit.

Only after those markers exist may **IM-13 – SaveGame** be planned and separately authorized. No SaveGame implementation is authorized by this document update itself.

---

**Updated:** 2026-09-07 — CR-32 completion / regression / freeze gate PASS / 0 BLOCKER; final freeze markers pending.
