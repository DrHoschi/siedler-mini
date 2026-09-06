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
- Next allowed sub-block: **CR-28C – Live Runtime -> Render Integration**

## 2. Frozen CR-27 baseline

Whole-system frozen marker:

`frozen/cr-27-game-facing-logistics-integration-foundation`

Baseline commit:

`c821784264c846d00f15f018011eb13f817d13b5`

CR-28 was created directly from this immutable baseline. Frozen CR-27 owner and settlement invariants remain unchanged.

## 3. CR-28 authorized decomposition

### CR-28A – Game-State Render Projection Contract

Status: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

Implemented renderer-neutral read-only projection for Map, Buildings and Persons with explicit visible fields, stable IDs, deterministic ordering and deep immutability.

### CR-28B – Deterministic World Canvas Rendering

Status: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

Implemented `src/render/world-canvas-rendering.js` as a pure CR-28A projection consumer. It deterministically derives immutable render commands for world ground/grid, Buildings and Persons and can execute those commands against a CanvasRenderingContext2D-compatible context. Same projection + options produce the same ordered command stream and Canvas call sequence. No gameplay write-back and no runtime integration were introduced.

Direct proof: `src/dev/cr-28b-self-test.node.js`. GitHub Actions run `34037847864` passed existing CR regression + CR-28A + CR-28B with **PASS / 0 BLOCKER**.

### CR-28C – Live Runtime -> Render Integration

Next allowed same-branch step. Connect current runtime state -> CR-28A projection -> CR-28B renderer -> Canvas update, replacing the obsolete test-shell composition with the current modular runtime composition. Rendering remains read-only.

After CR-28C, run one whole CR-28 Completion / Regression / Freeze Gate. Only PASS / 0 BLOCKER may freeze CR-28.

## 4. CR-28 hard global non-scope

CR-28 adds no Save/Load/Continue ownership, Gameplay HUD, Build menu, Inspector, touch controls, new camera mechanics, mandatory new assets, new pathfinding/movement/traffic behavior, BuildingStock/Workforce/Logistics ownership changes, production/construction changes or new simulation rules.

CR-28 may only make already-owned gameplay truth visible.

## 5. Accepted CR-28A/B invariants

- gameplay/source state remains read-only,
- CR-28A projection results are deeply immutable and alias-free,
- CR-28B render-command results are deeply immutable,
- Map/Buildings/Persons coverage is deterministic,
- stable identities/order are preserved,
- same projection produces same render-command and Canvas-call sequence,
- only deliberate projected visual fields are consumed,
- renderer owns no gameplay state and has no write-back path,
- `main.js` and live runtime composition remain untouched through CR-28B.

## 6. Next allowed action

**Begin CR-28C – Live Runtime -> Render Integration on `feature/cr-28-visible-world-runtime-integration-foundation`.**

CR-28C may now connect existing current runtime/gameplay state -> CR-28A projection -> CR-28B deterministic Canvas rendering and establish the real browser-visible miniworld gate. It must not add new gameplay ownership, simulation semantics, HUD/Inspector behavior, new camera mechanics or other CR-28 non-scope.

CR-28 remains NOT FROZEN until CR-28C and the final whole-system Completion / Regression / Freeze Gate pass.

---

**Updated:** 2026-09-06 after **CR-28B – Deterministic World Canvas Rendering** + existing regression + CR-28A passed GitHub Actions run `34037847864`: **PASS / 0 BLOCKER**. Next allowed step: **CR-28C – Live Runtime -> Render Integration**.
