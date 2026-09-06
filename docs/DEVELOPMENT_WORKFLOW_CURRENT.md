# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development/control branch: `feature/cr-27-game-facing-logistics-integration-foundation`
- Current immutable gameplay baseline: **CR-27 – Game-Facing Logistics Integration Foundation**
- CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-27A – BuildingStock Transport Intent & Reservation Bridge: **PASS / FROZEN / 0 BLOCKER**
- CR-27B – Workforce-Aware Transport Dispatch Integration: **PASS / FROZEN / 0 BLOCKER**
- CR-27C – Delivered Transport -> BuildingStock Settlement: **PASS / FROZEN / 0 BLOCKER**

## 2. Frozen CR-27 owner chain

The frozen integrated chain is:

`CR-25 BuildingStock -> CR-27A ACTIVE reservation -> CR-26 CAN_SIMPLE_TRANSPORT workforce -> CR-27B dispatch -> existing confirmed delivery evidence -> CR-27C settlement -> CR-25 successor BuildingStock + CR-27A RELEASED + CR-26 FREE`

Frozen sub-block markers:

- `frozen/cr-27a-buildingstock-transport-intent-reservation-bridge`
- `frozen/cr-27b-workforce-aware-transport-dispatch-integration`
- `frozen/cr-27c-delivered-transport-buildingstock-settlement`

Whole-system frozen marker:

`frozen/cr-27-game-facing-logistics-integration-foundation`

## 3. Whole CR-27 accepted invariants

The whole CR-27 Completion / Regression / Freeze Gate passed **PASS / 0 BLOCKER** on device/browser on 2026-09-06.

The frozen system guarantees:

- CR-27A reservation protects available source quantity without mutating physical BuildingStock,
- CR-26 alone owns transport workforce eligibility/selection/assignment,
- selected `personId` is reused as execution `unitId`,
- CR-27B enters the existing transport execution foundation without Carrier AVAILABLE/OCCUPIED becoming a second gameplay truth,
- reservation remains ACTIVE and physical stock unchanged through reservation/dispatch,
- only correctly linked confirmed delivery may settle,
- CR-27C moves exactly the reserved quantity source -> target,
- total source + target quantity is conserved,
- successful settlement alone returns reservation RELEASED and workforce FREE,
- linkage/owner-state/underflow/overflow failure cannot create a partial settlement result,
- legacy Claim/Demand/ResourceState stores remain compatibility-only and are not gameplay owners,
- all frozen inputs remain immutable.

## 4. Frozen CR-27 global non-scope

CR-27 added no new pathfinding algorithm, route algorithm, movement algorithm, traffic algorithm, traffic reservation semantics, deadlock logic, Carrier AI, production timing, construction work, job prioritization/scoring, graphics, Inspector, balancing or SaveGame ownership.

## 5. Branch / Pages rule after CR-27

- `feature/cr-27-game-facing-logistics-integration-foundation` remains the historical development line for the completed block.
- `frozen/cr-27-game-facing-logistics-integration-foundation` is the immutable whole-system baseline marker.
- Frozen markers must not be modified.
- No next CR branch may be created from chat memory alone.

## 6. Next allowed action

**POST-CR27 IM ↔ CR RECONCILIATION / PLANNING ONLY.**

Before naming or creating the next CR, inspect the live current roadmap, relevant IM/migration documents, the frozen CR-27 boundary and remaining integration gaps. The next CR number/title and A/B/C decomposition must be explicitly accepted before any new development branch or implementation is created.

---

**Updated:** 2026-09-06 after whole CR-27 Completion / Regression / Freeze Gate: **PASS / 0 BLOCKER**. CR-27 is **COMPLETE / FROZEN**. Next activity is live-repository IM ↔ CR reconciliation only.
