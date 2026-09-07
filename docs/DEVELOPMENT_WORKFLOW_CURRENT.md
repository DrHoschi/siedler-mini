# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-CR branch: `feature/cr-32-path-wear-integration-foundation`
- Frozen whole-CR predecessor: **CR-31 – Navigation Integration Foundation** @ `f4fba712cd88dc83e616c0c4f360a2a016e5dff2`
- Whole-CR predecessor freeze marker: `frozen/cr-31-navigation-integration-foundation`
- CR-32 – Path / Wear Integration Foundation: **ACTIVE / NOT YET WHOLE-CR FROZEN**
- CR-32A – World-backed Path Classification Contract: **FROZEN / PASS / 0 BLOCKER** @ `7576c3db15ffa8b17d0477eda9981a5d853a3c22`
- CR-32A freeze marker: `frozen/cr-32a-world-backed-path-classification-contract`
- CR-32B – Deterministic Path Usage / Wear Accumulation Integration: **FROZEN / PASS / 0 BLOCKER** @ `684198a852366f59bfb3469ae9d24c1a7901abb7`
- CR-32B freeze marker: `frozen/cr-32b-deterministic-path-usage-wear-accumulation-integration`
- CR-32C – Wear-aware Traversal Cost Integration: **IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**
- Current allowed action after implementation completes: **CR-32C verification / regression / freeze gate only**.

## 2. Frozen CR-32A boundary

CR-32A connects existing authoritative traversal classes `NEUTRAL`, `PATH`, `ROAD` to real world state backed by stable `MapStructure` cells and their real WorldStore tile definitions.

Frozen implementation:

- `src/transport/world-backed-path-classification-source.js`
- `src/dev/cr-32a-self-test.node.js`

Frozen invariants:

- classification is read dynamically from the real cell's referenced tile `traversalType`,
- missing `traversalType` resolves to `NEUTRAL`,
- stable MapStructure cell identity is preserved,
- `typeAt(...)` remains compatible with existing routing consumers,
- `classAt(...)` remains available as compatibility alias,
- no transport-side classification Map is authoritative.

## 3. Frozen CR-32B boundary

CR-32B owns deterministic usage/wear accumulation and no other owner may create wear.

Frozen implementation:

- `src/transport/deterministic-path-usage-wear-integration.js`
- `src/dev/cr-32b-self-test.node.js`
- `src/cr32b-runtime-evidence.js`

Frozen invariants:

- only successful real CR-21C `reservation-controlled-step-movement` with `status: COMPLETED` and `enteredCell` may accumulate wear,
- the completed step must have consumed its reservation, ended at `enteredCell`, released blocking and be ready for the next intent,
- only PATH and ROAD accumulate usage/wear,
- NEUTRAL remains ignored,
- route calculation, reservation winning or movement planning alone never creates wear,
- wear is keyed by stable real MapStructure cell identity,
- CR-32B does not alter traversal costs.

## 4. CR-32C contract and implementation boundary

CR-32C integrates already-existing CR-32B wear into the already-existing traversal-cost / road-preference / pathfinder chain.

Implementation:

- `src/transport/wear-aware-traversal-cost-resolver.js`
- `src/transport/road-preferred-routing-integration.js`
- `src/dev/cr-32c-self-test.node.js`
- `src/cr32c-runtime-evidence.js`

Binding cost rule:

- `wearCostPerUnit = 0.01`,
- `effectiveTraversalCost = baseTraversalCost + (wearUnits × 0.01)`,
- frozen base costs remain `NEUTRAL = 1.0`, `PATH = 0.75`, `ROAD = 0.5`,
- `wearUnits = 0` must reproduce the previous frozen routing costs exactly,
- PATH and ROAD costs increase monotonically with wear,
- NEUTRAL remains unchanged,
- no rounding policy, no cap, no step bands and no random/time/carrier-specific modifiers,
- PATH remains PATH and ROAD remains ROAD regardless of wear,
- the existing `DeterministicCostAwarePathfinder` remains the pathfinder owner,
- the existing route owner remains unchanged,
- Movement, Traffic, Reservation, Deadlock and Recovery are unchanged,
- CR-32C reads wear but never mutates usage/wear state,
- no repair or maintenance is introduced.

## 5. CR-32C verification boundary

CR-32C verification must establish:

- direct CR-32C self-test PASS,
- frozen CR-31 regression PASS,
- frozen CR-32A self-test PASS,
- frozen CR-32B self-test PASS,
- `wearUnits = 0` reproduces the legacy road-preferred route exactly,
- sufficient deterministic wear can cause the existing pathfinder to choose the now-cheaper alternative route,
- visible/browser identity is consistently CR-32C,
- browser/device evidence shows `PATH Wear 1: 0.75 → 0.76`, `ROAD Wear 1: 0.50 → 0.51`, and NEUTRAL unchanged,
- CI PASS / 0 BLOCKER.

Only after PASS / 0 BLOCKER may CR-32C be marked FROZEN. Whole-CR CR-32 completion/freeze remains a separate later gate after A+B+C are frozen together.

## 6. Locked later work

Repair/maintenance, PATH-to-ROAD upgrades, worker road construction, material consumption, automatic desire paths, SaveGame, UI/Mobile and Inspector remain locked and outside CR-32C.

## 7. Permanent visible CR / build identity synchronization rule

Every browser/device-verifiable CR/substep must update all applicable visible/build identity surfaces in the same implementation step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — CR-32A and CR-32B frozen; CR-32C implemented with fixed wear cost factor 0.01; verification/freeze pending.
