# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-13 AUTHORIZED / NOT YET IMPLEMENTED  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-13-savegame-foundation`  
**Whole-block base:** frozen CR-32 @ `845fa5d5f513ac3a974bbae0a81bc78652e9e674`  
**Latest whole-CR freeze:** **CR-32 – Path / Wear Integration Foundation**  
**CR-32 freeze marker:** `frozen/cr-32-path-wear-integration-foundation`

## 1. Frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-29 – Camera & World View Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-30 – Housing / Population / Gold Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `2e9208614a5cfd80abc47e39ccf236b80315ace8`.  
CR-31 – Navigation Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `f4fba712cd88dc83e616c0c4f360a2a016e5dff2`.  
CR-32 – Path / Wear Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- Navigation – represented by CR-31,
- Path / Wear – represented by CR-32,
- **IM-13 – SaveGame**,
- IM-14 – UI/Mobile,
- IM-15 – Guidance/Inspector.

## 3. Frozen CR-32 – Path / Wear Integration Foundation

### CR-32A – World-backed Path Classification Contract

Status: **FROZEN / PASS / 0 BLOCKER** @ `7576c3db15ffa8b17d0477eda9981a5d853a3c22`.

Freeze marker: `frozen/cr-32a-world-backed-path-classification-contract`.

### CR-32B – Deterministic Path Usage / Wear Accumulation Integration

Status: **FROZEN / PASS / 0 BLOCKER** @ `684198a852366f59bfb3469ae9d24c1a7901abb7`.

Freeze marker: `frozen/cr-32b-deterministic-path-usage-wear-accumulation-integration`.

### CR-32C – Wear-aware Traversal Cost Integration

Status: **FROZEN / PASS / 0 BLOCKER**.

Freeze marker: `frozen/cr-32c-wear-aware-traversal-cost-integration`.

Binding rule:

- `wearCostPerUnit = 0.01`,
- `effectiveTraversalCost = baseTraversalCost + (wearUnits × 0.01)`,
- frozen base costs remain `NEUTRAL = 1.0`, `PATH = 0.75`, `ROAD = 0.5`,
- wear 0 reproduces previous routing exactly,
- PATH/ROAD receive deterministic wear surcharge,
- NEUTRAL remains unchanged,
- existing `DeterministicCostAwarePathfinder` and route ownership remain unchanged,
- CR-32C reads CR-32B wear but never mutates it.

## 4. CR-32 completion evidence

- complete CR-31 regression: PASS,
- CR-32A regression: PASS,
- CR-32B regression: PASS,
- CR-32C regression: PASS,
- CI Clean Runtime + CR Regression including CR-32C: PASS,
- whole branch linearly based on frozen CR-31,
- real iPhone evidence: CR-32C PASS, PATH `0.75 → 0.76`, ROAD `0.50 → 0.51`, NEUTRAL unchanged,
- visible identity consistent,
- **0 BLOCKER**.

## 5. IM-13 – Deterministic SaveGame Snapshot / Restore Foundation

Status: **CONTRACT RECONCILED / IMPLEMENTATION-AUTHORIZED / NOT YET IMPLEMENTED**.

Whole-block branch: `feature/im-13-savegame-foundation`.

Exact branch base: frozen CR-32 @ `845fa5d5f513ac3a974bbae0a81bc78652e9e674`.

Binding boundary:

- persist existing authoritative runtime truth only,
- preserve Stable IDs and allocator continuity,
- persist World/Map identity, persistence-relevant domain state, Gold balance and CR-32 PATH/ROAD wear,
- recompute derived/transient views after restore instead of persisting competing truth,
- capture only at a completed deterministic simulation-step boundary,
- use a versioned canonical SaveGame payload from the first implementation,
- reject invalid schema/reference/state deterministically,
- do not alter frozen gameplay ownership or CR-32 navigation/path/wear semantics,
- keep SaveGame UI/storage presentation, cloud sync and later Guidance/Inspector outside the Foundation boundary.

## 6. Next permissible step

The next permissible implementation step is **IM-13A – SaveGame Snapshot Contract**.

IM-13A is limited to the canonical versioned snapshot contract and deterministic capture of existing authoritative state. It must not implement restore execution, save-slot UI, cloud sync, historical migration or new gameplay behavior.

No later IM-13 substep is automatically authorized by IM-13A authorization/completion; each remains gated by its predecessor regression/freeze.

IM-14 UI/Mobile and IM-15 Guidance/Inspector remain later migration blocks.

---

**Updated:** 2026-09-07 — IM-13 SaveGame contract reconciled and explicitly implementation-authorized; whole-block branch created exactly from frozen CR-32; IM-13A is the next permissible implementation step.
