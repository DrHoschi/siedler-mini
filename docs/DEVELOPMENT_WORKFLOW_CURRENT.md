# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-block branch: `feature/im-13-savegame-foundation`
- Whole-block branch base: frozen CR-32 @ `845fa5d5f513ac3a974bbae0a81bc78652e9e674`
- Frozen predecessor: **CR-32 – Path / Wear Integration Foundation**
- CR-32 – Path / Wear Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-32 whole freeze marker: `frozen/cr-32-path-wear-integration-foundation`
- CR-32A – World-backed Path Classification Contract: **FROZEN / PASS / 0 BLOCKER** @ `7576c3db15ffa8b17d0477eda9981a5d853a3c22`
- CR-32A freeze marker: `frozen/cr-32a-world-backed-path-classification-contract`
- CR-32B – Deterministic Path Usage / Wear Accumulation Integration: **FROZEN / PASS / 0 BLOCKER** @ `684198a852366f59bfb3469ae9d24c1a7901abb7`
- CR-32B freeze marker: `frozen/cr-32b-deterministic-path-usage-wear-accumulation-integration`
- CR-32C – Wear-aware Traversal Cost Integration: **FROZEN / PASS / 0 BLOCKER**
- CR-32C freeze marker: `frozen/cr-32c-wear-aware-traversal-cost-integration`
- Current migration block: **IM-13 – Deterministic SaveGame Snapshot / Restore Foundation**
- IM-13 status: **CONTRACT RECONCILED / IMPLEMENTATION-AUTHORIZED / NOT YET IMPLEMENTED**

## 2. Frozen CR-32 system boundary

CR-32 owns the complete Path / Wear integration chain:

`MapStructure world-backed classification → real completed step usage/wear → wear-aware traversal cost → existing road-preference routing → existing deterministic cost-aware pathfinder`.

Binding invariants:

- traversal classes remain `NEUTRAL`, `PATH`, `ROAD`,
- real MapStructure cell identity remains authoritative,
- only successful real CR-21C `reservation-controlled-step-movement` with `status: COMPLETED` and `enteredCell` may create wear,
- PATH and ROAD accumulate deterministic wear; NEUTRAL does not,
- route planning, reservation winning or movement planning alone never creates wear,
- `wearCostPerUnit = 0.01`,
- `effectiveTraversalCost = baseTraversalCost + (wearUnits × 0.01)`,
- frozen base costs remain `NEUTRAL = 1.0`, `PATH = 0.75`, `ROAD = 0.5`,
- wear 0 reproduces previous routing costs and routing behavior,
- PATH/ROAD cost increases monotonically with wear,
- NEUTRAL remains unchanged,
- PATH remains PATH and ROAD remains ROAD regardless of wear,
- existing `DeterministicCostAwarePathfinder` and route ownership remain unchanged,
- Movement, Traffic, Reservation, Deadlock and Recovery ownership remain unchanged,
- no repair, maintenance, PATH-to-ROAD upgrade, worker road construction, material consumption or automatic desire path is introduced.

## 3. IM-13 reconciled contract / boundary

IM-13 is a persistence foundation only. It may capture, serialize, validate and restore existing authoritative runtime state but must not become a new gameplay owner.

Binding IM-13 principles:

- authoritative state is persisted; derived views are recomputed after restore,
- Stable IDs and allocator continuity must survive Save → Restore,
- World/Map identity, domain-owned persistent state, Gold balance and CR-32 PATH/ROAD wear are persistence-relevant authoritative state,
- transient route/pathfinder results, render projection, UI state and other derived views are not persisted as competing truth,
- capture occurs only at a completed deterministic simulation-step boundary,
- payloads are versioned from the first implementation (`kind` + schema version),
- invalid schemas, duplicate IDs, dangling references and invalid authoritative values must be rejected deterministically,
- restore must reconstruct the same normalized authoritative truth without changing frozen CR-32 routing/wear semantics,
- storage backend and user-facing save-slot UI remain outside the core persistence contract,
- IM-14 UI/Mobile and IM-15 Guidance/Inspector remain later blocks.

Explicitly out of scope for IM-13 Foundation:

- new gameplay rules,
- save-slot/menu UX,
- cloud sync,
- multiplayer synchronization,
- compression/encryption features,
- historical schema migration beyond the first supported schema,
- any change to Movement, Traffic, Reservation, Deadlock, Recovery, Navigation or Path/Wear ownership.

## 4. Authorization state

The IM-13 contract/boundary reconciliation is accepted and **IM-13 is explicitly implementation-authorized**.

The whole-block branch `feature/im-13-savegame-foundation` was created exactly from frozen CR-32 commit `845fa5d5f513ac3a974bbae0a81bc78652e9e674`.

This authorization does not mark any IM-13 implementation substep complete or frozen. Each implementation substep still requires its own narrow contract, regression evidence and freeze gate before the next substep is allowed.

## 5. Next permissible step

The next permissible implementation step is **IM-13A – SaveGame Snapshot Contract**.

IM-13A may define only the canonical versioned SaveGame payload and deterministic capture of existing authoritative state at a completed simulation-step boundary. Restore execution, storage adapter/UI and historical migration remain forbidden in IM-13A.

## 6. Permanent visible CR / build identity synchronization rule

Every browser/device-verifiable CR/IM substep must update all applicable visible/build identity surfaces in the same implementation step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — IM-13 contract reconciled and explicitly implementation-authorized; whole-block branch created exactly from frozen CR-32; no SaveGame implementation started yet.
