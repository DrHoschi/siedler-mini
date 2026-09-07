# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-CR branch: `feature/cr-32-path-wear-integration-foundation`
- Frozen whole-CR predecessor: **CR-31 – Navigation Integration Foundation** @ `f4fba712cd88dc83e616c0c4f360a2a016e5dff2`
- Whole-CR freeze marker: `frozen/cr-31-navigation-integration-foundation`
- CR-32 – Path / Wear Integration Foundation: **ACTIVE / NOT FROZEN**
- CR-32A – World-backed Path Classification Contract: **IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**
- Current allowed action: **CR-32A verification only**. CR-32B must not begin before CR-32A is verified/frozen.

## 2. CR-32A contract boundary

CR-32A connects existing authoritative traversal classes `NEUTRAL`, `PATH`, `ROAD` to real world state backed by stable `MapStructure` cells and their real WorldStore tile definitions.

Implementation:

- `src/transport/world-backed-path-classification-source.js`
- `src/dev/cr-32a-self-test.node.js`

Contract:

- `WorldBackedPathClassificationSource` requires a `MapStructure`-compatible map and `WorldStore`-compatible world,
- classification is read dynamically from the real cell's referenced tile `traversalType`,
- missing `traversalType` resolves to `NEUTRAL`,
- only the existing `TraversalCostContract` classes `NEUTRAL`, `PATH`, `ROAD` are accepted,
- stable MapStructure cell identity is preserved when a tile changes,
- `typeAt(...)` remains compatible with the existing `RoadPreferredRoutingIntegration` consumer boundary,
- `classAt(...)` is provided as a compatibility alias,
- `entries()` reports non-neutral world-backed classifications deterministically sorted by stable cell id,
- no internal transport-side classification Map is authoritative for this source,
- no Wear state or Wear accumulation,
- no routing-cost change,
- no Pathfinder, Route, Movement, Traffic, Reservation, Deadlock or Recovery ownership change.

## 3. Verification boundary

CR-32A verification must establish:

- direct CR-32A self-test PASS,
- complete frozen CR-31 regression remains PASS,
- CI PASS / 0 BLOCKER,
- visible/browser build identity is consistently `CR-32A-WORLD-BACKED-PATH-CLASSIFICATION-CONTRACT`,
- visible evidence shows PATH and ROAD classifications sourced from real MapStructure cells,
- no Wear or cost behavior is introduced.

Only after PASS / 0 BLOCKER may CR-32A be marked FROZEN and CR-32B – Deterministic Path Usage / Wear Accumulation Integration be unlocked.

## 4. Locked later work

CR-32B, CR-32C, repair/maintenance, PATH-to-ROAD upgrades, worker road construction, material consumption, automatic desire paths, SaveGame, UI/Mobile and Inspector remain locked.

## 5. Permanent visible CR / build identity synchronization rule

Every browser/device-verifiable CR/substep must update all applicable visible/build identity surfaces in the same implementation step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — CR-32A implemented on `feature/cr-32-path-wear-integration-foundation`; verification/freeze pending.
