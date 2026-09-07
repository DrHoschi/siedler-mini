# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-31 FROZEN / CR-32 ACTIVE / CR-32A FROZEN / CR-32B FROZEN / CR-32C IMPLEMENTED / VERIFICATION PENDING  
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

Status: **ACTIVE / NOT YET WHOLE-CR FROZEN**.

### CR-32A – World-backed Path Classification Contract

Status: **FROZEN / PASS / 0 BLOCKER** @ `7576c3db15ffa8b17d0477eda9981a5d853a3c22`.

Freeze marker: `frozen/cr-32a-world-backed-path-classification-contract`.

Scope:

- real world-backed source from stable `MapStructure` cells and WorldStore tile definitions,
- existing authoritative classes `NEUTRAL`, `PATH`, `ROAD`,
- existing routing consumer compatibility through `typeAt(...)`, plus `classAt(...)` compatibility alias,
- deterministic non-neutral classification inventory by stable cell id.

### CR-32B – Deterministic Path Usage / Wear Accumulation Integration

Status: **FROZEN / PASS / 0 BLOCKER** @ `684198a852366f59bfb3469ae9d24c1a7901abb7`.

Freeze marker: `frozen/cr-32b-deterministic-path-usage-wear-accumulation-integration`.

Scope:

- wear comes only from successful real CR-21C completed step movement,
- PATH and ROAD accumulate deterministic usage/wear by stable MapStructure cell identity,
- NEUTRAL does not accumulate wear,
- planning/routing/reservation alone does not create wear,
- CR-32B itself does not change traversal costs.

### CR-32C – Wear-aware Traversal Cost Integration

Status: **IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**.

Binding rule:

- `wearCostPerUnit = 0.01`,
- `effectiveTraversalCost = baseTraversalCost + (wearUnits × 0.01)`,
- frozen base costs remain `NEUTRAL = 1.0`, `PATH = 0.75`, `ROAD = 0.5`,
- Wear 0 reproduces previous costs exactly,
- only PATH/ROAD receive the wear surcharge,
- NEUTRAL remains unchanged,
- no rounding/cap/bands/random/time/carrier modifiers,
- existing `DeterministicCostAwarePathfinder` and route ownership remain unchanged,
- CR-32C reads CR-32B wear but does not mutate it.

Verification must prove both zero-wear regression compatibility and deterministic rerouting when enough wear makes an alternative route cheaper.

## 4. Current next step

The next and only allowed action after the implementation commits is **CR-32C verification / regression / freeze gate**. Verify the CR-32C self-test, frozen CR-31 regression, CR-32A and CR-32B regressions, CI, visible build identity and real browser/device evidence.

Do not begin repair/maintenance, PATH-to-ROAD upgrades, worker road construction, material consumption, automatic desire paths, SaveGame, UI/Mobile or Guidance/Inspector. Whole-CR CR-32 completion/freeze is a separate later gate after CR-32C is frozen.

---

**Updated:** 2026-09-07 — CR-32A and CR-32B frozen; CR-32C implemented with fixed wear factor 0.01; verification/freeze pending.
