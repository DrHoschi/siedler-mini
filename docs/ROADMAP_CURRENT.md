# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-31 FROZEN / CR-32 ACTIVE / CR-32A IMPLEMENTED / VERIFICATION PENDING  
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

Status: **ACTIVE / NOT FROZEN**.

### CR-32A – World-backed Path Classification Contract

Status: **IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**.

Scope:

- real world-backed source from stable `MapStructure` cells and WorldStore tile definitions,
- existing authoritative classes `NEUTRAL`, `PATH`, `ROAD`,
- existing routing consumer compatibility through `typeAt(...)`, plus `classAt(...)` compatibility alias,
- deterministic non-neutral classification inventory by stable cell id,
- no Wear, no movement change, no routing-cost change.

### CR-32B – Deterministic Path Usage / Wear Accumulation Integration

Status: **PLANNED / LOCKED** until CR-32A PASS / 0 BLOCKER and freeze.

Only successful real completed step movement may later create usage/wear. Route planning, reservation winning or movement planning alone must not create wear.

### CR-32C – Wear-aware Traversal Cost Integration

Status: **PLANNED / LOCKED** until CR-32B is complete.

Wear may later influence the existing traversal-cost → road-preference → pathfinder chain without creating a new pathfinder or route owner.

## 4. Current next step

The next and only allowed action is **CR-32A verification / regression / freeze gate**. Verify the CR-32A self-test, frozen CR-31 regression, CI, visible build identity and browser/device evidence. Do not begin CR-32B yet.

Repair/maintenance, PATH-to-ROAD upgrades, worker road construction, material consumption, automatic desire paths, SaveGame, UI/Mobile and Guidance/Inspector remain outside CR-32A.

---

**Updated:** 2026-09-07 — CR-32A implemented; verification/freeze pending.
