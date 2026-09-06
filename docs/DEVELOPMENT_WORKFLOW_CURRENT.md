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

## 3. CR-28 completed decomposition

### CR-28A – Game-State Render Projection Contract

Status: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

Renderer-neutral read-only projection for Map, Buildings and Persons with explicit visible fields, stable IDs, deterministic ordering and deep immutability.

### CR-28B – Deterministic World Canvas Rendering

Status: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

`src/render/world-canvas-rendering.js` consumes only CR-28A projection and deterministically derives immutable world-ground/grid/building/person commands plus Canvas execution. No gameplay write-back.

### CR-28C – Live Runtime -> Render Integration

Status: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

Implemented `src/render/live-runtime-render-integration.js` as the explicit current-owner snapshot boundary:

`MapStructure + CoreDomainStores(Buildings/Units) -> CR-28A projection -> CR-28B render commands -> Canvas`.

`src/main.js` no longer composes the obsolete CR-16A test shell. It now boots the current runtime, current Map/Building/Person owners and renders a simple browser-visible miniworld through the CR-28A/B chain. The miniworld uses only existing owner contracts and contains no new gameplay semantics.

Direct proof: `src/dev/cr-28c-self-test.node.js` verifies real `WorldStore` / `MapStructure` / `CoreDomainStores` input, visible Building/Person projection, Canvas command execution, owner-state immutability and that a later current-owner position change becomes visible on the next render.

GitHub Actions run `34039684167` on commit `1daccb6ff0302014cfc0b72c95fbf0852c762ec9` passed existing CR regression + CR-28A + CR-28B + CR-28C: **PASS / 0 BLOCKER**.

## 4. CR-28 hard global non-scope remains intact

CR-28 added no Save/Load/Continue ownership, Gameplay HUD, Build menu, Inspector, touch controls, new camera mechanics, mandatory new assets, new pathfinding/movement/traffic behavior, BuildingStock/Workforce/Logistics ownership changes, production/construction changes or new simulation rules.

CR-28 only makes already-owned gameplay truth visible.

## 5. Accepted CR-28A/B/C invariants

- gameplay/source state remains read-only to projection/rendering,
- CR-28A projection results are deeply immutable and alias-free,
- CR-28B render-command results are deeply immutable,
- Map/Buildings/Persons coverage and ordering are deterministic,
- stable identities are preserved,
- same projection produces same render-command and Canvas-call sequence,
- only deliberate projected visual fields are consumed,
- renderer owns no gameplay state and has no write-back path,
- CR-28C reads current Map/Building/Person owners through snapshots,
- current owner changes are visible only by taking a new projection/render pass,
- browser `main.js` is no longer the obsolete CR-16A test-shell composition,
- no CR-28 non-scope gameplay semantics were introduced.

## 6. Next allowed action

**Run the CR-28 – Visible World Runtime Integration Foundation Completion / Regression / Freeze Gate on `feature/cr-28-visible-world-runtime-integration-foundation`.**

The whole-system gate must jointly regress CR-28A + CR-28B + CR-28C, confirm the read-only ownership boundary, confirm browser-visible miniworld evidence and return **PASS / 0 BLOCKER** before CR-28 may be marked FROZEN or receive a frozen marker.

No CR-29 implementation is authorized before this gate.

---

**Updated:** 2026-09-06 after **CR-28C – Live Runtime -> Render Integration** passed GitHub Actions run `34039684167`: **PASS / 0 BLOCKER**. Next allowed step: **CR-28 Completion / Regression / Freeze Gate**.
