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
- CR-28C – Live Runtime -> Render Integration: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**
- Next allowed step: **CR-28 Completion / Regression / Freeze Gate**

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

Status: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

The deterministic renderer consumes CR-28A projections and emits/applies explicit visible Canvas role styles for ground, grid, Buildings and Persons. The prior browser defect caused by implicit default-black Canvas styles is repaired and covered by direct regression tests.

### CR-28C – Live Runtime -> Render Integration

Status: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

The live browser path is confirmed:

`current owners -> CR-28A projection -> CR-28B deterministic render commands/styles -> Canvas`.

Real iPhone Safari verification on 2026-09-06 visibly confirmed the required prototype miniworld: green world/ground area, grid, three distinguishable Buildings and three distinguishable Persons. The browser status simultaneously reported `PASS / 0 BLOCKER – 3 Buildings / 3 Persons sichtbar`.

The earlier black-Canvas blocker is therefore CLOSED.

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
- browser-visible evidence actually shows world/grid/Buildings/Persons,
- no CR-28 non-scope gameplay semantics may be introduced.

## 6. Next allowed action

**Run the CR-28 Completion / Regression / Freeze Gate on this same whole-CR branch.**

The final gate must regress CR-28A + CR-28B + CR-28C together against the frozen CR-27 baseline, preserve all ownership/read-only/non-scope invariants, include the successful real-browser miniworld evidence, and finish at **PASS / 0 BLOCKER** before CR-28 may be marked FROZEN.

No CR-29 implementation is authorized before that final whole-system gate succeeds.

---

**Updated:** 2026-09-06 after successful real iPhone Safari browser verification. CR-28C visual blocker closed; CR-28 Completion / Regression / Freeze Gate is now the next allowed action.
