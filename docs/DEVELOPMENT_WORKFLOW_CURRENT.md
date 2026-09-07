# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Completed whole-CR branch: `feature/cr-32-path-wear-integration-foundation`
- Frozen whole-CR predecessor: **CR-31 – Navigation Integration Foundation** @ `f4fba712cd88dc83e616c0c4f360a2a016e5dff2`
- CR-32 – Path / Wear Integration Foundation: **COMPLETE / PASS / 0 BLOCKER / FREEZE GATE APPROVED**
- CR-32A – World-backed Path Classification Contract: **FROZEN / PASS / 0 BLOCKER** @ `7576c3db15ffa8b17d0477eda9981a5d853a3c22`
- CR-32B – Deterministic Path Usage / Wear Accumulation Integration: **FROZEN / PASS / 0 BLOCKER** @ `684198a852366f59bfb3469ae9d24c1a7901abb7`
- CR-32C – Wear-aware Traversal Cost Integration: **PASS / 0 BLOCKER / FREEZE GATE APPROVED**
- Current allowed action: **final CR-32C + whole-CR CR-32 freeze markers only**. IM-13 must not begin until those markers exist on the final passing commit.

## 2. CR-32 frozen system boundary

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

## 3. Completion / regression / freeze evidence

CR-32 completion gate is PASS / 0 BLOCKER based on:

- complete frozen CR-31 regression PASS,
- CR-32A self-test PASS,
- CR-32B self-test PASS,
- CR-32C self-test PASS,
- CI `Clean Runtime + CR Regression` PASS including `Run CR-32C Regression`,
- branch is linearly ahead of frozen CR-31 with merge-base exactly `f4fba712cd88dc83e616c0c4f360a2a016e5dff2`,
- real iPhone evidence shows CR-32C PASS with `wearCostPerUnit 0.01`, `PATH Wear 1: 0.75 → 0.76`, `ROAD Wear 1: 0.50 → 0.51`, NEUTRAL unchanged and existing Pathfinder/Route owner unchanged,
- visible CR/build identity is consistent with CR-32C,
- 0 known blockers.

## 4. Next migration boundary

Only after final CR-32C and whole-CR CR-32 freeze markers exist may **IM-13 – SaveGame** be planned/authorized.

IM-13 is not implemented or automatically authorized by the CR-32 freeze. UI/Mobile and Guidance/Inspector remain later migration blocks.

## 5. Permanent visible CR / build identity synchronization rule

Every browser/device-verifiable CR/substep must update all applicable visible/build identity surfaces in the same implementation step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — CR-32A/B/C jointly regressed against frozen CR-31; CR-32 completion gate PASS / 0 BLOCKER; final freeze markers pending on this gate commit.
