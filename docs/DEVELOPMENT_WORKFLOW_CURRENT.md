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
- CR-28B – Deterministic World Canvas Rendering: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**
- CR-28C – Live Runtime -> Render Integration: **BROWSER_VISUAL_REPAIR_PENDING**
- Next allowed step: **CR-28C browser visual re-verification**

## 2. Frozen CR-27 baseline

Whole-system frozen marker:

`frozen/cr-27-game-facing-logistics-integration-foundation`

Baseline commit:

`c821784264c846d00f15f018011eb13f817d13b5`

CR-28 was created directly from this immutable baseline. Frozen CR-27 owner and settlement invariants remain unchanged.

## 3. CR-28 current decomposition

### CR-28A – Game-State Render Projection Contract

Status: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

Renderer-neutral read-only projection for Map, Buildings and Persons with explicit visible fields, stable IDs, deterministic ordering and deep immutability.

### CR-28B – Deterministic World Canvas Rendering

Status: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER** for its contract/regression tests, with a CR-28C browser-visibility repair applied to explicit deterministic Canvas styles.

The browser defect was concrete: render commands had no `fillStyle` / `strokeStyle`, so Canvas defaults rendered black world/grid/buildings/persons against the dark page. `src/render/world-canvas-rendering.js` now carries explicit deterministic role styles in the render commands and applies them during Canvas execution. The CR-28B direct test now verifies that ground, Buildings and Persons do not rely on invisible default black and remain visually distinguishable.

### CR-28C – Live Runtime -> Render Integration

Status: **BROWSER_VISUAL_REPAIR_PENDING**.

The runtime/projection/render integration itself previously passed automated regression. However, real iPhone browser evidence showed a black Canvas despite the status reporting `3 Buildings / 3 Persons sichtbar`. Therefore automated PASS alone is insufficient for the required browser-visible miniworld gate.

A targeted repair is now applied without changing gameplay ownership:

`current owners -> CR-28A projection -> CR-28B commands with explicit deterministic visible styles -> Canvas`.

`index.html` also uses a new cache-busting CR-28C repair revision so the browser does not reuse the pre-repair entry module.

## 4. CR-28 hard global non-scope remains intact

CR-28 adds no Save/Load/Continue ownership, Gameplay HUD, Build menu, Inspector, touch controls, new camera mechanics, mandatory new assets, new pathfinding/movement/traffic behavior, BuildingStock/Workforce/Logistics ownership changes, production/construction changes or new simulation rules.

CR-28 only makes already-owned gameplay truth visible.

## 5. Accepted invariants still required

- gameplay/source state remains read-only to projection/rendering,
- CR-28A projection results are deeply immutable and alias-free,
- CR-28B render-command results are deeply immutable,
- Map/Buildings/Persons coverage and ordering are deterministic,
- stable identities are preserved,
- same projection/options produce the same render-command and Canvas-call/style sequence,
- renderer owns no gameplay state and has no write-back path,
- current owner changes are visible only by a new projection/render pass,
- browser-visible evidence must actually show world/grid/Buildings/Persons,
- no CR-28 non-scope gameplay semantics may be introduced.

## 6. Next allowed action

**Re-verify CR-28C in the real browser after deployment of the visible-style repair.**

Required evidence: the Canvas must visibly show the prototype world/grid plus distinguishable Buildings and Persons. A status text saying PASS or reporting entity counts is not sufficient by itself.

Only after real browser evidence confirms the visible miniworld may CR-28C return to **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER** and the **CR-28 Completion / Regression / Freeze Gate** become the next allowed action.

No CR-28 freeze and no CR-29 implementation are authorized while browser visual verification is pending.

---

**Updated:** 2026-09-06 after real iPhone browser evidence exposed the black-Canvas CR-28C visibility blocker. Targeted deterministic Canvas-style repair applied; real browser re-verification pending.
