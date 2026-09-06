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
- CR-28A – Game-State Render Projection Contract: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**
- Next allowed sub-block: **CR-28B – Deterministic World Canvas Rendering**

## 2. Frozen CR-27 baseline

Whole-system frozen marker:

`frozen/cr-27-game-facing-logistics-integration-foundation`

Baseline commit:

`c821784264c846d00f15f018011eb13f817d13b5`

CR-28 was created directly from this immutable baseline. Frozen CR-27 owner and settlement invariants remain unchanged.

## 3. CR-28 authorized decomposition

### CR-28A – Game-State Render Projection Contract

Status: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

Implemented renderer-neutral read-only projection for Map, Buildings and Persons with explicit visible fields, stable IDs, deterministic ordering and deep immutability. Direct projection/immutability/determinism tests pass together with existing CR regression in GitHub Actions run `34036947256`.

### CR-28B – Deterministic World Canvas Rendering

Next allowed same-branch step. Render the CR-28A projection reproducibly as a simple prototype/debug world: world/grid, Buildings and Persons. Same projection must yield the same render commands / visible result. No gameplay writes.

### CR-28C – Live Runtime -> Render Integration

Later same-branch step. Connect current runtime state -> CR-28A projection -> CR-28B renderer -> Canvas update, replacing the obsolete test-shell composition with the current modular runtime composition. Rendering remains read-only.

After CR-28C, run one whole CR-28 Completion / Regression / Freeze Gate. Only PASS / 0 BLOCKER may freeze CR-28.

## 4. CR-28 hard global non-scope

CR-28 adds no Save/Load/Continue ownership, Gameplay HUD, Build menu, Inspector, touch controls, new camera mechanics, mandatory new assets, new pathfinding/movement/traffic behavior, BuildingStock/Workforce/Logistics ownership changes, production/construction changes or new simulation rules.

CR-28 may only make already-owned gameplay truth visible.

## 5. CR-28A accepted invariants

CR-28A now proves:

- source gameplay state is read without mutation,
- projection results are deeply immutable,
- no mutable alias to gameplay owners is exposed,
- Map, Buildings and Persons are covered,
- stable identities and deterministic ordering are preserved,
- only deliberately exposed visible fields enter the projection,
- irrelevant gameplay fields do not become renderer ownership,
- no Canvas/DOM rendering or gameplay write-back exists in A.

## 6. Next allowed action

**Begin CR-28B – Deterministic World Canvas Rendering on `feature/cr-28-visible-world-runtime-integration-foundation`.**

CR-28B may consume the completed CR-28A projection and deterministically produce simple Canvas render commands / prototype world drawing. It must not modify gameplay owners, introduce runtime integration, camera comfort features, HUD/Inspector behavior or CR-28C behavior.

CR-28 remains NOT FROZEN until A+B+C and the final whole-system gate pass.

---

**Updated:** 2026-09-06 after **CR-28A – Game-State Render Projection Contract** direct test + existing CR regression: **PASS / 0 BLOCKER**. Next allowed step: **CR-28B – Deterministic World Canvas Rendering**.
