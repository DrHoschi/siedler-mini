# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development/control branch: `feature/cr-28-visible-world-runtime-integration-foundation`
- Current immutable gameplay baseline: **CR-27 – Game-Facing Logistics Integration Foundation**
- CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Active system block: **CR-28 – Visible World Runtime Integration Foundation**
- Active sub-block: **CR-28A – Game-State Render Projection Contract**

## 2. Frozen CR-27 baseline

Whole-system frozen marker:

`frozen/cr-27-game-facing-logistics-integration-foundation`

Baseline commit:

`c821784264c846d00f15f018011eb13f817d13b5`

CR-28 was created directly from this immutable baseline. Frozen CR-27 owner and settlement invariants remain unchanged.

## 3. CR-28 authorized decomposition

### CR-28A – Game-State Render Projection Contract

Create a read-only, immutable projection boundary from existing gameplay owners into renderer-neutral visible-world entries. Initial minimum projection scope: Map, Buildings and Persons with stable identity, position and deliberately exposed visible base state. No Canvas drawing and no interaction.

### CR-28B – Deterministic World Canvas Rendering

Render the CR-28A projection reproducibly as a simple prototype/debug world: world/grid, Buildings and Persons. Same projection must yield the same render commands / visible result. No gameplay writes.

### CR-28C – Live Runtime -> Render Integration

Connect current runtime state -> CR-28A projection -> CR-28B renderer -> Canvas update, replacing the obsolete test-shell composition with the current modular runtime composition. Rendering remains read-only.

After CR-28C, run one whole CR-28 Completion / Regression / Freeze Gate. Only PASS / 0 BLOCKER may freeze CR-28.

## 4. CR-28 hard global non-scope

CR-28 adds no Save/Load/Continue ownership, Gameplay HUD, Build menu, Inspector, touch controls, new camera mechanics, mandatory new assets, new pathfinding/movement/traffic behavior, BuildingStock/Workforce/Logistics ownership changes, production/construction changes or new simulation rules.

CR-28 may only make already-owned gameplay truth visible.

## 5. CR-28A active scope and invariants

CR-28A must:

- read existing frozen gameplay state without mutating it,
- expose renderer-neutral immutable projection data,
- initially cover Map, Buildings and Persons,
- preserve stable identity and deterministic ordering/output,
- expose only deliberately selected visible state,
- ensure renderer/UI gains no gameplay ownership and no write-back path,
- include projection, immutability and determinism tests.

CR-28A must not:

- draw to Canvas,
- add controls or interaction,
- add camera behavior,
- add HUD/Inspector behavior,
- change gameplay stores, owners or simulation semantics.

## 6. Next allowed action

**Implement and test CR-28A only on `feature/cr-28-visible-world-runtime-integration-foundation`.**

Do not begin CR-28B until CR-28A's contract and direct tests are accepted. No separate CR-28A branch is required under the normal whole-CR branch policy.

---

**Updated:** 2026-09-06 after authorization and branch creation for **CR-28 – Visible World Runtime Integration Foundation**. Active step: **CR-28A – Game-State Render Projection Contract**.
